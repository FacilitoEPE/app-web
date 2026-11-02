import { liquidationExpenses } from './transport-expenses.js'
import type { SharedData } from './shared-protocol.js'
import { loadFreight, freightIssue } from './transport-freight.js'
import { validateLiquidation } from './finance-flow.js'
import { nextTransportSettlementNumber, money, settlementTotal, type PurchaseSettlement, type FinancialMovement, type TransportExpense } from './finance-model.js'

export type TransportPaymentCommand={action:'settle-transport-and-pay'|'settle-transport';id:string;settlementId?:string;transportLinkId:string;transportServiceId:string;date:string;freight?:number;freightObservation?:string;expenses:TransportExpense[];advanceToApply?:number;method:string;reference?:string;evidence?:string;document?:string}
const text=(v:unknown)=>typeof v==='string'?v.trim():''
export function paidTransportSettlement(s:SharedData,c:TransportPaymentCommand):SharedData{
 if(!c||!text(c.id)||c.id.length>100||!/^[a-zA-Z0-9-]+$/.test(c.id))throw Error('Solicitud de liquidación no válida.')
 if(c.action==='settle-transport'&&c.advanceToApply!==undefined&&c.advanceToApply!==0)throw Error('La liquidación no aplica adelantos. Guarda la liquidación y utiliza Aplicar adelanto como una acción separada.')
 if(!['Efectivo','Transferencia','Depósito','Otro'].includes(c.method))throw Error('Selecciona el medio de pago.')
 const link=s.campaignTransporters.find(l=>l.id===c.transportLinkId),service=link?.services.find((x:any)=>x.id===c.transportServiceId),a=link?.paymentAgreement
 if(!a||a.currency!=='PEN'||!service?.annotation)throw Error('Selecciona una carga con acuerdo de transporte en soles.')
 const existing=c.settlementId?s.settlements.find(d=>d.id===c.settlementId):undefined
 if(c.settlementId&&(!existing||existing.transportLinkId!==link.id||existing.transportServiceId!==service.id))throw Error('La liquidación no corresponde a esta carga.')
 if(existing&&s.financialMovements.some(m=>m.kind==='Pago'&&m.documentId===existing.id))throw Error('Esta liquidación ya tiene pagos. Consulta su historial.')
 const price=c.action==='settle-transport'?c.freight:loadFreight(s,link.id,service.id)
 if(!price||!Number.isFinite(price)||price<=0)throw Error('Ingresa el precio del flete de esta carga para liquidar.')
 const freight=money(price),observation=text(c.freightObservation)
 if(!Array.isArray(c.expenses)||c.expenses.length>100)throw Error('Revisa el detalle de gastos.')
 if(c.expenses.some(e=>!e||!text(e.concept)||!e.id||!Number.isFinite(e.amount)||e.amount<=0||e.currency!=='PEN'||e.rate!==1||e.included!==false))throw Error('Registra cada gasto con concepto y monto en soles.')
 if(!c.expenses.length&&[service.annotation.viaticos?.mobility??0,service.annotation.viaticos?.supplies??0].some(n=>!Number.isFinite(n)||n<0))throw Error('Revisa los viáticos registrados en la carga.')
 const expenses=liquidationExpenses(c.expenses,service.annotation.viaticos)
 const doc:PurchaseSettlement={id:existing?.id||'transport-'+c.id,number:existing?.number||nextTransportSettlementNumber(s.settlements),operationId:service.operationId||'',transportLinkId:link.id,transportServiceId:service.id,date:c.date,due:c.action==='settle-transport-and-pay'?c.date:a.due,paidOnSettlement:c.action==='settle-transport-and-pay',kilos:1,price:freight,deductions:0,additions:money(expenses.reduce((n,e)=>n+e.amount,0)),currency:'PEN',transportExpenses:expenses,transportBudgetPen:money((service.annotation.viaticos?.mobility||0)+(service.annotation.viaticos?.supplies||0)),adjustmentReason:expenses.length?(c.expenses.length?'Gastos reales de la carga.':'Viáticos registrados en la carga.'):'',document:text(c.document),notes:c.action==='settle-transport'?'Liquidación del transporte por carga. Pago por registrar.':'Liquidación y pago total del transporte por carga.'}
 const source=service.sourceDelivery
 const prepared={...s,campaignTransporters:s.campaignTransporters.map(l=>l.id===link.id?{...l,services:l.services.map((x:any)=>x.id===service.id?{...x,freight,freightObservation:observation}:x)}:l),requirements:s.requirements.map(r=>r.id===source?.requirementId?{...r,contratos:(r.contratos||[]).map((ct:any)=>ct.id===source.contractId?{...ct,entregas:ct.entregas.map((d:any)=>d.id===source.deliveryId?{...d,freight,freightObservation:observation}:d)}:ct)}:r),settlements:existing?s.settlements.map(d=>d.id===doc.id?doc:d):[...s.settlements,doc]}
 const freightError=freightIssue(prepared,s);if(freightError)throw Error(freightError)
 const issue=validateLiquidation(prepared,doc,'Pago');if(issue)throw Error(issue)
 if(c.action==='settle-transport'){
  const saved=prepared
  return saved
 }
 const cash=c.method==='Efectivo'
 if(!cash&&(!text(c.reference)||!text(c.evidence)))throw Error('Registra la referencia y el comprobante del pago.')
 const payment:FinancialMovement={id:'transport-payment-'+c.id,kind:'Pago',documentId:doc.id,date:doc.date,amount:settlementTotal(doc),method:c.method,reference:text(c.reference)||(cash?'EFECTIVO-'+doc.number:''),evidence:text(c.evidence)||(cash?'Pago en efectivo confirmado al liquidar':''),notes:'Pago total registrado junto con la liquidación del transporte.'}
 return {...prepared,settlements:existing?s.settlements.map(d=>d.id===doc.id?doc:d):[...s.settlements,doc],financialMovements:[...s.financialMovements,payment]}
}
