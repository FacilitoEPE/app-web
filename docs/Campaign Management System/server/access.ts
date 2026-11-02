import { createHmac, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Actor, SharedData } from '../src/shared-protocol.js'
import { trackedServices, sameSource, sourceKey } from '../src/delivery-tracking.js'

type Ticket=Actor&{exp:number;purpose:'invite'|'session';v:1}
const COOKIE='agro_shared_session'
export function signAccess(actor:Actor,purpose:Ticket['purpose']='invite'){
  const secret=process.env.SHARED_ACCESS_SECRET
  if(!secret)throw Error('El acceso privado no está configurado.')
  const body=Buffer.from(JSON.stringify({...actor,v:1,purpose,exp:Math.floor(Date.now()/1000)+30*86400})).toString('base64url')
  return body+'.'+createHmac('sha256',secret).update(body).digest('base64url')
}
function verify(value:string,purpose:Ticket['purpose']):Actor|null{
  try{
    const secret=process.env.SHARED_ACCESS_SECRET;if(!secret)return null
    const [body,signature,...rest]=value.split('.');if(!body||!signature||rest.length)return null
    const expected=createHmac('sha256',secret).update(body).digest();const supplied=Buffer.from(signature,'base64url')
    if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return null
    const ticket=JSON.parse(Buffer.from(body,'base64url').toString()) as Ticket
    if(ticket.v!==1||ticket.purpose!==purpose||ticket.exp<Math.floor(Date.now()/1000))return null
    if(ticket.role==='admin')return {role:'admin'}
    if(ticket.role==='driver'&&ticket.driverId&&ticket.transporterId)return {role:'driver',driverId:ticket.driverId,transporterId:ticket.transporterId}
    return null
  }catch{return null}
}
export function requestActor(req:IncomingMessage,res:ServerResponse):Actor|null{
  const access=new URL(req.url||'/','https://localhost').searchParams.get('access')
  if(access){const actor=verify(access,'invite');if(!actor)return null;res.setHeader('Set-Cookie',`${COOKIE}=${signAccess(actor,'session')}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30*86400}`);return actor}
  const cookie=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)
  return cookie?verify(cookie,'session'):null
}

export function driverScope(data:SharedData,actor:Extract<Actor,{role:'driver'}>){
  const links=data.campaignTransporters.filter(l=>l.transporterId===actor.transporterId)
  const linkIds=new Set(links.map(l=>l.id))
  const deliveries=data.requirements.flatMap(r=>(r.contratos||[]).flatMap((c:any)=>c.entregas.filter((d:any)=>d.driverId===actor.driverId&&linkIds.has(d.transportLinkId)).map((d:any)=>({r,d,source:{requirementId:r.id,contractId:c.id,deliveryId:d.id}}))))
  const keys=new Set(deliveries.map(x=>sourceKey(x.source)))
  const own=(service:any)=>service.driverId===actor.driverId&&keys.has(sourceKey(service.sourceDelivery))
  return {links,linkIds,deliveries,keys,own}
}
export function scopedData(data:SharedData,actor:Actor):SharedData{
  if(actor.role==='admin')return data
  const scope=driverScope(data,actor)
  const campaignIds=new Set(scope.deliveries.map(x=>x.r.campaignId))
  const providerIds=new Set(scope.deliveries.flatMap(x=>(x.d.providers||(x.d.providerId?[{providerId:x.d.providerId}]:[])).map((p:any)=>p.providerId)))
  const links=scope.links.map(l=>({...l,paymentAgreement:undefined,services:l.services.filter(scope.own)}))
  const operationIds=new Set(links.flatMap(l=>l.services.map((i:any)=>i.operationId)))
  const operations=data.qualityOperations.filter(o=>operationIds.has(o.id)||scope.keys.has(sourceKey(o.sourceDelivery))||(!o.sourceDelivery&&campaignIds.has(o.campaignId))).map(o=>({...o,analyses:[]}))
  const allowedLogistics=data.logisticsDeliveries.filter(d=>trackedServices(data as any,d).some(m=>scope.linkIds.has(m.link.id)&&scope.own(m.service)))
  return {...data,transportRequests:[],campaigns:data.campaigns.filter(c=>campaignIds.has(c.id)),providers:data.providers.filter(p=>providerIds.has(p.id)),campaignProviders:data.campaignProviders.filter(p=>campaignIds.has(p.campaignId)&&providerIds.has(p.providerId)),requirements:data.requirements.filter(r=>scope.deliveries.some(x=>x.r.id===r.id)).map(r=>({...r,precio:0,contratos:r.contratos?.map((c:any)=>({...c,precio:0,entregas:c.entregas.filter((d:any)=>scope.keys.has(sourceKey({requirementId:r.id,contractId:c.id,deliveryId:d.id})))})).filter((c:any)=>c.entregas.length)})),qualityOperations:operations,logisticsDeliveries:allowedLogistics,exportMtdRecords:data.exportMtdRecords.filter(m=>campaignIds.has(m.campaignId)&&providerIds.has(m.providerId)),clients:data.clients.filter(c=>scope.deliveries.some(x=>x.r.clientId===c.id)),transporters:data.transporters.filter(t=>t.id===actor.transporterId).map(t=>({...t,choferes:t.choferes.filter((d:any)=>d.id===actor.driverId),vehiculos:t.vehiculos.filter((v:any)=>scope.deliveries.some(x=>x.d.vehicleId===v.id))})),campaignTransporters:links,exams:[],interviews:[],certifications:[],invoices:[],settlements:[],financialMovements:[],payments:[]}
}

export function authorizeDriverChanges(before:SharedData,after:SharedData,changes:any[],actor:Actor){
  if(actor.role==='admin')return
  const scope=driverScope(before,actor)
  const allowedRoots=['campaignTransporters','qualityOperations','logisticsDeliveries']
  const operationFields=new Set(['reference','sourceDelivery','providerId','origin','expectedDate','status','estimatedQuantity','harvestedQuantity','acceptedQuantity','loadedQuantity','plantQuantity','loadRegistration','variety','viaticos','qualityDecision','transport','rejectedDeliveries'])
  const logisticsFields=new Set(['transportServiceId','sourceDelivery','sourceOperationId','evaluation','actualArrival','logisticsStatus'])
  for(const change of changes){
    const [root,record,field,serviceRef,serviceField]=change.path
    if(!allowedRoots.includes(root)||!record||typeof record==='string'||record.by!=='id')throw Error('Tu acceso no permite modificar estos datos.')
    if(root==='campaignTransporters'){
      if(!scope.linkIds.has(record.key)||field!=='services'||!serviceRef||typeof serviceRef==='string'||serviceRef.by!=='id')throw Error('Solo puedes registrar tus propias cargas.')
      if(serviceField&&!['annotation','driverDispatch','sourceDelivery','operationId','logisticsCompleted','providerId','fincaId','vehicleId','driverId','start','end','origin','destination','conditions','guides','documents'].includes(serviceField))throw Error('Campo de carga no permitido.')
      const old=before.campaignTransporters.find(l=>l.id===record.key)?.services.find((i:any)=>i.id===serviceRef.key)
      const item=after.campaignTransporters.find(l=>l.id===record.key)?.services.find((i:any)=>i.id===serviceRef.key)
      if(old&&!scope.own(old))throw Error('La carga pertenece a otro chofer.')
      if(!item){if(old?.driverDispatch?.some((e:any)=>e.stage!=='En carga')||old?.guides?.some((g:any)=>g.generatedAt))throw Error('No puedes eliminar un despacho iniciado.');continue}
      const delivery=scope.deliveries.find(x=>sameSource(x.source,item.sourceDelivery))?.d
      if(!delivery||item.driverId!==actor.driverId||item.vehicleId!==delivery.vehicleId||item.start!==delivery.start||item.end!==delivery.end||item.destination!==delivery.destino||item.origin!==delivery.origin)throw Error('La carga no coincide con tu entrega asignada.')
      if(item.annotation?.kilos>delivery.kilos+.01)throw Error('Los kilos superan la entrega asignada.')
      const providerIds=new Set((delivery.providers||[{providerId:delivery.providerId}]).map((p:any)=>p.providerId))
      if(item.annotation?.providers?.some((p:any)=>!providerIds.has(p.providerId)))throw Error('Proveedor ajeno a la entrega.')
      if(JSON.stringify(old?.guides?.filter((g:any)=>g.generatedAt)||[])!==JSON.stringify(item.guides?.filter((g:any)=>g.generatedAt)||[]))throw Error('El chofer no puede emitir ni modificar guías.')
    }else if(root==='qualityOperations'){
      const old=before.qualityOperations.find(o=>o.id===record.key)
      const item=after.qualityOperations.find(o=>o.id===record.key)
      const related=scope.keys.has(sourceKey(item?.sourceDelivery))||scope.links.some(l=>l.services.some((i:any)=>scope.own(i)&&i.operationId===record.key))||scope.deliveries.some(x=>x.r.campaignId===item?.campaignId&&item?.route==='Industria'&&!item?.sourceDelivery)
      if(!item||!related||field&&!operationFields.has(field))throw Error('No puedes modificar la revisión de calidad del administrador.')
      if(!old&&(item.analyses?.length||item.advances?.length||item.qualityDecision==='Aprobada'))throw Error('La revisión corresponde al administrador.')
      if(item.qualityDecision!==(old?.qualityDecision||'Pendiente')&&item.qualityDecision!==undefined)throw Error('La aprobación corresponde al administrador.')
    }else{
      const old=before.logisticsDeliveries.find(d=>d.id===record.key)
      const item=after.logisticsDeliveries.find(d=>d.id===record.key)
      if(old&&!trackedServices(before as any,old).some(m=>scope.linkIds.has(m.link.id)&&scope.own(m.service)))throw Error('La entrega pertenece a otro chofer.')
      if(!item)continue
      if(!trackedServices(after as any,item).some(m=>scope.linkIds.has(m.link.id)&&scope.own(m.service)))throw Error('Entrega no asignada.')
      if(old&&field&&!logisticsFields.has(field))throw Error('El registro administrativo corresponde al administrador.')
      if(field==='evaluation'&&change.path[3]!=='originWeight')throw Error('La recepción corresponde al administrador.')
      if(!old&&(item.purchases.length||item.physicalClosed||item.administrativeClosed||item.accountingStatus!=='Pendiente de revisión'||Object.values(item.crates).some(x=>x!==''&&x!==false)))throw Error('No puedes registrar cierres administrativos.')
    }
  }
}
