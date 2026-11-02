import { advanceApplied, loadCashPaid, transportAdvanceState } from './transport-advances'
import { ApplyTransportAdvanceModal } from './transport-advance-ui'
import { useState } from 'react'
import { useStore } from './store'
import { useSharedCommand } from './shared-provider'
import { money, paidTotal, settlementTotal, limaDate } from './finance-model'
import { Button, Field, Input, Select, Modal, FileDrop, TextArea } from './ui'

const amount=(n:number,c:string)=>`${c==='PEN'?'S/':c} ${n.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}`
export function SettlementPaymentModal({fixedId,transport,onClose}:{fixedId?:string;transport?:boolean;onClose:()=>void}){
 const s=useStore(),command=useSharedCommand(),[commandId]=useState(()=>crypto.randomUUID())
 const [apply,setApply]=useState(false)
 const [id,setId]=useState(fixedId||''),[date,setDate]=useState(limaDate()),[value,setValue]=useState<string|null>(null),[method,setMethod]=useState('Efectivo'),[reference,setReference]=useState(''),[evidence,setEvidence]=useState(''),[notes,setNotes]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const doc=s.settlements.find(d=>d.id===id),paid=doc?paidTotal(s.financialMovements,'Pago',doc.id):0,total=doc?settlementTotal(doc):0,balance=money(total-paid),pay=value===null?balance:Number(value)
 const link=s.campaignTransporters.find(l=>l.id===doc?.transportLinkId),operation=s.qualityOperations.find(o=>o.id===doc?.operationId),provider=s.providers.find(p=>p.id===(doc?.providerId||operation?.providerId))
 const party=link?s.transporters.find(t=>t.id===link.transporterId)?.empresa:provider?`${provider.nombres} ${provider.apellidos}`:''
 const save=async()=>{
  if(!doc)return setError('Selecciona una liquidación pendiente.')
  if(!Number.isFinite(pay)||pay<=0||money(pay)>balance)return setError('Indica un importe mayor a cero que no supere el saldo.')
  if(method!=='Efectivo'&&(!reference.trim()||!evidence))return setError('Completa la referencia y el comprobante del pago.')
  setBusy(true);setError('')
  try{await command({action:'record-settlement-payment',id:commandId,documentId:id,date,amount:pay,method,reference,evidence,notes});s.toast('Pago registrado. Saldo actualizado.');onClose()}catch(e){setError(e instanceof Error?e.message:'No se pudo registrar el pago.')}finally{setBusy(false)}
 }
 return <Modal open wide title={link?'Registrar pago al transportista':'Registrar pago al proveedor'} onClose={onClose} footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button disabled={busy||!doc||balance<=0} onClick={save}>{busy?'Guardando…':'Confirmar pago'}</Button></>}>
  <p className="mb-4 text-sm text-ink-soft">Paso 2 · Registra un pago total o un abono sobre la liquidación. La liquidación conserva sus datos.</p>
  {!fixedId&&<Field label="Liquidación pendiente"><Select value={id} onChange={e=>{setId(e.target.value);setValue(null)}}><option value="">Seleccionar liquidación</option>{s.settlements.filter(d=>(!d.transportLinkId||d.transportServiceId)&&(transport===undefined||!!d.transportLinkId===transport)&&settlementTotal(d)>paidTotal(s.financialMovements,'Pago',d.id)).map(d=><option key={d.id} value={d.id}>{d.number} · {amount(money(settlementTotal(d)-paidTotal(s.financialMovements,'Pago',d.id)),d.currency)}</option>)}</Select></Field>}
  {doc&&<><section className="mb-5 rounded-2xl bg-canvas p-4"><h3 className="font-semibold">{party}</h3><p className="mt-1 text-sm text-ink-soft">Liquidación {doc.number}</p><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{(link?[['Total',total],['Adelanto aplicado',advanceApplied(s,doc.id)],['Pagos posteriores',loadCashPaid(s,doc.id)],['Saldo pendiente',balance]]:[['Total',total],['Pagado',paid],['Saldo pendiente',balance]]).map(([label,n])=><div key={String(label)}><p className="text-xs text-ink-soft">{label}</p><p className="mt-1 font-semibold">{amount(Number(n),doc.currency)}</p></div>)}</div></section>
  {link&&transportAdvanceState(s,link.id).available>0&&balance>0&&<div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-leaf-50 p-3"><p className="text-sm">Adelanto disponible: {amount(transportAdvanceState(s,link.id).available,doc.currency)}</p><Button variant="outline" onClick={()=>setApply(true)}>Aplicar antes de pagar</Button></div>}
  <div className="grid gap-4 sm:grid-cols-2"><Field label="Fecha del pago"><Input type="date" min={doc.date} value={date} onChange={e=>setDate(e.target.value)}/></Field><Field label={`Monto a pagar (${doc.currency==='PEN'?'S/':doc.currency})`}><Input aria-label="Monto a pagar" type="number" min="0.01" max={balance} step="0.01" value={value===null?balance:value} onChange={e=>setValue(e.target.value)}/><p className="mt-1 text-xs text-ink-soft">Se propone el saldo completo. Puedes registrar un abono.</p></Field><Field label="Medio de pago"><Select value={method} onChange={e=>setMethod(e.target.value)}>{['Efectivo','Transferencia','Depósito','Otro'].map(m=><option key={m}>{m}</option>)}</Select></Field>{method!=='Efectivo'&&<><Field label="Referencia de operación"><Input value={reference} onChange={e=>setReference(e.target.value)}/></Field><div className="sm:col-span-2"><FileDrop label={evidence||'Adjuntar comprobante del pago'} onFile={name=>setEvidence(name||'')}/></div></>}</div>
  <details className="mt-4 rounded-xl border border-line p-3"><summary className="cursor-pointer text-sm">Observaciones opcionales</summary><TextArea className="mt-3" value={notes} onChange={e=>setNotes(e.target.value)}/></details><div className="mt-5 rounded-xl bg-leaf-50 p-4"><p className="text-sm">Saldo después del pago</p><b className="mt-1 block text-xl">{amount(Math.max(0,money(balance-(Number.isFinite(pay)?pay:0))),doc.currency)}</b></div></>}
  {apply&&doc&&<ApplyTransportAdvanceModal documentId={doc.id} onClose={()=>{setApply(false);setValue(null)}}/>}
  {error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
 </Modal>
}
