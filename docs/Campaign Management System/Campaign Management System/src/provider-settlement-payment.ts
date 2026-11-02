import type { SharedData } from './shared-protocol.js'
import { nextProviderSettlementNumber, settlementTotal, paidTotal, type PurchaseSettlement, type FinancialMovement } from './finance-model.js'
import { selectedSettlementPerson } from './purchase-uit.js'
import { purchaseSources, validateLiquidation } from './finance-flow.js'

export type ProviderPaymentCommand={action:'settle-provider-and-pay'|'settle-provider';id:string;settlementId?:string;transportServiceId:string;providerId:string;settlementPersonId?:string;date:string;method:string;reference?:string;evidence?:string;document?:string;notes?:string;uitLimitAcknowledged?:boolean}
const text=(value:unknown)=>typeof value==='string'?value.trim():''
export function paidProviderSettlement(s:SharedData,command:ProviderPaymentCommand):SharedData{
 if(!command||!text(command.id)||command.id.length>100||!/^[a-zA-Z0-9-]+$/.test(command.id))throw Error('La solicitud de pago no es válida.')
 if(!['Efectivo','Transferencia','Depósito','Otro'].includes(command.method))throw Error('Selecciona el medio de pago.')
 const existing=command.settlementId?s.settlements.find(d=>d.id===command.settlementId):undefined
 if(command.settlementId&&(!existing||existing.transportLinkId||existing.providerId!==command.providerId||existing.transportServiceId!==command.transportServiceId))throw Error('La liquidación no corresponde al proveedor y la carga.')
 if(existing&&s.financialMovements.some(m=>m.kind==='Pago'&&m.documentId===existing.id))throw Error('La liquidación ya tiene pagos; consulta su historial.')
 const view={...s,settlements:s.settlements.filter(d=>d.id!==existing?.id)}
 const source=purchaseSources(view).find(x=>x.transportServiceId===command.transportServiceId&&x.providerId===command.providerId)
 if(!source)throw Error('Selecciona un proveedor de esta carga.')
 if(source.reasons.length)throw Error(source.reasons.join(' · '))
 const personId=existing?.settlementPersonId||command.settlementPersonId||undefined
 if(existing&&command.settlementPersonId!==existing.settlementPersonId&&command.settlementPersonId)throw Error('La persona de una liquidación registrada conserva su historial.')
 const person=selectedSettlementPerson(s,source.providerId||'',personId)
 if(!person)throw Error('Selecciona una persona vinculada a este proveedor.')
 const doc:PurchaseSettlement={id:existing?.id||'purchase-'+command.id,number:existing?.number||nextProviderSettlementNumber(s.settlements),operationId:source.operationId,deliveryId:source.deliveryId,transportServiceId:source.transportServiceId,providerId:source.providerId,settlementPersonId:personId,settlementPerson:existing?existing.settlementPerson:{nombres:person.nombres,apellidos:person.apellidos,tipoDocumento:person.tipoDocumento,dni:person.dni},fincaIds:source.fincaIds,quantityBasis:'Loaded',paidOnSettlement:command.action==='settle-provider-and-pay',date:command.date,due:command.action==='settle-provider-and-pay'?command.date:(existing?.due||''),kilos:source.loaded,price:source.price,currency:'PEN',deductions:0,additions:0,adjustmentReason:'',exchangeRateToPen:1,exchangeRateSource:'',uitLimitAcknowledged:!!command.uitLimitAcknowledged,document:text(command.document),notes:text(command.notes)}
 const issue=validateLiquidation(s,doc,'Pago');if(issue)throw Error(issue)
 if(command.action==='settle-provider')return {...s,settlements:existing?s.settlements.map(d=>d.id===doc.id?doc:d):[...s.settlements,doc]}
 const cash=command.method==='Efectivo'
 if(!cash&&(!text(command.reference)||!text(command.evidence)))throw Error('Registra la referencia y el comprobante del pago.')
 const payment:FinancialMovement={id:'payment-'+command.id,kind:'Pago',documentId:doc.id,date:doc.date,amount:settlementTotal(doc),method:command.method,reference:text(command.reference)||(cash?'EFECTIVO-'+doc.number:''),evidence:text(command.evidence)||(cash?'Pago en efectivo confirmado al liquidar':''),notes:'Pago total registrado al confirmar la liquidación.'}
 const data={...s,settlements:existing?s.settlements.map(d=>d.id===doc.id?doc:d):[...s.settlements,doc],financialMovements:[...s.financialMovements,payment]}
 if(paidTotal(data.financialMovements,'Pago',doc.id)!==settlementTotal(doc))throw Error('El pago no coincide con el total de la liquidación.')
 return data
}
