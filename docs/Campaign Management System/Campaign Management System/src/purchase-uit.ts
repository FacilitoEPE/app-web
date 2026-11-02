import type { SharedData } from './shared-protocol.js'
import type { PurchaseSettlement } from './finance-model.js'
import { money } from './finance-model.js'

export const UIT_COUNT=75
export const UIT_VALUES:Record<number,number>={2025:5350,2026:5500}
export const UIT_WARNING_RATIO=.9 // Internal early warning, not a separate statutory threshold.
export const UIT_RULE_SOURCE='https://www.sunat.gob.pe/legislacion/comprob/regla/capituloII.pdf'
export const UIT_VALUE_SOURCE='https://www.gob.pe/institucion/mef/normas-legales/7540449-301-2025-ef'
const positive=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>0
export const validYear=(date:string)=>{try{return /^\d{4}-\d{2}-\d{2}$/.test(date)&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date?Number(date.slice(0,4)):0}catch{return 0}}

export function settlementProvider(s:SharedData,doc:PurchaseSettlement):string{
  if(doc.transportLinkId)return ''
  if(doc.providerId)return s.providers.some(p=>p.id===doc.providerId)?doc.providerId:''
  const services=s.campaignTransporters.flatMap(l=>l.services).filter(i=>i.operationId===doc.operationId)
  const ids=new Set<string>(services.flatMap(i=>i.annotation?.providers?.map((p:any)=>p.providerId)|| (i.providerId?[i.providerId]:[])))
  if(ids.size===1)return [...ids][0]
  if(ids.size>1)return '' // Do not attribute the whole shared truck to the operation's primary provider.
  const operation=s.qualityOperations.find(o=>o.id===doc.operationId)
  return s.providers.some(p=>p.id===operation?.providerId)?operation.providerId:''
}
export const personIdentity=(person:any,fallback:string)=>{
  const number=person?.dni?.replace(/[\s-]/g,'').toUpperCase()
  return number&&person?.tipoDocumento?`${person.tipoDocumento.trim().toUpperCase()}:${number}`:`id:${fallback}`
}
export function selectedSettlementPerson(s:SharedData,providerId:string,personId?:string){
  const provider=s.providers.find(p=>p.id===providerId)
  return personId?provider?.settlementPeople?.find((p:any)=>p.id===personId):provider
}
export function settlementIdentity(s:SharedData,doc:PurchaseSettlement){
  const id=settlementProvider(s,doc)
  return id?personIdentity(doc.settlementPerson||selectedSettlementPerson(s,id,doc.settlementPersonId),doc.settlementPersonId||id):''
}
export function linkedPeopleIssue(s:SharedData,before:SharedData):string{
  for(const provider of s.providers){
    const people=provider.settlementPeople||[]
    if(!Array.isArray(people))return 'Las personas vinculadas no tienen un formato válido.'
    const ids=new Set<string>(),docs=new Set<string>([providerIdentity(s,provider.id)])
    for(const person of people){
      const key=personIdentity(person,person?.id)
      if(!person||typeof person.id!=='string'||!person.id||ids.has(person.id)||!person.nombres?.trim()||!person.apellidos?.trim()||!person.vinculo?.trim()||!['DNI','Carné de extranjería','Pasaporte'].includes(person.tipoDocumento)||!(person.tipoDocumento==='DNI'?/^[0-9]{8}$/:/^[A-Za-z0-9]{6,15}$/).test(person.dni||'')||docs.has(key))return 'Completa los datos de la persona vinculada con un documento válido y sin duplicados.'
      ids.add(person.id);docs.add(key)
    }
  }
  for(const provider of before.providers){
    if(before.settlements.some(d=>!d.transportLinkId&&settlementProvider(before,d)===provider.id&&!d.settlementPersonId)){
      const next=s.providers.find(p=>p.id===provider.id)
      if(!next||personIdentity(provider,provider.id)!==personIdentity(next,provider.id))return 'Conserva el documento del proveedor principal con liquidaciones registradas.'
    }
  }
  for(const old of before.settlements.filter(d=>!d.transportLinkId)){
    const next=s.settlements.find(d=>d.id===old.id)
    if(next&&(old.settlementPersonId!==next.settlementPersonId||JSON.stringify(old.settlementPerson)!==JSON.stringify(next.settlementPerson)))return 'Conserva la persona y documento de la liquidación registrada.'
    if(old.settlementPersonId){
      const a=selectedSettlementPerson(before,old.providerId,old.settlementPersonId),b=selectedSettlementPerson(s,old.providerId,old.settlementPersonId)
      if(JSON.stringify(a)!==JSON.stringify(b))return 'Conserva los datos de la persona vinculada que ya tiene liquidaciones.'
    }
  }
  return ''
}
export function providerIdentity(s:SharedData,id:string):string{
  return personIdentity(s.providers.find(p=>p.id===id),id)
}
export function exchangeRate(s:SharedData,doc:PurchaseSettlement):number|undefined{
  if(doc.currency==='PEN')return 1
  if(positive(doc.exchangeRateToPen))return doc.exchangeRateToPen
  const id=settlementProvider(s,doc),key=providerIdentity(s,id)
  const record=s.providers.filter(p=>providerIdentity(s,p.id)===key).flatMap(p=>p.uitConversions||[]).find(c=>c.settlementId===doc.id)
  return positive(record?.rate)?record.rate:undefined
}
/** Internal gross purchase value, before payment advances and operating-cost deductions. */
export const purchaseValue=(doc:PurchaseSettlement)=>money(doc.kilos*doc.price)
export type UitSummary={providerId:string;year:number;uit:number;limit:number;total:number;remaining:number;ratio:number;missingRates:PurchaseSettlement[];unknown:PurchaseSettlement[];documents:PurchaseSettlement[];status:'Dentro del límite'|'Cerca del límite'|'Límite alcanzado'|'Límite superado'|'Acumulado incompleto'|'UIT sin configurar'}
export function providerUit(s:SharedData,providerId:string,year:number,excludeId?:string,personId?:string):UitSummary{
  const identity=personIdentity(selectedSettlementPerson(s,providerId,personId),personId||providerId)
  const annual=s.settlements.filter(d=>!d.transportLinkId&&d.id!==excludeId&&validYear(d.date)===year)
  const unknown=annual.filter(d=>!settlementProvider(s,d))
  const documents=annual.filter(d=>{const id=settlementProvider(s,d);return !!id&&settlementIdentity(s,d)===identity})
  const missingRates=documents.filter(d=>exchangeRate(s,d)===undefined)
  const total=money(documents.reduce((sum,d)=>sum+money(purchaseValue(d)*(exchangeRate(s,d)||0)),0))
  const uit=UIT_VALUES[year]||0,limit=money(UIT_COUNT*uit),ratio=limit?total/limit:0
  const status:UitSummary['status']=!uit?'UIT sin configurar':total>limit?'Límite superado':total===limit?'Límite alcanzado':missingRates.length||unknown.length?'Acumulado incompleto':ratio>=UIT_WARNING_RATIO?'Cerca del límite':'Dentro del límite'
  return {providerId,year,uit,limit,total,remaining:money(Math.max(0,limit-total)),ratio,missingRates,unknown,documents,status}
}
export function projectUit(s:SharedData,doc:PurchaseSettlement){
  const providerId=settlementProvider(s,doc),summary=providerUit(s,providerId,validYear(doc.date),doc.id,doc.settlementPersonId)
  const rate=exchangeRate(s,doc),value=rate===undefined?undefined:money(purchaseValue(doc)*rate)
  const projected=value===undefined?undefined:money(summary.total+value)
  return {...summary,value,projected,requiresAcknowledgment:!!summary.limit&&projected!==undefined&&projected>=summary.limit}
}
export function uitIssue(s:SharedData,doc:PurchaseSettlement){
  if(doc.transportLinkId)return ''
  if(doc.settlementPersonId){
    const person=selectedSettlementPerson(s,doc.providerId||'',doc.settlementPersonId)
    if(!person)return 'La persona seleccionada no está vinculada al proveedor de la carga.'
    if(!doc.settlementPerson||personIdentity(person,'')!==personIdentity(doc.settlementPerson,'')||person.nombres!==doc.settlementPerson.nombres||person.apellidos!==doc.settlementPerson.apellidos)return 'El documento de la persona no coincide con la liquidación.'
  }
  if(doc.settlementPerson&&!doc.settlementPersonId&&personIdentity(doc.settlementPerson,'')!==providerIdentity(s,doc.providerId||''))return 'El documento debe coincidir con el proveedor principal.'
  if(!validYear(doc.date))return 'Indica una fecha válida para el control anual de UIT.'
  if(!UIT_VALUES[validYear(doc.date)])return 'El valor de UIT de ese año no está configurado. No se aplicará el valor de otro año.'
  if(doc.currency!=='PEN'&&(!positive(doc.exchangeRateToPen)||!doc.exchangeRateSource?.trim()))return 'Registra el tipo de cambio a soles y su referencia para controlar el límite de UIT.'
  const projection=projectUit(s,doc)
  if(projection.requiresAcknowledgment&&!doc.uitLimitAcknowledged)return 'El acumulado alcanza o supera 75 UIT. Revisa el aviso y confirma que lo has visto antes de guardar.'
  return ''
}
