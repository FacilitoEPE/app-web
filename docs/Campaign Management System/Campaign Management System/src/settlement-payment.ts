import { transportCompanyBalance } from './transport-advances.js'
import type { SharedData } from './shared-protocol.js'
import { money, paidTotal, settlementTotal, type FinancialMovement } from './finance-model.js'

export type SettlementPaymentCommand={action:'record-settlement-payment';id:string;documentId:string;date:string;amount:number;method:string;reference?:string;evidence?:string;notes?:string}
const text=(v:unknown)=>typeof v==='string'?v.trim():''
export function recordSettlementPayment(s:SharedData,c:SettlementPaymentCommand):SharedData{
 if(!c||!text(c.id)||c.id.length>100||!/^[a-zA-Z0-9-]+$/.test(c.id))throw Error('Solicitud de pago no válida.')
 const doc=s.settlements.find(d=>d.id===c.documentId)
 if(!doc)throw Error('Registra primero la liquidación antes de pagar.')
 if(doc.transportLinkId&&!doc.transportServiceId)throw Error('Los documentos antiguos del acuerdo se consultan en el historial. Registra el pago en la carga correspondiente.')
 if(!/^\d{4}-\d{2}-\d{2}$/.test(c.date)||!Number.isFinite(Date.parse(c.date))||c.date<doc.date)throw Error('La fecha de pago no puede ser anterior a la liquidación.')
 if(!['Efectivo','Transferencia','Depósito','Otro'].includes(c.method))throw Error('Selecciona el medio de pago.')
 const amount=money(c.amount),balance=money(settlementTotal(doc)-paidTotal(s.financialMovements,'Pago',doc.id))
 if(!Number.isFinite(amount)||amount<=0||amount>balance)throw Error('El pago debe ser mayor a cero y no superar el saldo pendiente.')
 if(doc.transportLinkId&&amount>transportCompanyBalance(s,doc.transportLinkId).balance)throw Error('El pago supera el saldo de la empresa. Revisa el adelanto disponible para esta campaña.')
 const cash=c.method==='Efectivo',reference=text(c.reference)||(cash?'EFECTIVO-'+doc.number+'-'+c.id:'')
 if(!reference||(!cash&&!text(c.evidence)))throw Error('Registra la referencia y el comprobante del pago.')
 if(s.financialMovements.some(m=>m.kind==='Pago'&&m.documentId===doc.id&&m.reference.toLowerCase()===reference.toLowerCase()))throw Error('La referencia de este pago ya fue registrada.')
 const movement:FinancialMovement={id:'settlement-payment-'+c.id,kind:'Pago',documentId:doc.id,date:c.date,amount,method:c.method,reference,evidence:text(c.evidence)||(cash?'Pago en efectivo registrado':''),notes:text(c.notes)}
 return {...s,financialMovements:[...s.financialMovements,movement]}
}
