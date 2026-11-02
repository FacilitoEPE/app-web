import { useState } from 'react'
import { useStore } from './store'
import { FinancialDocumentView, FinancialLedger } from './finance'
import { type PurchaseSettlement, money, paidTotal, settlementTotal } from './finance-model'
import { Button, PageHeader, StatusPill, Table, fmtDate, fmtNum } from './ui'

const amount = (value: number, currency: string) => `${currency === 'PEN' ? 'S/' : currency} ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function TransporterCampaignDetail({ linkId, onBack }: { linkId: string; onBack: () => void }) {
  const s = useStore()
  const [viewId, setViewId] = useState('')
  const [ledgerId, setLedgerId] = useState('')
  const link = s.campaignTransporters.find(item => item.id === linkId)
  const company = s.transporters.find(item => item.id === link?.transporterId)
  const campaign = s.campaigns.find(item => item.id === link?.campaignId)
  const paid = (document: PurchaseSettlement) => paidTotal(s.financialMovements, 'Pago', document.id)
  const view = s.settlements.find(document => document.id === viewId)

  if (ledgerId) return <FinancialLedger kind="Pago" documentId={ledgerId} onBack={() => setLedgerId('')} />
  if (!link || !company || !campaign) return <div><Button variant="ghost" onClick={onBack}>← Volver a pagados de la campaña</Button><p className="mt-4 text-sm text-ink-soft">El transportista ya no está disponible en esta campaña.</p></div>

  // Keep the campaign's original load numbers, even if another carrier has intervening loads.
  const loads = s.campaignTransporters.filter(item => item.campaignId === campaign.id)
    .flatMap(item => item.services.filter(service => service.annotation).map(service => ({ link: item, service })))
    .map((item, index) => ({ ...item, number: index + 1 }))
    .filter(item => item.link.transporterId === company.id)
    .map(item => ({ ...item, documents: s.settlements.filter(document => document.transportLinkId === item.link.id && document.transportServiceId === item.service.id) }))
  const documents = loads.flatMap(item => item.documents)

  return <div>
    <Button variant="ghost" className="mb-4 px-0" onClick={onBack}>← Volver a pagados de la campaña</Button>
    <PageHeader title={company.empresa} subtitle={`${campaign.nombre} · Liquidaciones y pagos del transportista por carga.`} />

    <section className="mb-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">Información general</h2>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['Transportista', company.empresa],
          [company.ruc ? 'RUC' : 'Documento de identidad', company.ruc || company.documentoIdentidad || 'Sin registrar'],
          ['Campaña', campaign.nombre],
          ['Teléfono', company.numero || 'Sin registrar'],
          ['Correo', company.correo || 'Sin registrar'],
          ['Ubicación', [company.departamento, company.provincia, company.ciudad].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(' · ') || 'Sin registrar'],
        ].map(([label, value]) => <div key={label}><dt className="text-xs text-ink-soft">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>)}
      </dl>
      <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-canvas p-4">
        <div><p className="text-xs text-ink-soft">Cargas registradas</p><b className="mt-1 block text-lg">{loads.length}</b></div>
        <div><p className="text-xs text-ink-soft">Liquidaciones</p><b className="mt-1 block text-lg">{documents.length}</b></div>
        <div><p className="text-xs text-ink-soft">Liquidaciones pagadas</p><b className="mt-1 block text-lg text-forest">{documents.filter(document => settlementTotal(document) > 0 && paid(document) >= settlementTotal(document)).length}</b></div>
      </div>
    </section>

    <h2 className="text-lg font-semibold">Cargas del transportista</h2>
    <p className="mb-4 mt-1 text-sm text-ink-soft">Pulsa una carga para ver su liquidación y sus pagos; vuelve a pulsarla para ocultarlos.</p>
    <div className="space-y-3">{loads.map(({ link: loadLink, service, number, documents: loadDocuments }) => {
      const driver = company.choferes.find(item => item.id === service.driverId)
      const vehicle = company.vehiculos.find(item => item.id === service.vehicleId)
      const requirement = s.requirements.find(item => item.id === service.sourceDelivery?.requirementId)
      const client = s.clients.find(item => item.id === requirement?.clientId)
      const status = !loadDocuments.length ? 'Por liquidar' : loadDocuments.every(document => money(settlementTotal(document) - paid(document)) <= 0) ? 'Pagado' : loadDocuments.some(document => paid(document) > 0) ? 'Parcial' : 'Pendiente'
      return <details key={`${loadLink.id}:${service.id}`} className="group rounded-2xl border border-line bg-surface">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
          <div><h3 className="font-semibold">Carga {number}</h3><p className="mt-1 text-xs text-ink-soft">{fmtDate(service.annotation?.loadDate || service.start)} · {vehicle?.placa || 'Sin camión asignado'} · {driver?.nombre || 'Sin chofer asignado'}</p></div>
          <div className="flex items-center gap-3"><StatusPill estado={status} /><span aria-hidden="true" className="text-lg text-forest transition-transform group-open:rotate-180">⌄</span></div>
        </summary>
        <div className="border-t border-line p-4 sm:p-5">
          <dl className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Cliente / destino', client?.empresa || service.destination || 'Sin registrar'],
              ['Origen', service.origin || 'Sin registrar'],
              ['Destino', service.destination || 'Sin registrar'],
              ['Chofer', driver?.nombre || 'Sin asignar'],
              ['Camión', vehicle?.placa || 'Sin asignar'],
              ['Kilos cargados', `${fmtNum(service.annotation?.kilos || 0)} kg`],
            ].map(([label, value]) => <div key={label}><dt className="text-xs text-ink-soft">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>)}
          </dl>

          {loadDocuments.map(document => {
            const movements = s.financialMovements.filter(item => item.kind === 'Pago' && item.documentId === document.id).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
            return <article key={document.id} className="mb-4 rounded-xl border border-line p-4 last:mb-0">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-semibold">Liquidación {document.number}</h4><p className="mt-1 text-xs text-ink-soft">{fmtDate(document.date)}</p></div><Button variant="outline" onClick={() => setViewId(document.id)}>Ver documento</Button></div>
              <dl className="grid gap-3 rounded-xl bg-canvas p-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['Flete liquidado', amount(money(document.kilos * document.price), document.currency)],
                  ['Gastos liquidados', amount(document.additions, document.currency)],
                  ['Deducciones', amount(document.deductions, document.currency)],
                  ['Total liquidado', amount(settlementTotal(document), document.currency)],
                  ['Pagado', amount(paid(document), document.currency)],
                  ['Saldo pendiente', amount(Math.max(0, money(settlementTotal(document) - paid(document))), document.currency)],
                ].map(([label, value]) => <div key={label}><dt className="text-xs text-ink-soft">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>)}
              </dl>
              {!!document.transportExpenses?.length && <div className="mt-4"><h5 className="text-sm font-semibold">Detalle de gastos liquidados</h5>{document.transportExpenses.map(expense => <p key={expense.id} className="mt-2 text-sm text-ink-soft">{expense.concept}: {amount(expense.amount, expense.currency)}{expense.currency !== document.currency && ` × ${expense.rate} = ${amount(money(expense.amount * expense.rate), document.currency)}`}{expense.included ? ' · Incluido en el flete' : ' · Adicional al flete'}</p>)}</div>}
              {document.adjustmentReason && <p className="mt-3 text-sm"><b>Motivo de ajustes:</b> {document.adjustmentReason}</p>}
              {document.notes && <p className="mt-3 text-sm"><b>Observaciones:</b> {document.notes}</p>}
              <h5 className="mb-3 mt-5 text-sm font-semibold">Pagos registrados ({movements.length})</h5>
              {movements.length ? <><Table head={['Fecha', 'Importe', 'Medio', 'Referencia', 'Comprobante']}>{movements.map(movement => <tr key={movement.id}><td className="p-3">{fmtDate(movement.date)}</td><td className="whitespace-nowrap p-3">{amount(movement.amount, document.currency)}</td><td className="p-3">{movement.method}</td><td className="break-all p-3 text-xs">{movement.reference || 'Sin referencia'}</td><td className="break-words p-3 text-xs">{movement.evidence || 'Sin comprobante adjunto'}</td></tr>)}</Table><Button variant="outline" className="mt-3" onClick={() => setLedgerId(document.id)}>Ver historial y comprobantes</Button></> : <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-soft">Esta carga todavía no tiene pagos registrados.</p>}
            </article>
          })}
          {!loadDocuments.length && <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-soft">Esta carga todavía no tiene una liquidación de transporte registrada.</p>}
          {service.freightObservation && <p className="mt-4 text-sm text-ink-soft"><b>Observación del flete:</b> {service.freightObservation}</p>}
        </div>
      </details>
    })}</div>
    {!loads.length && <p className="rounded-xl border border-dashed border-line p-5 text-sm text-ink-soft">Este transportista no tiene cargas registradas en esta campaña.</p>}
    {view && <FinancialDocumentView kind="Pago" document={view} onClose={() => setViewId('')} />}
  </div>
}

