import { useState } from 'react'
import { useStore, type Campaign, type ClientRequirement, type CommercialContract } from './store'
import { IndustryDeliverySummary } from './industry-delivery'
import { Button, Field, Select, Modal, fmtDate, fmtNum } from './ui'

type Delivery = CommercialContract['entregas'][number]
export const UNALLOCATED_VARIETY = 'Por distribuir'
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
export const shiftDate = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`))
export function mondayOf(value: string) {
  const day = new Date(`${value}T12:00:00Z`).getUTCDay()
  return shiftDate(value, -(day === 0 ? 6 : day - 1))
}
export function weekLabel(monday: string) {
  const thursday = shiftDate(monday, 3)
  const year = Number(thursday.slice(0, 4))
  const first = mondayOf(`${year}-01-04`)
  const number = Math.round((Date.parse(monday) - Date.parse(first)) / 604800000) + 1
  return `Semana ${String(number).padStart(2, '0')} · ${year}`
}
/** A multi-variety delivery contributes its kilos only once, including any undistributed balance. */
export function deliveryVarietyParts(requirement: Pick<ClientRequirement, 'variedades' | 'variedad'>, delivery: Delivery) {
  const varieties = Array.from(new Set((requirement.variedades?.length ? requirement.variedades : (requirement.variedad || '').split(',')).map(v => v.trim()).filter(Boolean)))
  const parts = (delivery.varietyQuantities || []).filter(v => v.variety.trim() && Number.isFinite(v.kilos) && v.kilos > 0)
  const sum = round(parts.reduce((total, part) => total + part.kilos, 0))
  if (sum > delivery.kilos + 0.01) return [{ variety: UNALLOCATED_VARIETY, kilos: delivery.kilos }]
  if (parts.length) return [...parts, ...(delivery.kilos - sum > 0.01 ? [{ variety: UNALLOCATED_VARIETY, kilos: round(delivery.kilos - sum) }] : [])]
  return [{ variety: varieties.length === 1 ? varieties[0] : UNALLOCATED_VARIETY, kilos: delivery.kilos }]
}

export function WeeklyDeliveries({ campaign }: { campaign: Campaign }) {
  const s = useStore()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const entries = s.requirements.filter(r => r.campaignId === campaign.id).flatMap(r => (r.contratos || []).flatMap((contract, contractIndex) => contract.entregas.filter(d => validDate(d.fecha)).map(delivery => ({ requirement: r, contract, contractIndex, delivery }))))
  const deliveryWeeks = Array.from(new Set(entries.map(e => mondayOf(e.delivery.fecha)))).sort()
  const [week, setWeek] = useState(() => deliveryWeeks.find(w => w >= mondayOf(today)) || deliveryWeeks.at(-1) || mondayOf(validDate(campaign.fecha) ? campaign.fecha : today))
  const [variety, setVariety] = useState('')
  const [detail, setDetail] = useState<{ title: string; items: { requirementId: string; contractId: string; deliveryId: string; kilos: number; variety: string }[] } | null>(null)
  const end = shiftDate(week, 6)
  const choices = new Set([...deliveryWeeks, week, mondayOf(today)])
  if (validDate(campaign.fecha) && validDate(campaign.fechaFin)) {
    const start = mondayOf(campaign.fecha)
    const last = mondayOf(campaign.fechaFin)
    for (let value = start, count = 0; value <= last && count < 520; value = shiftDate(value, 7), count++) choices.add(value)
  }
  const varieties = Array.from(new Set([...campaign.derivadas, ...entries.flatMap(e => deliveryVarietyParts(e.requirement, e.delivery).map(p => p.variety))])).sort((a, b) => a === UNALLOCATED_VARIETY ? 1 : b === UNALLOCATED_VARIETY ? -1 : a.localeCompare(b, 'es'))
  type Row = { id: string; client: string; contractNumber: number; plate: string; variety: string; days: number[]; items: { requirementId: string; contractId: string; deliveryId: string; kilos: number; variety: string; day: number }[] }
  const groups = new Map<string, Row>()
  for (const { requirement, contract, contractIndex, delivery } of entries.filter(e => e.delivery.fecha >= week && e.delivery.fecha <= end)) {
    const link = s.campaignTransporters.find(l => l.id === delivery.transportLinkId && l.campaignId === campaign.id)
    const carrier = s.transporters.find(t => t.id === link?.transporterId)
    const plate = carrier?.vehiculos.find(v => v.id === delivery.vehicleId)?.placa || 'Por asignar'
    const client = s.clients.find(c => c.id === requirement.clientId)?.empresa || 'Cliente sin nombre'
    const day = Math.round((Date.parse(delivery.fecha) - Date.parse(week)) / 86400000)
    for (const part of deliveryVarietyParts(requirement, delivery).filter(p => !variety || p.variety === variety)) {
      const id = JSON.stringify([requirement.id, contract.id, link?.id || '', delivery.vehicleId || '', part.variety])
      const row: Row = groups.get(id) || { id, client, contractNumber: contractIndex + 1, plate, variety: part.variety, days: Array(7).fill(0), items: [] }
      row.days[day] = round(row.days[day] + part.kilos)
      row.items.push({ requirementId: requirement.id, contractId: contract.id, deliveryId: delivery.id, kilos: part.kilos, variety: part.variety, day })
      groups.set(id, row)
    }
  }
  const rows = Array.from(groups.values()).sort((a, b) => a.client.localeCompare(b.client, 'es') || a.contractNumber - b.contractNumber || a.plate.localeCompare(b.plate) || a.variety.localeCompare(b.variety))
  const totals = Array.from({ length: 7 }, (_, day) => round(rows.reduce((sum, row) => sum + row.days[day], 0)))
  const total = round(totals.reduce((sum, value) => sum + value, 0))
  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const pending = round(rows.filter(r => r.variety === UNALLOCATED_VARIETY).reduce((sum, row) => sum + row.days.reduce((n, k) => n + k, 0), 0))
  return <div>
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4">
      <Field label="Semana"><Select aria-label="Semana del programa" value={week} onChange={e => setWeek(e.target.value)}>{Array.from(choices).sort().map(w => <option key={w} value={w}>{weekLabel(w)} · {fmtDate(w)} – {fmtDate(shiftDate(w, 6))}</option>)}</Select></Field>
      <Field label="Variedad"><Select aria-label="Variedad del programa" value={variety} onChange={e => setVariety(e.target.value)}><option value="">Todas las variedades</option>{varieties.map(v => <option key={v} value={v}>{v}</option>)}</Select></Field>
      <div className="flex gap-2"><Button variant="outline" onClick={() => setWeek(shiftDate(week, -7))}>← Semana anterior</Button><Button variant="outline" onClick={() => setWeek(shiftDate(week, 7))}>Semana siguiente →</Button></div>
    </div>
    <p className="mb-4 text-sm text-ink-soft">Programa consolidado de las entregas registradas en los contratos. Las fechas y cantidades son programadas; la placa se actualiza al completar el transporte en En proceso → Entregas.</p>
    {pending > 0 && <p role="status" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Hay {fmtNum(pending)} kg por distribuir entre variedades. Completa Kilos por variedad al editar la entrega programada desde Clientes o Gestión Comercial.</p>}
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-forest px-4 py-3 text-white"><h2 className="font-display font-semibold">{weekLabel(week)} · {variety || 'Todas las variedades'}</h2><span className="text-sm">{fmtDate(week)} – {fmtDate(end)} · Cantidades en kg</span></div>
      <div className="overflow-x-auto"><table aria-label="Programa semanal de entregas" className="w-full min-w-[1080px] border-collapse text-sm">
        <thead className="bg-canvas/60 text-xs uppercase text-ink-soft"><tr><th className="p-3 text-left">Cliente / contrato</th><th className="p-3 text-left">Placa</th><th className="p-3 text-left">Variedad</th>{days.map((day, i) => <th key={day} className="px-2 py-3 text-right">{day}<span className="mt-1 block text-[11px] font-normal normal-case">{fmtDate(shiftDate(week, i)).slice(0, 5)}</span></th>)}<th className="p-3 text-right">Total semanal</th></tr></thead>
        <tbody className="divide-y divide-line">{rows.map(row => <tr key={row.id} className="hover:bg-leaf-50/30"><td className="p-3"><b>{row.client}</b><div className="mt-1 text-xs text-ink-soft">Contrato {row.contractNumber}</div></td><td className={`p-3 text-xs ${row.plate === 'Por asignar' ? 'text-ink-soft' : 'font-mono'}`}>{row.plate}</td><td className="p-3 text-xs">{row.variety}</td>{row.days.map((kilos, day) => <td key={day} className="px-2 py-3 text-right tabular-nums">{kilos > 0 ? <button className="rounded px-1 py-1 font-medium text-forest underline decoration-leaf/40 underline-offset-4 hover:bg-leaf-50" aria-label={`Ver entregas de ${row.client}, contrato ${row.contractNumber}, ${row.variety}, ${days[day]}`} onClick={() => setDetail({ title: `${row.client} · ${days[day]} ${fmtDate(shiftDate(week, day))}`, items: row.items.filter(item => item.day === day) })}>{fmtNum(kilos)}</button> : <span className="text-ink-soft/50">—</span>}</td>)}<td className="bg-leaf-50/60 p-3 text-right font-semibold tabular-nums text-forest">{fmtNum(round(row.days.reduce((n, k) => n + k, 0)))}</td></tr>)}{!rows.length && <tr><td colSpan={11} className="p-8 text-center text-ink-soft">No hay entregas programadas para esta semana y variedad.</td></tr>}</tbody>
        <tfoot><tr className="border-t border-line bg-leaf-50 font-semibold text-forest"><th colSpan={3} className="p-3 text-left">Total programado (kg)</th>{totals.map((kilos, i) => <td key={i} className="px-2 py-3 text-right tabular-nums">{fmtNum(kilos)}</td>)}<td className="bg-forest p-3 text-right text-base tabular-nums text-white">{fmtNum(total)}</td></tr></tfoot>
      </table></div>
    </div>
    <p className="mt-3 text-xs text-ink-soft">Selecciona una cantidad para consultar las entregas que la componen. Los totales respetan la distribución por variedad y cada kilo se cuenta una sola vez.</p>
    {detail && <Modal open wide title="Entregas del programa semanal" onClose={() => setDetail(null)} footer={<Button variant="outline" onClick={() => setDetail(null)}>Cerrar</Button>}><h3 className="mb-4 font-display font-semibold">{detail.title}</h3>{detail.items.map((item, index) => { const r = s.requirements.find(r => r.id === item.requirementId); const c = r?.contratos?.find(c => c.id === item.contractId); const d = c?.entregas.find(d => d.id === item.deliveryId); return <section key={`${item.deliveryId}-${index}`} className="mb-5"><p className="mb-3 text-sm font-semibold">{item.variety}: {fmtNum(item.kilos)} kg · Total de la entrega: {fmtNum(d?.kilos || 0)} kg</p><IndustryDeliverySummary operation={{ sourceDelivery: item }}/>{d?.observaciones && <p className="text-sm text-ink-soft">{d.observaciones}</p>}</section> })}</Modal>}
  </div>
}
