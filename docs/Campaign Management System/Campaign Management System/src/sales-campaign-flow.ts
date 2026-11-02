import type { SharedData } from './shared-protocol.js'
import { saleSources } from './finance-flow.js'

export function receivedSaleSources(s: SharedData) {
  return saleSources(s).filter(source => {
    const delivery = s.logisticsDeliveries.find(item => item.id === source.deliveryId)
    return delivery && Number.isFinite(delivery.evaluation?.plantWeight) && delivery.evaluation.plantWeight > 0 && !!delivery.evaluation.result && !!(delivery.evaluation.report || delivery.documents?.receptionReport)
  })
}

export function saleInvoiceContext(s: SharedData, invoice: { requirementId: string }) {
  const requirement = s.requirements.find(item => item.id === invoice.requirementId)
  return { campaignId: requirement?.campaignId || '', clientId: requirement?.clientId || '' }
}
