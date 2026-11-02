import { CampaignHistoryNotice, ClosedCampaignNotice } from './campaign-closure'
import { ChangeMark } from './review-changes'
import { documentName, documentUrl } from './stored-documents'
import { useState } from 'react'
import { useStore } from './store'
import { liquidationCampaigns } from './liquidation-campaigns'
import { saleInvoiceContext } from './sales-campaign-flow'
import { registeredSaleLoads } from './registered-sales-loads'
import { campaignClientContracts, campaignReceivables } from './sales-campaign-summary'
import { saleProgress, saleReceiptSummary, saleWeightSummary } from './sales-progress'
import { invoiceBillingIssue, invoiceIsBilled } from './sales-billing'
import { type Invoice, invoiceTotal, money, paidTotal, limaDate } from './finance-model'
import { SourceLiquidationModal, FinancialDocumentView, FinancialLedger, FinancialMovementModal } from './finance'
import { openPending } from './finance-navigation'
import { Button, Kpi, PageHeader, Field, Input, Modal, Table, StatusPill, FileDrop, fmtDate, fmtNum } from './ui'

const amount = (n: number, currency: string) => `${currency === 'PEN' ? 'S/' : currency} ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const Eye = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>

export function SalesCampaignModule() {
  const s = useStore()
  const [campaignId, setCampaignId] = useState(''), [clientId, setClientId] = useState(''), [search, setSearch] = useState('')
  const [sourceKey, setSourceKey] = useState(''), [billId, setBillId] = useState(''), [viewId, setViewId] = useState(''), [payId, setPayId] = useState(''), [ledgerId, setLedgerId] = useState('')
  const campaign = s.campaigns.find(item => item.id === campaignId)
  const closed = campaign?.estado === 'Finalizado'
  const client = s.clients.find(item => item.id === clientId)
  const registered = registeredSaleLoads(s)
  const allLoads = s.campaignTransporters.flatMap(link => link.services.filter(service => service.annotation).map(service => ({ link, service })))
  const campaignInvoices = s.invoices.filter(invoice => saleInvoiceContext(s, invoice).campaignId === campaignId)
  const campaignLoads = registered.filter(load => load.campaignId === campaignId)
  const eligible = liquidationCampaigns(s).filter(item => item.nombre.toLowerCase().includes(search.trim().toLowerCase()))
  const clientIds = new Set(campaignLoads.map(load => load.clientId))
  const campaignTotals = campaignReceivables(s, campaignId)
  const clientContracts = campaignClientContracts(s, campaignId, clientId)
  const clients = s.clients.filter(item => clientIds.has(item.id) && `${item.empresa} ${item.ruc}`.toLowerCase().includes(search.trim().toLowerCase()))
  const loads = campaignLoads.filter(load => load.clientId === clientId)
  const invoices = campaignInvoices.filter(invoice => saleInvoiceContext(s, invoice).clientId === clientId)
  const historical = invoices.filter(invoice => !loads.some(load => load.source?.deliveryId === invoice.deliveryId || invoice.transportServiceId === load.serviceId))
  const bill = s.invoices.find(invoice => invoice.id === billId)
  const view = s.invoices.find(invoice => invoice.id === viewId)
  const paid = (invoice: Invoice) => paidTotal(s.financialMovements, 'Cobro', invoice.id)
  const invoiceCard = (invoice: Invoice) => {
    const billed = invoiceIsBilled(invoice), balance = Math.max(0, money(invoiceTotal(invoice) - paid(invoice)))
    return <article key={invoice.id} className="mt-4 rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-semibold">{billed ? `Factura ${invoice.electronicInvoice?.number || invoice.number}` : `Preparación de factura ${invoice.number}`}</h4><p className="mt-1 text-xs text-ink-soft">{billed ? 'Factura registrada' : 'Pendiente de facturación'} · {fmtDate(invoice.date)}</p></div><StatusPill estado={saleProgress(true, [invoice], s.financialMovements)} /></div>
      <dl className="my-4 grid gap-3 rounded-xl bg-canvas p-4 sm:grid-cols-3">{[[billed ? 'Total de la factura' : 'Importe por facturar', amount(invoiceTotal(invoice), invoice.currency)], ['Cobrado', amount(paid(invoice), invoice.currency)], ['Saldo por cobrar', amount(balance, invoice.currency)]].map(([label, value]) => <div key={label}><dt className="text-xs text-ink-soft">{label}</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl>
      <div className="flex flex-wrap gap-2"><Button variant="outline" aria-label={billed ? `Ver factura ${invoice.electronicInvoice?.number || invoice.number}` : `Ver preparación de factura ${invoice.number}`} onClick={() => setViewId(invoice.id)}><Eye /></Button>{!billed ? !closed && <Button onClick={() => setBillId(invoice.id)}>Registrar factura emitida</Button> : <>{invoice.electronicInvoice && <Button variant="outline" onClick={() => setBillId(invoice.id)}>Ver factura</Button>}{!closed && balance > 0 && <Button onClick={() => setPayId(invoice.id)}>Registrar cobro</Button>}<Button variant="outline" onClick={() => setLedgerId(invoice.id)}>Historial de cobros</Button></>}</div>
      {!billed && <p className="mt-3 text-xs text-ink-soft">Primero registra la factura emitida; después podrás registrar el cobro.</p>}
    </article>
  }

  if (ledgerId) return <FinancialLedger kind="Cobro" documentId={ledgerId} onBack={() => setLedgerId('')} />
  return <div>
    {campaign && <Button variant="ghost" className="mb-4 px-0" onClick={() => { if (clientId) setClientId(''); else setCampaignId(''); setSearch('') }}>{clientId ? '← Volver a clientes' : '← Volver a campañas'}</Button>}
    <PageHeader title={client && campaign ? client.empresa : campaign ? campaign.nombre : 'Facturación y cobros'} subtitle={client && campaign ? `${campaign.nombre} · Cargas registradas, facturas y cobros.` : campaign ? 'Clientes con cargas registradas y contratos de esta campaña.' : 'Campañas en proceso o con cargas registradas. Selecciona una campaña para consultar sus clientes.'} />

    {campaign && <><ClosedCampaignNotice campaignId={campaign.id} /><CampaignHistoryNotice campaignId={campaign.id} /></>}
    {campaign && !client && <section className="mb-6" aria-label="Resumen de cobros de la campaña"><div className="grid gap-4 md:grid-cols-3">{([{ label: 'Total facturado', field: 'invoiced', tone: 'plan' }, { label: 'Total cobrado', field: 'collected', tone: 'leaf' }, { label: 'Saldo por cobrar', field: 'balance', tone: 'mango' }] as const).map(card => <Kpi key={card.field} label={card.label} tone={card.tone} value={<div className="space-y-2 text-xl">{campaignTotals.length ? campaignTotals.map(row => <div key={row.currency}>{amount(row[card.field], row.currency)}</div>) : <span>Sin movimientos</span>}</div>} />)}</div><p className="mt-3 text-xs text-ink-soft">Incluye las facturas registradas y sus cobros de toda la campaña, también las anteriores. Excluye los importes aún por facturar. Los importes contratados se muestran por separado en la tabla.</p></section>}

    {!campaign ? <><div className="mb-5 max-w-md"><Field label="Buscar campaña"><Input placeholder="Nombre de campaña…" value={search} onChange={event => setSearch(event.target.value)} /></Field></div><Table head={['Campaña', 'Fruta', 'Estado', 'Cargas registradas', 'Acciones']}>{eligible.map(item => <tr key={item.id}><td className="p-4 font-semibold">{item.nombre}</td><td className="p-4">{item.fruta}</td><td className="p-4"><StatusPill estado={item.estado} /></td><td className="p-4">{allLoads.filter(load => load.link.campaignId === item.id).length} cargas</td><td className="p-4"><Button variant="outline" onClick={() => { setCampaignId(item.id); setSearch('') }}>Ver clientes →</Button></td></tr>)}{!eligible.length && <tr><td colSpan={5} className="p-8 text-center text-ink-soft">No hay campañas en proceso o con cargas registradas que coincidan con la búsqueda.</td></tr>}</Table></>
    : !client ? <><div className="mb-5 max-w-md"><Field label="Buscar cliente"><Input placeholder="Cliente o RUC…" value={search} onChange={event => setSearch(event.target.value)} /></Field></div><Table head={['Cliente', 'RUC', 'Cargas registradas', 'Kilos contratados', 'Precio total contratado', 'Acciones']}>{clients.map(item => {
      const deliveries = campaignLoads.filter(load => load.clientId === item.id)
      const contracts = campaignClientContracts(s, campaignId, item.id)
      return <tr key={item.id}><td className="p-4 font-semibold">{item.empresa}</td><td className="p-4">{item.ruc || 'Sin registrar'}</td><td className="p-4">{deliveries.length}</td><td className="whitespace-nowrap p-4">{fmtNum(contracts.kilos)} kg<p className="mt-1 text-xs text-ink-soft">{contracts.count} contratos</p></td><td className="p-4"><ContractAmounts summary={contracts} /></td><td className="p-4"><Button variant="outline" onClick={() => { setClientId(item.id); setSearch('') }}>{closed ? 'Ver facturas' : 'Facturar'}</Button></td></tr>
    })}{!clients.length && <tr><td colSpan={6} className="p-8 text-center text-ink-soft">Todavía no hay clientes con cargas registradas en esta campaña.</td></tr>}</Table><p className="mt-4 text-xs text-ink-soft">El contador incluye cada carga registrada del cliente, aunque su recepción siga pendiente. La preparación de la factura requiere peso, resultado y reporte de recepción en Logística.</p></>
    : <><section className="mb-5 rounded-xl border border-line bg-surface p-5"><h2 className="font-semibold">Información del cliente</h2><p className="mt-2 text-sm text-ink-soft">{client.empresa} · RUC {client.ruc || 'Sin registrar'}</p><p className="mt-1 text-sm text-ink-soft">{client.correo} · {client.telefono}</p><dl className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2"><div><dt className="text-xs text-ink-soft">Kilos contratados en esta campaña</dt><dd className="mt-1 font-semibold">{fmtNum(clientContracts.kilos)} kg · {clientContracts.count} contratos</dd></div><div><dt className="text-xs text-ink-soft">Precio total contratado en esta campaña</dt><dd className="mt-1"><ContractAmounts summary={clientContracts} /></dd></div></dl></section><div className="mb-5 rounded-xl bg-leaf-50 p-4 text-sm font-medium text-forest">Un viaje → preparar la factura con el peso recibido → registrar la factura emitida → uno o varios cobros</div><h2 className="mb-3 text-lg font-semibold">Cargas registradas del cliente ({loads.length})</h2><div className="space-y-3">{loads.map((load, index) => {
      const source = load.source
      const documents = invoices.filter(invoice => (source && invoice.deliveryId === source.deliveryId) || invoice.transportServiceId === load.serviceId)
      const pending = source ? source.reasons.filter(reason => !['Venta liquidada', 'Contrato liquidado'].includes(reason)) : [load.missingReason]
      const complete = documents.length > 0 || (!!source && (source.reasons.includes('Venta liquidada') || source.reasons.includes('Contrato liquidado')))
      const progress = saleProgress(load.received, documents, s.financialMovements)
      const receiptInfo = saleReceiptSummary(load.received, documents)
      const delivery = source && s.logisticsDeliveries.find(item => item.id === source.deliveryId)
      const weights = saleWeightSummary(delivery, documents)
      return <details key={load.key} className="rounded-xl border border-line bg-surface"><summary className="cursor-pointer p-4"><b>Carga {index + 1} · {load.reference}</b><span className="ml-3 text-xs text-ink-soft">{load.variety} · {fmtNum(load.loaded)} kg cargados</span><span className="mt-2 flex flex-wrap items-center gap-3"><span className="flex items-center gap-2">{documents.length > 0 && <span className="text-xs text-ink-soft">Factura:</span>}<StatusPill estado={progress} /></span><span className="text-xs text-ink-soft">Logística: {source || documents.length ? receiptInfo.label : 'Vínculo logístico pendiente'}</span></span></summary><div className="border-t border-line p-5">{receiptInfo.missingSupport && <div className="mb-4 rounded-xl bg-plan-50 p-4 text-sm"><p>La factura ya está registrada y conserva sus cobros. El respaldo de recepción no está registrado en Logística; el estado de cobro no confirma la recepción.</p>{!closed && source && <Button variant="outline" className="mt-3" onClick={() => openPending(source, 'Cobro', 'Pendiente de recepción documentada')}>Completar respaldo de recepción</Button>}</div>}<dl className={"mb-4 grid gap-3 "+(weights.invoiced !== undefined ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3")}>{[['Kilos cargados', `${fmtNum(load.loaded)} kg`], ['Kilos recibidos', weights.received !== undefined ? `${fmtNum(weights.received)} kg${!load.received ? ' · respaldo pendiente' : ''}` : 'No registrado en Logística'], ...(weights.invoiced !== undefined ? [['Kilos facturados', `${fmtNum(weights.invoiced)} kg`]] : []), ['Precio de venta', load.price ? `${amount(load.price, load.currency)} / kg` : 'Pendiente de precio']].map(([label, value]) => <div key={label}><dt className="text-xs text-ink-soft">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>)}</dl><p className="mb-4 text-xs text-ink-soft">Reporte de recepción: {documentName(source?.document) || (receiptInfo.missingSupport ? 'Sin respaldo registrado en Logística' : 'Pendiente de registrar')}</p>{!closed && !complete && (pending.length ? <>{source && <Button variant="outline" onClick={() => openPending(source, 'Cobro', !load.received ? 'Pendiente de recepción documentada' : undefined)}>{load.received ? 'Completar datos para facturar' : 'Completar recepción'}</Button>}<p className="mt-2 text-xs text-ink-soft">{pending.join(' · ')}</p></> : source && load.received && <Button onClick={() => setSourceKey(source.key)}>Preparar factura</Button>)}{documents.map(invoiceCard)}</div></details>
    })}</div>{!loads.length && <p className="rounded-xl border border-dashed border-line p-5 text-sm text-ink-soft">Este cliente no tiene cargas registradas en esta campaña. Sus documentos anteriores se conservan debajo.</p>}{historical.length > 0 && <section className="mt-6"><h2 className="mb-3 text-lg font-semibold">Documentos anteriores del cliente</h2>{historical.map(invoiceCard)}</section>}</>}
    {sourceKey && <SourceLiquidationModal kind="Cobro" initialKey={sourceKey} onCurrency={() => {}} onClose={() => setSourceKey('')} />}
    {bill && <SalesInvoiceModal invoice={bill} onClose={() => setBillId('')} />}
    {view && <FinancialDocumentView kind="Cobro" document={view} onClose={() => setViewId('')} />}
    {payId && <FinancialMovementModal kind="Cobro" fixedId={payId} onClose={() => setPayId('')} />}
  </div>
}

function ContractAmounts({ summary }: { summary: ReturnType<typeof campaignClientContracts> }) {
  if (!summary.count) return <span className="text-sm text-ink-soft">Sin contratos</span>
  return <div className="space-y-1">{summary.totals.map(row => <div key={row.currency} className="whitespace-nowrap"><span className="font-semibold">{row.missingPrices === row.count ? 'Precio pendiente' : amount(row.total, row.currency)}</span>{row.missingPrices > 0 && <p className="text-xs text-ink-soft">{row.missingPrices} contratos sin precio{row.missingPrices < row.count ? ' · total parcial' : ''}</p>}</div>)}</div>
}

function SalesInvoiceModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const s = useStore(), billed = invoiceIsBilled(invoice)
  const [number, setNumber] = useState(invoice.electronicInvoice?.number || ''), [date, setDate] = useState(invoice.electronicInvoice?.date || limaDate()), [due, setDue] = useState(invoice.due)
  const [document, setDocument] = useState(invoice.electronicInvoice?.document || ''), [verified, setVerified] = useState(false), [error, setError] = useState('')
  const save = () => {
    if (!verified) return setError('Verifica los datos de la factura antes de registrarla.')
    const updated: Invoice = { ...invoice, due, billingStatus: 'Facturada', electronicInvoice: { number: number.trim(), date, document: document.trim(), verifiedAt: new Date().toISOString() } }
    const issue = invoiceBillingIssue(updated, s.invoices)
    if (issue) return setError(issue)
    if (!s.saveInvoice(updated)) return setError('No se pudo registrar la factura. Revisa los datos y el estado de la preparación de factura.')
    s.toast('Factura registrada. Ya puedes registrar el cobro.'); onClose()
  }
  return <Modal open wide title={billed ? 'Factura registrada' : 'Registrar factura emitida'} onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Cerrar</Button>{!billed && <Button onClick={save}>Registrar factura</Button>}</>}>
    <div className="mb-4"><ChangeMark priority="media" code="H14">Registro de factura emitida externamente</ChangeMark><p className="mt-2 text-xs text-ink-soft">Este formulario registra un comprobante ya emitido. La emisión y validación ante SUNAT se realizan fuera del sistema.</p></div>
    <p className="mb-4 text-sm text-ink-soft">Según el flujo de Facturación al cliente: verificar información → generar factura en SUNAT → documentar la factura → notificar a Comercial y al cliente. Registra aquí la factura emitida para habilitar el cobro.</p>
    <p className="mb-5 rounded-xl bg-canvas p-4 font-semibold">Preparación de factura {invoice.number} · {amount(invoiceTotal(invoice), invoice.currency)}</p>
    <div className="grid gap-4 sm:grid-cols-3"><Field label="Número de factura"><Input readOnly={billed} value={number} onChange={event => setNumber(event.target.value)} placeholder="F001-000001" /></Field><Field label="Fecha de emisión"><Input readOnly={billed} type="date" value={date} onChange={event => setDate(event.target.value)} /></Field><Field label="Vencimiento"><Input readOnly={billed} type="date" value={due} onChange={event => setDue(event.target.value)} /></Field></div>
    <div className="mt-4"><Field label="Documento o referencia de la factura"><Input readOnly={billed} value={documentUrl(document)?documentName(document):document} onChange={event => setDocument(event.target.value)} placeholder="Referencia del documento emitido en SUNAT" /></Field>{documentUrl(document)&&<a className="mt-2 inline-block text-sm font-semibold text-forest underline" href={documentUrl(document)} target="_blank" rel="noopener noreferrer">Ver {documentName(document)}</a>}{!billed && <div className="mt-2"><FileDrop label="Seleccionar documento de factura" onFile={name => setDocument(name || '')} /></div>}</div>
    {!billed && <label className="mt-5 flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)} />Verifiqué los datos del cliente, la entrega y el importe de la factura emitida.</label>}
    {error && <p role="alert" className="mt-4 text-sm text-clay">{error}</p>}
  </Modal>
}
