import { loadCashPaid } from './transport-advances'
import { useStore } from './store'
import { loadFreight } from './transport-freight'
import { money, paidTotal, settlementTotal } from './finance-model'
import { fmtDate, Table } from './ui'

const sol=(n:number)=>`S/ ${n.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}`
export function TransportPaymentTracking({linkId,serviceId}:{linkId:string;serviceId:string}){
 const s=useStore(),link=s.campaignTransporters.find(l=>l.id===linkId)!
 const links=s.campaignTransporters.filter(l=>l.campaignId===link.campaignId&&l.transporterId===link.transporterId)
 const company=s.transporters.find(t=>t.id===link.transporterId)
 const ids=new Set(links.map(l=>l.id)),docs=s.settlements.filter(d=>ids.has(d.transportLinkId||''))
 const payments=s.financialMovements.filter(m=>m.kind==='Pago'&&docs.some(d=>d.id===m.documentId))
 const otherLoads=links.flatMap(l=>l.services.filter(x=>x.annotation&&x.id!==serviceId))
 return <details className="mt-5 rounded-xl border border-line p-4"><summary className="cursor-pointer text-sm font-semibold">Otras cargas y pagos de la campaña <span className="ml-1 font-normal text-ink-soft">({otherLoads.length})</span></summary><div className="mt-4">
  <Table head={['Carga / chofer','Flete liquidado','Total liquidado','Pagos','Saldo de la carga']}>{links.flatMap(l=>l.services.filter(x=>x.annotation&&x.id!==serviceId).map(service=>{
   const doc=docs.find(d=>d.transportLinkId===l.id&&d.transportServiceId===service.id),paid=doc?paidTotal(payments,'Pago',doc.id):0,freight=doc?.price
   return <tr key={l.id+service.id} className={service.id===serviceId?'bg-leaf-50':''}><td className="p-3 text-sm"><p className="font-semibold">{company?.vehiculos.find(v=>v.id===service.vehicleId)?.placa} · {company?.choferes.find(d=>d.id===service.driverId)?.nombre}</p><p className="mt-1 text-xs text-ink-soft">{fmtDate(service.annotation?.loadDate||service.start)}</p>{doc&&<p className="mt-1 text-xs text-ink-soft">{doc.number}{paid>=settlementTotal(doc)?' · Pagada':paid>0?' · Pago parcial':' · Pendiente de pago'}</p>}{doc&&payments.filter(m=>m.documentId===doc.id).map(m=><p key={m.id} className="mt-1 text-xs text-ink-soft">{fmtDate(m.date)} · {m.advanceSourceId?'Adelanto aplicado':'Pago'}: {sol(m.amount)} · {m.reference}</p>)}</td><td className="p-3 text-sm">{freight===undefined?'Por liquidar':sol(freight)}</td><td className="p-3 text-sm">{doc?sol(settlementTotal(doc)):'Por liquidar'}</td><td className="p-3 text-sm font-semibold">{doc?sol(loadCashPaid(s,doc.id)):'—'}</td><td className="p-3 text-sm">{doc?sol(money(settlementTotal(doc)-paid)):'—'}</td></tr>
  }))}{!otherLoads.length&&<tr><td colSpan={5} className="p-4 text-sm text-ink-soft">No hay otras cargas de esta empresa en la campaña.</td></tr>}</Table>
 </div></details>
}
