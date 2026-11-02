import { useState } from 'react'
import { useStore } from './store'
import { freightUsage, loadFreight } from './transport-freight'
import { Button, Field, Input, TextArea, Modal } from './ui'

export function FreightAssignmentModal({linkId,serviceId,onClose}:{linkId:string;serviceId:string;onClose:()=>void}){
 const s=useStore(),link=s.campaignTransporters.find(l=>l.id===linkId)!,service=link.services.find(x=>x.id===serviceId)!,company=s.transporters.find(t=>t.id===link.transporterId)
 const current=loadFreight(s,linkId,serviceId)
 const [value,setValue]=useState(current===undefined?'':String(current)),[error,setError]=useState('')
 const [observation,setObservation]=useState(service.freightObservation||'')
 const locked=s.settlements.some(d=>d.transportLinkId===linkId&&d.transportServiceId===serviceId)
 const available=freightUsage(s,linkId).available+(current||0)
 return <Modal open title="Asignar flete de la carga" onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Cerrar</Button>{!locked&&<Button onClick={()=>{const issue=s.assignTransportFreight(linkId,serviceId,Number(value),observation);if(issue)setError(issue);else{s.toast('Flete asignado a la carga');onClose()}}}>Guardar flete</Button>}</>}>
  <p className="font-semibold">{company?.empresa} · {company?.vehiculos.find(v=>v.id===service.vehicleId)?.placa}</p><p className="mt-1 mb-4 text-sm text-ink-soft">{company?.choferes.find(d=>d.id===service.driverId)?.nombre} · {s.campaigns.find(c=>c.id===link.campaignId)?.nombre}</p>
  <p className="mb-4 rounded-xl bg-canvas p-4 text-sm">Disponible del acuerdo para esta carga: S/ {Math.max(0,available).toFixed(2)}. Los viáticos y los gastos reales se registran aparte.</p>
  <Field label="Flete asignado a esta carga (S/)"><Input aria-label="Flete asignado a esta carga" type="number" min="0.01" step="0.01" readOnly={locked} value={value} onChange={e=>setValue(e.target.value)}/></Field>
  <div className="mt-4"><Field label={Number(value)>available?'Observación por exceso del acuerdo · Obligatoria':'Observación del flete · Opcional'}><TextArea readOnly={locked} value={observation} onChange={e=>setObservation(e.target.value)} placeholder="Justifica cualquier monto que exceda el acuerdo de la campaña."/></Field></div>
  {Number(value)>available&&<p className="mt-2 text-sm text-amber-700">La suma de fletes supera el acuerdo en S/ {(Number(value)-available).toFixed(2)}. Se conservará la observación junto con el monto.</p>}
  {locked&&<p className="mt-3 text-sm text-ink-soft">Esta carga ya fue liquidada. El flete se conserva para consulta.</p>}{error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
 </Modal>
}
