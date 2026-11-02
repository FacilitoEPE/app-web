import { Field, Input } from './ui'

export type LoadTravelExpenses = { mobility: number; supplies: number; currency: 'PEN' }
export type TravelExpenseDraft = { mobility: string; supplies: string }
export const travelExpenseDraft = (value?: LoadTravelExpenses): TravelExpenseDraft => ({mobility: value ? String(value.mobility) : '', supplies: value ? String(value.supplies) : ''})
export const validTravelExpenses = (value: TravelExpenseDraft) => Object.values(value).every(v => v.trim() === '' || Number.isFinite(Number(v)) && Number(v) >= 0)
export const travelExpenseAmounts = (value: TravelExpenseDraft): LoadTravelExpenses => ({mobility: Number(value.mobility) || 0, supplies: Number(value.supplies) || 0, currency: 'PEN'})
const soles = (value: number) => `S/ ${value.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}`

export function LoadTravelExpensesEditor({value,onChange}:{value:TravelExpenseDraft;onChange:(value:TravelExpenseDraft)=>void}) {
  return <section className="mt-4 rounded-xl border border-line p-4"><h3 className="mb-3 font-semibold">Viáticos</h3><div className="grid gap-3 sm:grid-cols-2"><Field label="Gasto de movilidad (S/)"><Input aria-label="Gasto de movilidad" type="number" min="0" step="0.01" placeholder="0.00" value={value.mobility} onChange={e=>onChange({...value,mobility:e.target.value})}/></Field><Field label="Insumos del personal (S/)"><Input aria-label="Gasto de insumos del personal" type="number" min="0" step="0.01" placeholder="0.00" value={value.supplies} onChange={e=>onChange({...value,supplies:e.target.value})}/></Field></div><p className="mt-3 text-sm font-medium">Total: {soles((Number(value.mobility)||0)+(Number(value.supplies)||0))}</p></section>
}

export function LoadTravelExpensesSummary({value}:{value?:LoadTravelExpenses}) {
  if (!value) return null
  return <section className="my-4 rounded-xl border border-line p-4"><h3 className="mb-2 font-semibold">Viáticos</h3><p className="text-sm">Movilidad: {soles(value.mobility)} · Insumos del personal: {soles(value.supplies)}</p><p className="mt-2 text-sm font-semibold">Total: {soles(value.mobility+value.supplies)}</p></section>
}
