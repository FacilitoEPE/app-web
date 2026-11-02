import { useId, useState } from 'react'
import districts from './data/ubigeos-peru.json'
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
const entries=districts.map(d=>({...d,label:`${d.code} · ${d.district} · ${d.province} · ${d.department}`,search:normalize(`${d.code} ${d.district} ${d.province} ${d.department}`)}))
export function UbigeoPicker({value,onChange}:{value:string;onChange:(code:string)=>void}) {
 const [open,setOpen]=useState(false),[query,setQuery]=useState('');const id=useId()
 const selected=entries.find(d=>d.code===value)
 const words=normalize(query).trim().split(/\s+/).filter(Boolean)
 const matches=entries.filter(d=>words.every(w=>d.search.includes(w)))
 return <div className="relative" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false)}}>
  <button type="button" aria-expanded={open} aria-controls={id} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-left text-sm" onClick={()=>{setOpen(!open);setQuery('')}}>{selected?.label||value||'Seleccionar ubigeo…'} ▾</button>
  {open&&<div className="absolute z-40 mt-1 w-full min-w-64 rounded-lg border border-line bg-surface p-2 shadow-lg">
   <input autoFocus aria-label="Buscar ubigeo por código, distrito, provincia o departamento" className="mb-2 w-full rounded border border-line px-2 py-2 text-sm" placeholder="Código, distrito, provincia o departamento…" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setOpen(false)}}/>
   <div id={id} className="max-h-56 overflow-y-auto"><button type="button" className="block w-full p-2 text-left text-sm text-ink-soft" onClick={()=>{onChange('');setOpen(false)}}>Sin seleccionar</button>{matches.slice(0,80).map(d=><button type="button" key={d.code} className="block w-full rounded p-2 text-left text-sm hover:bg-canvas focus:bg-canvas" onClick={()=>{onChange(d.code);setOpen(false)}}>{d.label}</button>)}{!matches.length&&<p className="p-2 text-sm">No se encontraron ubigeos.</p>}</div>
   {matches.length>80&&<p className="mt-2 text-xs text-ink-soft">Mostrando 80 de {matches.length}. Escribe para afinar la búsqueda.</p>}
  </div>}
 </div>
}
