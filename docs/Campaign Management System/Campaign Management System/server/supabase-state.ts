import type { Snapshot } from '../src/shared-protocol.js'
import { validData } from '../src/shared-protocol.js'

export const usesSupabase=()=>process.env.SHARED_STORAGE==='supabase'
export class SupabaseConflict extends Error {}
const etag=(revision:number)=>`"supabase-${revision}"`
function config(){
 const url=process.env.SUPABASE_URL?.replace(/\/$/,'')
 const key=process.env.SUPABASE_ANON_KEY
 const accessToken=process.env.SUPABASE_PROTOTYPE_TOKEN
 if(!url||!key||!accessToken)throw Error('Falta configurar la conexión de Supabase en el servidor.')
 if(new URL(url).protocol!=='https:')throw Error('La URL de Supabase debe usar HTTPS.')
 return {url,key,accessToken}
}
async function request(path:string,init:RequestInit={}){
 const {url,key,accessToken}=config()
 const response=await fetch(url+'/rest/v1/'+path,{...init,method:'POST',body:JSON.stringify({...JSON.parse(String(init.body||'{}')),access_token:accessToken}),cache:'no-store',headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:'Bearer '+key}:{}),'Content-Type':'application/json',...init.headers},signal:AbortSignal.timeout(15000)})
 if(!response.ok)throw Error(`No se pudo consultar Supabase (HTTP ${response.status}). Revisa la conexión y la migración del prototipo.`)
 return response.json()
}
function validate(snapshot:Snapshot){
 if(snapshot.schema!==1||!Number.isSafeInteger(snapshot.revision)||snapshot.revision<1||!Array.isArray(snapshot.applied))throw Error('El registro de Supabase tiene un formato inválido.')
 validData(snapshot.data)
}
export async function readSupabase(match?:string):Promise<{snapshot:Snapshot|null;etag:string}>{
 if(match){
  const row=await request('rpc/agro_read_prototype_state',{body:JSON.stringify({metadata_only:true})})
  if(!row)throw Error('Falta cargar la data sintética del prototipo en Supabase.')
  if(match===etag(Number(row.revision)))return {snapshot:null,etag:match}
 }
 const row=await request('rpc/agro_read_prototype_state',{body:JSON.stringify({metadata_only:false})})
 if(!row)throw Error('Falta cargar la data sintética del prototipo en Supabase.')
 const snapshot=row.snapshot as Snapshot;validate(snapshot)
 if(snapshot.revision!==Number(row.revision))throw Error('La revisión de Supabase no coincide con el registro guardado.')
 return {snapshot,etag:etag(snapshot.revision)}
}
export async function writeSupabase(snapshot:Snapshot,expectedEtag:string){
 validate(snapshot)
 const expected=Number(/^"supabase-(\d+)"$/.exec(expectedEtag)?.[1])
 if(!Number.isSafeInteger(expected)||snapshot.revision!==expected+1)throw Error('La revisión de escritura no es válida.')
 const revision=await request('rpc/agro_save_prototype_state',{method:'POST',body:JSON.stringify({expected_revision:expected,next_snapshot:snapshot})})
 if(revision===null)throw new SupabaseConflict('Otro dispositivo acaba de guardar; reintentar sobre la última revisión.')
 if(Number(revision)!==snapshot.revision)throw Error('Supabase no confirmó la revisión guardada.')
 return {etag:etag(snapshot.revision)}
}

export const prototypeRpc=(name:string,args:Record<string,unknown>)=>request("rpc/"+name,{body:JSON.stringify(args)})
