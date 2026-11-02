import { useState } from 'react'
import { useStore, type QualityOperation } from './store'
import { Modal, Button, Field, Select, fmtDate, fmtNum } from './ui'

export function deliveryContext(s: ReturnType<typeof useStore>, source?: QualityOperation['sourceDelivery']) {
  const requirement = s.requirements.find(r => r.id === source?.requirementId)
  const contract = requirement?.contratos?.find(c => c.id === source?.contractId)
  const delivery = contract?.entregas.find(d => d.id === source?.deliveryId)
  const link = s.campaignTransporters.find(l => l.id === delivery?.transportLinkId)
  const transporter = s.transporters.find(t => t.id === link?.transporterId)
  const producer = s.providers.find(p => p.id === delivery?.providerId)
  const providers = delivery?.providers || (delivery?.providerId ? [{ providerId: delivery.providerId, fincaIds: delivery.fincaId ? [delivery.fincaId] : [] }] : [])
  return { requirement, contract, delivery, link, transporter, producer, providers }
}

export function IndustryDeliverySummary({ operation }: { operation: Pick<QualityOperation, 'sourceDelivery'> }) {
  const s = useStore(); const { requirement, contract, delivery: d, transporter: t, producer: p, providers } = deliveryContext(s, operation.sourceDelivery)
  if (!d) return <p className="mb-4 text-sm text-ink-soft">La entrega vinculada ya no está disponible.</p>
  const fields = [['Cliente / contrato', `${s.clients.find(c => c.id === requirement?.clientId)?.empresa || '—'} · ${contract?.contrato || '—'}`], ['Proveedores / fincas', providers.map(entry => { const provider = s.providers.find(p => p.id === entry.providerId); return `${provider?.nombres || ''} ${provider?.apellidos || ''} · ${provider?.fincas?.filter(f => entry.fincaIds.includes(f.id)).map(f => f.nombre).join(', ') || '—'}` }).join(' / ')], ['Transportista / camión / chofer', `${t?.empresa || '—'} · ${t?.vehiculos.find(v => v.id === d.vehicleId)?.placa || '—'} · ${t?.choferes.find(c => c.id === d.driverId)?.nombre || '—'}`], ['Viaje programado', `${fmtDate(d.start || d.fecha)} → ${fmtDate(d.end || d.fecha)}`], ['Origen / destino', `${d.origin || '—'} → ${d.destino}`], ['Cantidad programada', `${fmtNum(d.kilos)} kg`], ['Condiciones de carga', d.conditions || 'Sin condiciones'], ['Fruta / variedades solicitadas', `${requirement?.fruta || ''} · ${requirement?.variedad || 'Sin definir'}`]]
  return <section className="mb-5 rounded-xl border border-line bg-canvas p-4"><h3 className="mb-3 font-semibold">Datos de la entrega · Consulta</h3><div className="grid gap-3 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label}><div className="text-xs text-ink-soft">{label}</div><div className="text-sm">{value}</div></div>)}</div><p className="mt-3 text-xs text-ink-soft">Estos datos vienen de la entrega. Aquí se completa únicamente la información propia de cosecha, calidad y carga real.</p></section>
}

export function IndustryDeliveryStart({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const s = useStore(); const [campaignId, setCampaignId] = useState(''); const [error, setError] = useState('')
  const save = () => {
    if (!campaignId) { setError('Selecciona una campaña en proceso.'); return }
    const id = s.addQualityOperation({ reference: `IND-${Date.now().toString().slice(-6)}`, campaignId, route: 'Industria', providerId: '', origin: '', expectedDate: '', status: 'En control', estimatedQuantity: 0, harvestedQuantity: 0, acceptedQuantity: 0, loadedQuantity: 0, plantQuantity: 0, observations: '', analyses: [], advances: [], industry: { requestedVolume: '', collectionCenter: '', receptionDate: '', inspectionDate: '', inspectionResult: 'Sin registrar', inspectionObservations: '', inspectionEvidence: '', rejectionReason: '', vehicleInspection: '', nonConformities: '', corrections: '', loadReport: '', purchaseRecord: '', guide: '', departureDate: '', arrivalDate: '', receivedReport: '' } })
    s.toast('Control de Industria registrado por campaña'); onSaved(id)
  }
  return <Modal open wide title="Registrar control de calidad · Industria" onClose={onClose} footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save}>Continuar al control de calidad</Button></>}><Field label="Campaña en proceso"><Select aria-label="Campaña de Industria" value={campaignId} onChange={e => { setCampaignId(e.target.value); setError('') }}><option value="">Seleccionar campaña</option>{s.campaigns.filter(c => c.estado === 'En Proceso').map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Select></Field><p className="mt-3 text-sm text-ink-soft">La entrega se selecciona al registrar los datos de carga. Sus proveedores, fincas y transporte se recuperarán automáticamente.</p>{error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}</Modal>
}
