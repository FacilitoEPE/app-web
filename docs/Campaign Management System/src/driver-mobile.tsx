import { DriverReceiptChecklist, DriverExitGuide } from './driver-receipt'
import { driverChecklistIssue } from './driver-receipt-model'
import { trackedServices } from './delivery-tracking'
import { LegacyDataImport, useSharedActor } from './shared-provider'
import { DISPATCH_STAGES, dispatchStage, dispatchHistory } from './dispatch-model'
import { sameSource } from './delivery-tracking'
import { useState, lazy, Suspense } from 'react'
const DriverFarmMap=lazy(()=>import('./driver-farm-map').catch(()=>({default:({onClose}:{onClose:()=>void})=><Modal open title="Cargar mapa" onClose={onClose} footer={<Button variant="outline" onClick={onClose}>Cerrar</Button>}><p className="text-sm">Hay una actualización disponible o no se pudo cargar el mapa. Recarga la página e inténtalo nuevamente.</p><Button className="mt-4" onClick={()=>window.location.reload()}>Recargar página</Button></Modal>})))
import { useStore, type CampaignTransportService, type QualityOperation } from './store'
import { LoadRegistrationModal } from './load-registration'
import { deliveryKey, deliveryReady } from './quality-load-utils'
import { Button, Field, Select, Toasts, fmtNum, Modal } from './ui'

export type DemoAccount = { role: 'admin' } | { role: 'driver'; transporterId: string; driverId: string }
export { DISPATCH_STAGES, dispatchStage } from './dispatch-model'
export type { DispatchStage, DispatchEvent } from './dispatch-model'

export function DemoLogin({ onLogin }: { onLogin: (account: DemoAccount) => void }) {
  const s = useStore()
  const sharedActor=useSharedActor()
  const [role, setRole] = useState<'admin' | 'driver'>(sharedActor?.role==='driver'?'driver':'admin')
  const [selected, setSelected] = useState('')
  const accounts = s.transporters.flatMap(t => t.choferes.map(d => ({ ...d, transporterId: t.id, company: t.empresa, assigned: s.campaignTransporters.some(l => l.transporterId === t.id && l.services.some(i => i.driverId === d.id)) || s.requirements.some(r => (r.contratos||[]).some(c => c.entregas.some(e => e.driverId === d.id && s.campaignTransporters.some(l => l.id === e.transportLinkId && l.transporterId === t.id)))) }))).sort((a,b) => Number(b.assigned) - Number(a.assigned))
  const driver = accounts.find(d => `${d.transporterId}|${d.id}` === selected) || accounts[0]
  return <div className="grid min-h-dvh bg-canvas lg:grid-cols-2">
    <div className="hidden flex-col justify-between bg-forest p-14 text-white lg:flex"><div className="text-sm font-bold tracking-widest">AGRO EXPORTACIONES</div><div><p className="mb-4 text-mango">Del campo al destino</p><h1 className="font-display text-5xl font-semibold leading-tight">Tu carga.<br/>Tu ruta.<br/>Todo conectado.</h1><p className="mt-6 max-w-sm text-white/70">Campañas, carga y despacho en un mismo lugar.</p></div><p className="text-xs text-white/60">Prototipo de demostración · Sin GPS</p></div>
    <main className="flex items-center justify-center px-5 py-12"><div className="w-full max-w-md"><div className="mb-8 text-sm font-bold tracking-widest text-forest">AGRO EXPORTACIONES</div><h1 className="font-display text-3xl font-semibold">Bienvenido</h1><p className="mt-2 text-sm text-ink-soft">Selecciona un perfil para entrar a la demostración.</p><div className="my-7 grid grid-cols-2 gap-2 rounded-2xl bg-white p-2">{(sharedActor?.role==='driver'?['driver'] as const:['admin','driver'] as const).map(r => <button key={r} onClick={() => setRole(r)} className={`min-h-12 rounded-xl text-sm font-semibold ${role === r ? 'bg-forest text-white' : 'text-ink-soft'}`}>{r === 'admin' ? 'Administrador' : 'Chofer'}</button>)}</div>
      <div className="rounded-2xl border border-line bg-white p-6">{role === 'admin' ? <><h2 className="font-semibold">Administrador de demostración</h2><p className="mt-2 text-sm text-ink-soft">Acceso a todas las campañas y módulos.</p></> : <Field label="Usuario chofer"><Select value={driver ? `${driver.transporterId}|${driver.id}` : ''} onChange={e => setSelected(e.target.value)}>{accounts.map(d => <option key={`${d.transporterId}|${d.id}`} value={`${d.transporterId}|${d.id}`}>{d.nombre} · {d.company}{d.assigned ? ' · Con asignaciones' : ''}</option>)}</Select></Field>}{role==='admin'&&<LegacyDataImport/>}<Button className="mt-6 min-h-12 w-full" disabled={role === 'driver' && !driver} onClick={() => onLogin(role === 'admin' ? {role:'admin'} : {role:'driver', transporterId:driver.transporterId, driverId:driver.id})}>Entrar como {role === 'admin' ? 'administrador' : 'chofer'} →</Button></div><p className="mt-5 text-xs leading-relaxed text-ink-soft">Acceso de demostración sin contraseña. Los registros se comparten entre el celular y la computadora.</p></div></main>
  </div>
}

export function DriverMobile({ account, onLogout }: { account: Extract<DemoAccount,{role:'driver'}>; onLogout: () => void }) {
  const s = useStore()
  const [campaignId, setCampaignId] = useState('')
  const [active, setActive] = useState('')
  const [mapJobKey,setMapJobKey]=useState('')
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const company = s.transporters.find(t => t.id === account.transporterId)
  const driver = company?.choferes.find(d => d.id === account.driverId)
  const jobs = s.requirements.flatMap(r => (r.contratos||[]).flatMap(c => c.entregas.flatMap(d => {
    const link = s.campaignTransporters.find(l => l.id === d.transportLinkId && l.transporterId === account.transporterId && l.campaignId === r.campaignId)
    if (!link || d.driverId !== account.driverId) return []
    const source = {requirementId:r.id, contractId:c.id, deliveryId:d.id}
    const sourceOperation = s.qualityOperations.find(o => o.route === r.canal && sameSource(o.sourceDelivery,source))
    const service = link.services.find(i => i.driverId === account.driverId && sameSource(i.sourceDelivery,source)) || (sourceOperation ? link.services.find(i=>i.driverId===account.driverId&&!i.sourceDelivery&&i.operationId===sourceOperation.id) : undefined)
    const operation = s.qualityOperations.find(o=>o.id===service?.operationId) || sourceOperation
    const rejected = operation?.qualityDecision === 'Rechazada' || s.qualityOperations.some(o => o.rejectedDeliveries?.some(x => deliveryKey(x.sourceDelivery) === deliveryKey(source)))
    return [{key:deliveryKey(source), source, r, d, link, operation, service, rejected}]
  })))
  const mapJob=jobs.find(j=>j.key===mapJobKey)
  const campaigns = s.campaigns.filter(c => jobs.some(j => j.r.campaignId === c.id))
  const campaign = campaigns.find(c => c.id === campaignId)
  const job = jobs.find(j => j.key === active && j.r.campaignId === campaignId)
  const saved = job?.service?.annotation || job?.operation?.loadRegistration
  const stage = dispatchStage(job?.service)
  const locked = !!job?.service?.guides?.some(g => g.generatedAt) || stage !== 'En carga' || job?.rejected || campaign?.estado !== 'En Proceso'
  const next = DISPATCH_STAGES[DISPATCH_STAGES.indexOf(stage)+1]
  const receiptMatches=job?.service?s.logisticsDeliveries.filter(d=>d.campaignId===job.r.campaignId&&trackedServices(s,d).some(m=>m.link.id===job.link.id&&m.service.id===job.service!.id)):[]
  const receiptDelivery=receiptMatches.length===1?receiptMatches[0]:undefined
  const closeIssue=job?.service?driverChecklistIssue(receiptDelivery,job.service):'Completa la carga.'
  const dateTime = (v:string) => new Date(v).toLocaleString('es-PE',{timeZone:'America/Lima',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
  return <div className="min-h-dvh bg-[#f3f5f1] pb-10"><header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4"><div><p className="text-[10px] font-bold tracking-[.18em] text-leaf">LOGÍSTICA · CHOFER</p><p className="mt-1 text-sm font-semibold">{driver?.nombre || 'Chofer'}</p></div><button className="min-h-11 px-2 text-sm text-ink-soft" onClick={onLogout}>Salir</button></div></header><main className="mx-auto max-w-lg px-5 pt-6">
    {(campaign || job) && <button className="mb-5 min-h-11 text-sm font-semibold text-forest" onClick={() => {if(active){setActive('');setError('')}else setCampaignId('')}}>← {active ? 'Mis cargas' : 'Mis campañas'}</button>}
    {!campaign ? <><p className="text-xs uppercase tracking-widest text-ink-soft">Tu jornada</p><h1 className="mt-2 font-display text-3xl font-semibold">Mis campañas</h1><p className="mb-6 mt-2 text-sm text-ink-soft">{company?.empresa} · Solo tus asignaciones</p>{campaigns.map(c => <button key={c.id} className="mb-4 w-full rounded-3xl border border-line bg-white p-6 text-left shadow-sm" onClick={() => setCampaignId(c.id)}><span className="text-xs font-semibold text-leaf">{c.estado}</span><h2 className="mt-2 font-display text-2xl font-semibold">{c.nombre}</h2><p className="mt-3 text-sm text-ink-soft">{jobs.filter(j=>j.r.campaignId===c.id).length} cargas asignadas <span className="float-right text-forest">Ver cargas →</span></p></button>)}{!campaigns.length && <Empty text="Aún no tienes campañas asignadas. El administrador debe vincularte a una entrega."/>}</> : !job ? <><h1 className="font-display text-3xl font-semibold">{campaign.nombre}</h1><p className="mb-6 mt-2 text-sm text-ink-soft">Mis cargas</p>{jobs.filter(j=>j.r.campaignId===campaign.id).map(j => <article key={j.key} className="mb-4 w-full rounded-3xl border border-line bg-white p-5"><button onClick={()=>{setActive(j.key);setError('')}} className="w-full text-left"><div className="flex justify-between gap-3"><span className="text-xs font-bold text-leaf">{j.r.canal}</span><span className="rounded-full bg-leaf-50 px-3 py-1 text-xs font-semibold text-forest">{j.rejected?'Rechazada':j.service?.annotation||j.operation?.loadRegistration?dispatchStage(j.service):'Por completar'}</span></div><p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Cliente</p><h2 className="mt-1 text-lg font-semibold">{s.clients.find(c=>c.id===j.r.clientId)?.empresa || 'Sin cliente'}</h2><div className="mt-3 space-y-2 text-sm"><p><span className="font-medium text-ink-soft">Recojo: </span>{j.d.origin||j.service?.origin||'Por coordinar'}</p><p><span className="font-medium text-ink-soft">Destino: </span>{j.d.destino}</p></div><p className="mt-4 text-xs text-ink-soft">{company?.vehiculos.find(v=>v.id===j.d.vehicleId)?.placa} · {j.d.fecha} · {fmtNum(j.d.kilos)} kg</p></button><button type="button" aria-label={`Ver ubicación y ruta de recojo de ${s.clients.find(c=>c.id===j.r.clientId)?.empresa||'esta carga'} · ${j.d.fecha}`} onClick={()=>setMapJobKey(j.key)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-leaf-50 px-3 py-2 text-sm font-semibold text-forest transition hover:bg-canvas"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>Ver ubicación y ruta</button></article>)}</> : <>
      <p className="text-xs font-semibold uppercase tracking-widest text-leaf">{job.r.canal} · {company?.vehiculos.find(v=>v.id===job.d.vehicleId)?.placa}</p><h1 className="mt-2 font-display text-3xl font-semibold">{saved?'Mi despacho':'Completar carga'}</h1><p className="mt-2 text-sm text-ink-soft">{s.clients.find(c=>c.id===job.r.clientId)?.empresa} · {campaign.nombre}</p>
      <section className="my-6 rounded-3xl bg-forest p-6 text-white"><p className="text-xs uppercase tracking-widest text-white/70">Estado actual</p><h2 className="mt-2 font-display text-3xl font-semibold">{job.rejected?'Carga rechazada':stage}</h2><div className="mt-5 grid grid-cols-5 gap-2" aria-label="Avance del despacho">{DISPATCH_STAGES.map((st,i)=><div key={st} className={`h-1.5 rounded-full ${i<=DISPATCH_STAGES.indexOf(stage)?'bg-mango':'bg-white/20'}`} />)}</div></section>

      {saved && <section className="mt-4 rounded-3xl border border-line bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Carga registrada</h2><span className="font-mono text-sm">{fmtNum(saved.kilos)} kg</span></div>{saved.providers?.map(p=><div key={p.providerId} className="mt-4 border-t border-line pt-3 text-sm"><b>{s.providers.find(x=>x.id===p.providerId)?.nombres} {s.providers.find(x=>x.id===p.providerId)?.apellidos}</b><p className="mt-1 text-ink-soft">{p.variety} · {fmtNum(p.kilos||0)} kg</p><p className="mt-1 text-xs text-ink-soft">{p.packages.map(b=>`${b.type}: ${b.loaded} cargados / ${b.empty} vacíos`).join(' · ')}</p></div>)}</section>}
      {!locked && <Button className="mt-5 min-h-14 w-full" disabled={!deliveryReady(s,job.source)} onClick={()=>setEditing(true)}>{saved?'Editar datos de carga':'Llenar datos de carga'}</Button>}
      {!deliveryReady(s,job.source)&&<p className="mt-3 text-sm text-ink-soft">El administrador debe completar la coordinación de esta entrega.</p>}
      {saved&&job.service&&<DriverReceiptChecklist delivery={receiptDelivery} service={job.service} linkId={job.link.id} transporterId={account.transporterId} driverId={account.driverId} editable={stage==='Llegada'&&!job.rejected&&campaign.estado==='En Proceso'}/>}
      {saved&&job.service&&<DriverExitGuide key={job.service.id} delivery={receiptDelivery} service={job.service} linkId={job.link.id} transporterId={account.transporterId} driverId={account.driverId} editable={['Llegada','Cierre'].includes(stage)&&!job.rejected&&campaign.estado==='En Proceso'}/>}
      {next==='Cierre'&&closeIssue&&<p className="mt-3 text-sm text-ink-soft">{closeIssue}</p>}
      {saved && next && !job.rejected && campaign.estado==='En Proceso' && <Button className="mt-3 min-h-14 w-full bg-forest" disabled={next==='Cierre'&&!!closeIssue} onClick={()=>{const issue=s.advanceDriverDispatch(account.transporterId,account.driverId,job.link.id,job.service?.id||'',next);setError(issue||'');if(!issue)s.toast(`Estado actualizado: ${next}`)}}>{({Salida:'Confirmar salida de la finca', 'En camino':'Confirmar que estoy en camino',Llegada:'Confirmar llegada al cliente',Cierre:'Cerrar despacho'} as Record<string,string>)[next]} →</Button>}
      {stage==='Cierre'&&<p className="mt-5 rounded-2xl bg-leaf-50 p-4 text-sm font-semibold text-forest">Despacho terminado. Gracias por completar el recorrido.</p>}
      {error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      {!!dispatchHistory(job.service).length&&<section className="mt-7"><h2 className="mb-4 font-semibold">Historial del despacho</h2>{dispatchHistory(job.service).map(e=><div key={e.stage} className="flex justify-between border-l-2 border-leaf py-3 pl-4 text-sm"><b>{e.stage}</b><time className="text-xs text-ink-soft">{dateTime(e.date)}</time></div>)}</section>}
      {editing&&<div className="driver-load-form"><LoadRegistrationModal campaignId={campaign.id} route={job.r.canal} operationId={job.operation?.id} initialSource={job.source} registration={saved} item={job.service} linkId={job.link.id} onReject={job.r.canal==='Industria'?()=>s.rejectDriverLoad(account.transporterId,account.driverId,job.source):undefined} onSubmit={payload=>s.saveDriverLoad(account.transporterId,account.driverId,payload.sourceDelivery,payload.annotation)} onClose={()=>setEditing(false)}/></div>}
    </>}
  </main>{mapJob&&<Suspense fallback={<p role="status" className="fixed bottom-16 left-5 z-50 rounded-xl border border-line bg-white p-4 text-sm">Cargando mapa…</p>}><DriverFarmMap providers={s.providers} delivery={mapJob.d} onClose={()=>setMapJobKey('')}/></Suspense>}<Toasts toasts={s.toasts}/></div>
}

function Empty({text}:{text:string}){return <p className="rounded-3xl border border-dashed border-line p-6 text-sm text-ink-soft">{text}</p>}

export function DriverDispatchOverview(){
  const s=useStore()
  const rows=s.campaignTransporters.flatMap(l=>l.services.filter(i=>i.driverDispatch?.length).map(i=>({l,i})))
  const [filter,setFilter]=useState('')
  const [detail,setDetail]=useState('')
  if(!rows.length)return null
  return <section className="mb-8 rounded-2xl border border-line bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-xl font-semibold">Despachos de choferes</h2><p className="mt-1 text-sm text-ink-soft">Carga y seguimiento compartidos con la vista móvil.</p></div><Select aria-label="Filtrar despachos de choferes" value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Todos los estados</option>{DISPATCH_STAGES.map(st=><option key={st}>{st}</option>)}</Select></div><div className="mt-4 grid gap-3 md:grid-cols-2">{rows.filter(({i})=>!filter||dispatchStage(i)===filter).map(({l,i})=>{const t=s.transporters.find(t=>t.id===l.transporterId);return <div key={i.id} className="rounded-xl border border-line p-4"><div className="flex justify-between gap-3"><b>{s.campaigns.find(c=>c.id===l.campaignId)?.nombre}</b><span className="text-sm font-semibold text-leaf">{dispatchStage(i)}</span></div><p className="mt-2 text-sm">{t?.choferes.find(d=>d.id===i.driverId)?.nombre} · {t?.vehiculos.find(v=>v.id===i.vehicleId)?.placa}</p><p className="mt-1 text-sm text-ink-soft">{i.destination} · {fmtNum(i.annotation?.kilos||0)} kg</p><button className="mt-3 text-sm font-semibold text-forest" onClick={()=>setDetail(detail===i.id?'':i.id)}>{detail===i.id?'Ocultar':'Ver carga e historial'}</button>{detail===i.id&&<div className="mt-3 border-t border-line pt-3 text-sm">{i.annotation?.providers?.map(p=><p key={p.providerId}>{s.providers.find(x=>x.id===p.providerId)?.nombres} · {p.variety} · {fmtNum(p.kilos||0)} kg · {p.packages.map(b=>`${b.type}: ${b.loaded}/${b.empty}`).join(', ')}</p>)}{i.driverDispatch?.map(e=><p className="mt-2 text-xs text-ink-soft" key={e.stage}>{e.stage} · {new Date(e.date).toLocaleString('es-PE',{timeZone:'America/Lima'})}</p>)}</div>}</div>})}</div></section>
}
