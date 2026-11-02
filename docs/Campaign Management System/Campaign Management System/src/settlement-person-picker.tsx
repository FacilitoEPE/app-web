import { useState } from 'react'
import { useStore, type SettlementPerson } from './store'
import { Button, Field, Input, Select, Modal } from './ui'

export function SettlementPersonPicker({providerId,value,onChange,disabled=false}:{providerId:string;value:string;onChange:(id:string)=>void;disabled?:boolean}){
  const s=useStore(),p=s.providers.find(p=>p.id===providerId)
  const [adding,setAdding]=useState(false),[error,setError]=useState('')
  const [form,setForm]=useState({nombres:'',apellidos:'',tipoDocumento:'DNI',dni:'',vinculo:''})
  const set=(k:keyof typeof form,v:string)=>setForm({...form,[k]:v})
  if(!p)return null
  const save=()=>{
    if(!form.nombres.trim()||!form.apellidos.trim()||!form.vinculo.trim())return setError('Completa nombres, apellidos y vínculo.')
    const dni=form.dni.trim().toUpperCase()
    if(!(form.tipoDocumento==='DNI'?/^\d{8}$/:/^[A-Z0-9]{6,15}$/).test(dni))return setError('Indica un documento válido: DNI de 8 dígitos u otro documento de 6 a 15 caracteres.')
    if([p,...(p.settlementPeople||[])].some(x=>x.tipoDocumento===form.tipoDocumento&&x.dni?.replace(/[\s-]/g,'').toUpperCase()===dni))return setError('Esta persona ya está vinculada. Selecciónala en la lista.')
    const person:SettlementPerson={...form,nombres:form.nombres.trim(),apellidos:form.apellidos.trim(),vinculo:form.vinculo.trim(),dni,id:crypto.randomUUID()}
    s.updateProvider(p.id,{settlementPeople:[...(p.settlementPeople||[]),person]})
    onChange(person.id);setAdding(false);setForm({nombres:'',apellidos:'',tipoDocumento:'DNI',dni:'',vinculo:''});setError('')
  }
  return <section className="mt-5 rounded-xl border border-line p-4">
    <div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><Field label="Persona de esta liquidación"><Select aria-label="Persona de esta liquidación" value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}><option value="">{p.nombres} {p.apellidos} · Principal</option>{(p.settlementPeople||[]).map(person=><option key={person.id} value={person.id}>{person.nombres} {person.apellidos} · {person.vinculo}</option>)}</Select></Field></div>{!disabled&&<Button variant="outline" onClick={()=>setAdding(true)}>+ Agregar persona</Button>}</div>
    <p className="mt-2 text-xs text-ink-soft">Proveedor principal: {p.nombres} {p.apellidos}. Sus cargas, kilos y acuerdos se mantienen. Cada documento conserva su acumulado anual, sin reiniciar los anteriores.</p>
    <p className="mt-1 text-xs text-ink-soft">La persona seleccionada debe corresponder a quien realiza la venta. Vincularla no transfiere las ventas anteriores.</p>
    {adding&&<Modal open title="Agregar persona vinculada" onClose={()=>setAdding(false)} footer={<><Button variant="outline" onClick={()=>setAdding(false)}>Cancelar</Button><Button onClick={save}>Guardar persona</Button></>}><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombres"><Input value={form.nombres} onChange={e=>set('nombres',e.target.value)}/></Field><Field label="Apellidos"><Input value={form.apellidos} onChange={e=>set('apellidos',e.target.value)}/></Field><Field label="Tipo de documento"><Select value={form.tipoDocumento} onChange={e=>set('tipoDocumento',e.target.value)}>{['DNI','Carné de extranjería','Pasaporte'].map(t=><option key={t}>{t}</option>)}</Select></Field><Field label="Número de documento"><Input value={form.dni} onChange={e=>set('dni',e.target.value)} maxLength={15}/></Field><Field label="Vínculo con el proveedor"><Input value={form.vinculo} placeholder="Ej. Familiar" onChange={e=>set('vinculo',e.target.value)}/></Field></div>{error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}</Modal>}
  </section>
}
