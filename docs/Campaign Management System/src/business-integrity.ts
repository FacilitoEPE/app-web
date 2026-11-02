import { campaignLifecycleIssue } from './campaign-lifecycle.js'
import { financialOriginIssue } from './financial-origin-integrity.js'
import type { SharedData } from './shared-protocol.js'
import { documentName, documentUrl } from './stored-documents.js'

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const text = (v: unknown) => typeof v === 'string' ? v.trim() : ''
const positive = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0
const changed = (a: any, b: any, fields: string[]) => !a || fields.some(k => !same(a[k], b[k]))
const attachmentUpgrade=(old:unknown,next:unknown)=>typeof old==='string'&&typeof next==='string'&&!documentUrl(old)&&!!documentUrl(next)&&documentName(old)===documentName(next)
export const validBusinessDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T12:00:00Z')) && new Date(v + 'T12:00:00Z').toISOString().slice(0, 10) === v
const normalized = (v: unknown) => text(v).replace(/[\s-]/g, '').toUpperCase()
const phone = (v: unknown) => /^[+\d\s()-]+$/.test(text(v)) && text(v).replace(/\D/g, '').length >= 7 && text(v).replace(/\D/g, '').length <= 15
const email = (v: unknown) => !text(v) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(v))
export type MasterKind = 'campaigns' | 'clients' | 'providers' | 'transporters' | 'vehicles' | 'drivers'

/** Validate only new or edited fields; unchanged historical omissions stay readable. */
export function masterIssue(kind: MasterKind, row: any, rows: any[], prior?: any): string {
  const relevant: Record<MasterKind, string[]> = {
    campaigns: ['nombre', 'fecha', 'fechaFin', 'fruta', 'reqComercial'],
    clients: ['empresa', 'ruc', 'telefono', 'correo'],
    providers: ['nombres', 'apellidos', 'dni', 'tipoDocumento', 'telefono', 'email'],
    transporters: ['empresa', 'tipo', 'ruc', 'documentoIdentidad', 'numero', 'correo'],
    vehicles: ['placa', 'ancho', 'altura', 'profundidad', 'volumen', 'pesoNeto', 'pesoBruto'],
    drivers: ['nombre', 'numeroDocumento', 'tipoDocumento', 'licencia', 'telefono', 'correo'],
  }
  if (!changed(prior, row, relevant[kind])) return ''
  const required = (field: string) => !prior || !same(prior[field], row[field])
  if (kind === 'campaigns') {
    if (required('nombre') && !text(row.nombre)) return 'Indica el nombre de la campaña.'
    if ((!prior || changed(prior, row, ['fecha', 'fechaFin'])) && (!validBusinessDate(row.fecha) || !validBusinessDate(row.fechaFin) || row.fechaFin < row.fecha)) return 'Completa fechas válidas de inicio y fin, en ese orden.'
    if (required('fruta') && !text(row.fruta)) return 'Selecciona la fruta de la campaña.'
    if (required('reqComercial') && !positive(row.reqComercial)) return 'El requerimiento comercial debe ser mayor a cero.'
    return ''
  }
  if (kind === 'clients' || kind === 'transporters') {
    if (required('empresa') && !text(row.empresa)) return 'Indica el nombre o razón social.'
  }
  if (kind === 'providers') {
    if (required('nombres') && !text(row.nombres) || required('apellidos') && !text(row.apellidos)) return 'Completa nombres y apellidos del proveedor.'
  }
  const documentField = kind === 'clients' ? 'ruc' : kind === 'providers' ? 'dni' : kind === 'transporters' ? row.tipo === 'Privado' ? 'documentoIdentidad' : 'ruc' : kind === 'drivers' ? 'numeroDocumento' : 'placa'
  if (required(documentField) || kind === 'transporters' && required('tipo')) {
    const value = normalized(row[documentField])
    if (!value) return kind === 'vehicles' ? 'Indica la placa del vehículo.' : 'Completa el documento de identificación.'
    const type = documentField === 'ruc' ? 'RUC' : text(row.tipoDocumento) || (kind === 'providers' ? 'DNI' : '')
    if ((type === 'RUC' && !/^\d{11}$/.test(value)) || (type === 'DNI' && !/^\d{8}$/.test(value))) return type === 'RUC' ? 'El RUC debe contener 11 dígitos.' : 'El DNI debe contener 8 dígitos.'
    if (rows.some(other => other.id !== row.id && normalized(other[documentField]) === value)) return kind === 'vehicles' ? 'La placa ya está registrada.' : 'El documento de identificación ya está registrado.'
  }
  if (kind === 'drivers') {
    if (required('nombre') && !text(row.nombre)) return 'Indica el nombre del chofer.'
    if (required('licencia') && !text(row.licencia)) return 'Indica la licencia del chofer.'
  }
  if (kind === 'vehicles') {
    for (const field of ['ancho', 'altura', 'profundidad', 'volumen', 'pesoNeto', 'pesoBruto']) {
      if (required(field) && text(row[field]) && !(Number.isFinite(Number(row[field])) && Number(row[field]) > 0)) return 'Las dimensiones y los pesos deben ser números mayores a cero.'
    }
  } else {
    const field = kind === 'transporters' ? 'numero' : 'telefono'
    if (required(field) && !phone(row[field])) return 'Completa un teléfono válido de 7 a 15 dígitos.'
    const mailField=kind==='providers'?'email':'correo'
    if (required(mailField) && !email(row[mailField])) return 'Indica un correo válido.'
  }
  return ''
}

export function contractIssue(s: SharedData, requirementId: string, contract: any, previous?: any): string {
  if (!positive(contract.kilos)) return 'La cantidad del contrato debe ser mayor a cero.'
  if (contract.precio !== undefined && (!Number.isFinite(contract.precio) || contract.precio < 0)) return 'El precio del contrato no puede ser negativo.'
  const deliveries = contract.entregas || []
  const scheduled = deliveries.reduce((sum: number, d: any) => sum + (Number(d.kilos) || 0), 0)
  if (scheduled > contract.kilos + .01) return 'Los kilos programados de todas las entregas superan el contrato. Amplía primero el contrato.'
  if (deliveries.some((d: any) => { const old=previous?.entregas?.find((x:any)=>x.id===d.id); return (!old || !same(old.kilos,d.kilos)) && !positive(d.kilos) })) return 'Cada entrega debe tener kilos mayores a cero.'
  if (deliveries.some((d:any)=>{const old=previous?.entregas?.find((x:any)=>x.id===d.id);return (!old||!same(old.fecha,d.fecha))&&!validBusinessDate(d.fecha)})) return 'Cada entrega debe tener una fecha válida.'
  const invoices = s.invoices.filter(i => i.requirementId === requirementId && i.contractId === contract.id)
  if (invoices.reduce((sum, i) => sum + i.kilos, 0) > contract.kilos + .01) return 'El contrato no puede quedar por debajo de los kilos ya facturados o preparados.'
  if (previous && invoices.length && changed(previous, contract, ['precio', 'moneda'])) return 'El precio y la moneda ya se usaron en una factura. Conserva esas condiciones y registra un nuevo contrato para el cambio.'
  return ''
}

export function receptionCloseIssue(d: any, administrative = false): string {
  if (!positive(d.evaluation?.plantWeight) || !text(d.evaluation?.result) || !text(d.evaluation?.report || d.documents?.receptionReport)) return 'Completa el peso, resultado y respaldo de recepción antes de cerrar.'
  if (!text(d.documents?.fruitGuide)) return 'Registra la guía de la carga antes de cerrar.'
  if (!d.unloading?.start || !d.unloading?.end || !Number.isFinite(Date.parse(d.unloading.start)) || !Number.isFinite(Date.parse(d.unloading.end)) || d.unloading.end < d.unloading.start) return 'Registra el inicio y término válidos de la descarga antes de cerrar.'
  if (administrative && (!d.physicalClosed || !text(d.documents?.signedExitGuide))) return 'Completa el cierre físico y la guía de salida firmada antes del cierre administrativo.'
  return ''
}

export function certificationPaymentIssue(cert: any, payment: any): string {
  if (!positive(payment.monto) || !validBusinessDate(payment.fecha) || !text(payment.referencia)) return 'Indica un monto positivo, fecha válida y referencia del pago de certificación.'
  const paid = (cert.pagos || []).filter((p: any) => p.id !== payment.id).reduce((sum: number, p: any) => sum + p.monto, 0)
  if (paid + payment.monto > cert.costo + .01) return 'El pago supera el saldo de la certificación.'
  return ''
}

/** Future edits are constrained without rewriting or rejecting unchanged legacy records. */
export function businessIntegrityIssue(s: SharedData, before: SharedData): string {
  const lifecycleIssue=campaignLifecycleIssue(s,before); if(lifecycleIssue)return lifecycleIssue
  const originIssue=financialOriginIssue(s,before); if(originIssue)return originIssue
  for (const kind of ['campaigns', 'clients', 'providers', 'transporters'] as const) {
    for (const row of s[kind]) {
      const old = before[kind].find(x => x.id === row.id)
      const issue = masterIssue(kind, row, s[kind], old)
      if (issue) return issue
      if (kind === 'transporters') {
        for (const [field, type] of [['vehiculos', 'vehicles'], ['choferes', 'drivers']] as const) {
          const all = s.transporters.flatMap(t => t[field] || [])
          for (const item of row[field] || []) { const issue = masterIssue(type, item, all, old?.[field]?.find((x: any) => x.id === item.id)); if (issue) return issue }
        }
      }
    }
  }
  for (const req of s.requirements) {
    const old = before.requirements.find(x => x.id === req.id)
    const docs = before.invoices.filter(i => i.requirementId === req.id)
    if (docs.length && changed(old, req, ['clientId', 'campaignId'])) return 'Conserva el cliente y la campaña de los contratos facturados.'
    for (const contract of req.contratos || []) {
      const prior = old?.contratos?.find((c: any) => c.id === contract.id)
      if (!same(prior, contract)) { const issue = contractIssue(s, req.id, contract, prior); if (issue) return issue }
    }
  }
  for (const old of before.invoices) {
    const doc = s.invoices.find(i => i.id === old.id)
    const priorReq = before.requirements.find(r => r.id === old.requirementId)
    const req = s.requirements.find(r => r.id === old.requirementId)
    if (!doc || priorReq && !req || priorReq?.contratos?.some((c:any)=>c.id===old.contractId) && !req?.contratos?.some((c: any) => c.id === old.contractId) || before.logisticsDeliveries.some(d=>d.id===old.deliveryId) && !s.logisticsDeliveries.some(d => d.id === old.deliveryId) || priorReq && before.clients.some(c=>c.id===priorReq.clientId) && !s.clients.some(c => c.id === priorReq.clientId) || priorReq && before.campaigns.some(c=>c.id===priorReq.campaignId) && !s.campaigns.some(c => c.id === priorReq.campaignId)) return 'No elimines una factura ni su cliente, campaña, contrato o recepción vinculados. Conserva el historial.'
  }
  for (const old of before.settlements) if (!s.settlements.some(d => d.id === old.id)) return 'No elimines liquidaciones de compra o transporte registradas.'
  for (const old of before.settlements) {
    if(old.providerId && before.providers.some(p=>p.id===old.providerId) && !s.providers.some(p=>p.id===old.providerId)) return 'Conserva el proveedor de las liquidaciones registradas.'
    if(old.operationId && before.qualityOperations.some(o=>o.id===old.operationId) && !s.qualityOperations.some(o=>o.id===old.operationId)) return 'Conserva el origen de la liquidación registrada.'
    if(old.deliveryId && before.logisticsDeliveries.some(d=>d.id===old.deliveryId) && !s.logisticsDeliveries.some(d=>d.id===old.deliveryId)) return 'Conserva la recepción de la liquidación registrada.'
    const link=before.campaignTransporters.find(l=>l.id===old.transportLinkId)
    if(link && before.transporters.some(t=>t.id===link.transporterId) && !s.transporters.some(t=>t.id===link.transporterId))return 'Conserva el transportista de los pagos registrados.'
  }
  for (const m of s.financialMovements) {
    if (m.transportAdvanceLinkId) continue
    if (!(m.kind === 'Cobro' ? s.invoices : s.settlements).some(d => d.id === m.documentId)) {
      if (!before.financialMovements.some(p => same(p, m))) return 'El movimiento debe estar vinculado con un documento existente.'
    }
  }
  for (const d of s.logisticsDeliveries) {
    const old = before.logisticsDeliveries.find(x => x.id === d.id)
    const docs = before.invoices.filter(i => i.deliveryId === d.id || d.transportServiceId && i.transportServiceId === d.transportServiceId)
    if (changed(old, d, ['evaluation', 'documents'])) {
      const weight = d.evaluation?.plantWeight
      const loaded = d.evaluation?.originWeight
      if (!same(old?.evaluation?.plantWeight, weight) && (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0 || positive(loaded) && weight > loaded + .01)) return 'El peso recibido debe ser válido y no superar el peso cargado.'
      if (docs.length) {
        if (positive(old?.evaluation?.plantWeight) && !same(old.evaluation.plantWeight, weight)) return 'La recepción ya se utilizó para facturar. Conserva su peso; requiere rectificación para modificarlo.'
        if (!positive(old?.evaluation?.plantWeight) && positive(weight) && Math.abs(docs.reduce((n, i) => n + i.kilos, 0) - weight) > .01) return 'El peso de una recepción anterior debe conciliar con su factura; registra una rectificación si hay diferencias.'
        for (const field of ['result', 'report']) if (text(old?.evaluation?.[field]) && !same(old.evaluation[field], d.evaluation?.[field]) && !(field==='report'&&attachmentUpgrade(old.evaluation[field],d.evaluation?.[field]))) return 'Conserva el resultado y respaldo de una recepción utilizada para facturar.'
        for (const field of ['receptionReport', 'fruitGuide']) if (text(old?.documents?.[field]) && !same(old.documents[field], d.documents?.[field]) && !attachmentUpgrade(old.documents[field],d.documents?.[field])) return 'Conserva los documentos de la recepción facturada.'
      }
    }
    if (docs.length && changed(old, d, ['clientId', 'campaignId', 'sourceDelivery', 'sourceOperationId'])) return 'Conserva el origen y cliente de la recepción facturada.'
    if (d.physicalClosed && !old?.physicalClosed || d.administrativeClosed && !old?.administrativeClosed) { const issue = receptionCloseIssue(d, !!d.administrativeClosed); if (issue) return issue }
  }
  for(const link of s.campaignTransporters){
    const priorLink=before.campaignTransporters.find(l=>l.id===link.id)
    for(const service of link.services||[]){
      const old=priorLink?.services?.find((x:any)=>x.id===service.id)
      if(!old)continue
      const receipts=before.logisticsDeliveries.filter(d=>d.campaignId===link.campaignId&&d.transportServiceId===service.id)
      const used=before.invoices.some(i=>i.transportServiceId===service.id||receipts.some(d=>d.id===i.deliveryId))||before.settlements.some(d=>d.transportServiceId===service.id)
      if(used && (!same(old.annotation?.kilos,service.annotation?.kilos)||!same(old.annotation?.providers,service.annotation?.providers)||changed(old,service,['driverId','vehicleId','sourceDelivery','operationId'])))return 'La carga ya tiene documentos financieros. Conserva kilos, proveedores, origen, camión y chofer.'
    }
  }
  for (const cert of s.certifications) {
    const old = before.certifications.find(c => c.id === cert.id)
    for (const p of cert.pagos || []) {
      const prior = old?.pagos?.find((x: any) => x.id === p.id)
      if (prior && !same(prior, p)) return 'Conserva el historial de pagos de certificación.'
      if (!prior) { const issue = certificationPaymentIssue(cert, p); if (issue) return issue }
    }
    if (old?.pagos?.some((p: any) => !cert.pagos?.some((x: any) => x.id === p.id))) return 'No elimines pagos de certificación.'
    if (!same(old?.costo, cert.costo) && (cert.pagos || []).reduce((n: number, p: any) => n + p.monto, 0) > cert.costo + .01) return 'El costo no puede quedar por debajo de los pagos de certificación.'
    for (const e of cert.ampliaciones || []) if (!old?.ampliaciones?.some((x: any) => same(x, e)) && (!positive(e.kilos) || !validBusinessDate(e.fecha) || !text(e.referencia))) return 'La ampliación requiere kilos positivos, fecha y referencia.'
  }
  for (const request of s.transportRequests || []) {
    const old = (before.transportRequests || []).find((r: any) => r.id === request.id)
    if (same(old, request)) continue
    if (!text(request.reference) || !s.campaigns.some(c => c.id === request.campaignId) || !validBusinessDate(request.date) || !request.companyIds?.length || request.companyIds.some((id: string) => !s.transporters.some(t => t.id === id))) return 'La solicitud requiere referencia, campaña, fecha y transportistas válidos.'
    for (const q of request.quotes || []) if (!request.companyIds.includes(q.companyId) || !positive(q.amount) || !['PEN', 'USD', 'EUR'].includes(q.currency)) return 'Revisa el transportista, importe y moneda de la cotización.'
    if (request.selectedQuoteId && !request.quotes.some((q: any) => q.id === request.selectedQuoteId)) return 'Selecciona una cotización registrada en esta solicitud.'
  }
  return ''
}
