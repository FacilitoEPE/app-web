import { useState } from 'react'
import { useStore, FRUIT_CATALOG, type QualityOperation, type QualityRoute, type CampaignTransportService, type LoadPackage } from './store'
import { deliveryReady, deliveryHasLoad, deliveryKey as sourceDeliveryKey } from './quality-load-utils'
import { LoadTravelExpensesEditor, LoadTravelExpensesSummary, travelExpenseDraft, validTravelExpenses, travelExpenseAmounts } from './load-expenses'
import { deliveryContext } from './industry-delivery'
import { Button, Field, Select, Input, TextArea, Modal, fmtNum, fmtDate } from './ui'

export type LoadRegistration = NonNullable<CampaignTransportService['annotation']>
export type LoadRegistrationPayload = {sourceDelivery:NonNullable<QualityOperation['sourceDelivery']>;annotation:LoadRegistration}
const types=['Jabas','Bines','Mallas'] as const
type PackageType=typeof types[number]
const expenseConcepts=['Cuadrilla','Anotadores'] as const
const loadedLabel=(type:PackageType)=>type==='Bines'?'cargados':'cargadas'
const emptyLabel=(type:PackageType)=>type==='Bines'?'vacíos':'vacías'
const soles=(n:number)=>`S/ ${n.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}`
export const registrationInvestment=(a?:LoadRegistration)=>(a?.expenses||[]).reduce((n,e)=>n+e.amount,0)+(a?.viaticos?.mobility||0)+(a?.viaticos?.supplies||0)
function providerLoads(item:CampaignTransportService, fallbackProviderId:string){const a=item.annotation!;return a.providers?.length?a.providers.map(p=>({...p,variety:p.variety??a.variety})):[{providerId:item.providerId||fallbackProviderId,variety:a.variety,kilos:a.kilos,packages:a.packages}]}

type PackageDraft={type:PackageType;enabled:boolean;loaded:string;empty:string}
type LoadDraft={providerId:string;variety:string;kilos:string;packages:PackageDraft[]}
const draftPackages=(packages?:LoadPackage[]):PackageDraft[]=>types.map(type=>{const p=packages?.find(p=>p.type===type);return {type,enabled:!!p,loaded:String(p?.loaded??''),empty:String(p?.empty??'')}})
const newLoad=(providerId:string,variety=''):LoadDraft=>({providerId,variety,kilos:'',packages:draftPackages()})

export function LoadRegistrationModal({operationId,campaignId,initialViaticos,route='Industria',linkId,item,initialSource:sourceProp,registration,onSubmit,onReject,reviewSource,onClose}:{operationId?:string;campaignId?:string;initialViaticos?:QualityOperation['viaticos'];route?:QualityRoute;linkId?:string;item?:CampaignTransportService;initialSource?:QualityOperation['sourceDelivery'];registration?:LoadRegistration;onSubmit?:(payload:LoadRegistrationPayload)=>string|void;onReject?:()=>string|void;reviewSource?:(source:QualityOperation['sourceDelivery'])=>{reviewed:boolean;blocked:boolean};onClose:()=>void}) {
 const s=useStore();const operation=s.qualityOperations.find(o=>o.id===operationId);const activeCampaignId=campaignId||operation?.campaignId||'';const links=s.campaignTransporters.filter(l=>l.campaignId===activeCampaignId)
 const choices=s.requirements.filter(r=>r.campaignId===activeCampaignId&&r.canal===route).flatMap(r=>(r.contratos||[]).flatMap(c=>c.entregas.map(d=>({key:`${r.id}|${c.id}|${d.id}`,source:{requirementId:r.id,contractId:c.id,deliveryId:d.id},r,c,d}))))
 const initialSource=sourceProp||(item?item.sourceDelivery||operation?.sourceDelivery:undefined)
 const availableChoices=choices.filter(c=>sourceDeliveryKey(initialSource)===c.key || (deliveryReady(s,c.source) && !deliveryHasLoad(s.qualityOperations,s.campaignTransporters,c.source,{serviceId:item?.id,exportOperationId:route==='Exportación'?operationId:undefined})))
 const [deliveryKey,setDeliveryKey]=useState(initialSource?`${initialSource.requirementId}|${initialSource.contractId}|${initialSource.deliveryId}`:'')
 const selectedDelivery=choices.find(c=>c.key===deliveryKey)
 const source=deliveryContext(s,selectedDelivery?.source);const inherited=source.delivery
 const campaign=s.campaigns.find(c=>c.id===activeCampaignId)
 const varieties=Array.from(new Set((campaign?.frutas?.length?campaign.frutas:[campaign?.fruta??'']).flatMap(f=>FRUIT_CATALOG[f]??[])))
 const a=registration||item?.annotation
 const [truck,setTruck]=useState(item?`${linkId}|${item.vehicleId}`:inherited?`${inherited.transportLinkId}|${inherited.vehicleId}`:'')
 const [loadDate,setLoadDate]=useState(a?.loadDate||new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))
 const [responsible,setResponsible]=useState(a?.responsible||'')
 const [qualityResult,setQualityResult]=useState<''|'Cumple'|'No cumple'>(a||route==='Exportación'?'Cumple':'')
 const [notes,setNotes]=useState(a?.observations||'')
 const [loads,setLoads]=useState<LoadDraft[]>(()=>a?providerLoads({...item,providerId:item?.providerId||operation?.providerId||'',annotation:a} as CampaignTransportService,operation?.providerId||'').map(p=>({providerId:p.providerId,variety:p.variety||'',kilos:String(p.kilos??''),packages:draftPackages(p.packages)})):inherited?source.providers.map(p=>newLoad(p.providerId,source.requirement?.variedades?.length===1?source.requirement.variedades[0]:source.requirement?.variedad?.includes(',')?'':source.requirement?.variedad||'')):[])
 const [expenses,setExpenses]=useState<Record<string,string>>(()=>Object.fromEntries(expenseConcepts.map(c=>[c,String(a?.expenses?.find(e=>e.concept===c)?.amount??'')])))
 const [viaticos,setViaticos]=useState(()=>travelExpenseDraft(a?.viaticos||initialViaticos))
 const [error,setError]=useState('')
 const providerName=(id:string)=>{const p=s.providers.find(p=>p.id===id);return p?`${p.nombres} ${p.apellidos}`:id}
 const updatePackage=(providerIndex:number,typeIndex:number,patch:Partial<PackageDraft>)=>setLoads(current=>current.map((l,i)=>i!==providerIndex?l:{...l,packages:l.packages.map((p,j)=>j===typeIndex?{...p,...patch}:p)}))
 const totals=types.map(type=>{const used=loads.flatMap(l=>l.packages).filter(p=>p.type===type&&p.enabled);return {type,used:used.length>0,loaded:used.reduce((n,p)=>n+(Number(p.loaded)||0),0),empty:used.reduce((n,p)=>n+(Number(p.empty)||0),0)}}).filter(t=>t.used)
 const kilos=loads.reduce((n,l)=>n+(Number(l.kilos)||0),0)
 const updateLoad=(index:number,patch:Partial<LoadDraft>)=>setLoads(current=>current.map((l,i)=>i===index?{...l,...patch}:l))
 const expenseTotal=expenseConcepts.reduce((n,c)=>n+(Number(expenses[c])||0),0)

 const save=()=>{
  if(selectedDelivery&&!item&&!initialSource&&deliveryHasLoad(s.qualityOperations,s.campaignTransporters,selectedDelivery.source,{exportOperationId:route==='Exportación'?operationId:undefined})){setError('Esta entrega ya tiene una carga registrada. Selecciona otra entrega.');return}
  if(!selectedDelivery||!qualityResult){setError('Selecciona la entrega y si la fruta cumple los requisitos.');return}
  if(!deliveryReady(s,selectedDelivery.source)){setError('Completa primero la coordinación de esta entrega en Campaña en proceso → Entregas.');return}
  if(qualityResult==='No cumple'){if(onReject){const issue=onReject();if(issue){setError(issue);return}onClose();return}if(onSubmit){setError('La carga no cumple los requisitos. Solicita al administrador registrar el rechazo.');return}if(!operationId)return;s.rejectIndustryDelivery(operationId,selectedDelivery.source,item?.id);s.toast('Carga rechazada guardada en la entrega.');onClose();return}
  if(!validTravelExpenses(viaticos)){setError('Los viáticos deben ser importes válidos, mayores o iguales a cero.');return}
  const [selectedLink,vehicleId]=truck.split('|');const link=links.find(l=>l.id===selectedLink)
  if(!inherited||!selectedDelivery||!loadDate||!link||!vehicleId||!responsible.trim()){setError('Selecciona una entrega y registra fecha de carga y responsable.');return}
  if(!source.transporter?.choferes.some(c=>c.id===inherited.driverId)||!inherited.start||!inherited.end||!inherited.origin||!inherited.destino||source.providers.some(p=>!p.fincaIds.length)){setError('Completa primero los datos de viaje y fincas de esta entrega.');return}
  if(!loads.length){setError('Agrega al menos un proveedor al camión.');return}
  const noVariety=loads.find(l=>!l.variety);if(noVariety){setError(`Selecciona la variedad de ${providerName(noVariety.providerId)}.`);return}
  const noKilos=loads.find(l=>!Number.isFinite(Number(l.kilos))||Number(l.kilos)<=0);if(noKilos){setError(`Registra kilos mayores a cero para ${providerName(noKilos.providerId)}.`);return}
  const missing=loads.find(l=>!l.packages.some(p=>p.enabled));if(missing){setError(`Marca al menos un tipo de bulto para ${providerName(missing.providerId)}.`);return}
  const invalid=(v:string)=>v===''||!Number.isInteger(Number(v))||Number(v)<0
  const bad=loads.find(l=>l.packages.some(p=>p.enabled&&(invalid(p.loaded)||invalid(p.empty))));if(bad){setError(`Registra cantidades enteras de bultos cargados y vacíos para ${providerName(bad.providerId)}; puedes usar cero.`);return}
  if(expenseConcepts.some(c=>expenses[c]!==''&&(!Number.isFinite(Number(expenses[c]))||Number(expenses[c])<0))){setError('Los montos de gastos no pueden ser negativos.');return}
  const previous=route==='Exportación'?0:s.campaignTransporters.flatMap(l=>l.services).filter(i=>i.id!==item?.id&&i.sourceDelivery?.requirementId===selectedDelivery.source.requirementId&&i.sourceDelivery?.contractId===selectedDelivery.source.contractId&&i.sourceDelivery?.deliveryId===inherited.id).reduce((n,i)=>n+(i.annotation?.kilos||0),0)
  const providers=loads.map(l=>({providerId:l.providerId,variety:l.variety,kilos:Number(l.kilos),packages:l.packages.filter(p=>p.enabled).map(p=>({type:p.type,loaded:Number(p.loaded),empty:Number(p.empty)}))}))
  const packages=totals.map(t=>({type:t.type,loaded:t.loaded,empty:t.empty}))
  if(inherited&&previous+kilos>inherited.kilos){setError('Los kilos cargados superan los kilos programados de la entrega.');return}
  const annotation:LoadRegistration={viaticos:travelExpenseAmounts(viaticos),qualityResult:'Cumple',responsible:responsible.trim(),registeredAt:a?.registeredAt||new Date().toISOString(),loadDate,variety:Array.from(new Set(loads.map(l=>l.variety))).join(', '),kilos,packages,providers,expenses:expenseConcepts.filter(c=>expenses[c]!=='').map(c=>({concept:c,amount:Number(expenses[c])})),observations:notes}
  if(onSubmit){const issue=onSubmit({sourceDelivery:selectedDelivery.source,annotation});if(issue){setError(issue);return}onClose();return}
  s.saveCampaignTransportService(link.id,{...item,id:item?.id,operationId,sourceDelivery:selectedDelivery.source,providerId:inherited?.providerId||operation?.providerId||loads[0].providerId,fincaId:inherited?.fincaId||item?.fincaId,vehicleId,driverId:inherited?.driverId||item?.driverId||'',start:inherited?.start||item?.start||loadDate,end:inherited?.end||item?.end||'',origin:inherited?.origin||operation?.origin||'',destination:inherited?.destino||item?.destination||'',conditions:inherited?.conditions||item?.conditions||'',freight:item?.freight??inherited?.freight,logisticsCompleted:!!inherited,guides:item?.guides ? item.guides.map(g=>!g.generatedAt&&!g.details&&!g.providers&&item.guides!.length===1?{...g,kilos}:g) : inherited&&selectedDelivery?[{id:Math.random().toString(36).slice(2),reference:'',document:'',...selectedDelivery.source,kilos}]:undefined,annotation})
  s.toast(inherited?'Carga real guardada con los datos de la entrega. Ya puedes generar la guía.':'Datos de carga guardados. Logística puede completar la carga y generar la guía.');onClose()
 }

 return <Modal open wide title="Registrar datos de carga · Anotador / jefe de cuadrilla" onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={!availableChoices.length} onClick={save}>{qualityResult==='No cumple'?'Guardar rechazo':'Guardar datos de carga'}</Button></>}>
   <div className="sm:col-span-2"><Field label="Entrega de la campaña"><Select aria-label="Entrega de la carga" value={deliveryKey} disabled={!!initialSource || !!item?.sourceDelivery || !!item?.guides?.some(g=>g.generatedAt)} onChange={e=>{setDeliveryKey(e.target.value);setQualityResult(route==='Exportación'?'Cumple':'');const choice=choices.find(c=>c.key===e.target.value);const context=deliveryContext(s,choice?.source);setTruck(context.delivery?`${context.delivery.transportLinkId}|${context.delivery.vehicleId}`:'');setLoads(context.providers.map(p=>newLoad(p.providerId,context.requirement?.variedades?.length===1?context.requirement.variedades[0]:context.requirement?.variedad?.includes(',')?'':context.requirement?.variedad||'')));setError('')}}><option value="">Seleccionar entrega</option>{availableChoices.map(c=><option key={c.key} value={c.key}>{s.clients.find(client=>client.id===c.r.clientId)?.empresa} · {c.c.contrato} · {fmtDate(c.d.fecha)} · {fmtNum(c.d.kilos)} kg</option>)}</Select></Field></div>

  {!availableChoices.length&&<p role="status" className="mt-3 text-sm text-ink-soft">No hay entregas disponibles. Completa su coordinación en Campaña en proceso → Entregas. Las que ya tienen carga no vuelven a aparecer.</p>}
  {route==='Industria'&&selectedDelivery&&<section className="mt-4"><h3 className="font-display font-semibold">¿La fruta cumple los requisitos?</h3><div role="radiogroup" aria-label="¿Cumple los requisitos?" className="mt-3 grid gap-3 sm:grid-cols-2">{([{value:'Cumple',label:'Sí cumple',hint:'Completar datos de carga'},{value:'No cumple',label:'No cumple',hint:'Guardar como rechazada'}] as const).map(option=><button key={option.value} type="button" role="radio" aria-checked={qualityResult===option.value} onClick={()=>{setQualityResult(option.value);setError('')}} className={`rounded-xl border p-4 text-left ${qualityResult===option.value?option.value==='Cumple'?'border-leaf bg-leaf-50 text-forest':'border-danger bg-red-50 text-danger':'border-line'}`}><b>{option.label}</b><div className="text-xs">{option.hint}</div></button>)}</div></section>}
  {route==='Exportación'&&selectedDelivery&&reviewSource?.(selectedDelivery.source).blocked&&<p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-red-50 p-3 text-sm text-danger">El MTD supera 0.5. No se puede continuar a cosecha hasta resolver la revisión.</p>}
  {qualityResult==='Cumple'&&selectedDelivery&&<><h3 className="mb-3 mt-5 font-display font-semibold">1. Datos de la carga real</h3><div className="grid gap-4 sm:grid-cols-2"><Field label="Fecha de carga"><Input type="date" aria-label="Fecha de carga" value={loadDate} onChange={e=>setLoadDate(e.target.value)}/></Field><Field label="Anotador / jefe de cuadrilla"><Input value={responsible} onChange={e=>setResponsible(e.target.value)}/></Field></div>

  <h3 className="mb-1 mt-6 font-display font-semibold">2. Detalle por proveedor</h3>
  <p className="mb-3 text-sm text-ink-soft">Cada proveedor del camión lleva su propia variedad, kilos y bultos.</p>
  {!loads.length&&<p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-soft">Selecciona una entrega para listar automáticamente sus proveedores.</p>}
  <div className="grid gap-3">{loads.map((l,providerIndex)=><div key={l.providerId} className="rounded-xl border border-line">
   <div className="flex items-center justify-between gap-2 border-b border-line bg-canvas/60 px-4 py-2.5"><b className="text-sm">{providerName(l.providerId)}</b></div>
   <div className="grid gap-3 border-b border-line px-4 py-3 sm:grid-cols-2">
    <Field label={`Variedad de ${campaign?.fruta?.toLowerCase()||'la fruta'}`}><Select aria-label={`Variedad de ${providerName(l.providerId)}`} value={l.variety} onChange={e=>updateLoad(providerIndex,{variety:e.target.value})}><option value="">Seleccionar variedad</option>{varieties.map(v=><option key={v}>{v}</option>)}</Select></Field>
    <Field label="Kilos cargados"><Input aria-label={`Kilos de ${providerName(l.providerId)}`} type="number" min="0" value={l.kilos} onChange={e=>updateLoad(providerIndex,{kilos:e.target.value})}/></Field>
   </div>
   <div className="px-4 pb-3 pt-2">
    <div className="pb-1 text-xs font-semibold uppercase tracking-wide text-ink">Bultos</div>
    <div className="grid grid-cols-[7rem_1fr_1fr] gap-3 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft"><span>Tipo</span><span>Cargados</span><span>Vacíos</span></div>
    {l.packages.map((p,typeIndex)=><div key={p.type} className={`grid grid-cols-[7rem_1fr_1fr] items-center gap-3 py-1 ${p.enabled?'':'opacity-60'}`}>
     <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" aria-label={`Usar ${p.type} de ${providerName(l.providerId)}`} checked={p.enabled} onChange={e=>updatePackage(providerIndex,typeIndex,{enabled:e.target.checked})} className="accent-leaf"/><span className="text-sm font-medium">{p.type}</span></label>
     <Input aria-label={`${p.type} ${loadedLabel(p.type)} de ${providerName(l.providerId)}`} disabled={!p.enabled} type="number" min="0" step="1" placeholder="0" value={p.loaded} onChange={e=>updatePackage(providerIndex,typeIndex,{loaded:e.target.value})}/>
     <Input aria-label={`${p.type} ${emptyLabel(p.type)} de ${providerName(l.providerId)}`} disabled={!p.enabled} type="number" min="0" step="1" placeholder="0" value={p.empty} onChange={e=>updatePackage(providerIndex,typeIndex,{empty:e.target.value})}/>
    </div>)}
   </div>
  </div>)}</div>
  {(kilos>0||totals.length>0)&&<div className="mt-3 rounded-xl bg-leaf-50 px-4 py-3 text-sm text-forest"><b>Total del camión:</b> {fmtNum(kilos)} kg{totals.length>0&&' · '}{totals.map(t=>`${t.type}: ${t.loaded} ${loadedLabel(t.type)} · ${t.empty} ${emptyLabel(t.type)}`).join(' | ')}</div>}

  <LoadTravelExpensesEditor value={viaticos} onChange={setViaticos}/>
  <h3 className="mb-3 mt-6 font-display font-semibold">3. Gastos de carga</h3>
  <div className="overflow-hidden rounded-xl border border-line">
   <div className="grid grid-cols-2 gap-3 border-b border-line bg-canvas/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-soft"><span>Concepto del gasto</span><span>Monto (S/)</span></div>
   {expenseConcepts.map(c=><div key={c} className="grid grid-cols-2 items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0"><span className="text-sm font-medium">{c}</span><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft">S/</span><Input aria-label={`Monto de ${c}`} className="pl-9" type="number" min="0" step="0.01" placeholder={c==='Cuadrilla'?'720.00':'50.00'} value={expenses[c]} onChange={e=>setExpenses(current=>({...current,[c]:e.target.value}))}/></div></div>)}
   <div className="grid grid-cols-2 gap-3 bg-canvas/40 px-4 py-2.5 text-sm"><b>Total gastos</b><b>{soles(expenseTotal)}</b></div>
  </div>

  <div className="mt-5"><Field label="Observaciones de carga"><TextArea aria-label="Observaciones de carga" value={notes} onChange={e=>setNotes(e.target.value)}/></Field></div>
  {!links.length&&<p className="mt-3 text-sm text-ink-soft">Vincula primero los transportistas en la campaña en proceso.</p>}</>}{qualityResult==='No cumple'&&<p className="mt-4 text-sm text-danger">Se guardará esta carga como rechazada. La entrega no volverá a aparecer al registrar otra carga.</p>}{error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
 </Modal>
}

export function exportRegistrationIssue(operation:QualityOperation) {
 const a=operation.loadRegistration
 if(!a)return ''
 if(Math.abs(a.kilos-operation.harvestedQuantity)>0.01)return 'Los kilos de la carga y los avances de cosecha no coinciden. Actualiza los datos de carga desde el lápiz o completa los avances antes de cerrar.'
 if(a.providers?.some(p=>Math.abs((p.kilos||0)-operation.advances.filter(v=>v.providerId===p.providerId).reduce((n,v)=>n+v.kilos,0))>0.01)||operation.advances.some(v=>!a.providers?.some(p=>p.providerId===v.providerId)))return 'Revisa los kilos de cada proveedor: deben coincidir con sus avances de cosecha antes de cerrar.'
 return ''
}

export function LoadRegistrationSummary({registration}:{registration:LoadRegistration}) {
 const s=useStore()
 const providers=registration.providers?.length?registration.providers:[]
 return <section className="mt-5 rounded-xl border border-line bg-surface p-4"><h3 className="mb-3 font-display font-semibold">Datos de carga registrados</h3><p className="mb-4 text-sm">Responsable: {registration.responsible} · {fmtDate(registration.loadDate||'')} · {fmtNum(registration.kilos)} kg</p>{providers.map(p=>{const provider=s.providers.find(v=>v.id===p.providerId);return <div key={p.providerId} className="mb-3 rounded-xl border border-line p-3"><b>{provider?.nombres} {provider?.apellidos}</b><p className="mt-1 text-sm">{p.variety||registration.variety} · {fmtNum(p.kilos||0)} kg</p><p className="mt-1 text-sm text-ink-soft">{p.packages.map(b=>`${b.type}: ${b.loaded} cargados / ${b.empty} vacíos`).join(' · ')}</p></div>})}<p className="text-sm">{registration.expenses?.map(e=>`${e.concept}: ${soles(e.amount)}`).join(' · ')||'Sin gastos de cuadrilla o anotadores registrados.'}</p><LoadTravelExpensesSummary value={registration.viaticos}/><p className="mt-4 text-sm font-semibold">Inversión total: {soles(registrationInvestment(registration))}</p>{registration.observations&&<p className="mt-2 whitespace-pre-wrap text-sm">{registration.observations}</p>}</section>
}
