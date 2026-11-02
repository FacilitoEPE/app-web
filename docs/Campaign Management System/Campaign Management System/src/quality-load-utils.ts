import type { QualityOperation, CampaignTransporter, useStore } from './store'

export const deliveryKey = (source: QualityOperation['sourceDelivery']) => source ? `${source.requirementId}|${source.contractId}|${source.deliveryId}` : ''

/** A delivery is reserved even when its load is pending or rejected. */
export function deliveryHasLoad(operations: QualityOperation[], transporters: CampaignTransporter[], source: QualityOperation['sourceDelivery'], exclude: { exportOperationId?: string; serviceId?: string } = {}) {
  const key = deliveryKey(source)
  if (!key) return false
  return operations.some(o => (o.route === 'Exportación' && o.id !== exclude.exportOperationId && deliveryKey(o.sourceDelivery) === key) || o.rejectedDeliveries?.some(r => deliveryKey(r.sourceDelivery) === key)) || transporters.some(t => t.services.some(i => i.id !== exclude.serviceId && i.annotation && deliveryKey(i.sourceDelivery) === key))
}

/** Only coordinated deliveries can enter the harvest/load flow. */
export function deliveryReady(s: Pick<ReturnType<typeof useStore>, 'requirements'|'campaignTransporters'|'transporters'|'providers'|'campaignProviders'>, source: QualityOperation['sourceDelivery']) {
  if(!source)return false
  const r=s.requirements.find(r=>r.id===source.requirementId)
  const d=r?.contratos?.find(c=>c.id===source.contractId)?.entregas.find(d=>d.id===source.deliveryId)
  const link=s.campaignTransporters.find(l=>l.id===d?.transportLinkId&&l.campaignId===r?.campaignId)
  const t=s.transporters.find(t=>t.id===link?.transporterId)
  const providers=d?.providers||(d?.providerId?[{providerId:d.providerId,fincaIds:d.fincaId?[d.fincaId]:[]}]:[])
  return !!(d&&link&&t?.vehiculos.some(v=>v.id===d.vehicleId)&&t.choferes.some(c=>c.id===d.driverId)&&d.start&&d.end&&d.end>=d.start&&d.origin?.trim()&&d.destino.trim()&&providers.length&&providers.every(entry=>entry.fincaIds.length&&s.campaignProviders.some(p=>p.campaignId===r?.campaignId&&p.providerId===entry.providerId)&&entry.fincaIds.every(id=>s.providers.find(p=>p.id===entry.providerId)?.fincas?.some(f=>f.id===id))))
}
