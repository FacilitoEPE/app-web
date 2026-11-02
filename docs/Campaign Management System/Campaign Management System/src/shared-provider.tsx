import { createContext, useContext, useEffect, useState, useSyncExternalStore, useCallback, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import { SharedEngine } from './shared-engine'
import type { DataKey } from './shared-protocol'

const Context=createContext<SharedEngine|null>(null)
export function SharedDataProvider({children}:{children:ReactNode}){
  const [engine]=useState(()=>new SharedEngine(import.meta.env.DEV))
  const status=useSyncExternalStore(engine.subscribeStatus,engine.getStatus)
  useEffect(()=>engine.start(),[engine])
  if(!status.ready)return <div className="flex min-h-dvh items-center justify-center bg-canvas p-6"><div className="max-w-sm rounded-3xl border border-line bg-white p-7"><p className="text-xs font-bold tracking-widest text-leaf">AGRO EXPORTACIONES</p><h1 className="mt-4 font-display text-2xl font-semibold">{status.error?'No se pudo conectar':'Cargando información compartida'}</h1><p className="mt-3 text-sm text-ink-soft">{status.error||'Consultando campañas y cargas guardadas en el servidor.'}</p>{status.error&&<><button className="mt-5 min-h-12 w-full rounded-xl bg-forest px-4 text-sm font-semibold text-white" onClick={engine.retry}>Reintentar conexión</button>{engine.hasBackup()&&<button className="mt-3 min-h-11 w-full text-sm font-semibold text-forest underline" onClick={engine.downloadBackup}>Descargar respaldo de este navegador</button>}</>}</div></div>
  return <Context.Provider value={engine}>{children}<div role="status" aria-live="polite" className={`fixed bottom-3 left-3 z-[80] max-w-[calc(100vw-1.5rem)] rounded-xl border px-3 py-2 text-xs shadow-sm ${status.error?'border-clay bg-mango-50 text-ink':status.pending?'border-line bg-white text-forest':'border-line bg-white/95 text-ink-soft'}`}>
    {status.local?'Modo local':status.error?<><span>{status.pending?'Cambios pendientes. ':''}{status.error}</span><button className="ml-2 underline" onClick={engine.retry}>Reintentar</button></>:status.pending?'Guardando en el servidor…':'✓ Datos compartidos sincronizados'}
  </div></Context.Provider>
}

export function useSharedState<T>(key:string,initial:T):[T,Dispatch<SetStateAction<T>>]{
  const engine=useContext(Context)
  if(!engine)throw Error('El estado compartido requiere SharedDataProvider.')
  engine.ensure(key as DataKey,initial as any[])
  const get=useCallback(()=>engine.data[key as DataKey] as T,[engine,key])
  const value=useSyncExternalStore(engine.subscribe,get)
  const setter=useCallback((action:SetStateAction<T>)=>engine.update(key as DataKey,action),[engine,key])
  return [value,setter]
}

export function useSharedActor(){
  const engine=useContext(Context)
  if(!engine)throw Error('El acceso requiere SharedDataProvider.')
  return useSyncExternalStore(engine.subscribeStatus,engine.getStatus).actor
}

export function DriverAccessLink({transporterId,driverId}:{transporterId:string;driverId:string}){
  const actor=useSharedActor()
  const [url,setUrl]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false)
  if(actor?.role!=='admin')return null
  const generate=async()=>{setBusy(true);setError('');try{const response=await fetch('/api/shared-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({transporterId,driverId})});const body=await response.json();if(!response.ok)throw Error(body.error);setUrl(body.url)}catch(e){setError(e instanceof Error?e.message:'No se pudo generar el acceso.')}finally{setBusy(false)}}
  return <div className="mt-4 rounded-xl bg-canvas p-3 text-sm"><button className="min-h-11 font-semibold text-forest underline" disabled={busy} onClick={generate}>{busy?'Generando…':'Generar enlace privado para este chofer'}</button>{url&&<><p className="mb-2 text-xs text-ink-soft">Envía este enlace al celular del chofer. Es personal y no pide contraseña.</p><input readOnly aria-label="Enlace privado del chofer" className="w-full rounded-lg border border-line bg-white p-2 text-xs" value={url}/><button className="mt-2 min-h-11 font-semibold text-forest" onClick={()=>void navigator.clipboard.writeText(url).then(()=>setError('Enlace copiado.'),()=>setError('Selecciona y copia el enlace del campo.'))}>Copiar enlace</button></>}{error&&<p className="mt-2 text-xs">{error}</p>}</div>
}

export function LegacyDataImport(){
  const engine=useContext(Context)
  const [visible,setVisible]=useState(()=>engine&&!engine.local&&engine.hasLegacy())
  if(!visible||!engine||engine.status.actor?.role!=='admin')return null
  return <div className="mt-5 rounded-xl border border-line bg-white p-4 text-sm"><p>Hay registros anteriores guardados en este navegador. Puedes compartir las cargas y estados del chofer con los demás dispositivos.</p><button className="mt-3 min-h-11 font-semibold text-forest underline" onClick={()=>{engine.importLegacy();setVisible(false)}}>Compartir mis registros anteriores</button></div>
}

export function useSharedCommand(){
  const engine=useContext(Context)
  if(!engine)throw Error('Esta operación requiere el estado compartido.')
  return engine.command
}
