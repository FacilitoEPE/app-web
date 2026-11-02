import type { SharedData } from './shared-protocol.js'
import { saleSources, type LiquidationSource } from './finance-flow.js'
import { trackedServices } from './delivery-tracking.js'

export type RegisteredSaleLoad = {
  key: string; campaignId: string; clientId: string; serviceId: string;
  reference: string; loaded: number; variety: string; price: number; currency: string;
  source?: LiquidationSource; received: boolean; missingReason: string;
}

export function hasDocumentedSaleReceipt(delivery: any): boolean {
  return !!delivery && Number.isFinite(delivery.evaluation?.plantWeight) && delivery.evaluation.plantWeight > 0 && !!delivery.evaluation.result && !!(delivery.evaluation.report || delivery.documents?.receptionReport)
}

/** One physical registered load per carrier-link/service, regardless of receipt state. */
export function registeredSaleLoads(s: SharedData): RegisteredSaleLoad[] {
  const sources = saleSources(s)
  const rows: RegisteredSaleLoad[] = []
  const seen = new Set<string>()
  for (const link of s.campaignTransporters) for (const service of link.services) {
    if (!service.annotation) continue
    const key = `${link.id}:${service.id}`
    if (seen.has(key)) continue
    seen.add(key)
    const matches = sources.filter(source => {
      if (source.campaignId !== link.campaignId) return false
      const delivery = s.logisticsDeliveries.find(item => item.id === source.deliveryId)
      return delivery && trackedServices(s as any, delivery).some(item => item.link.id === link.id && item.service.id === service.id)
    })
    const operation = s.qualityOperations.find(item => item.id === service.operationId && item.campaignId === link.campaignId)
    const origin = service.sourceDelivery || operation?.sourceDelivery
    const requirement = s.requirements.find(item => item.id === origin?.requirementId && item.campaignId === link.campaignId)
    const clientIds = new Set(matches.map(source => source.partyId).filter(Boolean))
    const clientId = requirement?.clientId || (clientIds.size === 1 ? [...clientIds][0] : '')
    if (!clientId || !s.clients.some(item => item.id === clientId)) continue
    const exact = matches.filter(source => source.partyId === clientId)
    const source = exact.length === 1 ? exact[0] : undefined
    const delivery = source && s.logisticsDeliveries.find(item => item.id === source.deliveryId)
    const contract = requirement?.contratos?.find((item: any) => item.id === origin?.contractId)
    rows.push({ key, campaignId: link.campaignId, clientId, serviceId: service.id,
      reference: source?.reference || service.destination || 'Carga registrada',
      loaded: service.annotation.kilos, variety: source?.variety || requirement?.variedad || service.annotation.variety || '',
      price: source?.price || contract?.precio || 0, currency: source?.currency || contract?.moneda || '',
      source, received: hasDocumentedSaleReceipt(delivery),
      missingReason: exact.length > 1 ? 'Revisar vínculo logístico: hay varios registros para esta carga.' : 'Completa el vínculo de esta carga con su entrega en Logística y Despacho.',
    })
  }
  return rows
}
