import { discardPercentage, driverChecklistRows } from './driver-receipt-model'
import { useState } from 'react'
import { DriverAccessLink, useSharedActor } from './shared-provider'
import { trackedServices } from './delivery-tracking'
import { dispatchReport, dispatchHistory, DISPATCH_STAGES } from './dispatch-model'
import { type ReactNode } from 'react'
import { useStore, type LogisticsDelivery } from './store'
import { Button, Modal, Field, Select, fmtNum } from './ui'

export const LOGISTICS_ADMIN_SECTIONS = ['Compras de la carga', 'Recepción y calidad', 'Jabas y salida', 'Documentos y cierre'] as const
export type LogisticsAdminSection = typeof LOGISTICS_ADMIN_SECTIONS[number]

export function logisticsContext(s: ReturnType<typeof useStore>, delivery: LogisticsDelivery) {
  const operation = s.qualityOperations.find(o => o.id === delivery.sourceOperationId)
  const matches = trackedServices(s,delivery)
  const primary = [...matches].sort((a,b) => (dispatchReport(b.service)?.date || '').localeCompare(dispatchReport(a.service)?.date || ''))[0]
  const company = s.transporters.find(t => t.id === primary?.link.transporterId) || s.transporters.find(t => t.empresa === operation?.transport?.company)
  const service = primary?.service
  const vehicle = company?.vehiculos.find(v => v.id === (service?.vehicleId || operation?.transport?.vehicle))
  const driver = company?.choferes.find(d => d.id === (service?.driverId || operation?.transport?.driver))
  const report = dispatchReport(service)
  return { operation, service, matches, company, vehicle, driver, report, state: report?.stage || 'Sin reporte', kilos: service?.annotation?.kilos || operation?.loadRegistration?.kilos || operation?.loadedQuantity || delivery.evaluation.originWeight || 0 }
}

export function logisticsDate(value?: string) {
  if (!value) return 'Sin registro'
  const date = new Date(value.length === 10 ? value+'T12:00:00-05:00' : value)
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString('es-PE', { timeZone:'America/Lima',day:'2-digit',month:'short',year:'numeric', ...(value.length>10 ? { hour:'2-digit',minute:'2-digit' } : {}) })
}

function Summary({ title, entries }: { title:string; entries:[string,ReactNode][] }) {
  return <section className="mt-6"><h2 className="mb-3 font-display text-lg font-semibold">{title}</h2><dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{entries.map(([label,value])=><div key={label} className="min-w-0 rounded-xl border border-line bg-surface p-4"><dt className="text-xs text-ink-soft">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium">{value === '' || value == null ? 'Sin registro' : value}</dd></div>)}</dl></section>
}

export function LogisticsDeliveryReadOnly({deliveryId,onBack}:{deliveryId:string;onBack:()=>void}) {
  const s=useStore()
  const d=s.logisticsDeliveries.find(d=>d.id===deliveryId)
  if(!d)return <div><Button variant="ghost" onClick={onBack}>← Volver a entregas</Button><p>La entrega no está disponible.</p></div>
  const c=logisticsContext(s,d)
  const a=c.service?.annotation||c.operation?.loadRegistration
  const money=(n:number)=>`S/ ${n.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}`
  const docs:[string,string][]=[['Guía de salida del vehículo',d.documents.signedExitGuide],['Evidencia de descarte',d.discard.evidence||d.documents.discardEvidence]]
  return <div>
    <Button variant="ghost" className="mb-4 px-0" onClick={onBack}>← Volver a entregas</Button>
    <div className="rounded-2xl border border-line bg-surface p-5"><p className="text-xs text-ink-soft">Consulta de entrega · {d.reference}</p><h1 className="mt-2 font-display text-2xl font-semibold">{s.campaigns.find(x=>x.id===d.campaignId)?.nombre} · {s.clients.find(x=>x.id===d.clientId)?.empresa||'Sin cliente'}</h1><p className="mt-2 text-sm text-ink-soft">{d.destination}</p><p className="mt-4 inline-flex rounded-full bg-leaf-50 px-3 py-1 text-sm font-semibold text-forest">Estado del chofer: {c.state}</p></div>
    <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-display text-lg font-semibold">Historial del chofer</h2>
      <p className="mt-1 text-sm text-ink-soft">Estados del despacho y hora de cada cambio.</p>
      {c.matches.length ? c.matches.map(m=>{
        const history=dispatchHistory(m.service)
        const latest=history.at(-1)
        return <div key={m.service.id} className="mt-5">
          {c.matches.length>1&&<p className="mb-4 text-sm font-semibold">Camión: {s.transporters.find(t=>t.id===m.link.transporterId)?.vehiculos.find(v=>v.id===m.service.vehicleId)?.placa||'Sin asignar'}</p>}
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{DISPATCH_STAGES.map((stage,index)=>{
            const event=history.find(e=>e.stage===stage)
            const current=latest?.stage===stage
            return <li key={stage} className={'rounded-xl border p-4 '+(current?'border-leaf bg-leaf-50':'border-line')}>
              <div className="flex items-center justify-between gap-2"><span className={'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold '+(event?'bg-forest text-white':'bg-canvas text-ink-soft')}>{event?'✓':index+1}</span>{current&&<span className="text-xs font-semibold text-forest">Actual</span>}</div>
              <h3 className="mt-3 text-sm font-semibold">{stage}</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">{event?logisticsDate(event.date):'Pendiente'}</p>
              {event&&<p className="mt-2 text-xs text-ink-soft">{s.transporters.find(t=>t.id===m.link.transporterId)?.choferes.find(x=>x.id===event.driverId)?.nombre||'Chofer'}{event.origin==='carga'?' · Registro de carga':event.origin==='seguimiento'?' · Seguimiento previo':''}</p>}
            </li>
          })}</ol>
        </div>
      }):<p className="mt-4 text-sm text-ink-soft">El chofer todavía no ha registrado estados para esta carga.</p>}
    </section>
    <Summary title="Viaje y llegada" entries={[
      ['Transportista',c.company?.empresa],['Camión',c.vehicle?.placa],['Chofer',c.driver?.nombre],['Origen',c.service?.origin||c.operation?.origin],['Destino',d.destination],['Kilos de carga',`${fmtNum(c.kilos)} kg`]
    ]}/>
    <Summary title="Datos de carga" entries={[
      ['Fecha de carga',logisticsDate(a?.loadDate)],['Responsable',a?.responsible],['Variedad',a?.variety],['Bultos totales',a?.packages.map(b=>`${b.type}: ${b.loaded} cargados / ${b.empty} vacíos`).join('\n')],['Gastos de carga',a?.expenses?.map(e=>`${e.concept}: ${money(e.amount)}`).join('\n')],['Movilidad',money(a?.viaticos?.mobility||0)],['Insumos del personal',money(a?.viaticos?.supplies||0)]
    ]}/>
    {!!a?.providers?.length&&<section className="mt-6"><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Proveedores de la carga</h2><span className="text-sm text-ink-soft">{a.providers.length} proveedores</span></div><div className="grid gap-4 sm:grid-cols-2">{a.providers.map(p=>{
      const provider=s.providers.find(x=>x.id===p.providerId)
      return <article key={p.providerId} className="overflow-hidden rounded-2xl border border-line bg-surface"><div className="flex items-start justify-between gap-4 border-b border-line p-4"><div><h3 className="font-semibold">{provider?`${provider.nombres} ${provider.apellidos}`:'Proveedor sin identificar'}</h3><p className="mt-1 text-sm text-ink-soft">{p.variety||'Variedad sin registrar'}</p></div><span className="shrink-0 rounded-full bg-leaf-50 px-3 py-1 text-sm font-semibold text-forest">{fmtNum(p.kilos||0)} kg</span></div><dl className="grid gap-3 p-4">{p.packages.length?p.packages.map((b,i)=><div key={b.type+i} className="flex items-center justify-between gap-3 text-sm"><dt className="text-ink-soft">{b.type}</dt><dd><b>{b.loaded}</b> cargados <span className="text-ink-soft">· {b.empty} vacíos</span></dd></div>):<p className="text-sm text-ink-soft">Sin bultos registrados.</p>}</dl></article>
    })}</div></section>}
    {c.service&&<Summary title="Checklist reportado por el chofer" entries={driverChecklistRows(d,c.service).map(row=>{const stamp=d.driverChecklist?.[row.step];return [row.label,`${row.done?'Completado':'Pendiente'}${stamp?' · '+logisticsDate(stamp.at)+' · '+(c.company?.choferes.find(x=>x.id===stamp.driverId)?.nombre||'Chofer'):''}`]})}/>}
    <Summary title="Descarga, recepción y calidad" entries={[
      ['Peso de origen',d.evaluation.originWeight>0?`${fmtNum(d.evaluation.originWeight)} kg`:`${fmtNum(c.kilos)} kg`],['Peso en planta',d.evaluation.plantWeight>0?`${fmtNum(d.evaluation.plantWeight)} kg`:'Sin registro'],['Descarte',d.discard.quantity!==''?`${d.discard.quantity} ${d.discard.unit}`:'Sin registro'],['Porcentaje de descarte',discardPercentage(d)===null?'Sin registro':discardPercentage(d)!.toFixed(2)+' % sobre peso original'],['Evidencia de descarte',d.discard.evidence||d.documents.discardEvidence||'Sin documento']
    ]}/>
    <Summary title="Documentos" entries={docs.map(([label,file])=>[label,file||'Sin documento'])}/>

  </div>
}

export function DriverAccessManager(){
  const s=useStore();const actor=useSharedActor();const [open,setOpen]=useState(false);const [selected,setSelected]=useState('')
  const drivers=s.transporters.flatMap(t=>t.choferes.map(d=>({key:t.id+'|'+d.id,transporterId:t.id,driverId:d.id,label:d.nombre+' · '+t.empresa})))
  const driver=drivers.find(d=>d.key===selected)||drivers[0]
  if(actor?.role!=='admin')return null
  return <><Button variant="outline" onClick={()=>setOpen(true)}>Accesos de choferes</Button>{open&&<Modal open wide title="Acceso del chofer desde su celular" onClose={()=>setOpen(false)} footer={<Button variant="outline" onClick={()=>setOpen(false)}>Cerrar</Button>}><p className="mb-4 text-sm text-ink-soft">Selecciona al chofer y genera su enlace personal. Al abrirlo desde el celular verá únicamente sus campañas y cargas asignadas, sin contraseña.</p><Field label="Chofer"><Select value={driver?.key||''} onChange={e=>setSelected(e.target.value)}>{drivers.map(d=><option key={d.key} value={d.key}>{d.label}</option>)}</Select></Field>{driver&&<DriverAccessLink key={driver.key} transporterId={driver.transporterId} driverId={driver.driverId}/>}</Modal>}</>
}
