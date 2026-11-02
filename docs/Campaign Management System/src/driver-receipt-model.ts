import type { CampaignTransportService, LogisticsDelivery } from './store'
export type DriverChecklistStep='receipt'|'discard'|'crates'|'exitGuide'
export type DriverChecklistData={exitGuide?:{at:string;driverId:string};receipt?:{at:string;driverId:string};discard?:{at:string;driverId:string};crates?:{at:string;driverId:string;notApplicable?:boolean}}
export type DriverReceiptInput={plantWeight?:string;result?:string;report?:string;observations?:string;hasDiscard?:string;quantity?:string;reason?:string;evidence?:string;initial?:string;returned?:string;returnDate?:string;coordination?:string;notApplicable?:boolean}
const number=(v:unknown)=>v!==''&&v!==undefined&&v!==null&&Number.isFinite(Number(v))?Number(v):NaN
export const loadedCrates=(service:CampaignTransportService)=>service.annotation?.packages.filter(p=>p.type==='Jabas').reduce((n,p)=>n+p.loaded+p.empty,0)||0
export const discardPercentage=(d:Pick<LogisticsDelivery,'discard'|'evaluation'>)=>d.discard.unit==='kg'&&number(d.discard.quantity)>=0&&d.evaluation.originWeight>0?Number(d.discard.quantity)/d.evaluation.originWeight*100:null
export function receiptStepIssue(step:DriverChecklistStep,d:LogisticsDelivery,service:CampaignTransportService):string {
 if(step==='exitGuide'&&!d.documents.signedExitGuide.trim())return 'Selecciona el documento de guía de salida del vehículo.'
 if(step==='receipt'){
  if(!Number.isFinite(d.evaluation.plantWeight)||d.evaluation.plantWeight<=0||d.evaluation.plantWeight>(service.annotation?.kilos||d.evaluation.originWeight))return 'Registra un peso en planta mayor que cero y no mayor al peso cargado.'
 }
 if(step==='discard'){
  if(receiptStepIssue('receipt',d,service))return 'Completa primero la recepción.'
  const q=number(d.discard.quantity)
  if(d.discard.unit!=='kg'||!Number.isFinite(q)||q<0||q>d.evaluation.plantWeight)return 'El descarte debe estar entre cero y el peso en planta, en kg.'
  if(q>0&&!d.discard.evidence.trim())return 'Adjunta la evidencia del descarte.'
 }
 if(step==='crates'){
  if(d.driverChecklist?.crates?.notApplicable){if(loadedCrates(service)>0)return 'Esta carga sí lleva jabas; registra su devolución.';return ''}
  const initial=number(d.crates.initial),returned=number(d.crates.returned)
  if(!Number.isInteger(initial)||!Number.isInteger(returned)||initial<0||returned<0||returned>initial)return 'Registra cantidades enteras de jabas; la devolución no puede superar las entregadas.'
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d.crates.returnDate)||!d.crates.evidence.trim())return 'Completa la fecha y la constancia de devolución.'
  if(returned<initial&&!d.crates.coordination.trim())return 'Indica qué ocurrió con las jabas pendientes.'
 }
 return ''
}
export function driverChecklistRows(d:LogisticsDelivery|undefined,service:CampaignTransportService){return (['receipt','discard'] as const).map(step=>({step,label:{receipt:'Recepción en planta',discard:'Descarte informado'}[step],done:!!d?.driverChecklist?.[step]&&!receiptStepIssue(step,d,service)}))}
export function driverChecklistIssue(d:LogisticsDelivery|undefined,service:CampaignTransportService){const missing=driverChecklistRows(d,service).find(r=>!r.done);return missing?`Completa el checklist antes de cerrar: ${missing.label.toLowerCase()}.`:''}
export function driverReceiptPatch(d:LogisticsDelivery,service:CampaignTransportService,step:DriverChecklistStep,input:DriverReceiptInput,driverId:string,at=new Date().toISOString()):Partial<LogisticsDelivery>{
 const patch:Partial<LogisticsDelivery>={driverChecklist:{...d.driverChecklist,[step]:{at,driverId,...(step==='crates'?{notApplicable:!!input.notApplicable}:{})}}}
 if(step==='receipt')patch.evaluation={...d.evaluation,originWeight:service.annotation?.kilos||d.evaluation.originWeight,plantWeight:number(input.plantWeight)}
 if(step==='discard'){if(!['yes','no'].includes(input.hasDiscard||''))throw Error('Indica si hubo descarte.');patch.discard={quantity:input.hasDiscard==='no'?'0':String(number(input.quantity)),unit:'kg',reason:input.hasDiscard==='no'?'Sin descarte':d.discard.reason,evidence:input.hasDiscard==='no'?'':input.evidence?.trim()||''}}
 if(step==='crates')patch.crates={...d.crates,initial:input.notApplicable?'0':input.initial||'',returned:input.notApplicable?'0':input.returned||'',returnDate:input.notApplicable?'':input.returnDate||'',evidence:input.notApplicable?'':input.evidence?.trim()||'',coordination:input.notApplicable?'No aplica: carga sin jabas':input.coordination?.trim()||''}
 if(step==='exitGuide')patch.documents={...d.documents,signedExitGuide:input.evidence?.trim()||''}
 const next={...d,...patch};const issue=receiptStepIssue(step,next,service);if(issue)throw Error(issue)
 if(step==='receipt'&&d.driverChecklist?.discard&&receiptStepIssue('discard',next,service))throw Error('El peso en planta no puede ser menor al descarte registrado. Revisa primero el descarte.')
 patch.documents={...d.documents,...(step==='exitGuide'?{signedExitGuide:input.evidence?.trim()||''}:step==='receipt'?{}:step==='discard'?{discardEvidence:next.discard.evidence}:{crateReturn:next.crates.evidence})}
 return patch
}
