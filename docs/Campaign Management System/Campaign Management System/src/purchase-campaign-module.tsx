import { ClosedCampaignNotice } from './campaign-closure'
import { TransporterCampaignDetail } from './transporter-campaign-detail'
import { liquidationCampaigns } from './liquidation-campaigns'
import { campaignSettlements, paidCampaignSettlements } from './purchase-paid'
import { settlementProvider } from './purchase-uit'
import { liquidationExpenses } from './transport-expenses'
import { loadCashPaid, transportCompanyBalance } from './transport-advances'
import { TransportCompanyBalanceCard } from './transport-advance-ui'
import { useSharedCommand } from './shared-provider'
import { TransportPaymentTracking } from './transport-payment-tracking'
import { loadFreight } from './transport-freight'
import { useState } from 'react'
import { useStore } from './store'
import { purchaseSources, validateLiquidation } from './finance-flow'
import { openPending } from './finance-navigation'
import { type PurchaseSettlement, type TransportExpense, settlementTotal, paidTotal, financialStatus, money, limaDate, nextTransportSettlementNumber } from './finance-model'
import { SourceLiquidationModal, FinancialDocumentView, FinancialLedger, FinancialMovementModal, TransportAgreementSummary } from './finance'
import { PurchaseUitControl } from './purchase-uit-ui'
import { Button, PageHeader, Field, Input, Select, Modal, Table, StatusPill, fmtDate, fmtNum } from './ui'

const amount=(n:number,c:string)=>`${c==='PEN'?'S/':c} ${n.toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const Eye=()=> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
type Load={linkId:string;serviceId:string;mode:'providers'|'transport'}

export function PurchaseCampaignModule(){
 const s=useStore()
 const [tab,setTab]=useState<'liquidate'|'pay'|'paid'>('liquidate')
 const [paidCampaignId,setPaidCampaignId]=useState('')
 const [transporterViewId,setTransporterViewId]=useState('')
 const [campaignId,setCampaignId]=useState(''),[search,setSearch]=useState(''),[load,setLoad]=useState<Load|null>(null)
 const [edit,setEdit]=useState<{key?:string;document?:PurchaseSettlement}|null>(null),[viewId,setViewId]=useState(''),[ledger,setLedger]=useState(''),[payId,setPayId]=useState(''),[uit,setUit]=useState(false),[transportEdit,setTransportEdit]=useState<(Load & {document?:PurchaseSettlement})|null>(null)
 const campaign=s.campaigns.find(c=>c.id===campaignId)
 const closed=campaign?.estado==='Finalizado'
 const allLoads=s.campaignTransporters.flatMap(link=>link.services.filter(service=>service.annotation).map(service=>({link,service})))
 const visibleCampaigns=liquidationCampaigns(s).filter(c=>c.nombre.toLowerCase().includes(search.toLowerCase()))
 const loads=allLoads.filter(x=>x.link.campaignId===campaignId)
 const sources=purchaseSources(s)
 const chosenLink=s.campaignTransporters.find(l=>l.id===load?.linkId),chosen=chosenLink?.services.find(x=>x.id===load?.serviceId)
 const chosenSources=sources.filter(x=>x.transportServiceId===chosen?.id&&x.campaignId===campaignId)

 const company=s.transporters.find(t=>t.id===chosenLink?.transporterId)
 const campaignDocs=campaignSettlements(s,campaignId)
 const paidCampaign=s.campaigns.find(c=>c.id===paidCampaignId)
 const paidCampaignDocs=paidCampaignSettlements(s,paidCampaignId)
 const loadDocs=campaignDocs.filter(d=>d.transportServiceId===chosen?.id&&(load?.mode==='transport'?!!d.transportLinkId:!d.transportLinkId))
 const view=s.settlements.find(d=>d.id===viewId)
 const paid=(d:PurchaseSettlement)=>paidTotal(s.financialMovements,'Pago',d.id)
 const providerRows=chosenSources.map(source=>({source,docs:s.settlements.filter(d=>source.documentIds.includes(d.id))}))
 const providerCounts={liquidate:providerRows.filter(x=>!x.docs.length).length,pay:providerRows.filter(x=>x.docs.some(d=>money(settlementTotal(d)-paid(d))>0)).length,paid:providerRows.filter(x=>x.docs.some(d=>money(settlementTotal(d)-paid(d))<=0)).length}
 const visibleProviders=providerRows.filter(x=>tab==='liquidate'?!x.docs.length:x.docs.some(d=>tab==='pay'?money(settlementTotal(d)-paid(d))>0:money(settlementTotal(d)-paid(d))<=0))
 const docActions=(d:PurchaseSettlement)=><div className="flex flex-wrap gap-2"><Button variant="outline" aria-label={`Ver ${d.number}`} onClick={()=>setViewId(d.id)}><Eye/></Button>{d.transportLinkId&&<Button variant="outline" onClick={()=>setLedger(d.id)}>Historial de pagos</Button>}{!closed&&(!load||load.mode==='transport'||tab==='pay')&&(!d.transportLinkId||!!d.transportServiceId)&&settlementTotal(d)>paid(d)&&<Button onClick={()=>setPayId(d.id)}>Pagar</Button>}{!closed&&(!load||load.mode==='transport'||tab==='pay')&&!!d.transportLinkId&&!!d.transportServiceId&&!paid(d)&&<Button variant="ghost" onClick={()=>setTransportEdit({linkId:d.transportLinkId!,serviceId:d.transportServiceId!,mode:'transport',document:d})}>Editar flete y gastos</Button>}{!closed&&(!load||load.mode==='transport'||tab==='pay')&&!d.transportLinkId&&d.transportServiceId&&!paid(d)&&<Button variant="ghost" onClick={()=>setEdit({document:d})}>Editar</Button>}{!d.transportLinkId&&<ProviderPayments document={d}/>}</div>
 if(ledger)return <FinancialLedger kind="Pago" documentId={ledger} onBack={()=>setLedger('')}/>
 if(transporterViewId)return <TransporterCampaignDetail key={transporterViewId} linkId={transporterViewId} onBack={()=>setTransporterViewId('')}/>
 return <div>
  {campaign&&<ClosedCampaignNotice campaignId={campaign.id}/>}
  {campaign&&<Button variant="ghost" className="mb-4 px-0" onClick={()=>{if(load){setLoad(null)}else{setCampaignId('');setSearch('')}}}>{load?'← Volver a cargas':'← Volver a campañas'}</Button>}
  <PageHeader action={!campaign?<Button variant="outline" onClick={()=>setUit(true)}>Ver proveedores y límites UIT</Button>:undefined} title={load?(load.mode==='providers'?'Proveedor':'Transportista'):campaign?campaign.nombre:'Liquidación de compra'} subtitle={load?`${campaign?.nombre} · Gestiona la liquidación y los pagos de esta carga.`:campaign?'Selecciona una carga y consulta su proveedor o transportista.':'Campañas en proceso o con cargas registradas. Consulta sus cargas y liquidaciones.'}/>
  {!campaign?<>
   <div className="mb-5 max-w-md"><Field label="Buscar campaña"><Input placeholder="Nombre de campaña…" value={search} onChange={e=>setSearch(e.target.value)}/></Field></div>
   <Table head={['Campaña','Fruta','Estado','Cargas registradas','Acciones']}>{visibleCampaigns.map(c=>{const count=allLoads.filter(x=>x.link.campaignId===c.id).length;return <tr key={c.id}><td className="p-4 font-semibold">{c.nombre}</td><td className="p-4">{c.fruta}</td><td className="p-4"><StatusPill estado={c.estado}/></td><td className="p-4">{count} cargas</td><td className="p-4"><div className="flex items-center gap-2"><Button variant="outline" title={`Ver proveedores y transportistas pagados de ${c.nombre}`} aria-label={`Ver proveedores y transportistas pagados de ${c.nombre}`} onClick={()=>setPaidCampaignId(c.id)}><Eye/></Button><Button variant="outline" onClick={()=>{setCampaignId(c.id);setSearch('')}}>Ver cargas →</Button></div></td></tr>})}{!visibleCampaigns.length&&<tr><td colSpan={5} className="p-10 text-center text-ink-soft">No hay campañas en proceso ni con cargas registradas que coincidan con la búsqueda.</td></tr>}</Table>
  </>:!load?<>
   <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-ink-soft">{loads.length} cargas registradas · {campaignDocs.length} liquidaciones</p><Button variant="outline" onClick={()=>setUit(true)}>Control UIT por proveedor</Button></div>
   <Table head={['Carga / cliente','Transportista','Camión / chofer','Kilos cargados','Liquidaciones','Acciones']}>{loads.map(({link,service},index)=>{const carrier=s.transporters.find(t=>t.id===link.transporterId),requirement=s.requirements.find(r=>r.id===service.sourceDelivery?.requirementId),providerRows=sources.filter(x=>x.transportServiceId===service.id&&x.campaignId===campaignId),transport=s.settlements.find(d=>d.transportLinkId===link.id&&d.transportServiceId===service.id);return <tr key={link.id+service.id}><td className="p-4"><p className="font-semibold">Carga {index+1} · {fmtDate(service.annotation?.loadDate||service.start)}</p><p className="mt-1 text-sm text-ink-soft">{s.clients.find(c=>c.id===requirement?.clientId)?.empresa||service.destination}</p></td><td className="p-4 text-sm">{carrier?.empresa||'Sin transportista'}</td><td className="p-4 text-sm">{carrier?.vehiculos.find(v=>v.id===service.vehicleId)?.placa}<p className="mt-1 text-ink-soft">{carrier?.choferes.find(d=>d.id===service.driverId)?.nombre}</p></td><td className="p-4 font-semibold">{fmtNum(service.annotation?.kilos||0)} kg</td><td className="p-4 text-xs text-ink-soft"><p>Proveedores: {providerRows.filter(x=>x.reasons.includes('Compra liquidada')).length} de {providerRows.length}</p><p className="mt-1">Transporte: {transport?'Liquidado':'Por liquidar'}</p></td><td className="p-4"><div className="flex flex-col gap-2"><Button variant="outline" onClick={()=>{setTab('liquidate');setLoad({linkId:link.id,serviceId:service.id,mode:'providers'})}}>Proveedor</Button><Button variant="outline" onClick={()=>{setTab('liquidate');setLoad({linkId:link.id,serviceId:service.id,mode:'transport'})}}>Transportista</Button></div></td></tr>})}{!loads.length&&<tr><td colSpan={6} className="p-10 text-center text-ink-soft">Esta campaña todavía no tiene cargas registradas.</td></tr>}</Table>
  </>:null}
  {load&&chosen&&chosenLink&&<section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
   {load.mode==='providers'&&<><div role="tablist" aria-label="Estado de proveedores" className="mb-6 flex flex-wrap gap-2 border-b border-line pb-4">{(['liquidate','pay','paid'] as const).map(value=><Button key={value} role="tab" aria-selected={tab===value} variant={tab===value?'primary':'outline'} onClick={()=>setTab(value)}>{value==='liquidate'?'Por liquidar':value==='pay'?'Por pagar':'Pagados'} ({providerCounts[value]})</Button>)}</div>
   <h2 className="mb-3 text-lg font-semibold">{tab==='liquidate'?'Proveedores por liquidar':tab==='pay'?'Proveedores por pagar':'Proveedores pagados'}</h2></>}
   {load.mode==='providers'?<>
    <div className="space-y-4">{visibleProviders.map(({source:x,docs:allDocs})=>{
     const docs=allDocs.filter(d=>tab==='pay'?money(settlementTotal(d)-paid(d))>0:tab==='paid'?money(settlementTotal(d)-paid(d))<=0:true)
     const pending=x.reasons.filter(r=>r!=='Compra liquidada')
     const total=docs.length?money(docs.reduce((n,d)=>n+settlementTotal(d),0)):money(x.loaded*x.price)
     const balance=docs.length?Math.max(0,money(docs.reduce((n,d)=>n+settlementTotal(d)-paid(d),0))):total
     return <article key={x.key} className="rounded-xl border border-line p-4 sm:p-5"><h3 className="text-lg font-semibold">{x.party}</h3>
      <div className="my-4 grid grid-cols-2 gap-4 rounded-xl bg-canvas p-4 sm:grid-cols-4"><div><p className="text-xs text-ink-soft">Kilos cargados</p><b className="mt-1 block">{fmtNum(x.loaded)} kg</b></div><div><p className="text-xs text-ink-soft">Precio por kilo</p><b className="mt-1 block">{x.price?amount(x.price,x.currency):'Sin acuerdo'}</b></div><div><p className="text-xs text-ink-soft">Total</p><b className="mt-1 block">{x.price||docs.length?amount(total,x.currency):'Por definir'}</b></div><div><p className="text-xs text-ink-soft">Saldo por pagar</p><b className="mt-1 block text-forest">{docs.length?amount(balance,x.currency):'Por liquidar'}</b></div></div>
      {!closed&&!docs.length&&<><Button variant={pending.length?'outline':'primary'} onClick={()=>pending.length?openPending(x,'Pago'):setEdit({key:x.key})}>{pending.length?'Completar pendientes':'Liquidar'}</Button>{pending.length>0&&<p className="mt-2 text-xs text-ink-soft">{pending.join(' · ')}</p>}</>}
      {docs.map(d=><div key={d.id} className="mt-3"><p className="mb-2 text-xs text-ink-soft">{d.number}{d.settlementPerson&&<span className="ml-2">· Persona: {d.settlementPerson.nombres} {d.settlementPerson.apellidos} · {d.settlementPerson.tipoDocumento} {d.settlementPerson.dni}</span>}</p>{docActions(d)}</div>)}
     </article>
    })}{!visibleProviders.length&&<p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">{tab==='liquidate'?'No hay proveedores pendientes de liquidar en esta carga.':tab==='pay'?'No hay liquidaciones con saldo pendiente de pago.':'Todavía no hay proveedores con el pago completado en esta carga.'}</p>}</div>
   </>:<>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-ink-soft">Chofer de esta carga</p><h2 className="mt-1 text-xl font-semibold">{company?.choferes.find(d=>d.id===chosen.driverId)?.nombre||'Sin chofer asignado'}</h2><p className="mt-1 text-sm text-ink-soft">{company?.empresa} · {company?.vehiculos.find(v=>v.id===chosen.vehicleId)?.placa}</p></div><StatusPill estado={!loadDocs.length?'Por liquidar':loadDocs.some(d=>money(settlementTotal(d)-paid(d))>0)?'Pendiente':'Pagado'}/></div>
    <div className="mb-5 grid gap-4 rounded-xl bg-canvas p-4 sm:grid-cols-3"><div><p className="text-xs text-ink-soft">Flete de la carga</p><b className="mt-1 block text-xl">{loadDocs.length?amount(money(loadDocs.reduce((n,d)=>n+d.price,0)),'PEN'):'—'}</b></div><div><p className="text-xs text-ink-soft">Total de viáticos</p><b className="mt-1 block text-xl">{amount(loadDocs.length?money(loadDocs.reduce((n,d)=>n+d.additions,0)):money((chosen.annotation?.viaticos?.mobility||0)+(chosen.annotation?.viaticos?.supplies||0)),'PEN')}</b></div><div><p className="text-xs text-ink-soft">Total</p><b className="mt-1 block text-xl text-forest">{loadDocs.length?amount(money(loadDocs.reduce((n,d)=>n+settlementTotal(d),0)),'PEN'):'—'}</b></div></div>
    {!closed&&!loadDocs.length&&<Button disabled={!chosenLink.paymentAgreement} onClick={()=>setTransportEdit(load)}>Liquidar</Button>}
    {!chosenLink.paymentAgreement&&<p className="mt-3 text-sm text-ink-soft">Completa primero el acuerdo en la campaña → Transportistas → Acuerdo de pago.</p>}
    {loadDocs.map(d=><div key={d.id} className="mb-4"><p className="mb-3 text-xs text-ink-soft">{d.number}{d.additions>0&&<> · Gastos reales: {amount(d.additions,d.currency)}</>}{loadCashPaid(s,d.id)>0&&<> · Pagos registrados: {amount(loadCashPaid(s,d.id),d.currency)}</>}</p>{docActions(d)}</div>)}
    <details className="mt-5 rounded-xl border border-line p-4"><summary className="cursor-pointer text-sm font-semibold">Acuerdo de la empresa y saldo de campaña</summary><div className="mt-4"><TransportAgreementSummary linkId={chosenLink.id} compact/><TransportCompanyBalanceCard linkId={chosenLink.id}/></div></details>
    <TransportPaymentTracking linkId={chosenLink.id} serviceId={chosen.id}/>
   </>}
  </section>}
  {paidCampaign&&<Modal open wide title={`Pagados · ${paidCampaign.nombre}`} onClose={()=>setPaidCampaignId('')} footer={<Button onClick={()=>setPaidCampaignId('')}>Cerrar</Button>}>
   <p className="mb-5 text-sm text-ink-soft">Proveedores y transportistas con liquidaciones totalmente pagadas en esta campaña. Consulta el documento y sus pagos registrados.</p>
   <div className="space-y-6">{(['providers','transport'] as const).map(kind=>{
    const documents=paidCampaignDocs.filter(d=>kind==='transport'?!!d.transportLinkId:!d.transportLinkId)
    return <section key={kind}><h4 className="mb-3 text-base font-semibold">{kind==='providers'?'Proveedores pagados':'Transportistas pagados'} <span className="font-normal text-ink-soft">({documents.length} {documents.length===1?'liquidación':'liquidaciones'})</span></h4>
     {documents.length?<Table head={[kind==='providers'?'Proveedor':'Transportista','Liquidación','Total','Pagado','Consulta']}>{documents.map(d=>{
      const provider=s.providers.find(p=>p.id===settlementProvider(s,d))
      const link=s.campaignTransporters.find(l=>l.id===d.transportLinkId)
      const transporter=s.transporters.find(t=>t.id===link?.transporterId)
      const party=d.transportLinkId?(transporter?.empresa||'Transportista no identificado'):(provider?`${provider.nombres} ${provider.apellidos}`:'Proveedor no identificado')
      return <tr key={d.id}><td className="p-4 font-semibold">{party}</td><td className="p-4"><p>{d.number}</p><p className="mt-1 text-xs text-ink-soft">{fmtDate(d.date)}</p></td><td className="whitespace-nowrap p-4">{amount(settlementTotal(d),d.currency)}</td><td className="whitespace-nowrap p-4 text-forest">{amount(paid(d),d.currency)}</td><td className="p-4"><div className="flex items-center gap-2"><Button variant="outline" title={d.transportLinkId?`Ver transportista ${party} y sus cargas`:`Ver liquidación ${d.number}`} aria-label={d.transportLinkId?`Ver transportista ${party} y sus cargas`:`Ver liquidación ${d.number}`} onClick={()=>d.transportLinkId?setTransporterViewId(d.transportLinkId):setViewId(d.id)}><Eye/></Button><Button variant="outline" onClick={()=>setLedger(d.id)}>Ver pagos</Button></div></td></tr>
     })}</Table>:<p className="rounded-xl border border-dashed border-line p-5 text-sm text-ink-soft">{kind==='providers'?'No hay proveedores con liquidaciones totalmente pagadas en esta campaña.':'No hay transportistas con liquidaciones totalmente pagadas en esta campaña.'}</p>}
    </section>
   })}</div>
  </Modal>}
  {edit&&<SourceLiquidationModal kind="Pago" document={edit.document} initialKey={edit.key} onCurrency={()=>{}} onClose={()=>setEdit(null)}/>}
  {transportEdit&&<LoadTransportSettlement key={transportEdit.serviceId} linkId={transportEdit.linkId} serviceId={transportEdit.serviceId} settlement={transportEdit.document} onClose={()=>setTransportEdit(null)}/>}
  {view&&<FinancialDocumentView kind="Pago" document={view} onClose={()=>setViewId('')}/>}
  {!!payId&&<FinancialMovementModal kind="Pago" fixedId={payId} onClose={()=>setPayId('')}/>}
  {uit&&<Modal open wide title="Proveedores y personas vinculadas · Control UIT" onClose={()=>setUit(false)} footer={<Button onClick={()=>setUit(false)}>Cerrar</Button>}><PurchaseUitControl/></Modal>}
 </div>
}

function ProviderPayments({document}:{document:PurchaseSettlement}){
 const s=useStore()
 const payments=s.financialMovements.filter(p=>p.kind==='Pago'&&p.documentId===document.id).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id))
 return <details className="w-full rounded-xl border border-line p-4"><summary className="cursor-pointer text-sm font-semibold text-forest">Ver pagos y comprobantes ({payments.length})</summary><div className="mt-4 space-y-3">{payments.map(p=><article key={p.id} className="rounded-lg bg-canvas p-4"><div className="flex flex-wrap justify-between gap-2"><b className="text-sm">{amount(p.amount,document.currency)}</b><span className="text-sm text-ink-soft">{fmtDate(p.date)}</span></div><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-ink-soft">Medio de pago</dt><dd>{p.method}</dd></div><div><dt className="text-xs text-ink-soft">Referencia</dt><dd className="break-words">{p.reference||'Sin referencia'}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-ink-soft">Comprobante registrado</dt><dd className="break-words">{p.evidence||'Sin comprobante adjunto'}</dd></div>{p.notes&&<div className="sm:col-span-2"><dt className="text-xs text-ink-soft">Observaciones del pago</dt><dd>{p.notes}</dd></div>}</dl></article>)}{!payments.length&&<p className="text-sm text-ink-soft">Aún no hay pagos registrados para esta liquidación.</p>}</div></details>
}

function LoadTransportSettlement({linkId,serviceId,settlement,onClose}:{linkId:string;serviceId:string;settlement?:PurchaseSettlement;onClose:()=>void}){
 const s=useStore(),link=s.campaignTransporters.find(l=>l.id===linkId)!,service=link.services.find(x=>x.id===serviceId)!,a=link.paymentAgreement!
 const budget=money((service.annotation?.viaticos?.mobility||0)+(service.annotation?.viaticos?.supplies||0))
 const [base,setBase]=useState(settlement?String(settlement.price):'')
 const freightObservation=settlement?service.freightObservation||'':''
 const command=useSharedCommand(),[commandId]=useState(()=>crypto.randomUUID()),[busy,setBusy]=useState(false)
 const number=settlement?.number||nextTransportSettlementNumber(s.settlements)
 const companyBalance=transportCompanyBalance(s,linkId)
 const [date,setDate]=useState(settlement?.date||limaDate()),[expenses,setExpenses]=useState<TransportExpense[]>(settlement?.transportExpenses||[]),[error,setError]=useState('')
 const update=(id:string,patch:Partial<TransportExpense>)=>setExpenses(rows=>rows.map(e=>e.id===id?{...e,...patch}:e))
 const automatic=!expenses.length
 const includedExpenses=liquidationExpenses(expenses,service.annotation?.viaticos)
 const realPen=money(includedExpenses.filter(e=>e.currency==='PEN').reduce((n,e)=>n+e.amount,0))
 const extra=money(includedExpenses.filter(e=>!e.included).reduce((n,e)=>n+money(e.amount*e.rate),0))
 const total=money(Number(base)+extra)
 const save=async()=>{
  if(!Number.isFinite(Number(base))||Number(base)<=0)return setError('Ingresa el precio del flete de esta carga.')
  if(Number(base)>companyBalance.pendingLiquidation+(settlement?.price||0))return setError('El flete supera el saldo pendiente del acuerdo de transporte.')
  setBusy(true);setError('')
  try{
   await command({action:'settle-transport',id:commandId,settlementId:settlement?.id,transportLinkId:linkId,transportServiceId:serviceId,date,freight:Number(base),freightObservation,expenses,method:'Efectivo',document:settlement?.document||''})
   s.toast('Liquidación del transporte registrada. El pago se registra por separado.');onClose()
  }catch(e){setError(e instanceof Error?e.message:'No se pudo registrar la liquidación del transporte.')}finally{setBusy(false)}
 }
 return <Modal open wide title={settlement?'Editar liquidación de transporte':'Gastos reales y liquidación de transporte'} onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={busy} onClick={save}>{busy?'Guardando…':settlement?'Guardar cambios':'Guardar liquidación'}</Button></>}>
  <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-canvas p-4"><Field label="Precio del flete de esta carga (S/)"><Input aria-label="Precio del flete de esta carga" type="number" min="0.01" step="0.01" placeholder="Ingresa el monto" value={base} onChange={e=>setBase(e.target.value)}/></Field></div><div className="rounded-xl bg-leaf-50 p-4"><p className="text-xs text-ink-soft">Viáticos registrados en la carga</p><b className="mt-1 block text-xl">{amount(budget,'PEN')}</b><p className="mt-1 text-xs text-ink-soft">Movilidad: {amount(service.annotation?.viaticos?.mobility||0,'PEN')} · Insumos: {amount(service.annotation?.viaticos?.supplies||0,'PEN')}</p></div></div>
  <div className="mt-4 rounded-xl border border-line p-4 text-sm"><p>Saldo neto por liquidar en la campaña: <b>{amount(companyBalance.netPendingLiquidation,'PEN')}</b></p><p className="mt-1 text-xs text-ink-soft">Después de guardar esta carga: <b>{amount(Math.max(0,money(companyBalance.netPendingLiquidation+(settlement?.price||0)-Number(base))),'PEN')}</b>. El adelanto entregado aún sin aplicar ya está descontado. Guardar no registra pagos ni aplica adelantos.</p></div>
  <div className="my-5 grid gap-4 sm:grid-cols-2"><Field label="Número de liquidación"><Input aria-label="Número de liquidación de transporte" readOnly value={number}/></Field><Field label="Fecha de liquidación"><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></Field></div>
  <div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-semibold">Detalle de gastos reales</h3><Button variant="outline" onClick={()=>setExpenses([...expenses,{id:crypto.randomUUID(),concept:'',amount:0,currency:'PEN',rate:1,included:false}])}>+ Agregar gasto</Button></div>
  <p className="mb-4 text-xs text-ink-soft">Si no detallas gastos reales, se suman automáticamente los viáticos registrados en la carga. Si agregas gastos reales, estos reemplazan los viáticos. Todos los importes están en soles.</p>
  <div className="space-y-3">{expenses.map((e,i)=><article key={e.id} className="rounded-xl border border-line p-4"><div className="mb-3 flex justify-between"><b className="text-xs">Gasto {i+1}</b><Button variant="ghost" onClick={()=>setExpenses(expenses.filter(x=>x.id!==e.id))}>Quitar</Button></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Concepto del gasto"><Input placeholder="Combustible, peajes, alimentación…" value={e.concept} onChange={v=>update(e.id,{concept:v.target.value})}/></Field><Field label="Monto real"><Input type="number" min="0" step="0.01" value={e.amount||''} onChange={v=>update(e.id,{amount:Number(v.target.value)})}/></Field></div></article>)}</div>
  {!expenses.length&&<p className="rounded-xl border border-dashed border-line p-5 text-sm text-ink-soft">{budget>0?`Se sumarán automáticamente ${amount(budget,'PEN')} de viáticos al flete de esta carga.`:'Esta carga no tiene viáticos registrados. Puedes agregar gastos reales si corresponde.'}</p>}
  <p className="mt-4 text-sm">{automatic?'Viáticos a sumar':'Gastos reales a sumar'}: <b>{amount(realPen,'PEN')}</b> · Referencia: {amount(budget,'PEN')}{realPen>budget&&<span className="ml-2 text-amber-700">Supera el presupuesto referencial en {amount(money(realPen-budget),'PEN')}</span>}</p>
  <div className="mt-5 rounded-xl bg-leaf-50 p-4"><p className="text-sm">Flete de esta carga: {amount(Number(base)||0,a.currency)} + {automatic?'Viáticos de la carga':'Gastos reales'}: {amount(extra,a.currency)}</p><p className="mt-2 text-sm">Total liquidado: <b>{amount(total,a.currency)}</b></p><p className="mt-2 text-xl font-semibold">Saldo por pagar: {amount(total,a.currency)}</p><p className="mt-2 text-xs text-ink-soft">Al guardar solo se registra la liquidación. Pagar y aplicar un adelanto son acciones separadas que requieren tu confirmación.</p></div>
  {error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
 </Modal>
}
