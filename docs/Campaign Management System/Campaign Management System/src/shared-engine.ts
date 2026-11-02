import { applyChanges, changesBetween, type SharedData, type DataKey, type Snapshot, type ChangeBatch, type Actor } from './shared-protocol'

type SyncStatus={ready:boolean;pending:number;error:string;lastSaved:string;local:boolean;actor?:Actor}
const OUTBOX='agro-cloud-v1:outbox'
const CACHE='agro-cloud-v1:cache'
export class SharedEngine {
  private listeners=new Set<()=>void>()
  private statusListeners=new Set<()=>void>()
  data={} as SharedData
  private serverData={} as SharedData
  private queueKey=''
  private access=typeof window==='undefined'?'':new URLSearchParams(window.location.search).get('access')||''
  private queue:ChangeBatch[]=[]
  private sending=false
  private polling=false
  private etag=''
  private acceptedRevision=0
  private acceptedStorage=''
  private failures=0
  private nextAttempt=0
  private failed(){this.failures++;this.nextAttempt=Date.now()+Math.min(120000,5000*2**Math.min(this.failures,5))}
  private recovered(){this.failures=0;this.nextAttempt=0}
  private timer:ReturnType<typeof setTimeout>|undefined
  private interval:ReturnType<typeof setInterval>|undefined
  status:SyncStatus
  constructor(readonly local=false){
    this.status={ready:local,pending:0,error:'',lastSaved:'',local}

  }
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn)}}
  subscribeStatus=(fn:()=>void)=>{this.statusListeners.add(fn);return()=>{this.statusListeners.delete(fn)}}
  getStatus=()=>this.status
  private emit(){for(const fn of this.listeners)fn()}
  private setStatus(patch:Partial<SyncStatus>){this.status={...this.status,...patch,pending:this.queue.length};for(const fn of this.statusListeners)fn()}
  private persist(){try{localStorage.setItem(this.queueKey,JSON.stringify(this.queue))}catch{this.setStatus({error:'No se pudieron respaldar los cambios pendientes en este navegador.'})}}
  ensure(key:DataKey,initial:any[]){
    if(this.data[key])return
    if(!this.local)throw Error('Los datos compartidos no están disponibles.')
    try{this.data[key]=JSON.parse(localStorage.getItem('agro-demo-v1:'+key)||'null')||initial}catch{this.data[key]=initial}
  }
  update(key:DataKey,action:any){
    const before=this.data[key]
    const computed=typeof action==='function'?action(before):action
    if(computed===before)return
    const next=JSON.parse(JSON.stringify(computed))
    if(before===next||JSON.stringify(before)===JSON.stringify(next))return
    this.data={...this.data,[key]:next}
    if(this.local){try{localStorage.setItem('agro-demo-v1:'+key,JSON.stringify(next))}catch{}this.emit();return}
    const changes=changesBetween(before,next,[key])
    const last=this.queue.at(-1)
    if(last&&(!this.sending||this.queue.length>1))last.changes.push(...changes)
    else this.queue.push({id:crypto.randomUUID(),changes})
    this.persist();this.setStatus({error:''});this.emit()
    clearTimeout(this.timer);this.timer=setTimeout(()=>void this.flush(),650)
  }
  private accept(snapshot:Snapshot){
    const storage=snapshot.storageId||'legacy'
    if(storage===this.acceptedStorage&&snapshot.revision<this.acceptedRevision)return
    this.acceptedStorage=storage;this.acceptedRevision=snapshot.revision
    if(!this.queueKey&&snapshot.actor){
      this.queueKey=OUTBOX+':'+(snapshot.storageId?encodeURIComponent(snapshot.storageId)+':':'')+(snapshot.actor.role==='admin'?'admin':snapshot.actor.transporterId+':'+snapshot.actor.driverId)
      try{this.queue=JSON.parse(localStorage.getItem(this.queueKey)||'[]')}catch{}
    }
    this.queue=this.queue.filter(batch=>!snapshot.applied.includes(batch.id));this.persist()
    const compatible={...snapshot.data,transportRequests:snapshot.data.transportRequests||[]}
    this.serverData=compatible
    let view:SharedData=compatible
    for(const batch of this.queue)view=applyChanges(view,batch.changes,false)
    const next={} as SharedData
    for(const key of Object.keys(view) as DataKey[])next[key]=JSON.stringify(this.data[key])===JSON.stringify(view[key])?(this.data[key]||[]):(view[key]||[])
    this.data=next
    try{localStorage.setItem(snapshot.storageId?CACHE+':'+encodeURIComponent(snapshot.storageId):CACHE,JSON.stringify(snapshot))}catch{}
    this.setStatus({ready:true,lastSaved:snapshot.updatedAt,actor:snapshot.actor});this.emit()
  }
  async poll(){
    if(Date.now()<this.nextAttempt||this.local||this.polling||this.sending||this.queue.length&&this.status.ready)return
    this.polling=true
    try{
      const response=await fetch('/api/shared-state'+(this.access?'?access='+encodeURIComponent(this.access):''),{cache:'no-store',headers:this.etag?{'If-None-Match':this.etag}:{},signal:AbortSignal.timeout(18000)})
      if(response.status===304){this.recovered();this.setStatus({error:''});return}
      const body=await response.json()
      if(!response.ok)throw Error(body.error||'No se pudo cargar la información compartida.')
      if(body.schema!==1||!body.data)throw Error('El servidor respondió con datos inválidos.')
      this.etag=response.headers.get('ETag')||'';if(this.access){const url=new URL(window.location.href);url.searchParams.delete('access');window.history.replaceState(null,'',url.pathname+url.search+url.hash);this.access=''}this.accept(body);this.recovered();this.setStatus({error:''})
    }catch(e){this.failed();this.setStatus({error:e instanceof Error?e.message:'No hay conexión con el servidor.'})}
    finally{this.polling=false;if(this.queue.length&&this.status.ready)void this.flush()}
  }
  async flush(){
    if(Date.now()<this.nextAttempt||this.local||!this.status.ready||this.sending||!this.queue.length)return
    this.sending=true
    const batch=this.queue[0]
    try{
      const response=await fetch('/api/shared-state',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(batch),signal:AbortSignal.timeout(22000)})
      const body=await response.json()
      if(response.status===409){this.queue.shift();this.persist();if(body.snapshot)this.accept(body.snapshot);this.setStatus({error:body.error||'El dato cambió en otro dispositivo. Revisa y vuelve a guardarlo.'});return}
      if(!response.ok)throw Error(body.error||'No se pudo guardar en el servidor.')
      this.queue.shift();this.persist();this.etag=response.headers.get('ETag')||'';this.accept(body);this.recovered();this.setStatus({error:''})
    }catch(e){this.failed();this.setStatus({error:e instanceof Error?e.message:'Los cambios siguen pendientes de enviar.'})}
    finally{this.sending=false;if(this.queue.length){clearTimeout(this.timer);this.timer=setTimeout(()=>void this.flush(),this.status.error?Math.max(5000,this.nextAttempt-Date.now()):1100)}}
  }
  command=async(payload:unknown)=>{
    if(this.local)throw Error('Esta operación requiere la conexión compartida del prototipo.')
    if(this.queue.length){await this.flush();if(this.queue.length)throw Error('Espera a que terminen de guardarse los cambios pendientes y vuelve a confirmar.')}
    if(this.sending)throw Error('Hay otro guardado en curso. Reintenta en unos segundos.')
    this.sending=true
    try{
      const response=await fetch('/api/shared-state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)})
      const body=await response.json()
      if(!response.ok){if(body.snapshot)this.accept(body.snapshot);throw Error(body.error||'No se pudo registrar la operación.')}
      this.etag=response.headers.get('ETag')||'';this.accept(body);this.recovered();this.setStatus({error:''})
      return body as Snapshot
    }finally{this.sending=false;if(this.queue.length)void this.flush()}
  }
  retry=()=>{this.nextAttempt=0;if(this.queue.length&&this.status.ready)void this.flush();else void this.poll()}
  start(){
    if(this.local)return()=>{}
    void this.poll()
    this.interval=setInterval(()=>{if(document.visibilityState==='visible'){if(this.queue.length)void this.flush();else void this.poll()}},5000)
    const resume=()=>this.retry()
    const leaving=(e:BeforeUnloadEvent)=>{if(this.queue.length){e.preventDefault();e.returnValue=''}}
    window.addEventListener('online',resume);window.addEventListener('focus',resume);window.addEventListener('beforeunload',leaving)
    return()=>{clearInterval(this.interval);clearTimeout(this.timer);window.removeEventListener('online',resume);window.removeEventListener('focus',resume);window.removeEventListener('beforeunload',leaving)}
  }
  hasBackup(){try{return Object.keys(localStorage).some(k=>k.startsWith(CACHE)||k.startsWith(OUTBOX))}catch{return false}}
  downloadBackup=()=>{
    try{
      const cached=Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith(CACHE)).map(k=>[k,JSON.parse(localStorage.getItem(k)||'null')]))
      const pending=Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith(OUTBOX)).map(k=>[k,JSON.parse(localStorage.getItem(k)||'[]')]))
      const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),source:'browser-recovery-copy',warning:'Copia local. No reemplaza el archivo original del servidor.',cached,pending},null,2)],{type:'application/json'})
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='agro-respaldo-navegador-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
    }catch{this.setStatus({error:'No se pudo exportar el respaldo. Los datos del navegador se conservan.'})}
  }
  hasLegacy(){try{return Object.keys(localStorage).some(k=>k.startsWith('agro-demo-v1:'))&&!localStorage.getItem('agro-cloud-v1:imported')}catch{return false}}
  importLegacy(){
    // Only merge registered loads/histories and their references, never replace the shared dataset.
    const legacy:Partial<SharedData>={}
    try{for(const key of ['campaignTransporters','qualityOperations','logisticsDeliveries'] as DataKey[])legacy[key]=JSON.parse(localStorage.getItem('agro-demo-v1:'+key)||'[]')}catch{return}
    const relatedOperations=new Set<string>()
    const services=(legacy.campaignTransporters||[]).flatMap(l=>l.services.filter((i:any)=>i.driverDispatch?.length).map((i:any)=>({linkId:l.id,item:i})))
    this.update('campaignTransporters',(links:any[])=>links.map(link=>({...link,services:link.services.map((item:any)=>{
      const old=services.find((x:any)=>x.linkId===link.id&&x.item.id===item.id)?.item
      if(!old)return item
      const recent=item.driverDispatch?.at(-1)?.date||'';const prior=old.driverDispatch.at(-1).date
      if(prior<=recent)return item
      relatedOperations.add(old.operationId)
      return {...item,...old}
    }).concat(services.filter((x:any)=>x.linkId===link.id&&!link.services.some((i:any)=>i.id===x.item.id)).map((x:any)=>{relatedOperations.add(x.item.operationId);return x.item}))})))
    this.update('qualityOperations',(rows:any[])=>rows.concat((legacy.qualityOperations||[]).filter(x=>relatedOperations.has(x.id)&&!rows.some(r=>r.id===x.id))))
    this.update('logisticsDeliveries',(rows:any[])=>rows.concat((legacy.logisticsDeliveries||[]).filter(x=>relatedOperations.has(x.sourceOperationId)&&!rows.some(r=>r.id===x.id))))
    try{localStorage.setItem('agro-cloud-v1:imported','1')}catch{}
  }
}
