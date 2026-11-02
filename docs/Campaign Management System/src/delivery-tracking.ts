import type { CampaignTransporter, ClientRequirement, LogisticsDelivery, QualityOperation } from './store'
import { dispatchHistory } from './dispatch-model.js'

type Source = QualityOperation['sourceDelivery']
type TrackingData = { campaignTransporters:CampaignTransporter[]; qualityOperations:QualityOperation[]; requirements:ClientRequirement[] }
export const sourceKey = (s:Source) => s ? `${s.requirementId}|${s.contractId}|${s.deliveryId}` : ''
export const sameSource = (a:Source,b:Source) => !!a && !!b && sourceKey(a) === sourceKey(b)

/** Explicit service -> exact delivery -> guide -> operation. Never choose a truck by driver alone. */
export function trackedServices(s:TrackingData, d:LogisticsDelivery) {
  const operation=s.qualityOperations.find(o=>o.id===d.sourceOperationId)
  const all=s.campaignTransporters.filter(l=>l.campaignId===d.campaignId).flatMap(link=>link.services.map(service=>({link,service})))
  if(d.transportServiceId)return all.filter(m=>m.service.id===d.transportServiceId)
  const byReference=all.find(m=>d.reference===`DESP-${m.service.id}`)
  if(byReference)return [byReference]
  if(d.sourceDelivery){const exact=all.filter(m=>sameSource(m.service.sourceDelivery,d.sourceDelivery));if(exact.length)return exact}
  const candidates=all.filter(m=>m.service.operationId===d.sourceOperationId)
  const guide=d.documents.fruitGuide
  if(guide){const exact=candidates.filter(m=>m.service.guides?.some(g=>g.document===guide||g.reference===guide));if(exact.length)return exact}
  if(operation?.sourceDelivery){const exact=candidates.filter(m=>sameSource(m.service.sourceDelivery,operation.sourceDelivery));if(exact.length)return exact}
  const hinted=candidates.find(m=>m.service.id===operation?.transport?.id)
  return hinted?[hinted]:candidates.length===1?candidates:[]
}

/** Upgrade existing browser data in place and register missing rows per load, not per operation. */
export function reconcileLogistics(current:LogisticsDelivery[],s:TrackingData):LogisticsDelivery[] {
  let changed=false
  const result=current.map(d=>{
    const matches=trackedServices(s,d)
    if(matches.length!==1)return d
    const service=matches[0].service
    if(d.transportServiceId===service.id&&sameSource(d.sourceDelivery,service.sourceDelivery))return d
    changed=true
    return {...d,transportServiceId:service.id,sourceDelivery:service.sourceDelivery}
  })
  for(const link of s.campaignTransporters)for(const service of link.services){
    if(!service.annotation||!service.operationId||!service.sourceDelivery||result.some(d=>d.campaignId===link.campaignId&&d.transportServiceId===service.id))continue
    const operation=s.qualityOperations.find(o=>o.id===service.operationId&&o.campaignId===link.campaignId)
    const req=s.requirements.find(r=>r.id===service.sourceDelivery?.requirementId&&r.campaignId===link.campaignId)
    if(!operation||!req)continue
    const trip=req.contratos?.find(c=>c.id===service.sourceDelivery?.contractId)?.entregas.find(d=>d.id===service.sourceDelivery?.deliveryId)
    const history=dispatchHistory(service)
    const arrival=history.find(e=>e.stage==='Llegada')?.date||''
    const stage=history.at(-1)?.stage
    result.unshift({id:`dispatch-${link.id}-${service.id}`,reference:`DESP-${service.id}`,sourceOperationId:service.operationId,transportServiceId:service.id,sourceDelivery:service.sourceDelivery,campaignId:link.campaignId,clientId:req.clientId,destination:service.destination,logisticsStatus:arrival?'En recepción':stage==='Salida'||stage==='En camino'?'En ruta':'Preparada',estimatedArrival:trip?.end||service.end,windowStart:'',windowEnd:'',actualArrival:arrival,arrivalObservations:'',coordinationEvidence:'',waitingReason:'',rescheduledAttention:'',purchases:[],accountingStatus:'Pendiente de revisión',unloading:{start:'',end:'',observations:'',evidence:''},evaluation:{originWeight:service.annotation.kilos,plantWeight:0,report:'',observations:'',result:''},discard:{quantity:'',unit:'',reason:'',evidence:''},crates:{initial:'',returned:'',returnDate:'',evidence:'',coordination:'',vehicleExit:'',carrierCopy:false},documents:{fruitGuide:service.guides?.find(g=>g.generatedAt)?.document||'',purchaseDetail:'',receptionReport:'',discardEvidence:'',crateReturn:'',signedExitGuide:''},physicalClosed:false,administrativeClosed:false})
    changed=true
  }
  return changed?result:current
}
