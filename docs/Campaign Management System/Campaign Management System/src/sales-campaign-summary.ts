import type { SharedData } from './shared-protocol.js'
import { invoiceTotal, money, paidTotal } from './finance-model'
import { invoiceIsBilled } from './sales-billing'
import { saleInvoiceContext } from './sales-campaign-flow'

export function campaignClientContracts(s: SharedData, campaignId: string, clientId: string) {
  const seen = new Set<string>()
  const totals = new Map<string, { currency: string; total: number; missingPrices: number; count: number }>()
  let kilos = 0, count = 0
  for (const requirement of s.requirements.filter(item => item.campaignId === campaignId && item.clientId === clientId)) {
    for (const contract of requirement.contratos || []) {
      const key = `${requirement.id}:${contract.id}`
      if (seen.has(key)) continue
      seen.add(key)
      count++
      kilos += contract.kilos
      const currency = contract.moneda || 'PEN'
      const row = totals.get(currency) || { currency, total: 0, missingPrices: 0, count: 0 }
      row.count++
      if (contract.precio == null) row.missingPrices++
      else row.total += money(contract.kilos * contract.precio)
      totals.set(currency, row)
    }
  }
  return { kilos, count, totals: [...totals.values()].map(row => ({ ...row, total: money(row.total) })).sort((a, b) => a.currency.localeCompare(b.currency)) }
}

export function campaignReceivables(s: SharedData, campaignId: string) {
  const totals = new Map<string, { currency: string; invoiced: number; collected: number; balance: number }>()
  for (const invoice of s.invoices) {
    if (saleInvoiceContext(s, invoice).campaignId !== campaignId || !invoiceIsBilled(invoice)) continue
    const row = totals.get(invoice.currency) || { currency: invoice.currency, invoiced: 0, collected: 0, balance: 0 }
    const total = invoiceTotal(invoice), collected = paidTotal(s.financialMovements, 'Cobro', invoice.id)
    row.invoiced += total
    row.collected += collected
    row.balance += Math.max(0, money(total - collected))
    totals.set(invoice.currency, row)
  }
  return [...totals.values()].map(row => ({ ...row, invoiced: money(row.invoiced), collected: money(row.collected), balance: money(row.balance) })).sort((a, b) => a.currency.localeCompare(b.currency))
}
