import type { FinancialMovement, Invoice } from './finance-model.js'
import { invoiceTotal, money, paidTotal } from './finance-model.js'
import { invoiceIsBilled } from './sales-billing.js'

export function saleProgress(received: boolean, invoices: Invoice[], movements: FinancialMovement[]) {
  if (!invoices.length) return received ? 'Pendiente de preparación' : 'Pendiente de recepción'
  if (invoices.some(invoice => !invoiceIsBilled(invoice))) return 'Pendiente de facturación'
  const balance = money(invoices.reduce((sum, invoice) => sum + Math.max(0, money(invoiceTotal(invoice) - paidTotal(movements, 'Cobro', invoice.id))), 0))
  if (balance <= 0) return 'Cobrada'
  return invoices.some(invoice => paidTotal(movements, 'Cobro', invoice.id) > 0) ? 'Cobro parcial' : 'Pendiente de cobro'
}

export function saleReceiptSummary(received: boolean, invoices: Invoice[]) {
  if (received) return { label: 'Recepción documentada', missingSupport: false }
  if (invoices.length) return { label: 'Sin respaldo de recepción en Logística', missingSupport: true }
  return { label: 'Recepción pendiente de documentar', missingSupport: false }
}

export function saleWeightSummary(delivery: { evaluation?: { plantWeight?: number } } | undefined, invoices: Invoice[]) {
  const weight = delivery?.evaluation?.plantWeight
  const received = typeof weight === 'number' && Number.isFinite(weight) && weight > 0 ? weight : undefined
  const billed = invoices.filter(invoiceIsBilled)
  const invoiced = billed.length ? billed.reduce((sum, invoice) => sum + invoice.kilos, 0) : undefined
  return { received, invoiced }
}
