import { businessIntegrityIssue } from '../src/business-integrity.js'
import { invoiceCollectionIssue } from '../src/sales-billing.js'
import { applyTransportAdvance, recordTransportAdvance, transportAdvanceIssue, type ApplyTransportAdvanceCommand, type RecordTransportAdvanceCommand } from '../src/transport-advances.js'
import { recordSettlementPayment, type SettlementPaymentCommand } from '../src/settlement-payment.js'
import { paidTransportSettlement, type TransportPaymentCommand } from '../src/transport-settlement-payment.js'
import { freightIssue } from '../src/transport-freight.js'
import { paidProviderSettlement, type ProviderPaymentCommand } from '../src/provider-settlement-payment.js'
import { usesSupabase, readSupabase, writeSupabase, SupabaseConflict } from '../server/supabase-state.js'
import { driverChecklistIssue, receiptStepIssue } from '../src/driver-receipt-model.js'
import { dispatchStage } from '../src/dispatch-model.js'
import { trackedServices } from '../src/delivery-tracking.js'
import { linkedPeopleIssue, providerIdentity, settlementProvider } from '../src/purchase-uit.js'
import { validateLiquidation } from '../src/finance-flow.js'
import { scopedData, authorizeDriverChanges } from '../server/access.js'
import type { Actor } from '../src/shared-protocol.js'
import { get, put, BlobPreconditionFailedError } from '@vercel/blob'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { applyChanges, validData, DataConflict, type SharedData, type Snapshot, type ChangeBatch } from '../src/shared-protocol.js'
import { invoiceTotal, settlementTotal, paidTotal } from '../src/finance-model.js'

const present=(snapshot:Snapshot,actor:Actor)=>({...snapshot,...(usesSupabase()?{storageId:'supabase:'+new URL(process.env.SUPABASE_URL!).hostname}:{}),actor,data:scopedData(snapshot.data,actor)})
const PATH='campaign-management/shared-state-v1.json'
const options={access:'private' as const,useCache:false,token:process.env.BLOB_READ_WRITE_TOKEN,headers:{'accept-encoding':'identity'}}
type Request=IncomingMessage & {body?:unknown}
const respond=(res:ServerResponse,status:number,data?:unknown,etag?:string)=>{
  res.setHeader('Cache-Control','private, no-store, max-age=0')
  res.setHeader('CDN-Cache-Control','no-store')
  res.setHeader('Vercel-CDN-Cache-Control','no-store')
  res.setHeader('Content-Type','application/json; charset=utf-8')
  res.setHeader('X-Content-Type-Options','nosniff')
  if(etag)res.setHeader('ETag',etag)
  res.statusCode=status;res.end(data===undefined?undefined:JSON.stringify(data))
}

async function decodeSnapshot(file:Awaited<ReturnType<typeof get>>){
  if(!file||file.statusCode!==200||!file.stream)throw Error('No se encontró el archivo original de datos compartidos. No se creará una base nueva automáticamente.')
  const snapshot=await new Response(file.stream).json() as Snapshot
  if(snapshot.schema!==1||!Number.isInteger(snapshot.revision)||!Array.isArray(snapshot.applied))throw Error('El archivo compartido no tiene un formato válido. Se conserva sin modificaciones.')
  validData(snapshot.data)
  return {snapshot,etag:file.blob.etag}
}
async function readSnapshot(){
  if(usesSupabase()){const current=await readSupabase();if(!current.snapshot)throw Error('Falta el estado compartido de Supabase.');return {snapshot:current.snapshot,etag:current.etag}}
  return decodeSnapshot(await get(PATH,options))
}

function validateBusiness(data:SharedData,prior:SharedData){
  validData(data)
  const personIssue=linkedPeopleIssue(data,prior);if(personIssue)throw Error(personIssue)
  const integrityIssue=businessIntegrityIssue(data,prior);if(integrityIssue)throw Error(integrityIssue)
  const advanceIssue=transportAdvanceIssue(data,prior);if(advanceIssue)throw Error(advanceIssue)
  const allocationIssue=freightIssue(data,prior);if(allocationIssue)throw Error(allocationIssue)
  for(const oldLink of prior.campaignTransporters){
    const link=data.campaignTransporters.find(l=>l.id===oldLink.id)
    if(prior.settlements.some(d=>d.transportLinkId===oldLink.id)||prior.financialMovements.some(m=>m.transportAdvanceLinkId===oldLink.id)){
      if(link?.campaignId!==oldLink.campaignId||link?.transporterId!==oldLink.transporterId)throw Error('Conserva la empresa y campaña de los movimientos registrados.')
      const terms=(a:any)=>a&&({type:a.type,total:a.total,advance:a.advance,due:a.due,currency:a.currency})
      if(JSON.stringify(terms(oldLink.paymentAgreement))!==JSON.stringify(terms(link?.paymentAgreement)))throw Error('El acuerdo liquidado conserva sus condiciones de pago.')
    }
  }
  const conversions=new Set<string>()
  for(const p of data.providers)for(const c of p.uitConversions||[]){
    const doc=data.settlements.find(d=>d.id===c.settlementId)
    if(!doc||doc.transportLinkId||doc.currency==='PEN'||c.date!==doc.date||!Number.isFinite(c.rate)||c.rate<=0||!c.source?.trim()||providerIdentity(data,p.id)!==providerIdentity(data,settlementProvider(data,doc))||conversions.has(c.settlementId))throw Error('La conversión UIT no coincide con el proveedor y documento, o está duplicada.')
    conversions.add(c.settlementId)
  }
  for(const [key,kind] of [['invoices','Cobro'],['settlements','Pago']] as const)for(const doc of data[key]){
    const old=prior[key].find(x=>x.id===doc.id);if(JSON.stringify(old)===JSON.stringify(doc))continue
    if(old&&prior.financialMovements.some(m=>m.kind===kind&&m.documentId===doc.id))throw Error('El documento ya tiene movimientos; conserva su historial.')
    const issue=validateLiquidation(data,doc,kind,prior);if(issue)throw Error(issue)
    if(kind==='Pago'&&'paidOnSettlement' in doc&&doc.paidOnSettlement&&(doc.due!==doc.date||paidTotal(data.financialMovements,'Pago',doc.id)!==settlementTotal(doc as import('../src/finance-model.js').PurchaseSettlement)))throw Error('La liquidación inmediata debe incluir el pago total en la misma fecha.')
  }
  for(const link of data.campaignTransporters)for(const service of link.services||[]){
    const events=service.driverDispatch||[]
    const stages=['En carga','Salida','En camino','Llegada','Cierre']
    let previous=-1
    for(const e of events){const index=stages.indexOf(e.stage);if(index<0||index<=previous||!e.date||!Number.isFinite(Date.parse(e.date))||e.driverId!==service.driverId)throw Error('El historial del despacho es inválido.');previous=index}
    const old=prior.campaignTransporters.find(l=>l.id===link.id)?.services.find((i:any)=>i.id===service.id)
    if(events.some((e:any)=>e.stage==='Cierre')&&!old?.driverDispatch?.some((e:any)=>e.stage==='Cierre')){
      const matches=data.logisticsDeliveries.filter(d=>d.campaignId===link.campaignId&&trackedServices(data as any,d).some(m=>m.service.id===service.id&&m.link.id===link.id))
      if(matches.length!==1)throw Error('El despacho debe tener una entrega única vinculada.')
      const issue=driverChecklistIssue(matches[0],service);if(issue)throw Error(issue)
    }
    if((old?.driverDispatch||[]).some((e:any)=>!events.some((n:any)=>e.stage===n.stage&&e.date===n.date&&e.driverId===n.driverId)))throw Error('No se puede borrar ni reemplazar el historial ya registrado por el chofer.')
  }
  for(const delivery of data.logisticsDeliveries){
    const old=prior.logisticsDeliveries.find(d=>d.id===delivery.id)
    if(JSON.stringify(old?.driverChecklist)===JSON.stringify(delivery.driverChecklist))continue
    const matches=trackedServices(data as any,delivery)
    if(matches.length!==1||!data.campaigns.some(c=>c.id===delivery.campaignId&&c.estado==='En Proceso'))throw Error('Checklist sin carga única de campaña en proceso.')
    const service=matches[0].service
    if(!['Llegada','Cierre'].includes(dispatchStage(service)))throw Error('Confirma la llegada antes de registrar la recepción.')
    if(old&&trackedServices(prior as any,old).some(m=>dispatchStage(m.service)==='Cierre')&&(['receipt','discard','crates'] as const).some(step=>JSON.stringify(delivery.driverChecklist?.[step])!==JSON.stringify(old.driverChecklist?.[step])))throw Error('El despacho está cerrado; conserva el checklist del chofer.')
    for(const step of ['receipt','discard','crates','exitGuide'] as const){
      const stamp=delivery.driverChecklist?.[step]
      if(JSON.stringify(stamp)===JSON.stringify(old?.driverChecklist?.[step]))continue
      if(!stamp||stamp.driverId!==service.driverId||!Number.isFinite(Date.parse(stamp.at)))throw Error('Paso del chofer inválido.')
      const issue=receiptStepIssue(step,delivery,service);if(issue)throw Error(issue)
    }
  }
  for(const m of data.financialMovements){
    const old=prior.financialMovements.find(x=>x.id===m.id);if(JSON.stringify(old)===JSON.stringify(m))continue
    if(old)throw Error('El historial de movimientos no puede reemplazarse.')
    if(m.transportAdvanceLinkId)continue // Advance funding is validated separately and has no load document yet.
    const doc=(m.kind==='Cobro'?data.invoices:m.kind==='Pago'?data.settlements:[]).find(x=>x.id===m.documentId)
    if(m.kind==='Pago'&&doc&&'transportLinkId' in doc&&doc.transportLinkId&&!doc.transportServiceId)throw Error('Los nuevos pagos de transporte se registran en la liquidación de cada carga. El documento anterior se conserva como historial.')
    if(!doc||!Number.isFinite(m.amount)||m.amount<=0||!m.reference?.trim()||!m.evidence||!m.date||m.date<doc.date)throw Error('Movimiento financiero inválido.')
    if(m.kind==='Cobro'){const billingIssue=invoiceCollectionIssue(doc as import('../src/finance-model.js').Invoice,m.date);if(billingIssue)throw Error(billingIssue)}
    if(data.financialMovements.some(x=>x.id!==m.id&&x.kind===m.kind&&x.documentId===m.documentId&&x.reference.toLowerCase()===m.reference.toLowerCase()))throw Error('La referencia del movimiento ya existe.')
  }
  for(const old of prior.financialMovements)if(!data.financialMovements.some(m=>m.id===old.id))throw Error('El historial de movimientos debe conservarse.')
  for(const doc of data.invoices){if(paidTotal(data.financialMovements,'Cobro',doc.id)>invoiceTotal(doc)+.01)throw Error('Los cobros superan el total de la venta.')}
  for(const doc of data.settlements){if(paidTotal(data.financialMovements,'Pago',doc.id)>settlementTotal(doc)+.01)throw Error('Los pagos superan el total de la liquidación.')}
}

async function requestBody(req:Request){
  if(req.body!==undefined)return typeof req.body==='string'?JSON.parse(req.body):req.body
  let body='';for await(const part of req){body+=part.toString();if(body.length>2000000)throw Error('La solicitud es demasiado grande.')}
  return JSON.parse(body)
}

export default async function handler(req:Request,res:ServerResponse){
  if(!['GET','PATCH','POST'].includes(req.method||'')){res.setHeader('Allow','GET, PATCH, POST');return respond(res,405,{error:'Método no permitido.'})}
  const origin=req.headers.origin
  const host=req.headers['x-forwarded-host']||req.headers.host
  if(origin&&new URL(origin).host!==host)return respond(res,403,{error:'Origen no permitido.'})
  try{
    // Public prototype: all records are demonstration data.
    const actor:Actor={role:'admin'}
    if(req.method==='POST'){
      if(actor.role!=='admin')return respond(res,403,{error:'Solo el administrador puede generar accesos.'})
      const body=await requestBody(req) as ProviderPaymentCommand|TransportPaymentCommand|SettlementPaymentCommand|ApplyTransportAdvanceCommand|RecordTransportAdvanceCommand|{action?:undefined;transporterId:string;driverId:string}
      if(body.action==='settle-provider-and-pay'||body.action==='settle-transport-and-pay'||body.action==='settle-provider'||body.action==='settle-transport'||body.action==='record-settlement-payment'||body.action==='apply-transport-advance'||body.action==='record-transport-advance'){
        if(typeof body.id!=='string'||body.id.length>100)return respond(res,400,{error:'La solicitud de pago no es válida.'})
        const commandId=body.action+':'+body.id
        for(let attempt=0;attempt<5;attempt++){
          const current=await readSnapshot()
          if(current.snapshot.applied.includes(commandId))return respond(res,200,present(current.snapshot,actor),current.etag)
          let data:SharedData
          try{data=body.action==='apply-transport-advance'?applyTransportAdvance(current.snapshot.data,body):body.action==='record-transport-advance'?recordTransportAdvance(current.snapshot.data,body):body.action==='record-settlement-payment'?recordSettlementPayment(current.snapshot.data,body):(body.action==='settle-transport-and-pay'||body.action==='settle-transport')?paidTransportSettlement(current.snapshot.data,body):paidProviderSettlement(current.snapshot.data,body as ProviderPaymentCommand);validateBusiness(data,current.snapshot.data)}catch(error){return respond(res,409,{error:error instanceof Error?error.message:'No se pudo registrar la liquidación y su pago.',snapshot:present(current.snapshot,actor)},current.etag)}
          const next:Snapshot={...current.snapshot,revision:current.snapshot.revision+1,updatedAt:new Date().toISOString(),data,applied:[...current.snapshot.applied.slice(-199),commandId]}
          try{
            const saved=usesSupabase()?await writeSupabase(next,current.etag):await put(PATH,JSON.stringify(next),{access:'private',token:process.env.BLOB_READ_WRITE_TOKEN,allowOverwrite:true,addRandomSuffix:false,ifMatch:current.etag,contentType:'application/json'})
            return respond(res,200,present(next,actor),saved.etag)
          }catch(error){if(error instanceof BlobPreconditionFailedError||error instanceof SupabaseConflict)continue;throw error}
        }
        return respond(res,503,{error:'Otro dispositivo está guardando. Reintenta la misma liquidación.'})
      }
      const current=await readSnapshot()
      const accessBody=body as {transporterId:string;driverId:string}
      if(!current.snapshot.data.transporters.some(t=>t.id===accessBody.transporterId&&t.choferes.some((d:any)=>d.id===accessBody.driverId)))return respond(res,400,{error:'El chofer no existe.'})
      return respond(res,200,{url:'https://'+host+'/'})
    }
    if(req.method==='GET'){
      const match=req.headers['if-none-match']?.replace(/^W\//,'')
      if(usesSupabase()){const current=await readSupabase(match);return current.snapshot?respond(res,200,present(current.snapshot,actor),current.etag):respond(res,304,undefined,current.etag)}
      // Ask storage for a conditional response: unchanged data must not be downloaded again.
      const file=await get(PATH,{...options,...(match?{ifNoneMatch:match}:{})})
      if(file?.statusCode===304)return respond(res,304,undefined,file.blob.etag)
      const current=await decodeSnapshot(file)
      if(match===current.etag)return respond(res,304,undefined,current.etag)
      return respond(res,200,present(current.snapshot,actor),current.etag)
    }
    const batch=await requestBody(req) as ChangeBatch
    if(!batch||typeof batch.id!=='string'||batch.id.length>100||!Array.isArray(batch.changes)||!batch.changes.length||batch.changes.length>5000)return respond(res,400,{error:'Los cambios enviados no son válidos.'})
    for(let attempt=0;attempt<5;attempt++){
      const current=await readSnapshot()
      if(current.snapshot.applied.includes(batch.id))return respond(res,200,present(current.snapshot,actor),current.etag)
      let data:SharedData
      try{data=applyChanges(current.snapshot.data,batch.changes);authorizeDriverChanges(current.snapshot.data,data,batch.changes,actor);validateBusiness(data,current.snapshot.data)}catch(error){return respond(res,409,{error:error instanceof Error?error.message:'No se pudieron aplicar los cambios.',snapshot:present(current.snapshot,actor)},current.etag)}
      const next:Snapshot={...current.snapshot,revision:current.snapshot.revision+1,updatedAt:new Date().toISOString(),data,applied:[...current.snapshot.applied.slice(-199),batch.id]}
      try{
        const saved=usesSupabase()?await writeSupabase(next,current.etag):await put(PATH,JSON.stringify(next),{access:'private',token:process.env.BLOB_READ_WRITE_TOKEN,allowOverwrite:true,addRandomSuffix:false,ifMatch:current.etag,contentType:'application/json'})
        return respond(res,200,present(next,actor),saved.etag)
      }catch(error){if(error instanceof BlobPreconditionFailedError||error instanceof SupabaseConflict){continue}if(attempt<4&&/rate|too many|429/i.test(String(error))){await new Promise(r=>setTimeout(r,700*(attempt+1)));continue}throw error}
    }
    return respond(res,503,{error:'Otro dispositivo está guardando. Los cambios se reintentarán automáticamente.'})
  }catch(error){console.error('Shared state error:',error instanceof Error?error.message:'unknown');return respond(res,503,{code:'STORAGE_UNAVAILABLE',error:usesSupabase()?'No se pudo conectar con la base compartida de Supabase. Revisa el proyecto y su configuración; los datos se conservan.':/403|suspend|quota|blocked/i.test(error instanceof Error?error.message:'')?'Vercel ha bloqueado el acceso al almacenamiento compartido. El administrador debe revisar su cuota y reactivarlo. Los datos no se han reinicializado.':'No se pudo leer el archivo de datos compartidos. Se conserva el almacenamiento original; reintenta cuando se restablezca el servicio.'})}
}
