import { useState } from 'react'
import { campaignCloseChecks, incompleteCampaignReceipts } from './campaign-lifecycle'
import { useStore } from './store'
import { ChangeMark } from './review-changes'
import { Button, Modal, Field, TextArea } from './ui'

export function CampaignHistoryNotice({ campaignId }: { campaignId?: string }) {
  const s = useStore(), missing = incompleteCampaignReceipts(s, campaignId)
  if (!missing.length) return null
  return <aside className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-ink" aria-label="Documentación anterior pendiente">
    <ChangeMark priority="media" code="H13">Recepciones con respaldo incompleto</ChangeMark>
    <p className="mt-2">{missing.length} documentos tienen recepción sin peso, resultado o reporte completo en Logística. Sus facturas y cobros se conservan; no confirman por sí solos la recepción.</p>
    <details className="mt-2"><summary className="cursor-pointer font-semibold">Ver documentos que requieren revisión</summary><ul className="mt-2 list-inside list-disc">{missing.map(i => <li key={i.id}>{i.electronicInvoice?.number || i.number}</li>)}</ul></details>
    <p className="mt-2 text-xs">En campañas abiertas, completa los respaldos originales desde Logística. Los históricos cerrados se conservan para revisión. No se rellenan pesos a partir de las facturas.</p>
  </aside>
}

export function CampaignClosureCard({ campaignId }: { campaignId: string }) {
  const s = useStore(), campaign = s.campaigns.find(c => c.id === campaignId)!
  const [open, setOpen] = useState(false), [reason, setReason] = useState(''), [error, setError] = useState('')
  const checks = campaignCloseChecks(s, campaignId), pending = checks.filter(c => c.pending)
  const close = () => {
    if (reason.trim().length < 10) { setError('Escribe un motivo de cierre de al menos 10 caracteres.'); return }
    if (pending.length) { setError('Completa los pendientes antes de finalizar.'); return }
    s.updateCampaign(campaignId, { estado: 'Finalizado', cierre: { at: new Date().toISOString(), motivo: reason.trim() } })
    setOpen(false)
  }
  return <section className="mb-6 rounded-xl border border-blue-200 bg-white p-5" aria-label="Cierre de campaña">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-lg font-semibold">Cierre de campaña</h2><div className="mt-2"><ChangeMark priority="media" code="H12">Cierre manual y protección del historial</ChangeMark><div className="mt-2"><ChangeMark priority="alta" code="R01">El chofer debe cerrar todos sus despachos antes de finalizar</ChangeMark></div></div></div>
      {campaign.estado === 'En Proceso' && <Button variant="outline" onClick={() => setOpen(true)}>Revisar cierre de campaña</Button>}
    </div>
    {campaign.estado === 'Finalizado' ? <div className="mt-3 text-sm"><p>Campaña finalizada. Su historial operativo y financiero es de consulta.</p>{campaign.cierre ? <><p className="mt-2">Fecha de cierre: {new Date(campaign.cierre.at).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</p><p className="mt-1">Motivo: {campaign.cierre.motivo}</p></> : <p className="mt-2 text-ink-soft">Cierre anterior: este registro no incluye fecha ni motivo de cierre. Se conserva sin completar esos datos automáticamente.</p>}</div>
    : <p className="mt-3 text-sm text-ink-soft">{campaign.estado === 'Planificado' ? 'El cierre estará disponible cuando la campaña esté en proceso.' : 'Antes de finalizar se revisan contratos, viajes, documentación, facturación, liquidaciones y saldos. La fecha de fin no cierra automáticamente la campaña.'}</p>}
    {open && <Modal open wide title={`Revisar cierre — ${campaign.nombre}`} onClose={() => setOpen(false)} footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={!!pending.length || reason.trim().length < 10} onClick={close}>Confirmar cierre de campaña</Button></>}>
      <div className="mb-3"><ChangeMark priority="media" code="H12">Validación del cierre de campaña</ChangeMark><div className="mt-2"><ChangeMark priority="alta" code="R01">Se comprueba el cierre del despacho del chofer</ChangeMark></div></div><p className="mb-4 text-sm">El cierre finaliza la campaña y protege su historial. No registra pagos ni altera pesos o documentos. El servidor vuelve a comprobar los pendientes al guardar.</p>
      <ul className="space-y-2">{checks.map(c => <li key={c.label} className={`rounded-lg border p-3 text-sm ${c.pending ? 'border-amber-200 bg-amber-50' : 'border-line bg-leaf-50'}`}><b>{c.pending ? `Pendiente (${c.pending})` : 'Completo'} · {c.label}</b><p className="mt-1 text-xs text-ink-soft">{c.detail}</p></li>)}</ul>
      {pending.length > 0 && <p role="alert" className="my-4 text-sm text-danger">La campaña tiene pendientes. Completa los puntos indicados; no se cerrará con obligaciones sin resolver.</p>}
      <div className="mt-4"><Field label="Motivo o resumen del cierre"><TextArea value={reason} onChange={e => setReason(e.target.value)} placeholder="Resume cómo concluyó la campaña…" rows={3} /></Field></div>{error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </Modal>}
  </section>
}

export function ClosedCampaignNotice({ campaignId }: { campaignId: string }) {
  const s = useStore()
  if (!s.campaigns.some(c => c.id === campaignId && c.estado === 'Finalizado')) return null
  return <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-ink"><ChangeMark priority="media" code="H12">Campaña finalizada · Consulta del historial</ChangeMark><p className="mt-2">Los importes, documentos y pendientes anteriores se conservan. Esta campaña no admite nuevas operaciones; sus saldos no se ponen a cero al cerrarla.</p></div>
}
