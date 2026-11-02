import type { SharedData } from './shared-protocol.js'
import { invoiceTotal, settlementTotal, paidTotal } from './finance-model.js'
import { invoiceIsBilled } from './sales-billing.js'
import { sameSource, trackedServices } from './delivery-tracking.js'
import { transportCompanyBalance } from './transport-advances.js'
import { dispatchStage } from './dispatch-model.js'

export type ClosureCheck = { label: string; pending: number; detail: string }
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const rows = (s: SharedData, key: string) => (s as any)[key] || []

export function campaignInvoices(s: SharedData, id: string) {
  return s.invoices.filter(i => s.requirements.some(r => r.id === i.requirementId && r.campaignId === id) || s.logisticsDeliveries.some(d => d.id === i.deliveryId && d.campaignId === id))
}
export function campaignSettlements(s: SharedData, id: string) {
  return s.settlements.filter(d => s.campaignTransporters.some(l => l.id === d.transportLinkId && l.campaignId === id) || s.qualityOperations.some(o => o.id === d.operationId && o.campaignId === id) || s.logisticsDeliveries.some(r => r.id === d.deliveryId && r.campaignId === id))
}

/** Derived warnings: reading never fills missing weights or changes old invoices. */
export function incompleteCampaignReceipts(s: SharedData, id?: string) {
  const invoices = id ? campaignInvoices(s, id) : s.invoices
  return invoices.filter(i => {
    const d = s.logisticsDeliveries.find(d => d.id === i.deliveryId)
    return !d || !(d.evaluation?.plantWeight > 0) || !d.evaluation?.result || !(d.evaluation?.report || d.documents?.receptionReport)
  })
}

export function campaignCloseChecks(s: SharedData, id: string): ClosureCheck[] {
  const requirements = s.requirements.filter(r => r.campaignId === id)
  const links = s.campaignTransporters.filter(l => l.campaignId === id)
  const services = links.flatMap(l => l.services || [])
  const receipts = s.logisticsDeliveries.filter(d => d.campaignId === id)
  const invoices = campaignInvoices(s, id), settlements = campaignSettlements(s, id)
  const trips = requirements.flatMap(r => (r.contratos || []).flatMap((c: any) => (c.entregas || []).map((d: any) => ({ requirementId: r.id, contractId: c.id, deliveryId: d.id }))))
  const receiptFor = (service: any) => receipts.filter(d => trackedServices(s as any, d).some(m => m.service.id === service.id))
  const unfulfilled = requirements.flatMap(r => r.contratos || []).filter((c: any) => (c.entregas || []).reduce((n: number, d: any) => n + (d.kilos || 0), 0) < c.kilos - .01).length
    + trips.filter(t => !services.some(service => sameSource(service.sourceDelivery, t) && service.annotation && receiptFor(service).length === 1 && receiptFor(service)[0].administrativeClosed)).length
  const pendingReceipt = receipts.filter(d => !d.physicalClosed || !d.administrativeClosed || !(d.evaluation?.plantWeight > 0) || !d.evaluation?.result || !(d.evaluation?.report || d.documents?.receptionReport) || !d.documents?.fruitGuide || !d.documents?.signedExitGuide || !d.unloading?.start || !d.unloading?.end).length
    + services.filter(service => !service.annotation || receiptFor(service).length !== 1).length
  const pendingOperations = s.qualityOperations.filter(o => o.campaignId === id && !/rechazad|cancelad/i.test(o.status || '') && (!receipts.some(d => d.sourceOperationId === o.id && d.administrativeClosed) || o.route === 'Exportación' && !o.closure?.completed && !o.closure?.endDate)).length
  const pendingSales = receipts.filter(d => {
    const docs = invoices.filter(i => i.deliveryId === d.id)
    return !docs.length || Math.abs(docs.reduce((n, i) => n + i.kilos, 0) - (d.evaluation?.plantWeight || 0)) > .01
  }).length + invoices.filter(i => !invoiceIsBilled(i)).length
  let pendingPurchases = 0
  for (const link of links) for (const service of link.services || []) {
    if (!service.annotation) continue
    const providers = service.annotation.providers?.length ? service.annotation.providers : service.providerId ? [{ providerId: service.providerId }] : []
    if (!providers.length) pendingPurchases++
    for (const p of providers) if (!settlements.some(d => !d.transportLinkId && d.transportServiceId === service.id && d.providerId === p.providerId)) pendingPurchases++
    if (!settlements.some(d => d.transportLinkId === link.id && d.transportServiceId === service.id)) pendingPurchases++
  }
  const outstandingSales = invoices.filter(i => Math.abs(invoiceTotal(i) - paidTotal(s.financialMovements, 'Cobro', i.id)) > .01).length
  const outstandingPayments = settlements.filter(d => Math.abs(settlementTotal(d) - paidTotal(s.financialMovements, 'Pago', d.id)) > .01).length
    + s.certifications.filter(c => c.campaignId === id && Math.abs((c.costo || 0) - (c.pagos || []).reduce((n: number, p: any) => n + p.monto, 0)) > .01).length
  const transportBalances = links.filter(l => {
    const b = transportCompanyBalance(s, l.id)
    return b.pendingLiquidation > .01 || b.availableAdvance > .01 || Math.abs(b.balance) > .01
  }).length
  return [
    { label: 'Contratos y viajes completados', pending: unfulfilled, detail: 'Todos los kilos contratados deben estar programados y cada entrega debe tener su recepción cerrada.' },
    { label: 'Despachos cerrados por el chofer', pending: services.filter(service => dispatchStage(service) !== 'Cierre').length, detail: 'El chofer debe completar su despacho hasta Cierre antes de finalizar la campaña.' },
    { label: 'Recepciones y documentación completas', pending: pendingReceipt, detail: 'Cada carga requiere recepción única, peso, resultado, respaldo, descarga y cierres físico y administrativo.' },
    { label: 'Operaciones de cosecha concluidas', pending: pendingOperations, detail: 'Las operaciones activas deben tener recepción cerrada; exportación también requiere cierre de cosecha.' },
    { label: 'Facturas registradas por viaje', pending: pendingSales, detail: 'Cada recepción debe tener su factura; una preparación pendiente todavía no es una factura.' },
    { label: 'Compras y transportes liquidados', pending: pendingPurchases, detail: 'Cada carga requiere liquidación del transportista y de cada proveedor participante.' },
    { label: 'Cobros conciliados', pending: outstandingSales, detail: 'Cada factura debe estar cobrada sin diferencias. Las monedas se verifican por documento.' },
    { label: 'Pagos y certificaciones conciliados', pending: outstandingPayments + transportBalances, detail: 'No deben quedar pagos, fletes, certificaciones o adelantos de transporte sin conciliar.' },
  ]
}

function campaignProjection(s: SharedData, id: string) {
  const invoices = campaignInvoices(s, id), settlements = campaignSettlements(s, id)
  const documentIds = new Set([...invoices, ...settlements].map(d => d.id))
  const linkIds = new Set(s.campaignTransporters.filter(l => l.campaignId === id).map(l => l.id))
  const linked = ['campaignProviders', 'interviews', 'certifications', 'requirements', 'qualityOperations', 'exportMtdRecords', 'logisticsDeliveries', 'campaignTransporters', 'transportRequests', 'payments']
  return { ...Object.fromEntries(linked.map(key => [key, rows(s, key).filter((r: any) => r.campaignId === id).sort((a: any, b: any) => a.id.localeCompare(b.id))])), invoices, settlements,
    movements: s.financialMovements.filter(m => documentIds.has(m.documentId) || linkIds.has(m.transportAdvanceLinkId || '')) }
}

/** A new closure is explicit; old closed campaigns never receive invented metadata. */
export function campaignLifecycleIssue(s: SharedData, before: SharedData): string {
  for (const old of before.campaigns) {
    const next = s.campaigns.find(c => c.id === old.id)
    if (old.estado === 'Finalizado' && (!next || !same(old, next) || !same(campaignProjection(before, old.id), campaignProjection(s, old.id)))) return 'La campaña está finalizada. Su historial es de consulta; no se admiten cambios operativos ni financieros.'
  }
  for (const next of s.campaigns) {
    const old = before.campaigns.find(c => c.id === next.id)
    if (next.estado !== 'Finalizado') {
      if (!same(old?.cierre, next.cierre)) return 'Los datos de cierre se registran únicamente al finalizar la campaña.'
      continue
    }
    if (old?.estado === 'Finalizado') continue
    if (!old || old.estado !== 'En Proceso') return 'Solo se puede finalizar una campaña en proceso.'
    if (!next.cierre?.motivo?.trim() || next.cierre.motivo.trim().length < 10 || !next.cierre.at || !Number.isFinite(Date.parse(next.cierre.at))) return 'Registra un motivo de cierre de al menos 10 caracteres y una fecha válida.'
    // Prevent clearing obligations and closing in a single PATCH.
    if (!same(campaignProjection(before, old.id), campaignProjection(s, old.id))) return 'Guarda primero los pendientes; el cierre se confirma como una operación separada.'
    const pending = campaignCloseChecks(s, old.id).filter(c => c.pending)
    if (pending.length) return 'No se puede finalizar: ' + pending.map(c => c.label + ' (' + c.pending + ')').join('; ') + '.'
  }
  return ''
}
