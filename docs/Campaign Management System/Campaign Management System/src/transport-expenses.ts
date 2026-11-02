import { money, type TransportExpense } from './finance-model.js'

export function liquidationExpenses(expenses:TransportExpense[],viaticos?:{mobility?:number;supplies?:number}):TransportExpense[]{
 if(expenses.length)return expenses.map(e=>({...e,concept:e.concept.trim(),amount:money(e.amount)}))
 return [
  {id:'load-viaticos-mobility',concept:'Movilidad registrada en la carga',amount:money(viaticos?.mobility||0),currency:'PEN',rate:1,included:false},
  {id:'load-viaticos-supplies',concept:'Insumos registrados en la carga',amount:money(viaticos?.supplies||0),currency:'PEN',rate:1,included:false},
 ].filter(e=>e.amount>0)
}
