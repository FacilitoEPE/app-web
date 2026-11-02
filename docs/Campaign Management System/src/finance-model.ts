export interface Invoice {
  billingStatus?: 'Pendiente' | 'Facturada'
  electronicInvoice?: { number: string; date: string; document: string; verifiedAt: string }
  transportServiceId?: string
  supportingDocument?: string
  id: string
  number: string
  requirementId: string
  contractId: string
  deliveryId: string
  date: string
  due: string
  kilos: number
  price: number
  discount: number
  charges: number
  currency: string
  document: string
  notes: string
}

export interface TransportExpense { id:string; concept:string; amount:number; currency:string; rate:number; included:boolean }

export interface PurchaseSettlement {
  settlementPersonId?: string
  settlementPerson?: { nombres:string; apellidos:string; tipoDocumento:string; dni:string }
  paidOnSettlement?: boolean
  quantityBasis?: 'Loaded'
  transportExpenses?: TransportExpense[]
  transportBudgetPen?: number
  exchangeRateToPen?: number
  exchangeRateSource?: string
  uitLimitAcknowledged?: boolean
  providerId?: string
  transportServiceId?: string
  deliveryId?: string
  fincaIds?: string[]
  supportingDocument?: string
  id: string
  number: string
  operationId: string
  transportLinkId?: string
  date: string
  due: string
  kilos: number
  price: number
  deductions: number
  additions: number
  adjustmentReason: string
  currency: string
  document: string
  notes: string
}

export interface FinancialMovement {
  advanceSourceId?: string
  transportAdvanceLinkId?: string
  id: string
  kind: 'Cobro' | 'Pago'
  documentId: string
  date: string
  amount: number
  method: string
  reference: string
  evidence: string
  notes: string
}

export const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
export const invoiceTotal = (item: Invoice) => money(item.kilos * item.price - item.discount + item.charges)
export const settlementTotal = (item: PurchaseSettlement) => money(item.kilos * item.price - item.deductions + item.additions)
export const paidTotal = (movements: FinancialMovement[], kind: FinancialMovement['kind'], id: string) => money(movements.filter((item) => item.kind === kind && item.documentId === id).reduce((sum, item) => sum + item.amount, 0))
export const limaDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
export const financialStatus = (total: number, paid: number, due: string, kind: 'Cobro' | 'Pago') => money(total - paid) <= 0 ? kind === 'Cobro' ? 'Cobrada' : 'Pagada' : due && due < limaDate() ? 'Vencida' : paid > 0 ? 'Parcial' : 'Pendiente'

export const demoInvoices: Invoice[] = [
  { id: 'inv1', number: 'F001-000001', requirementId: 'r1', contractId: 'contract-r1', deliveryId: 'ld2', date: '2026-10-01', due: '2026-10-20', kilos: 500, price: 2.9, discount: 0, charges: 0, currency: 'USD', document: 'factura-sutrimex-001.pdf', notes: 'Ejemplo de factura parcial del contrato.' },
]
export const demoSettlements: PurchaseSettlement[] = [
  { id: 'liq1', number: 'LIQ-000001', operationId: 'op6', date: '2026-10-01', due: '2026-10-15', kilos: 915, price: 2, deductions: 100, additions: 0, adjustmentReason: 'Deducción acordada por gastos de compra.', currency: 'PEN', document: 'liquidacion-compra-001.pdf', notes: 'Ejemplo basado en la recepción de la operación IND-MAN-003.' },
]
export const demoMovements: FinancialMovement[] = [
  { id: 'fm1', kind: 'Cobro', documentId: 'inv1', date: '2026-10-02', amount: 400, method: 'Transferencia', reference: 'OP-COBRO-001', evidence: 'voucher-cobro-001.pdf', notes: 'Primer abono del cliente.' },
  { id: 'fm2', kind: 'Pago', documentId: 'liq1', date: '2026-10-02', amount: 500, method: 'Transferencia', reference: 'OP-PAGO-001', evidence: 'voucher-pago-001.pdf', notes: 'Primer abono al proveedor.' },
]

export function nextProviderSettlementNumber(documents:PurchaseSettlement[]){
 const last=documents.filter(d=>!d.transportLinkId).reduce((n,d)=>{const match=/^(?:LC|LIQ)-?(\d+)$/i.exec(d.number);const value=match?Number(match[1]):0;return Number.isSafeInteger(value)?Math.max(n,value):n},0)
 return 'LC-'+String(last+1).padStart(6,'0')
}

export function nextTransportSettlementNumber(documents:PurchaseSettlement[]){
 const last=documents.filter(d=>d.transportLinkId).reduce((n,d)=>{const match=/^LT-(\d+)$/i.exec(d.number);return match?Math.max(n,Number(match[1])):n},0)
 return 'LT-'+String(last+1).padStart(6,'0')
}
