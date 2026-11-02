import { useState, type ReactNode } from 'react'
import { guidePackageCount } from './guide-packages'
import { UbigeoPicker } from './ubigeo-picker'
import { useStore, type GuideProvider } from './store'
import { Button, Modal, Field, Input, Select, TextArea, Chip, fmtNum } from './ui'
import { GUIDE_STANDARDS, guideFruitType, standardPhrases, guideRoute, guideDelivery, guideProviders, loadProviders, guideValidation, type RemissionGuide } from './remission-model'

type SectionKey = 'transfer'|'carrier'|'driver'|'origin'|'destination'|'observations'|'providers'
function GuideSection({title,summary,open,onToggle,children}:{title:string;summary:string;open:boolean;onToggle:()=>void;children:ReactNode}) {
 return <section className="border-b border-line last:border-b-0">
  <button type="button" aria-expanded={open} onClick={onToggle} className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas/60 ${open?'bg-canvas/70':''}`}>
   <span className="min-w-0"><span className="block text-sm font-semibold text-forest">{title}</span><span className="mt-1 block truncate text-xs font-normal text-ink-soft">{summary}</span></span>
   <span aria-hidden="true" className="shrink-0 text-lg font-normal text-forest">{open?'−':'+'}</span>
  </button>
  {open&&<div className="p-4">{children}</div>}
 </section>
}

export function RemissionGuideEditor({linkId,serviceId,guideId,onClose}:{linkId:string;serviceId:string;guideId:string;onClose:()=>void}) {
  const s=useStore();const link=s.campaignTransporters.find(l=>l.id===linkId)!;const item=link.services.find(i=>i.id===serviceId)!
  const existing=item.guides?.find(g=>g.id===guideId)
  const source=item.sourceDelivery||item.guides?.[0]
  const guide:RemissionGuide=existing||{id:`guide-${Date.now()}`,reference:'',document:'',requirementId:source?.requirementId||'',contractId:source?.contractId||'',deliveryId:source?.deliveryId||'',kilos:0,providers:[]}
  const origins=loadProviders(s,item,guide);const route=guideRoute(s,item,guide)
  const peers=(item.guides||[]).filter(g=>g.id!==guide.id&&(g.details||g.generatedAt))
  const remaining=(id:string)=>{const origin=origins.find(o=>o.providerId===id);const used=peers.flatMap(g=>guideProviders(s,item,g)).filter(p=>p.providerId===id).reduce((n,p)=>n+p.kilos,0);return Math.max(0,(origin?.availableWeight||0)-used)}
  const initialProviders=existing?guideProviders(s,item,existing):origins.filter(o=>remaining(o.providerId)>0).map(o=>({...o,kilos:remaining(o.providerId)}))
  const [selected,setSelected]=useState(initialProviders.map(p=>p.providerId))
  const fruitTypes:Record<string,string>=Object.fromEntries(origins.map(o=>[o.providerId,guideFruitType(s,item,guide,o)||'']))
  const hasOrganic=route==='Exportación'||selected.some(id=>fruitTypes[id]==='Orgánica')
  const [weights,setWeights]=useState<Record<string,string>>(()=>Object.fromEntries(origins.map(o=>[o.providerId,String(initialProviders.find(p=>p.providerId===o.providerId)?.kilos||remaining(o.providerId)||'')])))
  const countPackages=(ids:string[])=>guidePackageCount(item.annotation,ids,origins.map(o=>o.providerId),s.qualityOperations.find(o=>o.id===item.operationId)?.advances)
  const delivery=guideDelivery(s,guide);const req=s.requirements.find(r=>r.id===guide.requirementId);const client=s.clients.find(c=>c.id===req?.clientId)
  const carrier=s.transporters.find(t=>t.id===link.transporterId);const driver=carrier?.choferes.find(c=>c.id===item.driverId)
  const d=guide.details
  const [openSection,setOpenSection]=useState<SectionKey|null>('transfer')
  const section=(key:SectionKey)=>({open:openSection===key,onToggle:()=>setOpenSection(current=>current===key?null:key)})
  const initialDriverName=driver?.nombre?.trim().split(/\s+/)||[]
  const [form,setForm]=useState({handoverDate:d?.handoverDate||item.annotation?.loadDate?.slice(0,10)||item.start.slice(0,10),carrierDocumentType:'RUC',carrierDocument:(d?.carrierDocumentType==='RUC'?d.carrierDocument:undefined)??carrier?.ruc??'',carrierName:d?.carrierName??carrier?.empresa??'',carrierMtc:d?.carrierMtc??carrier?.mtc??'',vehiclePlate:d?.vehiclePlate??carrier?.vehiculos.find(v=>v.id===item.vehicleId)?.placa??'',driverFirstNames:d?.driverFirstNames??initialDriverName.slice(0,1).join(' '),driverLastNames:d?.driverLastNames??initialDriverName.slice(1).join(' '),originEstablishment:d?.originEstablishment??'0000',destinationEstablishment:d?.destinationEstablishment??'0000',issueDate:d?.issueDate||new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),shipmentDate:d?.shipmentDate||item.start.slice(0,10),reason:d?.reason||'Compra',originAddress:d?.originAddress||item.origin,originUbigeo:d?.originUbigeo||'',destinationAddress:d?.destinationAddress||item.destination,destinationUbigeo:d?.destinationUbigeo||'',driverDocumentType:d?.driverDocumentType||driver?.tipoDocumento||'',driverDocument:d?.driverDocument||driver?.numeroDocumento||'',driverLicense:d?.driverLicense||driver?.licencia||'',grossWeight:String(d?.grossWeight||guide.kilos||initialProviders.reduce((n,p)=>n+p.kilos,0)),packageCount:d?.packageCount!==undefined?String(d.packageCount):initialProviders.some(p=>p.kilos!==origins.find(o=>o.providerId===p.providerId)?.availableWeight)?'':String(countPackages(initialProviders.map(p=>p.providerId))??''),productCode:d?.productCode||'',description:d?.description||[req?.fruta,req?.variedad].filter(Boolean).join(' · '),observations:d?.observations||''})
  const [codes,setCodes]=useState<string[]>(d?.standardCodes||[]);const [error,setError]=useState('')
  const set=(key:keyof typeof form,value:string)=>{setForm(current=>({...current,[key]:value}));setError('')}
  const kilos=selected.reduce((n,id)=>n+(Number(weights[id])||0),0)
  const allocation=(ids:string[],values:Record<string,string>)=>{setSelected(ids);setWeights(values);setError('');setForm(current=>({...current,grossWeight:String(ids.reduce((n,id)=>n+(Number(values[id])||0),0)),packageCount:ids.some(id=>Number(values[id])!==(origins.find(o=>o.providerId===id)?.availableWeight||0))?'':String(countPackages(ids)??'')}))}
  const save=()=>{
    if(existing?.generatedAt){setError('La guía ya fue generada y se conserva para consulta.');return}
    const providers:GuideProvider[]=origins.filter(o=>selected.includes(o.providerId)).map(o=>({providerId:o.providerId,fincaIds:o.fincaIds,fruitType:(route==='Exportación'?'Orgánica':fruitTypes[o.providerId]||undefined) as GuideProvider['fruitType'],kilos:Number(weights[o.providerId])}))
    if(route==='Industria'&&providers.some(p=>!p.fruitType)){setOpenSection('providers');setError('Completa el tipo de proveedor en la vinculación de la campaña; la guía lo toma automáticamente.');return}
    if(!form.packageCount.trim()){setOpenSection('transfer');setError('Registra el número de bultos que corresponde a esta guía.');return}
    if(!/^\d{4}$/.test(form.originEstablishment)||!/^\d{4}$/.test(form.destinationEstablishment)){setOpenSection(!/^\d{4}$/.test(form.originEstablishment)?'origin':'destination');setError('El código de establecimiento debe tener cuatro dígitos.');return}
    const details={...d,...form,observations:route==='Exportación'?'':form.observations,grossWeight:Number(form.grossWeight),packageCount:Number(form.packageCount),standardCodes:hasOrganic?codes:[],standardText:hasOrganic?standardPhrases(codes):''}
    const saved={...guide,kilos,providers,details}
    const issue=guideValidation(s,item,saved,item.guides||[])
    if(issue){setOpenSection(issue.includes('proveedor')||issue.includes('kilos')?'providers':issue.includes('direcciones')||issue.includes('ubigeo')?'origin':'transfer');setError(issue);return}
    const guides=existing?(item.guides||[]).map(g=>g.id===guide.id?saved:g):[...(item.guides||[]),saved]
    s.saveCampaignTransportService(linkId,{...item,guides});s.toast('Datos de la guía guardados');onClose()
  }
  return <Modal open wide title="Preparar guía de remisión" onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save}>Guardar guía</Button></>}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft"><span>{route} · {client?.empresa}</span><span>{selected.length} proveedor(es) · {fmtNum(kilos)} kg</span></div>
    <div className="overflow-visible rounded-xl border border-line bg-surface">
    <GuideSection title="Proveedores de esta guía" summary={`${selected.length} seleccionado(s) · ${fmtNum(kilos)} kg`} {...section('providers')}>
     <div className="mb-3 flex items-center justify-between gap-3"><p className="text-xs text-ink-soft">Distribuye los kilos entre los proveedores de esta carga.</p><Button variant="ghost" onClick={()=>allocation(origins.filter(o=>remaining(o.providerId)>0).map(o=>o.providerId),Object.fromEntries(origins.map(o=>[o.providerId,String(remaining(o.providerId))])))}>Seleccionar todos</Button></div><div className="space-y-3">{origins.map(o=><div key={o.providerId} className="rounded-xl border border-line p-3"><div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" aria-label={`Incluir proveedor ${o.label}`} checked={selected.includes(o.providerId)} disabled={!selected.includes(o.providerId)&&remaining(o.providerId)<=0} onChange={e=>allocation(e.target.checked?[...selected,o.providerId]:selected.filter(id=>id!==o.providerId),weights)}/>{o.label}</label>{selected.includes(o.providerId)&&<Field label="Kilos en esta guía"><Input aria-label={`Kilos de guía de ${o.label}`} type="number" min="0" step="0.01" max={remaining(o.providerId)||undefined} value={weights[o.providerId]||''} onChange={e=>allocation(selected,{...weights,[o.providerId]:e.target.value})}/></Field>}</div><p className="mt-2 text-xs font-medium text-forest">{s.campaignProviders.find(p=>p.campaignId===link.campaignId&&p.providerId===o.providerId)?.rol||s.providers.find(p=>p.id===o.providerId)?.tipo} · {fruitTypes[o.providerId]?`Fruta ${fruitTypes[o.providerId].toLowerCase()}`:'Tipo pendiente en la vinculación del proveedor'}</p><p className="mt-2 text-xs text-ink-soft">Fincas: {s.providers.find(p=>p.id===o.providerId)?.fincas?.filter(f=>o.fincaIds.includes(f.id)).map(f=>f.nombre).join(', ')||'Sin fincas'} · Disponibles: {fmtNum(remaining(o.providerId))} kg</p></div>)}</div><p className="mt-3 text-sm font-semibold">Total de la guía: {fmtNum(kilos)} kg</p>
    </GuideSection>
    <GuideSection title="Datos del traslado" summary={`${form.shipmentDate||'Fecha pendiente'} · ${fmtNum(kilos)} kg · ${form.packageCount||'—'} bultos`} {...section('transfer')}>
     <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Fecha de inicio de traslado"><Input type="date" value={form.shipmentDate} onChange={e=>set('shipmentDate',e.target.value)}/></Field>
      <Field label="Fecha de entrega al transportista"><Input type="date" value={form.handoverDate} onChange={e=>set('handoverDate',e.target.value)}/></Field>
      <Field label="Peso bruto total"><Input type="number" min={kilos} step="0.01" value={form.grossWeight} onChange={e=>set('grossWeight',e.target.value)}/></Field>
      <Field label="Peso · unidad de medida"><Select value="KGM" onChange={()=>{}}><option value="KGM">KGM · Kilogramo</option></Select></Field>
      <Field label="Número de bultos"><Input type="number" min="0" step="1" value={form.packageCount} onChange={e=>set('packageCount',e.target.value)}/></Field>
     </div>
    </GuideSection>
    <GuideSection title="Datos del transportista" summary={`${form.carrierName||'Sin transportista'} · ${form.vehiclePlate||'Sin placa'}`} {...section('carrier')}>
     <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Tipo de documento del transportista"><Select value={form.carrierDocumentType} onChange={e=>set('carrierDocumentType',e.target.value)}><option value="RUC">RUC · Registro Único de Contribuyente</option></Select></Field>
      <Field label="Documento número"><Input value={form.carrierDocument} onChange={e=>set('carrierDocument',e.target.value)}/></Field>
      <Field label="Transportista denominación"><Input value={form.carrierName} onChange={e=>set('carrierName',e.target.value)}/></Field>
      <Field label="Número de registro MTC (condicional)"><Input value={form.carrierMtc} onChange={e=>set('carrierMtc',e.target.value)}/></Field>
     </div>
     <fieldset className="mt-5 rounded-lg border border-line p-3"><legend className="px-1 text-xs font-medium text-ink-soft">Datos del vehículo principal</legend><Field label="Transportista placa número"><Input value={form.vehiclePlate} onChange={e=>set('vehiclePlate',e.target.value)}/></Field></fieldset>
    </GuideSection>
    <GuideSection title="Datos del conductor" summary={[form.driverFirstNames,form.driverLastNames].filter(Boolean).join(' ')||'Sin conductor'} {...section('driver')}>
     <fieldset><legend className="mb-3 text-xs font-medium text-ink-soft">Datos del conductor principal</legend><div className="grid gap-4 sm:grid-cols-2">
      <Field label="Tipo de documento"><Select value={form.driverDocumentType} onChange={e=>set('driverDocumentType',e.target.value)}><option value="">Elegir…</option>{['DNI','Carné de extranjería','Pasaporte'].map(t=><option key={t}>{t}</option>)}</Select></Field>
      <Field label="Documento número"><Input value={form.driverDocument} onChange={e=>set('driverDocument',e.target.value)}/></Field>
      <Field label="Nombre del conductor"><Input value={form.driverFirstNames} onChange={e=>set('driverFirstNames',e.target.value)}/></Field>
      <Field label="Apellidos del conductor"><Input value={form.driverLastNames} onChange={e=>set('driverLastNames',e.target.value)}/></Field>
      <Field label="Licencia de conducir"><Input value={form.driverLicense} onChange={e=>set('driverLicense',e.target.value)}/></Field>
     </div></fieldset>
    </GuideSection>
    <GuideSection title="Punto de partida" summary={form.originAddress||'Completar dirección y ubigeo'} {...section('origin')}>
     <div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="UBIGEO dirección de partida"><UbigeoPicker value={form.originUbigeo} onChange={value=>set('originUbigeo',value)}/></Field></div><Field label="Dirección del punto de partida"><Input value={form.originAddress} onChange={e=>set('originAddress',e.target.value)}/></Field><Field label="Código establecimiento SUNAT"><Input value={form.originEstablishment} maxLength={4} inputMode="numeric" onChange={e=>set('originEstablishment',e.target.value)}/></Field></div>
    </GuideSection>
    <GuideSection title="Punto de llegada" summary={form.destinationAddress||'Completar dirección y ubigeo'} {...section('destination')}>
     <div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="UBIGEO dirección de llegada"><UbigeoPicker value={form.destinationUbigeo} onChange={value=>set('destinationUbigeo',value)}/></Field></div><Field label="Dirección del punto de llegada"><Input value={form.destinationAddress} onChange={e=>set('destinationAddress',e.target.value)}/></Field><Field label="Código establecimiento SUNAT"><Input value={form.destinationEstablishment} maxLength={4} inputMode="numeric" onChange={e=>set('destinationEstablishment',e.target.value)}/></Field></div>
    </GuideSection>
    <GuideSection title={hasOrganic?'Normas y observaciones':'Observaciones'} summary={hasOrganic?`${codes.length} norma(s) seleccionada(s)`:form.observations||'Sin observaciones'} {...section('observations')}>
     {hasOrganic&&<div><p className="mb-3 text-xs text-ink-soft">Estas normas se aplican solo a los proveedores con fruta orgánica de esta guía.</p><Field label="Norma"><Select aria-label="Seleccionar norma de fruta orgánica" value="" onChange={e=>{if(e.target.value)setCodes(current=>[...current,e.target.value])}}><option value="">Seleccionar norma…</option>{GUIDE_STANDARDS.filter(n=>!codes.includes(n.code)).map(n=><option key={n.code} value={n.code}>{n.label}</option>)}</Select></Field><div className="my-3 flex flex-wrap gap-2">{codes.map(code=><Chip key={code} onRemove={()=>setCodes(current=>current.filter(c=>c!==code))}>{GUIDE_STANDARDS.find(n=>n.code===code)?.label}</Chip>)}</div><Field label="Texto de la norma"><TextArea readOnly rows={4} value={standardPhrases(codes)} placeholder="Selecciona una norma para completar su texto."/></Field></div>
     }{route==='Industria'&&<Field label="Observaciones"><TextArea rows={3} value={form.observations} onChange={e=>set('observations',e.target.value)}/></Field>}
    </GuideSection>
    </div>
    {error&&<p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
  </Modal>
}
