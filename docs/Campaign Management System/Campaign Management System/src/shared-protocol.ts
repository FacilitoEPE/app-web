export const DATA_KEYS = ['campaigns','providers','exams','campaignProviders','interviews','certifications','requirements','qualityOperations','exportMtdRecords','logisticsDeliveries','clients','transporters','campaignTransporters','invoices','settlements','financialMovements','payments','transportRequests'] as const
export type DataKey = typeof DATA_KEYS[number]
export type SharedData = Record<Exclude<DataKey, 'transportRequests'>, any[]> & { transportRequests?: any[] }
export type PathPart = string | { by:'id'|'stage'; key:string }
export type Change = { path:PathPart[]; had:boolean; has:boolean; before?:any; after?:any }
export type ChangeBatch = { id:string; changes:Change[] }
export type Actor = {role:'admin'} | {role:'driver';transporterId:string;driverId:string}
export type Snapshot = { storageId?:string; schema:1; revision:number; updatedAt:string; data:SharedData; applied:string[]; actor?:Actor }
const equal = (a:any,b:any) => JSON.stringify(a) === JSON.stringify(b)
const own = (o:any,key:string) => Object.prototype.hasOwnProperty.call(o,key)
const object = (x:any) => x!==null && typeof x==='object' && !Array.isArray(x)
const safe = (key:string) => !['__proto__','prototype','constructor'].includes(key)

/** Changes are field-level and use record IDs, so another device's unrelated edit survives. */
export function changesBetween(before:any,after:any,path:PathPart[]=[]):Change[] {
  if(equal(before,after))return []
  if(Array.isArray(before)&&Array.isArray(after)){
    const key:'id'|'stage'=path.at(-1)==='driverDispatch'?'stage':'id'
    const both=[...before,...after]
    if(both.length&&both.every(x=>object(x)&&typeof x[key]==='string')){
      const prior=new Map(before.map(x=>[x[key],x]));const next=new Map(after.map(x=>[x[key],x]));const changes:Change[]=[]
      for(const id of new Set([...prior.keys(),...next.keys()])){
        const p=[...path,{by:key,key:id} as PathPart]
        if(!prior.has(id))changes.push({path:p,had:false,has:true,after:next.get(id)})
        else if(!next.has(id))changes.push({path:p,had:true,has:false,before:prior.get(id)})
        else changes.push(...changesBetween(prior.get(id),next.get(id),p))
      }
      return changes
    }
  }
  if(object(before)&&object(after)){
    const changes:Change[]=[]
    for(const key of new Set([...Object.keys(before),...Object.keys(after)])){
      if(!safe(key))throw Error('Campo no permitido.')
      const p=[...path,key]
      if(!own(before,key))changes.push({path:p,had:false,has:true,after:after[key]})
      else if(!own(after,key))changes.push({path:p,had:true,has:false,before:before[key]})
      else changes.push(...changesBetween(before[key],after[key],p))
    }
    return changes
  }
  return [{path,had:true,has:true,before,after}]
}

export class DataConflict extends Error { constructor(){super('Otro dispositivo modificó este dato. Revisa la información actualizada antes de volver a guardarlo.')} }

export function applyChanges(data:SharedData,changes:Change[],check=true):SharedData {
  const result=structuredClone(data)
  if(!result.transportRequests && changes.some(c=>c.path[0]==='transportRequests'))result.transportRequests=[]
  for(const change of changes){
    if(!Array.isArray(change.path)||change.path.length<2||change.path.length>24||!DATA_KEYS.includes(change.path[0] as DataKey))throw Error('Cambio no permitido.')
    let parent:any=result
    for(let i=0;i<change.path.length;i++){
      const part=change.path[i];const last=i===change.path.length-1
      if(typeof part==='string'&&!safe(part))throw Error('Campo no permitido.')
      if(typeof part!=='string'&&(!part||!['id','stage'].includes(part.by)||typeof part.key!=='string'||part.key.length>250))throw Error('Identificador inválido.')
      const index=typeof part==='string'?part:Array.isArray(parent)?parent.findIndex((x:any)=>x?.[part.by]===part.key):-1
      const exists=typeof part==='string'?parent!=null&&own(parent,part):Number(index)>=0
      if(!last){if(!exists){if(check)throw new DataConflict();parent=null;break}parent=parent[index];continue}
      if(parent==null){if(check)throw new DataConflict();break}
      const current=exists?parent[index]:undefined
      if(exists===change.has&&(!exists||equal(current,change.after)))continue
      if(check&&(exists!==change.had||(exists&&!equal(current,change.before))))throw new DataConflict()
      if(typeof part==='string'){
        if(change.has)parent[part]=structuredClone(change.after);else delete parent[part]
      }else if(change.has){
        if(!object(change.after)||change.after[part.by]!==part.key)throw Error('Registro inválido.')
        if(exists)parent[index]=structuredClone(change.after);else parent.push(structuredClone(change.after))
      }else if(exists)parent.splice(Number(index),1)
    }
  }
  return result
}

export function validData(data:SharedData){
  for(const key of DATA_KEYS){
    if(key==='transportRequests' && data[key]===undefined)continue
    if(!Array.isArray(data[key])||data[key].length>15000)throw Error('Colección inválida.')
    const ids=new Set()
    for(const item of data[key]){if(!object(item)||typeof item.id!=='string'||ids.has(item.id))throw Error('Identificador repetido o inválido.');ids.add(item.id)}
  }
}
