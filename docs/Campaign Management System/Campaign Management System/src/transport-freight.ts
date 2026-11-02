import { money, paidTotal } from './finance-model.js'
import type { CampaignTransporter, ClientRequirement } from './store.js'
import type { PurchaseSettlement, FinancialMovement } from './finance-model.js'

type Data={campaignTransporters:CampaignTransporter[];requirements:ClientRequirement[];settlements:PurchaseSettlement[];financialMovements:FinancialMovement[]}
export function loadFreight(s:Data,linkId:string,serviceId:string):number|undefined{
 const service=s.campaignTransporters.find(l=>l.id===linkId)?.services.find(x=>x.id===serviceId)
 if(!service)return undefined
 const source=service.sourceDelivery
 const delivery=source&&s.requirements.find(r=>r.id===source.requirementId)?.contratos?.find(c=>c.id===source.contractId)?.entregas.find(d=>d.id===source.deliveryId)
 return service.freight??(delivery?.transportLinkId===linkId?delivery.freight:undefined)??s.settlements.find(d=>d.transportLinkId===linkId&&d.transportServiceId===serviceId)?.price
}
export function freightUsage(s:Data,linkId:string){
 const legacyPaid=money(s.settlements.filter(d=>d.transportLinkId===linkId&&!d.transportServiceId).reduce((n,d)=>n+paidTotal(s.financialMovements,'Pago',d.id),0))
 const assigned=money(s.settlements.filter(d=>d.transportLinkId===linkId&&d.transportServiceId).reduce((n,d)=>n+d.kilos*d.price,0))
 return {legacyPaid,assigned,available:money((s.campaignTransporters.find(l=>l.id===linkId)?.paymentAgreement?.total||0)-assigned)}
}
export function freightExceptionAllowance(s:Data,linkId:string){
 const link=s.campaignTransporters.find(l=>l.id===linkId)
 return money(s.settlements.filter(d=>d.transportLinkId===linkId&&d.transportServiceId&&link?.services.find(x=>x.id===d.transportServiceId)?.freightObservation?.trim()).reduce((n,d)=>n+d.kilos*d.price,0))
}
export function freightIssue(s:Data,prior?:Data){
 for(const link of s.campaignTransporters){
  const old=prior?.campaignTransporters.find(l=>l.id===link.id)
  for(const service of link.services){
   if(service.freight===undefined)continue
   if(!Number.isFinite(service.freight)||service.freight<=0||!link.paymentAgreement)return 'Asigna un flete mayor a cero con un acuerdo registrado.'
   const previous=old?.services.find(x=>x.id===service.id)
   const doc=s.settlements.find(d=>d.transportLinkId===link.id&&d.transportServiceId===service.id)
   const hasMovements=doc&&prior?.financialMovements.some(m=>m.kind==='Pago'&&m.documentId===doc.id)
   if(hasMovements&&previous&&service.freightObservation!==previous.freightObservation)return 'La observación de un flete liquidado debe conservarse.'
   if(doc&&Math.abs(service.freight-doc.price)>.001)return 'El flete de la carga y de su liquidación deben coincidir.'
   if(previous?.freight!==undefined&&hasMovements&&previous.freight!==service.freight)return 'La liquidación ya tiene pagos o adelantos aplicados: conserva su flete.'
  }
  for(const r of s.requirements)for(const c of r.contratos||[])for(const d of c.entregas||[])if(d.transportLinkId===link.id&&d.freight!==undefined){
   if(!Number.isFinite(d.freight)||d.freight<=0||!link.paymentAgreement)return 'Revisa el flete de la entrega coordinada.'
   const service=link.services.find(x=>x.sourceDelivery?.requirementId===r.id&&x.sourceDelivery?.contractId===c.id&&x.sourceDelivery?.deliveryId===d.id)
   if(service?.freight!==undefined&&service.freight!==d.freight)return 'El flete de la entrega y de la carga debe coincidir.'
  }
  const hasAllocation=s.settlements.some(d=>d.transportLinkId===link.id&&d.transportServiceId)||link.services.some(x=>x.freight!==undefined)||s.requirements.some(r=>r.contratos?.some(c=>c.entregas.some(d=>d.transportLinkId===link.id&&d.freight!==undefined)))
  if(hasAllocation&&freightUsage(s,link.id).available<-.001){
   if(freightExceptionAllowance(s,link.id)+.001< -freightUsage(s,link.id).available)return 'Los fletes superan el acuerdo. Registra una observación que justifique el exceso.'
   if(prior)for(const doc of s.settlements.filter(d=>d.transportLinkId===link.id&&d.transportServiceId)){
    const before=prior.settlements.find(x=>x.id===doc.id)
    if(doc.price>(before?.price||0)+.001&&!link.services.find(x=>x.id===doc.transportServiceId)?.freightObservation?.trim())return 'El flete que supera el acuerdo requiere una observación en esta liquidación.'
   }
  }
 }
 return ''
}
