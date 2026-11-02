import { useEffect, useState } from 'react'
import { saleSources, purchaseSources } from './finance-flow'
import { type PendingNavigation, pendingTask } from './finance-navigation'
import { useStore } from './store'
import { CommercialContractModal, LogisticsReceptionTab } from './modules'
import { FinancialDocumentView } from './finance'
import { ProviderReceiptBreakdown } from './provider-receipt'
import { CargoGuides } from './cargo'
import { LoadRegistrationModal } from './load-registration'
import { Button, Field, Input, Select, PageHeader } from './ui'

export function FinancePendingDestination({target,onBack}:{target:PendingNavigation;onBack:()=>void}){
  const s=useStore(),x=target.source
  const current=(target.kind==='Cobro'?saleSources(s):purchaseSources(s)).find(row=>row.key===x.key)
  const resolved=!!current&&!current.reasons.some(reason=>pendingTask(reason,target.kind)===target.task)
  useEffect(()=>{if(resolved&&target.task!=='legacy')onBack()},[resolved,target.task,onBack])
  const delivery=s.logisticsDeliveries.find(d=>d.id===x.deliveryId),operation=s.qualityOperations.find(o=>o.id===x.operationId)
  const link=s.campaignTransporters.find(l=>l.services.some(i=>i.id===x.transportServiceId)),service=link?.services.find(i=>i.id===x.transportServiceId)
  const title=target.task==='purchase-price'?'Gestión de campaña · Precio del proveedor':target.task==='sale-price'?'Gestión comercial · Contrato':target.task==='guide'?'Cosecha y control de calidad · Guía de la carga':target.task==='load'?'Cosecha y control de calidad · Datos de carga':target.task==='legacy'?'Liquidaciones · Documento anterior':'Logística y despacho · '+(target.task==='link'?'Vincular carga':'Recepción y calidad')
  const doc=(target.kind==='Cobro'?s.invoices:s.settlements).find(d=>x.documentIds.includes(d.id))
  return <div><Button variant="ghost" className="mb-4 px-0" onClick={onBack}>← Volver a liquidación de {target.kind==='Cobro'?'venta':'compra'}</Button><PageHeader title={title} subtitle={`${x.party} · ${s.campaigns.find(c=>c.id===x.campaignId)?.nombre||''} · ${x.reference}`}/><div className="mb-5 rounded-xl border border-line bg-leaf-50 p-4 text-sm"><b>{target.reason}</b><p className="mt-1 text-ink-soft">Estás completando el registro de origen de esta carga. Al guardar volverás a la liquidación con los datos actualizados.</p></div>
    {target.task==='purchase-price'?<ProviderPrice target={target} onSaved={onBack}/>:target.task==='sale-price'&&x.requirementId?<CommercialContractModal requirementId={x.requirementId} contractId={x.contractId||undefined} asPage onClose={onBack}/>:target.task==='breakdown'&&delivery?<ProviderReceiptBreakdown delivery={delivery} onSaved={onBack}/>:target.task==='receipt'&&delivery&&operation?<LogisticsReceptionTab delivery={delivery} source={operation} onSaved={onBack}/>:target.task==='guide'&&link&&service?<CargoGuides linkId={link.id} id={service.id} onBack={onBack} backLabel="← Volver a liquidación"/>:target.task==='load'&&operation?<LoadRegistrationModal operationId={operation.id} campaignId={x.campaignId} route={operation.route} initialSource={delivery?.sourceDelivery||service?.sourceDelivery||operation.sourceDelivery} linkId={link?.id} item={service} onClose={onBack}/>:target.task==='legacy'&&doc?<FinancialDocumentView kind={target.kind} document={doc} onClose={onBack}/>:delivery?<SourceLink deliveryId={delivery.id} onSaved={onBack}/>:<p className="rounded-xl bg-white p-5 text-sm">No se encontró el registro de origen de esta carga. Regresa a la liquidación para actualizar la información.</p>}
  </div>
}

function ProviderPrice({target,onSaved}:{target:PendingNavigation;onSaved:()=>void}){
  const s=useStore(),x=target.source
  const rows=s.campaignProviders.filter(p=>p.campaignId===x.campaignId&&p.providerId===x.providerId&&(!x.fincaIds.length||(!p.fincaId&&!p.fincaIds?.length)||x.fincaIds.includes(p.fincaId||'')||p.fincaIds?.some(id=>x.fincaIds.includes(id))))
  const [id,setId]=useState(rows[0]?.id||''),[price,setPrice]=useState(String(rows[0]?.precio??'')),[error,setError]=useState('')
  const save=()=>{if(!rows.some(p=>p.id===id)||!Number.isFinite(Number(price))||Number(price)<=0)return setError('Selecciona una participación e indica un precio de compra mayor que cero.');s.updateCampaignProvider(id,{precio:Number(price),moneda:'PEN'});s.toast('Precio de compra guardado. Liquidación actualizada.');onSaved()}
  return <div className="max-w-2xl rounded-2xl border border-line bg-white p-5"><h2 className="mb-4 text-lg font-semibold">Precio de compra de {x.party}</h2>{!rows.length?<p className="text-sm">Esta finca no tiene una participación vinculada en la campaña. Completa primero la participación del proveedor en Gestión de campaña.</p>:<><Field label="Participación / finca"><Select aria-label="Participación del proveedor" value={id} onChange={e=>{const p=rows.find(p=>p.id===e.target.value)!;setId(p.id);setPrice(String(p.precio??''))}}>{rows.map(p=><option key={p.id} value={p.id}>{s.providers.find(v=>v.id===p.providerId)?.fincas?.find(f=>f.id===p.fincaId)?.nombre||p.finca||'Participación en campaña'} · {p.variedad}</option>)}</Select></Field><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Precio de compra por kg"><Input aria-label="Precio de compra por kg" type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></Field><Field label="Moneda"><Input aria-label="Moneda de compra" readOnly value="Soles (PEN)"/></Field></div>{error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}<Button className="mt-5" onClick={save}>Guardar precio y volver</Button></>}</div>
}

function SourceLink({deliveryId,onSaved}:{deliveryId:string;onSaved:()=>void}){
  const s=useStore(),d=s.logisticsDeliveries.find(d=>d.id===deliveryId)!
  const choices=s.campaignTransporters.filter(l=>l.campaignId===d.campaignId).flatMap(l=>l.services).filter(i=>{const r=s.requirements.find(r=>r.id===i.sourceDelivery?.requirementId);return !!r&&r.clientId===d.clientId&&r.contratos?.some(c=>c.id===i.sourceDelivery?.contractId&&c.entregas.some(e=>e.id===i.sourceDelivery?.deliveryId))})
  const [id,setId]=useState(choices.some(i=>i.id===d.transportServiceId)?d.transportServiceId||'':''),[error,setError]=useState('')
  return <div className="max-w-2xl rounded-2xl border border-line bg-white p-5"><Field label="Carga y entrega del mismo cliente y campaña"><Select aria-label="Carga a vincular" value={id} onChange={e=>setId(e.target.value)}><option value="">Seleccionar carga</option>{choices.map(i=><option key={i.id} value={i.id}>{i.id} · {i.start} · {i.annotation?.kilos||0} kg</option>)}</Select></Field>{error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}<Button className="mt-5" onClick={()=>{const service=choices.find(i=>i.id===id);if(!service?.sourceDelivery||!service.operationId)return setError('Selecciona una carga con contrato, entrega y operación identificados.');if(s.logisticsDeliveries.some(x=>x.id!==d.id&&x.transportServiceId===id))return setError('Esta carga ya tiene otra entrega logística vinculada.');s.updateLogisticsDelivery(d.id,{transportServiceId:id,sourceDelivery:service.sourceDelivery,sourceOperationId:service.operationId});s.toast('Vínculo guardado. Liquidación actualizada.');onSaved()}}>Guardar vínculo y volver</Button></div>
}
