import type { LiquidationSource } from './finance-flow'
export type PendingTask='purchase-price'|'sale-price'|'receipt'|'breakdown'|'guide'|'load'|'link'|'legacy'
export type PendingNavigation={kind:'Cobro'|'Pago';source:LiquidationSource;task:PendingTask;reason:string}
export function pendingTask(reason:string,kind:'Cobro'|'Pago'):PendingTask{
  if(reason.includes('anterior'))return 'legacy'
  if(reason.includes('precio'))return kind==='Cobro'?'sale-price':'purchase-price'
  if(reason.includes('desglose'))return 'breakdown'
  if(reason.includes('recepción')||reason.includes('peso'))return 'receipt'
  if(reason.includes('guía'))return 'guide'
  if(reason.includes('carga identificada')||reason.includes('kilos del proveedor'))return 'load'
  if(reason.includes('anterior'))return 'legacy'
  return 'link'
}
export function pendingNavigation(source:LiquidationSource,kind:'Cobro'|'Pago',specific?:string):PendingNavigation{
  // Complete actionable missing data before reviewing ambiguous historical documents.
  const reason=specific||(kind==='Cobro'&&(!source.requirementId||!source.contractId)?source.reasons.find(r=>r.includes('vínculo')):undefined)||source.reasons.find(r=>r.includes('precio'))||source.reasons.find(r=>r.includes('recepción'))||source.reasons.find(r=>r.includes('desglose'))||source.reasons[0]||''
  return {kind,source,task:pendingTask(reason,kind),reason}
}
export const pendingModule=(target:PendingNavigation)=>target.task==='purchase-price'?'campanas':target.task==='sale-price'?'comercial':target.task==='guide'||target.task==='load'?'calidad':target.task==='legacy'?(target.kind==='Cobro'?'facturacion':'liquidacion'):'logistica'
export function openPending(source:LiquidationSource,kind:'Cobro'|'Pago',reason?:string){window.dispatchEvent(new CustomEvent('app:finance-pending',{detail:pendingNavigation(source,kind,reason)}))}
