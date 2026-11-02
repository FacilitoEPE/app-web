import { useState } from 'react'
import { useStore } from './store'
import { useSharedCommand } from './shared-provider'
import { advanceApplied, loadCashPaid, transportAdvanceState, transportCompanyBalance } from './transport-advances'
import { money, paidTotal, settlementTotal, limaDate } from './finance-model'
import { Button, Field, Input, Select, Modal, FileDrop, fmtDate } from './ui'

const sol=(n:number)=>`S/ ${n.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}`
export function TransportCompanyBalanceCard({linkId}:{linkId:string}){
 const s=useStore(),b=transportCompanyBalance(s,linkId),a=transportAdvanceState(s,linkId),link=s.campaignTransporters.find(l=>l.id===linkId)
 const [open,setOpen]=useState(false)
 return <section className="mb-4 rounded-xl border border-line p-4"><h3 className="text-sm font-semibold">Liquidación de la empresa · {s.campaigns.find(c=>c.id===link?.campaignId)?.nombre}</h3>
 <div className="mt-3 grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-ink-soft">Saldo neto por liquidar</p><b className="mt-1 block text-xl text-forest">{sol(b.netPendingLiquidation)}</b></div><div><p className="text-xs text-ink-soft">Flete ya liquidado</p><b className="mt-1 block text-xl">{sol(b.liquidatedFreight)}</b></div></div>
 <p className="mt-3 text-xs text-ink-soft">{sol(b.authorizedFreight)} de flete autorizado{b.freightOverage>0&&<> (incluye {sol(b.freightOverage)} de exceso con observación)</>} − {sol(b.availableAdvance)} de adelanto entregado sin aplicar − {sol(b.liquidatedFreight)} de flete liquidado. El adelanto ya está descontado de este saldo. Liquidar no registra un pago ni aplica el adelanto a la carga. Los gastos reales se suman aparte.</p>
 <details className="mt-4 border-t border-line pt-3"><summary className="cursor-pointer text-xs font-medium text-forest">Ver saldo por pagar y adelantos</summary><div className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><p className="text-xs text-ink-soft">Saldo por pagar a la empresa</p><b className="mt-1 block">{sol(b.balance)}</b></div>{a.planned>0&&<div><p className="text-xs text-ink-soft">Adelanto registrado sin aplicar</p><b className="mt-1 block">{sol(b.availableAdvance)}</b></div>}{[['Gastos reales liquidados',b.expenses],['Dinero pagado a la empresa',b.cashPaid],['Saldo de cargas ya liquidadas',b.pendingLoads]].map(([label,n])=><p key={String(label)}>{label}: <b>{sol(Number(n))}</b></p>)}</div><p className="mt-2 text-xs text-ink-soft">El saldo por pagar incluye el flete aún no liquidado y disminuye con los pagos. El adelanto se descuenta una sola vez; aplicarlo a una carga no genera un nuevo desembolso.</p>{a.planned>0&&<p className="mt-2 text-xs text-ink-soft">Adelanto registrado: {sol(a.confirmed)} · Aplicado: {sol(a.applied)} · Pendiente de registrar: {sol(a.pendingToRecord)}</p>}</details>
 {a.pendingToRecord>0&&<Button variant="outline" className="mt-3" onClick={()=>setOpen(true)}>Registrar adelanto entregado</Button>}
 {open&&<TransportAdvancePaymentModal linkId={linkId} onClose={()=>setOpen(false)}/>}
 </section>
}
export function ApplyTransportAdvanceModal({documentId,onClose}:{documentId:string;onClose:()=>void}){
 const s=useStore(),command=useSharedCommand(),doc=s.settlements.find(d=>d.id===documentId)!,state=transportAdvanceState(s,doc.transportLinkId!),total=settlementTotal(doc),covered=paidTotal(s.financialMovements,'Pago',doc.id),balance=money(total-covered),maximum=money(Math.max(0,Math.min(balance,state.available)))
 const [id]=useState(()=>crypto.randomUUID()),[value,setValue]=useState(String(maximum)),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const save=async()=>{
  const amount=Number(value);if(!Number.isFinite(amount)||amount<=0||amount>maximum)return setError('Indica un monto mayor a cero que no supere el disponible ni el saldo de la carga.')
  setBusy(true);setError('')
  try{await command({action:'apply-transport-advance',id,documentId,amount,date:limaDate()});s.toast('Adelanto aplicado. Saldo de la carga actualizado.');onClose()}catch(e){setError(e instanceof Error?e.message:'No se pudo aplicar el adelanto.')}finally{setBusy(false)}
 }
 return <Modal open title="Aplicar adelanto a esta carga" onClose={onClose} footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button disabled={busy||maximum<=0} onClick={save}>{busy?'Guardando…':'Aplicar adelanto'}</Button></>}>
 <p className="mb-4 text-sm text-ink-soft">Liquidación {doc.number} · Se utiliza dinero ya entregado a la empresa.</p><div className="mb-4 grid grid-cols-2 gap-3 rounded-xl bg-canvas p-4"><div><p className="text-xs text-ink-soft">Saldo de esta carga</p><b>{sol(balance)}</b></div><div><p className="text-xs text-ink-soft">Adelanto disponible</p><b>{sol(state.available)}</b></div></div>
 <Field label="Adelanto a aplicar (S/)"><Input aria-label="Adelanto a aplicar" type="number" min="0.01" max={maximum} step="0.01" value={value} onChange={e=>setValue(e.target.value)}/></Field><p className="mt-4 rounded-xl bg-leaf-50 p-4 text-sm">Saldo por pagar después de aplicar: <b>{sol(Math.max(0,money(balance-(Number(value)||0))))}</b></p>
 <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-forest">Origen del adelanto</summary>{state.sources.filter(x=>x.available>0).map(x=><p key={x.id} className="mt-2 text-xs text-ink-soft">{fmtDate(x.date)} · {x.reference} · Disponible: {sol(x.available)}</p>)}</details><p className="mt-3 text-xs text-ink-soft">Esta aplicación queda vinculada al adelanto original y no registra un nuevo pago.</p>{error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
 </Modal>
}
function TransportAdvancePaymentModal({linkId,onClose}:{linkId:string;onClose:()=>void}){
 const s=useStore(),command=useSharedCommand(),state=transportAdvanceState(s,linkId),balance=transportCompanyBalance(s,linkId)
 const [id]=useState(()=>crypto.randomUUID()),[value,setValue]=useState(String(Math.min(state.pendingToRecord,balance.balance))),[date,setDate]=useState(limaDate()),[method,setMethod]=useState('Efectivo'),[reference,setReference]=useState(''),[evidence,setEvidence]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const save=async()=>{
  setBusy(true);setError('')
  try{await command({action:'record-transport-advance',id,transportLinkId:linkId,amount:Number(value),date,method,reference,evidence});s.toast('Adelanto registrado para esta empresa y campaña.');onClose()}catch(e){setError(e instanceof Error?e.message:'No se pudo registrar el adelanto.')}finally{setBusy(false)}
 }
 return <Modal open title="Registrar adelanto entregado" onClose={onClose} footer={<><Button variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button disabled={busy} onClick={save}>{busy?'Guardando…':'Registrar adelanto'}</Button></>}><p className="mb-4 text-sm text-ink-soft">Registra únicamente el dinero entregado a la empresa. El monto acordado aún pendiente de registrar es {sol(state.pendingToRecord)}.</p><div className="grid gap-4 sm:grid-cols-2"><Field label="Monto del adelanto (S/)"><Input type="number" min="0.01" step="0.01" max={state.pendingToRecord} value={value} onChange={e=>setValue(e.target.value)}/></Field><Field label="Fecha del adelanto"><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field><Field label="Medio de pago"><Select value={method} onChange={e=>setMethod(e.target.value)}>{['Efectivo','Transferencia','Depósito','Otro'].map(m=><option key={m}>{m}</option>)}</Select></Field>{method!=='Efectivo'&&<><Field label="Referencia de operación"><Input value={reference} onChange={e=>setReference(e.target.value)}/></Field><FileDrop label={evidence||'Comprobante del adelanto'} onFile={name=>setEvidence(name||'')}/></>}</div>{error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}</Modal>
}
export function TransportLoadAmounts({documentId}:{documentId:string}){
 const s=useStore(),doc=s.settlements.find(d=>d.id===documentId)!
 return <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">{[['Total liquidado',settlementTotal(doc)],['Adelanto aplicado',advanceApplied(s,doc.id)],['Pagos posteriores',loadCashPaid(s,doc.id)],['Saldo por pagar',money(settlementTotal(doc)-paidTotal(s.financialMovements,'Pago',doc.id))]].map(([label,n])=><div key={String(label)}><p className="text-xs text-ink-soft">{label}</p><b className="mt-1 block">{sol(Number(n))}</b></div>)}</div>
}
