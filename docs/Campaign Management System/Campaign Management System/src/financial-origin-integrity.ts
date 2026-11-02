import type { SharedData } from './shared-protocol.js'
import { trackedServices } from './delivery-tracking.js'

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const changed = (a: any, b: any, fields: string[]) => fields.some(k => !same(a?.[k], b?.[k]))
const positive = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0

/** Protect known financial origins; never synthesize missing historical links. */
export function financialOriginIssue(s: SharedData, before: SharedData): string {
  const sources: { link: any; service: any }[] = []
  const receipts = new Set<string>()
  const trips: any[] = []
  for (const [key, fields] of [
    ['invoices', ['requirementId', 'contractId', 'deliveryId', 'transportServiceId']],
    ['settlements', ['operationId', 'deliveryId', 'transportLinkId', 'transportServiceId', 'providerId']],
  ] as const) {
    for (const old of before[key]) {
      const next = s[key].find(d => d.id === old.id)
      if (!next || changed(old, next, [...fields])) return 'Conserva el documento financiero y sus vínculos de origen. Cualquier cambio requiere una rectificación con historial.'
      const receipt = before.logisticsDeliveries.find(d => d.id === old.deliveryId)
      if (receipt) {
        receipts.add(receipt.id)
        if (receipt.sourceDelivery) trips.push(receipt.sourceDelivery)
        sources.push(...trackedServices(before as any, receipt))
      }
      const linkId = 'transportLinkId' in old ? old.transportLinkId : undefined
      const campaignId = 'requirementId' in old ? before.requirements.find(r => r.id === old.requirementId)?.campaignId : receipt?.campaignId
      for (const link of before.campaignTransporters) {
        if (linkId && link.id !== linkId || !linkId && campaignId && link.campaignId !== campaignId) continue
        for (const service of link.services || []) if (old.transportServiceId && service.id === old.transportServiceId) sources.push({ link, service })
      }
      if (linkId) {
        const link = before.campaignTransporters.find(l => l.id === linkId)
        const nextLink = s.campaignTransporters.find(l => l.id === linkId)
        if (link && (!nextLink || changed(link, nextLink, ['campaignId', 'transporterId']))) return 'Conserva la campaña y empresa del acuerdo que tiene documentos financieros.'
      }
    }
  }
  for (const { link, service } of sources) {
    const nextLink = s.campaignTransporters.find(l => l.id === link.id)
    const nextService = nextLink?.services?.find((x: any) => x.id === service.id)
    if (!nextLink || !nextService || changed(link, nextLink, ['campaignId', 'transporterId'])) return 'La carga tiene documentos financieros: no elimines ni traslades su servicio, campaña o transportista.'
    if (changed(service, nextService, ['sourceDelivery', 'operationId', 'vehicleId', 'driverId', 'providerId', 'fincaId']) || !same(service.annotation?.kilos, nextService.annotation?.kilos) || !same(service.annotation?.providers, nextService.annotation?.providers)) return 'La carga ya tiene documentos financieros. Conserva su origen, kilos, proveedores, camión y chofer.'
    if (service.sourceDelivery) trips.push(service.sourceDelivery)
    for (const receipt of before.logisticsDeliveries) if (receipt.campaignId === link.campaignId && receipt.transportServiceId === service.id) receipts.add(receipt.id)
    const carrier = before.transporters.find(t => t.id === link.transporterId)
    const nextCarrier = s.transporters.find(t => t.id === link.transporterId)
    if (carrier && !nextCarrier) return 'Conserva el transportista de la carga facturada o liquidada.'
    for (const [key, id] of [['vehiculos', service.vehicleId], ['choferes', service.driverId]] as const) if (carrier?.[key]?.some((r: any) => r.id === id) && !nextCarrier?.[key]?.some((r: any) => r.id === id)) return 'Conserva el vehículo y chofer utilizados por la carga con documentos financieros.'
  }
  for (const id of receipts) {
    const old = before.logisticsDeliveries.find(d => d.id === id)!
    const next = s.logisticsDeliveries.find(d => d.id === id)
    if (!next || changed(old, next, ['campaignId', 'clientId', 'sourceOperationId', 'sourceDelivery', 'transportServiceId'])) return 'Conserva la recepción y sus vínculos utilizados en facturación o liquidación.'
    if (old.physicalClosed && !next.physicalClosed || old.administrativeClosed && !next.administrativeClosed) return 'No reabras una recepción utilizada en documentos financieros. Se requiere una rectificación con historial.'
    const weight = old.evaluation?.originWeight, updated = next.evaluation?.originWeight
    if (!same(weight, updated)) {
      const matched = sources.filter(x => x.link.campaignId === old.campaignId && (old.transportServiceId === x.service.id || trackedServices(before as any, old).some(m => m.link.id === x.link.id && m.service.id === x.service.id)))
      const loaded = matched.length && matched.every(x => x.service.annotation?.kilos === matched[0].service.annotation?.kilos) ? matched[0].service.annotation?.kilos : undefined
      if (positive(weight) || !positive(updated) || !positive(loaded) || Math.abs(updated - loaded) > .01) return 'El peso de origen ya está vinculado a documentos financieros. Conserva el dato; un faltante solo puede completarse con el peso de su carga identificada.'
    }
  }
  for (const source of trips) {
    const requirement = before.requirements.find(r => r.id === source.requirementId)
    const contract = requirement?.contratos?.find((c: any) => c.id === source.contractId)
    const trip = contract?.entregas?.find((d: any) => d.id === source.deliveryId)
    // Old incomplete origins remain unchanged and readable, without inventing a trip.
    if (!trip) continue
    const nextRequirement = s.requirements.find(r => r.id === source.requirementId)
    const nextTrip = nextRequirement?.contratos?.find((c: any) => c.id === source.contractId)?.entregas?.find((d: any) => d.id === source.deliveryId)
    if (!nextTrip || changed(requirement, nextRequirement, ['campaignId', 'clientId']) || changed(trip, nextTrip, ['kilos', 'fecha', 'destino', 'providers', 'providerId', 'fincaIds', 'fincaId', 'vehicleId', 'driverId', 'transportLinkId', 'operationId'])) return 'La entrega programada tiene documentos financieros. No la elimines ni cambies su carga, cliente o coordinación de origen.'
  }
  for (const old of before.certifications) if (old.pagos?.length) {
    const next = s.certifications.find(c => c.id === old.id)
    if (!next || changed(old, next, ['campaignId', 'moneda'])) return 'La certificación tiene pagos: conserva el registro, su campaña, moneda e historial.'
    if (before.campaigns.some(c => c.id === old.campaignId) && !s.campaigns.some(c => c.id === old.campaignId)) return 'Conserva la campaña de la certificación con pagos registrados.'
  }
  return ''
}
