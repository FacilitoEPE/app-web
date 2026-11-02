import type { Invoice } from './finance-model.js'

export function invoiceIsBilled(invoice: Invoice): boolean {
  if (invoice.billingStatus === 'Pendiente') return false
  if (invoice.billingStatus === 'Facturada') return !!(invoice.electronicInvoice?.number?.trim() && invoice.electronicInvoice.date && invoice.electronicInvoice.document?.trim())
  // Existing invoices retain their original number, document and collections.
  return !!invoice.document?.trim() && !/^LV[-\d]/i.test(invoice.number)
}

export function invoiceBillingIssue(invoice: Invoice, invoices: Invoice[]): string {
  if (invoice.billingStatus === undefined) return ''
  if (!['Pendiente', 'Facturada'].includes(invoice.billingStatus)) return 'El estado de facturación no es válido.'
  if (invoice.billingStatus === 'Pendiente') return invoice.electronicInvoice ? 'Una liquidación pendiente no debe tener una factura registrada.' : ''
  const bill = invoice.electronicInvoice
  if (!bill?.number?.trim() || !bill.date || !Number.isFinite(Date.parse(bill.date)) || !bill.document?.trim() || !bill.verifiedAt) return 'Completa el número, fecha y documento de la factura y verifica su información.'
  if (bill.date < invoice.date || invoice.due < bill.date) return 'La emisión debe ser posterior o igual a la liquidación y anterior o igual al vencimiento.'
  const number = bill.number.trim().toLowerCase()
  if (invoices.some(other => other.id !== invoice.id && (other.electronicInvoice?.number || (invoiceIsBilled(other) ? other.number : '')).trim().toLowerCase() === number)) return 'El número de factura ya está registrado.'
  return ''
}

export function invoiceCollectionIssue(invoice: Invoice, date: string): string {
  if (!invoiceIsBilled(invoice)) return 'Registra la factura emitida antes de registrar el cobro.'
  if (date < (invoice.electronicInvoice?.date || invoice.date)) return 'El cobro no puede ser anterior a la emisión de la factura.'
  return ''
}

export function nextSaleLiquidationNumber(invoices: Invoice[]): string {
  const last = invoices.reduce((max, item) => { const match = /^LV-?(\d+)$/i.exec(item.number); return match ? Math.max(max, Number(match[1])) : max }, 0)
  return 'LV-' + String(last + 1).padStart(6, '0')
}
