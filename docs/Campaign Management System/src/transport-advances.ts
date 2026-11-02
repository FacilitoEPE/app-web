import { freightUsage } from './transport-freight.js'
import type { SharedData } from './shared-protocol.js'
import { money, paidTotal, settlementTotal, type FinancialMovement } from './finance-model.js'

type Data=Pick<SharedData,'campaignTransporters'|'settlements'|'financialMovements'|'requirements'>
const text=(v:unknown)=>typeof v==='string'?v.trim():''
export const advanceApplied=(s:Data,documentId:string)=>money(s.financialMovements.filter(m=>m.kind==='Pago'&&m.documentId===documentId&&m.advanceSourceId).reduce((n,m)=>n+m.amount,0))
export const loadCashPaid=(s:Data,documentId:string)=>money(s.financialMovements.filter(m=>m.kind==='Pago'&&m.documentId===documentId&&!m.advanceSourceId).reduce((n,m)=>n+m.amount,0))

function legacyAdvancePayments(s:Data,linkId:string){
 return s.financialMovements.filter(m=>m.kind==='Pago'&&!m.advanceSourceId&&!m.transportAdvanceLinkId&&s.settlements.some(d=>d.id===m.documentId&&d.transportLinkId===linkId&&!d.transportServiceId&&d.currency==='PEN'))
}
export function transportAdvanceState(s:Data,linkId:string){
 const link=s.campaignTransporters.find(l=>l.id===linkId),a=link?.paymentAgreement
 const planned=a?.type==='Adelanto'&&a.currency==='PEN'?money(a.advance):0
 if(planned<=0)return {planned:0,confirmed:0,applied:0,available:0,pendingToRecord:0,sources:[] as {id:string;date:string;reference:string;amount:number;applied:number;available:number}[]}
 const payments=[...legacyAdvancePayments(s,linkId),...s.financialMovements.filter(m=>m.kind==='Pago'&&m.transportAdvanceLinkId===linkId&&!m.advanceSourceId)].sort((x,y)=>x.date.localeCompare(y.date)||x.id.localeCompare(y.id))
 let remaining=planned
 const sources=payments.map(m=>{const amount=money(Math.max(0,Math.min(m.amount,remaining)));remaining=money(remaining-amount);const applied=money(s.financialMovements.filter(x=>x.kind==='Pago'&&x.advanceSourceId===m.id).reduce((n,x)=>n+x.amount,0));return {id:m.id,date:m.date,reference:m.reference,amount,applied,available:money(amount-applied)}}).filter(x=>x.amount>0)
 const confirmed=money(sources.reduce((n,x)=>n+x.amount,0)),applied=money(sources.reduce((n,x)=>n+x.applied,0))
 return {planned,confirmed,applied,available:money(Math.max(0,confirmed-applied)),pendingToRecord:money(Math.max(0,planned-confirmed)),sources}
}
export function transportCompanyBalance(s:Data,linkId:string){
 const link=s.campaignTransporters.find(l=>l.id===linkId)
 const links=s.campaignTransporters.filter(l=>l.campaignId===link?.campaignId&&l.transporterId===link?.transporterId&&l.paymentAgreement?.currency===link?.paymentAgreement?.currency)
 const ids=new Set(links.map(l=>l.id)),docs=s.settlements.filter(d=>ids.has(d.transportLinkId)),loads=docs.filter(d=>d.transportServiceId)
 const contracted=money(links.reduce((n,l)=>n+(l.paymentAgreement?.total||0),0)),expenses=money(loads.reduce((n,d)=>n+(d.additions||0),0)),liquidated=money(loads.reduce((n,d)=>n+settlementTotal(d),0))
 const cashPaid=money(s.financialMovements.filter(m=>m.kind==='Pago'&&!m.advanceSourceId&&(ids.has(m.transportAdvanceLinkId)||docs.some(d=>d.id===m.documentId))).reduce((n,m)=>n+m.amount,0))
 const pendingLoads=money(loads.reduce((n,d)=>n+Math.max(0,settlementTotal(d)-paidTotal(s.financialMovements,'Pago',d.id)),0))
 const availableAdvance=money(links.reduce((n,l)=>n+transportAdvanceState(s,l.id).available,0))
 // Only per-load freight consumes the service agreement. Advances and cash payments
 // cover that freight; subtracting them here would count the same service twice.
 const liquidatedFreight=money(loads.reduce((n,d)=>n+d.kilos*d.price,0))
 const authorizedFreight=money(links.reduce((n,l)=>n+Math.max(l.paymentAgreement?.total||0,freightUsage(s,l.id).assigned),0))
 const freightOverage=money(authorizedFreight-contracted)
 const pendingLiquidation=money(Math.max(0,authorizedFreight-liquidatedFreight))
 // The net amount still to liquidate excludes advance money already delivered
 // and still unallocated. An explicit application reduces availableAdvance,
 // preventing the same advance from being deducted twice.
 const netPendingLiquidation=money(Math.max(0,pendingLiquidation-availableAdvance))
 return {contracted,authorizedFreight,freightOverage,expenses,liquidated,liquidatedFreight,pendingLiquidation,netPendingLiquidation,cashPaid,pendingLoads,availableAdvance,balance:money(authorizedFreight+expenses-cashPaid)}
}
const validId=(id:unknown)=>typeof id==='string'&&id.length>0&&id.length<=100&&/^[a-zA-Z0-9-]+$/.test(id)
export type ApplyTransportAdvanceCommand={action:'apply-transport-advance';id:string;documentId:string;amount:number;date:string}
export function applyTransportAdvance(s:SharedData,c:ApplyTransportAdvanceCommand):SharedData{
 if(!validId(c.id))throw Error('Solicitud de aplicación no válida.')
 const doc=s.settlements.find(d=>d.id===c.documentId)
 if(!doc?.transportLinkId||!doc.transportServiceId||doc.currency!=='PEN')throw Error('Selecciona una liquidación de transporte por carga en soles.')
 const state=transportAdvanceState(s,doc.transportLinkId),balance=money(settlementTotal(doc)-paidTotal(s.financialMovements,'Pago',doc.id)),amount=money(c.amount)
 if(!Number.isFinite(amount)||amount<=0||amount>state.available||amount>balance)throw Error('El adelanto a aplicar supera el disponible o el saldo de esta carga.')
 if(!/^\d{4}-\d{2}-\d{2}$/.test(c.date)||!Number.isFinite(Date.parse(c.date)))throw Error('Revisa la fecha de aplicación.')
 let remaining=amount
 const applications:FinancialMovement[]=[]
 for(const source of state.sources){
  const part=money(Math.min(remaining,Math.max(0,source.available)));if(part<=0)continue
  applications.push({id:'advance-application-'+c.id+'-'+source.id,kind:'Pago',documentId:doc.id,amount:part,date:[c.date,doc.date,source.date].sort().at(-1)!,method:'Aplicación de adelanto',reference:'APLICACION-'+c.id+'-'+source.id,evidence:'Aplicación del adelanto registrado '+source.reference,notes:'Aplicación a esta carga; no representa un nuevo desembolso.',advanceSourceId:source.id})
  remaining=money(remaining-part);if(!remaining)break
 }
 if(remaining)throw Error('El disponible cambió. Revisa el adelanto antes de continuar.')
 return {...s,financialMovements:[...s.financialMovements,...applications]}
}
export type RecordTransportAdvanceCommand={action:'record-transport-advance';id:string;transportLinkId:string;amount:number;date:string;method:string;reference?:string;evidence?:string}
export function recordTransportAdvance(s:SharedData,c:RecordTransportAdvanceCommand):SharedData{
 if(!validId(c.id))throw Error('Solicitud de adelanto no válida.')
 const link=s.campaignTransporters.find(l=>l.id===c.transportLinkId),state=transportAdvanceState(s,c.transportLinkId),amount=money(c.amount)
 if(!link||link.paymentAgreement?.type!=='Adelanto'||link.paymentAgreement.currency!=='PEN')throw Error('Selecciona un acuerdo con adelanto en soles.')
 if(!Number.isFinite(amount)||amount<=0||amount>state.pendingToRecord||amount>transportCompanyBalance(s,link.id).balance)throw Error('El monto supera el adelanto acordado pendiente de registrar o el saldo de la empresa.')
 if(!/^\d{4}-\d{2}-\d{2}$/.test(c.date)||!Number.isFinite(Date.parse(c.date))||!['Efectivo','Transferencia','Depósito','Otro'].includes(c.method))throw Error('Revisa la fecha y el medio del adelanto.')
 const cash=c.method==='Efectivo',reference=text(c.reference)||(cash?'ADELANTO-'+c.id:'')
 if(!reference||(!cash&&!text(c.evidence)))throw Error('Registra la referencia y el comprobante del adelanto.')
 if(s.financialMovements.some(m=>m.kind==='Pago'&&m.transportAdvanceLinkId===link.id&&m.reference.toLowerCase()===reference.toLowerCase()))throw Error('Este adelanto ya fue registrado.')
 const movement:FinancialMovement={id:'transport-advance-'+c.id,kind:'Pago',documentId:'advance:'+link.id,transportAdvanceLinkId:link.id,date:c.date,amount,method:c.method,reference,evidence:text(c.evidence)||(cash?'Adelanto en efectivo registrado':''),notes:'Adelanto de la empresa para esta campaña, disponible para distribuir por carga.'}
 return {...s,financialMovements:[...s.financialMovements,movement]}
}
export function transportAdvanceIssue(s:SharedData,prior?:SharedData){
 const totals=new Map<string,number>()
 for(const m of s.financialMovements){
  if(m.transportAdvanceLinkId){
   if([...legacyAdvancePayments(s,m.transportAdvanceLinkId),...s.financialMovements.filter(x=>x.transportAdvanceLinkId===m.transportAdvanceLinkId)].some(x=>x.id!==m.id&&x.reference?.toLowerCase()===m.reference?.toLowerCase()))return 'La referencia de este adelanto ya fue registrada.'
   const link=s.campaignTransporters.find(l=>l.id===m.transportAdvanceLinkId)
   if(m.advanceSourceId||m.kind!=='Pago'||m.documentId!=='advance:'+link?.id||link?.paymentAgreement?.type!=='Adelanto'||link.paymentAgreement.currency!=='PEN'||!Number.isFinite(m.amount)||m.amount<=0||!m.reference?.trim()||!m.evidence||!['Efectivo','Transferencia','Depósito','Otro'].includes(m.method)||!/^\d{4}-\d{2}-\d{2}$/.test(m.date)||!Number.isFinite(Date.parse(m.date)))return 'Registro de adelanto inválido.'
  }
  if(!m.advanceSourceId)continue
  const doc=s.settlements.find(d=>d.id===m.documentId),linkId=doc?.transportLinkId
  const source=linkId&&transportAdvanceState(s,linkId).sources.find(x=>x.id===m.advanceSourceId)
  if(!doc?.transportServiceId||doc.currency!=='PEN'||!source||m.kind!=='Pago'||m.method!=='Aplicación de adelanto'||!Number.isFinite(m.amount)||m.amount<=0||money(m.amount)!==m.amount||m.date<doc.date||m.date<source.date||!m.reference?.trim()||!m.evidence)return 'La aplicación debe corresponder a un adelanto registrado de la misma empresa y campaña.'
  const total=money((totals.get(source.id)||0)+m.amount);totals.set(source.id,total)
  if(total>source.amount)return 'Este adelanto ya se aplicó a otra carga. Revisa el saldo disponible.'
 }
 for(const link of s.campaignTransporters){
  const state=transportAdvanceState(s,link.id),direct=s.financialMovements.filter(m=>m.transportAdvanceLinkId===link.id&&!m.advanceSourceId).reduce((n,m)=>n+m.amount,0)
  const legacy=Math.min(state.planned,legacyAdvancePayments(s,link.id).reduce((n,m)=>n+m.amount,0))
  if(money(direct+legacy)>state.planned)return 'Los adelantos registrados superan lo acordado para esta campaña.'
  const newCash=s.financialMovements.some(m=>m.kind==='Pago'&&!m.advanceSourceId&&!prior?.financialMovements.some(p=>p.id===m.id)&&(m.transportAdvanceLinkId===link.id||s.settlements.some(d=>d.id===m.documentId&&d.transportLinkId===link.id)))
  if(newCash&&transportCompanyBalance(s,link.id).balance<-.001)return 'Los pagos superan el saldo de la empresa en esta campaña. Aplica el adelanto disponible antes de pagar.'
 }
 return ''
}
