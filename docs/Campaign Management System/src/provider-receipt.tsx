import { useState } from 'react'
import { useStore, type LogisticsDelivery } from './store'
import { trackedServices } from './delivery-tracking'
import { Button, Field, Input, Table, fmtNum } from './ui'

/** Actual recognized kilos are recorded explicitly, without allocating a truck difference. */
export function ProviderReceiptBreakdown({delivery,onSaved}:{delivery:LogisticsDelivery;onSaved?:()=>void}){
  const s=useStore(),matches=trackedServices(s,delivery),service=matches.length===1?matches[0].service:undefined
  const providers=service?.annotation?.providers||[]
  const [values,setValues]=useState<Record<string,string>>(()=>Object.fromEntries(providers.map(p=>[p.providerId,String(delivery.purchases.find(x=>x.providerId===p.providerId)?.recognizedQuantity??'')]))),[error,setError]=useState('')
  if(providers.length<2)return <p className="mt-5 text-sm text-ink-soft">Esta carga no necesita un desglose entre varios proveedores.</p>
  const total=Object.values(values).reduce((n,v)=>n+(Number(v)||0),0)
  const save=()=>{
    if(!delivery.evaluation.plantWeight||(!(delivery.evaluation.report||delivery.documents.receptionReport)||!delivery.evaluation.result)&&!delivery.driverChecklist?.receipt?.at)return setError('El chofer debe registrar primero el peso en planta en el checklist de recepción.')
    if(providers.some(p=>!values[p.providerId]?.trim()||!Number.isFinite(Number(values[p.providerId]))||Number(values[p.providerId])<=0||Number(values[p.providerId])>(p.kilos||0)+.01))return setError('Indica los kilos reconocidos de cada proveedor, sin superar sus kilos cargados.')
    if(Math.abs(total-delivery.evaluation.plantWeight)>.01)return setError('La suma por proveedor debe coincidir con el peso recibido en planta. No se distribuyen diferencias automáticamente.')
    const purchases=[...delivery.purchases]
    for(const p of providers){const index=purchases.findIndex(x=>x.providerId===p.providerId);if(index>=0)purchases[index]={...purchases[index],recognizedQuantity:Number(values[p.providerId])};else purchases.push({id:crypto.randomUUID(),providerId:p.providerId,reference:delivery.reference,fruit:s.campaigns.find(c=>c.id===delivery.campaignId)?.fruta||'',quantity:p.kilos||0,recognizedQuantity:Number(values[p.providerId]),guide:delivery.documents.fruitGuide,document:delivery.evaluation.report||delivery.documents.receptionReport,reviewStatus:'Verificación registrada',observation:''})}
    s.updateLogisticsDelivery(delivery.id,{purchases});s.toast('Desglose guardado. Liquidación de compra actualizada.');onSaved?.()
  }
  return <section className="mt-6 rounded-2xl border border-line bg-white p-5"><h2 className="font-display text-lg font-semibold">Kilos recibidos por proveedor</h2><p className="mt-2 mb-4 text-sm text-ink-soft">Registra el desglose del reporte de esta carga. Los kilos cargados vienen del chofer; los recibidos se confirman con el soporte de planta.</p><Table head={['Proveedor','Kilos cargados','Kilos recibidos']}>
    {providers.map(p=><tr key={p.providerId}><td className="p-3 text-sm">{s.providers.find(x=>x.id===p.providerId)?.nombres} {s.providers.find(x=>x.id===p.providerId)?.apellidos}</td><td className="p-3 text-sm">{fmtNum(p.kilos||0)} kg</td><td className="p-3"><Field label=""><Input aria-label={`Kilos recibidos de ${p.providerId}`} type="number" min="0" step="0.01" value={values[p.providerId]||''} onChange={e=>setValues({...values,[p.providerId]:e.target.value})}/></Field></td></tr>)}</Table><p className="mt-4 text-sm">Total del desglose: <b>{fmtNum(total)} kg</b> · Peso en planta: <b>{fmtNum(delivery.evaluation.plantWeight)} kg</b></p>{error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}<Button className="mt-4" onClick={save}>Guardar desglose</Button></section>
}
