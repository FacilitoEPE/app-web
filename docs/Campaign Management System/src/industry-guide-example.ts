import type { SharedData } from './shared-protocol'
/** One independent demonstration load; existing guides and driver histories stay intact. */
export function addIndustryGuideExample(data:Pick<SharedData,'campaigns'|'requirements'|'qualityOperations'|'campaignTransporters'|'providers'>,today:string,suffix='') {
 const serviceId='demo-industria-agregar-guia'+suffix,requirementId='demo-requerimiento-guia-industria'+suffix,contractId='demo-contrato-guia-industria'+suffix,deliveryId='demo-entrega-guia-industria'+suffix,operationId='demo-operacion-guia-industria'+suffix
 if(data.campaignTransporters.some(l=>l.services.some((s:any)=>s.id===serviceId)))return serviceId
 const base=data.requirements.find(r=>r.canal==='Industria'&&r.fruta==='Mango'&&data.campaigns.some(c=>c.id===r.campaignId&&c.estado==='En Proceso'))
 if(!base)throw Error('No hay campaña de industria activa para el ejemplo.')
 const link=data.campaignTransporters.find(l=>l.campaignId===base.campaignId&&l.services.some((s:any)=>(s.sourceDelivery?.requirementId||s.guides?.[0]?.requirementId)===base.id))
 const source=link?.services.find((s:any)=>s.annotation?.providers?.length>=2)
 if(!link||!source)throw Error('Falta una carga con transportista y proveedores vinculados.')
 const previous=source.sourceDelivery||source.guides?.[0]
 const priorDelivery=base.contratos.flatMap((c:any)=>c.entregas).find((d:any)=>d.id===previous?.deliveryId)
 const providers=source.annotation.providers.slice(0,2).map((p:any,index:number)=>({providerId:p.providerId,variety:p.variety||'Mango Edward',kilos:index===0?360:240,packages:[{type:'Jabas',loaded:index===0?18:12,empty:0}]}))
 const origins=providers.map((entry:any)=>{const d=priorDelivery?.providers?.find((p:any)=>p.providerId===entry.providerId);const fincaId=d?.fincaIds?.[0]||data.providers.find(p=>p.id===entry.providerId)?.fincas?.[0]?.id;if(!fincaId)throw Error('Proveedor sin finca.');return {providerId:entry.providerId,fincaIds:[fincaId]}})
 const origin=origins.map((p:any)=>data.providers.find(x=>x.id===p.providerId)?.fincas.find((f:any)=>f.id===p.fincaIds[0])?.nombre).join(' / ')
 const date=new Date(today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+3);const start=date.toISOString().slice(0,10)
 const destination=source.destination||'Planta de proceso Callao'
 const sourceDelivery={requirementId,contractId,deliveryId}
 const delivery={id:deliveryId,fecha:start,kilos:600,destino:destination,observaciones:'DEMO · Agregar guía de industria',providers:origins,providerId:origins[0].providerId,fincaId:origins[0].fincaIds[0],transportLinkId:link.id,vehicleId:source.vehicleId,driverId:source.driverId,start,end:start,origin,operationId,conditions:'Carga sintética para probar Agregar guía.',varietyQuantities:[{variety:base.variedad,kilos:600}]}
 const contract={id:contractId,fecha:today,contrato:'contrato-demo-guia-industria.pdf',kilos:600,precio:base.contratos[0]?.precio||2.4,moneda:base.contratos[0]?.moneda||'USD',condicionesPago:'Demostración',condicionesEntrega:'Entrega en planta',observaciones:'DEMO · Agregar guía',entregas:[delivery]}
 data.requirements.push({...structuredClone(base),id:requirementId,kilos:600,kilosAcordados:600,cantidadPropuesta:600,fechaRegistro:today,entregaInicio:start,entregaFin:start,entrega:`${start} / ${start}`,observaciones:'DEMO · Agregar guía de industria',contrato:contract.contrato,contratos:[contract],entregas:[delivery]})
 const annotation={responsible:'Anotador de demostración',registeredAt:new Date().toISOString(),loadDate:start,qualityResult:'Cumple',kilos:600,packages:[{type:'Jabas',loaded:30,empty:0}],providers,expenses:[],observations:'DEMO · 600 kg disponibles para agregar guía.'}
 const loadNumber=Math.max(0,...data.qualityOperations.filter(o=>o.campaignId===base.campaignId).map(o=>Number(o.loadNumber)||0))+1
 data.qualityOperations.push({id:operationId,reference:'DEMO-IND-AGREGAR-GUIA',campaignId:base.campaignId,route:'Industria',providerId:origins[0].providerId,origin,expectedDate:start,status:'Carga registrada',estimatedQuantity:600,harvestedQuantity:0,acceptedQuantity:600,loadedQuantity:600,plantQuantity:0,variety:base.variedad,observations:'DEMO · Agregar guía de industria',analyses:[],advances:[],qualityDecision:'Aprobada',clientRequirementId:requirementId,sourceDelivery,loadNumber})
 link.services.push({id:serviceId,operationId,sourceDelivery,providerId:origins[0].providerId,fincaId:origins[0].fincaIds[0],vehicleId:source.vehicleId,driverId:source.driverId,start,end:start,origin,destination,conditions:delivery.conditions,logisticsCompleted:true,annotation,guides:[],movements:[],driverDispatch:[]})
 return serviceId
}
