import { CampaignClosureCard, CampaignHistoryNotice } from './campaign-closure'
import { ChangeMark } from './review-changes'
import { documentName, openStoredDocument } from './stored-documents'
import { masterIssue, contractIssue, receptionCloseIssue, certificationPaymentIssue, validBusinessDate } from './business-integrity'
import { useDemoState } from './persistence'
import { freightIssue } from './transport-freight'
import { AgreementReceipt } from './transport-receipt'
import { discardPercentage } from './driver-receipt-model'
import { ProviderReceiptBreakdown } from './provider-receipt'
import { DriverMobile, DISPATCH_STAGES, type DemoAccount } from './driver-mobile'
import { logisticsContext, logisticsDate, LogisticsDeliveryReadOnly, LOGISTICS_ADMIN_SECTIONS, type LogisticsAdminSection } from './logistics-overview'
import { LoadRegistrationSummary } from './load-registration'
import { WeeklyDeliveries } from './weekly-deliveries'
import { deliveryHasLoad, deliveryReady } from './quality-load-utils'
import { LoadTravelExpensesSummary } from './load-expenses'
import { QualityCampaignBrowser } from './quality-campaign'
import { ExportDeliveryStart, ExportHarvestFlow, ExportMtdSummary, exportMtdValues, exportReadiness } from './export-harvest'
import { IndustryLoads, IndustryGuides } from './industry-loads'
import { ProviderFarms, ProviderCertificates } from './provider-sections'
import { CampaignInterviewView } from './farms'
import { IndustryDeliveryStart, IndustryDeliverySummary, deliveryContext } from './industry-delivery'
import { Fragment, useMemo, useState, type ReactNode } from 'react'
import {
  useStore, certificationEstimatedKilos, FRUIT_CATALOG, FRUIT_NAMES, EXAM_TYPES,
  type Campaign, type CampaignStatus, type Provider, type Client, type ProviderKind,
  type CampaignProvider, type Finca, type DatoAgronomico, type EvaluationState, type Certification, type Transporter, type Vehicle, type Chofer,
  type QualityOperation, type QualityRoute,
  type LogisticsDelivery, type CampaignTransporter, type CampaignTransportService,
} from './store'
import {
  Button, StatusPill, Chip, Field, Input, TextArea, Select, SearchableSelect, FileDrop,
  Modal, Confirm, Kpi, Table, IconBtn, ActionsMenu, PageHeader, FilterBar, Tabs, fmtDate, fmtNum,
} from './ui'

const Eye = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
const Pen = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6L16 3Z" /><path d="m14 5 5 5" /></svg>
const Link = () => <span>🔗</span>

function ValidationTag() { return null }

function ProposalField({ children }: { children: ReactNode; note?: string }) { return <div>{children}</div> }

function ProposalHeader({ children }: { children: ReactNode }) { return <span>{children}</span> }

function TransportProposalField({ children }: { children: ReactNode; note?: string }) { return <div>{children}</div> }

function FlowValidationNote() { return null }

function DataLegend() { return null }

// ============================================================ CAMPAIGNS
export function CampaignsModule() {
  const s = useStore()
  const [q, setQ] = useState('')
  const [fruitFilter, setFruitFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState('')
  const [fi, setFi] = useState('')
  const [ff, setFf] = useState('')
  const [estado, setEstado] = useState<CampaignStatus>('Planificado')
  const [modal, setModal] = useState<null | { mode: 'new' | 'edit'; data?: Campaign }>(null)
  const [detail, setDetail] = useState<{ id: string; section: string } | null>(null)

  const rows = s.campaigns.filter(
    (c) =>
      c.nombre.toLowerCase().includes(q.toLowerCase()) &&
      c.estado === estado &&
      (!fruitFilter || c.fruta === fruitFilter) &&
      (!periodFilter || c.temporada.toLowerCase().includes(periodFilter.toLowerCase())) &&
      (!fi || c.fecha >= fi) &&
      (!ff || c.fechaFin <= ff),
  )
  const total = s.campaigns.length
  const done = s.campaigns.filter((c) => c.estado === 'Finalizado').length
  const proc = s.campaigns.filter((c) => c.estado === 'En Proceso').length

  if (detail) {
    const c = s.campaigns.find((x) => x.id === detail.id)
    if (c) return <CampaignDetail campaign={c} initialSection={detail.section} onBack={() => setDetail(null)} />
  }

  return (
    <div>
      <PageHeader
        title="Gestión de Campaña"
        subtitle="Planificación y seguimiento de campañas de exportación"
        action={<Button onClick={() => setModal({ mode: 'new' })}>+ Nueva Campaña</Button>}
      />
      <DataLegend />
      <p className="mb-4 text-sm text-ink-soft">La campaña pasa automáticamente a En proceso al llegar su fecha de inicio.</p>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="N° Campañas" value={total} tone="leaf" icon="🌱" />
        <Kpi label="Campañas completadas" value={done} tone="proc" icon="✓" />
        <Kpi label="Campañas en proceso" value={proc} tone="plan" icon="⟳" />
        <Kpi label="Req. comercial total (kg)" value={fmtNum(s.campaigns.reduce((a, c) => a + c.reqComercial, 0))} tone="mango" icon="⚖" />
      </div>

      <div className="mb-4">
        <Tabs
          tabs={['Planificado', 'En Proceso', 'Finalizado']}
          active={estado}
          onChange={(value) => setEstado(value as CampaignStatus)}
        />
        
      </div>

      <FilterBar onClear={() => { setQ(''); setFruitFilter(''); setPeriodFilter(''); setFi(''); setFf('') }}>
        <Field label="Buscador"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre de campaña…" /></Field>
        <Field label="Fruta"><Select value={fruitFilter} onChange={(e) => setFruitFilter(e.target.value)}><option value="">Todas</option>{FRUIT_NAMES.map((f) => <option key={f}>{f}</option>)}</Select></Field>
        <Field label="Período"><Input value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} placeholder="2025–2026" /></Field>
        <Field label="Fecha inicio"><Input type="date" value={fi} onChange={(e) => setFi(e.target.value)} /></Field>
        <Field label="Fecha fin"><Input type="date" value={ff} onChange={(e) => setFf(e.target.value)} /></Field>
      </FilterBar>

      <Table head={['Nombre campaña', 'Fruta', <ProposalHeader>Fecha con día específico</ProposalHeader>, 'Requerimiento comercial', 'Estado', 'Acciones']}>
        {rows.map((c, i) => (
          <tr key={c.id} className="animate-row hover:bg-leaf-50/40" style={{ animationDelay: `${i * 30}ms` }}>
            <td className="px-4 py-3"><div className="font-medium text-ink">{c.nombre}</div><div className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink">{c.temporada} <ValidationTag /></div></td>
            <td className="px-4 py-3"><span className="rounded bg-mango-50 px-1.5 py-0.5 text-xs font-medium text-clay">{c.fruta}</span></td>
            <td className="px-4 py-3 font-mono text-xs text-ink-soft">{fmtDate(c.fecha)} → {fmtDate(c.fechaFin)}</td>
            <td className="px-4 py-3 font-mono text-ink">{fmtNum(c.reqComercial)} kg</td>
            <td className="px-4 py-3"><StatusPill estado={c.estado} /></td>
            <td className="px-4 py-3">
              <div className="flex gap-1.5">
                {c.estado !== 'Finalizado' && <IconBtn title={`Editar campaña ${c.nombre}`} onClick={() => setModal({ mode: 'edit', data: c })}><Pen /></IconBtn>}
                <IconBtn title={`Ver detalle de ${c.nombre}`} onClick={() => setDetail({ id: c.id, section: 'Datos generales' })}><Eye /></IconBtn>
                {c.estado === 'Planificado' && <ActionsMenu title={`Más opciones de ${c.nombre}`} items={['Proveedores', 'Certificaciones', 'Clientes', 'Programa semanal de entregas'].map((section) => ({ label: section, onClick: () => setDetail({ id: c.id, section }) }))} />}
                {c.estado === 'En Proceso' && <ActionsMenu title={`Más opciones de ${c.nombre}`} items={['Transportistas', 'Entregas', 'Programa semanal de entregas'].map(section => ({ label: section, onClick: () => setDetail({ id: c.id, section }) }))} />}
              </div>
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-soft">No hay campañas que coincidan con los filtros.</td></tr>}
      </Table>

      {modal && <CampaignModal mode={modal.mode} data={modal.data} onClose={() => setModal(null)} />}
    </div>
  )
}

function CampaignModal({ mode, data, onClose }: { mode: 'new' | 'edit'; data?: Campaign; onClose: () => void }) {
  const s = useStore()
  const [nombre, setNombre] = useState(data?.nombre ?? '')
  const [temporada, setTemporada] = useState(data?.temporada ?? '')
  const [fecha, setFecha] = useState(data?.fecha ?? '')
  const [fechaFin, setFechaFin] = useState(data?.fechaFin ?? '')
  const [req, setReq] = useState(String(data?.reqComercial ?? ''))
  const [frutas, setFrutas] = useState<string[]>(data?.frutas ?? (data?.fruta ? [data.fruta] : []))
  const [fruitChoice, setFruitChoice] = useState('')
  const [responsable, setResponsable] = useState(data?.responsable ?? '')
  const [lineamientos, setLineamientos] = useState(data?.lineamientos ?? '')
  const [observaciones, setObservaciones] = useState(data?.observaciones ?? '')
  const [formError, setFormError] = useState('')

  const derivadas = Array.from(new Set(frutas.flatMap((fruit) => FRUIT_CATALOG[fruit] ?? [])))

  const save = () => {
    if (!frutas.length) { setFormError('Selecciona al menos una fruta para la campaña.'); return }
    if (fecha && fechaFin && fechaFin < fecha) {
      setFormError('La fecha prevista de fin debe ser posterior a la fecha de inicio.')
      return
    }
    if (req && Number(req) <= 0) {
      setFormError('El requerimiento comercial debe ser una cantidad positiva.')
      return
    }
    const campaignIssue = masterIssue('campaigns', { id:data?.id, nombre, fecha, fechaFin, fruta:frutas[0], reqComercial:Number(req) }, s.campaigns, data)
    if(campaignIssue){setFormError(campaignIssue);return}
    const payload = {
      nombre, temporada, fecha, fechaFin, fruta: frutas[0] ?? '', frutas, derivadas, responsable, lineamientos, observaciones,
      reqComercial: Number(req) || 0,
    }
    if (mode === 'new') {
      s.addCampaign({ ...payload, kilosProductores: 0, kilosCosechados: null, estado: 'Planificado' })
      s.toast('Campaña registrada correctamente')
    } else if (data) {
      s.updateCampaign(data.id, payload)
      s.toast('Cambios guardados correctamente')
    }
    onClose()
  }

  return (
    <Modal
      open onClose={onClose} wide
      title={mode === 'new' ? 'Registrar campaña' : 'Editar campaña'}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save}>{mode === 'new' ? 'Crear' : 'Guardar'}</Button></>}
    >
      <DataLegend />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre de campaña"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Mango 2026" /></Field>
        <ProposalField note="El año o temporada no figura como campo independiente."><Field label="Año o temporada"><Input value={temporada} onChange={(e) => setTemporada(e.target.value)} placeholder="2025–2026" /></Field></ProposalField>
        <Field label="Requerimiento comercial (kg)"><Input type="number" min="1" value={req} onChange={(e) => setReq(e.target.value)} placeholder="3000" /></Field>
        <Field label="Responsable"><Input value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="Nombre del administrador" /></Field>
        <ProposalField note="La BD representa estas fechas con precisión mes/año."><Field label="Fecha de inicio con día"><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field></ProposalField>
        <ProposalField note="La BD representa estas fechas con precisión mes/año."><Field label="Fecha de fin con día"><Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} /></Field></ProposalField>
        <div><Field label="Seleccionar frutas"><SearchableSelect options={FRUIT_NAMES.filter((fruit) => !frutas.includes(fruit))} value={fruitChoice} onChange={(value) => { setFrutas((current) => [...current, value]); setFruitChoice('') }} placeholder="Agregar fruta…" /></Field><div className="mt-2 flex flex-wrap gap-2">{frutas.map((fruit) => <Chip key={fruit} onRemove={() => { setFrutas((current) => current.filter((item) => item !== fruit)) }}>{fruit}</Chip>)}</div></div>
        <div className="rounded-xl border border-line bg-canvas/60 p-3"><div className="text-xs font-semibold uppercase text-ink-soft">Frutas derivadas / variedades</div><div className="mt-2 flex flex-wrap gap-2">{derivadas.map((item) => <Chip key={item}>{item}</Chip>)}{!derivadas.length && <span className="text-sm text-ink-soft">Selecciona una fruta para ver todas sus variedades.</span>}</div></div>
      </div>
      <div className="mt-4 grid gap-4">
        <div><Field label="Lineamientos"><FileDrop label={lineamientos || 'Subir archivo de lineamientos'} onFile={(name) => setLineamientos(name ?? '')} /></Field>{lineamientos && <div className="mt-2 flex gap-2"><Button variant="outline" onClick={() => void openStoredDocument(lineamientos,false).catch(e=>s.toast(e.message))}>Ver</Button><Button variant="ghost" onClick={() => void openStoredDocument(lineamientos,true).catch(e=>s.toast(e.message))}>Descargar</Button><span className="text-xs text-ink-soft self-center">Usa el cargador para reemplazar.</span></div>}</div>
        <Field label="Observaciones generales"><TextArea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} /></Field>
      </div>
      <div className="mt-4"><ApprovedBdNote /></div>

      {formError && <div className="mt-4 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">{formError}</div>}
    </Modal>
  )
}

// ------------------------------ CAMPAIGN DETAIL
function CampaignDetail({ campaign, initialSection, onBack }: { campaign: Campaign; initialSection: string; onBack: () => void }) {
  const s = useStore()
  const c = s.campaigns.find((x) => x.id === campaign.id)!

  return (
    <div>
      <Button variant="ghost" className="mb-4 px-0" onClick={onBack}>← Volver al listado</Button>
      <DataLegend />
      <div className="mb-5 rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-ink">{initialSection === 'Datos generales' ? c.nombre : `${initialSection} — ${c.nombre}`}</h1>
              <StatusPill estado={c.estado} />
            </div>
            <p className="mt-1 text-xs text-ink-soft">{c.frutas.join(', ')} · <span className="text-ink">{c.temporada} <ValidationTag /></span> · <span className="text-ink">{fmtDate(c.fecha)} → {fmtDate(c.fechaFin)} <ValidationTag /></span></p>
            <p className="mt-2 text-sm text-ink-soft">Responsable: <b className="text-ink">{c.responsable}</b></p>
            <div className="mt-2 flex flex-wrap items-center gap-2">{c.derivadas.map((d) => <Chip key={d}>{d}</Chip>)}</div>
            
          </div>
        </div>
      </div>

      {initialSection === 'Datos generales' && <><CampaignClosureCard campaignId={c.id} /><CampaignHistoryNotice campaignId={c.id} /><CampaignOverview campaign={c} /></>}
      {initialSection === 'Proveedores' && <PlanCampaignProviders campaign={c} />}
      {initialSection === 'Certificaciones' && <PlanCampaignCertifications campaign={c} />}
      {initialSection === 'Clientes' && <PlanCampaignClients campaign={c} />}
      {initialSection === 'Programa semanal de entregas' && <WeeklyDeliveries campaign={c} />}
      {initialSection === 'Transportistas' && c.estado === 'En Proceso' && <CampaignTransporters campaign={c} />}
      {initialSection === 'Entregas' && c.estado === 'En Proceso' && <CampaignDeliveries campaign={c} />}
    </div>
  )
}

function CampaignTransporters({ campaign }: { campaign: Campaign }) {
  const s = useStore()
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState('')
  const [quotation, setQuotation] = useState('')
  const [agreementFor, setAgreementFor] = useState<string | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)
  const links = s.campaignTransporters.filter((item) => item.campaignId === campaign.id)
  const available = s.transporters.filter((company) => !links.some((item) => item.transporterId === company.id))
  const label = (company: Transporter) => `${company.empresa} · ${company.tipo === 'Privado' ? 'Privado · ' + (company.documentoIdentidad || '') : 'Público · RUC ' + company.ruc}`
  const selected = available.find((company) => label(company) === choice)
  const viewed = s.transporters.find((company) => company.id === viewId)
  return <div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-lg font-semibold">Transportistas por campaña</h2><p className="mt-1 text-sm text-ink-soft">Transportistas públicos y privados vinculados durante la ejecución. Registra el acuerdo de pago desde los tres puntos de cada transportista.</p></div><Button onClick={() => { setChoice(''); setQuotation(''); setOpen(true) }}>+ Vincular transportista</Button></div>
    <Table head={['Transportista', 'Documento', 'Ubicación', 'Teléfono', 'Correo', 'Fecha de vinculación', 'Acuerdo de pago', 'Acciones']}>
      {links.map((item) => {
        const company = s.transporters.find((company) => company.id === item.transporterId)!
        return <tr key={item.id}><td className="px-4 py-3 font-medium">{company.empresa}</td><td className="px-4 py-3">{company.tipo === 'Privado' ? company.documentoIdentidad : company.ruc}</td><td className="px-4 py-3">{[company.departamento, company.provincia, company.ciudad].filter(Boolean).join(' · ') || '—'}</td><td className="px-4 py-3">{company.numero}</td><td className="px-4 py-3">{company.correo}</td><td className="px-4 py-3">{fmtDate(item.fecha)}</td><td className="px-4 py-3">{item.paymentAgreement ? 'Registrado' : 'Sin registrar'}</td><td className="px-4 py-3"><div className="flex gap-2"><IconBtn title={`Ver transportista ${company.empresa}`} onClick={() => setViewId(company.id)}><Eye /></IconBtn><ActionsMenu title={`Más opciones de transportista ${company.empresa}`} items={[{ label: 'Acuerdo de pago', onClick: () => setAgreementFor(item.id) }]} /></div></td></tr>
      })}
      {!links.length && <tr><td colSpan={8} className="p-8 text-center text-sm text-ink-soft">Sin transportistas vinculados a esta campaña.</td></tr>}
    </Table>
    {agreementFor && <TransportPaymentAgreementModal linkId={agreementFor} onClose={() => setAgreementFor(null)} />}
    {open && <Modal open onClose={() => setOpen(false)} title="Vincular transportista" footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={!selected || !quotation} onClick={() => { if (!selected || !quotation) return; s.linkCampaignTransporter(campaign.id, selected.id, quotation); s.toast('Transportista vinculado a la campaña'); setOpen(false) }}>Vincular</Button></>}>
      <p className="mb-4 text-sm font-medium">{campaign.nombre} · En proceso</p>
      <Field label="Transportista"><SearchableSelect options={available.map(label)} value={choice} onChange={value=>{setChoice(value);setQuotation('')}} placeholder="Buscar empresa o RUC…" /></Field>
      <div className="mt-4"><FileDrop key={choice} label={quotation || 'Adjuntar cotización'} onFile={name=>setQuotation(name || '')}/><p className="mt-2 text-xs text-ink-soft">Adjunta la cotización enviada por el transportista para vincularlo a esta campaña.</p></div>
      {!available.length && <p className="mt-3 text-sm text-ink-soft">Todas las empresas registradas ya están vinculadas.</p>}
      {selected && <div className="mt-4 rounded-xl bg-canvas p-4 text-sm"><div>{[selected.departamento, selected.provincia, selected.ciudad].filter(Boolean).join(' · ')}</div><div className="mt-2">{selected.numero} · {selected.correo}</div></div>}
    </Modal>}
    {viewed && <Modal open onClose={() => setViewId(null)} title="Datos del transportista" footer={<Button variant="outline" onClick={() => setViewId(null)}>Cerrar</Button>}><h3 className="font-display text-lg font-semibold">{viewed.empresa}</h3><div className="mt-4 grid gap-3">{[['Cotización de esta campaña', links.find(link=>link.transporterId===viewed.id)?.quotation || 'Sin documento adjunto'], ['Tipo', viewed.tipo === 'Privado' ? 'Privado · Independiente' : 'Público · Empresa'], ['Documento', viewed.tipo === 'Privado' ? viewed.documentoIdentidad : viewed.ruc], ['Teléfono', viewed.numero], ['Correo', viewed.correo], ['Ubicación', [viewed.departamento, viewed.provincia, viewed.ciudad].filter(Boolean).join(' · ')]].map(([name, value]) => <div key={name}><div className="text-xs text-ink-soft">{name}</div><div className="text-sm">{value || '—'}</div></div>)}</div></Modal>}
  </div>
}

function TransportPaymentAgreementModal({ linkId, onClose }: { linkId: string; onClose: () => void }) {
  const s = useStore()
  const link = s.campaignTransporters.find(l => l.id === linkId)!
  const agreement = link.paymentAgreement
  const locked = s.settlements.some(d => d.transportLinkId === linkId)||s.financialMovements.some(m=>m.transportAdvanceLinkId===linkId)
  const [form, setForm] = useState({ type: agreement?.type || 'Adelanto' as 'Adelanto' | 'Completo', total: String(agreement?.total || ''), advance: String(agreement?.advance || ''), due: agreement?.due || '', currency: agreement?.currency || 'PEN', receipt: agreement?.receipt || '' })
  const [error, setError] = useState('')
  const update = (next: typeof form) => { setError(''); setForm(next) }
  return <Modal open wide title="Acuerdo de pago" onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>{locked ? 'Cerrar' : 'Cancelar'}</Button>{!locked && <Button onClick={() => { if (!s.saveTransportPaymentAgreement(linkId, { ...form, receipt: link.paymentAgreement?.receipt||form.receipt, receiptAttachmentId:link.paymentAgreement?.receiptAttachmentId,total: Number(form.total), advance: form.type === 'Completo' ? 0 : Number(form.advance) })) { setError('Completa un total mayor a cero, fecha acordada y un adelanto que no supere el total.'); return } s.toast('Acuerdo de pago guardado'); onClose() }}>Guardar acuerdo</Button>}</>}>
    <div className="mb-4 rounded-xl bg-canvas p-4"><b>{s.transporters.find(t => t.id === link.transporterId)?.empresa}</b><p className="text-sm text-ink-soft">{s.campaigns.find(c => c.id === link.campaignId)?.nombre}</p></div>
    <p className="mb-4 text-sm text-ink-soft">Estas condiciones se consultarán al liquidar al transportista. El pago efectivo se registra en Liquidación de compra.</p>
    {locked && <p className="mb-4 rounded-lg bg-leaf-50 p-3 text-sm">Este acuerdo ya tiene una liquidación registrada y se muestra solo para consulta.</p>}
    <fieldset disabled={locked} className="grid gap-4 sm:grid-cols-2"><Field label="Tipo de pago"><Select aria-label="Tipo de pago del acuerdo" value={form.type} onChange={e => update({ ...form, type: e.target.value as 'Adelanto' | 'Completo' })}><option>Adelanto</option><option>Completo</option></Select></Field><Field label="Moneda"><Select value={form.currency} onChange={e => update({ ...form, currency: e.target.value })}><option>USD</option><option>PEN</option><option>EUR</option></Select></Field><Field label="Cantidad total"><Input type="number" min="0" value={form.total} onChange={e => update({ ...form, total: e.target.value })}/></Field>{form.type === 'Adelanto' && <Field label="Monto de adelanto acordado"><Input type="number" min="0" value={form.advance} onChange={e => update({ ...form, advance: e.target.value })}/></Field>}<Field label="Fecha acordada (pago final)"><Input type="date" value={form.due} onChange={e => update({ ...form, due: e.target.value })}/></Field></fieldset>
    {form.type==='Adelanto'&&<div className="mt-4"><AgreementReceipt linkId={linkId} editable/></div>}
    {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
  </Modal>
}

function CampaignTransportServices({ linkId, onBack }: { linkId: string; onBack: () => void }) {
  const s = useStore()
  const link = s.campaignTransporters.find((item) => item.id === linkId)!
  const company = s.transporters.find((item) => item.id === link.transporterId)!
  const campaign = s.campaigns.find((item) => item.id === link.campaignId)!
  const [edit, setEdit] = useState<{ service?: CampaignTransportService } | null>(null)
  const [view, setView] = useState<CampaignTransportService | null>(null)
  return <div>
    <Button variant="ghost" className="mb-4 px-0" onClick={onBack}>← Volver a transportistas</Button>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-lg font-semibold">Servicios de transporte · {company.empresa}</h2><p className="mt-1 text-sm text-ink-soft">{campaign.nombre} · Camión y chofer asignados por servicio.</p></div><Button onClick={() => setEdit({})}>+ Registrar servicio</Button></div>
    <Table head={['Servicio', 'Camión / placa', 'Chofer', 'Fechas', 'Origen', 'Destino', 'Estado', 'Acciones']}>
      {link.services.map((item, index) => <tr key={item.id}><td className="px-4 py-3 font-medium">Servicio {index + 1}</td><td className="px-4 py-3">{company.vehiculos.find((vehicle) => vehicle.id === item.vehicleId)?.placa}</td><td className="px-4 py-3">{company.choferes.find((driver) => driver.id === item.driverId)?.nombre}</td><td className="px-4 py-3">{fmtDate(item.start)} → {fmtDate(item.end)}</td><td className="px-4 py-3">{item.origin}</td><td className="px-4 py-3">{item.destination}</td><td className="px-4 py-3"><StatusPill estado={item.movements?.[item.movements.length - 1]?.stage || 'Planificado'} /></td><td className="px-4 py-3"><div className="flex gap-1"><IconBtn title={`Ver servicio ${index + 1}`} onClick={() => setView(item)}><Eye /></IconBtn><IconBtn title={`Editar servicio ${index + 1}`} onClick={() => setEdit({ service: item })}><Pen /></IconBtn></div></td></tr>)}
      {!link.services.length && <tr><td colSpan={8} className="p-8 text-center text-sm text-ink-soft">Sin servicios registrados. Registra un servicio para asignar camión y chofer.</td></tr>}
    </Table>
    {edit && <CampaignTransportServiceModal link={link} service={edit.service} onClose={() => setEdit(null)} />}
    {view && <Modal open onClose={() => setView(null)} title="Detalle del servicio" footer={<Button variant="outline" onClick={() => setView(null)}>Cerrar</Button>}><p className="mb-4 text-sm font-medium">{company.empresa} · {campaign.nombre}</p><div className="grid gap-4 sm:grid-cols-2">{[['Camión / placa', company.vehiculos.find((item) => item.id === view.vehicleId)?.placa], ['Chofer', company.choferes.find((item) => item.id === view.driverId)?.nombre], ['Inicio', fmtDate(view.start)], ['Fin', fmtDate(view.end)], ['Origen', view.origin], ['Destino', view.destination], ['Condiciones', view.conditions]].map(([name, value]) => <div key={name}><div className="text-xs text-ink-soft">{name}</div><div className="mt-1 text-sm">{value || '—'}</div></div>)}</div></Modal>}
  </div>
}

function CampaignTransportSection({ linkId, section, onBack }: { linkId: string; section: 'Seguimiento' | 'Guía, kilos y gastos'; onBack: () => void }) {
  const s = useStore()
  const link = s.campaignTransporters.find((item) => item.id === linkId)!
  const company = s.transporters.find((item) => item.id === link.transporterId)!
  const [serviceId, setServiceId] = useState('')
  const [registerOpen, setRegisterOpen] = useState(false)
  const active = link.services.find((item) => item.id === serviceId) || link.services[0]
  if (active) return <CampaignTransportExecution key={`${section}-${active.id}`} linkId={linkId} serviceId={active.id} section={section === 'Seguimiento' ? 'Seguimiento del viaje' : section} onBack={onBack} backLabel="← Volver a transportistas" onChooseService={setServiceId} />
  return <div>
    <Button variant="ghost" className="mb-4 px-0" onClick={onBack}>← Volver a transportistas</Button>
    <h2 className="font-display text-lg font-semibold">{section} · {company.empresa}</h2>
    <div className="mt-4 rounded-xl border border-proc/30 bg-proc-50 p-5"><h3 className="font-semibold">Primero registra un servicio</h3><p className="mt-2 text-sm">Para registrar {section === 'Seguimiento' ? 'los movimientos del viaje' : 'la guía, los kilos y los gastos'}, necesitas un servicio con camión, chofer, fechas y recorrido.</p><Button className="mt-4" onClick={() => setRegisterOpen(true)}>+ Registrar servicio</Button></div>
    {registerOpen && <CampaignTransportServiceModal link={link} onClose={() => setRegisterOpen(false)} />}
  </div>
}

function CampaignTransportServiceModal({ link, service, onClose }: { link: CampaignTransporter; service?: CampaignTransportService; onClose: () => void }) {
  const s = useStore()
  const company = s.transporters.find((item) => item.id === link.transporterId)!
  const campaign = s.campaigns.find((item) => item.id === link.campaignId)!
  const [form, setForm] = useState({ vehicleId: service?.vehicleId || '', driverId: service?.driverId || '', start: service?.start || '', end: service?.end || '', origin: service?.origin || '', destination: service?.destination || '', conditions: service?.conditions || '', operationId: service?.operationId || '' })
  const [error, setError] = useState('')
  const save = () => {
    if (!form.vehicleId || !form.driverId || !form.start || !form.end || !form.origin.trim() || !form.destination.trim()) { setError('Selecciona camión y chofer e indica fechas, origen y destino.'); return }
    if (form.end < form.start) { setError('La fecha de fin no puede ser anterior al inicio.'); return }
    s.saveCampaignTransportService(link.id, { ...service, ...form, id: service?.id })
    s.toast(service ? 'Servicio actualizado' : 'Servicio registrado con camión y chofer'); onClose()
  }
  return <Modal open wide onClose={onClose} title={service ? 'Editar servicio de transporte' : 'Registrar servicio de transporte'} footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={!company.vehiculos.length || !company.choferes.length} onClick={save}>Guardar servicio</Button></>}>
    <p className="mb-4 rounded-xl bg-canvas p-4 text-sm font-medium">{company.empresa} · {campaign.nombre}</p>
    {(!company.vehiculos.length || !company.choferes.length) && <p className="mb-4 rounded-lg border border-proc/30 bg-proc-50 p-3 text-sm">Registra primero los camiones y choferes de esta empresa en Gestión de transporte.</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Camión"><Select aria-label="Camión" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}><option value="">Seleccionar camión</option>{company.vehiculos.map((item) => <option key={item.id} value={item.id}>{item.placa} · {item.capacidad}</option>)}</Select></Field>
      <Field label="Chofer"><Select aria-label="Chofer" value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}><option value="">Seleccionar chofer</option>{company.choferes.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</Select></Field>
      <Field label="Fecha de inicio"><Input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
      <Field label="Fecha de fin"><Input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field>
      <Field label="Origen"><Input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></Field>
      <Field label="Destino"><Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></Field>
      <div className="sm:col-span-2"><Field label="Operación de cosecha / acopio"><Select aria-label="Operación de cosecha / acopio" value={form.operationId} onChange={(e) => setForm({ ...form, operationId: e.target.value })}><option value="">Sin operación vinculada</option>{s.qualityOperations.filter((item) => item.campaignId === campaign.id).map((item) => <option key={item.id} value={item.id}>{item.reference} · {item.origin}</option>)}</Select></Field></div>
      <div className="sm:col-span-2"><Field label="Condiciones del servicio"><TextArea value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} /></Field></div>
    </div>
    {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
  </Modal>
}

export function CampaignTransportExecution({ linkId, serviceId, section, onBack, backLabel = '← Volver a servicios', onChooseService }: { linkId: string; serviceId: string; section: 'Seguimiento del viaje' | 'Guía, kilos y gastos'; onBack: () => void; backLabel?: string; onChooseService?: (id: string) => void }) {
  const s = useStore()
  const link = s.campaignTransporters.find((item) => item.id === linkId)!
  const service = link.services.find((item) => item.id === serviceId)!
  const company = s.transporters.find((item) => item.id === link.transporterId)!
  const operation = s.qualityOperations.find((item) => item.id === service.operationId)
  const events = service.movements || []
  const stages = ['En recojo', 'Despachado', 'Llegada'] as const
  const next = stages[events.length]
  const [movementOpen, setMovementOpen] = useState(false)
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [documentsOpen, setDocumentsOpen] = useState(false)
  const status = events[events.length - 1]?.stage || 'Planificado'
  const docs = service.documents
  const totalCosts = [docs?.freight, docs?.stevedoring, docs?.tickets, docs?.food].reduce<number>((sum, item) => sum + (Number(item) || 0), 0)
  return <div>
    <Button variant="ghost" className="mb-4 px-0" onClick={onBack}>{backLabel}</Button>
    {onChooseService && <div className="mb-4 max-w-xl"><Field label="Servicio / viaje"><Select aria-label="Servicio / viaje" value={serviceId} onChange={(e) => onChooseService(e.target.value)}>{link.services.map((item, index) => <option key={item.id} value={item.id}>Servicio {index + 1} · {company.vehiculos.find((vehicle) => vehicle.id === item.vehicleId)?.placa} · {item.origin} → {item.destination} · {fmtDate(item.start)}</option>)}</Select></Field></div>}
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-lg font-semibold">{section}</h2><p className="mt-1 text-sm text-ink-soft">{company.empresa} · {company.vehiculos.find((item) => item.id === service.vehicleId)?.placa} · {company.choferes.find((item) => item.id === service.driverId)?.nombre}</p><p className="mt-1 text-sm text-ink-soft">{service.origin} → {service.destination}</p></div>{section === 'Seguimiento del viaje' ? next && s.campaigns.find(c => c.id === link.campaignId)?.estado === 'En Proceso' && <Button onClick={() => { setDate(''); setNotes(''); setError(''); setMovementOpen(true) }}>Registrar {next === 'En recojo' ? 'recojo' : next === 'Despachado' ? 'despacho' : 'llegada'}</Button> : <Button onClick={() => setDocumentsOpen(true)}>{docs ? 'Editar guía y gastos' : 'Registrar guía y gastos'}</Button>}</div>
    {section === 'Seguimiento del viaje' ? <>
      <div className="mb-5 grid gap-3 sm:grid-cols-4">{['Planificado', ...stages].map((stage, index) => <div key={stage} className={`rounded-xl border p-4 ${index <= events.length ? 'border-leaf/30 bg-leaf-50' : 'border-line bg-surface'}`}><div className="text-xs text-ink-soft">Paso {index + 1}</div><div className="mt-1 font-semibold">{stage}</div><div className="mt-2 text-xs text-ink-soft">{index === 0 ? `${fmtDate(service.start)} → ${fmtDate(service.end)}` : events[index - 1]?.date ? new Date(events[index - 1].date).toLocaleString('es-PE') : 'Pendiente'}</div></div>)}</div>
      <Table head={['Movimiento', 'Fecha y hora', 'Observaciones']}>{events.map((event) => <tr key={event.id}><td className="px-4 py-3"><StatusPill estado={event.stage} /></td><td className="px-4 py-3">{new Date(event.date).toLocaleString('es-PE')}</td><td className="px-4 py-3">{event.observations || '—'}</td></tr>)}{!events.length && <tr><td colSpan={3} className="p-8 text-center text-sm text-ink-soft">La carga está planificada. Registra el recojo para iniciar el viaje.</td></tr>}</Table>
      {status === 'Llegada' && <p className="mt-4 rounded-lg bg-leaf-50 p-4 text-sm">Llegada registrada. La descarga y evaluación de la fruta continúan en Logística y despacho.</p>}
    </> : <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Operación relacionada', operation?.reference || 'Sin operación vinculada'], ['Kilos cargados en origen', operation ? `${fmtNum(operation.loadedQuantity)} kg` : docs?.loadedKg ? `${fmtNum(Number(docs.loadedKg))} kg` : 'Sin registrar'], ['Kilos recibidos en planta', operation?.plantQuantity ? `${fmtNum(operation.plantQuantity)} kg` : 'Pendiente de recepción'], ['Estado del viaje', status]].map(([label, value]) => <div key={label} className="rounded-xl border border-line bg-surface p-4"><div className="text-xs text-ink-soft">{label}</div><div className="mt-1 font-semibold">{value}</div></div>)}</div>
      <p className="mb-4 text-sm text-ink-soft">Los pesos de una operación vinculada se consultan desde cosecha y recepción.</p>
      <div className="mb-5 rounded-xl border border-line bg-surface p-4"><h3 className="font-semibold">Guía de remisión</h3><div className="mt-2 text-sm">{docs?.guide || operation?.transport?.guide || 'Sin documento'}</div>{(docs?.guide || operation?.transport?.guide) && <div className="mt-3 flex gap-2"><Button variant="outline" onClick={() => s.toast('Vista de documento simulada en el prototipo')}>Ver documento</Button><Button variant="ghost" onClick={() => s.toast('Descarga simulada en el prototipo')}>Descargar</Button></div>}</div>
      <Table head={['Concepto', 'Importe']}>{[['Flete', docs?.freight], ['Estibas', docs?.stevedoring], ['Pasajes', docs?.tickets], ['Comida', docs?.food]].map(([label, value]) => <tr key={label}><td className="px-4 py-3">{label}</td><td className="px-4 py-3">{value ? `${docs?.currency || 'PEN'} ${fmtNum(Number(value))}` : 'Sin registrar'}</td></tr>)}</Table>
      <p className="mt-3 text-sm font-semibold">Total registrado: {docs?.currency || 'PEN'} {fmtNum(totalCosts)}</p><p className="mt-2 text-sm text-ink-soft">SCTR: {docs?.sctr || 'Sin información'}</p>{docs?.observations && <p className="mt-2 text-sm">{docs.observations}</p>}
    </>}
    {movementOpen && next && <Modal open onClose={() => setMovementOpen(false)} title={`Registrar ${next === 'En recojo' ? 'recojo' : next === 'Despachado' ? 'despacho' : 'llegada'}`} footer={<><Button variant="outline" onClick={() => setMovementOpen(false)}>Cancelar</Button><Button onClick={() => { if (!date) { setError('Indica la fecha y hora del movimiento.'); return } if (events.length && date < events[events.length - 1].date) { setError('El movimiento no puede ser anterior al movimiento previo.'); return } s.saveCampaignTransportService(linkId, { ...service, movements: [...events, { id: Math.random().toString(36).slice(2), stage: next, date, observations: notes }] }); s.toast('Movimiento registrado'); setMovementOpen(false) }}>Guardar movimiento</Button></>}><div className="grid gap-4"><Field label="Fecha y hora"><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /></Field><Field label="Observaciones"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></div>{error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}</Modal>}
    {documentsOpen && <CampaignTransportDocumentsModal linkId={linkId} service={service} onClose={() => setDocumentsOpen(false)} />}
  </div>
}

function CampaignTransportDocumentsModal({ linkId, service, onClose }: { linkId: string; service: CampaignTransportService; onClose: () => void }) {
  const s = useStore()
  const operation = s.qualityOperations.find((item) => item.id === service.operationId)
  const [form, setForm] = useState(service.documents || { guide: operation?.transport?.guide || '', loadedKg: '', freight: '', currency: 'PEN', sctr: '', stevedoring: '', tickets: '', food: '', observations: '' })
  const [error, setError] = useState('')
  const set = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value })
  const save = () => { if (['loadedKg', 'freight', 'stevedoring', 'tickets', 'food'].some((key) => { const value = form[key as keyof typeof form]; return value && (!Number.isFinite(Number(value)) || Number(value) < 0) })) { setError('Los kilos e importes deben ser números iguales o mayores a cero.'); return } s.saveCampaignTransportService(linkId, { ...service, documents: form }); s.toast('Guía y gastos guardados'); onClose() }
  return <Modal open wide onClose={onClose} title="Guía, kilos y gastos del servicio" footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save}>Guardar guía y gastos</Button></>}><div className="grid gap-4 sm:grid-cols-2">
    <div className="sm:col-span-2"><Field label="Guía de remisión"><FileDrop label={form.guide || 'Adjuntar guía'} onFile={(name) => set('guide', name || '')} /></Field></div>
    <Field label="Kilos cargados en origen"><Input type="number" min="0" readOnly={!!operation} value={operation ? operation.loadedQuantity : form.loadedKg} onChange={(e) => set('loadedKg', e.target.value)} /></Field><Field label="Moneda"><Select value={form.currency} onChange={(e) => set('currency', e.target.value)}><option>PEN</option><option>USD</option><option>EUR</option></Select></Field>
    {([['Flete', 'freight'], ['Estibas', 'stevedoring'], ['Pasajes', 'tickets'], ['Comida', 'food']] as const).map(([label, key]) => <Field key={key} label={label}><Input type="number" min="0" step="any" value={form[key]} onChange={(e) => set(key, e.target.value)} /></Field>)}
    <Field label="SCTR"><Input value={form.sctr} onChange={(e) => set('sctr', e.target.value)} /></Field><Field label="Observaciones"><TextArea value={form.observations} onChange={(e) => set('observations', e.target.value)} /></Field>
  </div>{error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}</Modal>
}

function CampaignOverview({ campaign }: { campaign: Campaign }) {
  const s = useStore()
  const participants = s.campaignProviders.filter((p) => p.campaignId === campaign.id)
  const requirements = s.requirements.filter((r) => r.campaignId === campaign.id)
  const certifications = s.certifications.filter((c) => c.campaignId === campaign.id)
  const exams = s.exams.filter((e) => e.campaignId === campaign.id)
  const estimated = participants.reduce((sum, p) => sum + p.kilosEstimados, 0)
  const approved = participants.filter((p) => p.evaluacion === 'Aprobado').reduce((sum, p) => sum + p.kilosEstimados, 0)
  const certified = certifications.reduce((sum, c) => sum + c.kilos + c.ampliaciones.reduce((extra, item) => extra + item.kilos, 0), 0)
  const requested = requirements.reduce((sum, r) => sum + r.kilos, 0)
  const confirmed = requirements.reduce((sum, r) => sum + (r.contratos?.reduce((subtotal, contract) => subtotal + contract.kilos, 0) ?? r.kilosAcordados), 0)
  const gap = approved - requested
  const pendingProviders = participants.filter((p) => !['Aprobado', 'Rechazado'].includes(p.evaluacion)).length
  const pendingExams = exams.filter((e) => (e.estado ?? 'Con resultado') !== 'Con resultado').length
  const pendingRequirements = requirements.filter((r) => r.estado !== 'Acuerdo confirmado').length
  const qualityOperations = s.qualityOperations.filter((operation) => operation.campaignId === campaign.id)
  const finishedOperations = qualityOperations.filter((operation) => ['Cosecha terminada', 'Despachada'].includes(operation.status)).length
  const estimatedOperations = qualityOperations.reduce((sum, operation) => sum + operation.estimatedQuantity, 0)
  const harvestedOperations = qualityOperations.reduce((sum, operation) => sum + operation.harvestedQuantity, 0)
  const acceptedOperations = qualityOperations.reduce((sum, operation) => sum + operation.acceptedQuantity, 0)
  const logisticsDeliveries = s.logisticsDeliveries.filter((delivery) => delivery.campaignId === campaign.id)
  const logisticsPending = logisticsDeliveries.filter((delivery) => !delivery.administrativeClosed || !delivery.physicalClosed).length

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-display text-lg font-semibold text-ink">Datos generales y resumen</h2><p className="mt-1 text-sm text-ink-soft">Los totales se calculan desde las participaciones y requerimientos vinculados.</p></div>
      </div>
      <div className="mb-5">
        <Kpi label="Requerimiento comercial registrado en Campana" value={`${fmtNum(campaign.reqComercial)} kg`} tone="mango" icon="◎" />
      </div>
      <section className="mb-5 rounded-2xl border border-line bg-surface p-5">
        <h3 className="font-display text-lg font-semibold">Comparación de kilos de la campaña</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">{([
          ['Estimados', estimated, 'Suma de cantidades estimadas de los proveedores vinculados.', 'bg-plan'],
          ['Certificados', certified, 'Certificaciones emitidas: kilos iniciales más ampliaciones.', 'bg-done'],
          ['Comprometidos', confirmed, 'Suma de kilos de todos los contratos registrados de los clientes.', 'bg-leaf'],
        ] as const).map(([label, value, description, color]) => <div key={label} className="rounded-xl border border-line p-4"><div className="text-sm font-semibold">{label}</div><div className="mt-2 font-display text-2xl font-bold">{fmtNum(value)} kg</div><div className="mt-3 h-2 overflow-hidden rounded-full bg-canvas"><div className={`h-full ${color}`} style={{ width: `${value / Math.max(estimated, certified, confirmed, 1) * 100}%` }} /></div><p className="mt-3 text-xs text-ink-soft">{description}</p></div>)}</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{[['Estimados − comprometidos', estimated - confirmed], ['Certificados − comprometidos', certified - confirmed]].map(([label, value]) => <div key={label} className="rounded-lg bg-canvas p-3"><div className="text-xs text-ink-soft">{label}</div><div className={`mt-1 font-semibold ${Number(value) < 0 ? 'text-danger' : 'text-ink'}`}>{Number(value) >= 0 ? '+' : ''}{fmtNum(Number(value))} kg</div></div>)}</div>
        <p className="mt-3 text-xs text-ink-soft">La cobertura se suma por certificado; revisa los productores incluidos si varios certificados cubren la misma producción.</p>
      </section>
      <section className="mb-5 rounded-2xl border border-line bg-surface p-4">
        <div className="mb-4 flex items-center gap-2"><h3 className="font-display text-lg font-semibold text-ink">Indicadores calculados</h3><ValidationTag /></div>
        
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[['Total de cantidades de clientes', requested], ['Total de kilos acordados', confirmed], ['Total de oferta estimada', estimated], ['Oferta de proveedores validados', approved], ['Kilos certificados registrados', certified]].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line bg-surface p-4"><div className="font-display text-xl font-bold text-ink">{fmtNum(value as number)} kg</div><div className="mt-1 text-xs font-medium text-ink">{label}</div></div>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-line bg-surface p-4 text-ink">
          <div className="text-xs font-semibold uppercase tracking-wide">Brecha entre oferta y demanda</div><div className="mt-1 font-display text-2xl font-bold">{gap >= 0 ? '+' : ''}{fmtNum(gap)} kg</div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[['Proveedores pendientes de evaluación', pendingProviders], ['Exámenes pendientes', pendingExams], ['Requerimientos por confirmar', pendingRequirements]].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line bg-surface p-4"><div className="font-display text-2xl font-bold text-ink">{value}</div><div className="mt-1 text-xs font-medium text-ink">{label}</div></div>
          ))}
        </div>
      </section>
      <section className="mb-5 rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="font-display text-lg font-semibold text-ink">Cosecha y control de calidad</h3><ValidationTag /></div></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{[['Exportación', qualityOperations.filter((operation) => operation.route === 'Exportación').length], ['Industria', qualityOperations.filter((operation) => operation.route === 'Industria').length], ['Cantidad estimada', `${fmtNum(estimatedOperations)} kg`], ['Cosechado en exportación', `${fmtNum(harvestedOperations)} kg`], ['Aceptado en industria', `${fmtNum(acceptedOperations)} kg`], ['Terminadas / pendientes', `${finishedOperations} / ${qualityOperations.length - finishedOperations}`]].map(([label, value]) => <div key={label} className="rounded-lg border border-line bg-surface p-3"><div className="text-xs text-ink">{label}</div><div className="mt-1 font-display text-xl font-bold text-ink">{value}</div></div>)}</div>
      </section>
      <section className="mb-5 rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="font-display text-lg font-semibold text-ink">Logística y despacho</h3><ValidationTag /></div></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-surface p-3 text-ink">Entregas: <b>{logisticsDeliveries.length}</b></div><div className="rounded-lg bg-surface p-3 text-ink">Pendientes: <b>{logisticsPending}</b></div><div className="rounded-lg bg-surface p-3 text-ink">Recepciones completadas: <b>{logisticsDeliveries.filter((delivery) => delivery.logisticsStatus === 'Recepción completada').length}</b></div></div>
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-4"><div className="text-xs font-semibold uppercase text-ink-soft">Responsable</div><div className="mt-1 text-sm">{campaign.responsable}</div></div>
        <ProposalField><div className="text-xs font-semibold uppercase">Período o temporada</div><div className="mt-1 text-sm">{campaign.temporada}</div></ProposalField>
        <ProposalField ><div className="text-xs font-semibold uppercase">Fechas con día</div><div className="mt-1 text-sm">{fmtDate(campaign.fecha)} → {fmtDate(campaign.fechaFin)}</div></ProposalField>
        <div className="rounded-xl border border-line bg-surface p-4"><div className="text-xs font-semibold uppercase text-ink-soft">Frutas y variedades</div><div className="mt-1 text-sm">{campaign.frutas.join(', ')} · {campaign.derivadas.join(', ') || 'Sin variedades'}</div><div className="mt-2"><ApprovedBdNote /></div></div>
        <div className="rounded-xl border border-line bg-surface p-4"><div className="text-xs font-semibold uppercase text-ink-soft">Lineamientos</div><div className="mt-1 text-sm">{campaign.lineamientos || 'Sin documento'}</div>{campaign.lineamientos && <div className="mt-2 flex gap-2"><Button variant="outline" className="px-2 py-1 text-xs" onClick={() => void openStoredDocument(campaign.lineamientos,false).catch(e=>s.toast(e.message))}>Ver</Button><Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => void openStoredDocument(campaign.lineamientos,true).catch(e=>s.toast(e.message))}>Descargar</Button></div>}</div>
        <div className="rounded-xl border border-line bg-surface p-4"><div className="text-xs font-semibold uppercase text-ink-soft">Observaciones generales</div><div className="mt-1 text-sm">{campaign.observaciones || 'Sin observaciones'}</div></div>
      </div>
    </div>
  )
}

function PlanCampaignProviders({ campaign }: { campaign: Campaign }) {
  const s = useStore()
  const [role, setRole] = useState('')
  const [evaluation, setEvaluation] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const [profile, setProfile] = useState<string | null>(null)
  const [profileTab, setProfileTab] = useState('Información')
  const [interviewFor, setInterviewFor] = useState<CampaignProvider | null>(null)
  const [edit, setEdit] = useState<CampaignProvider | null>(null)
  const participants = s.campaignProviders.filter((p) => p.campaignId === campaign.id && (!role || p.rol === role) && (!evaluation || p.evaluacion === evaluation))
  const provider = (id: string) => s.providers.find((p) => p.id === id)!

  if (interviewFor) return <CampaignInterviewView campaignId={campaign.id} providerId={interviewFor.providerId} onBack={() => setInterviewFor(null)} />

  if (profile) {
    const participation = s.campaignProviders.find((p) => p.id === profile)
    if (participation) return <CampaignProviderProfile campaign={campaign} participation={participation} initialTab={profileTab} onBack={() => setProfile(null)} />
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Field label="Rol"><Select value={role} onChange={(e) => setRole(e.target.value)}><option value="">Todos</option><option>Productor</option><option>Acopiador</option></Select></Field>
          <Field label="Estado"><Select value={evaluation} onChange={(e) => setEvaluation(e.target.value)}><option value="">Todos</option><option>Examen pendiente</option><option>Entrevista pendiente</option><option>Aprobado</option></Select></Field>
        </div>
        <Button onClick={() => setLinkOpen(true)}>+ Vincular proveedor</Button>
      </div>
      <Table head={['Nombre', 'Identificación', 'Rol', 'Zona', 'Frutas y variedades asociadas', 'Cantidad estimada', 'Estado', <span className="rounded bg-amber-100 px-2 py-1 text-amber-900">Entrevista</span>, 'Acciones']}>
        {participants.map((p) => {
          const base = provider(p.providerId)
          return <tr key={p.id} className="hover:bg-leaf-50/40">
            <td className="px-4 py-3 font-medium">{base.nombres} {base.apellidos}</td>
            <td className="px-4 py-3 font-mono text-xs">{base.dni}</td>
            <td className="px-4 py-3">{p.rol}</td><td className="px-4 py-3 text-ink-soft">{base.zona}</td>
            <td className="px-4 py-3"><div>{base.frutas.join(', ')}</div><div className="text-xs text-ink-soft">{base.variedades.join(', ') || 'Sin variedades'}</div></td>
            <td className="px-4 py-3 font-mono">{fmtNum(p.kilosEstimados)}</td>
            <td className="px-4 py-3 text-ink"><StatusPill estado={p.evaluacion} /></td>
            <td className="bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">{p.rol === 'Productor' ? s.interviews.some(i => i.campaignId === campaign.id && i.providerId === p.providerId && i.estado === 'Completa') ? 'Sí se realizó' : 'No se realizó' : 'No aplica'}</td>
            <td className="px-4 py-3"><div className="flex gap-1"><IconBtn title="Ver participación" onClick={() => { setProfileTab('Información'); setProfile(p.id) }}><Eye /></IconBtn><IconBtn title="Editar participación" onClick={() => setEdit(p)}><Pen /></IconBtn><ActionsMenu title={`Más opciones de ${base.nombres} ${base.apellidos}`} items={[{ label: 'Exámenes', onClick: () => { setProfileTab('Exámenes'); setProfile(p.id) } }, ...(p.rol === 'Productor' ? [{ label: 'Entrevista', onClick: () => setInterviewFor(p) }] : [])]} /></div></td>
          </tr>
        })}
        {participants.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-ink-soft">No hay proveedores con estos filtros.</td></tr>}
      </Table>
      {linkOpen && <CampaignProviderModal campaign={campaign} onClose={() => setLinkOpen(false)} />}
      {edit && <CampaignProviderModal campaign={campaign} participation={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

function CampaignProviderModal({ campaign, participation, onClose }: { campaign: Campaign; participation?: CampaignProvider; onClose: () => void }) {
  const s = useStore()
  const initialProvider = participation ? s.providers.find((p) => p.id === participation.providerId) : undefined
  const [providerName, setProviderName] = useState(initialProvider ? `${initialProvider.nombres} ${initialProvider.apellidos} · Frutas: ${initialProvider.frutas.join(', ')} · Variedades: ${initialProvider.variedades.join(', ') || 'Sin variedades'}` : '')
  const [role, setRole] = useState<ProviderKind>(participation?.rol ?? 'Productor')
  const campaignFruits = campaign.frutas.length ? campaign.frutas : [campaign.fruta]
  const campaignVarieties = Array.from(new Set(campaignFruits.flatMap((item) => FRUIT_CATALOG[item] || [])))
  const fruit = campaign.fruta || campaignFruits[0] || ''
  const variety = participation?.variedad || ''
  const [kg, setKg] = useState(String(participation?.kilosEstimados ?? ''))
  const [price, setPrice] = useState(String(participation?.precio ?? ''))
  const currency = 'PEN'
  const [notes, setNotes] = useState(participation?.observaciones ?? '')
  const [db, setDb] = useState({
    estadoBd: participation?.estadoBd ?? 'Sin validar',
    departamento: participation?.departamento ?? '',
    provincia: participation?.provincia ?? '',
    distrito: participation?.distrito ?? '',
    latitud: participation?.latitud ?? '',
    longitud: participation?.longitud ?? '',
    densidadPlantacion: participation?.densidadPlantacion ?? '',
    distanciamiento: participation?.distanciamiento ?? '',
    frecuenciaRiego: participation?.frecuenciaRiego ?? '',
    hsTotalFinca: participation?.hsTotalFinca ?? '',
    haCultivo: participation?.haCultivo ?? '',
    nombreAplicacion: participation?.nombreAplicacion ?? '',
    aplicacionesAnio: participation?.aplicacionesAnio ?? '',
  })
  const setDbField = (key: keyof typeof db, value: string) => setDb({ ...db, [key]: value })
  const providerLabel = (provider: Provider) => `${provider.nombres} ${provider.apellidos} · Frutas: ${provider.frutas.join(', ')} · Variedades: ${provider.variedades.join(', ') || 'Sin variedades'}`
  const selected = s.providers.find((provider) => providerLabel(provider) === providerName)
  return (
    <Modal open onClose={onClose} wide title={participation ? 'Editar participación del proveedor' : 'Vincular proveedor'}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => {
        if (!selected) return
        const payload = { campaignId: campaign.id, providerId: selected.id, rol: role, fruta: fruit, variedad: variety, kilosEstimados: Number(kg) || 0, disponibilidadInicio: participation?.disponibilidadInicio ?? '', disponibilidadFin: participation?.disponibilidadFin ?? '', precio: price ? Number(price) : undefined, moneda: currency, observaciones: notes, ...db, estadoBd: db.estadoBd as 'Validado' | 'Sin validar' }
        if (participation) s.updateCampaignProvider(participation.id, payload)
        else s.addCampaignProvider({ ...payload, evaluacion: 'Examen pendiente' })
        s.toast(participation ? 'Participación actualizada' : 'Proveedor vinculado'); onClose()
      }}>Guardar participación</Button></>}>
      <DataLegend />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Proveedor del padrón general"><SearchableSelect options={s.providers.map(providerLabel)} value={providerName} onChange={setProviderName} placeholder="Buscar proveedor, fruta o variedad…" /></Field>
        <div />
        {selected && <div className="sm:col-span-2 rounded-xl border border-line bg-canvas/60 p-3 text-sm text-ink-soft"><b className="text-ink">Registro general:</b> {selected.nombres} {selected.apellidos} · DNI {selected.dni} · {selected.zona} · {selected.telefono} · {selected.email} · Código {selected.codigo} · Estado examen sanidad agraria: {selected.estadoExamenSanidad}</div>}
      </div>
      <h4 className="mb-3 mt-5 font-display font-semibold text-ink">Participación en campaña</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de proveedor" hint={role === 'Productor' ? 'Fruta orgánica' : 'Fruta convencional'}><Select value={role} onChange={(e) => setRole(e.target.value as ProviderKind)}><option>Productor</option><option>Acopiador</option></Select></Field>
        <Field label="Cantidad del proveedor estimada"><Input type="number" value={kg} onChange={(e) => setKg(e.target.value)} /></Field>
        <div className="sm:col-span-2 rounded-xl border border-line bg-canvas/60 p-4"><div className="text-xs font-semibold uppercase text-ink-soft">Fruta de campaña</div><div className="mt-2 flex flex-wrap gap-2">{campaignFruits.map((item) => <Chip key={item}>{item}</Chip>)}</div><div className="mt-4 text-xs font-semibold uppercase text-ink-soft">Frutas derivadas / variedades de campaña</div><div className="mt-2 flex flex-wrap gap-2">{campaignVarieties.map((item) => <Chip key={item}>{item}</Chip>)}</div></div>
        <ProposalField><div className="grid gap-3 sm:grid-cols-2"><Field label="Precio estimado o acordado"><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></Field><Field label="Moneda"><Input readOnly value="Soles (PEN)"/></Field></div></ProposalField>
        <div className="sm:col-span-2"><ProposalField><Field label="Observaciones de participación"><TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></ProposalField></div>
      </div>

    </Modal>
  )
}

function CampaignProviderProfile({ campaign, participation, initialTab = 'Información', onBack }: { campaign: Campaign; participation: CampaignProvider; initialTab?: string; onBack: () => void }) {
  const s = useStore()
  const tab = initialTab === 'Entrevista' && participation.rol !== 'Productor' ? 'Información' : initialTab
  const [examOpen, setExamOpen] = useState(false)
  const base = s.providers.find((p) => p.id === participation.providerId)!
  const exams = s.exams.filter((e) => e.providerId === base.id && e.campaignId === campaign.id)
  return (
    <div>
      <Button variant="ghost" className="mb-4 px-0" onClick={onBack}>← Volver a proveedores</Button>
      {tab === 'Información' && <div className="mb-4 rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="text-xs font-semibold uppercase tracking-wide text-leaf">{campaign.nombre} · participación en campaña</div><h2 className="mt-1 font-display text-xl font-bold">{base.nombres} {base.apellidos}</h2><p className="mt-1 text-sm text-ink-soft">DNI {base.dni} · {base.zona} · {base.telefono} · {base.email}</p></div>
          <StatusPill estado={participation.evaluacion} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[['Tipo de proveedor', participation.rol], ['Cantidad estimada', fmtNum(participation.kilosEstimados)], ['Fruta de campaña', campaign.frutas.join(', ') || campaign.fruta], ['Variedades de campaña', Array.from(new Set((campaign.frutas.length ? campaign.frutas : [campaign.fruta]).flatMap((item) => FRUIT_CATALOG[item] || []))).join(', ') || 'Sin variedades'], ['Tipo de fruta', participation.rol === 'Productor' ? 'Orgánica' : 'Convencional']].map(([k, v]) => <div key={k} className="rounded-lg bg-canvas/60 p-3"><div className="text-xs text-ink-soft">{k}</div><div className="mt-1 text-sm font-semibold">{v}</div></div>)}
        </div>

      </div>}

      {tab !== 'Información' && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div><h2 className="font-display text-lg font-semibold">{tab === 'Exámenes' ? 'Exámenes' : 'Entrevistas'} · {base.nombres} {base.apellidos}</h2><p className="mt-1 text-sm text-ink-soft">{campaign.nombre} · {participation.rol}</p></div>
        {tab === 'Exámenes' && <Button onClick={() => setExamOpen(true)}>+ Registrar examen</Button>}
      </div>}
      {tab === 'Exámenes' && <div><Table head={['Fruta', 'Análisis', <ProposalHeader>Muestra</ProposalHeader>, 'Origen', 'Fecha', <ProposalHeader>Fecha de envío / estado del examen</ProposalHeader>, 'Resultado', 'Documento', 'Observación']}>{exams.map((e) => <tr key={e.id}><td className="px-4 py-3">{e.fruta || campaign.fruta || '—'}</td><td className="px-4 py-3 font-medium">{e.analisis}</td><td className="px-4 py-3 font-mono text-xs text-ink">{e.muestra ?? '—'}</td><td className="px-4 py-3">{e.origen}</td><td className="px-4 py-3 font-mono text-xs">{fmtDate(e.fecha)}</td><td className="px-4 py-3 text-ink">{e.fechaEnvio ? fmtDate(e.fechaEnvio) : '—'} · {e.estado === 'Pendiente' ? 'Pendiente de envío' : e.estado === 'Enviado' ? 'Enviado al laboratorio' : e.estado ?? 'Con resultado'}</td><td className="px-4 py-3">{e.resultado || 'Sin resultado'}</td><td className="px-4 py-3 text-forest">{e.archivo ?? '—'}</td><td className="px-4 py-3 text-xs text-ink-soft">{e.detalles}</td></tr>)}{exams.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-ink-soft">Sin exámenes del proveedor.</td></tr>}</Table></div>}
      {tab === 'Información' && <section><h3 className="mb-3 font-semibold">Fincas vinculadas a la campaña</h3><Table head={['Finca', 'Ubicación', 'Hectáreas totales', 'Hectáreas de cultivo']}>{(base.fincas ?? []).filter(f => (participation.fincaIds ?? (participation.fincaId ? [participation.fincaId] : [])).includes(f.id)).map(f => <tr key={f.id}><td className="px-4 py-3 font-medium">{f.nombre}</td><td className="px-4 py-3">{[f.departamento, f.provincia, f.distrito].filter(Boolean).join(' · ')}</td><td className="px-4 py-3">{f.hsTotalFinca || '—'} ha</td><td className="px-4 py-3">{f.haCultivo || '—'} ha</td></tr>)}</Table></section>}

      {examOpen && <CampaignExamModal campaign={campaign} provider={base} onClose={() => setExamOpen(false)} />}
    </div>
  )
}

function CampaignExamModal({ campaign, provider, onClose }: { campaign: Campaign; provider: Provider; onClose: () => void }) {
  const s = useStore()
  const fruits = Array.from(new Set([...(campaign.frutas ?? []), campaign.fruta].filter(Boolean)))
  const [fruit, setFruit] = useState(fruits.length === 1 ? fruits[0] : '')
  const [error, setError] = useState('')
  const [sample, setSample] = useState('')
  const [type, setType] = useState('')
  const [date, setDate] = useState('')
  const [sent, setSent] = useState('')
  const [status, setStatus] = useState<'Pendiente' | 'Enviado' | 'Con resultado'>('Pendiente')
  const [result, setResult] = useState<'' | 'Negativo' | 'Positivo'>('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState('')
  return <Modal open onClose={onClose} wide title="Registrar examen" footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => { if (!type || !fruit) { setError('Selecciona la fruta y el tipo de examen.'); return } if (status === 'Con resultado' && !result) { setError('Selecciona el resultado recibido del laboratorio.'); return } s.addExam({ fruta: fruit, providerId: provider.id, campaignId: campaign.id, analisis: type, resultado: status === 'Con resultado' ? result as 'Negativo' | 'Positivo' : undefined, fecha: date, origen: provider.zona, detalles: notes, muestra: sample, fechaEnvio: sent, estado: status, archivo: file || undefined }); s.toast('Examen guardado y evaluación actualizada automáticamente'); onClose() }}>Guardar examen</Button></>}>
    <DataLegend />
    <div className="mb-4 rounded-lg border border-line bg-surface p-3 text-sm text-ink"><b>{provider.nombres} {provider.apellidos}</b> · {campaign.nombre} <ValidationTag /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Fruta del examen">{fruits.length === 1 ? <Input aria-label="Fruta del examen" readOnly value={fruit} /> : <Select aria-label="Fruta del examen" value={fruit} onChange={(e) => setFruit(e.target.value)}><option value="">Seleccionar fruta de campaña</option>{fruits.map((item) => <option key={item}>{item}</option>)}</Select>}</Field><Field label="Tipo de examen"><SearchableSelect options={EXAM_TYPES} value={type} onChange={setType} /></Field>
      <Field label="Fecha del examen"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <ProposalField><Field label="Identificación de muestra"><Input value={sample} onChange={(e) => setSample(e.target.value)} /></Field></ProposalField>
      <Field label="Fecha de envío de la muestra"><Input type="date" value={sent} onChange={(e) => setSent(e.target.value)} /></Field><Field label="Estado del examen"><Select aria-label="Estado del examen" value={status} onChange={(e) => { const next = e.target.value as typeof status; setStatus(next); if (next !== 'Con resultado') setResult('') }}><option value="Pendiente">Pendiente de envío</option><option value="Enviado">Enviado al laboratorio</option><option value="Con resultado">Con resultado</option></Select></Field><div><Field label="Resultado del examen"><Select aria-label="Resultado del examen" disabled={status !== 'Con resultado'} value={result} onChange={(e) => setResult(e.target.value as typeof result)}><option value="">{status === 'Con resultado' ? 'Seleccionar resultado' : 'Aún sin resultado'}</option><option>Negativo</option><option>Positivo</option></Select></Field>{status !== 'Con resultado' && <p className="mt-1 text-xs text-ink-soft">Se habilita cuando el laboratorio entrega el resultado.</p>}</div>
      <div className="sm:col-span-2"><Field label="Observación"><TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></div><div className="sm:col-span-2"><FileDrop label={file || 'Adjuntar documento'} onFile={(name) => setFile(name ?? '')} />{file && <div className="mt-2 flex gap-2"><Button variant="outline" onClick={() => void openStoredDocument(file,false).catch(e=>s.toast(e.message))}>Ver</Button><Button variant="ghost" onClick={() => void openStoredDocument(file,true).catch(e=>s.toast(e.message))}>Descargar</Button><span className="self-center text-xs text-ink-soft">Usa el cargador para reemplazar.</span></div>}</div>
    </div>{error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
  </Modal>
}


function certificationValidity(start: string, end: string) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  if (!end) return 'Sin fechas completas'
  if (end < today) return 'Vencida'
  if (!start) return 'Sin fechas completas'
  return start > today ? 'Aún no vigente' : 'Vigente'
}

function PlanCampaignCertifications({ campaign }: { campaign: Campaign }) {
  const s = useStore()
  const [open, setOpen] = useState(false)
  const [paymentFor, setPaymentFor] = useState<string | null>(null)
  const [expansionFor, setExpansionFor] = useState<string | null>(null)
  const [edit, setEdit] = useState<Certification | null>(null)
  const rows = s.certifications.filter((c) => c.campaignId === campaign.id)
  return (
    <div><div className="mb-4"><ChangeMark priority="alta" code="R03">Las certificaciones con pagos conservan su registro e historial</ChangeMark></div>
      <div className="mb-4 flex flex-wrap justify-between gap-3"><div><h2 className="font-display text-lg font-semibold">Certificado de campaña</h2><p className="mt-1 text-sm text-ink-soft">Un certificado por campaña. Los kilos se calculan con los productores seleccionados.</p></div><div className="flex gap-2"><Button onClick={() => rows.length ? setEdit(rows[0]) : setOpen(true)}>{rows.length ? 'Editar certificado' : '+ Registrar certificación'}</Button></div></div>
      <Table head={['Nombre', 'Documento', 'Vigencia', 'Tipo / organismo', 'Productores cubiertos', 'Kilos registrados', 'Ampliaciones', 'Total actual', 'Pago', 'Acciones']}>
        {rows.map((c) => <tr key={c.id} className="hover:bg-leaf-50/40">
          <td className="px-4 py-3 font-medium">{c.nombre}</td><td className="px-4 py-3 text-xs text-forest">{c.documento ?? '—'}</td><td className="px-4 py-3 text-xs"><div>{fmtDate(c.vigenciaInicio)} – {fmtDate(c.vencimiento)}</div><div className="mt-1 font-medium">{certificationValidity(c.vigenciaInicio, c.vencimiento)}</div></td><td className="px-4 py-3"><div>{c.tipo}</div><div className="text-xs text-ink-soft">{c.organismo}</div></td><td className="px-4 py-3 text-xs">{c.producerIds.map((id) => { const provider = s.providers.find((item) => item.id === id); return provider ? `${provider.nombres} ${provider.apellidos}` : id }).join(', ') || 'Sin productores'}</td><td className="px-4 py-3 font-mono">{fmtNum(c.kilos)} kg</td><td className="px-4 py-3 font-mono">{fmtNum(c.ampliaciones.reduce((sum, item) => sum + item.kilos, 0))} kg</td><td className="px-4 py-3 font-mono">{fmtNum(c.kilos + c.ampliaciones.reduce((sum, item) => sum + item.kilos, 0))} kg</td>
          <td className="px-4 py-3 text-ink"><StatusPill estado={c.estadoPago} /></td>
          <td className="px-4 py-3"><div className="flex gap-1"><IconBtn title="Editar certificación" onClick={() => setEdit(c)}><Pen /></IconBtn><Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setExpansionFor(c.id)}>+ Ampliación</Button><IconBtn title="Registrar pago" onClick={() => setPaymentFor(c.id)}>$</IconBtn></div></td>
        </tr>)}
        {rows.length === 0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-ink-soft">No hay certificaciones registradas.</td></tr>}
      </Table>
      {open && <CertificationModal campaign={campaign} onClose={() => setOpen(false)} />}
      {edit && <CertificationModal campaign={campaign} certification={edit} onClose={() => setEdit(null)} />}
      {paymentFor && <CertificationPaymentModal certificationId={paymentFor} onClose={() => setPaymentFor(null)} />}
      {expansionFor && <CertificationExpansionModal certificationId={expansionFor} onClose={() => setExpansionFor(null)} />}
    </div>
  )
}

function CertificationModal({ campaign, certification, onClose }: { campaign: Campaign; certification?: Certification; onClose: () => void }) {
  const s = useStore()
  const [f, setF] = useState({
    nombre: certification?.nombre ?? '', tipo: certification?.tipo ?? 'Global GAP', organismo: certification?.organismo ?? '', cobertura: certification?.cobertura ?? '',
    emision: certification?.emision ?? '', inicio: certification?.vigenciaInicio ?? '', vencimiento: certification?.vencimiento ?? '',
    costo: String(certification?.costo ?? ''), moneda: certification?.moneda ?? 'USD', notas: certification?.observaciones ?? '',
  })
  const [producerIds, setProducerIds] = useState<string[]>(certification?.producerIds ?? [])
  const estimatedKilos=certificationEstimatedKilos(s.campaignProviders,campaign.id,producerIds)
  const [producerChoice, setProducerChoice] = useState('')
  const [certificateDocument, setCertificateDocument] = useState(certification?.documento ?? '')
  const [quoteDocument, setQuoteDocument] = useState(certification?.soporte ?? '')
  const producerOptions = s.campaignProviders.filter((item) => item.campaignId === campaign.id && item.rol === 'Productor').map((item) => s.providers.find((provider) => provider.id === item.providerId)).filter(Boolean) as Provider[]
  const [error, setError] = useState('')
  const set = (key: keyof typeof f, value: string) => setF({ ...f, [key]: value })
  return <Modal open onClose={onClose} wide title={certification ? 'Editar certificación' : 'Registrar certificación'} footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => {
    if(!producerIds.length){setError('Selecciona al menos un productor de la campaña.');return}
    if (f.inicio && f.vencimiento && f.vencimiento < f.inicio) { setError('Válido hasta debe ser igual o posterior a Válido desde.'); return }
    const coverage = producerIds.map((id) => { const provider = s.providers.find((item) => item.id === id); return provider ? `${provider.nombres} ${provider.apellidos}` : id }).join(', ')
    const payload = { campaignId: campaign.id, nombre: f.nombre, tipo: f.tipo, organismo: f.organismo, cobertura: coverage, producerIds, emision: f.emision, vigenciaInicio: f.inicio, vencimiento: f.vencimiento, kilos: estimatedKilos, costo: Number(f.costo) || 0, moneda: f.moneda, observaciones: f.notas, soporte: quoteDocument || undefined, documento: certificateDocument || undefined, recibo: certification?.recibo }
    if (certification) s.updateCertification(certification.id, payload)
    else s.addCertification({ ...payload, estadoPago: 'Pendiente', pagos: [], ampliaciones: [] })
    s.toast(certification ? 'Certificación actualizada' : 'Certificación registrada'); onClose()
  }}>Guardar</Button></>}>
    <DataLegend />
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nombre del certificado"><Input value={f.nombre} onChange={(e) => set('nombre', e.target.value)} /></Field>
      <Field label="Costo"><Input type="number" value={f.costo} onChange={(e) => set('costo', e.target.value)} /></Field>
      <FileDrop label={certificateDocument || 'Documento del certificado'} onFile={(name) => setCertificateDocument(name ?? '')} />
      <Field label="Tipo de certificación"><Select value={f.tipo} onChange={(e) => set('tipo', e.target.value)}><option>Global GAP</option><option>Orgánico USDA</option><option>Orgánico UE</option><option>Fairtrade</option><option>Rainforest Alliance</option></Select></Field>
      <Field label="Organismo emisor"><Input value={f.organismo} onChange={(e) => set('organismo', e.target.value)} /></Field>
      <div className="sm:col-span-2"><Field label="Seleccionar productores cubiertos"><SearchableSelect options={producerOptions.filter((provider) => !producerIds.includes(provider.id)).map((provider) => `${provider.nombres} ${provider.apellidos}`)} value={producerChoice} onChange={(value) => { const provider = producerOptions.find((item) => `${item.nombres} ${item.apellidos}` === value); if (provider) setProducerIds((current) => [...current, provider.id]); setProducerChoice('') }} placeholder="Agregar productor…" /></Field><div className="mt-2 flex flex-wrap gap-2">{producerIds.map((id) => { const provider = s.providers.find((item) => item.id === id); return <Chip key={id} onRemove={() => setProducerIds((current) => current.filter((item) => item !== id))}>{provider ? `${provider.nombres} ${provider.apellidos}` : id}</Chip> })}</div></div>
      <Field label="Kilos registrados" hint="Suma automática de los kilos estimados de los productores seleccionados en esta campaña."><Input aria-label="Kilos registrados del certificado" type="number" readOnly value={estimatedKilos}/></Field>
      <div className="sm:col-span-2 rounded-xl border border-line p-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Válido desde"><Input aria-label="Válido desde" type="date" value={f.inicio} onChange={(e) => set('inicio', e.target.value)} /></Field><Field label="Válido hasta"><Input aria-label="Válido hasta" type="date" min={f.inicio || undefined} value={f.vencimiento} onChange={(e) => set('vencimiento', e.target.value)} /></Field></div><p className="mt-3 text-xs text-ink-soft">Estado automático: <span className="font-medium">{certificationValidity(f.inicio, f.vencimiento)}</span></p></div>
      <ProposalField><Field label="Moneda"><Select value={f.moneda} onChange={(e) => set('moneda', e.target.value)}><option>USD</option><option>PEN</option><option>EUR</option></Select></Field></ProposalField>
      <div className="sm:col-span-2"><ProposalField><Field label="Observaciones"><TextArea rows={2} value={f.notas} onChange={(e) => set('notas', e.target.value)} /></Field></ProposalField></div>
      <FileDrop label={quoteDocument || 'Documento de cotización'} onFile={(name) => setQuoteDocument(name ?? '')} />
    </div>
    {certification && certification.pagos.length > 0 && <div className="mt-5 rounded-xl border border-line bg-surface p-3"><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-ink">Detalle de pagos <ValidationTag /></div><Table head={[<ProposalHeader>Monto</ProposalHeader>, <ProposalHeader>Fecha</ProposalHeader>, <ProposalHeader>Referencia</ProposalHeader>, <ProposalHeader>Evidencia</ProposalHeader>]}>{certification.pagos.map((p) => <tr key={p.id} className="text-ink"><td className="px-4 py-2 font-mono">{certification.moneda} {fmtNum(p.monto)}</td><td className="px-4 py-2">{fmtDate(p.fecha)}</td><td className="px-4 py-2">{p.referencia}</td><td className="px-4 py-2">{p.evidencia ?? '—'}</td></tr>)}</Table></div>}
    {certification && <div className="mt-5"><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-ink-soft">Historial de kilos certificados <ApprovedBdNote /></div><Table head={['Registro', 'Fecha', 'Kilos', 'Referencia'] }><tr><td className="px-4 py-2 font-medium">Registro inicial</td><td className="px-4 py-2">{fmtDate(certification.kilosHistory?.[0]?.fecha || certification.emision)}</td><td className="px-4 py-2 font-mono">{fmtNum(certification.kilosHistory?.[0]?.kilos ?? certification.kilos)} kg</td><td className="px-4 py-2">{certification.documento ?? '—'}</td></tr>{certification.kilosHistory?.slice(1).map((item,index)=><tr key={`coverage-${index}`}><td className="px-4 py-2">Actualización de cobertura</td><td className="px-4 py-2">{fmtDate(item.fecha)}</td><td className="px-4 py-2 font-mono">{fmtNum(item.kilos)} kg</td><td className="px-4 py-2">{item.producerIds.map(id=>{const p=s.providers.find(p=>p.id===id);return `${p?.nombres||''} ${p?.apellidos||''}`}).join(', ')}</td></tr>)}{certification.ampliaciones.map((item) => <tr key={item.id}><td className="px-4 py-2">Ampliación</td><td className="px-4 py-2">{fmtDate(item.fecha)}</td><td className="px-4 py-2 font-mono">+{fmtNum(item.kilos)} kg</td><td className="px-4 py-2">{item.referencia || '—'}</td></tr>)}</Table></div>}
    {error && <div className="mt-4 rounded-lg border border-danger/30 bg-red-50 p-3 text-sm text-danger">{error}</div>}
  </Modal>
}

function CertificationPaymentModal({ certificationId, onClose }: { certificationId: string; onClose: () => void }) {
  const s = useStore()
  const cert = s.certifications.find((c) => c.id === certificationId)!
  const [amount, setAmount] = useState('')
  const [error,setError]=useState('')
  const [date, setDate] = useState('')
  const [reference, setReference] = useState('')
  const [evidence, setEvidence] = useState('')
  const paid = cert.pagos.reduce((sum, p) => sum + p.monto, 0)
  return <Modal open onClose={onClose} title="Registrar pago de certificación" footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => { const issue=certificationPaymentIssue(cert,{monto:Number(amount),fecha:date,referencia:reference});if(issue){setError(issue);return} const next = paid + Number(amount); s.addCertificationPayment(cert.id, { monto: Number(amount), fecha: date, referencia: reference, evidencia: evidence || undefined }); s.updateCertification(cert.id, { estadoPago: next >= cert.costo ? 'Pagado' : 'Parcial' }); s.toast('Pago de certificación registrado'); onClose() }}>Guardar pago</Button></>}>
    {error&&<p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
    <ProposalField note="El detalle de pagos, fechas y estado de pago no figura en certificados_campania."><div className="mb-4 rounded-lg bg-surface p-3 text-sm"><b>{cert.nombre}</b><div className="mt-1">Costo: {cert.moneda} {fmtNum(cert.costo)} · Pagado: {cert.moneda} {fmtNum(paid)}</div></div>
    <div className="grid gap-4"><Field label="Monto"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field><Field label="Fecha"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field><Field label="Referencia de operación"><Input value={reference} onChange={(e) => setReference(e.target.value)} /></Field><FileDrop label={evidence || 'Evidencia del pago'} onFile={(name) => setEvidence(name ?? '')} /></div></ProposalField>
  </Modal>
}

function CertificationExpansionModal({ certificationId, onClose }: { certificationId: string; onClose: () => void }) {
  const s = useStore()
  const certification = s.certifications.find((item) => item.id === certificationId)!
  const [kilos, setKilos] = useState('')
  const [error,setError]=useState('')
  const [date, setDate] = useState('')
  const [reference, setReference] = useState('')
  return <Modal open onClose={onClose} title="Registrar ampliación de certificación" footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => { if(!Number.isFinite(Number(kilos))||Number(kilos)<=0||!validBusinessDate(date)||!reference.trim()){setError('Indica kilos positivos, fecha válida y referencia.');return} s.addCertificationExpansion(certification.id, { kilos: Number(kilos) || 0, fecha: date, referencia: reference }); s.toast('Ampliación registrada sin modificar los kilos iniciales'); onClose() }}>Guardar ampliación</Button></>}><div className="mb-4"><ApprovedBdNote /></div><div className="grid gap-4"><Field label="Kilos adicionales"><Input type="number" value={kilos} onChange={(e) => setKilos(e.target.value)} /></Field><Field label="Fecha"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field><Field label="Referencia o evidencia"><Input value={reference} onChange={(e) => setReference(e.target.value)} /></Field></div><div className="mt-4 rounded-lg bg-canvas/60 p-3 text-sm">Inicial: <b>{fmtNum(certification.kilos)} kg</b> · Ampliaciones actuales: <b>{fmtNum(certification.ampliaciones.reduce((sum, item) => sum + item.kilos, 0))} kg</b></div>{error&&<p role="alert" className="mt-4 text-sm text-danger">{error}</p>}</Modal>
}

function PlanCampaignClients({ campaign }: { campaign: Campaign }) {
  const s = useStore()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ id: string; mode: 'view' | 'manage' | 'deliveries' } | null>(null)
  const rows = s.requirements.filter((r) => r.campaignId === campaign.id)
  const client = (id: string) => s.clients.find((c) => c.id === id)
  if (detail?.mode === 'view') return <CommercialParticipationView requirementId={detail.id} onBack={() => setDetail(null)} onManage={() => setDetail({ id: detail.id, mode: 'manage' })} />
  if (detail?.mode === 'deliveries') return <CommercialDeliveriesModal requirementId={detail.id} asPage backLabel="← Volver a clientes" onClose={() => setDetail(null)} />
  if (detail?.mode === 'manage') return <CommercialContractsModal requirementId={detail.id} asPage onClose={() => setDetail(null)} />
  return <div>
    <div className="mb-4 flex flex-wrap justify-between gap-3"><div><h2 className="font-display text-lg font-semibold">Clientes por campaña</h2><p className="mt-1 text-sm text-ink-soft">La selección no exige un contrato previo. “Cantidad en kg” y “kilos acordados” se mantienen separados.</p></div><Button onClick={() => setOpen(true)}>+ Agregar cliente</Button></div>
    <Table head={['Cliente', 'Cantidad en kg', 'Kilos acordados', 'Contrato', 'Ficha técnica', 'Fecha de registro', <ProposalHeader>Fruta / variedad</ProposalHeader>, <ProposalHeader>Destino / ventana de entrega</ProposalHeader>, <ProposalHeader>Negociación</ProposalHeader>, 'Acciones']}>
      {rows.map((r) => <tr key={r.id} className="hover:bg-leaf-50/40"><td className="px-4 py-3 font-medium">{client(r.clientId)?.empresa}</td><td className="px-4 py-3 font-mono">{fmtNum(r.kilos)}</td><td className="px-4 py-3 font-mono">{fmtNum(r.kilosAcordados)}</td><td className="px-4 py-3 text-xs text-forest">{r.contratos?.length ? `${r.contratos.length} contrato(s)` : 'Sin contratos'}</td><td className="px-4 py-3 text-xs text-forest">{r.ficha ?? 'Sin documento'}</td><td className="px-4 py-3 font-mono text-xs">{fmtDate(r.fechaRegistro)}</td><td className="px-4 py-3 text-ink">{r.fruta}<div className="text-xs">{r.variedad}</div></td><td className="px-4 py-3 text-xs text-ink">{r.destino}<div>{r.entrega}</div></td><td className="px-4 py-3 text-ink">{r.precio ? `${r.moneda} ${r.precio}` : 'Sin precio'}<div>{r.estado} <ValidationTag /></div></td><td className="px-4 py-3"><div className="flex gap-1"><IconBtn title={`Ver cliente ${client(r.clientId)?.empresa}`} onClick={() => setDetail({ id: r.id, mode: 'view' })}><Eye /></IconBtn><IconBtn title={`Editar cliente ${client(r.clientId)?.empresa}`} onClick={() => setEditId(r.id)}><Pen /></IconBtn><ActionsMenu title={`Más opciones de ${client(r.clientId)?.empresa}`} items={[{ label: 'Contratos', onClick: () => setDetail({ id: r.id, mode: 'manage' }) }, ...(r.contratos?.length ? [{ label: 'Entregas', onClick: () => setDetail({ id: r.id, mode: 'deliveries' }) }] : [])]} /></div></td></tr>)}
      {rows.length === 0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-ink-soft">Sin clientes vinculados. El contrato no es obligatorio para seleccionarlos.</td></tr>}
    </Table>
    {editId && <CommercialParticipationModal requirement={s.requirements.find((item) => item.id === editId)!} onClose={() => setEditId(null)} onSaved={() => setEditId(null)} onOpenExisting={() => setEditId(null)} />}
    {open && <CommercialParticipationModal fixedCampaignId={campaign.id} onClose={() => setOpen(false)} onSaved={(id) => { setOpen(false); setDetail({ id, mode: 'view' }) }} onOpenExisting={(id) => { setOpen(false); setDetail({ id, mode: 'view' }) }} />}
  </div>
}



function CampaignProviders({ campaignId }: { campaignId: string }) {
  const s = useStore()
  const [kind, setKind] = useState<ProviderKind>('Productor')
  const [linkOpen, setLinkOpen] = useState(false)
  const [examFor, setExamFor] = useState<string | null>(null)
  const [viewFor, setViewFor] = useState<string | null>(null)
  const linked = s.providers.filter((p) => p.campaignId === campaignId && p.tipo === kind)

  if (viewFor) {
    const p = s.providers.find((x) => x.id === viewFor)!
    return <ProviderProfile provider={p} onBack={() => setViewFor(null)} onExam={() => setExamFor(p.id)} />
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={['Productor', 'Acopiador']} active={kind} onChange={(t) => setKind(t as ProviderKind)} />
        <Button onClick={() => setLinkOpen(true)}>+ Vincular proveedor</Button>
      </div>
      <Table head={['Nombres', 'DNI', 'Zona', 'Tipo', 'Cantidad est.', 'Estado', 'Acciones']}>
        {linked.map((p) => (
          <tr key={p.id} className="animate-row hover:bg-leaf-50/40">
            <td className="px-4 py-3 font-medium">{p.nombres} {p.apellidos}</td>
            <td className="px-4 py-3 font-mono text-xs text-ink-soft">{p.dni}</td>
            <td className="px-4 py-3 text-ink-soft">{p.zona}</td>
            <td className="px-4 py-3">{p.tipo}</td>
            <td className="px-4 py-3 font-mono">{p.cantidad ? fmtNum(p.cantidad) + ' kg' : '—'}</td>
            <td className="px-4 py-3"><StatusPill estado={p.estado === 'Aprobado' ? 'Validado' : 'Sin validar'} /></td>
            <td className="px-4 py-3">
              <div className="flex gap-1.5">
                <IconBtn title="Ver perfil" onClick={() => setViewFor(p.id)}><Eye /></IconBtn>
                <IconBtn title="Registrar examen" onClick={() => setExamFor(p.id)}>🧪</IconBtn>
              </div>
            </td>
          </tr>
        ))}
        {linked.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-soft">No hay {kind.toLowerCase()}es vinculados.</td></tr>}
      </Table>

      {linkOpen && <LinkProviderModal campaignId={campaignId} kind={kind} onClose={() => setLinkOpen(false)} />}
      {examFor && <ExamModal providerId={examFor} onClose={() => setExamFor(null)} />}
    </div>
  )
}

function LinkProviderModal({ campaignId, kind, onClose }: { campaignId: string; kind: ProviderKind; onClose: () => void }) {
  const s = useStore()
  const available = s.providers.filter((p) => p.tipo === kind && p.campaignId !== campaignId)
  const [sel, setSel] = useState('')
  const [cant, setCant] = useState('')
  return (
    <Modal open onClose={onClose} title="Vincular proveedores"
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => {
          const p = available.find((x) => `${x.nombres} ${x.apellidos}` === sel)
          if (p) { s.updateProvider(p.id, { campaignId, cantidad: Number(cant) || 0 }); s.toast('Proveedor vinculado a la campaña') }
          onClose()
        }}>Guardar</Button></>}
    >
      <div className="grid gap-4">
        <Field label={`Seleccionar ${kind.toLowerCase()}`}>
          <SearchableSelect options={available.map((p) => `${p.nombres} ${p.apellidos}`)} value={sel} onChange={setSel} placeholder="Buscar proveedor…" />
        </Field>
        <Field label="Cantidad estimada (kg)"><Input type="number" value={cant} onChange={(e) => setCant(e.target.value)} placeholder="1000" /></Field>
      </div>
      <div className="mt-4 rounded-lg bg-canvas/60 p-3 text-sm text-ink-soft">
        {kind}es agregados: <b className="text-forest">{s.providers.filter((p) => p.campaignId === campaignId && p.tipo === kind).length}</b>
      </div>
    </Modal>
  )
}

function ExamModal({ providerId, onClose }: { providerId: string; onClose: () => void }) {
  const s = useStore()
  const [fecha, setFecha] = useState('')
  const [tipo, setTipo] = useState('')
  const [resultado, setResultado] = useState<'Negativo' | 'Positivo'>('Negativo')
  const [origen, setOrigen] = useState('')
  const [detalles, setDetalles] = useState('')
  const p = s.providers.find((x) => x.id === providerId)!
  const examenes = s.exams.filter((e) => e.providerId === providerId)
  return (
    <Modal open onClose={onClose} wide title={`Registrar examen · ${p.nombres} ${p.apellidos}`}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => {
          if (!tipo) return
          s.addExam({ providerId, analisis: tipo, resultado, fecha, origen, detalles })
          s.toast('Examen registrado')
          setTipo(''); setDetalles('')
        }}>Guardar</Button></>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha"><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
        <Field label="Tipo de examen"><SearchableSelect options={EXAM_TYPES} value={tipo} onChange={setTipo} placeholder="Buscar tipo…" /></Field>
        <Field label="Resultado"><Select value={resultado} onChange={(e) => setResultado(e.target.value as any)}><option>Negativo</option><option>Positivo</option></Select></Field>
        <Field label="Origen"><Input value={origen} onChange={(e) => setOrigen(e.target.value)} placeholder="Trujillo" /></Field>
        <div className="sm:col-span-2"><Field label="Observaciones / detalles"><TextArea rows={2} value={detalles} onChange={(e) => setDetalles(e.target.value)} /></Field></div>
        <div className="sm:col-span-2"><FileDrop label="Importar archivo de laboratorio" /></div>
      </div>
      <div className="mt-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">Análisis registrados</div>
        <Table head={['Análisis', 'Resultado', 'Fecha', 'Origen', 'Detalles']}>
          {examenes.map((e) => (
            <tr key={e.id} className="hover:bg-leaf-50/40">
              <td className="px-4 py-2.5 font-medium">{e.analisis}</td>
              <td className="px-4 py-2.5"><StatusPill estado={e.resultado === 'Negativo' ? 'Aprobado' : 'Por aprobar'} /></td>
              <td className="px-4 py-2.5 font-mono text-xs">{fmtDate(e.fecha)}</td>
              <td className="px-4 py-2.5 text-ink-soft">{e.origen}</td>
              <td className="px-4 py-2.5 text-xs text-ink-soft">{e.detalles}</td>
            </tr>
          ))}
          {examenes.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-ink-soft">Sin exámenes aún.</td></tr>}
        </Table>
      </div>
    </Modal>
  )
}

function ProviderProfile({ provider, onBack, onExam }: { provider: Provider; onBack: () => void; onExam: () => void }) {
  const s = useStore()
  const [tab, setTab] = useState('examen')
  const examenes = s.exams.filter((e) => e.providerId === provider.id)
  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-forest">← Volver</button>
      <div className="mb-4 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-xl font-bold">{provider.tipo} — {provider.nombres} {provider.apellidos}</h2>
        <p className="mt-1 text-sm text-ink-soft">Cantidad estimada: <b className="text-forest">{fmtNum(provider.cantidad ?? 0)} kg</b> · Zona: {provider.zona} · DNI {provider.dni}</p>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <Tabs tabs={['examen', 'entrevista']} active={tab} onChange={setTab} />
        {tab === 'examen' && <Button onClick={onExam}>+ Registrar examen</Button>}
      </div>
      {tab === 'examen' ? (
        <Table head={['Análisis', 'Resultado', 'Fecha', 'Origen', 'Detalles']}>
          {examenes.map((e) => (
            <tr key={e.id} className="hover:bg-leaf-50/40">
              <td className="px-4 py-3 font-medium">{e.analisis}</td>
              <td className="px-4 py-3"><StatusPill estado={e.resultado === 'Negativo' ? 'Aprobado' : 'Por aprobar'} /></td>
              <td className="px-4 py-3 font-mono text-xs">{fmtDate(e.fecha)}</td>
              <td className="px-4 py-3 text-ink-soft">{e.origen}</td>
              <td className="px-4 py-3 text-xs text-ink-soft">{e.detalles}</td>
            </tr>
          ))}
          {examenes.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-soft">Sin exámenes registrados.</td></tr>}
        </Table>
      ) : (
        <div className="rounded-xl border border-line bg-surface p-6 text-sm text-ink-soft">
          <p className="mb-3">Entrevista de campo del productor. Los datos se reutilizan en futuras campañas.</p>
          <FileDrop label="Adjuntar informe de entrevista (examen campo)" />
        </div>
      )}
    </div>
  )
}

function CampaignClients({ campaignId }: { campaignId: string }) {
  const s = useStore()
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState('')
  const [kg, setKg] = useState('')
  const withContract = s.clients.filter((c) => c.contratos.length > 0)
  const linked = s.clients.filter((c) => c.contratos.some((ct) => ct.campaignId === campaignId))
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-soft">Clientes con contrato en esta campaña. Puedes agregar clientes aunque esté en proceso.</p>
        <Button onClick={() => setOpen(true)}>+ Registrar cliente</Button>
      </div>
      <Table head={['Empresa', 'Representante', 'Contrato', 'Kg acordados', 'RUC', 'Correo']}>
        {linked.flatMap((c) => c.contratos.filter((ct) => ct.campaignId === campaignId).map((ct) => (
          <tr key={ct.id} className="animate-row hover:bg-leaf-50/40">
            <td className="px-4 py-3 font-medium">{c.empresa}</td>
            <td className="px-4 py-3 text-ink-soft">{c.representante}</td>
            <td className="px-4 py-3">{ct.nombre}</td>
            <td className="px-4 py-3 font-mono">{fmtNum(ct.kg)} kg</td>
            <td className="px-4 py-3 font-mono text-xs text-ink-soft">{c.ruc}</td>
            <td className="px-4 py-3 text-ink-soft">{c.correo}</td>
          </tr>
        )))}
        {linked.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-ink-soft">Sin clientes vinculados.</td></tr>}
      </Table>

      <Modal open={open} onClose={() => setOpen(false)} title="Registrar clientes por campaña"
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => {
            const cl = withContract.find((c) => c.empresa === sel)
            if (cl) { s.addContract(cl.id, { nombre: `Contrato ${cl.empresa}`, kg: Number(kg) || 0, documento: 'contrato.pdf', ficha: 'ficha.pdf', fecha: new Date().toISOString().slice(0, 10), campaignId }); s.toast('Cliente vinculado a la campaña') }
            setOpen(false)
          }}>Guardar</Button></>}
      >
        <div className="grid gap-4">
          <Field label="Seleccionar cliente" hint="Solo se muestran clientes que cuentan con contrato">
            <SearchableSelect options={withContract.map((c) => c.empresa)} value={sel} onChange={setSel} placeholder="Buscar cliente…" />
          </Field>
          <Field label="Cantidad (kg)"><Input type="number" value={kg} onChange={(e) => setKg(e.target.value)} /></Field>
          <FileDrop label="Adjuntar requerimientos" />
        </div>
      </Modal>
    </div>
  )
}

function CampaignTransport({ campaignId }: { campaignId: string }) {
  const s = useStore()
  const [open, setOpen] = useState(false)
  const [reqOpen, setReqOpen] = useState(false)
  const [sel, setSel] = useState<string[]>([])
  const [linked, setLinked] = useState<string[]>(['SUTRIMEX'])
  const rows = s.transporters.filter((t) => linked.includes(t.empresa))
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">Transportistas de la campaña</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setReqOpen(true)}>Enviar requerimientos</Button>
          <Button onClick={() => setOpen(true)}>+ Vincular transportista</Button>
        </div>
      </div>
      <Table head={['Empresa', 'Número', 'Correo', 'Vehículos', 'Acciones']}>
        {rows.map((t) => (
          <tr key={t.id} className="animate-row hover:bg-leaf-50/40">
            <td className="px-4 py-3 font-medium">{t.empresa}</td>
            <td className="px-4 py-3 font-mono text-xs text-ink-soft">{t.numero}</td>
            <td className="px-4 py-3 text-ink-soft">{t.correo}</td>
            <td className="px-4 py-3 font-mono">{t.vehiculos.length}</td>
            <td className="px-4 py-3"><StatusPill estado="Adelanto" /></td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-soft">Sin transportistas.</td></tr>}
      </Table>

      <Modal open={open} onClose={() => setOpen(false)} title="Vincular transportista"
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => { setLinked((l) => Array.from(new Set([...l, ...sel]))); s.toast('Transportista vinculado'); setOpen(false); setSel([]) }}>Guardar</Button></>}
      >
        <Field label="Seleccionar transportista">
          <div className="flex flex-col gap-2">
            {s.transporters.map((t) => (
              <label key={t.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:bg-leaf-50/50">
                <input type="checkbox" checked={sel.includes(t.empresa)} onChange={(e) => setSel((x) => e.target.checked ? [...x, t.empresa] : x.filter((y) => y !== t.empresa))} />
                {t.empresa} · <span className="text-ink-soft">{t.numero}</span>
              </label>
            ))}
          </div>
        </Field>
        <div className="mt-4"><FileDrop label="Adjuntar cotización" /></div>
      </Modal>

      <Modal open={reqOpen} onClose={() => setReqOpen(false)} title="Enviar requerimientos"
        footer={<><Button variant="outline" onClick={() => setReqOpen(false)}>Cancelar</Button>
          <Button onClick={() => { s.toast('Correo de requerimientos enviado'); setReqOpen(false) }}>Enviar</Button></>}
      >
        <div className="grid gap-4">
          <Field label="Detalles"><TextArea rows={3} placeholder="Necesitamos 3 unidades para el 15/02…" /></Field>
          <Field label="Transportistas seleccionados">
            <div className="flex flex-wrap gap-2">{s.transporters.map((t) => <Chip key={t.id}>{t.empresa}</Chip>)}</div>
          </Field>
          <FileDrop label="Adjuntar documento de requerimientos" />
        </div>
      </Modal>
    </div>
  )
}

function CampaignCerts({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false)
  const s = useStore()
  const [certs, setCerts] = useState([
    { n: 'Certificación 1.pdf', kb: 200 }, { n: 'Certificación 2.pdf', kb: 200 },
    { n: 'Certificación 3.pdf', kb: 200 }, { n: 'Certificación 4.pdf', kb: 200 },
  ])
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-soft">Estado de certificación · <b className="text-forest">{certs.length} certificaciones</b></p>
        <Button onClick={() => setOpen(true)}>+ Agregar certificación</Button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {certs.map((c) => (
          <div key={c.n} className="animate-row flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-clay/10 text-clay">📄</div>
            <div className="min-w-0"><div className="truncate text-sm font-medium">{c.n}</div><div className="font-mono text-xs text-ink-soft">{c.kb} KB</div></div>
          </div>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Registrar certificaciones"
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => { setCerts((c) => [...c, { n: `Certificación ${c.length + 1}.pdf`, kb: 200 }]); s.toast('Certificado registrado'); setOpen(false) }}>Guardar</Button></>}
      >
        <div className="grid gap-4">
          <Field label="Certificación"><Select><option>Internacional</option><option>Nacional (SENASA)</option><option>Global GAP</option></Select></Field>
          <FileDrop label="Importar documento" />
        </div>
      </Modal>
    </div>
  )
}

// ============================================================ PROVIDERS
export function ProvidersModule() {
  const s = useStore()
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<null | { mode: 'new' | 'edit'; data?: Provider }>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [section, setSection] = useState<{ providerId: string; kind: 'Fincas' | 'Certificados' } | null>(null)
  const rows = s.providers.filter(
    (p) => (`${p.nombres} ${p.apellidos} ${p.tipoDocumento} ${p.dni} ${p.zona} ${p.frutas.join(' ')}`).toLowerCase().includes(q.toLowerCase()),
  )

  if (section) return section.kind === 'Fincas' ? <ProviderFarms providerId={section.providerId} onBack={() => setSection(null)}/> : <ProviderCertificates providerId={section.providerId} onBack={() => setSection(null)}/>

  if (detail) {
    const provider = s.providers.find((p) => p.id === detail)
    if (provider) return <ProviderGeneralView provider={provider} onBack={() => setDetail(null)} />
  }

  return (
    <div>
      <PageHeader title="Gestión de proveedores" subtitle="Registro y consulta de datos generales de proveedores"
        action={<Button onClick={() => setModal({ mode: 'new' })}>+ Nuevo proveedor</Button>} />
      <DataLegend />
      <FilterBar onClear={() => setQ('')}>
        <Field label="Búsqueda"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, documento, zona o fruta…" /></Field>
      </FilterBar>
      <Table head={['Nombre completo', 'Tipo de documento', 'Número de documento', 'Zona', 'Frutas asociadas', <ProposalHeader>Variedades</ProposalHeader>, 'Sanidad agraria', 'Acciones']}>
        {rows.map((p) => (
          <tr key={p.id} className="animate-row hover:bg-leaf-50/40">
            <td className="px-4 py-3 font-medium">{p.nombres} {p.apellidos}</td>
            <td className="px-4 py-3">{p.tipoDocumento}</td>
            <td className="px-4 py-3 font-mono text-xs text-ink-soft">{p.dni}</td>
            <td className="px-4 py-3 text-ink-soft">{p.zona}</td>
            <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{p.frutas.slice(0, 2).map((fruit) => <Chip key={fruit}>{fruit}</Chip>)}{p.frutas.length > 2 && <span className="rounded-full bg-canvas px-2 py-1 text-xs text-ink-soft">+{p.frutas.length - 2}</span>}</div></td>
            <td className="px-4 py-3 text-ink">{p.variedades.length ? p.variedades.join(', ') : '—'}</td>
            <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${p.estadoExamenSanidad === 'Aprobado' ? 'bg-leaf-50 text-forest' : p.estadoExamenSanidad === 'Desaprobado' ? 'bg-red-50 text-red-700' : 'bg-canvas text-ink-soft'}`}>{p.estadoExamenSanidad || 'Sin registrar'}</span></td>
            <td className="px-4 py-3">
              <div className="flex gap-1.5">
                <IconBtn title={`Ver proveedor ${p.nombres} ${p.apellidos}`} onClick={() => setDetail(p.id)}><Eye /></IconBtn>
                <IconBtn title={`Editar proveedor ${p.nombres} ${p.apellidos}`} onClick={() => setModal({ mode: 'edit', data: p })}><Pen /></IconBtn>
                <ActionsMenu title={`Más opciones de ${p.nombres} ${p.apellidos}`} items={[{ label: 'Fincas', onClick: () => setSection({ providerId: p.id, kind: 'Fincas' }) }, { label: 'Certificados', onClick: () => setSection({ providerId: p.id, kind: 'Certificados' }) }]} />
              </div>
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-ink-soft">Sin proveedores.</td></tr>}
      </Table>
      {modal && <ProviderModal mode={modal.mode} data={modal.data} onClose={() => setModal(null)} />}
    </div>
  )
}

function ProviderModal({ mode, data, onClose }: { mode: 'new' | 'edit'; data?: Provider; onClose: () => void }) {
  const s = useStore()
  const [f, setF] = useState<Partial<Provider>>(data ?? { tipoDocumento: 'DNI', estadoExamenSanidad: '', frutas: [], variedades: [], certificados: [] })
  const [fruits, setFruits] = useState<string[]>(data?.frutas ?? (data?.fruta ? [data.fruta] : []))
  const [fruitChoice, setFruitChoice] = useState('')
  const [varieties, setVarieties] = useState<string[]>(data?.variedades ?? (data?.categoria ? [data.categoria] : []))
  const [varietyChoice, setVarietyChoice] = useState('')
  const [validationError, setValidationError] = useState('')
  const set = (k: keyof Provider, v: any) => setF((s) => ({ ...s, [k]: v }))
  const varietyOptions = Array.from(new Set(fruits.flatMap((fruit) => FRUIT_CATALOG[fruit] ?? [])))
  return (
    <Modal open onClose={onClose} wide title={mode === 'new' ? 'Registrar proveedor' : 'Editar proveedor'}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => {
          const issue=masterIssue('providers',{...f,id:data?.id},s.providers,data);if(issue){setValidationError(issue);return}
          const payload = { ...f, frutas: fruits, fruta: fruits[0] ?? '', variedades: varieties, categoria: varieties[0] ?? '', certificados: s.providers.find(p => p.id === data?.id)?.certificados || [], senasa: s.providers.find(p => p.id === data?.id)?.senasa || '', identidadDocumento: f.identidadDocumento || '', tipo: data?.tipo ?? 'Productor', estado: data?.estado ?? 'Por aprobar' } as Provider
          if (mode === 'new') { s.addProvider({ ...payload, fechaRegistro: new Date().toISOString().slice(0, 10) } as any); s.toast('Proveedor registrado') }
          else if (data) { s.updateProvider(data.id, payload); s.toast('Proveedor actualizado') }
          onClose()
        }}>{mode === 'new' ? 'Crear proveedor' : 'Guardar cambios'}</Button></>}
    >
      <DataLegend />
      {validationError && <p role="alert" className="mb-4 text-sm text-danger">{validationError}</p>}
      <h4 className="mb-3 font-display font-semibold text-ink">Datos generales</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombres"><Input value={f.nombres ?? ''} onChange={(e) => set('nombres', e.target.value)} /></Field>
        <Field label="Apellidos"><Input value={f.apellidos ?? ''} onChange={(e) => set('apellidos', e.target.value)} /></Field>
        <Field label="Tipo de documento"><Select value={f.tipoDocumento ?? 'DNI'} onChange={(e) => set('tipoDocumento', e.target.value)}><option>DNI</option><option>Carnet de extranjería</option><option>RUC</option></Select></Field>
        <Field label="Número de documento"><Input value={f.dni ?? ''} onChange={(e) => set('dni', e.target.value)} /></Field>
        <Field label="Zona"><Input value={f.zona ?? ''} onChange={(e) => set('zona', e.target.value)} /></Field>
        <Field label="Teléfono"><Input value={f.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={f.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Estado de sanidad agraria"><Select aria-label="Estado de sanidad agraria" value={f.estadoExamenSanidad ?? ''} onChange={e => set('estadoExamenSanidad', e.target.value)}><option value="">Sin registrar</option><option>Aprobado</option><option>Desaprobado</option></Select></Field>
        <Field label="Código de lugar de producción"><Input value={f.codigo ?? ''} onChange={(e) => set('codigo', e.target.value)} /></Field>
        {mode === 'edit' && <Field label="Identificador interno"><Input readOnly value={data?.id ?? ''} /></Field>}
        <div className="sm:col-span-2"><FileDrop label={f.identidadDocumento || "Adjuntar documento de identidad"} onFile={value=>set('identidadDocumento',value || '')}/></div>
      </div>

      <h4 className="mb-3 mt-6 font-display font-semibold text-ink">Frutas asociadas</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Seleccionar fruta"><SearchableSelect options={FRUIT_NAMES.filter((fruit) => !fruits.includes(fruit))} value={fruitChoice} onChange={(value) => { setFruits((current) => [...current, value]); setFruitChoice('') }} placeholder="Agregar fruta…" /></Field>
        <div className="flex flex-wrap items-end gap-2">{fruits.length === 0 && <span className="text-sm text-ink-soft">Sin frutas asociadas.</span>}{fruits.map((fruit) => <Chip key={fruit} onRemove={() => { setFruits((current) => current.filter((x) => x !== fruit)); setVarieties((current) => current.filter((v) => !(FRUIT_CATALOG[fruit] ?? []).includes(v))) }}>{fruit}</Chip>)}</div>
      </div>

      <div className="mt-6"><ProposalField note="Existe el catálogo de frutas derivadas; falta validar su asociación al proveedor."><h4 className="mb-3 font-display font-semibold text-ink">Variedades</h4><div className="grid gap-3 sm:grid-cols-2"><Field label="Seleccionar variedad del catálogo"><SearchableSelect options={varietyOptions.filter((v) => !varieties.includes(v))} value={varietyChoice} onChange={(value) => { setVarieties((current) => [...current, value]); setVarietyChoice('') }} placeholder="Seleccionar variedad…" /></Field><div className="flex flex-wrap items-end gap-2">{varieties.map((variety) => <Chip key={variety} onRemove={() => setVarieties((current) => current.filter((x) => x !== variety))}>{variety}</Chip>)}</div></div></ProposalField></div>


    </Modal>
  )
}

function ProviderGeneralView({ provider, onBack }: { provider: Provider; onBack: () => void }) {
  const s = useStore()
  return (
    <div>
      <Button variant="ghost" className="mb-4 px-0" onClick={onBack}>← Volver a proveedores</Button>
      <DataLegend />
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-line bg-surface p-5"><div><div className="text-xs font-semibold uppercase tracking-wide text-leaf">Proveedor {provider.id}</div><h1 className="mt-1 font-display text-2xl font-bold">{provider.nombres} {provider.apellidos}</h1><p className="mt-1 text-sm text-ink-soft">{provider.tipoDocumento} {provider.dni} · {provider.zona}</p></div></div>
      <h2 className="mb-3 font-display text-lg font-semibold">Datos generales</h2>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[['Identificador', provider.id], ['Nombre completo', `${provider.nombres} ${provider.apellidos}`], ['Documento', `${provider.tipoDocumento} ${provider.dni}`], ['Zona', provider.zona], ['Teléfono', provider.telefono], ['Email', provider.email], ['Código de lugar de producción', provider.codigo], ['Estado examen sanidad agraria', provider.estadoExamenSanidad]].map(([label, value]) => <div key={label} className="rounded-xl border border-line bg-surface p-4"><div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</div><div className="mt-1 text-sm font-medium">{value || '—'}</div></div>)}
        <div className="rounded-xl border border-line bg-surface p-4"><div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Documento de identidad</div><div className="mt-1 text-sm font-medium text-forest">{provider.identidadDocumento || 'Sin documento'}</div></div>
      </div>
      <h2 className="mb-3 font-display text-lg font-semibold">Frutas asociadas</h2>
      <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-line bg-surface p-4">{provider.frutas.map((fruit) => <Chip key={fruit}>{fruit}</Chip>)}</div>
      {provider.variedades.length > 0 && <div className="mb-6"><ProposalField note="Existe el catálogo de frutas derivadas; falta validar su asociación al proveedor."><h2 className="mb-2 font-display text-lg font-semibold text-ink">Variedades</h2><div className="flex flex-wrap gap-2">{provider.variedades.map((variety) => <Chip key={variety}>{variety}</Chip>)}</div></ProposalField></div>}

    </div>
  )
}

// ============================================================ CLIENTS (Gestión Comercial)
function ContractCampaignTags({ campaign }: { campaign?: Campaign }) {
  const year = campaign?.temporada || campaign?.fecha?.slice(0, 4) || 'Sin año'
  return <div className="flex flex-wrap gap-2"><Chip>Campaña: {campaign?.nombre || 'Sin campaña'}</Chip><span className="inline-flex items-center rounded-full border border-plan/20 bg-plan-50 px-2.5 py-1 text-xs font-medium text-plan">Año: {year}</span></div>
}

export function ClientsModule() {
  const s = useStore()
  const [tab, setTab] = useState('Clientes')
  const [editRequirementId, setEditRequirementId] = useState<string | null>(null)
  const [contractsId, setContractsId] = useState<string | null>(null)
  const [deliveriesId, setDeliveriesId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [modal, setModal] = useState<null | { mode: 'new' | 'edit'; data?: Client }>(null)
  const [clientDetail, setClientDetail] = useState<string | null>(null)
  const [participationDetail, setParticipationDetail] = useState<{ id: string; mode: 'view' | 'manage' } | null>(null)
  const [linkClient, setLinkClient] = useState<string | null | undefined>(undefined)
  const [campaignFilter, setCampaignFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')

  if (deliveriesId) return <CommercialDeliveriesModal requirementId={deliveriesId} asPage backLabel="← Volver" onClose={() => setDeliveriesId(null)} />
  if (contractsId) return <CommercialContractsModal requirementId={contractsId} asPage backLabel="← Volver" onClose={() => setContractsId(null)} />
  const editRequirement = s.requirements.find((r) => r.id === editRequirementId)
  const dialogs = <>{editRequirement && <CommercialParticipationModal requirement={editRequirement} onClose={() => setEditRequirementId(null)} onSaved={() => setEditRequirementId(null)} onOpenExisting={(id) => { setEditRequirementId(null); setParticipationDetail({ id, mode: 'view' }) }} />}</>
  if (participationDetail) return <><CommercialParticipationView requirementId={participationDetail.id} onBack={() => setParticipationDetail(null)} onManage={() => setContractsId(participationDetail.id)} onDeliveries={() => setDeliveriesId(participationDetail.id)} />{dialogs}</>
  if (clientDetail) {
    const client = s.clients.find((c) => c.id === clientDetail)
    if (client) return <CommercialClientView client={client} onBack={() => setClientDetail(null)} onOpenParticipation={(id) => setParticipationDetail({ id, mode: 'view' })} />
  }

  const clients = s.clients.filter((c) => (`${c.empresa} ${c.representante} ${c.correo} ${c.ruc} ${c.telefono}`).toLowerCase().includes(q.toLowerCase()))
  const requirements = s.requirements.filter((r) => {
    const client = s.clients.find((c) => c.id === r.clientId)
    const campaign = s.campaigns.find((c) => c.id === r.campaignId)
    const matchesSearch = `${client?.empresa} ${client?.representante} ${campaign?.nombre}`.toLowerCase().includes(q.toLowerCase())
    return matchesSearch && (!campaignFilter || r.campaignId === campaignFilter) && (!clientFilter || r.clientId === clientFilter)
  })

  return (
    <div>
      <PageHeader title="Gestión Comercial" subtitle="Clientes y contratos por campaña"
        action={<Button onClick={() => setModal({ mode: 'new' })}>+ Nuevo cliente</Button>} />
      <DataLegend />
      <Tabs tabs={['Clientes', 'Contratos']} active={tab} onChange={setTab} />
      <FilterBar onClear={() => { setQ(''); setCampaignFilter(''); setClientFilter('') }}>
        <Field label="Búsqueda"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === 'Clientes' ? 'Empresa, contacto, documento o correo…' : 'Cliente o campaña…'} /></Field>
        {tab === 'Contratos' && <><Field label="Campaña"><Select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)}><option value="">Todas</option>{s.campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.nombre}</option>)}</Select></Field><Field label="Cliente"><Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}><option value="">Todos</option>{s.clients.map((client) => <option key={client.id} value={client.id}>{client.empresa}</option>)}</Select></Field></>}
      </FilterBar>
      {tab === 'Clientes' ? (
        <Table head={['Empresa', 'Contacto', 'Teléfono', 'Correo corporativo', 'RUC', 'Tipo de cliente', 'Acciones']}>
          {clients.map((c) => (
            <tr key={c.id} className="animate-row hover:bg-leaf-50/40">
              <td className="px-4 py-3 font-medium">{c.empresa}</td>
              <td className="px-4 py-3 text-ink-soft">{c.representante}</td>
              <td className="px-4 py-3 font-mono text-xs text-ink-soft">{c.telefono}</td>
              <td className="px-4 py-3 text-ink-soft">{c.correo}</td>
              <td className="px-4 py-3 font-mono text-xs text-ink-soft">{c.ruc}</td>
              <td className="px-4 py-3">{c.tipo}</td>
              <td className="px-4 py-3"><div className="flex gap-1.5">
                <IconBtn title={`Ver cliente ${c.empresa}`} onClick={() => setClientDetail(c.id)}><Eye /></IconBtn>
                <IconBtn title={`Editar cliente ${c.empresa}`} onClick={() => setModal({ mode: 'edit', data: c })}><Pen /></IconBtn>
                <IconBtn title={`Vincular ${c.empresa} a campaña`} onClick={() => setLinkClient(c.id)}><Link /></IconBtn>
              </div></td>
            </tr>
          ))}
          {clients.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-soft">Sin clientes.</td></tr>}
        </Table>
      ) : (
        <div>
          <Table head={['Cliente', 'Campaña / año', 'Cantidad en kg', 'Kilos acordados', 'Fecha de registro', 'Contrato', 'Acciones']}>
            {requirements.map((r) => {
              const client = s.clients.find((c) => c.id === r.clientId)
              const campaign = s.campaigns.find((c) => c.id === r.campaignId)
              return <tr key={r.id} className="animate-row hover:bg-leaf-50/40"><td className="px-4 py-3 font-medium">{client?.empresa}</td><td className="px-4 py-3"><ContractCampaignTags campaign={campaign} /></td><td className="px-4 py-3 font-mono">{fmtNum(r.kilos)}</td><td className="px-4 py-3 font-mono">{r.kilosAcordados > 0 ? fmtNum(r.kilosAcordados) : 'Sin contrato'}</td><td className="px-4 py-3 font-mono text-xs">{fmtDate(r.fechaRegistro)}</td><td className="px-4 py-3">{r.contratos?.length ? <span>{r.contratos.length} contrato(s)</span> : <span className="text-ink-soft">Sin contratos</span>}</td><td className="px-4 py-3"><div className="flex gap-1.5"><IconBtn title={`Ver participación de ${client?.empresa}`} onClick={() => setParticipationDetail({ id: r.id, mode: 'view' })}><Eye /></IconBtn><IconBtn title={`Editar participación de ${client?.empresa}`} onClick={() => setEditRequirementId(r.id)}><Pen /></IconBtn><ActionsMenu title={`Más opciones de ${client?.empresa}`} items={[{ label: 'Contratos', onClick: () => setContractsId(r.id) }, ...(r.contratos?.length ? [{ label: 'Entregas', onClick: () => setDeliveriesId(r.id) }] : [])]} /></div></td></tr>
            })}
            {requirements.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-soft">No hay participaciones que coincidan con los filtros.</td></tr>}
          </Table>
        </div>
      )}
      {dialogs}
      {modal && <ClientModal mode={modal.mode} data={modal.data} onClose={() => setModal(null)} />}
      {linkClient !== undefined && <CommercialParticipationModal selectedClientId={linkClient ?? undefined} onClose={() => setLinkClient(undefined)} onSaved={(id) => { setLinkClient(undefined); setParticipationDetail({ id, mode: 'view' }) }} onOpenExisting={(id) => { setLinkClient(undefined); setParticipationDetail({ id, mode: 'view' }) }} />}
    </div>
  )
}

function ClientModal({ mode, data, onClose }: { mode: 'new' | 'edit'; data?: Client; onClose: () => void }) {
  const s = useStore()
  const [f, setF] = useState<Partial<Client>>(data ?? { tipo: 'Exportador' })
  const [validationError, setValidationError] = useState('')
  const set = (k: keyof Client, v: any) => setF((s) => ({ ...s, [k]: v }))
  return (
    <Modal open onClose={onClose} wide title={mode === 'new' ? 'Registrar cliente' : 'Editar cliente'}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => {
          const issue=masterIssue('clients',{...f,id:data?.id},s.clients,data);if(issue){setValidationError(issue);return}
          if (mode === 'new') { s.addClient({ ...f, contratos: [], fechaRegistro: new Date().toISOString().slice(0, 10) } as Client); s.toast('Cliente registrado') }
          else if (data) { s.updateClient(data.id, f); s.toast('Cliente actualizado') }
          onClose()
        }}>{mode === 'new' ? 'Crear cliente' : 'Guardar cambios'}</Button></>}
    >
      {validationError && <p role="alert" className="mb-4 text-sm text-danger">{validationError}</p>}
      <DataLegend />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Empresa"><Input value={f.empresa ?? ''} onChange={(e) => set('empresa', e.target.value)} /></Field>
        <Field label="Nombre de contacto"><Input value={f.representante ?? ''} onChange={(e) => set('representante', e.target.value)} /></Field>
        <Field label="Teléfono"><Input value={f.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} /></Field>
        <Field label="RUC"><Input value={f.ruc ?? ''} onChange={(e) => set('ruc', e.target.value)} /></Field>
        <Field label="Correo corporativo"><Input type="email" value={f.correo ?? ''} onChange={(e) => set('correo', e.target.value)} /></Field>
        <Field label="Ubicación"><Input value={f.ubicacion ?? ''} onChange={(e) => set('ubicacion', e.target.value)} /></Field>
        <Field label="Tipo de cliente"><Select value={f.tipo} onChange={(e) => set('tipo', e.target.value)}><option>Exportador</option><option>Industria</option></Select></Field>
      </div>
    </Modal>
  )
}

function CommercialParticipationModal({ selectedClientId, fixedCampaignId, requirement, onClose, onSaved, onOpenExisting }: { selectedClientId?: string; fixedCampaignId?: string; requirement?: ReturnType<typeof useStore>['requirements'][number]; onClose: () => void; onSaved: (id: string) => void; onOpenExisting: (id: string) => void }) {
  const s = useStore()
  const selectedClient = s.clients.find((c) => c.id === (requirement?.clientId ?? selectedClientId))
  const fixedCampaign = s.campaigns.find((c) => c.id === (requirement?.campaignId ?? fixedCampaignId))
  const [clientName, setClientName] = useState(selectedClient?.empresa ?? '')
  const [campaignName, setCampaignName] = useState(fixedCampaign?.nombre ?? '')
  const [quantity, setQuantity] = useState(String(requirement?.kilos ?? ''))
  const [registrationDate, setRegistrationDate] = useState(requirement?.fechaRegistro ?? new Date().toISOString().slice(0, 10))
  const [varieties, setVarieties] = useState<string[]>(requirement?.variedades ?? (requirement?.variedad ? requirement.variedad.split(', ').filter(Boolean) : []))
  const [error, setError] = useState('')
  const [missingFruit, setMissingFruit] = useState('')
  const [technicalSheet, setTechnicalSheet] = useState(requirement?.ficha ?? '')
  const [destination, setDestination] = useState(requirement?.destino ?? '')
  const [deliveryStart, setDeliveryStart] = useState(requirement?.entregaInicio ?? '')
  const [deliveryEnd, setDeliveryEnd] = useState(requirement?.entregaFin ?? '')
  const [notes, setNotes] = useState(requirement?.observaciones ?? '')
  const client = s.clients.find((c) => c.empresa === clientName)
  const campaign = s.campaigns.find((c) => c.nombre === campaignName)
  const campaignFruits = Array.from(new Set([...(campaign?.frutas ?? []), campaign?.fruta ?? ''].filter(Boolean)))
  const catalogVarieties = campaignFruits.flatMap((fruit) => { const name = FRUIT_NAMES.find((name) => name.localeCompare(fruit.trim(), 'es', { sensitivity: 'base' }) === 0); return name ? FRUIT_CATALOG[name] : [] })
  const availableVarieties = Array.from(new Set([...catalogVarieties, ...(campaign?.derivadas ?? [])]))
  const existing = client && campaign ? s.requirements.find((r) => r.clientId === client.id && r.campaignId === campaign.id && r.id !== requirement?.id) : undefined
  return (
    <Modal open onClose={onClose} wide title={requirement ? 'Editar participación comercial' : 'Vincular cliente a campaña'}
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => {
          if (!client || !campaign || existing) { setError('Selecciona cliente y campaña.'); return }
          if (!!deliveryStart !== !!deliveryEnd || (deliveryStart && deliveryEnd < deliveryStart)) { setError('Completa ambas fechas de entrega; Hasta no debe ser anterior a Desde.'); return }
          const variety = varieties.join(', ')
          const delivery = deliveryStart && deliveryEnd ? `${fmtDate(deliveryStart)} – ${fmtDate(deliveryEnd)}` : ''
          if (requirement) {
            s.updateRequirement(requirement.id, { kilos: Number(quantity) || 0, fechaRegistro: registrationDate, variedad: variety, variedades: varieties, ficha: technicalSheet || undefined, destino: destination, entrega: delivery, entregaInicio: deliveryStart, entregaFin: deliveryEnd, observaciones: notes })
            s.toast('Participación actualizada'); onSaved(requirement.id)
          } else {
            const id = s.addRequirement({ campaignId: campaign.id, clientId: client.id, fruta: campaign.fruta, variedad: variety, variedades: varieties, canal: client.tipo === 'Industria' ? 'Industria' : 'Exportación', destino: destination, kilos: Number(quantity) || 0, kilosAcordados: 0, fechaRegistro: registrationDate, entrega: delivery, entregaInicio: deliveryStart, entregaFin: deliveryEnd, moneda: 'USD', estado: 'Requerimiento registrado', condiciones: '', calidad: '', ficha: technicalSheet || undefined, observaciones: notes, entregas: [] })
            s.toast('Cliente vinculado a la campaña sin exigir contrato')
            onSaved(id)
          }
        }}>{requirement ? 'Guardar cambios' : 'Guardar participación'}</Button></>}
    >
      <DataLegend />
      <div className="grid gap-4 sm:grid-cols-2">
        {selectedClientId || requirement ? <Field label="Cliente seleccionado"><Input readOnly value={clientName} /></Field> : <Field label="Seleccionar cliente"><SearchableSelect options={s.clients.map((c) => c.empresa)} value={clientName} onChange={setClientName} placeholder="Buscar cliente…" /></Field>}
        {fixedCampaignId || requirement ? <Field label="Campaña"><Input readOnly value={campaignName} /></Field> : <Field label="Campaña"><SearchableSelect options={s.campaigns.map((c) => c.nombre)} value={campaignName} onChange={(value) => { setCampaignName(value); setVarieties([]) }} placeholder="Seleccionar campaña…" /></Field>}
        <Field label="Cantidad en kg" ><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></Field>
        <Field label="Fecha de registro"><Input type="date" value={registrationDate} onChange={(e) => setRegistrationDate(e.target.value)} /></Field>
      </div>
      <div className="mt-4"><Field label="Ficha técnica"><FileDrop label={technicalSheet || 'Subir ficha técnica'} onFile={(name) => setTechnicalSheet(name ?? '')} /></Field>{technicalSheet && <div className="mt-2 flex gap-2"><Button variant="outline" onClick={() => void openStoredDocument(technicalSheet,false).catch(e=>s.toast(e.message))}>Ver</Button><Button variant="ghost" onClick={() => void openStoredDocument(technicalSheet,true).catch(e=>s.toast(e.message))}>Descargar</Button></div>}</div>
      {existing && <div className="mt-4 rounded-xl border border-proc/30 bg-proc-50 p-4 text-sm text-proc"><b>El cliente ya participa en esta campaña.</b><Button variant="outline" className="mt-3" onClick={() => onOpenExisting(existing.id)}>Abrir participación existente</Button></div>}
      <div className="mt-5 space-y-4">
        <fieldset className="rounded-xl border border-line p-4"><legend className="px-1 text-xs font-semibold uppercase text-ink-soft">Variedades requeridas por el cliente</legend><p className="mb-3 text-xs text-ink-soft">Selecciona una o varias variedades de la fruta de esta campaña.</p><div className="flex flex-wrap gap-3">{availableVarieties.map((v) => <label key={v} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm"><input type="checkbox" className="accent-forest" checked={varieties.includes(v)} onChange={(e) => setVarieties((current) => e.target.checked ? [...current, v] : current.filter((item) => item !== v))} />{v}</label>)}</div>{!campaign && <p className="text-sm text-ink-soft">Selecciona primero la campaña.</p>}{campaign && !availableVarieties.length && <div className="mt-2 rounded-lg bg-canvas p-3"><p className="mb-3 text-sm text-ink-soft">Esta campaña no tiene frutas con variedades registradas. Define la fruta para mostrar sus opciones.</p><div className="flex flex-wrap items-end gap-3"><Field label="Fruta de la campaña"><Select aria-label="Fruta de la campaña" value={missingFruit} onChange={(e) => setMissingFruit(e.target.value)}><option value="">Seleccionar fruta</option>{FRUIT_NAMES.map((fruit) => <option key={fruit}>{fruit}</option>)}</Select></Field><Button variant="outline" disabled={!missingFruit} onClick={() => { s.updateCampaign(campaign.id, { fruta: missingFruit, frutas: [missingFruit], derivadas: FRUIT_CATALOG[missingFruit] }); setVarieties([]); s.toast('Fruta de campaña actualizada') }}>Guardar fruta</Button></div></div>}</fieldset>
        <Field label="Destino solicitado"><Input aria-label="Destino solicitado" placeholder="Países Bajos — Rotterdam / Perú — planta en Lima" value={destination} onChange={(e) => setDestination(e.target.value)} /></Field>
        <fieldset className="rounded-xl border border-line p-4"><legend className="px-1 text-xs font-semibold uppercase text-ink-soft">Ventana de entrega</legend><p className="mb-3 text-xs text-ink-soft">Periodo en el que el cliente necesita recibir la fruta.</p><div className="grid gap-4 sm:grid-cols-2"><Field label="Desde"><Input aria-label="Entrega desde" type="date" value={deliveryStart} onChange={(e) => setDeliveryStart(e.target.value)} /></Field><Field label="Hasta"><Input aria-label="Entrega hasta" type="date" min={deliveryStart || undefined} value={deliveryEnd} onChange={(e) => setDeliveryEnd(e.target.value)} /></Field></div></fieldset>
        <Field label="Observaciones"><TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  )
}

function CommercialClientView({ client, onBack, onOpenParticipation }: { client: Client; onBack: () => void; onOpenParticipation: (id: string) => void }) {
  const s = useStore()
  const [editOpen, setEditOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const participations = s.requirements.filter((r) => r.clientId === client.id)
  return (
    <div>
      <Button variant="ghost" className="mb-4 px-0" onClick={onBack}>← Volver a clientes</Button>
      <DataLegend />
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-line bg-surface p-5">
        <div><h1 className="font-display text-2xl font-bold">{client.empresa}</h1><p className="mt-1 text-sm text-ink-soft">Contacto: {client.representante} · <span className="rounded bg-leaf-50 px-1.5 py-0.5 text-xs font-medium text-forest">{client.tipo}</span></p></div>
        <div className="flex gap-2"></div>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[['Teléfono', client.telefono], ['RUC', client.ruc], ['Correo', client.correo], ['Ubicación', client.ubicacion], ['Registro', fmtDate(client.fechaRegistro)]].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line bg-surface px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{k}</div>
            <div className="mt-1 text-sm font-medium">{v}</div>
          </div>
        ))}
      </div>
      <h2 className="mb-3 font-display text-lg font-semibold">Participaciones por campaña</h2>
      <Table head={['Campaña', 'Cantidad en kg', 'Kilos acordados', 'Fecha de registro', 'Contrato', 'Ficha técnica', 'Acciones']}>
        {participations.map((r) => <tr key={r.id}><td className="px-4 py-3 font-medium">{s.campaigns.find((c) => c.id === r.campaignId)?.nombre}</td><td className="px-4 py-3 font-mono">{fmtNum(r.kilos)}</td><td className="px-4 py-3 font-mono">{fmtNum(r.kilosAcordados)}</td><td className="px-4 py-3 font-mono text-xs">{fmtDate(r.fechaRegistro)}</td><td className="px-4 py-3">{r.contratos?.length ? `${r.contratos.length} contrato(s)` : 'Sin contratos'}</td><td className="px-4 py-3">{r.ficha ? 'Ver documento' : 'Sin documento'}</td><td className="px-4 py-3"><Button variant="ghost" onClick={() => onOpenParticipation(r.id)}>Abrir participación</Button></td></tr>)}
        {participations.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-soft">Cliente registrado sin participaciones en campañas.</td></tr>}
      </Table>
      {editOpen && <ClientModal mode="edit" data={client} onClose={() => setEditOpen(false)} />}
      {linkOpen && <CommercialParticipationModal selectedClientId={client.id} onClose={() => setLinkOpen(false)} onSaved={(id) => { setLinkOpen(false); onOpenParticipation(id) }} onOpenExisting={(id) => { setLinkOpen(false); onOpenParticipation(id) }} />}
    </div>
  )
}

function CommercialDocumentCard({ title, file }: { title: string; file?: string }) {
  const s = useStore()
  return <div className="rounded-xl border border-line bg-surface p-4"><div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{title}</div><div className="mt-2 text-sm font-medium">{documentName(file) || 'Sin documento'}</div>{file && <div className="mt-3 flex gap-2"><Button variant="outline" className="px-3 py-1.5" onClick={() => void openStoredDocument(file,false).catch(e=>s.toast(e.message))}>Ver</Button><Button variant="ghost" className="px-3 py-1.5" onClick={() => void openStoredDocument(file,true).catch(e=>s.toast(e.message))}>Descargar</Button></div>}</div>
}

function CommercialParticipationView({ requirementId, onBack, onManage, onDeliveries }: { requirementId: string; onBack: () => void; onManage: () => void; onDeliveries?: () => void }) {
  const s = useStore()
  const requirement = s.requirements.find((r) => r.id === requirementId)!
  const client = s.clients.find((c) => c.id === requirement.clientId)!
  const campaign = s.campaigns.find((c) => c.id === requirement.campaignId)!
  const programmed = requirement.entregas.reduce((sum, item) => sum + item.kilos, 0)
  const relatedDeliveries = s.logisticsDeliveries.filter((delivery) => delivery.campaignId === requirement.campaignId && delivery.clientId === requirement.clientId)
  return (
    <div>
      <Button variant="ghost" className="mb-4 px-0" onClick={onBack}>← Volver</Button>
      <DataLegend />
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-line bg-surface p-5"><div><div className="text-xs font-semibold uppercase tracking-wide text-leaf">Consulta cliente–campaña</div><h1 className="mt-1 font-display text-2xl font-bold">{client.empresa} — {campaign.nombre}</h1><p className="mt-1 text-sm text-ink-soft">Contacto: {client.representante}</p></div><div className="flex gap-2">{onDeliveries && null}</div></div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[['Empresa y contacto', `${client.empresa} · ${client.representante}`], ['Fruta de campaña', campaign.fruta], ['Cantidad registrada', `${fmtNum(requirement.kilos)} kg`], ['Fecha de registro', fmtDate(requirement.fechaRegistro)], ['Kilos acordados', requirement.kilosAcordados > 0 ? `${fmtNum(requirement.kilosAcordados)} kg` : 'Sin acuerdo definido']].map(([label, value]) => <div key={label} className="rounded-xl border border-line bg-surface p-4"><div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</div><div className="mt-1 text-sm font-medium">{value}</div></div>)}</div>
      <h2 className="mb-3 font-display text-lg font-semibold">Documentos</h2>
      <div className="mb-3 grid gap-3 sm:grid-cols-2"><CommercialDocumentCard title="Ficha técnica" file={requirement.ficha} /><div className="rounded-xl border border-line bg-surface p-4"><div className="text-xs font-semibold uppercase text-ink-soft">Contratos</div><div className="mt-2 text-sm">{requirement.contratos?.length || 0} registrados</div></div></div>
      {(requirement.variedad || requirement.destino || requirement.entrega) && <div className="mb-6"><ProposalField><div className="mb-3 font-display text-base font-semibold text-ink">Información estructurada del requerimiento</div><div className="grid gap-3 sm:grid-cols-3">{[['Variedades requeridas', requirement.variedad || 'Sin información'], ['Destino solicitado', requirement.destino || 'Sin información'], ['Ventana de entrega', requirement.entrega || 'Sin información']].map(([label, value]) => <div key={label}><div className="text-xs font-semibold uppercase">{label}</div><div className="mt-1 text-sm">{value}</div></div>)}</div></ProposalField></div>}
      {requirement.entregas.length > 0 && <ProposalField><h2 className="mb-3 font-display text-base font-semibold text-ink">Resumen de entregas programadas</h2><div className="grid gap-2">{requirement.entregas.map((item) => <div key={item.id} className="flex justify-between rounded-lg bg-surface p-3 text-sm"><span>{fmtDate(item.fecha)}</span><b>{fmtNum(item.kilos)} kg</b></div>)}</div><div className="mt-3 text-sm">Total programado: <b>{fmtNum(programmed)} kg</b></div></ProposalField>}
      {relatedDeliveries.length > 0 && <div className="mt-6"><TransportProposalField ><h2 className="mb-3 font-display text-base font-semibold text-ink">Entregas logísticas relacionadas</h2>{relatedDeliveries.map((delivery) => <div key={delivery.id} className="flex justify-between rounded-lg bg-surface p-3 text-sm"><span>{delivery.reference} · {delivery.destination}</span><b>{delivery.logisticsStatus}</b></div>)}</TransportProposalField></div>}
    </div>
  )
}

function CommercialAgreementManager({ requirementId, onBack }: { requirementId: string; onBack: () => void }) {
  const [contractOpen, setContractOpen] = useState(true)
  const [deliveriesOpen, setDeliveriesOpen] = useState(false)
  return <><CommercialParticipationView requirementId={requirementId} onBack={onBack} onManage={() => setContractOpen(true)} onDeliveries={() => setDeliveriesOpen(true)} />{contractOpen && <CommercialContractsModal requirementId={requirementId} onClose={() => setContractOpen(false)} />}{deliveriesOpen && <CommercialDeliveriesModal requirementId={requirementId} onClose={() => setDeliveriesOpen(false)} />}</>
}

function CommercialContractsModal({ requirementId, onClose, asPage = false, backLabel = '← Volver a clientes' }: { requirementId: string; onClose: () => void; asPage?: boolean; backLabel?: string }) {
  const s = useStore()
  const r = s.requirements.find((item) => item.id === requirementId)!
  const client = s.clients.find((item) => item.id === r.clientId)!
  const campaign = s.campaigns.find((item) => item.id === r.campaignId)!
  const [edit, setEdit] = useState<{ id?: string } | null>(null)
  const [deliveries, setDeliveries] = useState<string | null>(null)
  const content = <>
    <div className="mb-4 rounded-xl bg-canvas p-4"><b>{client.empresa}</b><div className="mt-2"><ContractCampaignTags campaign={campaign} /></div><p className="mt-2 text-sm">Total acordado: {fmtNum(r.kilosAcordados)} kg en {r.contratos?.length || 0} contrato(s).</p></div>
    <Button className="mb-4" onClick={() => setEdit({})}>+ Registrar contrato</Button>
    {edit && <CommercialContractModal requirementId={requirementId} contractId={edit.id} onClose={() => setEdit(null)} />}
    <Table head={['Contrato', 'Fecha', 'Kilos', 'Precio/kg', 'Precio total', 'Entregas', 'Acciones']}>{r.contratos?.map((item, index) => <tr key={item.id}><td className="px-4 py-3"><b>Contrato {index + 1}</b><div className="text-xs text-ink-soft">{documentName(item.contrato)}</div></td><td className="px-4 py-3">{fmtDate(item.fecha)}</td><td className="px-4 py-3">{fmtNum(item.kilos)}</td><td className="px-4 py-3">{item.precio == null ? 'Sin precio' : `${item.moneda} ${item.precio}`}</td><td className="whitespace-nowrap px-4 py-3 font-semibold">{item.precio == null ? 'Sin precio' : `${item.moneda} ${(item.precio * item.kilos).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td><td className="px-4 py-3">{item.entregas.length}</td><td className="px-4 py-3"><div className="flex gap-1"><Button variant="ghost" onClick={() => setEdit({ id: item.id })}>Editar</Button><Button variant="outline" onClick={() => setDeliveries(item.id)}>Entregas</Button></div></td></tr>)}{!r.contratos?.length && <tr><td colSpan={7} className="p-6 text-center text-ink-soft">Sin contratos registrados.</td></tr>}</Table>
  </>
  if (deliveries) return <CommercialDeliveriesModal requirementId={requirementId} contractId={deliveries} asPage onClose={() => setDeliveries(null)} />
  if (asPage) return <div><Button variant="ghost" className="mb-4 px-0" onClick={onClose}>{backLabel}</Button><h2 className="mb-4 font-display text-lg font-semibold">Contratos del cliente en campaña</h2>{content}</div>
  return <Modal open wide onClose={onClose} title="Contratos del cliente en campaña" footer={<Button variant="outline" onClick={onClose}>Cerrar</Button>}>{content}</Modal>
}

export function CommercialContractModal({ requirementId, contractId, onClose, asPage = false }: { requirementId: string; contractId?: string; onClose: () => void; asPage?: boolean }) {
  const s = useStore()
  const r = s.requirements.find((item) => item.id === requirementId)!
  const client = s.clients.find((item) => item.id === r.clientId)!
  const campaign = s.campaigns.find((item) => item.id === r.campaignId)!
  const existing = r.contratos?.find((item) => item.id === contractId)
  const [form, setForm] = useState({ precio: String(existing?.precio ?? ''), moneda: existing?.moneda || r.moneda || 'USD', cantidad: String(existing?.kilos || ''), pago: existing?.condicionesPago || '', entrega: existing?.condicionesEntrega || '', observaciones: existing?.observaciones || '', archivo: existing?.contrato || '' })
  const [error, setError] = useState('')
  const save = () => {
    const kilos = Number(form.cantidad)
    const price = Number(form.precio)
    if (!form.archivo) { setError('Adjunta el contrato para guardarlo.'); return }
    if (!Number.isFinite(kilos) || kilos <= 0) { setError('La cantidad debe ser mayor a cero.'); return }
    if (form.precio && (!Number.isFinite(price) || price < 0)) { setError('El precio no puede ser negativo.'); return }
    const candidate = { id: existing?.id, kilos, precio:form.precio ? price : undefined, moneda:form.moneda, entregas:existing?.entregas||[] }
    const issue=contractIssue(s,r.id,candidate,existing);if(issue){setError(issue);return}
    s.saveCommercialContract(r.id, { id: existing?.id, fecha: existing?.fecha || new Date().toISOString().slice(0, 10), contrato: form.archivo, kilos, precio: form.precio ? price : undefined, moneda: form.moneda, condicionesPago: form.pago, condicionesEntrega: form.entrega, observaciones: form.observaciones, entregas: existing?.entregas || [] })
    s.toast(existing ? 'Contrato actualizado' : 'Nuevo contrato registrado')
    onClose()
  }
  const title = existing ? 'Editar contrato' : 'Registrar contrato'
  const footer = <><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save}>Guardar contrato</Button></>
  const body = <>
    <div className="mb-5 grid gap-3 sm:grid-cols-2 rounded-xl bg-canvas p-4"><div><div className="text-xs text-ink-soft">Cliente</div><b>{client.empresa}</b></div><div><div className="text-xs text-ink-soft">Campaña</div><b>{campaign.nombre}</b></div></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Precio por kg"><Input type="number" min="0" step="any" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} /></Field>
      <Field label="Moneda"><Select value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })}><option>USD</option><option>PEN</option><option>EUR</option></Select></Field>
      <Field label="Cantidad propuesta (kg)" hint="Al registrar el contrato, esta cantidad se guarda como kilos acordados."><Input type="number" min="0" step="any" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} /></Field>
      <Field label="Condiciones de pago"><Input value={form.pago} onChange={(e) => setForm({ ...form, pago: e.target.value })} /></Field>
      <Field label="Condiciones de entrega"><Input value={form.entrega} onChange={(e) => setForm({ ...form, entrega: e.target.value })} /></Field>
      <Field label="Observaciones"><TextArea rows={2} value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></Field>
      <div className="sm:col-span-2"><Field label="Contrato"><FileDrop label={form.archivo || 'Adjuntar contrato'} onFile={(name) => setForm({ ...form, archivo: name || '' })} /></Field></div>
    </div>
    {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
  </>
  if (asPage) return <div><Button variant="ghost" className="mb-4 px-0" onClick={onClose}>← Volver a contratos</Button><h2 className="mb-4 font-display text-lg font-semibold">{title}</h2><div className="rounded-2xl border border-line bg-surface p-5">{body}<div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">{footer}</div></div></div>
  return <Modal open wide onClose={onClose} title={title} footer={footer}>{body}</Modal>
}

function CampaignDeliveries({campaign}:{campaign:Campaign}) {
  const s=useStore();const [selected,setSelected]=useState<{requirementId:string;contractId:string;deliveryId:string}|null>(null);const [view,setView]=useState<QualityOperation['sourceDelivery']>();const [choosing,setChoosing]=useState(false);const [choice,setChoice]=useState('')
  if(selected)return <CommercialDeliveriesModal {...selected} execution asPage onClose={()=>setSelected(null)} backLabel="← Volver a entregas de campaña"/>
  const entries=s.requirements.filter(r=>r.campaignId===campaign.id).flatMap(r=>(r.contratos||[]).flatMap(c=>c.entregas.map(d=>({r,c,d,source:{requirementId:r.id,contractId:c.id,deliveryId:d.id}}))))
  const available=entries.filter(e=>!deliveryHasLoad(s.qualityOperations,s.campaignTransporters,e.source)).sort((a,b)=>Number(deliveryReady(s,a.source))-Number(deliveryReady(s,b.source)))
  const choiceKey=(source:NonNullable<QualityOperation['sourceDelivery']>)=>`${source.requirementId}|${source.contractId}|${source.deliveryId}`
  const chosen=available.find(e=>choiceKey(e.source)===choice)
  return <div><div className="mb-4 flex flex-wrap items-center justify-between gap-4"><div><h2 className="mb-2 font-display text-lg font-semibold">Entregas de la campaña</h2><p className="text-sm text-ink-soft">Completa el transporte, camión, chofer, proveedores y fincas de las entregas programadas en Planificación Comercial.</p></div><Button onClick={()=>{setChoice('');setChoosing(true)}}>Completar datos de entrega</Button></div><Table head={['Cliente / contrato','Fecha programada','Kilos','Destino','Preparación','Acciones']}>{entries.map(({r,c,d,source})=>{const used=deliveryHasLoad(s.qualityOperations,s.campaignTransporters,source);return <tr key={`${c.id}-${d.id}`}><td className="p-3">{s.clients.find(client=>client.id===r.clientId)?.empresa}<div className="text-xs text-ink-soft">{documentName(c.contrato)}</div></td><td className="p-3">{fmtDate(d.fecha)}</td><td className="p-3">{fmtNum(d.kilos)} kg</td><td className="p-3">{d.destino}</td><td className="p-3">{used?'Con carga registrada':deliveryReady(s,source)?'Lista para carga':'Por completar'}</td><td className="p-3"><Button variant="outline" onClick={()=>used?setView(source):setSelected({requirementId:r.id,contractId:c.id,deliveryId:d.id})}>{used?'Ver entrega':deliveryReady(s,source)?'Editar coordinación':'Completar entrega'}</Button></td></tr>})}{!entries.length&&<tr><td colSpan={6} className="p-6 text-center text-ink-soft">No hay entregas programadas. Regístralas primero en Clientes → Contratos → Entregas o desde Gestión Comercial.</td></tr>}</Table>{choosing&&<Modal open title="Seleccionar entrega programada" onClose={()=>setChoosing(false)} footer={<><Button variant="outline" onClick={()=>setChoosing(false)}>Cancelar</Button><Button disabled={!chosen} onClick={()=>{if(chosen){setChoosing(false);setSelected(chosen.source)}}}>Continuar</Button></>}><Field label="Entrega programada"><Select aria-label="Entrega para completar datos" value={choice} onChange={e=>setChoice(e.target.value)}><option value="">Seleccionar entrega</option>{available.map(({r,c,d,source})=><option key={choiceKey(source)} value={choiceKey(source)}>{s.clients.find(client=>client.id===r.clientId)?.empresa} · {c.contrato} · {fmtDate(d.fecha)} · {fmtNum(d.kilos)} kg · {deliveryReady(s,source)?'Datos completos':'Por completar'}</option>)}</Select></Field><p className="mt-3 text-sm text-ink-soft">{available.length?'Las entregas con datos completos también pueden actualizarse mientras no tengan una carga registrada.':'No hay entregas disponibles para completar. Programa una nueva entrega desde Clientes → Contratos → Entregas. Las entregas con carga registrada se consultan desde Ver entrega.'}</p></Modal>}{view&&<Modal open wide title="Detalle de entrega" onClose={()=>setView(undefined)} footer={<Button variant="outline" onClick={()=>setView(undefined)}>Cerrar</Button>}><IndustryDeliverySummary operation={{sourceDelivery:view}}/></Modal>}</div>
}

function CommercialDeliveriesModal({ requirementId, contractId, onClose, asPage = false, backLabel = '← Volver a contratos', execution = false, deliveryId }: { requirementId: string; contractId?: string; onClose: () => void; asPage?: boolean; backLabel?: string; execution?: boolean; deliveryId?:string }) {
  const s = useStore()
  const r = s.requirements.find((item) => item.id === requirementId)!
  const client = s.clients.find((item) => item.id === r.clientId)!
  const campaign = s.campaigns.find((item) => item.id === r.campaignId)!
  const [selectedId, setSelectedId] = useState(contractId || r.contratos?.[0]?.id || '')
  const selected = r.contratos?.find((item) => item.id === selectedId)
  const entries = selected?.entregas || []
  const [draft, setDraft] = useState<null | { id?: string; fecha: string; kilos: string; varietyQuantities?: {variety:string;kilos:number}[]; destino: string; observaciones: string; providers: { providerId: string; fincaIds: string[] }[]; transportLinkId: string; providerId: string; fincaId: string; vehicleId: string; driverId: string; start: string; end: string; origin: string; operationId: string; conditions: string; freight?: number; freightObservation?: string }>(()=>{const d=entries.find(d=>d.id===deliveryId);return d ? {transportLinkId:'',providerId:'',fincaId:'',vehicleId:'',driverId:'',start:'',end:'',origin:'',operationId:'',conditions:'',...d,providers:d.providers||(d.providerId?[{providerId:d.providerId,fincaIds:d.fincaId?[d.fincaId]:[]}]:[]),kilos:String(d.kilos)} : null})
  const [error, setError] = useState('')
  const [view,setView]=useState<string|null>(null)
  const total = entries.reduce((sum, item) => sum + item.kilos, 0)
  const transportLinks = s.campaignTransporters.filter((item) => item.campaignId === campaign.id)
  const link = transportLinks.find((item) => item.id === draft?.transportLinkId)
  const transporter = s.transporters.find((item) => item.id === link?.transporterId)
  const producers = s.campaignProviders.filter((item) => item.campaignId === campaign.id).map((item) => s.providers.find((provider) => provider.id === item.providerId)).filter(Boolean) as Provider[]
  const setDeliveryProviders = (providers: { providerId: string; fincaIds: string[] }[]) => {
    if (!draft) return
    const origin = providers.flatMap((entry) => { const provider = producers.find((p) => p.id === entry.providerId); return (provider?.fincas || []).filter((f) => entry.fincaIds.includes(f.id)).map((f) => [f.nombre, f.distrito, f.provincia, f.departamento].filter(Boolean).join(' · ')) }).join(' / ')
    setDraft({ ...draft, providers, providerId: providers[0]?.providerId || '', fincaId: providers[0]?.fincaIds[0] || '', origin, operationId: '' })
  }
  const varieties=Array.from(new Set((r.variedades?.length?r.variedades:(r.variedad||'').split(',')).map(v=>v.trim()).filter(Boolean)))
  const sourceFor = (id:string) => ({requirementId:r.id,contractId:selectedId,deliveryId:id})
  const used = (id:string) => deliveryHasLoad(s.qualityOperations,s.campaignTransporters,sourceFor(id))
  const save = () => {
    if (!draft || !selected) return
    if (draft.id && used(draft.id)) { setError('Esta entrega ya tiene una carga registrada y no puede modificarse.'); return }
    if (execution && (campaign.estado !== 'En Proceso' || !draft.id)) { setError('Completa una entrega programada de una campaña en proceso.'); return }
    const kilos = Number(draft.kilos)
    if (!draft.fecha || !Number.isFinite(kilos) || kilos <= 0) { setError('Indica una fecha y kilos mayores a cero.'); return }
    if (execution && (!link || !transporter?.vehiculos.some((item) => item.id === draft.vehicleId) || !transporter?.choferes.some((item) => item.id === draft.driverId) || !draft.providers.length || draft.providers.some((entry) => !entry.fincaIds.length || !producers.some((p) => p.id === entry.providerId && entry.fincaIds.every((id) => p.fincas?.some((f) => f.id === id)))))) { setError('Selecciona transportista, camión, chofer y al menos una finca para cada proveedor.'); return }
    if (!draft.destino.trim()) { setError('Indica el destino programado.'); return }
    if (execution && (!draft.start || !draft.end || draft.end < draft.start || !draft.origin.trim())) { setError('Completa origen, destino y fechas; la fecha de fin no puede ser anterior al inicio.'); return }
    const distribution=(draft.varietyQuantities||[]).filter(v=>v.kilos>0)
    if(!execution&&distribution.length&&Math.abs(distribution.reduce((n,v)=>n+v.kilos,0)-kilos)>0.01){setError('La suma de kilos por variedad debe ser igual a los kilos programados de la entrega.');return}
    if(!execution&&(draft.varietyQuantities||[]).some(v=>!Number.isFinite(v.kilos)||v.kilos<0)){setError('Los kilos por variedad deben ser mayores o iguales a cero.');return}
    if(execution){
      const nextRequirements=s.requirements.map(req=>req.id===r.id?{...req,contratos:(req.contratos||[]).map(c=>c.id===selected.id?{...c,entregas:c.entregas.map(d=>d.id===draft.id?{...d,...draft,kilos}:d)}:c)}:req)
      const issue=freightIssue({...s,requirements:nextRequirements},s);if(issue){setError(issue);return}
    }
    const item = { ...draft, varietyQuantities:distribution.length?distribution:undefined, id: draft.id || Math.random().toString(36).slice(2), kilos }
    const entregas = draft.id ? entries.map((existing) => existing.id === draft.id ? item : existing) : [...entries, item]
    const issue=contractIssue(s,r.id,{...selected,entregas},selected);if(issue){setError(issue);return}
    s.saveCommercialContract(r.id, { ...selected, entregas })
    s.toast(execution ? 'Coordinación de entrega guardada' : draft.id ? 'Programación de entrega actualizada' : 'Entrega programada registrada')
    setDraft(null); setError('')
  }
  const content = <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold">{execution ? 'Completar entregas' : 'Entregas programadas'}</h2>{selected && !draft && !execution && campaign.estado !== 'Finalizado' && <Button onClick={() => { setDraft({ providers: [], fecha: '', kilos: '', destino: r.destino || '', observaciones: '', transportLinkId: '', providerId: '', fincaId: '', vehicleId: '', driverId: '', start: '', end: '', origin: '', operationId: '', conditions: '' }); setError('') }}>+ Registrar entrega</Button>}</div>
    <div className="mb-4 rounded-xl bg-canvas p-4"><b>{client.empresa} · {campaign.nombre}</b><p className="mt-1 text-sm text-ink-soft">Kilos acordados: {fmtNum((selected?.kilos || 0))} kg · Programados: {fmtNum(total)} kg</p></div>
    {!contractId ? <div className="mb-4"><Field label="Contrato"><Select aria-label="Contrato" value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setDraft(null); setError('') }}><option value="">Seleccionar contrato</option>{r.contratos?.map((item, index) => <option key={item.id} value={item.id}>Contrato {index + 1} · {item.contrato} · {fmtNum(item.kilos)} kg</option>)}</Select></Field></div> : <p className="mb-4 text-sm font-medium">Contrato: {selected?.contrato}</p>}
    {!selected || (selected?.kilos || 0) <= 0 ? <p className="rounded-lg border border-line p-4 text-sm">Registra el contrato y su cantidad antes de programar entregas.</p> : <>
      <Table head={['Fecha programada', 'Kilos', 'Destino', 'Preparación', 'Acciones']}>{entries.map(item=><tr key={item.id}><td className="px-4 py-3">{fmtDate(item.fecha)}</td><td className="px-4 py-3">{fmtNum(item.kilos)} kg</td><td className="px-4 py-3">{item.destino}</td><td className="px-4 py-3">{used(item.id)?'Con carga registrada':deliveryReady(s,sourceFor(item.id))?'Lista para carga':'Por completar en campaña en proceso'}</td><td className="px-4 py-3"><IconBtn title="Ver entrega" onClick={()=>setView(item.id)}><Eye/></IconBtn><Button variant="ghost" disabled={used(item.id)||campaign.estado==='Finalizado'} onClick={()=>{setDraft({transportLinkId:'',providerId:'',fincaId:'',vehicleId:'',driverId:'',start:'',end:'',origin:'',operationId:'',conditions:'',...item,providers:item.providers||(item.providerId?[{providerId:item.providerId,fincaIds:item.fincaId?[item.fincaId]:[]}]:[]),kilos:String(item.kilos)});setError('')}}>{execution?'Completar coordinación':'Editar programación'}</Button>{!execution&&<Button variant="ghost" disabled={used(item.id)||campaign.estado==='Finalizado'} className="text-danger" onClick={()=>{s.saveCommercialContract(r.id,{...selected!,entregas:entries.filter(e=>e.id!==item.id)});if(draft?.id===item.id)setDraft(null)}}>Quitar</Button>}</td></tr>)}{!entries.length&&<tr><td colSpan={5} className="p-6 text-center text-ink-soft">Sin entregas programadas.</td></tr>}</Table>
      {!execution && <p className="mt-3 text-sm text-ink-soft">El transporte y los proveedores se completan en Campaña en proceso → Entregas.</p>}
      <p className="mt-3 text-sm">Diferencia frente a kilos acordados: {fmtNum((selected?.kilos || 0) - total)} kg</p>

    </>}
    {view&&<Modal open wide title="Detalle de entrega" onClose={()=>setView(null)} footer={<Button variant="outline" onClick={()=>setView(null)}>Cerrar</Button>}><p className="mb-4 text-sm">Fecha programada: {fmtDate(entries.find(d=>d.id===view)?.fecha||'')}</p><IndustryDeliverySummary operation={{sourceDelivery:sourceFor(view)}}/></Modal>}
    {draft && <Modal open wide onClose={() => { setDraft(null); setError('') }} title={execution ? 'Completar coordinación de entrega' : draft.id ? 'Editar entrega programada' : 'Registrar entrega programada'} footer={<><Button variant="outline" onClick={() => { setDraft(null); setError('') }}>Cancelar</Button><Button onClick={save}>{execution?'Guardar coordinación':'Guardar entrega programada'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Seleccionar contrato"><Select aria-label="Contrato de entrega" value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setDraft({ ...draft, id: undefined }); setError('') }} disabled={!!draft.id || execution}>{r.contratos?.map((item, index) => <option key={item.id} value={item.id}>Contrato {index + 1} · {item.contrato}</option>)}</Select></Field></div>
        {!execution && <Field label="Fecha programada"><Input aria-label="Fecha programada" type="date" value={draft.fecha} onChange={e=>setDraft({...draft,fecha:e.target.value})}/></Field>}
        {execution && <div className="sm:col-span-2 rounded-xl bg-canvas p-3 text-sm">Programación: {fmtDate(draft.fecha)} · {fmtNum(Number(draft.kilos))} kg · {draft.destino}</div>}
        {execution && <>
        <Field label="Transportista vinculado"><Select aria-label="Transportista vinculado" value={draft.transportLinkId} onChange={(e) => setDraft({ ...draft, transportLinkId: e.target.value, vehicleId: '', driverId: '',freight:undefined,freightObservation:undefined })}><option value="">Seleccionar transportista</option>{transportLinks.map((item) => <option key={item.id} value={item.id}>{s.transporters.find((t) => t.id === item.transporterId)?.empresa}</option>)}</Select></Field>
        <fieldset className="sm:col-span-2 rounded-xl border border-line p-4"><legend className="px-1 text-xs font-semibold uppercase text-ink-soft">Proveedores y fincas de la entrega</legend><p className="mb-3 text-xs text-ink-soft">Selecciona varios proveedores y una o más fincas de cada uno.</p><div className="grid gap-3">{producers.map((provider) => { const entry = draft.providers.find((p) => p.providerId === provider.id); return <div key={provider.id} className="rounded-lg border border-line p-3"><label className="flex cursor-pointer items-center gap-2 text-sm font-medium"><input type="checkbox" aria-label={`Proveedor ${provider.nombres} ${provider.apellidos}`} checked={!!entry} className="accent-forest" onChange={(e) => setDeliveryProviders(e.target.checked ? [...draft.providers, { providerId: provider.id, fincaIds: [] }] : draft.providers.filter((p) => p.providerId !== provider.id))} />{provider.nombres} {provider.apellidos} · {provider.tipo}</label><p className="mt-1 pl-5 text-xs text-ink-soft">Fruta {s.campaignProviders.find(p=>p.campaignId===campaign.id&&p.providerId===provider.id)?.rol==='Productor'?'orgánica':s.campaignProviders.find(p=>p.campaignId===campaign.id&&p.providerId===provider.id)?.rol==='Acopiador'?'convencional':provider.tipo==='Productor'?'orgánica':'convencional'}</p>{entry && <div className="mt-3 flex flex-wrap gap-3 pl-5">{provider.fincas?.map((farm) => <label key={farm.id} className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" aria-label={`Finca ${farm.nombre} de ${provider.nombres} ${provider.apellidos}`} className="accent-forest" checked={entry.fincaIds.includes(farm.id)} onChange={(e) => setDeliveryProviders(draft.providers.map((p) => p.providerId !== provider.id ? p : { ...p, fincaIds: e.target.checked ? [...p.fincaIds, farm.id] : p.fincaIds.filter((id) => id !== farm.id) }))} />{farm.nombre}</label>)}{!provider.fincas?.length && <p className="text-xs text-ink-soft">Este proveedor no tiene fincas registradas.</p>}</div>}</div> })}</div>{!producers.length && <p className="text-sm text-ink-soft">Vincula primero proveedores a esta campaña.</p>}</fieldset>
        <Field label="Camión"><Select aria-label="Camión de entrega" disabled={!transporter} value={draft.vehicleId} onChange={(e) => setDraft({ ...draft, vehicleId: e.target.value })}><option value="">Seleccionar camión</option>{transporter?.vehiculos.map((item) => <option key={item.id} value={item.id}>{item.placa}</option>)}</Select></Field>

        <Field label="Chofer"><Select aria-label="Chofer de entrega" disabled={!transporter} value={draft.driverId} onChange={(e) => setDraft({ ...draft, driverId: e.target.value })}><option value="">Seleccionar chofer</option>{transporter?.choferes.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</Select></Field>
        <Field label="Fecha de inicio"><Input aria-label="Inicio de entrega" type="date" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></Field><Field label="Fecha de fin"><Input aria-label="Fin de entrega" type="date" min={draft.start || undefined} value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} /></Field>
        <Field label="Origen"><Input aria-label="Origen de entrega" value={draft.origin} onChange={(e) => setDraft({ ...draft, origin: e.target.value })} /></Field>
        <Field label="Condiciones de la carga"><TextArea aria-label="Condiciones de la carga" rows={2} value={draft.conditions} onChange={(e) => setDraft({ ...draft, conditions: e.target.value })} /></Field>
        </>}
        {!execution && <Field label="Destino"><Input aria-label="Destino de entrega" value={draft.destino} onChange={e=>setDraft({...draft,destino:e.target.value})}/></Field>}
        {!execution && <Field label="Kilos programados"><Input aria-label="Kilos programados" type="number" min="0" step="any" value={draft.kilos} onChange={(e) => setDraft({ ...draft, kilos: e.target.value })} /></Field>}<Field label="Observaciones"><TextArea rows={2} value={draft.observaciones} onChange={(e) => setDraft({ ...draft, observaciones: e.target.value })} /></Field>
        {!execution&&varieties.length>1&&<fieldset className="rounded-xl border border-line p-4 sm:col-span-2"><legend className="px-1 text-xs font-semibold uppercase text-ink-soft">Kilos por variedad</legend><p className="mb-3 text-xs text-ink-soft">Distribuye los kilos programados para ver cada variedad en el programa semanal. Si dejas todos en cero, quedarán por distribuir.</p><div className="grid gap-3 sm:grid-cols-2">{varieties.map(variety=><Field key={variety} label={variety}><Input aria-label={`Kilos programados de ${variety}`} type="number" min="0" step="any" placeholder="0" value={draft.varietyQuantities?.find(v=>v.variety===variety)?.kilos??''} onChange={e=>setDraft({...draft,varietyQuantities:[...(draft.varietyQuantities||[]).filter(v=>v.variety!==variety),{variety,kilos:Number(e.target.value)}]})}/></Field>)}</div><p className="mt-3 text-sm">Distribuidos: {fmtNum((draft.varietyQuantities||[]).reduce((n,v)=>n+v.kilos,0))} / {fmtNum(Number(draft.kilos)||0)} kg</p></fieldset>}
      </div>{execution && !transportLinks.length && <p className="mt-3 text-sm text-ink-soft">Esta campaña todavía no tiene transportistas vinculados. Agrégalos desde En proceso → Transportistas.</p>}{error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </Modal>}

  </>
  if (asPage) return <div><Button variant="ghost" className="mb-4 px-0" onClick={onClose}>{backLabel}</Button>{content}</div>
  return <Modal open wide onClose={onClose} title="Entregas programadas" footer={<Button variant="outline" onClick={onClose}>Cerrar</Button>}>{content}</Modal>
}

// ============================================================ TRANSPORT
type TransportQuote = { id: string; companyId: string; amount: number; currency: string; availability: string; conditions: string; document: string }
type TransportAssignment = { vehicleId: string; driverId: string; start: string; end: string }
type TransportRequest = {
  id: string; reference: string; campaignId: string; date: string; companyIds: string[]; status: string
  origin: string; destination: string; serviceWindow: string; estimatedLoad: string; vehicleFeatures: string
  conditions: string; responseDeadline: string; document: string; message: string; quotes: TransportQuote[]
  selectedQuoteId?: string
  service?: { id: string; cxpId: string; contract: string; kgPurchased: string; kgPlant: string; status: 'planificado' | 'en recojo' | 'despachado' | 'llegada'; guide: string; freight: string; sctr: string; stevedoring: string; tickets: string; food: string; assignment?: TransportAssignment }
}

export function TransportModule() {
  const s = useStore()
  const [section, setSection] = useState<'Transportistas' | 'Vehículos' | 'Choferes' | 'Requerimientos y cotizaciones'>('Transportistas')
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [provinceFilter, setProvinceFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [companyFilter, setCompanyFilter] = useState('')
  const [companyModal, setCompanyModal] = useState<Transporter | null | undefined>(undefined)
  const [vehicleModal, setVehicleModal] = useState<{ companyId?: string; vehicle?: Vehicle } | null>(null)
  const [driverModal, setDriverModal] = useState<{ companyId?: string; driver?: Chofer } | null>(null)
  const [companyView, setCompanyView] = useState<string | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)
  const [requestDetail, setRequestDetail] = useState<string | null>(null)
  const [requests, setRequests] = useDemoState<TransportRequest[]>('transportRequests', [])

  const companies = s.transporters.filter((company) => `${company.empresa} ${company.ruc} ${company.documentoIdentidad || ''} ${company.numero} ${company.correo}`.toLowerCase().includes(q.toLowerCase()) && (!typeFilter || (company.tipo || 'Público') === typeFilter) && (!departmentFilter || company.departamento === departmentFilter) && (!provinceFilter || company.provincia === provinceFilter) && (!cityFilter || company.ciudad === cityFilter))
  const allVisibleSelected = companies.length > 0 && companies.every(company => selected.includes(company.id))
  const someVisibleSelected = companies.some(company => selected.includes(company.id))
  const request = requests.find((item) => item.id === requestDetail)
  const updateRequest = (id: string, patch: Partial<TransportRequest>) => setRequests((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))

  if (companyView) {
    const company = s.transporters.find((item) => item.id === companyView)
    if (company) return <TransportCompanyView company={company} onBack={() => setCompanyView(null)} onEdit={() => setCompanyModal(company)} onVehicles={() => { setCompanyFilter(company.id); setCompanyView(null); setSection('Vehículos') }} onDrivers={() => { setCompanyFilter(company.id); setCompanyView(null); setSection('Choferes') }} onAddVehicle={() => setVehicleModal({ companyId: company.id })} onAddDriver={() => setDriverModal({ companyId: company.id })} companyModal={companyModal} closeCompanyModal={() => setCompanyModal(undefined)} vehicleModal={vehicleModal} closeVehicleModal={() => setVehicleModal(null)} driverModal={driverModal} closeDriverModal={() => setDriverModal(null)} />
  }
  if (request) return <TransportRequestDetail request={request} onBack={() => setRequestDetail(null)} onUpdate={(patch) => updateRequest(request.id, patch)} />

  return <div>
    {section !== 'Transportistas' && <Button variant="ghost" className="mb-4 px-0" onClick={() => setSection('Transportistas')}>← Volver a transportistas</Button>}
    <PageHeader title={section === 'Transportistas' ? 'Gestión de transporte' : section} subtitle="Empresas e independientes, vehículos, choferes y cotizaciones" action={section === 'Transportistas' ? <div className="flex flex-wrap gap-2"><Button variant="outline" className="border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100" onClick={() => setSection('Requerimientos y cotizaciones')}>Requerimientos y cotizaciones</Button><Button onClick={() => setCompanyModal(null)}>+ Nuevo transportista</Button></div> : section === 'Vehículos' ? <Button onClick={() => setVehicleModal({ companyId: companyFilter || undefined })}>+ Nuevo vehículo</Button> : section === 'Choferes' ? <Button onClick={() => setDriverModal({ companyId: companyFilter || undefined })}>+ Nuevo chofer</Button> : undefined} />
    <DataLegend />

    {section === 'Transportistas' && <div>
      {selected.length > 0 && <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-leaf/30 bg-leaf-50 p-3"><b className="text-forest">{selected.length} transportistas seleccionados</b><Button onClick={() => setRequestOpen(true)}>Solicitar cotización</Button><Button variant="ghost" onClick={() => setSelected([])}>Limpiar selección</Button><FlowValidationNote /></div>}
      <FilterBar onClear={() => { setQ(''); setTypeFilter(''); setDepartmentFilter(''); setProvinceFilter(''); setCityFilter(''); setSelected([]) }}><Field label="Búsqueda"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar transportista, documento, teléfono o correo" /></Field><Field label="Tipo"><Select aria-label="Filtrar tipo de transportista" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="">Todos</option><option value="Público">Público · Empresa</option><option value="Privado">Privado · Independiente</option></Select></Field><Field label="Departamento"><Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}><option value="">Todos</option>{Array.from(new Set(s.transporters.map((item) => item.departamento).filter(Boolean))).map((value) => <option key={value}>{value}</option>)}</Select></Field><Field label="Provincia"><Select value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)}><option value="">Todas</option>{Array.from(new Set(s.transporters.map((item) => item.provincia).filter(Boolean))).map((value) => <option key={value}>{value}</option>)}</Select></Field><Field label="Ciudad"><Select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}><option value="">Todas</option>{Array.from(new Set(s.transporters.map((item) => item.ciudad).filter(Boolean))).map((value) => <option key={value}>{value}</option>)}</Select></Field><ApprovedBdNote /></FilterBar>
      <Table head={[<label className="flex items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-2 py-1 text-violet-700"><input type="checkbox" aria-label="Seleccionar todo" disabled={!companies.length} checked={allVisibleSelected} ref={node => { if(node) node.indeterminate = someVisibleSelected && !allVisibleSelected }} onChange={() => setSelected(current => allVisibleSelected ? current.filter(id => !companies.some(company => company.id === id)) : Array.from(new Set([...current, ...companies.map(company => company.id)])))} className="accent-violet-600"/><span className="text-[10px]">Seleccionar todo</span></label>, 'Transportista', 'Tipo', 'Documento', 'Teléfono', 'Correo', 'Acciones']}>{companies.map((company) => <tr key={company.id}><td className="px-4 py-3"><input aria-label={`Seleccionar ${company.empresa}`} type="checkbox" checked={selected.includes(company.id)} onChange={() => setSelected((current) => current.includes(company.id) ? current.filter((id) => id !== company.id) : [...current, company.id])} className="accent-leaf" /></td><td className="px-4 py-3 font-medium">{company.empresa}</td><td className="px-4 py-3">{company.tipo === 'Privado' ? 'Privado · Independiente' : 'Público · Empresa'}</td><td className="px-4 py-3 font-mono text-xs">{company.tipo === 'Privado' ? company.documentoIdentidad : company.ruc}</td><td className="px-4 py-3">{company.numero}</td><td className="px-4 py-3">{company.correo || 'Sin correo'}</td><td className="px-4 py-3"><div className="flex gap-1"><IconBtn title={`Ver empresa ${company.empresa}`} onClick={() => setCompanyView(company.id)}><Eye /></IconBtn><IconBtn title={`Editar empresa ${company.empresa}`} onClick={() => setCompanyModal(company)}><Pen /></IconBtn><ActionsMenu title={`Opciones de ${company.empresa}`} items={[{ label: 'Vehículos', onClick: () => { setCompanyFilter(company.id); setSection('Vehículos') } }, { label: 'Choferes', onClick: () => { setCompanyFilter(company.id); setSection('Choferes') } }]} /></div></td></tr>)}{companies.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-soft">Sin transportistas registrados.</td></tr>}</Table>
    </div>}
    {section === 'Vehículos' && <TransportVehiclesTab companyFilter={companyFilter} setCompanyFilter={setCompanyFilter} onNew={() => setVehicleModal({ companyId: companyFilter || undefined })} onEdit={(companyId, vehicle) => setVehicleModal({ companyId, vehicle })} />}
    {section === 'Choferes' && <TransportDriversTab companyFilter={companyFilter} setCompanyFilter={setCompanyFilter} onNew={() => setDriverModal({ companyId: companyFilter || undefined })} onEdit={(companyId, driver) => setDriverModal({ companyId, driver })} />}
    {section === 'Requerimientos y cotizaciones' && <div><div className="mb-4 flex justify-end"><Button className="border-line bg-surface" onClick={() => { setSection('Transportistas'); s.toast('Selecciona empresas para iniciar una solicitud') }}>+ Nueva solicitud</Button></div><ProposalField><Table head={[<ProposalHeader>Referencia</ProposalHeader>, <ProposalHeader>Campaña</ProposalHeader>, <ProposalHeader>Fecha</ProposalHeader>, <ProposalHeader>Transportistas invitados</ProposalHeader>, <ProposalHeader>Respuestas</ProposalHeader>, <ProposalHeader>Estado</ProposalHeader>, 'Acciones']}>{requests.map((item) => <tr key={item.id} className="text-ink"><td className="px-4 py-3 font-medium">{item.reference}</td><td className="px-4 py-3">{s.campaigns.find((campaign) => campaign.id === item.campaignId)?.nombre}</td><td className="px-4 py-3">{fmtDate(item.date)}</td><td className="px-4 py-3">{item.companyIds.length}</td><td className="px-4 py-3">{item.quotes.length}</td><td className="px-4 py-3">{item.status}</td><td className="px-4 py-3"><Button variant="ghost" onClick={() => setRequestDetail(item.id)}>Ver</Button></td></tr>)}{!requests.length && <tr><td colSpan={7} className="p-8 text-center text-sm text-ink-soft">Todavía no hay solicitudes guardadas. Selecciona transportistas para crear la primera.</td></tr>}</Table></ProposalField></div>}
    {companyModal !== undefined && <TransportCompanyModal company={companyModal ?? undefined} onClose={() => setCompanyModal(undefined)} />}
    {vehicleModal && <TransportVehicleModal companyId={vehicleModal.companyId} vehicle={vehicleModal.vehicle} onClose={() => setVehicleModal(null)} />}
    {driverModal && <TransportDriverModal companyId={driverModal.companyId} driver={driverModal.driver} onClose={() => setDriverModal(null)} />}
    {requestOpen && <TransportRequestModal companyIds={selected} onClose={() => setRequestOpen(false)} onSend={(newRequest) => { setRequests((current) => [newRequest, ...current]); setRequestOpen(false); setSelected([]); setSection('Requerimientos y cotizaciones'); s.toast('Envío simulado; no se enviaron correos reales') }} />}
  </div>
}

function TransportCompanyModal({ company, onClose }: { company?: Transporter; onClose: () => void }) {
  const s = useStore()
  const [form, setForm] = useState({ mtc: company?.mtc ?? '', cgn: company?.cgn ?? '', tipo: company?.tipo ?? 'Público' as 'Público' | 'Privado', empresa: company?.empresa ?? '', documentoIdentidad: company?.documentoIdentidad ?? '', ruc: company?.ruc ?? '', numero: company?.numero ?? '', correo: company?.correo ?? '', departamento: company?.departamento ?? '', provincia: company?.provincia ?? '', ciudad: company?.ciudad ?? '' })
  const [error, setError] = useState('')
  return <Modal open onClose={onClose} title={company ? 'Editar transportista' : 'Registrar transportista'} footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => { if (!form.empresa.trim() || !form.numero.trim() || (form.tipo === 'Público' ? !form.ruc.trim() : !form.documentoIdentidad.trim())) { setError('Completa el nombre, documento y teléfono.'); return } const payload = { ...form, id:company?.id, cgn: form.tipo === 'Privado' ? form.cgn : undefined }; const issue=masterIssue('transporters',payload,s.transporters,company);if(issue){setError(issue);return} if (company) s.updateTransporter(company.id, payload); else s.addTransporter(payload); s.toast('Transportista guardado'); onClose() }}>Guardar transportista</Button></>}>
    <Field label="Tipo de transportista"><Select aria-label="Tipo de transportista" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as 'Público' | 'Privado' })}><option value="Público">Público · Transportista</option><option value="Privado">Privado · Independiente</option></Select></Field>
    <p className="my-3 text-sm text-ink-soft">{form.tipo === 'Privado' ? 'Persona independiente. Sus vehículos y choferes se registran a su nombre, sin vincularlos a una empresa.' : 'Transportista con sus propios vehículos y choferes.'}</p>
    <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-violet-300 bg-violet-50 p-3 [&_span]:text-violet-700"><Field label="MTC"><Input style={{color:'#7c3aed',borderColor:'#c4b5fd'}} aria-label="MTC" value={form.mtc} onChange={e => setForm({ ...form, mtc: e.target.value })}/></Field></div>{form.tipo === 'Privado' && <div className="rounded-xl border border-violet-300 bg-violet-50 p-3 [&_span]:text-violet-700"><Field label="CGN"><Input style={{color:'#7c3aed',borderColor:'#c4b5fd'}} aria-label="CGN" value={form.cgn} onChange={e => setForm({ ...form, cgn: e.target.value })}/></Field></div>}<Field label={form.tipo === 'Público' ? 'Transportista' : 'Nombre completo'}><Input value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} /></Field>{form.tipo === 'Privado' && <Field label="Documento de identidad"><Input value={form.documentoIdentidad} onChange={(e) => setForm({ ...form, documentoIdentidad: e.target.value })} /></Field>}<Field label={form.tipo === 'Privado' ? 'RUC (opcional)' : 'RUC'}><Input value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} /></Field>{(['numero', 'correo', 'departamento', 'provincia', 'ciudad'] as const).map((key, i) => <Field key={key} label={['Teléfono', 'Correo', 'Departamento', 'Provincia', 'Ciudad'][i]}><Input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></Field>)}</div>{error && <p role="alert" className="mt-3 text-danger text-sm">{error}</p>}
  </Modal>
}

function TransportCompanyView({ company, onBack, onEdit, onVehicles, onDrivers, onAddVehicle, onAddDriver, companyModal, closeCompanyModal, vehicleModal, closeVehicleModal, driverModal, closeDriverModal }: { company: Transporter; onBack: () => void; onEdit: () => void; onVehicles: () => void; onDrivers: () => void; onAddVehicle: () => void; onAddDriver: () => void; companyModal: Transporter | null | undefined; closeCompanyModal: () => void; vehicleModal: { companyId?: string; vehicle?: Vehicle } | null; closeVehicleModal: () => void; driverModal: { companyId?: string; driver?: Chofer } | null; closeDriverModal: () => void }) {
  return <div><Button variant="ghost" className="mb-4 px-0" onClick={onBack}>← Volver a transportistas</Button><DataLegend /><div className="rounded-2xl border border-line bg-surface p-5"><div className="flex flex-wrap justify-between gap-3"><div><div className="font-display text-2xl font-bold">{company.empresa}</div><p className="mt-1 text-sm text-ink-soft">{company.tipo === 'Privado' ? 'Privado · Independiente · ' + (company.documentoIdentidad || '') : 'Público · Empresa · RUC ' + company.ruc} · {company.numero} · {company.correo}</p><p className="mt-1 text-sm text-ink-soft">Ubicación: {company.departamento || '—'} · {company.provincia || '—'} · {company.ciudad || '—'} <ApprovedBdNote /></p></div></div><div className="mt-4"><ChangeMark priority="media" code="H15">Vehículos y choferes de este transportista</ChangeMark><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" onClick={onVehicles}>Ver vehículos ({company.vehiculos.length})</Button><Button variant="outline" onClick={onDrivers}>Ver choferes ({company.choferes.length})</Button><Button variant="ghost" onClick={onAddVehicle}>+ Nuevo vehículo</Button><Button variant="ghost" onClick={onAddDriver}>+ Nuevo chofer</Button><Button variant="ghost" onClick={onEdit}>Editar transportista</Button></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-violet-300 bg-violet-50 p-3 text-violet-700"><div className="text-xs">MTC</div><p className="text-sm">{company.mtc || 'Sin registrar'}</p></div>{company.tipo === 'Privado' && <div className="rounded-xl border border-violet-300 bg-violet-50 p-3 text-violet-700"><div className="text-xs">CGN</div><p className="text-sm">{company.cgn || 'Sin registrar'}</p></div>}</div></div>{companyModal !== undefined && <TransportCompanyModal company={companyModal ?? undefined} onClose={closeCompanyModal} />}{vehicleModal && <TransportVehicleModal companyId={company.id} vehicle={vehicleModal.vehicle} onClose={closeVehicleModal} />}{driverModal && <TransportDriverModal companyId={company.id} driver={driverModal.driver} onClose={closeDriverModal} />}</div>
}

function TransportVehiclesTab({ companyFilter, setCompanyFilter, onNew, onEdit }: { companyFilter: string; setCompanyFilter: (id: string) => void; onNew: () => void; onEdit: (companyId: string, vehicle: Vehicle) => void }) {
  const s = useStore()
  const [view, setView] = useState<{ company: Transporter; vehicle: Vehicle } | null>(null)
  const rows = s.transporters.flatMap((company) => company.vehiculos.map((vehicle) => ({ company, vehicle }))).filter(({ company }) => !companyFilter || company.id === companyFilter)
  return <div><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><Field label="Transportista"><Select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}><option value="">Todas</option>{s.transporters.map((company) => <option key={company.id} value={company.id}>{company.empresa}</option>)}</Select></Field><Button onClick={onNew}>+ Nuevo vehículo</Button></div><Table head={['Empresa', 'Identificador', <ProposalHeader>Placa</ProposalHeader>, 'Volumen', 'Peso neto', 'Peso bruto', 'Acciones']}>{rows.map(({ company, vehicle }) => <tr key={vehicle.id}><td className="px-4 py-3 font-medium">{company.empresa}</td><td className="px-4 py-3 font-mono text-xs">{vehicle.id}</td><td className="px-4 py-3 text-ink   ">{vehicle.placa} <ValidationTag /></td><td className="px-4 py-3">{vehicle.volumen ?? vehicle.capacidad}</td><td className="px-4 py-3">{vehicle.pesoNeto}</td><td className="px-4 py-3">{vehicle.pesoBruto ?? vehicle.pbv}</td><td className="px-4 py-3"><div className="flex gap-1"><IconBtn title={`Ver vehículo ${vehicle.id}`} onClick={() => setView({ company, vehicle })}><Eye /></IconBtn><IconBtn title={`Editar vehículo ${vehicle.id}`} onClick={() => onEdit(company.id, vehicle)}><Pen /></IconBtn></div></td></tr>)}{rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-soft">Sin vehículos registrados.</td></tr>}</Table>{view && <Modal open onClose={() => setView(null)} title={`Vehículo ${view.vehicle.id}`} footer={<Button onClick={() => { onEdit(view.company.id, view.vehicle); setView(null) }}>Editar vehículo</Button>}><div className="grid gap-3 sm:grid-cols-2">{[['Empresa', view.company.empresa], ['Identificador', view.vehicle.id], ['Volumen', view.vehicle.volumen ?? view.vehicle.capacidad], ['Ancho', view.vehicle.ancho ?? '—'], ['Altura', view.vehicle.altura ?? '—'], ['Profundidad', view.vehicle.profundidad ?? '—'], ['Peso neto', view.vehicle.pesoNeto], ['Peso bruto', view.vehicle.pesoBruto ?? view.vehicle.pbv]].map(([label, value]) => <div key={label} className="rounded-lg border border-line p-3"><div className="text-xs text-ink-soft">{label}</div><div className="mt-1 font-medium">{value}</div></div>)}<div className="sm:col-span-2"><TransportProposalField><div className="text-xs font-semibold uppercase ">Placa</div><div className="mt-1">{view.vehicle.placa}</div></TransportProposalField></div></div></Modal>}</div>
}

function TransportVehicleModal({ companyId, vehicle, onClose }: { companyId?: string; vehicle?: Vehicle; onClose: () => void }) {
  const s = useStore()
  const [validationError,setValidationError]=useState('')
  const [selectedCompany, setSelectedCompany] = useState(companyId ?? s.transporters[0]?.id ?? '')
  const [form, setForm] = useState({ placa: vehicle?.placa ?? '', volumen: vehicle?.volumen ?? '', ancho: vehicle?.ancho ?? '', altura: vehicle?.altura ?? '', profundidad: vehicle?.profundidad ?? '', pesoNeto: vehicle?.pesoNeto?.replace(' t', '') ?? '', pesoBruto: vehicle?.pesoBruto ?? vehicle?.pbv?.replace(' t', '') ?? '' })
  return <Modal open onClose={onClose} wide title={vehicle ? 'Editar vehículo' : 'Registrar vehículo'} footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => { const payload = { ...form, capacidad: form.volumen, pbv: form.pesoBruto }; if(!selectedCompany){setValidationError('Selecciona un transportista.');return} const issue=masterIssue('vehicles',{...form,id:vehicle?.id},s.transporters.flatMap(x=>x.vehiculos),vehicle);if(issue){setValidationError(issue);return} if (vehicle) s.updateVehicle(selectedCompany, vehicle.id, payload); else s.addVehicle(selectedCompany, payload); s.toast('Vehículo guardado'); onClose() }}>Guardar vehículo</Button></>}><DataLegend /><div className="grid gap-4 sm:grid-cols-2">{companyId ? <Field label="Transportista"><Input readOnly value={s.transporters.find((company) => company.id === companyId)?.empresa ?? ''} /></Field> : <Field label="Transportista"><Select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}>{s.transporters.map((company) => <option key={company.id} value={company.id}>{company.empresa}</option>)}</Select></Field>}<TransportProposalField><Field label="Placa"><Input value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value })} /></Field></TransportProposalField>{(['volumen', 'ancho', 'altura', 'profundidad', 'pesoNeto', 'pesoBruto'] as const).map((key) => <div key={key}><Field label={({ volumen: 'Volumen', ancho: 'Ancho', altura: 'Altura', profundidad: 'Profundidad', pesoNeto: 'Peso neto', pesoBruto: 'Peso bruto' } as const)[key]}><Input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></Field></div>)}</div><p className="mt-4 text-sm text-ink-soft">Peso neto y peso bruto se registran sin interpretar automáticamente capacidad máxima. El volumen no se calcula desde las dimensiones.</p>{validationError&&<p role="alert" className="mt-4 text-sm text-danger">{validationError}</p>}</Modal>
}

function TransportDriversTab({ companyFilter, setCompanyFilter, onNew, onEdit }: { companyFilter: string; setCompanyFilter: (id: string) => void; onNew: () => void; onEdit: (companyId: string, driver: Chofer) => void }) {
  const s = useStore()
  const [view, setView] = useState<{ company: Transporter; driver: Chofer } | null>(null)
  const rows = s.transporters.flatMap((company) => company.choferes.map((driver) => ({ company, driver }))).filter(({ company }) => !companyFilter || company.id === companyFilter)
  return <div><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><Field label="Transportista"><Select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}><option value="">Todas</option>{s.transporters.map((company) => <option key={company.id} value={company.id}>{company.empresa}</option>)}</Select></Field><Button onClick={onNew}>+ Nuevo chofer</Button></div><Table head={['Nombre', 'Transportista', 'Teléfono', 'Correo', 'Acciones']}>{rows.map(({ company, driver }) => <tr key={driver.id}><td className="px-4 py-3 font-medium">{driver.nombre}</td><td className="px-4 py-3">{company.empresa}</td><td className="px-4 py-3">{driver.telefono}</td><td className="px-4 py-3">{driver.correo}</td><td className="px-4 py-3"><div className="flex gap-1"><IconBtn title={`Ver chofer ${driver.nombre}`} onClick={() => setView({ company, driver })}><Eye /></IconBtn><IconBtn title={`Editar chofer ${driver.nombre}`} onClick={() => onEdit(company.id, driver)}><Pen /></IconBtn></div></td></tr>)}{rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-soft">Sin choferes registrados.</td></tr>}</Table>{view && <Modal open onClose={() => setView(null)} title={view.driver.nombre} footer={<Button onClick={() => { onEdit(view.company.id, view.driver); setView(null) }}>Editar chofer</Button>}><div className="grid gap-3">{[['Empresa', view.company.empresa], ['Nombre completo', view.driver.nombre], ['Tipo de documento', view.driver.tipoDocumento || 'Sin registrar'], ['Número de documento', view.driver.numeroDocumento || 'Sin registrar'], ['Número de licencia', view.driver.licencia || 'Sin registrar'], ['Teléfono', view.driver.telefono], ['Correo', view.driver.correo]].map(([label, value]) => <div key={label} className="rounded-lg border border-line p-3"><div className="text-xs text-ink-soft">{label}</div><div className="mt-1 font-medium">{value}</div></div>)}</div></Modal>}</div>
}

function TransportDriverModal({ companyId, driver, onClose }: { companyId?: string; driver?: Chofer; onClose: () => void }) {
  const s = useStore()
  const [validationError,setValidationError]=useState('')
  const [selectedCompany, setSelectedCompany] = useState(companyId ?? s.transporters[0]?.id ?? '')
  const [form, setForm] = useState({ nombre: driver?.nombre ?? '', telefono: driver?.telefono ?? '', correo: driver?.correo ?? '', tipoDocumento: driver?.tipoDocumento ?? '', numeroDocumento: driver?.numeroDocumento ?? '', licencia: driver?.licencia ?? '' })
  return <Modal open onClose={onClose} title={driver ? 'Editar chofer' : 'Registrar chofer'} footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => { if(!selectedCompany){setValidationError('Selecciona un transportista.');return} const issue=masterIssue('drivers',{...form,id:driver?.id},s.transporters.flatMap(x=>x.choferes),driver);if(issue){setValidationError(issue);return} if (driver) s.updateChofer(selectedCompany, driver.id, form); else s.addChofer(selectedCompany, form); s.toast('Chofer guardado'); onClose() }}>Guardar chofer</Button></>}><div className="mb-4 rounded-lg bg-canvas/60 p-3 text-sm text-ink-soft">Registra al chofer del transportista público o independiente. El camión y chofer se asignan al registrar una carga.</div><div className="grid gap-4 sm:grid-cols-2">{companyId ? <Field label="Transportista"><Input readOnly value={s.transporters.find((company) => company.id === companyId)?.empresa ?? ''} /></Field> : <Field label="Transportista"><Select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}>{s.transporters.map((company) => <option key={company.id} value={company.id}>{company.empresa}</option>)}</Select></Field>}<Field label="Tipo de documento"><Select value={form.tipoDocumento} onChange={e=>setForm({...form,tipoDocumento:e.target.value})}><option value="">Seleccionar…</option>{['DNI','Carné de extranjería','Pasaporte'].map(t=><option key={t}>{t}</option>)}</Select></Field><Field label="Número de documento"><Input value={form.numeroDocumento} onChange={e=>setForm({...form,numeroDocumento:e.target.value})}/></Field><Field label="Número de licencia de conducir"><Input value={form.licencia} onChange={e=>setForm({...form,licencia:e.target.value})}/></Field><Field label="Nombre completo"><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field><Field label="Teléfono"><Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></Field><Field label="Correo"><Input value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} /></Field></div>{validationError&&<p role="alert" className="mt-4 text-sm text-danger">{validationError}</p>}</Modal>
}

function TransportRequestModal({ companyIds, onClose, onSend }: { companyIds: string[]; onClose: () => void; onSend: (request: TransportRequest) => void }) {
  const s = useStore()
  const [step, setStep] = useState<'form' | 'review'>('form')
  const [campaignName, setCampaignName] = useState('')
  const [form, setForm] = useState({ reference: '', origin: '', destination: '', serviceWindow: '', estimatedLoad: '', vehicleFeatures: '', conditions: '', responseDeadline: '', document: '', message: '' })
  const [validationError, setValidationError] = useState('')
  const reviewRequest = () => {
    if (!form.reference.trim() || !s.campaigns.some((item) => item.nombre === campaignName) || !companyIds.length) { setValidationError('Selecciona una campaña, escribe una referencia y elige al menos una empresa destinataria.'); return }
    setValidationError(''); setStep('review')
  }
  const campaign = s.campaigns.find((item) => item.nombre === campaignName)
  const recipients = s.transporters.filter((company) => companyIds.includes(company.id))
  const proposalFields = <div className="grid gap-4 sm:grid-cols-2"><Field label="Campaña"><SearchableSelect options={s.campaigns.map((item) => item.nombre)} value={campaignName} onChange={setCampaignName} /></Field>{Object.entries({ reference: 'Nombre o referencia', origin: 'Origen', destination: 'Destino', serviceWindow: 'Fecha o ventana del servicio', estimatedLoad: 'Kilos o volumen estimado', vehicleFeatures: 'Características del vehículo', conditions: 'Condiciones del servicio', responseDeadline: 'Fecha límite de respuesta', message: 'Mensaje para las empresas' }).map(([key, label]) => <Field key={key} label={label}><Input value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></Field>)}<div className="sm:col-span-2"><FileDrop label="Documento adjunto" onFile={(name) => setForm({ ...form, document: name ?? '' })} /></div></div>
  return <Modal open onClose={onClose} wide title={step === 'form' ? 'Solicitar cotización' : 'Revisar solicitud'} footer={step === 'form' ? <><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={reviewRequest}>Revisar solicitud</Button></> : <><Button variant="outline" onClick={() => setStep('form')}>Volver</Button><Button onClick={() => onSend({ id: Math.random().toString(36).slice(2), campaignId: campaign?.id ?? '', date: new Date().toISOString().slice(0, 10), companyIds, status: 'Solicitud registrada', ...form, reference: form.reference || 'Solicitud sin referencia', quotes: [] })}>Registrar solicitud</Button></>}>{validationError && <p role="alert" className="mb-3 text-sm text-danger">{validationError}</p>}<div className="mb-4"><ApprovedBdNote /><ChangeMark priority="media" code="H14">Registro de solicitud; correo simulado</ChangeMark><p className="mt-2 text-sm text-ink-soft">Las solicitudes y cotizaciones se guardan en el sistema. El envío de correos continúa simulado.</p></div><div className="mb-2 font-display font-semibold">Empresas destinatarias</div><div className="mb-4 grid gap-2 sm:grid-cols-2">{recipients.map((company) => <div key={company.id} className="rounded-lg border border-line bg-surface p-3 text-sm"><b>{company.empresa}</b><div className={company.correo ? 'text-ink-soft' : 'text-danger'}>{company.correo || 'Aviso: empresa sin correo'}</div></div>)}</div><div className="rounded-xl border border-line bg-surface p-3">{step === 'form' ? proposalFields : <div className="grid gap-3 text-sm">{[['Campaña', campaignName || 'Sin seleccionar'], ['Referencia', form.reference || 'Sin referencia'], ['Ruta', `${form.origin || '—'} → ${form.destination || '—'}`], ['Ventana', form.serviceWindow || '—'], ['Carga estimada', form.estimatedLoad || '—'], ['Límite de respuesta', form.responseDeadline || '—'], ['Documento', documentName(form.document) || 'Sin documento'], ['Mensaje', form.message || '—']].map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b border-line pb-2"><b>{label}</b><span>{value}</span></div>)}</div>}</div></Modal>
}

function TransportRequestDetail({ request, onBack, onUpdate }: { request: TransportRequest; onBack: () => void; onUpdate: (patch: Partial<TransportRequest>) => void }) {
  const s = useStore()
  const [tab, setTab] = useState('Requerimiento')
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [assignmentOpen, setAssignmentOpen] = useState(false)
  const selectedQuote = request.quotes.find((quote) => quote.id === request.selectedQuoteId)
  return <div><Button variant="ghost" className="mb-4 px-0" onClick={onBack}>← Volver a requerimientos</Button><DataLegend /><div className="mb-5 rounded-2xl border border-line bg-surface p-5 text-ink"><div className="flex items-center gap-2"><FlowValidationNote /><ValidationTag /></div><h1 className="mt-3 font-display text-2xl font-bold">{request.reference}</h1><p className="mt-1 text-sm">Campaña: {s.campaigns.find((campaign) => campaign.id === request.campaignId)?.nombre || 'Sin campaña'} · Estado: {request.status}</p></div><Tabs tabs={['Requerimiento', 'Cotizaciones', 'Selección de transportista']} active={tab} onChange={setTab} />
    {tab === 'Requerimiento' && <TransportProposalField><div className="grid gap-3 sm:grid-cols-2">{[['Origen', request.origin], ['Destino', request.destination], ['Ventana', request.serviceWindow], ['Carga estimada', request.estimatedLoad], ['Vehículo requerido', request.vehicleFeatures], ['Condiciones', request.conditions], ['Fecha límite', request.responseDeadline], ['Documento', request.document], ['Mensaje', request.message], ['Destinatarios', request.companyIds.map((id) => s.transporters.find((company) => company.id === id)?.empresa).join(', ')]].map(([label, value]) => <div key={label} className="rounded-lg bg-surface p-3"><div className="text-xs font-semibold uppercase">{label}</div><div className="mt-1 text-sm">{value || 'Sin información'}</div></div>)}</div></TransportProposalField>}
    {tab === 'Cotizaciones' && <TransportProposalField><div className="mb-3 flex justify-end"><Button variant="outline" onClick={() => setQuoteOpen(true)}>+ Registrar respuesta <ValidationTag /></Button></div><Table head={[<ProposalHeader>Empresa</ProposalHeader>, <ProposalHeader>Importe</ProposalHeader>, <ProposalHeader>Moneda</ProposalHeader>, <ProposalHeader>Disponibilidad</ProposalHeader>, <ProposalHeader>Condiciones</ProposalHeader>, <ProposalHeader>Documento</ProposalHeader>, 'Acción']}>{request.quotes.map((quote) => <tr key={quote.id} className="text-ink"><td className="px-4 py-3">{s.transporters.find((company) => company.id === quote.companyId)?.empresa}</td><td className="px-4 py-3 font-mono">{fmtNum(quote.amount)}</td><td className="px-4 py-3">{quote.currency}</td><td className="px-4 py-3">{quote.availability}</td><td className="px-4 py-3">{quote.conditions}</td><td className="px-4 py-3">{quote.document}</td><td className="px-4 py-3"><Button variant="ghost" onClick={() => { onUpdate({ selectedQuoteId: quote.id, status: 'Transporte seleccionado' }); setTab('Selección de transportista') }}>Seleccionar</Button></td></tr>)}{request.quotes.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm">Sin respuestas registradas.</td></tr>}</Table></TransportProposalField>}
    {tab === 'Selección de transportista' && <div className="rounded-xl border border-line bg-surface p-5">{!selectedQuote ? <p>Selecciona una cotización para continuar.</p> : <><h2 className="font-semibold">Transportista seleccionado</h2><p className="mt-2">{s.transporters.find(t=>t.id===selectedQuote.companyId)?.empresa} · {selectedQuote.currency} {fmtNum(selectedQuote.amount)}</p><p className="my-3 text-sm text-ink-soft">Vincula este transportista a la campaña en proceso. El camión, chofer, guías, kilos y gastos se registran desde Registro de carga.</p><Button onClick={()=>window.dispatchEvent(new CustomEvent('app:navigate',{detail:'campanas'}))}>Ir a campañas</Button></>}</div>}
    {quoteOpen && <TransportQuoteModal companyIds={request.companyIds} onClose={() => setQuoteOpen(false)} onSave={(quote) => { onUpdate({ quotes: [...request.quotes, quote], status: 'Cotizaciones recibidas' }); setQuoteOpen(false) }} />}{assignmentOpen && request.service && selectedQuote && <TransportAssignmentModal companyId={selectedQuote.companyId} serviceId={request.service.id} assignment={request.service.assignment} onClose={() => setAssignmentOpen(false)} onSave={(assignment) => { onUpdate({ service: { ...request.service!, assignment } }); setAssignmentOpen(false) }} />}</div>
}

function TransportQuoteModal({ companyIds, onClose, onSave }: { companyIds: string[]; onClose: () => void; onSave: (quote: TransportQuote) => void }) {
  const s = useStore()
  const [form, setForm] = useState({ companyId: companyIds[0] ?? '', amount: '', currency: 'PEN', availability: '', conditions: '', document: '' })
  return <Modal open onClose={onClose} title="Registrar respuesta de cotización" footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => onSave({ id: Math.random().toString(36).slice(2), ...form, amount: Number(form.amount) || 0 })}>Guardar respuesta <ValidationTag /></Button></>}><TransportProposalField><div className="grid gap-4"><Field label="Empresa"><Select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>{companyIds.map((id) => <option key={id} value={id}>{s.transporters.find((company) => company.id === id)?.empresa}</option>)}</Select></Field><Field label="Importe"><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field><Field label="Moneda"><Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option>PEN</option><option>USD</option></Select></Field><Field label="Disponibilidad"><Input value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} /></Field><Field label="Condiciones"><TextArea rows={2} value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} /></Field><FileDrop label="Documento de cotización" onFile={(name) => setForm({ ...form, document: name ?? '' })} /></div></TransportProposalField></Modal>
}

function TransportAssignmentModal({ companyId, serviceId, assignment, onClose, onSave }: { companyId: string; serviceId: string; assignment?: TransportAssignment; onClose: () => void; onSave: (assignment: TransportAssignment) => void }) {
  const s = useStore()
  const company = s.transporters.find((item) => item.id === companyId)!
  const [form, setForm] = useState({ vehicleId: assignment?.vehicleId ?? '', driverId: assignment?.driverId ?? '', start: assignment?.start ?? '', end: assignment?.end ?? '' })
  return <Modal open onClose={onClose} title="Asignar vehículo y chofer al servicio" footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => onSave(form)}>Guardar asignación</Button></>}><div className="mb-4 rounded-lg bg-canvas/60 p-3 text-sm">Servicio identificado: <b>{serviceId}</b> · Empresa seleccionada: <b>{company.empresa}</b></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Vehículo"><Select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}><option value="">Seleccionar</option>{company.vehiculos.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.id} · {vehicle.placa}</option>)}</Select></Field><Field label="Chofer"><Select aria-label="Chofer" value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}><option value="">Seleccionar</option>{company.choferes.map((driver) => <option key={driver.id} value={driver.id}>{driver.nombre}</option>)}</Select></Field><Field label="Fecha de asignación inicial"><Input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field><Field label="Fecha de asignación final"><Input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field></div><div className="mt-4"><TransportProposalField ><p className="text-sm   ">Detección automática de asignaciones superpuestas.</p></TransportProposalField></div></Modal>
}

function LegacyTransportModule() {
  const s = useStore()
  const [q, setQ] = useState('')
  const [proposal, setProposal] = useState('Propuesta 1')
  const [section, setSection] = useState<'Empresas' | 'Vehículos' | 'Choferes'>('Empresas')
  const [selected, setSelected] = useState<string[]>([])
  const [modal, setModal] = useState(false)
  const [vehicleModal, setVehicleModal] = useState(false)
  const [choferModal, setChoferModal] = useState(false)
  const [reqOpen, setReqOpen] = useState(false)
  const [vehFor, setVehFor] = useState<string | null>(null)
  const rows = s.transporters.filter((t) => (`${t.empresa} ${t.numero} ${t.correo} ${t.ruc}`).toLowerCase().includes(q.toLowerCase()))
  const toggle = (id: string) => setSelected((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])
  const toggleAll = () => setSelected(selected.length === rows.length ? [] : rows.map((t) => t.id))
  if (vehFor) { const t = s.transporters.find((x) => x.id === vehFor); if (t) return <VehiclesView transporterId={t.id} onBack={() => setVehFor(null)} /> }
  return (
    <div>
      <div className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Gestión de transporte</h1>
            <p className="mt-1 text-sm text-ink-soft">{s.transporters.length} empresas de transporte registradas · {selected.length} seleccionada{selected.length === 1 ? '' : 's'}</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {section === 'Vehículos' ? <Button className="h-10" onClick={() => setVehicleModal(true)}>+ Agregar vehículo</Button> : section === 'Choferes' ? <Button className="h-10" onClick={() => setChoferModal(true)}>+ Agregar chofer</Button> : <><Button variant="outline" className="h-10" disabled={selected.length === 0} onClick={() => setReqOpen(true)}>⌁ Enviar requerimiento <span className="grid h-5 min-w-5 place-items-center rounded-full bg-leaf-50 px-1 text-[10px] font-semibold text-forest">{selected.length}</span></Button><Button className="h-10 bg-plan hover:bg-plan/90" onClick={() => setModal(true)}>+ Agregar empresa de transporte</Button></>}
          </div>
        </div>
        <div className="mt-5">
          <Tabs tabs={['Propuesta 1', 'Propuesta 2']} active={proposal} onChange={setProposal} />
        </div>
      </div>
      <DataLegend />

      <div className="mb-4 inline-flex rounded-xl border border-line bg-surface p-1">
        {([
          ['Empresas', s.transporters.length], ['Vehículos', s.transporters.reduce((n, t) => n + t.vehiculos.length, 0)], ['Choferes', s.transporters.reduce((n, t) => n + (t.choferes?.length ?? 0), 0)],
        ] as const).map(([label, count]) => <button key={label} onClick={() => setSection(label)} className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${section === label ? 'bg-leaf text-white shadow-sm' : 'text-ink-soft hover:text-forest'}`}>{label === 'Empresas' ? 'Empresa transporte' : label} <span className="ml-1 opacity-70">{count}</span></button>)}
      </div>

      {section === 'Vehículos' ? <TransportVehiclesPanel onAdd={() => setVehicleModal(true)} /> : section === 'Choferes' ? <TransportChoferesPanel onAdd={() => setChoferModal(true)} /> : <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="relative min-w-[220px] flex-1"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">⌕</span><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar responsable" className="pl-9" /></div>
          <Button variant="outline" className="text-xs" onClick={() => { setQ(''); setSelected([]) }}>× Limpiar filtros</Button>
          <div className="flex w-full items-center gap-2 text-xs text-ink-soft sm:w-auto"><span>Empresa:</span><Select className="w-36 py-1.5"><option>Todos</option></Select></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-sm">
            <thead><tr className="border-b border-line bg-canvas/40 text-left">
              <th className="w-12 px-4 py-3"><input aria-label="Seleccionar todas las empresas" type="checkbox" checked={rows.length > 0 && selected.length === rows.length} onChange={toggleAll} className="h-4 w-4 accent-leaf" /></th>
              {['Nombre completo', 'Número', 'Correo', 'RUC', 'Acciones'].map((h) => <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((t, i) => <tr key={t.id} className="animate-row hover:bg-leaf-50/40" style={{ animationDelay: `${i * 25}ms` }}>
                <td className="px-4 py-3"><input aria-label={`Seleccionar ${t.empresa}`} type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} className="h-4 w-4 accent-leaf" /></td>
                <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-plan-50 text-xs font-bold text-plan">{t.empresa[0]}</span><div><div className="font-semibold text-ink">{t.empresa}</div><div className="text-[10px] text-ink-soft">Responsable de transporte</div></div></div></td>
                <td className="px-4 py-3 font-mono text-xs text-ink-soft">{t.numero}</td><td className="px-4 py-3 text-sm font-medium text-plan">{t.correo}</td><td className="px-4 py-3 font-mono text-xs text-ink-soft">{t.ruc}</td>
                <td className="px-4 py-3"><button title="Ver vehículos" onClick={() => setVehFor(t.id)} className="rounded-lg px-2 py-1 text-lg leading-none text-[#8a9aae] transition hover:bg-leaf-50 hover:text-forest">•••</button></td>
              </tr>)}
              {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-soft">Sin empresas que coincidan con la búsqueda.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-ink-soft"><span>{rows.length} de {s.transporters.length} responsables</span><span className="grid h-6 w-6 place-items-center rounded-md bg-plan-50 text-plan">1</span></div>
      </div>}
      {modal && <TransporterModal onClose={() => setModal(false)} />}
      {vehicleModal && <VehicleModal onClose={() => setVehicleModal(false)} />}
      {choferModal && <ChoferModal onClose={() => setChoferModal(false)} />}
      <Modal open={reqOpen} onClose={() => setReqOpen(false)} title="Enviar requerimiento"
        footer={<><Button variant="outline" onClick={() => setReqOpen(false)}>Cancelar</Button><Button onClick={() => { s.toast('Requerimiento enviado a las empresas'); setReqOpen(false); setSelected([]) }}>Enviar requerimiento</Button></>}>
        {(() => {
          const chosen = s.transporters.filter((t) => selected.includes(t.id))
          return <div className="grid gap-6">
            <p className="-mt-2 text-sm text-ink-soft">Comparte el requerimiento con las transportistas seleccionados.</p>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Empresas de transporte seleccionadas</h4>
              <p className="mt-1 mb-2.5 text-sm text-ink-soft">{chosen.length} empresa{chosen.length === 1 ? '' : 's'} seleccionada{chosen.length === 1 ? '' : 's'}</p>
              <div className="grid max-h-40 grid-cols-1 gap-2 overflow-auto pr-1 sm:grid-cols-2">
                {chosen.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-full border border-leaf/40 bg-leaf-50/50 px-3.5 py-2 text-sm font-medium text-ink">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" />
                    <span className="truncate">{t.empresa}</span>
                  </div>
                ))}
                {chosen.length === 0 && <p className="col-span-full py-4 text-center text-sm text-ink-soft">No hay transportistas seleccionados.</p>}
              </div>
            </section>

            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Requerimiento</h4>
              <p className="mt-1 mb-2.5 text-sm text-ink-soft">PDF, Word o Excel</p>
              <FileDrop label="Subir requerimiento" />
            </section>

            <section>
              <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">Detalle</h4>
              <TextArea rows={4} placeholder="Describe el requerimiento, fechas, condiciones o instrucciones para las empresas." />
            </section>
          </div>
        })()}
      </Modal>
    </div>
  )
}

function TransporterModal({ onClose }: { onClose: () => void }) {
  const s = useStore()
  const [empresa, setEmpresa] = useState('')
  const [ruc, setRuc] = useState('')
  const [numero, setNumero] = useState('')
  const [correo, setCorreo] = useState('')
  return (
    <Modal open onClose={onClose} title="Registrar empresa de transporte"
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button className="bg-plan hover:bg-plan/90" onClick={() => { if (!empresa) return; s.addTransporter({ empresa, ruc, numero, correo }); s.toast('Empresa de transporte registrada'); onClose() }}>Guardar</Button></>}>
      <div className="-mt-2 mb-5 text-sm text-ink-soft">Datos de identificación y contacto</div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombre completo"><Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Empresa o persona" /></Field>
        <Field label="RUC"><Input value={ruc} onChange={(e) => setRuc(e.target.value)} placeholder="20987456321" /></Field>
        <Field label="Número"><Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="987 456 321" /></Field>
        <Field label="Correo"><Input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="empresa@gmail.com" /></Field>
      </div>
    </Modal>
  )
}

function TransportVehiclesPanel({ onAdd }: { onAdd: () => void }) {
  const s = useStore()
  const [q, setQ] = useState('')
  const [empresa, setEmpresa] = useState('')
  const vehicles = s.transporters.flatMap((t) => t.vehiculos.map((v) => ({ ...v, empresa: t.empresa }))).filter((v) => (`${v.placa} ${v.empresa}`).toLowerCase().includes(q.toLowerCase()) && (!empresa || v.empresa === empresa))
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4">
        <div><h2 className="font-display text-base font-semibold text-ink">Vehículos registrados</h2><p className="mt-1 text-xs text-ink-soft">Registro de capacidad y dimensiones de cada vehículo</p></div>
        <Button className="sm:hidden" onClick={onAdd}>+ Agregar vehículo</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <div className="relative min-w-[220px] flex-1"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">⌕</span><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar placa o empresa" className="pl-9" /></div>
        <Select value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="w-full sm:w-52"><option value="">Todas las empresas</option>{s.transporters.map((t) => <option key={t.id}>{t.empresa}</option>)}</Select>
        <Select className="w-full sm:w-36"><option>Ordenar: placa</option></Select>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-sm"><thead><tr className="border-b border-line bg-canvas/40 text-left"><th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-ink"><ProposalHeader>Placa</ProposalHeader></th>{['Dimensiones', 'Volumen / pesos', 'Empresa transporte', 'Acciones'].map((h) => <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{vehicles.map((v, i) => <tr key={v.id} className="animate-row hover:bg-leaf-50/40" style={{ animationDelay: `${i * 25}ms` }}>
          <td className="px-4 py-4 font-mono text-xs font-semibold text-ink">{v.placa}</td>
          <td className="px-4 py-4"><div className="font-semibold text-ink">{v.ancho ?? '—'} × {v.altura ?? '—'} × {v.profundidad ?? '—'} m</div><div className="mt-0.5 text-[10px] text-ink-soft">ancho · alto · profundidad</div></td>
          <td className="px-4 py-4"><div className="font-medium text-ink">{v.volumen ?? v.capacidad} m³</div><div className="mt-0.5 text-[10px] text-ink-soft">Neto {v.pesoNeto} · Bruto {v.pesoBruto ?? v.pbv}</div></td>
          <td className="px-4 py-4 text-xs font-semibold text-ink">{v.empresa}</td>
          <td className="px-4 py-4"><div className="flex gap-2 text-ink-soft"><button title="Editar vehículo" className="transition hover:text-forest">✎</button><button title="Notificar" className="transition hover:text-forest">✉</button></div></td>
        </tr>)}{vehicles.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-soft">Sin vehículos registrados.</td></tr>}</tbody></table></div>
      <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-ink-soft"><span>{vehicles.length} de {s.transporters.reduce((n, t) => n + t.vehiculos.length, 0)} vehículos</span><span>Los cambios se sincronizarán con la tabla Vehículos.</span></div>
    </div>
  )
}

function VehicleModal({ onClose }: { onClose: () => void }) {
  const s = useStore()
  const [empresa, setEmpresa] = useState(s.transporters[0]?.id ?? '')
  const [v, setV] = useState({ placa: '', volumen: '', ancho: '', altura: '', profundidad: '', pesoNeto: '', pesoBruto: '' })
  const set = (key: keyof typeof v, value: string) => setV({ ...v, [key]: value })
  return <Modal open onClose={onClose} title="Registrar vehículo" footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => { if (!v.placa || !empresa) return; s.addVehicle(empresa, { ...v, capacidad: `${v.volumen} m³`, pbv: `${v.pesoBruto} t`, pesoNeto: `${v.pesoNeto} t` }); s.toast('Vehículo registrado'); onClose() }}>Guardar vehículo</Button></>}>
    <div className="-mt-2 mb-5 text-sm text-ink-soft">Datos técnicos del vehículo</div>
    <div className="grid grid-cols-2 gap-4">
      <ProposalField><Field label="Placa"><Input value={v.placa} onChange={(e) => set('placa', e.target.value)} /></Field></ProposalField><Field label="Volumen"><Input value={v.volumen} onChange={(e) => set('volumen', e.target.value)} /></Field>
      <Field label="Ancho (m)"><Input value={v.ancho} onChange={(e) => set('ancho', e.target.value)} /></Field><Field label="Altura (m)"><Input value={v.altura} onChange={(e) => set('altura', e.target.value)} /></Field>
      <Field label="Profundidad (m)"><Input value={v.profundidad} onChange={(e) => set('profundidad', e.target.value)} /></Field><Field label="Peso neto (t)"><Input value={v.pesoNeto} onChange={(e) => set('pesoNeto', e.target.value)} /></Field>
      <Field label="Peso bruto (t)"><Input value={v.pesoBruto} onChange={(e) => set('pesoBruto', e.target.value)} /></Field><Field label="Empresa transporte"><Select value={empresa} onChange={(e) => setEmpresa(e.target.value)}>{s.transporters.map((t) => <option key={t.id} value={t.id}>{t.empresa}</option>)}</Select></Field>
    </div>
  </Modal>
}

function TransportChoferesPanel({ onAdd }: { onAdd: () => void }) {
  const s = useStore()
  const [q, setQ] = useState('')
  const [empresa, setEmpresa] = useState('')
  const choferes = s.transporters.flatMap((t) => (t.choferes ?? []).map((c) => ({ ...c, empresa: t.empresa }))).filter((c) => (`${c.nombre} ${c.correo} ${c.telefono} ${c.empresa}`).toLowerCase().includes(q.toLowerCase()) && (!empresa || c.empresa === empresa))
  const total = s.transporters.reduce((n, t) => n + (t.choferes?.length ?? 0), 0)
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4">
        <div><h2 className="font-display text-base font-semibold text-ink">Choferes registrados</h2><p className="mt-1 text-xs text-ink-soft">Personal de conducción asociado a cada empresa de transporte</p></div>
        <Button className="sm:hidden" onClick={onAdd}>+ Agregar chofer</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <div className="relative min-w-[220px] flex-1"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft">⌕</span><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar chofer o empresa" className="pl-9" /></div>
        <Select value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="w-full sm:w-52"><option value="">Todas las empresas</option>{s.transporters.map((t) => <option key={t.id}>{t.empresa}</option>)}</Select>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-sm"><thead><tr className="border-b border-line bg-canvas/40 text-left">{['Nombre completo', 'Teléfono', 'Correo', 'Empresa transporte', 'Acciones'].map((h) => <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{choferes.map((c, i) => <tr key={c.id} className="animate-row hover:bg-leaf-50/40" style={{ animationDelay: `${i * 25}ms` }}>
          <td className="px-4 py-4"><div className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-lg bg-plan-50 text-xs font-bold text-plan">{c.nombre[0]}</span><span className="font-semibold text-ink">{c.nombre}</span></div></td>
          <td className="px-4 py-4 font-mono text-xs text-ink-soft">{c.telefono}</td>
          <td className="px-4 py-4 text-sm font-medium text-plan">{c.correo}</td>
          <td className="px-4 py-4 text-xs font-semibold text-ink">{c.empresa}</td>
          <td className="px-4 py-4"><div className="flex gap-2 text-ink-soft"><button title="Editar chofer" className="transition hover:text-forest">✎</button><button title="Notificar" className="transition hover:text-forest">✉</button></div></td>
        </tr>)}{choferes.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-soft">Sin choferes registrados.</td></tr>}</tbody></table></div>
      <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-ink-soft"><span>{choferes.length} de {total} choferes</span><span>Cada chofer pertenece a una empresa de transporte.</span></div>
    </div>
  )
}

function ChoferModal({ onClose }: { onClose: () => void }) {
  const s = useStore()
  const [empresa, setEmpresa] = useState(s.transporters[0]?.id ?? '')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  return (
    <Modal open onClose={onClose} title="Registrar chofer"
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => { if (!nombre || !empresa) return; s.addChofer(empresa, { nombre, telefono, correo }); s.toast('Chofer registrado'); onClose() }}>Guardar chofer</Button></>}>
      <div className="-mt-2 mb-5 text-sm text-ink-soft">Datos de contacto y empresa asociada</div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombre completo"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" /></Field>
        <Field label="Teléfono"><Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="987 654 321" /></Field>
        <Field label="Correo"><Input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="chofer@empresa.pe" /></Field>
        <Field label="Empresa transporte"><Select value={empresa} onChange={(e) => setEmpresa(e.target.value)}>{s.transporters.map((t) => <option key={t.id} value={t.id}>{t.empresa}</option>)}</Select></Field>
      </div>
    </Modal>
  )
}

function VehiclesView({ transporterId, onBack }: { transporterId: string; onBack: () => void }) {
  const s = useStore()
  const t = s.transporters.find((x) => x.id === transporterId)!
  const [open, setOpen] = useState(false)
  const [v, setV] = useState({ placa: '', capacidad: '', pbv: '', pesoNeto: '' })
  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-forest">← Volver</button>
      <PageHeader title={`Vehículos — ${t.empresa}`} action={<Button onClick={() => setOpen(true)}>+ Registrar vehículo</Button>} />
      <Table head={['ID', <ProposalHeader>Placa</ProposalHeader>, <ProposalHeader>Capacidad de carga</ProposalHeader>, 'Peso bruto', 'Peso neto']}>
        {t.vehiculos.map((veh, i) => (
          <tr key={veh.id} className="animate-row hover:bg-leaf-50/40">
            <td className="px-4 py-3 font-mono">{i + 1}</td>
            <td className="px-4 py-3 font-mono font-medium text-ink">{veh.placa}</td>
            <td className="px-4 py-3">{veh.capacidad}</td>
            <td className="px-4 py-3">{veh.pbv}</td>
            <td className="px-4 py-3">{veh.pesoNeto}</td>
          </tr>
        ))}
        {t.vehiculos.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-soft">Sin vehículos registrados.</td></tr>}
      </Table>
      <Modal open={open} onClose={() => setOpen(false)} title="Registrar datos del vehículo"
        footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => { if (!v.placa) return; s.addVehicle(transporterId, v); s.toast('Vehículo registrado'); setOpen(false); setV({ placa: '', capacidad: '', pbv: '', pesoNeto: '' }) }}>Enviar</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <ProposalField><Field label="Placa"><Input value={v.placa} onChange={(e) => setV({ ...v, placa: e.target.value })} placeholder="ASD-123" /></Field></ProposalField>
          <ProposalField><Field label="Capacidad de carga"><Input value={v.capacidad} onChange={(e) => setV({ ...v, capacidad: e.target.value })} placeholder="20 t" /></Field></ProposalField>
          <Field label="PBV (peso bruto vehicular)"><Input value={v.pbv} onChange={(e) => setV({ ...v, pbv: e.target.value })} placeholder="32 t" /></Field>
          <Field label="Peso neto"><Input value={v.pesoNeto} onChange={(e) => setV({ ...v, pesoNeto: e.target.value })} placeholder="12 t" /></Field>
        </div>
      </Modal>
    </div>
  )
}

// ============================================================ QUALITY
function FlowBdNote() { return null }

function ImprovementNote() { return null }

function ApprovedBdNote() { return null }

const qualitySections = (route: QualityRoute) => route === 'Industria'
  ? ['Control de calidad y carga', 'Generación de guía']
  : ['Preparar cosecha', 'Registrar avances', 'Cerrar cosecha']

export function QualityModule() {
  return <QualityCampaignBrowser renderLoad={(id,section,onBack)=><QualityLoadPage key={id} id={id} initialSection={section} onBack={onBack}/>} renderDetail={(id,onBack)=><QualityOperationView operationId={id} onBack={onBack}/>} />
}
function QualityLoadPage({id,initialSection,onBack}:{id:string;initialSection:string;onBack:()=>void}) {
  const [section,setSection]=useState(initialSection)
  return <QualityOperationManager operationId={id} section={section} onBack={onBack} onSection={setSection}/>
}

function QualityOperationModal({ initialRoute, onClose, onSaved }: { initialRoute: QualityRoute; onClose: () => void; onSaved: (id: string, route: QualityRoute) => void }) {
  const s = useStore()
  const [campaignId, setCampaignId] = useState('')
  const [route, setRoute] = useState<QualityRoute>(initialRoute)
  const [providerId, setProviderId] = useState('')
  const [form, setForm] = useState({ origin: '', date: '', estimated: '', requirementId: '', variety: '', observations: '' })
  const campaign = s.campaigns.find((item) => item.id === campaignId)
  const participants = s.campaignProviders.filter((item) => item.campaignId === campaignId)
  const availableProviders = participants.map((item) => s.providers.find((provider) => provider.id === item.providerId)).filter(Boolean) as Provider[]
  const requirements = s.requirements.filter((item) => item.campaignId === campaignId)
  if (initialRoute === 'Exportación') return <ExportDeliveryStart onClose={onClose} onSaved={(id) => onSaved(id, 'Exportación')} />
  if (initialRoute === 'Industria') return <IndustryDeliveryStart onClose={onClose} onSaved={(id) => onSaved(id, 'Industria')} />
  return <Modal open onClose={onClose} wide title={route === 'Industria' ? 'Registrar control de calidad' : 'Registrar cosecha'} footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => { if(!campaignId||(route==='Exportación'&&!providerId)){s.toast(route==='Industria'?'Selecciona la campaña para continuar':'Selecciona campaña y proveedor para continuar');return} const id = s.addQualityOperation({ reference: `OP-${route === 'Exportación' ? 'EXP' : 'IND'}-${Date.now().toString().slice(-5)}`, campaignId, route, providerId, origin: form.origin, expectedDate: form.date, status: route === 'Industria' ? 'En control' : 'Preparada', estimatedQuantity: Number(form.estimated) || 0, harvestedQuantity: 0, acceptedQuantity: 0, loadedQuantity: 0, plantQuantity: 0, clientRequirementId: form.requirementId || undefined, variety: form.variety, observations: form.observations, analyses: [], advances: [], industry: route === 'Industria' ? { requestedVolume: form.estimated, collectionCenter: '', receptionDate: '', inspectionDate: '', inspectionResult: 'Sin registrar', inspectionObservations: '', inspectionEvidence: '', rejectionReason: '', vehicleInspection: '', nonConformities: '', corrections: '', loadReport: '', purchaseRecord: '', guide: '', departureDate: '', arrivalDate: '', receivedReport: '' } : undefined }); s.toast(route === 'Industria' ? 'Control de calidad creado' : 'Registro de cosecha creado'); onSaved(id, route) }}>{route === 'Industria' ? 'Continuar al control de calidad' : 'Guardar registro'}</Button></>}>{route === 'Industria' ? <div><Field label="Campaña"><Select aria-label="Campaña del control" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}><option value="">Seleccionar campaña</option>{s.campaigns.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</Select></Field><p className="mt-3 text-sm text-ink-soft">Los proveedores, variedades y kilos se registran después, por camión, en Datos de carga.</p></div> : <><DataLegend /><div className="mb-3"><FlowBdNote /></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Campaña existente"><Select aria-label="Campaña del control" value={campaignId} onChange={(e) => { setCampaignId(e.target.value); setProviderId('') }}><option value="">Seleccionar</option>{s.campaigns.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</Select></Field><Field label="Ruta"><Input readOnly value="Exportación" /></Field><Field label="Proveedor participante"><Select aria-label="Proveedor del control" value={providerId} onChange={(e) => setProviderId(e.target.value)}><option value="">Seleccionar</option>{availableProviders.map((provider) => <option key={provider.id} value={provider.id}>{provider.nombres} {provider.apellidos}</option>)}</Select></Field><Field label="Fruta de campaña"><Input readOnly value={campaign?.fruta ?? ''} /></Field><TransportProposalField note="Campo o lugar de origen independiente sin soporte confirmado."><Field label="Campo o lugar de origen"><Input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></Field></TransportProposalField><TransportProposalField><Field label="Fecha prevista"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field></TransportProposalField><TransportProposalField note="No se copian automáticamente todos los kilos estimados del proveedor."><Field label="Cantidad estimada de fruta"><Input type="number" value={form.estimated} onChange={(e) => setForm({ ...form, estimated: e.target.value })} /></Field></TransportProposalField><TransportProposalField><Field label="Cliente o requerimiento relacionado"><Select value={form.requirementId} onChange={(e) => setForm({ ...form, requirementId: e.target.value })}><option value="">Sin relación</option>{requirements.map((item) => <option key={item.id} value={item.id}>{s.clients.find((client) => client.id === item.clientId)?.empresa}</option>)}</Select></Field></TransportProposalField><TransportProposalField><Field label="Variedad específica"><Select value={form.variety} onChange={(e) => setForm({ ...form, variety: e.target.value })}><option value="">Sin definir</option>{(FRUIT_CATALOG[campaign?.fruta ?? ''] ?? []).map((variety) => <option key={variety}>{variety}</option>)}</Select></Field></TransportProposalField><div className="sm:col-span-2"><TransportProposalField><Field label="Observaciones"><TextArea rows={2} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} /></Field></TransportProposalField></div></div></>}</Modal>
}

function QualityDocumentCard({ title, file }: { title: string; file?: string }) {
  const s = useStore()
  return <div className="rounded-xl border border-line bg-surface p-4"><div className="text-xs font-semibold uppercase text-ink-soft">{title}</div><div className="mt-2 text-sm font-medium">{documentName(file) || 'Sin documento'}</div>{file && <div className="mt-3 flex gap-2"><Button variant="outline" onClick={() => void openStoredDocument(file,false).catch(e=>s.toast(e.message))}>Ver</Button><Button variant="ghost" onClick={() => void openStoredDocument(file,true).catch(e=>s.toast(e.message))}>Descargar</Button></div>}</div>
}

function QualityOperationView({ operationId, onBack }: { operationId: string; onBack: () => void }) {
  const s = useStore()
  const operation = s.qualityOperations.find((item) => item.id === operationId)!
  const campaign = s.campaigns.find((item) => item.id === operation.campaignId)!
  const provider = s.providers.find((item) => item.id === operation.providerId)
  const providerLabel = provider ? `${provider.nombres} ${provider.apellidos}` : 'Proveedores por camión'
  const loads = s.campaignTransporters.flatMap(l => l.services).filter(i => i.operationId === operation.id && i.annotation)
  const sources = [operation.sourceDelivery, ...loads.map(i => i.sourceDelivery), ...(operation.rejectedDeliveries || []).map(i => i.sourceDelivery)].filter((source): source is NonNullable<QualityOperation['sourceDelivery']> => !!source).filter((source, index, all) => all.findIndex(item => item.requirementId === source.requirementId && item.contractId === source.contractId && item.deliveryId === source.deliveryId) === index)
  const documents = operation.route === 'Exportación' ? [...exportMtdValues(s, operation).map(record=>record.evidence), ...operation.analyses.map((item) => item.document), operation.closure?.report, operation.closure?.guide] : [operation.industry?.inspectionEvidence, operation.industry?.loadReport, operation.industry?.guide, operation.industry?.receivedReport]
  return <div><Button variant="ghost" className="mb-4 px-0" onClick={onBack}>← Volver a operaciones</Button><DataLegend /><div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-line bg-surface p-5"><div><div className="text-xs font-semibold uppercase text-ink">{operation.reference} <ValidationTag /></div><h1 className="mt-1 font-display text-2xl font-bold">{campaign.nombre} · {operation.route}</h1><p className="mt-1 text-sm text-ink-soft">{providerLabel}{operation.origin && ` · ${operation.origin}`}</p></div></div><div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Estado', operation.status], ['Fecha prevista', fmtDate(operation.expectedDate)], [operation.loadRegistration?'Kilos registrados':'Cantidad estimada', `${fmtNum(operation.estimatedQuantity)} kg`], ['Fruta', campaign.fruta], ['Cosechado', operation.harvestedQuantity ? `${fmtNum(operation.harvestedQuantity)} kg` : 'Sin registro'], ['Aceptado', operation.acceptedQuantity ? `${fmtNum(operation.acceptedQuantity)} kg` : 'Sin registro'], ['Cargado', operation.loadedQuantity ? `${fmtNum(operation.loadedQuantity)} kg` : 'Sin registro'], ['Recibido en planta', operation.plantQuantity ? `${fmtNum(operation.plantQuantity)} kg` : 'Sin registro']].map(([label, value], index) => <div key={label} className={`rounded-xl border p-4 ${index < 4 && label === 'Fruta' ? 'border-line bg-surface' : index < 4 ? 'border-line bg-surface text-ink' : 'border-line bg-surface text-ink'}`}><div className="text-xs font-semibold uppercase">{label}</div><div className="mt-1 font-medium">{value}</div>{label !== 'Fruta' && <div className="mt-2"><ValidationTag /></div>}</div>)}</div>{sources.length > 0 && <section className="mb-5 space-y-3"><h2 className="font-display text-lg font-semibold">Entregas, proveedores y fincas</h2>{sources.map(source => <IndustryDeliverySummary key={`${source.requirementId}-${source.contractId}-${source.deliveryId}`} operation={{...operation, sourceDelivery: source}} />)}</section>}{operation.loadRegistration?<LoadRegistrationSummary registration={operation.loadRegistration}/>:<LoadTravelExpensesSummary value={operation.viaticos}/>}<h2 className="mb-3 font-display text-lg font-semibold">Controles disponibles</h2><div className="mb-5 grid gap-3 sm:grid-cols-2">{operation.route === 'Exportación' ? <><div className="rounded-xl border border-line bg-surface p-4">Análisis registrados: <b>{operation.analyses.length}</b></div><div className="rounded-xl border border-line bg-surface p-4">MTD revisado: <b>{exportMtdValues(s, operation).map(c=>`${c.label}: ${c.value || 'Sin registrar'}`).join(' · ') || 'Sin registro'}</b></div></> : <><div className="rounded-xl border border-line bg-surface p-4">Cargas conformes: <b>{loads.length}</b></div><div className="rounded-xl border border-line bg-surface p-4">Entregas rechazadas: <b>{operation.rejectedDeliveries?.length || 0}</b></div></>}</div>{operation.route === 'Exportación' && <div className="mb-5"><ExportMtdSummary operation={operation} campaignScope /></div>}<h2 className="mb-3 font-display text-lg font-semibold">Documentos</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{documents.filter(Boolean).map((file, index) => <QualityDocumentCard key={`${file}-${index}`} title={`Documento ${index + 1}`} file={file} />)}{documents.filter(Boolean).length === 0 && <div className="rounded-xl border border-line bg-surface p-6 text-sm text-ink-soft">Sin documentos disponibles.</div>}</div></div>
}

function QualityOperationManager({ operationId, section, onBack, onSection }: { operationId: string; section: string; onBack: () => void; onSection: (section: string) => void }) {
  const s = useStore()
  const operation = s.qualityOperations.find((item) => item.id === operationId)!
  const campaign = s.campaigns.find((item) => item.id === operation.campaignId)!
  const provider = s.providers.find((item) => item.id === operation.providerId)
  const providerLabel = provider ? `${provider.nombres} ${provider.apellidos}` : 'Proveedores por camión'
  const steps = qualitySections(operation.route)
  const index = steps.indexOf(section)
  const readiness = exportReadiness(s, operation)
  const canNext = !!operation.sourceDelivery && readiness.reviewed && readiness.organized && operation.qualityDecision !== 'Rechazada' && (index === 0 || (index === 1 && operation.harvestedQuantity > 0))
  return <div><Button variant="ghost" className="mb-4 px-0" onClick={onBack}>← Volver al listado</Button><DataLegend />{operation.route === 'Exportación' && index >= 0 && <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-ink-soft">Paso {index + 1} de {steps.length} · {section}</span><div className="flex gap-2">{index > 0 && <Button variant="outline" onClick={() => onSection(steps[index-1])}>← Anterior</Button>}{index < steps.length-1 && <Button disabled={!canNext} onClick={() => onSection(steps[index+1])}>Continuar a {steps[index+1]} →</Button>}</div></div>}<div className="mb-5 rounded-2xl border border-line bg-surface p-5"><div className="text-xs font-semibold uppercase text-ink">{operation.reference} · {operation.route}</div><h1 className="mt-1 font-display text-2xl font-bold">{section}</h1><p className="mt-1 text-sm text-ink-soft">{campaign.nombre} · {providerLabel}{operation.origin && ` · ${operation.origin}`}</p></div>
    {operation.route === 'Exportación' && <ExportHarvestFlow key={section} operation={operation} section={section} />}
    {operation.route === 'Industria' && section === 'Control de calidad y carga' && <IndustryLoads operationId={operation.id} />}
    {operation.route === 'Industria' && section === 'Generación de guía' && <IndustryGuides operationId={operation.id} />}
  </div>
}

function ExportAnalysisTab({ operation }: { operation: QualityOperation }) {
  const s = useStore()
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const providerExams = s.exams.filter((exam) => exam.providerId === operation.providerId)
  return <div><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-lg font-semibold">Análisis específicos de la operación</h2><FlowBdNote /></div><Button onClick={() => setAnalysisOpen(true)}>+ Registrar análisis</Button></div><TransportProposalField><Table head={[<ProposalHeader>Fecha de muestreo</ProposalHeader>, <ProposalHeader>Tipo</ProposalHeader>, <ProposalHeader>Origen</ProposalHeader>, <ProposalHeader>Resultado y unidad</ProposalHeader>, <ProposalHeader>Observaciones</ProposalHeader>, <ProposalHeader>Documento</ProposalHeader>, 'Acciones']}>{operation.analyses.map((analysis) => <tr key={analysis.id} className="text-ink"><td className="px-4 py-3">{fmtDate(analysis.date)}</td><td className="px-4 py-3">{analysis.type}</td><td className="px-4 py-3">{analysis.origin}</td><td className="px-4 py-3">{analysis.result} {analysis.unit}</td><td className="px-4 py-3">{analysis.observations}</td><td className="px-4 py-3">{analysis.document}</td><td className="px-4 py-3"><Button variant="ghost">Ver / Editar</Button></td></tr>)}{operation.analyses.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm">Sin análisis específicos de esta operación.</td></tr>}</Table></TransportProposalField><div className="mt-5 rounded-xl border border-line bg-surface p-4"><h3 className="font-display font-semibold">Antecedentes del proveedor</h3><p className="mt-1 text-sm text-ink-soft">Estos exámenes pertenecen al proveedor y no se convierten automáticamente en análisis de esta cosecha.</p><div className="mt-3 text-sm">{providerExams.length ? providerExams.map((exam) => <div key={exam.id} className="border-t border-line py-2">{fmtDate(exam.fecha)} · {exam.analisis} · {exam.resultado}</div>) : 'Sin antecedentes.'}</div></div><ExportMtdSummary operation={operation} />{analysisOpen && <QualityAnalysisModal operation={operation} onClose={() => setAnalysisOpen(false)} />}</div>
}

function QualityAnalysisModal({ operation, onClose }: { operation: QualityOperation; onClose: () => void }) {
  const s = useStore()
  const [form, setForm] = useState({ date: '', type: '', origin: operation.origin, result: '', unit: '', observations: '', document: '' })
  return <Modal open onClose={onClose} title="Registrar análisis de operación" footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => { s.updateQualityOperation(operation.id, { analyses: [...operation.analyses, { ...form, id: Math.random().toString(36).slice(2) }] }); s.toast('Análisis registrado'); onClose() }}>Guardar análisis</Button></>}><TransportProposalField><div className="grid gap-4 sm:grid-cols-2"><Field label="Fecha de muestreo"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field><Field label="Tipo de análisis"><Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></Field><Field label="Origen de muestra"><Input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></Field><Field label="Resultado"><Input value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} /></Field><Field label="Unidad"><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field><Field label="Observaciones"><Input value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} /></Field><FileDrop label="Documento" onFile={(name) => setForm({ ...form, document: name ?? '' })} /></div></TransportProposalField></Modal>
}

function ExportOrganizationTab({ operation }: { operation: QualityOperation }) {
  const s = useStore()
  const initial = operation.organization ?? { harvestDate: operation.expectedDate, serviceId: '', crewLead: '', transportConfirmed: false, crewConfirmed: false, arrivalConfirmed: false, trainingCompleted: false, evidence: '', mobility: '', supplies: '' }
  const [form, setForm] = useState(initial)
  return <div><div className="mb-4 flex items-center gap-2"><h2 className="font-display text-lg font-semibold">Organización de cosecha</h2><FlowBdNote /></div><div className="grid gap-4 lg:grid-cols-2"><TransportProposalField><h3 className="mb-3 font-semibold">Programación</h3><div className="grid gap-3"><Field label="Fecha prevista de cosecha"><Input type="date" value={form.harvestDate} onChange={(e) => setForm({ ...form, harvestDate: e.target.value })} /></Field><Field label="Servicio de transporte"><Input value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })} placeholder="Seleccionar servicio registrado" /></Field><Field label="Jefe de cuadrilla"><Input value={form.crewLead} onChange={(e) => setForm({ ...form, crewLead: e.target.value })} /></Field></div></TransportProposalField><TransportProposalField><h3 className="mb-3 font-semibold">Confirmaciones y llegada</h3><div className="grid gap-2">{[['Transportista confirmado', 'transportConfirmed'], ['Cuadrilla confirmada', 'crewConfirmed'], ['Camión y cuadrilla llegaron', 'arrivalConfirmed'], ['Capacitación realizada', 'trainingCompleted']].map(([label, key]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form[key as keyof typeof form] as boolean} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />{label}</label>)}</div><div className="mt-3"><FileDrop label={form.evidence || 'Evidencia de capacitación'} onFile={(name) => setForm({ ...form, evidence: name ?? '' })} /></div></TransportProposalField><TransportProposalField><h3 className="mb-3 font-semibold">Movilidad</h3><TextArea rows={3} value={form.mobility} onChange={(e) => setForm({ ...form, mobility: e.target.value })} /></TransportProposalField><TransportProposalField><h3 className="mb-3 font-semibold">Insumos de apoyo</h3><TextArea rows={3} value={form.supplies} onChange={(e) => setForm({ ...form, supplies: e.target.value })} /></TransportProposalField></div>{operation.transport && <div className="mt-4 rounded-xl border border-line bg-surface p-4"><h3 className="font-semibold">Servicio de transporte consultado</h3><p className="mt-2 text-sm">Servicio {operation.transport.id} · {operation.transport.company} · Vehículo {operation.transport.vehicle} · Chofer {operation.transport.driver}</p></div>}<Button className="mt-4" onClick={() => { s.updateQualityOperation(operation.id, { organization: form, status: 'Programada' }); s.toast('Organización guardada') }}>Guardar organización</Button></div>
}

function ExportHarvestTab({ operation }: { operation: QualityOperation }) {
  const s = useStore()
  const [open, setOpen] = useState(false)
  const total = operation.advances.reduce((sum, item) => sum + item.kilos, 0)
  const progress = operation.estimatedQuantity ? Math.round(total / operation.estimatedQuantity * 100) : 0
  return <div><div className="mb-4 flex justify-between gap-3"><div><h2 className="font-display text-lg font-semibold">Ejecución de cosecha</h2><FlowBdNote /></div><Button onClick={() => setOpen(true)}>+ Registrar avance</Button></div><TransportProposalField><div className="mb-3 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-surface p-3">Objetivo de esta operación: <b>{fmtNum(operation.estimatedQuantity)} kg</b></div><div className="rounded-lg bg-surface p-3">Registrado: <b>{fmtNum(total)} kg</b></div></div><Table head={[<ProposalHeader>Fecha</ProposalHeader>, <ProposalHeader>Kilos cosechados</ProposalHeader>, <ProposalHeader>Número de jabas</ProposalHeader>, <ProposalHeader>Responsable</ProposalHeader>, <ProposalHeader>Observaciones</ProposalHeader>, <ProposalHeader>Evidencia</ProposalHeader>]}>{operation.advances.map((advance) => <tr key={advance.id} className="text-ink"><td className="px-4 py-3">{fmtDate(advance.date)}</td><td className="px-4 py-3">{fmtNum(advance.kilos)} kg</td><td className="px-4 py-3">{advance.crates}</td><td className="px-4 py-3">{advance.responsible}</td><td className="px-4 py-3">{advance.observations}</td><td className="px-4 py-3">{advance.evidence}</td></tr>)}{operation.advances.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-sm">Sin avances registrados.</td></tr>}</Table><p className="mt-3 text-xs">No se convierte número de jabas a peso sin una regla confirmada.</p></TransportProposalField>{open && <HarvestAdvanceModal operation={operation} onClose={() => setOpen(false)} />}</div>
}

function HarvestAdvanceModal({ operation, onClose }: { operation: QualityOperation; onClose: () => void }) {
  const s = useStore()
  const [form, setForm] = useState({ date: '', kilos: '', crates: '', observations: '', evidence: '', responsible: '' })
  return <Modal open onClose={onClose} title="Registrar avance" footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => { const advances = [...operation.advances, { id: Math.random().toString(36).slice(2), date: form.date, kilos: Number(form.kilos) || 0, crates: Number(form.crates) || 0, observations: form.observations, evidence: form.evidence, responsible: form.responsible }]; s.updateQualityOperation(operation.id, { advances, harvestedQuantity: advances.reduce((sum, item) => sum + item.kilos, 0), status: 'En cosecha' }); s.toast('Avance registrado'); onClose() }}>Guardar avance</Button></>}><TransportProposalField><div className="grid gap-4 sm:grid-cols-2"><Field label="Fecha real"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field><Field label="Kilos cosechados"><Input type="number" value={form.kilos} onChange={(e) => setForm({ ...form, kilos: e.target.value })} /></Field><Field label="Número de jabas"><Input type="number" value={form.crates} onChange={(e) => setForm({ ...form, crates: e.target.value })} /></Field><Field label="Responsable"><Input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} /></Field><Field label="Observaciones"><Input value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} /></Field><FileDrop label="Evidencia" onFile={(name) => setForm({ ...form, evidence: name ?? '' })} /></div></TransportProposalField></Modal>
}

function ExportClosureTab({ operation }: { operation: QualityOperation }) {
  const s = useStore()
  const [form, setForm] = useState(operation.closure ?? { endDate: '', report: '', observations: '', staffPaymentRequest: '', mobilityPaymentRequest: '', purchaseRecord: '', guide: '' })
  return <div><div className="mb-4 flex items-center gap-2"><h2 className="font-display text-lg font-semibold">Cierre físico y documentación</h2><FlowBdNote /></div><TransportProposalField><div className="grid gap-4 sm:grid-cols-2"><Field label="Fecha de término"><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field><Field label="Total real cosechado"><Input readOnly value={`${fmtNum(operation.harvestedQuantity)} kg`} /></Field><FileDrop label={form.report || 'Informe final de cosecha'} onFile={(name) => setForm({ ...form, report: name ?? '' })} /><FileDrop label={form.purchaseRecord || 'Registro de compra de fruta'} onFile={(name) => setForm({ ...form, purchaseRecord: name ?? '' })} /><FileDrop label={form.guide || 'Guía de remisión'} onFile={(name) => setForm({ ...form, guide: name ?? '' })} /><Field label="Observaciones"><TextArea rows={2} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} /></Field></div></TransportProposalField><div className="mt-4"><TransportProposalField note="Una solicitud de pago no representa un pago realizado. No se ejecutan pagos reales."><h3 className="mb-3 font-semibold">Documentación y pagos pendientes</h3><div className="grid gap-3 sm:grid-cols-2"><FileDrop label={form.staffPaymentRequest || 'Solicitud de pago de personal'} onFile={(name) => setForm({ ...form, staffPaymentRequest: name ?? '' })} /><FileDrop label={form.mobilityPaymentRequest || 'Solicitud de pago de movilidad'} onFile={(name) => setForm({ ...form, mobilityPaymentRequest: name ?? '' })} /></div></TransportProposalField></div><div className="mt-4 flex gap-2"><Button onClick={() => { s.updateQualityOperation(operation.id, { closure: form, status: 'Cosecha terminada' }); s.toast('Operación de cosecha cerrada; la campaña no fue finalizada') }}>Guardar cierre de operación</Button><Button variant="outline" onClick={() => s.toast('Acceso simulado a Logística y Despacho')}>Ir a Logística y Despacho</Button></div><p className="mt-3 text-sm text-ink-soft">Cerrar esta operación no finaliza automáticamente la campaña.</p></div>
}


function IndustryQualityTab({ operation }: { operation: QualityOperation }) {
  const s = useStore()
  const result = operation.industry?.inspectionResult ?? 'Sin registrar'
  const setResult = (value: 'Cumple' | 'No cumple') => {
    s.updateQualityOperation(operation.id, { industry: { ...operation.industry!, inspectionResult: value, rejectionReason: '' }, status: value === 'Cumple' ? 'Lista para carga' : 'Rechazada' })
    s.toast(value === 'Cumple' ? 'Control de calidad: cumple los requisitos. Ya puedes registrar la carga.' : 'Control de calidad: no cumple los requisitos.')
  }
  const options = [
    { value: 'Cumple' as const, label: 'Sí cumple', hint: 'La fruta pasa a carga', mark: '✓', on: 'border-leaf bg-leaf-50 text-forest ring-2 ring-leaf/30', dot: 'bg-leaf text-white' },
    { value: 'No cumple' as const, label: 'No cumple', hint: 'Queda como recepción rechazada', mark: '✕', on: 'border-danger bg-danger/5 text-danger ring-2 ring-danger/20', dot: 'bg-danger text-white' },
  ]
  return <div className="max-w-2xl">
    <h2 className="font-display text-lg font-semibold">¿La fruta cumple los requisitos?</h2>
    <p className="mt-1 text-sm text-ink-soft">Solo se registra el estado. Si cumple, se habilita el registro de datos de carga.</p>
    <div role="radiogroup" aria-label="¿Cumple los requisitos?" className="mt-4 grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const active = result === option.value
        return <button key={option.value} type="button" role="radio" aria-checked={active} onClick={() => setResult(option.value)} className={`flex items-center gap-4 rounded-2xl border p-5 text-left transition ${active ? option.on : 'border-line bg-surface text-ink hover:border-forest/40'}`}>
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg font-bold ${active ? option.dot : 'bg-canvas text-ink-soft'}`}>{option.mark}</span>
          <span><span className="block font-display text-base font-semibold">{option.label}</span><span className="block text-xs opacity-80">{option.hint}</span></span>
        </button>
      })}
    </div>
    <p className="mt-4 text-sm text-ink-soft">Estado actual: <b className="text-ink">{result === 'Sin registrar' ? 'Sin registrar' : result === 'Cumple' ? 'Cumple los requisitos' : 'No cumple los requisitos'}</b></p>
  </div>
}



function LegacyQualityModule() {
  const s = useStore()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const providerName = (id: string) => { const p = s.providers.find((x) => x.id === id); return p ? `${p.nombres} ${p.apellidos}` : '—' }
  const rows = s.exams.filter((e) => (`${e.analisis} ${e.origen} ${providerName(e.providerId)}`).toLowerCase().includes(q.toLowerCase()))
  return (
    <div>
      <PageHeader title="Gestión de Calidad" subtitle="Análisis y exámenes de laboratorio por productor"
        action={<Button onClick={() => setOpen(true)}>+ Registrar examen</Button>} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Exámenes registrados" value={s.exams.length} tone="leaf" icon="🧪" />
        <Kpi label="Resultados negativos" value={s.exams.filter((e) => e.resultado === 'Negativo').length} tone="plan" icon="✓" />
        <Kpi label="Resultados positivos" value={s.exams.filter((e) => e.resultado === 'Positivo').length} tone="proc" icon="⚠" />
        <Kpi label="Tipos de análisis" value={new Set(s.exams.map((e) => e.analisis)).size} tone="mango" icon="⧉" />
      </div>
      <FilterBar onClear={() => setQ('')}><Field label="Búsqueda"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Análisis / productor / origen…" /></Field></FilterBar>
      <Table head={['Análisis', 'Productor', 'Resultado', 'Fecha', 'Origen', 'Detalles']}>
        {rows.map((e) => (
          <tr key={e.id} className="animate-row hover:bg-leaf-50/40">
            <td className="px-4 py-3 font-medium">{e.analisis}</td>
            <td className="px-4 py-3 text-ink-soft">{providerName(e.providerId)}</td>
            <td className="px-4 py-3"><StatusPill estado={e.resultado === 'Negativo' ? 'Aprobado' : 'Por aprobar'} /></td>
            <td className="px-4 py-3 font-mono text-xs">{fmtDate(e.fecha)}</td>
            <td className="px-4 py-3 text-ink-soft">{e.origen}</td>
            <td className="px-4 py-3 text-xs text-ink-soft">{e.detalles}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-soft">Sin análisis registrados.</td></tr>}
      </Table>
      {open && <QualityExamModal onClose={() => setOpen(false)} />}
    </div>
  )
}

function QualityExamModal({ onClose }: { onClose: () => void }) {
  const s = useStore()
  const [providerName, setProviderName] = useState('')
  const [tipo, setTipo] = useState('')
  const [fecha, setFecha] = useState('')
  const [resultado, setResultado] = useState<'Negativo' | 'Positivo'>('Negativo')
  const [origen, setOrigen] = useState('')
  const [detalles, setDetalles] = useState('')
  return (
    <Modal open onClose={onClose} wide title="Registrar examen"
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => {
          const p = s.providers.find((x) => `${x.nombres} ${x.apellidos}` === providerName)
          if (!p || !tipo) return
          s.addExam({ providerId: p.id, analisis: tipo, resultado, fecha, origen, detalles }); s.toast('Examen registrado'); onClose()
        }}>Guardar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Productor"><SearchableSelect options={s.providers.map((p) => `${p.nombres} ${p.apellidos}`)} value={providerName} onChange={setProviderName} placeholder="Buscar productor…" /></Field>
        <Field label="Tipo de examen"><SearchableSelect options={EXAM_TYPES} value={tipo} onChange={setTipo} placeholder="Buscar tipo…" /></Field>
        <Field label="Fecha"><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Field>
        <Field label="Resultado"><Select value={resultado} onChange={(e) => setResultado(e.target.value as any)}><option>Negativo</option><option>Positivo</option></Select></Field>
        <Field label="Origen"><Input value={origen} onChange={(e) => setOrigen(e.target.value)} /></Field>
        <div className="sm:col-span-2"><Field label="Observaciones / detalles"><TextArea rows={2} value={detalles} onChange={(e) => setDetalles(e.target.value)} /></Field></div>
        <div className="sm:col-span-2"><FileDrop label="Importar archivo" /></div>
      </div>
    </Modal>
  )
}

// ============================================================ LOGISTICS
export function LogisticsModule({driverAccount,onLogout}:{driverAccount?:Extract<DemoAccount,{role:'driver'}>;onLogout?:()=>void}={}) {
  return driverAccount ? <DriverMobile account={driverAccount} onLogout={onLogout||(()=>{})}/> : <div className="logistics-module min-w-0"><AdminLogisticsModule/></div>
}
type MainDispatchStage = 'En carga' | 'Salida de finca' | 'En camino' | 'Llegada' | 'Cierre'

function getDeliveryStageCategory(s: ReturnType<typeof useStore>, d: LogisticsDelivery): MainDispatchStage {
  const c = logisticsContext(s, d)
  if (d.physicalClosed || d.administrativeClosed || c.state === 'Cierre' || String(d.logisticsStatus) === 'Cerrada') return 'Cierre'
  if (c.state === 'Llegada' || d.actualArrival || d.logisticsStatus === 'En recepción') return 'Llegada'
  if (c.state === 'En camino' || (c.state === 'Sin reporte' && d.logisticsStatus === 'En ruta')) return 'En camino'
  if (c.state === 'Salida') return 'Salida de finca'
  return 'En carga'
}

function AdminLogisticsModule() {
  const s = useStore()
  const [campaignFilter, setCampaignFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(() => sessionStorage.getItem('logisticsCampaignFilter') ?? null)
  const [campaignLoadsFilter, setCampaignLoadsFilter] = useState('')
  const [prepareOpen, setPrepareOpen] = useState(false)
  const [screen, setScreen] = useState<{ id: string; mode: 'view' | 'manage'; section?: LogisticsAdminSection } | null>(null)

  const campaignRows = s.campaigns.map(c => {
    const reqKilos = c.reqComercial || s.requirements.filter(r => r.campaignId === c.id).reduce((sum, r) => sum + (Number(r.kilos) || 0), 0)
    const deliveries = s.logisticsDeliveries.filter(d => d.campaignId === c.id)
    const counts = {
      enCarga: deliveries.filter(d => getDeliveryStageCategory(s, d) === 'En carga').length,
      salida: deliveries.filter(d => getDeliveryStageCategory(s, d) === 'Salida de finca').length,
      enCamino: deliveries.filter(d => getDeliveryStageCategory(s, d) === 'En camino').length,
      llegada: deliveries.filter(d => getDeliveryStageCategory(s, d) === 'Llegada').length,
      cierre: deliveries.filter(d => getDeliveryStageCategory(s, d) === 'Cierre').length,
      total: deliveries.length,
    }
    return { campaign: c, reqKilos, deliveries, counts }
  })

  const actions = (d: LogisticsDelivery) => (
    <div className="flex shrink-0 items-center justify-end gap-2 whitespace-nowrap">
      <IconBtn title={'Ver entrega ' + d.reference} onClick={() => setScreen({ id: d.id, mode: 'view' })}>
        <Eye />
      </IconBtn>

    </div>
  )

  if (screen?.mode === 'view') return <LogisticsDeliveryReadOnly deliveryId={screen.id} onBack={() => setScreen(null)} />
  if (screen?.mode === 'manage') return <LogisticsDeliveryManager key={screen.id + '-' + screen.section} deliveryId={screen.id} section={screen.section || 'Recepción y calidad'} onBack={() => setScreen(null)} />

  // --- Vista dedicada por campaña ---
  const selectedCampaign = selectedCampaignId ? s.campaigns.find(c => c.id === selectedCampaignId) : null
  if (selectedCampaign) {
    const deliveries = s.logisticsDeliveries.filter(d => d.campaignId === selectedCampaign.id)
    const reqKilos = selectedCampaign.reqComercial || s.requirements.filter(r => r.campaignId === selectedCampaign.id).reduce((sum, r) => sum + (Number(r.kilos) || 0), 0)
    const counts = {
      enCarga: deliveries.filter(d => getDeliveryStageCategory(s, d) === 'En carga').length,
      salida: deliveries.filter(d => getDeliveryStageCategory(s, d) === 'Salida de finca').length,
      enCamino: deliveries.filter(d => getDeliveryStageCategory(s, d) === 'En camino').length,
      llegada: deliveries.filter(d => getDeliveryStageCategory(s, d) === 'Llegada').length,
      cierre: deliveries.filter(d => getDeliveryStageCategory(s, d) === 'Cierre').length,
    }
    const campaignFilteredDeliveries = deliveries.filter(d => {
      if (!campaignLoadsFilter) return true
      return getDeliveryStageCategory(s, d) === campaignLoadsFilter
    })

    return (
      <div>
        <Button
          variant="ghost"
          className="mb-4 px-0 text-sm font-semibold text-forest hover:text-forest-600"
          onClick={() => {
            setSelectedCampaignId(null)
            sessionStorage.removeItem('logisticsCampaignFilter')
          }}
        >
          ← Volver a campañas
        </Button>

        <PageHeader
          title={`Cargas de ${selectedCampaign.nombre} (${deliveries.length})`}
          subtitle={`${selectedCampaign.fruta} · Temporada ${selectedCampaign.temporada} · Requerimiento comercial: ${fmtNum(reqKilos)} kg`}
          action={
            <div className="flex flex-wrap gap-2">
              
            </div>
          }
        />

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Kilos requeridos" value={`${fmtNum(reqKilos)} kg`} icon="⚖" tone="mango" />
          <Kpi label="En carga" value={String(counts.enCarga)} icon="⏳" tone="proc" />
          <Kpi label="Salida de finca" value={String(counts.salida)} icon="🚜" tone="plan" />
          <Kpi label="En camino" value={String(counts.enCamino)} icon="🚚" tone="plan" />
          <Kpi label="Llegada" value={String(counts.llegada)} icon="🏢" tone="leaf" />
          <Kpi label="Cierre - Completado" value={String(counts.cierre)} icon="✓" tone="leaf" />
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Select
            aria-label="Filtrar por estado del despacho"
            value={campaignLoadsFilter}
            onChange={e => setCampaignLoadsFilter(e.target.value)}
          >
            <option value="">Todos los estados ({deliveries.length})</option>
            <option value="En carga">En carga ({counts.enCarga})</option>
            <option value="Salida de finca">Salida de finca ({counts.salida})</option>
            <option value="En camino">En camino ({counts.enCamino})</option>
            <option value="Llegada">Llegada ({counts.llegada})</option>
            <option value="Cierre">Cierre - Completado ({counts.cierre})</option>
          </Select>
        </div>

        {/* Móvil: lista de cargas */}
        <div className="grid gap-3 md:hidden">
          {campaignFilteredDeliveries.map(d => {
            const c = logisticsContext(s, d)
            const stageCategory = getDeliveryStageCategory(s, d)
            return (
              <article key={d.id} className="rounded-2xl border border-line bg-surface p-4 shadow-sm text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-semibold text-sm">{d.reference}</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    stageCategory === 'Cierre' ? 'bg-leaf-50 text-forest' :
                    stageCategory === 'Llegada' ? 'bg-emerald-50 text-emerald-800' :
                    stageCategory === 'En camino' ? 'bg-indigo-50 text-indigo-800' :
                    stageCategory === 'Salida de finca' ? 'bg-sky-50 text-sky-800' :
                    'bg-amber-50 text-amber-800'
                  }`}>
                    {stageCategory}
                  </span>
                </div>
                <p><span className="text-ink-soft">Cliente: </span><b>{s.clients.find(x => x.id === d.clientId)?.empresa || 'Sin cliente'}</b></p>
                <p><span className="text-ink-soft">Destino: </span>{d.destination}</p>
                <p><span className="text-ink-soft">Camión: </span>{c.vehicle?.placa || 'Sin camión'} · {c.driver?.nombre || 'Sin chofer'}</p>
                <p><span className="text-ink-soft">Kilos: </span><b className="font-mono">{fmtNum(c.kilos)} kg</b></p>
                <p className="text-[11px] text-ink-soft">Último reporte: {c.report ? logisticsDate(c.report.date) : 'Sin reporte'}</p>
                <div className="flex justify-end pt-2 border-t border-line">{actions(d)}</div>
              </article>
            )
          })}
          {!campaignFilteredDeliveries.length && (
            <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-soft">
              {deliveries.length === 0 ? 'Esta campaña no tiene cargas registradas.' : 'Sin cargas para el estado seleccionado.'}
            </p>
          )}
        </div>

        {/* Desktop: tabla de cargas de la campaña (conforme a la captura) */}
        <div className="hidden md:block">
          <Table head={['CARGA', 'CLIENTE / DESTINO', 'CAMIÓN / CHOFER', 'KILOS', 'ESTADO DEL DESPACHO', 'ÚLTIMO REPORTE', 'ACCIONES']}>
            {campaignFilteredDeliveries.map(d => {
              const c = logisticsContext(s, d)
              const stageCategory = getDeliveryStageCategory(s, d)
              return (
                <tr key={d.id} className="hover:bg-canvas/30 transition-colors">
                  <td className="px-4 py-4 font-mono font-medium text-xs text-ink">{d.reference}</td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-ink">{s.clients.find(x => x.id === d.clientId)?.empresa || 'Sin cliente'}</div>
                    <div className="mt-0.5 text-xs text-ink-soft">{d.destination}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-mono text-xs text-ink">{c.vehicle?.placa || 'Sin camión'}</div>
                    <div className="mt-0.5 text-xs text-ink-soft">{c.driver?.nombre || 'Sin chofer'}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-semibold text-ink">{fmtNum(c.kilos)} kg</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                      stageCategory === 'Cierre' ? 'bg-leaf-50 text-forest' :
                      stageCategory === 'Llegada' ? 'bg-emerald-50 text-emerald-800' :
                      stageCategory === 'En camino' ? 'bg-indigo-50 text-indigo-800' :
                      stageCategory === 'Salida de finca' ? 'bg-sky-50 text-sky-800' :
                      'bg-amber-50 text-amber-800'
                    }`}>
                      {stageCategory}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-ink-soft">{c.report ? logisticsDate(c.report.date) : 'Sin reporte'}</td>
                  <td className="px-4 py-4 text-right">{actions(d)}</td>
                </tr>
              )
            })}
            {!campaignFilteredDeliveries.length && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-soft">
                  {deliveries.length === 0 ? 'Esta campaña no tiene cargas registradas.' : 'Sin cargas para el estado seleccionado.'}
                </td>
              </tr>
            )}
          </Table>
        </div>

        {prepareOpen && (
          <PrepareLogisticsDeliveryModal
            onClose={() => setPrepareOpen(false)}
            onSaved={id => {
              setPrepareOpen(false)
              setScreen({ id, mode: 'view' })
            }}
          />
        )}
      </div>
    )
  }

  // --- Vista principal: Tabla de campañas ---
  const filteredRows = campaignRows.filter(row => {
    if (row.counts.total === 0) return false
    if (campaignFilter && row.campaign.id !== campaignFilter) return false
    if (statusFilter) {
      if (statusFilter === 'En carga' && row.counts.enCarga === 0) return false
      if (statusFilter === 'Salida de finca' && row.counts.salida === 0) return false
      if (statusFilter === 'En camino' && row.counts.enCamino === 0) return false
      if (statusFilter === 'Llegada' && row.counts.llegada === 0) return false
      if (statusFilter === 'Cierre' && row.counts.cierre === 0) return false
    }
    return true
  })

  const totalReqKilos = filteredRows.reduce((acc, r) => acc + r.reqKilos, 0)
  const totalEnCarga = filteredRows.reduce((acc, r) => acc + r.counts.enCarga, 0)
  const totalSalida = filteredRows.reduce((acc, r) => acc + r.counts.salida, 0)
  const totalEnCamino = filteredRows.reduce((acc, r) => acc + r.counts.enCamino, 0)
  const totalLlegada = filteredRows.reduce((acc, r) => acc + r.counts.llegada, 0)
  const totalCierre = filteredRows.reduce((acc, r) => acc + r.counts.cierre, 0)

  return (
    <div>
      <PageHeader
        title="Logística y despacho"
        subtitle="Seguimiento de despacho y estado de cargas por campaña"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Kilos requeridos" value={`${fmtNum(totalReqKilos)} kg`} icon="⚖" tone="mango" />
        <Kpi label="En carga" value={String(totalEnCarga)} icon="⏳" tone="proc" />
        <Kpi label="Salida de finca" value={String(totalSalida)} icon="🚜" tone="plan" />
        <Kpi label="En camino" value={String(totalEnCamino)} icon="🚚" tone="plan" />
        <Kpi label="Llegada" value={String(totalLlegada)} icon="🏢" tone="leaf" />
        <Kpi label="Cierre - Completado" value={String(totalCierre)} icon="✓" tone="leaf" />
      </div>

      <details className="logistics-filters mb-5 rounded-2xl border border-line bg-surface p-4" open>
        <summary className="mb-3 cursor-pointer text-sm font-semibold text-forest">Filtrar campañas</summary>
        <FilterBar onClear={() => { setCampaignFilter(''); setStatusFilter(''); sessionStorage.removeItem('logisticsCampaignFilter') }}>
          <Field label="Campaña">
            <Select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)}>
              <option value="">Todas las campañas</option>
              {s.campaigns.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
          </Field>
          <Field label="Estado con cargas">
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="En carga">En carga</option>
              <option value="Salida de finca">Salida de finca</option>
              <option value="En camino">En camino</option>
              <option value="Llegada">Llegada</option>
              <option value="Cierre">Cierre - Completado</option>
            </Select>
          </Field>
        </FilterBar>
      </details>

      {/* Vista móvil: tarjetas de campañas */}
      <div className="grid gap-4 md:hidden" aria-label="Campañas de logística">
        {filteredRows.map(row => (
          <article key={row.campaign.id} className="min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-semibold">{row.campaign.nombre}</h2>
                <p className="text-xs text-ink-soft">{row.campaign.fruta} · {row.campaign.temporada}</p>
              </div>
              <StatusPill estado={row.campaign.estado} />
            </div>

            <div className="mt-4 rounded-xl bg-canvas p-3">
              <p className="text-xs text-ink-soft">Kilos totales (Requerimiento comercial)</p>
              <p className="mt-1 font-mono text-base font-semibold text-forest">{fmtNum(row.reqKilos)} kg</p>
            </div>

            <div className="mt-3 grid grid-cols-5 gap-1.5 text-center text-[11px]">
              <div className="rounded-lg bg-amber-50/80 p-1.5 border border-amber-200/50">
                <span className="block text-[10px] text-amber-900 font-medium leading-tight">En carga</span>
                <b className="mt-1 block font-mono text-xs text-amber-900">{row.counts.enCarga}</b>
              </div>
              <div className="rounded-lg bg-sky-50/80 p-1.5 border border-sky-200/50">
                <span className="block text-[10px] text-sky-900 font-medium leading-tight">Salida</span>
                <b className="mt-1 block font-mono text-xs text-sky-900">{row.counts.salida}</b>
              </div>
              <div className="rounded-lg bg-indigo-50/80 p-1.5 border border-indigo-200/50">
                <span className="block text-[10px] text-indigo-900 font-medium leading-tight">Camino</span>
                <b className="mt-1 block font-mono text-xs text-indigo-900">{row.counts.enCamino}</b>
              </div>
              <div className="rounded-lg bg-emerald-50/80 p-1.5 border border-emerald-200/50">
                <span className="block text-[10px] text-emerald-900 font-medium leading-tight">Llegada</span>
                <b className="mt-1 block font-mono text-xs text-emerald-900">{row.counts.llegada}</b>
              </div>
              <div className="rounded-lg bg-leaf-50/80 p-1.5 border border-leaf/40">
                <span className="block text-[10px] text-forest font-medium leading-tight">Cierre</span>
                <b className="mt-1 block font-mono text-xs text-forest">{row.counts.cierre}</b>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <span className="text-xs text-ink-soft">Total: <b>{row.counts.total}</b> {row.counts.total === 1 ? 'carga' : 'cargas'}</span>
              <Button
                variant="primary"
                className="text-xs py-1.5 px-3 bg-forest text-white"
                onClick={() => setSelectedCampaignId(row.campaign.id)}
              >
                Ingresar a cargas →
              </Button>
            </div>
          </article>
        ))}
        {!filteredRows.length && (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-soft">
            Sin campañas para los filtros seleccionados.
          </p>
        )}
      </div>

      {/* Vista desktop principal de campañas */}
      <div className="hidden md:block">
        <Table head={['Campaña', 'Kilos totales', 'En carga', 'Salida de finca', 'En camino', 'Llegada', 'Cierre - Completado', 'Total cargas', 'Acciones']}>
          {filteredRows.map(row => (
            <tr key={row.campaign.id} className="hover:bg-canvas/40 transition-colors">
              <td className="px-4 py-4">
                <button
                  type="button"
                  className="text-left group cursor-pointer"
                  onClick={() => setSelectedCampaignId(row.campaign.id)}
                >
                  <div className="font-semibold text-ink group-hover:text-forest transition-colors">{row.campaign.nombre}</div>
                </button>
              </td>
              <td className="whitespace-nowrap px-4 py-4">
                <div className="font-mono text-sm font-semibold text-ink">{fmtNum(row.reqKilos)} kg</div>
                <div className="text-[11px] text-ink-soft">Requerimiento comercial</div>
              </td>
              <td className="px-4 py-4 text-center">
                {row.counts.enCarga > 0 ? (
                  <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-amber-50 px-2 py-0.5 font-mono text-xs font-bold text-amber-800 border border-amber-200/60">
                    {row.counts.enCarga}
                  </span>
                ) : (
                  <span className="text-xs text-ink-soft/40">—</span>
                )}
              </td>
              <td className="px-4 py-4 text-center">
                {row.counts.salida > 0 ? (
                  <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-sky-50 px-2 py-0.5 font-mono text-xs font-bold text-sky-800 border border-sky-200/60">
                    {row.counts.salida}
                  </span>
                ) : (
                  <span className="text-xs text-ink-soft/40">—</span>
                )}
              </td>
              <td className="px-4 py-4 text-center">
                {row.counts.enCamino > 0 ? (
                  <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-indigo-50 px-2 py-0.5 font-mono text-xs font-bold text-indigo-800 border border-indigo-200/60">
                    {row.counts.enCamino}
                  </span>
                ) : (
                  <span className="text-xs text-ink-soft/40">—</span>
                )}
              </td>
              <td className="px-4 py-4 text-center">
                {row.counts.llegada > 0 ? (
                  <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800 border border-emerald-200/60">
                    {row.counts.llegada}
                  </span>
                ) : (
                  <span className="text-xs text-ink-soft/40">—</span>
                )}
              </td>
              <td className="px-4 py-4 text-center">
                {row.counts.cierre > 0 ? (
                  <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-leaf-50 px-2 py-0.5 font-mono text-xs font-bold text-forest border border-leaf/40">
                    {row.counts.cierre}
                  </span>
                ) : (
                  <span className="text-xs text-ink-soft/40">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-medium text-ink">
                {row.counts.total} {row.counts.total === 1 ? 'carga' : 'cargas'}
              </td>
              <td className="whitespace-nowrap px-4 py-4">
                <Button
                  variant="primary"
                  className="text-xs py-1.5 px-3 bg-forest text-white"
                  onClick={() => setSelectedCampaignId(row.campaign.id)}
                >
                  Ingresar a cargas ({row.counts.total}) →
                </Button>
              </td>
            </tr>
          ))}
          {!filteredRows.length && (
            <tr>
              <td colSpan={9} className="px-4 py-10 text-center text-sm text-ink-soft">
                Sin campañas para los filtros seleccionados.
              </td>
            </tr>
          )}
        </Table>
      </div>

      {prepareOpen && (
        <PrepareLogisticsDeliveryModal
          onClose={() => setPrepareOpen(false)}
          onSaved={id => {
            setPrepareOpen(false)
            setScreen({ id, mode: 'view' })
          }}
        />
      )}
    </div>
  )
}

function PrepareLogisticsDeliveryModal({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const s = useStore()
  const usedOperations = new Set(s.logisticsDeliveries.map((delivery) => delivery.sourceOperationId))
  const operations = s.qualityOperations.filter((operation) => !usedOperations.has(operation.id) && (operation.loadedQuantity > 0 || operation.status === 'Lista para carga' || operation.status === 'Cosecha terminada'))
  const [operationId, setOperationId] = useState('')
  const [clientId, setClientId] = useState('')
  const [form, setForm] = useState({ destination: '', estimatedArrival: '' })
  const operation = s.qualityOperations.find((item) => item.id === operationId)
  const campaign = s.campaigns.find((item) => item.id === operation?.campaignId)
  const requirements = s.requirements.filter((item) => item.campaignId === operation?.campaignId)
  const duplicate = s.logisticsDeliveries.find((delivery) => delivery.sourceOperationId === operationId)
  return <Modal open onClose={onClose} wide title="Preparar entrega" footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => { if (!operation || duplicate) return; const id = s.addLogisticsDelivery({ reference: `ENT-${Date.now().toString().slice(-6)}`, sourceOperationId: operation.id, campaignId: operation.campaignId, clientId: clientId || undefined, destination: form.destination, logisticsStatus: 'Preparada', estimatedArrival: form.estimatedArrival, windowStart: '', windowEnd: '', actualArrival: '', arrivalObservations: '', coordinationEvidence: '', waitingReason: '', rescheduledAttention: '', purchases: [], accountingStatus: 'Pendiente de revisión', unloading: { start: '', end: '', observations: '', evidence: '' }, evaluation: { originWeight: operation.loadedQuantity || operation.acceptedQuantity || operation.harvestedQuantity, plantWeight: operation.plantQuantity, report: operation.industry?.receivedReport ?? '', observations: '', result: '' }, discard: { quantity: '', unit: '', reason: '', evidence: '' }, crates: { initial: '', returned: '', returnDate: '', evidence: '', coordination: '', vehicleExit: '', carrierCopy: false }, documents: { fruitGuide: operation.transport?.guide ?? operation.industry?.guide ?? operation.closure?.guide ?? '', purchaseDetail: operation.industry?.purchaseRecord ?? operation.closure?.purchaseRecord ?? '', receptionReport: operation.industry?.receivedReport ?? '', discardEvidence: '', crateReturn: '', signedExitGuide: '' }, physicalClosed: false, administrativeClosed: false }); s.toast('Entrega preparada; el camión no fue marcado en ruta'); onSaved(id) }}>Preparar entrega</Button></>}><DataLegend /><div className="mb-3"><FlowBdNote /></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Carga u operación existente"><Select value={operationId} onChange={(e) => { setOperationId(e.target.value); setClientId('') }}><option value="">Seleccionar</option>{operations.map((item) => <option key={item.id} value={item.id}>{item.reference} · {item.route}</option>)}</Select></Field><Field label="Campaña"><Input readOnly value={campaign?.nombre ?? ''} /></Field><Field label="Servicio de transporte"><Input readOnly value={operation?.transport ? `${operation.transport.id} · ${operation.transport.company} · ${operation.transport.vehicle}` : 'Sin servicio vinculado'} /></Field><TransportProposalField><Field label="Cliente relacionado"><Select value={clientId} onChange={(e) => setClientId(e.target.value)}><option value="">Sin cliente</option>{requirements.map((requirement) => <option key={requirement.id} value={requirement.clientId}>{s.clients.find((client) => client.id === requirement.clientId)?.empresa}</option>)}</Select></Field></TransportProposalField><TransportProposalField><Field label="Planta o destino"><Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></Field></TransportProposalField><TransportProposalField><Field label="Llegada estimada"><Input type="datetime-local" value={form.estimatedArrival} onChange={(e) => setForm({ ...form, estimatedArrival: e.target.value })} /></Field></TransportProposalField></div>{duplicate && null}</Modal>
}

function LogisticsDocumentCard({ title, file, source }: { title: string; file?: string; source: string }) {
  const s = useStore()
  return <div className="rounded-xl border border-line bg-surface p-4"><div className="text-xs font-semibold uppercase text-ink-soft">{title}</div><div className="mt-2 text-sm font-medium">{documentName(file) || 'Sin documento'}</div><div className="mt-1 text-xs text-ink-soft">Fuente: {source}</div>{file && <div className="mt-3 flex gap-2"><Button variant="outline" onClick={() => void openStoredDocument(file,false).catch(e=>s.toast(e.message))}>Ver</Button><Button variant="ghost" onClick={() => void openStoredDocument(file,true).catch(e=>s.toast(e.message))}>Descargar</Button></div>}</div>
}

function LogisticsDeliveryManager({deliveryId,section,onBack}:{deliveryId:string;section:LogisticsAdminSection;onBack:()=>void}) {
  const s=useStore()
  const delivery=s.logisticsDeliveries.find(d=>d.id===deliveryId)!
  const source=s.qualityOperations.find(o=>o.id===delivery.sourceOperationId)!
  const c=logisticsContext(s,delivery)
  return <div><Button variant="ghost" className="mb-4 px-0" onClick={onBack}>← Volver a entregas</Button><PageHeader title={section} subtitle={(s.campaigns.find(x=>x.id===delivery.campaignId)?.nombre||'')+' · '+(s.clients.find(x=>x.id===delivery.clientId)?.empresa||'Sin cliente')+' · '+delivery.reference}/><p className="mb-5 text-sm text-ink-soft">Camión: {c.vehicle?.placa||'Sin asignar'} · Chofer: {c.driver?.nombre||'Sin asignar'} · Estado del chofer: {c.state}</p>
    {section==='Compras de la carga'&&<LogisticsPurchasesTab delivery={delivery}/>}
    {section==='Recepción y calidad'&&<LogisticsReceptionTab delivery={delivery} source={source}/>}
    {section==='Jabas y salida'&&<LogisticsCratesTab delivery={delivery}/>}
    {section==='Documentos y cierre'&&<LogisticsClosureTab delivery={delivery}/>}
  </div>
}

function LogisticsArrivalTab({ delivery }: { delivery: LogisticsDelivery }) {
  const s = useStore()
  const [open, setOpen] = useState(false)
  const outside = delivery.actualArrival && delivery.windowStart && delivery.windowEnd && (delivery.actualArrival < delivery.windowStart || delivery.actualArrival > delivery.windowEnd)
  return <div><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><h2 className="font-display text-lg font-semibold">Coordinación y llegada</h2><FlowBdNote /></div><Button onClick={() => setOpen(true)}>{delivery.actualArrival ? 'Editar llegada' : 'Registrar llegada'}</Button></div><TransportProposalField><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Llegada estimada', delivery.estimatedArrival ? new Date(delivery.estimatedArrival).toLocaleString('es-PE') : 'Sin registro'], ['Inicio de atención', delivery.windowStart ? new Date(delivery.windowStart).toLocaleString('es-PE') : 'Sin registro'], ['Fin de atención', delivery.windowEnd ? new Date(delivery.windowEnd).toLocaleString('es-PE') : 'Sin registro'], ['Llegada real', delivery.actualArrival ? new Date(delivery.actualArrival).toLocaleString('es-PE') : 'Sin registro'], ['Observaciones', delivery.arrivalObservations || 'Sin registro'], ['Evidencia', delivery.coordinationEvidence || 'Sin documento']].map(([label, value]) => <div key={label} className="rounded-lg bg-surface p-3"><div className="text-xs font-semibold uppercase">{label}</div><div className="mt-1 text-sm">{value}</div></div>)}</div><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" onClick={() => s.toast('Comunicación simulada al cliente; no se enviaron mensajes')}>Comunicar llegada al cliente</Button><Button variant="outline" onClick={() => s.toast('Comunicación simulada al transportista; no se enviaron mensajes')}>Comunicar ventana al transportista</Button></div></TransportProposalField>{outside && <div className="mt-4"><TransportProposalField ><p className="text-sm">Motivo: {delivery.waitingReason || 'Sin registrar'} · Nueva atención: {delivery.rescheduledAttention ? new Date(delivery.rescheduledAttention).toLocaleString('es-PE') : 'Sin registrar'}.</p><Button className="mt-3" variant="outline" onClick={() => setOpen(true)}>Reprogramar atención <ImprovementNote /></Button><p className="mt-2 text-sm">No se confirma descarga ni recepción mientras el vehículo espera.</p></TransportProposalField></div>}{open && <LogisticsArrivalModal delivery={delivery} onClose={() => setOpen(false)} />}</div>
}

function LogisticsArrivalModal({ delivery, onClose }: { delivery: LogisticsDelivery; onClose: () => void }) {
  const s = useStore()
  const [form, setForm] = useState({ estimated: delivery.estimatedArrival, start: delivery.windowStart, end: delivery.windowEnd, actual: delivery.actualArrival, observations: delivery.arrivalObservations, evidence: delivery.coordinationEvidence, waitingReason: delivery.waitingReason, rescheduled: delivery.rescheduledAttention })
  const outside = form.actual && form.start && form.end && (form.actual < form.start || form.actual > form.end)
  return <Modal open onClose={onClose} wide title="Registrar coordinación y llegada" footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => { s.updateLogisticsDelivery(delivery.id, { estimatedArrival: form.estimated, windowStart: form.start, windowEnd: form.end, actualArrival: form.actual, arrivalObservations: form.observations, coordinationEvidence: form.evidence, waitingReason: form.waitingReason, rescheduledAttention: form.rescheduled, logisticsStatus: outside ? 'En espera' : form.actual ? 'En recepción' : 'En ruta' }); const source = s.qualityOperations.find((operation) => operation.id === delivery.sourceOperationId); if (form.actual && source?.transport) s.updateQualityOperation(source.id, { transport: { ...source.transport, status: 'llegada' } }); s.toast('Llegada guardada y compartida con Transporte'); onClose() }}>Guardar llegada</Button></>}><TransportProposalField><div className="grid gap-4 sm:grid-cols-2"><Field label="Fecha y hora estimada"><Input type="datetime-local" value={form.estimated} onChange={(e) => setForm({ ...form, estimated: e.target.value })} /></Field><Field label="Inicio de ventana de atención"><Input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field><Field label="Fin de ventana de atención"><Input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field><Field label="Fecha y hora real de llegada"><Input type="datetime-local" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} /></Field><Field label="Observaciones"><TextArea rows={2} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} /></Field><FileDrop label={form.evidence || 'Evidencia de coordinación'} onFile={(name) => setForm({ ...form, evidence: name ?? '' })} />{outside && <><Field label="Motivo de espera"><Input value={form.waitingReason} onChange={(e) => setForm({ ...form, waitingReason: e.target.value })} /></Field><Field label="Nueva atención prevista"><Input type="datetime-local" value={form.rescheduled} onChange={(e) => setForm({ ...form, rescheduled: e.target.value })} /></Field></>}</div></TransportProposalField></Modal>
}

function LogisticsPurchasesTab({ delivery }: { delivery: LogisticsDelivery }) {
  const s = useStore()
  const [observationFor, setObservationFor] = useState<string | null>(null)
  const [purchaseObservation,setPurchaseObservation]=useState('')
  return <div><div className="mb-4 flex items-center gap-2"><h2 className="font-display text-lg font-semibold">Compras que viajan en la unidad</h2><FlowBdNote /></div><TransportProposalField ><Table head={[<ProposalHeader>Proveedor participante</ProposalHeader>, <ProposalHeader>Referencia de compra</ProposalHeader>, <ProposalHeader>Fruta</ProposalHeader>, <ProposalHeader>Cantidad registrada</ProposalHeader>, <ProposalHeader>Guía</ProposalHeader>, <ProposalHeader>Soporte</ProposalHeader>, <ProposalHeader>Estado de revisión</ProposalHeader>, 'Acciones']}>{delivery.purchases.map((purchase) => <tr key={purchase.id} className="text-ink"><td className="px-4 py-3">{s.providers.find((provider) => provider.id === purchase.providerId)?.nombres} {s.providers.find((provider) => provider.id === purchase.providerId)?.apellidos}</td><td className="px-4 py-3">{purchase.reference}</td><td className="px-4 py-3">{purchase.fruit}</td><td className="px-4 py-3">{fmtNum(purchase.quantity)}</td><td className="px-4 py-3">{purchase.guide || 'Sin documento'}</td><td className="px-4 py-3">{purchase.document || 'Sin documento'}</td><td className="px-4 py-3">{purchase.reviewStatus}</td><td className="px-4 py-3"><div className="flex gap-1"><Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => {setPurchaseObservation(purchase.observation||'');setObservationFor(purchase.id)}}>Registrar observación</Button></div></td></tr>)}</Table><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" onClick={() => { s.updateLogisticsDelivery(delivery.id, { accountingStatus: 'Compartido con Contabilidad', purchases: delivery.purchases.map((purchase) => ({ ...purchase, reviewStatus: 'Compartido con Contabilidad' })) }); s.toast('Información compartida de forma simulada con Contabilidad') }}>Compartir con Contabilidad</Button><Button variant="ghost" onClick={() => s.toast('Acceso simulado a Facturación')}>Ver facturación relacionada</Button><Button variant="ghost" onClick={() => s.toast('Acceso simulado a Liquidaciones')}>Ver liquidaciones relacionadas</Button></div><p className="mt-3 text-xs">Compartir información no equivale a emitir facturas, registrar depósitos o liquidar compras. No se reparten pesos ni descartes automáticamente entre proveedores.</p></TransportProposalField><div className="mt-4 rounded-lg border border-line bg-surface p-3 text-sm text-ink"><ImprovementNote /> La revisión documental puede continuar durante la atención. Cualquier bloqueo de descarga requiere aprobación.</div>{observationFor && <Modal open onClose={() => setObservationFor(null)} title="Registrar observación de compra" footer={<><Button variant="outline" onClick={() => setObservationFor(null)}>Cancelar</Button><Button onClick={() => {s.updateLogisticsDelivery(delivery.id,{purchases:delivery.purchases.map(p=>p.id===observationFor?{...p,observation:purchaseObservation,reviewStatus:purchaseObservation.trim()?'Observada':'Revisada'}:p)});s.toast('Observación de compra guardada');setObservationFor(null)}}>Guardar observación</Button></>}><TransportProposalField><Field label="Observación"><TextArea rows={3} value={purchaseObservation} onChange={e=>setPurchaseObservation(e.target.value)}/></Field></TransportProposalField></Modal>}</div>
}

export function LogisticsReceptionTab({ delivery, source, onSaved }: { delivery: LogisticsDelivery; source: QualityOperation; onSaved?:()=>void }) {
  const s = useStore()
  const [unloadOpen, setUnloadOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [evaluation, setEvaluation] = useState(delivery.evaluation)
  const difference = evaluation.originWeight && evaluation.plantWeight ? evaluation.originWeight - evaluation.plantWeight : null
  const discardPercent = discardPercentage({...delivery,evaluation})
  return <div><div className="mb-4"><ChangeMark priority="alta" code="H06">La recepción utilizada en una factura conserva su peso y respaldo</ChangeMark></div><div className="grid gap-4 lg:grid-cols-3"><TransportProposalField><h2 className="mb-3 font-display text-lg font-semibold text-ink">A. Descarga</h2><div className="text-sm">{delivery.unloading.start ? `${new Date(delivery.unloading.start).toLocaleString('es-PE')} → ${delivery.unloading.end ? new Date(delivery.unloading.end).toLocaleString('es-PE') : 'En curso'}` : 'Sin descarga registrada'}</div><Button className="mt-3" variant="outline" onClick={() => setUnloadOpen(true)}>Registrar descarga</Button></TransportProposalField><TransportProposalField><h2 className="mb-3 font-display text-lg font-semibold text-ink">B. Evaluación de carga</h2><div className="grid gap-3"><Field label="Peso de origen"><Input readOnly value={evaluation.originWeight || ''} /></Field><Field label="Peso en planta"><Input type="number" value={evaluation.plantWeight || ''} onChange={(e) => setEvaluation({ ...evaluation, plantWeight: Number(e.target.value) || 0 })} /></Field><Field label="Resultado"><Input value={evaluation.result} onChange={(e) => setEvaluation({ ...evaluation, result: e.target.value })} /></Field><Field label="Observaciones"><Input value={evaluation.observations} onChange={(e) => setEvaluation({ ...evaluation, observations: e.target.value })} /></Field><FileDrop label={evaluation.report || 'Informe de evaluación'} onFile={(name) => setEvaluation({ ...evaluation, report: name ?? '' })} /></div><Button className="mt-3" onClick={() => { if(onSaved&&(!Number.isFinite(evaluation.plantWeight)||evaluation.plantWeight<=0||!evaluation.result.trim()||!(evaluation.report||delivery.documents.receptionReport))){s.toast('Completa el peso, resultado y reporte de recepción antes de continuar.');return} s.updateLogisticsDelivery(delivery.id, { evaluation }); if (source.transport) s.updateQualityOperation(source.id, { plantQuantity: evaluation.plantWeight, transport: { ...source.transport, kgPlant: String(evaluation.plantWeight) } }); s.toast('Evaluación guardada. Liquidación actualizada.'); onSaved?.() }}>Guardar evaluación</Button></TransportProposalField><TransportProposalField><h2 className="mb-3 font-display text-lg font-semibold text-ink">C. Descarte</h2><div className="text-sm">{delivery.discard.quantity ? `${delivery.discard.quantity} ${delivery.discard.unit} · ${delivery.discard.reason}` : 'Sin evaluación de descarte'}</div><div className="mt-2 text-sm">Porcentaje: <b>{discardPercent == null ? 'Sin base para calcular' : `${discardPercent.toFixed(2)}% sobre peso original`}</b></div><Button className="mt-3" variant="outline" onClick={() => setDiscardOpen(true)}>Registrar descarte</Button></TransportProposalField></div>{difference != null && <div className="mt-4"><TransportProposalField note="La diferencia de pesos no se considera automáticamente descarte."><p className="text-sm">Peso origen {fmtNum(evaluation.originWeight)} kg − peso planta {fmtNum(evaluation.plantWeight)} kg = <b>{fmtNum(difference)} kg</b>.</p></TransportProposalField></div>}<div className="mt-4 flex gap-2"><Button variant="outline" onClick={() => s.toast('Informe compartido de forma simulada')}>Compartir informe con Cliente, Comercial y Logística <ValidationTag /></Button></div><ProviderReceiptBreakdown key={delivery.id+'-'+delivery.evaluation.plantWeight} delivery={delivery}/>{unloadOpen && <LogisticsUnloadingModal delivery={delivery} onClose={() => setUnloadOpen(false)} />}{discardOpen && <LogisticsDiscardModal delivery={delivery} onClose={() => setDiscardOpen(false)} />}</div>
}

function LogisticsUnloadingModal({ delivery, onClose }: { delivery: LogisticsDelivery; onClose: () => void }) {
  const s = useStore()
  const [form, setForm] = useState(delivery.unloading)
  return <Modal open onClose={onClose} title="Registrar descarga" footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => { s.updateLogisticsDelivery(delivery.id, { unloading: form, logisticsStatus: 'En recepción' }); s.toast('Descarga guardada'); onClose() }}>Guardar descarga</Button></>}><TransportProposalField><div className="grid gap-4"><Field label="Inicio"><Input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field><Field label="Término"><Input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field><Field label="Observaciones"><TextArea rows={2} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} /></Field><FileDrop label={form.evidence || 'Evidencia'} onFile={(name) => setForm({ ...form, evidence: name ?? '' })} /></div></TransportProposalField></Modal>
}

function LogisticsDiscardModal({ delivery, onClose }: { delivery: LogisticsDelivery; onClose: () => void }) {
  const s = useStore()
  const [form, setForm] = useState(delivery.discard)
  return <Modal open onClose={onClose} title="Registrar descarte" footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => { s.updateLogisticsDelivery(delivery.id, { discard: form, documents: { ...delivery.documents, discardEvidence: form.evidence } }); s.toast('Descarte guardado'); onClose() }}>Guardar descarte</Button></>}><TransportProposalField><div className="grid gap-4"><Field label="Cantidad descartada"><Input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field><Field label="Unidad"><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field><Field label="Motivo"><TextArea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field><FileDrop label={form.evidence || 'Documento o evidencia'} onFile={(name) => setForm({ ...form, evidence: name ?? '' })} /></div></TransportProposalField></Modal>
}

function LogisticsCratesTab({ delivery }: { delivery: LogisticsDelivery }) {
  const s = useStore()
  const [open, setOpen] = useState(false)
  const balance = delivery.crates.initial && delivery.crates.returned ? Number(delivery.crates.initial) - Number(delivery.crates.returned) : null
  return <div><div className="mb-4 flex justify-between gap-3"><div><h2 className="font-display text-lg font-semibold">Jabas y salida del vehículo</h2><FlowBdNote /></div><Button onClick={() => setOpen(true)}>Registrar devolución</Button></div><TransportProposalField ><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Jabas que llegaron', delivery.crates.initial || 'Sin información'], ['Jabas devueltas', delivery.crates.returned || 'Sin registro'], ['Saldo pendiente', balance == null ? 'No calculado' : String(balance)], ['Fecha de devolución', delivery.crates.returnDate ? fmtDate(delivery.crates.returnDate) : 'Sin registro'], ['Coordinación', delivery.crates.coordination || 'Sin registro'], ['Salida del vehículo', delivery.crates.vehicleExit ? new Date(delivery.crates.vehicleExit).toLocaleString('es-PE') : 'Sin registro'], ['Copia al transportista', delivery.crates.carrierCopy ? 'Registrada' : 'Pendiente']].map(([label, value]) => <div key={label} className="rounded-lg bg-surface p-3"><div className="text-xs font-semibold uppercase">{label}</div><div className="mt-1 text-sm">{value}</div></div>)}</div>{balance != null && balance > 0 && delivery.crates.vehicleExit && <div className="mt-3 rounded-lg bg-proc-50 p-3 text-sm text-proc">Incidencia: el vehículo salió con {balance} jabas pendientes. La regla que permite esta salida debe validarse.</div>}</TransportProposalField><p className="mt-4 text-sm text-ink-soft">Salida del vehículo, devolución completa de jabas y cierre documental son hechos distintos.</p>{open && <LogisticsCratesModal delivery={delivery} onClose={() => setOpen(false)} />}</div>
}

function LogisticsCratesModal({ delivery, onClose }: { delivery: LogisticsDelivery; onClose: () => void }) {
  const s = useStore()
  const [form, setForm] = useState(delivery.crates)
  return <Modal open onClose={onClose} title="Registrar devolución de jabas y salida" footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => { s.updateLogisticsDelivery(delivery.id, { crates: form, documents: { ...delivery.documents, crateReturn: form.evidence } }); s.toast('Coordinación de jabas guardada'); onClose() }}>Guardar devolución</Button></>}><TransportProposalField><div className="grid gap-4 sm:grid-cols-2"><Field label="Cantidad que llegó"><Input value={form.initial} onChange={(e) => setForm({ ...form, initial: e.target.value })} /></Field><Field label="Cantidad devuelta"><Input value={form.returned} onChange={(e) => setForm({ ...form, returned: e.target.value })} /></Field><Field label="Fecha de devolución"><Input type="date" value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} /></Field><Field label="Coordinación con planta"><Input value={form.coordination} onChange={(e) => setForm({ ...form, coordination: e.target.value })} /></Field><Field label="Salida del vehículo"><Input type="datetime-local" value={form.vehicleExit} onChange={(e) => setForm({ ...form, vehicleExit: e.target.value })} /></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.carrierCopy} onChange={(e) => setForm({ ...form, carrierCopy: e.target.checked })} />Copia entregada al transportista</label><div className="sm:col-span-2"><FileDrop label={form.evidence || 'Constancia o evidencia'} onFile={(name) => setForm({ ...form, evidence: name ?? '' })} /></div></div></TransportProposalField></Modal>
}

function LogisticsClosureTab({ delivery }: { delivery: LogisticsDelivery }) {
  const s = useStore()
  const [documents, setDocuments] = useState(delivery.documents)
  const checklist = [['Llegada registrada', Boolean(delivery.actualArrival)], ['Recepción documentada', Boolean(documents.receptionReport)], ['Evaluación registrada', Boolean(delivery.evaluation.result)], ['Descarte informado o resultado registrado', Boolean(delivery.discard.quantity || delivery.evaluation.result)], ['Compras revisadas', delivery.accountingStatus === 'Verificación registrada'], ['Jabas conciliadas o pendiente identificado', Boolean(delivery.crates.initial)], ['Salida documentada', Boolean(documents.signedExitGuide)]]
  return <div><div className="mb-4"><ChangeMark priority="alta" code="H08">Los cierres exigen recepción, descarga y documentos completos</ChangeMark></div><h2 className="mb-4 font-display text-lg font-semibold">Documentos y cierre</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{([['Guía de remisión de la fruta', 'fruitGuide', 'Transporte'], ['Detalle de compras', 'purchaseDetail', 'Cosecha / Acopio'], ['Informe de recepción/evaluación', 'receptionReport', 'Planta'], ['Evidencia de descarte', 'discardEvidence', 'Recepción'], ['Constancia de devolución de jabas', 'crateReturn', 'Logística'], ['Guía de salida firmada del vehículo', 'signedExitGuide', 'Logística']] as const).map(([title, key, source]) => <div key={key} className="rounded-xl border border-line bg-surface p-4"><div className="text-xs font-semibold uppercase text-ink-soft">{title}</div><div className="mt-2 text-sm">{documentName(documents[key]) || 'Sin documento'}</div><div className="mt-1 text-xs text-ink-soft">Fuente: {source}</div><div className="mt-3 flex flex-wrap gap-2">{documents[key] && <><Button variant="outline" className="px-2 py-1" onClick={() => void openStoredDocument(documents[key],false).catch(e=>s.toast(e.message))}>Ver</Button><Button variant="ghost" className="px-2 py-1" onClick={() => void openStoredDocument(documents[key],true).catch(e=>s.toast(e.message))}>Descargar</Button></>}<FileDrop label={documents[key] ? 'Reemplazar' : 'Adjuntar'} onFile={(name) => setDocuments({ ...documents, [key]: name ?? '' })} /></div></div>)}</div><Button className="mt-4" onClick={() => { s.updateLogisticsDelivery(delivery.id, { documents }); s.toast('Documentos guardados') }}>Guardar documentos</Button><div className="mt-5"><TransportProposalField note="Completa los requisitos antes de registrar cada cierre."><h3 className="mb-3 font-display font-semibold text-ink">Checklist de cierre</h3><div className="grid gap-2">{checklist.map(([label, checked]) => <div key={String(label)} className="flex items-center gap-2 rounded-lg bg-surface p-3 text-sm"><span>{checked ? '✓' : '○'}</span>{label}</div>)}</div></TransportProposalField></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-line bg-surface p-4"><div className="font-semibold">Cierre físico</div><div className="mt-1 text-sm text-ink-soft">{delivery.physicalClosed ? 'Registrado' : 'Pendiente'}</div><Button className="mt-3" variant="outline" onClick={() => { const issue=receptionCloseIssue({...delivery,documents});if(issue){s.toast(issue);return} s.updateLogisticsDelivery(delivery.id, { documents, physicalClosed: true, logisticsStatus: 'Recepción completada' }); s.toast('Cierre físico registrado') }}>Registrar cierre físico</Button></div><div className="rounded-xl border border-line bg-surface p-4 text-ink"><div className="font-semibold   ">Cierre administrativo <ValidationTag /></div><div className="mt-1 text-sm">{delivery.administrativeClosed ? 'Registrado' : 'Pendiente'}</div><Button className="mt-3" variant="outline" onClick={() => { const issue=receptionCloseIssue({...delivery,documents},true);if(issue){s.toast(issue);return} s.updateLogisticsDelivery(delivery.id, { documents, administrativeClosed: true }); s.toast('Cierre administrativo registrado en el prototipo') }}>Registrar cierre administrativo</Button></div></div><p className="mt-4 text-sm text-ink-soft">Cerrar la entrega no finaliza la campaña ni representa pago del cliente o liquidación del proveedor.</p></div>
}

// ============================================================ PAYMENTS
export function PaymentsModule() {
  const s = useStore()
  const [tab, setTab] = useState<'Pendiente' | 'Adelanto' | 'Completado'>('Pendiente')
  const [open, setOpen] = useState(false)
  const [pay, setPay] = useState<string | null>(null)
  const [campFilter, setCampFilter] = useState('')
  const campName = (id: string) => s.campaigns.find((c) => c.id === id)?.nombre ?? '—'
  const pending = s.payments.filter((p) => p.estado !== 'Completado')

  const rows = s.payments.filter((p) => p.estado === tab && (!campFilter || p.campaignId === campFilter))

  return (
    <div>
      <PageHeader title="Gestión de Pagos por Campaña" subtitle="Adelantos, pendientes y pagos completados a transportistas"
        action={<Button onClick={() => setOpen(true)}>+ Registrar pago</Button>} />

      {pending.length > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-proc/30 bg-proc-50 px-4 py-3 text-sm text-proc">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-proc/15">🔔</span>
          <span><b>{pending.length} pago(s) pendiente(s)</b> requieren que adjuntes el comprobante en la fecha acordada.</span>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs tabs={['Pendiente', 'Adelanto', 'Completado']} active={tab} onChange={(t) => setTab(t as any)} />
        <Field label="Campaña">
          <Select value={campFilter} onChange={(e) => setCampFilter(e.target.value)}>
            <option value="">Todas las campañas</option>
            {s.campaigns.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Select>
        </Field>
      </div>

      <Table head={['Código', 'Transportista', 'Campaña', 'Total', 'Pagado', 'Fecha acordada', 'Boleta', 'Acciones']}>
        {rows.map((p) => (
          <tr key={p.id} className="animate-row hover:bg-leaf-50/40">
            <td className="px-4 py-3 font-mono text-xs">{p.codigo}</td>
            <td className="px-4 py-3 font-medium">{p.transportista}</td>
            <td className="px-4 py-3"><span className="rounded bg-mango-50 px-1.5 py-0.5 text-xs font-medium text-clay">{campName(p.campaignId)}</span></td>
            <td className="px-4 py-3 font-mono">${fmtNum(p.total)}</td>
            <td className="px-4 py-3 font-mono text-forest">${fmtNum(p.pagado)}</td>
            <td className="px-4 py-3 font-mono text-xs text-ink-soft">{fmtDate(p.fechaAcordada)}</td>
            <td className="px-4 py-3">{p.boleta ? <span className="text-done">✓ Adjunta</span> : <span className="text-ink-soft">—</span>}</td>
            <td className="px-4 py-3">{p.estado !== 'Completado' && <Button variant="soft" onClick={() => setPay(p.id)}>Registrar pago</Button>}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-ink-soft">Sin pagos en esta categoría.</td></tr>}
      </Table>

      {open && <NewPaymentModal onClose={() => setOpen(false)} />}
      {pay && <RegisterPaymentModal paymentId={pay} onClose={() => setPay(null)} />}
    </div>
  )
}

function NewPaymentModal({ onClose }: { onClose: () => void }) {
  const s = useStore()
  const [transportista, setTransportista] = useState('')
  const [campName, setCampName] = useState('')
  const [tipo, setTipo] = useState<'Adelanto' | 'Completado'>('Adelanto')
  const [total, setTotal] = useState('')
  const [pagado, setPagado] = useState('')
  const [fechaAcordada, setFechaAcordada] = useState('')
  const campMap = Object.fromEntries(s.campaigns.map((c) => [c.nombre, c.id]))
  return (
    <Modal open onClose={onClose} wide title="Registrar pago"
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => {
          if (!transportista) return
          const t = Number(total) || 0
          const pg = tipo === 'Completado' ? t : Number(pagado) || 0
          s.addPayment({
            codigo: '#' + Math.random().toString(36).slice(2, 12).toUpperCase(),
            transportista, campaignId: campMap[campName] ?? s.campaigns[0].id,
            total: t, pagado: pg, fechaAcordada, fechaFinal: tipo === 'Completado' ? new Date().toISOString().slice(0, 10) : '',
            boleta: false, estado: tipo === 'Completado' ? 'Completado' : (pg > 0 ? 'Adelanto' : 'Pendiente'),
          })
          s.toast('Pago registrado'); onClose()
        }}>Confirmar</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Seleccionar transportista"><SearchableSelect options={s.transporters.map((t) => t.empresa)} value={transportista} onChange={setTransportista} placeholder="Buscar…" /></Field>
        <Field label="Seleccionar campaña"><SearchableSelect options={s.campaigns.map((c) => c.nombre)} value={campName} onChange={setCampName} placeholder="Buscar…" /></Field>
        <Field label="Tipo de pago"><Select value={tipo} onChange={(e) => setTipo(e.target.value as any)}><option>Adelanto</option><option value="Completado">Completo</option></Select></Field>
        <Field label="Cantidad total ($)"><Input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="20000" /></Field>
        {tipo === 'Adelanto' && <>
          <Field label="Monto de adelanto ($)"><Input type="number" value={pagado} onChange={(e) => setPagado(e.target.value)} placeholder="10000" /></Field>
          <Field label="Fecha acordada (pago final)"><Input type="date" value={fechaAcordada} onChange={(e) => setFechaAcordada(e.target.value)} /></Field>
        </>}
        <div className="sm:col-span-2"><FileDrop label="Adjuntar boleta / recibo" /></div>
      </div>
    </Modal>
  )
}

function RegisterPaymentModal({ paymentId, onClose }: { paymentId: string; onClose: () => void }) {
  const s = useStore()
  const p = s.payments.find((x) => x.id === paymentId)!
  const restante = p.total - p.pagado
  return (
    <Modal open onClose={onClose} title="Registrar pago"
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => { s.updatePayment(p.id, { pagado: p.total, boleta: true, estado: 'Completado', fechaFinal: new Date().toISOString().slice(0, 10) }); s.toast('Pago completo registrado'); onClose() }}>Confirmar</Button></>}>
      <div className="mb-4 rounded-lg bg-canvas/60 px-3 py-2 font-mono text-xs text-ink-soft">Código de pago: {p.codigo}</div>
      <div className="grid gap-3">
        {p.pagado > 0 && <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"><span className="text-ink-soft">Pago realizado (adelanto)</span><b className="font-mono text-forest">${fmtNum(p.pagado)}</b></div>}
        <div className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"><span className="text-ink-soft">Pago pendiente</span><b className="font-mono text-clay">${fmtNum(restante)}</b></div>
        <FileDrop label="Adjuntar boleta" />
      </div>
    </Modal>
  )
}



