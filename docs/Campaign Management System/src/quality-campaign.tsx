import { LoadRegistrationModal, registrationInvestment, type LoadRegistration, type LoadRegistrationPayload } from './load-registration'
import { deliveryReady, deliveryHasLoad } from './quality-load-utils'
import { useState, type ReactNode } from 'react'
import { useStore, type QualityOperation, type QualityRoute } from './store'
import { ExportHarvestFlow, ExportGuide, exportReadiness } from './export-harvest'
import { IndustryLoads, IndustryGuides } from './industry-loads'
import { deliveryContext, IndustryDeliverySummary } from './industry-delivery'
import { Button, PageHeader, Tabs, Table, Field, Select, Input, Modal, ActionsMenu, IconBtn, fmtDate, fmtNum } from './ui'

const Eye = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
const sourceKey = (source: QualityOperation['sourceDelivery']) => source ? `${source.requirementId}|${source.contractId}|${source.deliveryId}` : ''
const sections = (route: QualityRoute) => route === 'Industria' ? ['Cargas por entrega', 'Guías de remisión'] : ['Análisis y revisión', 'Cargas por entrega', 'Guías de remisión']
const emptyOperation = (campaignId: string, route: QualityRoute) => ({ campaignId, route, reference: `CAM-${campaignId}-${route}`, providerId: '', origin: '', expectedDate: '', status: 'Pendiente de revisión', estimatedQuantity: 0, harvestedQuantity: 0, acceptedQuantity: 0, loadedQuantity: 0, plantQuantity: 0, observations: '', analyses: [], advances: [] })

export function QualityCampaignBrowser({ renderLoad, renderDetail }: {
  renderLoad: (id: string, section: string, back: () => void) => ReactNode
  renderDetail: (id: string, back: () => void) => ReactNode
}) {
  const s = useStore()
  const [route, setRoute] = useState('Exportador')
  const [addingCampaign, setAddingCampaign] = useState(false)
  const [campaignFilter, setCampaignFilter] = useState(() => sessionStorage.getItem('qualityCampaignFilter') || '')
  const [stateFilter, setStateFilter] = useState('')
  const [screen, setScreen] = useState<{ campaignId: string; route?: QualityRoute; section?: string; overview?: boolean } | null>(null)
  const [load, setLoad] = useState<{ id: string; section?: string } | null>(null)
  const availableRoutes = (id: string): QualityRoute[] => { const routes = (['Exportación','Industria'] as QualityRoute[]).filter(r => s.qualityOperations.some(o => o.campaignId === id && o.route === r) || s.requirements.some(q => q.campaignId === id && q.canal === r)); return routes.length ? routes : ['Exportación','Industria'] }
  const campaigns = s.campaigns.filter(c => (c.estado === 'En Proceso' || s.qualityOperations.some(o => o.campaignId === c.id)) && (!campaignFilter || c.id === campaignFilter) && (!stateFilter || c.estado === stateFilter) && availableRoutes(c.id).includes(route === 'Exportador' ? 'Exportación' : 'Industria'))
  const enter = (campaignId: string, selected?: QualityRoute, section = 'Cargas por entrega') => {
    for (const selectedRoute of selected ? [selected] : availableRoutes(campaignId)) {
      if (!s.qualityOperations.some(o => o.campaignId === campaignId && o.route === selectedRoute)) s.addQualityOperation(emptyOperation(campaignId,selectedRoute))
    }
    setScreen({ campaignId, route: selected, section })
  }
  if (load) return <>{load.section ? renderLoad(load.id, load.section, () => setLoad(null)) : renderDetail(load.id, () => setLoad(null))}</>
  if (screen) {
    const campaign = s.campaigns.find(c => c.id === screen.campaignId)!
    const operations = s.qualityOperations.filter(o => o.campaignId === campaign.id && o.route === screen.route)
    const parent = operations.find(o => !o.sourceDelivery) || operations[0]
    const routes = availableRoutes(campaign.id)
    const menuSections = screen.route ? sections(screen.route) : ['Análisis y revisión', 'Cargas por entrega', 'Guías de remisión'].filter(section => section !== 'Análisis y revisión' || routes.includes('Exportación'))
    return <div>
      <Button variant="ghost" className="mb-4 px-0" onClick={() => setScreen(null)}>← Volver a campañas</Button>
      <PageHeader title={campaign.nombre} subtitle={`${campaign.fruta} · ${campaign.estado} · ${screen.overview ? 'Resumen de cosecha y calidad' : screen.route || 'Carga'}`} action={!screen.overview && <ActionsMenu title="Opciones de cosecha de campaña" items={menuSections.map(section => ({label:section,onClick:()=>screen.route ? setScreen({...screen,section}) : enter(campaign.id,section === 'Análisis y revisión' ? 'Exportación' : undefined,section)}))}/>} />
      {screen.overview ? <div><div className="mb-5 grid gap-3 sm:grid-cols-3">{[['Estado de campaña',campaign.estado],['Inicio',fmtDate(campaign.fecha)],['Fin',fmtDate(campaign.fechaFin)]].map(([label,value])=><div key={label} className="rounded-xl border border-line bg-surface p-4"><div className="text-xs text-ink-soft">{label}</div><div className="mt-1 font-semibold">{value}</div></div>)}</div><p className="text-sm text-ink-soft">Los estados de calidad corresponden a cada carga. Consulta sus detalles desde las opciones de la campaña.</p></div> : <>
        <h2 className="mb-5 font-display text-xl font-semibold">{screen.section}</h2>
        {!screen.route && routes.map(selected => { const operation = s.qualityOperations.find(o=>o.campaignId===campaign.id&&o.route===selected); return operation && <section key={selected} className="mb-8"><h3 className="mb-4 font-display text-lg font-semibold">{screen.section === 'Guías de remisión' ? 'Guías de' : 'Cargas de'} {selected}</h3>{selected==='Industria' ? screen.section === 'Guías de remisión' ? <IndustryGuides operationId={operation.id}/> : <IndustryLoads operationId={operation.id}/> : screen.section === 'Guías de remisión' ? <ExportCampaignGuides campaignId={campaign.id} onOpen={(id,section)=>setLoad({id,section})}/> : <ExportCampaignLoads campaignId={campaign.id} onOpen={(id,section)=>setLoad({id,section})}/>}</section> })}
        {parent && screen.route === 'Industria' && (screen.section === 'Guías de remisión' ? <IndustryGuides operationId={parent.id}/> : <IndustryLoads operationId={parent.id}/>)}
        {parent && screen.route === 'Exportación' && (screen.section === 'Análisis y revisión' ? <ExportHarvestFlow operation={parent} section="Análisis y revisión"/> : screen.section === 'Guías de remisión' ? <ExportCampaignGuides campaignId={campaign.id} onOpen={(id,section)=>setLoad({id,section})}/> : <ExportCampaignLoads campaignId={campaign.id} onOpen={(id,section)=>setLoad({id,section})}/>)}
      </>}
    </div>
  }
  return <div>
    <PageHeader title="Cosecha y control de calidad" subtitle="Una campaña reúne sus análisis y todas las cargas de sus entregas" action={<Button onClick={()=>setAddingCampaign(true)}>+ Agregar campaña</Button>}/>
    <Tabs tabs={['Exportador','Industria']} active={route} onChange={setRoute}/>
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-4"><Field label="Campaña"><Select value={campaignFilter} onChange={e=>setCampaignFilter(e.target.value)}><option value="">Todas</option>{s.campaigns.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</Select></Field><Field label="Estado de campaña"><Select value={stateFilter} onChange={e=>setStateFilter(e.target.value)}><option value="">Todos</option>{Array.from(new Set(s.campaigns.map(c=>c.estado))).map(state=><option key={state}>{state}</option>)}</Select></Field><Button variant="ghost" onClick={()=>{setCampaignFilter('');setStateFilter('');sessionStorage.removeItem('qualityCampaignFilter')}}>Limpiar filtros</Button></div>
    <Table head={['Campaña','Fruta','Inicio / fin','Estado de campaña','Acciones']}>{campaigns.map(c=><tr key={c.id}><td className="p-4 font-semibold">{c.nombre}</td><td className="p-4">{c.fruta}</td><td className="p-4 text-sm">{fmtDate(c.fecha)} → {fmtDate(c.fechaFin)}</td><td className="p-4">{c.estado}</td><td className="p-4"><div className="flex gap-2"><IconBtn title={`Ver campaña ${c.nombre}`} onClick={()=>setScreen({campaignId:c.id,overview:true})}><Eye/></IconBtn><ActionsMenu title={`Opciones de ${c.nombre}`} items={[...(route !== 'Industria' && availableRoutes(c.id).includes('Exportación') ? [{label:'Análisis y revisión',onClick:()=>enter(c.id,'Exportación','Análisis y revisión')}] : []),...['Carga','Guías de remisión'].map(label=>({label,onClick:()=>enter(c.id,route === 'Exportador' ? 'Exportación' : 'Industria',label === 'Carga' ? 'Cargas por entrega' : 'Guías de remisión')}))]}/></div></td></tr>)}{!campaigns.length&&<tr><td colSpan={5} className="p-6 text-center">No hay campañas para los filtros seleccionados.</td></tr>}</Table>
    {addingCampaign && <AddQualityCampaign initialRoute={route==='Exportador'?'Exportación':route==='Industria'?'Industria':undefined} onClose={()=>setAddingCampaign(false)} onSave={(id,selected)=>{setAddingCampaign(false);setCampaignFilter('');setStateFilter('');sessionStorage.removeItem('qualityCampaignFilter');enter(id,selected,selected==='Exportación'?'Análisis y revisión':'Cargas por entrega')}}/>}
  </div>
}

function ExportCampaignGuides({campaignId,onOpen}:{campaignId:string;onOpen:(id:string,section?:string)=>void}) {
  const s=useStore();const [selected,setSelected]=useState<string|null>(null)
  const loads=s.qualityOperations.filter(o=>o.campaignId===campaignId&&o.route==='Exportación'&&o.sourceDelivery).sort((a,b)=>(a.loadNumber||0)-(b.loadNumber||0))
  const operation=loads.find(o=>o.id===selected)
  if(operation)return <ExportGuide key={operation.id} operation={operation} autoOpen onBackToList={()=>setSelected(null)}/>
  return <div><p className="mb-4 text-sm text-ink-soft">Cada fila corresponde a una carga. Identifícala por el transportista, la placa y el chofer. El botón te lleva al paso que falta o a sus guías.</p><Table head={['Transportista','Cliente','Placa y chofer','Peso de la carga','Estado / guías','Acciones']}>{loads.map((o,index)=>{
    const context=deliveryContext(s,o.sourceDelivery);const service=s.campaignTransporters.flatMap(l=>l.services).find(i=>i.id===`harvest-${o.id}`)
    const carrierLink=s.campaignTransporters.find(l=>l.services.some(i=>i.id===service?.id))||context.link
    const carrier=s.transporters.find(t=>t.id===carrierLink?.transporterId)
    const plate=carrier?.vehiculos.find(v=>v.id===(service?.vehicleId||context.delivery?.vehicleId))?.placa
    const driver=carrier?.choferes.find(d=>d.id===(service?.driverId||context.delivery?.driverId))?.nombre
    const guides=service?.guides||[];const generated=guides.filter(g=>g.generatedAt);const pending=guides.filter(g=>!g.generatedAt);const ready=exportReadiness(s,o)
    let status='Lista para preparar guía',action='Preparar guía',section='',tone='bg-leaf-50 text-forest'
    if(o.qualityDecision==='Rechazada'){status='Carga rechazada';action='';tone='bg-red-50 text-danger'}
    else if(generated.length&&!pending.length){status='Guías generadas';action='Ver guías'}
    else if(!ready.reviewed){status='Análisis pendientes';action='Completar análisis';section='Análisis y revisión';tone='bg-amber-50 text-amber-800'}
    else if(pending.some(g=>g.details)){status=generated.length?'Guías por completar':'Guía en preparación';action='Continuar guía'}
    const deliveryNumber=(context.contract?.entregas.findIndex(d=>d.id===context.delivery?.id)??-1)+1
    return <tr key={o.id}><td className="p-3"><b>{carrier?.empresa||'Sin transportista asignado'}</b><div className="mt-1 text-xs text-ink-soft">Entrega {deliveryNumber||'—'} · {fmtDate(context.delivery?.fecha||'')}</div></td><td className="p-3">{s.clients.find(c=>c.id===context.requirement?.clientId)?.empresa||'—'}</td><td className="p-3 text-sm"><div className="font-mono font-medium">{plate||'Sin placa asignada'}</div><div className="mt-1 text-xs text-ink-soft">{driver||'Sin chofer asignado'}</div></td><td className="p-3">{(o.harvestedQuantity||o.loadRegistration?.kilos||o.estimatedQuantity)?`${fmtNum(o.harvestedQuantity||o.loadRegistration?.kilos||o.estimatedQuantity)} kg`:<span className="text-sm text-ink-soft">Sin registrar</span>}</td><td className="p-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{status}</span>{generated.length>0&&<div className="mt-1 text-xs text-ink-soft">{generated.map(g=>g.reference).join(' · ')}</div>}</td><td className="p-3"><div className="flex items-center gap-2"><IconBtn title={`Ver detalle de carga ${index+1}`} onClick={()=>onOpen(o.id)}><Eye/></IconBtn>{action&&<Button variant={section?'outline':'primary'} onClick={()=>section?onOpen(o.id,section):setSelected(o.id)}>{action}</Button>}</div></td></tr>
  })}{!loads.length&&<tr><td colSpan={6} className="p-6 text-center text-sm text-ink-soft">Aún no hay cargas. Registra una carga para preparar su guía de remisión.</td></tr>}</Table></div>
}

function ExportCampaignLoads({ campaignId, onOpen }: { campaignId: string; onOpen: (id: string, section?: string) => void }) {
  const s = useStore(); const [editor,setEditor]=useState<string|null>(null)
  const operations=s.qualityOperations.filter(o=>o.campaignId===campaignId&&o.route==='Exportación'&&o.sourceDelivery).sort((a,b)=>(a.loadNumber||0)-(b.loadNumber||0))
  const state=(o:QualityOperation)=>o.qualityDecision==='Rechazada'?'Rechazada':exportReadiness(s,o).reviewed?'Aprobada':'Pendiente de revisión'
  return <div><div className="mb-4 flex items-center justify-between gap-4"><p className="text-sm text-ink-soft">Cada entrega se registra una sola vez. Consulta o edita cada carga desde sus acciones.</p><Button disabled={s.campaigns.find(c=>c.id===campaignId)?.estado!=='En Proceso'} onClick={()=>setEditor('new')}>+ Registrar carga</Button></div><Table head={['Transportista','Placa y chofer','Entrega / cliente','Kilos registrados','Inversión total','Calidad de carga','Acciones']}>{operations.map((o,index)=>{const context=deliveryContext(s,o.sourceDelivery);const carrierLink=s.campaignTransporters.find(l=>l.services.some(i=>i.id===`harvest-${o.id}`))||context.link;const service=carrierLink?.services.find(i=>i.id===`harvest-${o.id}`);const carrier=s.transporters.find(t=>t.id===carrierLink?.transporterId);const plate=carrier?.vehiculos.find(v=>v.id===(service?.vehicleId||context.delivery?.vehicleId))?.placa;const driver=carrier?.choferes.find(d=>d.id===(service?.driverId||context.delivery?.driverId))?.nombre;return <tr key={o.id}><td className="p-3 font-semibold">{carrier?.empresa||'Sin transportista asignado'}</td><td className="p-3 text-sm"><div className="font-mono font-medium">{plate||'Sin placa asignada'}</div><div className="mt-1 text-xs text-ink-soft">{driver||'Sin chofer asignado'}</div></td><td className="p-3 text-sm">{s.clients.find(c=>c.id===context.requirement?.clientId)?.empresa}<div className="text-xs text-ink-soft">{fmtDate(context.delivery?.fecha||'')} · {context.delivery?.id}</div></td><td className="p-3">{fmtNum(o.estimatedQuantity)} kg</td><td className="whitespace-nowrap p-3">{o.loadRegistration?`S/ ${registrationInvestment(o.loadRegistration).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}`:'—'}</td><td className={`p-3 ${state(o)==='Rechazada'?'text-danger':state(o)==='Aprobada'?'text-forest':'text-ink-soft'}`}>{state(o)}</td><td className="p-3"><div className="flex gap-1"><IconBtn title={`Ver carga ${index+1}`} onClick={()=>onOpen(o.id)}><Eye/></IconBtn>{o.qualityDecision!=='Rechazada'&&!s.campaignTransporters.some(l=>l.services.some(i=>i.id===`harvest-${o.id}`&&i.guides?.some(g=>g.generatedAt)))&&<IconBtn title="Editar datos de carga" onClick={()=>setEditor(o.id)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m16 3 5 5-12 12-6 1 1-6L16 3Z"/></svg></IconBtn>}</div></td></tr>})}{!operations.length&&<tr><td colSpan={7} className="p-6 text-center text-sm text-ink-soft">Registra la primera carga seleccionando una entrega de esta campaña.</td></tr>}</Table>{editor&&<ExportLoadEditor campaignId={campaignId} id={editor} onClose={()=>setEditor(null)}/>}</div>
}

function ExportLoadEditor({campaignId,id,onClose}:{campaignId:string;id:string;onClose:()=>void}) {
 const s=useStore();const existing=s.qualityOperations.find(o=>o.id===id)
 const context=deliveryContext(s,existing?.sourceDelivery)
 const service=s.campaignTransporters.flatMap(l=>l.services).find(i=>i.id===`harvest-${id}`)
 let initial:LoadRegistration|undefined=existing?.loadRegistration
 if(!initial&&existing?.advances.length){
   const providers=context.providers.map(p=>{const advances=existing.advances.filter(a=>a.providerId===p.providerId);return {providerId:p.providerId,variety:existing.variety||context.requirement?.variedades?.[0]||'',kilos:advances.reduce((n,a)=>n+a.kilos,0),packages:[{type:'Jabas' as const,loaded:advances.reduce((n,a)=>n+a.crates,0),empty:0}]}})
   initial={qualityResult:'Cumple',responsible:existing.organization?.crewLead||existing.advances[0].responsible,registeredAt:new Date().toISOString(),loadDate:existing.closure?.endDate||existing.expectedDate,variety:existing.variety||'',kilos:providers.reduce((n,p)=>n+(p.kilos||0),0),packages:[{type:'Jabas',loaded:providers.reduce((n,p)=>n+p.packages[0].loaded,0),empty:0}],providers,expenses:[],observations:existing.observations,viaticos:existing.viaticos}
 }
 const save=({sourceDelivery,annotation}:LoadRegistrationPayload)=>{
   if(service?.guides?.some(g=>g.generatedAt))return 'Esta carga ya tiene guías generadas y se conserva para consulta.'
   if(!existing&&deliveryHasLoad(s.qualityOperations,s.campaignTransporters,sourceDelivery))return 'Esta entrega ya tiene una carga registrada. Selecciona otra entrega.'
   const c=deliveryContext(s,sourceDelivery)
   if(!c.delivery||!deliveryReady(s,sourceDelivery))return 'Completa primero los datos de esta entrega en Campaña en proceso → Entregas.'
   const others=s.qualityOperations.filter(o=>o.id!==id&&o.route==='Exportación'&&o.qualityDecision!=='Rechazada'&&sourceKey(o.sourceDelivery)===sourceKey(sourceDelivery)).reduce((n,o)=>n+(o.status==='Cosecha terminada'?o.harvestedQuantity:o.estimatedQuantity),0)
   const available=Math.max(0,c.delivery.kilos-others)
   if(annotation.kilos>available+0.01)return `Los kilos de esta carga no pueden superar los ${fmtNum(available)} kg disponibles de la entrega.`
   if(existing&&(annotation.kilos+0.01<existing.harvestedQuantity||annotation.providers?.some(p=>(p.kilos||0)+0.01<existing.advances.filter(a=>a.providerId===p.providerId).reduce((n,a)=>n+a.kilos,0))))return 'Los kilos registrados por proveedor no pueden ser menores a sus avances de cosecha.'
   if(existing?.status==='Cosecha terminada'&&(Math.abs(annotation.kilos-existing.harvestedQuantity)>0.01||annotation.providers?.some(p=>Math.abs((p.kilos||0)-existing.advances.filter(a=>a.providerId===p.providerId).reduce((n,a)=>n+a.kilos,0))>0.01)))return 'La cosecha está cerrada: conserva los kilos reales cosechados de cada proveedor.'
   const operation={...emptyOperation(campaignId,'Exportación'),...existing,loadRegistration:annotation,viaticos:annotation.viaticos,sourceDelivery,providerId:c.providers[0].providerId,origin:c.delivery.origin||'',expectedDate:c.delivery.start||c.delivery.fecha,estimatedQuantity:annotation.kilos,harvestedQuantity:existing?.advances.length?existing.harvestedQuantity:annotation.kilos,clientRequirementId:c.requirement?.id,variety:annotation.variety}
   const saved={...operation,qualityDecision:(exportReadiness(s,operation as QualityOperation).reviewed?'Aprobada':'Pendiente') as NonNullable<QualityOperation['qualityDecision']>}
   if(existing)s.updateQualityOperation(existing.id,saved)
   else s.addQualityOperation({...saved,loadNumber:Math.max(0,...s.qualityOperations.filter(o=>o.campaignId===campaignId&&o.route==='Exportación').map(o=>o.loadNumber||0))+1,reference:`CARGA-EXP-${Date.now().toString().slice(-6)}`})
   if(service&&c.link)s.saveCampaignTransportService(c.link.id,{...service,annotation,guides:service.guides?.map(g=>!g.generatedAt&&!g.details&&!g.providers&&service.guides!.length===1?{...g,kilos:annotation.kilos}:g),documents:service.documents?{...service.documents,loadedKg:String(annotation.kilos)}:undefined})
   s.toast('Datos de carga guardados. Ya puedes preparar su guía de remisión.')
 }
 return <LoadRegistrationModal campaignId={campaignId} operationId={existing?.id} route="Exportación" initialSource={existing?.sourceDelivery} registration={initial} initialViaticos={existing?.viaticos} onSubmit={save} reviewSource={source=>exportReadiness(s,{...emptyOperation(campaignId,'Exportación'),id:existing?.id||'draft',sourceDelivery:source} as QualityOperation)} onClose={onClose}/>
}

function AddQualityCampaign({initialRoute,onClose,onSave}:{initialRoute?:QualityRoute;onClose:()=>void;onSave:(id:string,route:QualityRoute)=>void}) {
  const s=useStore();const [campaignId,setCampaignId]=useState('');const [route,setRoute]=useState<QualityRoute>(initialRoute||'Exportación');const [error,setError]=useState('')
  const choices=s.campaigns.filter(c=>c.estado==='En Proceso')
  const exists=s.qualityOperations.some(o=>o.campaignId===campaignId&&o.route===route)
  const save=()=>{if(!choices.some(c=>c.id===campaignId)){setError('Selecciona una campaña en proceso.');return}onSave(campaignId,route)}
  return <Modal open title="Agregar campaña a cosecha y calidad" onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={!choices.length} onClick={save}>{exists?'Abrir campaña':'Agregar campaña'}</Button></>}><Field label="Campaña en proceso"><Select aria-label="Campaña para cosecha" value={campaignId} onChange={e=>{setCampaignId(e.target.value);setError('')}}><option value="">Seleccionar campaña existente</option>{choices.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</Select></Field>{!initialRoute&&<div className="mt-4"><Field label="Tipo de proceso"><Select aria-label="Tipo de proceso de campaña" value={route} onChange={e=>setRoute(e.target.value as QualityRoute)}><option>Exportación</option><option>Industria</option></Select></Field></div>}<p className="mt-4 text-sm text-ink-soft">{exists?'Esta campaña ya está agregada a este proceso. Se abrirá su información sin duplicarla.':'Selecciona una campaña registrada en Gestión de campaña para comenzar sus análisis y cargas.'}</p>{!choices.length&&<p className="mt-3 text-sm text-ink-soft">No hay campañas en proceso disponibles.</p>}{error&&<p role="alert" className="mt-3 text-danger">{error}</p>}</Modal>
}
