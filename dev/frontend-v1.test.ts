import { campaignCarrierAssignments } from "@/modules/campaigns/api/carrier-assignments";
import { campaignCommands } from '@/modules/campaigns/api/campaign-commands.api';
import { harvestedWeeklyItems } from "@/modules/campaigns/weeklyHarvest.utils";
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { createFutureMockMiddleware } from './future-mock.ts'
import { apiClient } from '@/shared/api/client'
import { refreshFrontendData, getFrontendDataStatus } from '@/frontend-data'
import { operationsContext } from '@/modules/operations/api/operations-context.api'
import { projectQualityData } from '@/modules/quality/api/quality-screen-data'
import { projectBillingData } from '@/modules/billing/api/billing-screen-data'
import { projectSettlementData } from '@/modules/purchase-settlement/api/settlement-screen-data'
import { projectDriverData } from '@/modules/driver-portal/api/driver-screen-data'
import { getProviderLocalData, addFinca, updateFinca } from '@/modules/providers/providerLocalData.store'
import { getCampanas } from '@/modules/campaigns/api/campaign.api'
import { updateCampana, getCampana } from '@/modules/campaigns/api/campaign.api'
import { registerBillingCollection } from '@/modules/billing/billing.store'
import { registerProviderPayment } from '@/modules/purchase-settlement/purchaseSettlement.store'
import { addQualityCampaign, getQualityCampaigns } from '@/modules/quality/quality.store'
import { saveQualityDeliveryReview } from '@/modules/quality/qualityOperations.store'
import { cerrarCampanaV1 } from '@/modules/campaigns/api/future-actions.api'
import { providerScreenV1 } from '@/modules/providers/api/v1-screen.api'
import { providerOperationalSummary } from '@/modules/providers/api/provider-screen-data'
import { weeklyCampaignItems } from '@/modules/campaigns/api/weekly-screen-data'
import { createGuideDraft } from '@/modules/quality/remissionGuide.utils'
import { annualBeforeSettlement } from '@/modules/purchase-settlement/settlementUit.utils'
import { clientOperationalSummary } from '@/modules/commercial-planning/api/client-summary'
import { logisticsCommands } from '@/modules/logistics/api/logistics-commands.api'
import { projectLogisticsData } from '@/modules/logistics/api/logistics-screen-data'
import { qualityCommands } from '@/modules/quality/api/quality-commands.api'
import { requestPasswordRecovery, getUserById } from '@/modules/auth/api/auth.api'
import { quotationCommands, projectCarrierData } from '@/modules/carriers/api/quotation-commands.api'

let server: Server
let originalBase: string | undefined
const requested: string[] = []

beforeEach(async () => {
  vi.stubEnv('VITE_API_CONTRACT', 'v1')
  requested.length = 0
  const middleware = createFutureMockMiddleware(path.resolve(import.meta.dirname, '..'))
  server = createServer((request, response) => {
    requested.push(request.url ?? '')
    middleware(request, response, () => { response.statusCode = 418; response.end('Unversioned request rejected') })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  originalBase = apiClient.defaults.baseURL
  apiClient.defaults.baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mock-api/`
  await refreshFrontendData()
})
afterEach(async () => {
  apiClient.defaults.baseURL = originalBase
  vi.unstubAllEnvs()
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
})

describe('existing frontend with the future HTTP contract', () => {
  it('prefills guide identities from the assigned carrier and driver, without demo snapshots', () => {
    const g = operationsContext(), load = projectQualityData(g).loads.find(l => l.id === '1')!
    const draft = createGuideDraft(load)
    expect(draft.proveedoresIncluidos).toEqual(['1', '2'])
    expect(draft.transportistaRuc).toBe(g.carriers[0].ruc)
    expect(draft.conductorNombres).toBe(g.drivers[0].nombre)
    expect(draft.conductorNumeroDoc).toBe(g.people.find(p => p.personaId === g.drivers[0].personaId)?.numeroDocumento)
    expect(draft.normasSeleccionadas).toEqual([])
    expect(draft.numeroGuia).toBe('')
    expect(draft.direccionPartida).toBe('')
  })

  it('saves a guide draft with actual provider IDs and reads it back', async () => {
    const load = projectQualityData(operationsContext()).loads.find(l => l.id === '1')!
    const draft = { ...createGuideDraft(load), ...load.guiasRemision[0], numeroGuia: 'QA-REGRESSION', estado: 'Lista para generar' as const }
    await qualityCommands.guide(load.id, draft)
    expect(projectQualityData(operationsContext()).loads.find(l => l.id === '1')?.guiasRemision[0].numeroGuia).toBe('QA-REGRESSION')
  })

  it('keeps annual totals once, replaces the edited settlement, and isolates each client summary', () => {
    const g = operationsContext(), entry = projectSettlementData(g)[0].proveedores[0]
    expect(entry.personasVinculadas.find(p => p.id === entry.personaLiquidadaId)?.acumuladoAnualPen).toBe(1160)
    expect(annualBeforeSettlement(entry, entry.personaLiquidadaId, 2026)).toBe(0)
    expect(annualBeforeSettlement(entry, entry.personaLiquidadaId, 2025)).toBe(0)
    expect(annualBeforeSettlement({ ...entry, fechaLiquidacion: '2025-10-29' }, entry.personaLiquidadaId, 2026)).toBe(1160)
    expect(clientOperationalSummary(999, g)).toEqual({ activeCampaigns: 0, contracts: 0 })
    expect(clientOperationalSummary(1, g).contracts).toBe(2)
    expect(providerOperationalSummary(1, g).campaigns.map(c => c.id)).toEqual([1, 2])
    expect(providerOperationalSummary(999, g).campaigns).toEqual([])
    expect(campaignCarrierAssignments(999, 1, g)).toBe('Sin camión ni chofer asignados')
    expect(campaignCarrierAssignments(1, 1, g)).toContain(g.vehicles[0].placa)
  })

  it('distinguishes coordinated deliveries from loads and does not invent MTD observations', () => {
    const g = operationsContext(), loads = projectQualityData(g).loads
    expect(loads.filter(l => l.cargaId !== undefined)).toHaveLength(g.loads.length)
    expect(loads[0].mtdRegistros[0]).toMatchObject({ capturas: null, trampas: null, diasExposicion: null, mtdCalculado: 0.01 })
    expect(projectDriverData(g).loads[0].fincas.map(f => f.kilosEstimados)).toEqual([600, 400])
    const multiOrigin = structuredClone(g)
    multiOrigin.loadOrigins = []
    const origin = multiOrigin.deliveryOrigins[0]
    multiOrigin.deliveryOrigins.push({ ...origin, fincaId: 2, origenEntregaId: 999 })
    expect(projectDriverData(multiOrigin).loads[0].fincas.filter(f => f.id === '1')[0].kilosEstimados).toBeNull()
  })

  it('persists an editable certificate total independently of covered producer estimates', async () => {
    const certificate = operationsContext().certificates[0]
    const coverage = operationsContext().coverage.find(c => c.certificadoId === certificate.certificadoId)!
    await campaignCommands.certificate(certificate.campaniaId, { tipo: certificate.tipoCertificacion ?? 'Global GAP', nombre: certificate.nombre, organismoEmisor: certificate.organismo ?? 'QA', validoDesde: '', validoHasta: '', costo: String(certificate.costo), moneda: 'PEN', kilosIniciales: '777.125', productores: [String(coverage.cxpId)], observaciones: '' }, [{ id: String(coverage.cxpId), nombre: 'QA' }], {}, certificate.certificadoId)
    expect(operationsContext().certificates[0].kilosIniciales).toBe(777.125)
  })

  it('shows real kilos on the actual load date and excludes future coordinated deliveries', () => {
    const loads = projectQualityData(operationsContext()).loads
    loads[0].fechaCargaReal = '2026-11-02'
    const rows = harvestedWeeklyItems(loads, 1)
    expect(rows.every(r => r.fecha === '2026-11-02')).toBe(true)
    expect(rows.reduce((sum, r) => sum + r.kilosVariedad, 0)).toBe(1000)
    expect(new Set(rows.map(r => r.loadId)).size).toBe(1)
    const otherClient = { ...loads[0], id: 'qa-2', cliente: 'Otro cliente', proveedoresCarga: loads[0].proveedoresCarga.map(p => ({ ...p, kilosCargados: p.kilosCargados / 2 })) }
    const all = harvestedWeeklyItems([...loads, otherClient], 1)
    expect(new Set(all.map(r => r.cliente)).size).toBe(2)
    expect(all.reduce((sum, r) => sum + r.kilosVariedad, 0)).toBe(1500)
  })

  it('updates unloading details without rewriting settled purchase evidence', async () => {
    const g = operationsContext(), before = structuredClone(g.receipts[0].compras)
    const row = projectLogisticsData(g)[0]
    await logisticsCommands.receive(row.id, { ...row.recepcion, inicioDescarga: '2026-10-29T08:00', terminoDescarga: '2026-10-29T09:00', responsableRecepcion: 'QA' }, row.proveedores)
    expect(operationsContext().receipts[0].compras).toEqual(before)
    expect(operationsContext().receipts[0].descargaFinAt).toBeTruthy()
    const reloaded = projectLogisticsData(operationsContext())[0].recepcion
    expect(new Date(reloaded.inicioDescarga).toISOString()).toBe(operationsContext().receipts[0].descargaInicioAt)
    expect(new Date(reloaded.terminoDescarga).toISOString()).toBe(operationsContext().receipts[0].descargaFinAt)
  })

  it('hydrates every operational screen from the same V1 scenario without legacy requests', async () => {
    expect(getFrontendDataStatus().phase).toBe('ready')
    expect(await getCampanas()).toHaveLength(3)
    expect(getProviderLocalData().fincas[1][0].fincaId).toBe(1)
    expect(providerOperationalSummary(1)).toMatchObject({ kilosRecibidos: 580, mtd: 0.01 })
    expect(weeklyCampaignItems(1).map(row => row.kilosVariedad)).toEqual([1000, 500])
    expect(weeklyCampaignItems(2).map(row => row.kilosVariedad)).toEqual([5000])
    const graph = operationsContext()
    const quality = projectQualityData(graph)
    expect(quality.loads).toHaveLength(2)
    expect(quality.loads.find(row => row.id === '1')?.proveedoresCarga.map(p => p.kilosCargados)).toEqual([600, 400])
    const draft = quality.loads.find(row => row.id === 'entrega-2')!
    expect(draft.proveedoresCarga.length).toBeGreaterThan(0)
    expect(draft.proveedoresCarga.every(p => p.kilosCargados === 0)).toBe(true)
    const settlements = projectSettlementData(graph)
    expect(settlements[0].proveedores[0]).toMatchObject({ kilosCargados: 600, kilosReconocidos: 580, total: 1160 })
    const billing = projectBillingData(graph)
    expect(billing[0].cargas[0].facturas).toHaveLength(2)
    expect(billing[0].cargas[0].facturas[0]).toMatchObject({ total: 1495, estado: 'Cobrado parcial' })
    const drivers = projectDriverData(graph)
    expect(drivers.loads[0].destinoLatitud).toBeNull()
    expect(requested.every(url => url.startsWith('/mock-api/api/'))).toBe(true)
  })

  it('saves and reloads farms through the existing frontend store, preserving server identifiers', async () => {
    const source = getProviderLocalData().fincas[1][0]
    await addFinca(1, { ...source, nombre: 'Finca de integración', fincaId: undefined })
    const added = getProviderLocalData().fincas[1].find(f => f.nombre === 'Finca de integración')!
    expect(added.fincaId).toBeGreaterThan(2)
    const index = getProviderLocalData().fincas[1].indexOf(added)
    await updateFinca(1, index, { ...added, haCultivo: 1.5 })
    await refreshFrontendData()
    expect(getProviderLocalData().fincas[1].find(f => f.fincaId === added.fincaId)?.haCultivo).toBe(1.5)
    expect(requested.some(url => url.startsWith('/mock-api/api/proveedores/1/fincas'))).toBe(true)
  })

  it('persists multiple farms with different varieties for a provider and restores them after refresh', async () => {
    const source = getProviderLocalData().fincas[1][0]
    const g = operationsContext()
    const varieties = g.varieties.slice(0, 2)
    for (const [idx, v] of varieties.entries()) {
      const fruitName = g.fruits.find(f => f.frutaId === v.frutaId)!.name
      await addFinca(1, { ...source, nombre: `Finca variedad ${idx + 1}`, fincaId: undefined, cultivos: [{ fruta: fruitName, variedades: [v.name] }] })
    }
    await refreshFrontendData()
    const savedNames = getProviderLocalData().fincas[1]
      .filter(f => f.nombre.startsWith('Finca variedad '))
      .flatMap(f => f.cultivos.flatMap(c => c.variedades))
      .sort()
    expect(savedNames).toEqual(varieties.map(v => v.name).sort())
  })

  it('preserves leading zeros when the actual provider adapter writes data', async () => {
    const provider = await providerScreenV1.get(1)
    await providerScreenV1.update(1, { ...provider, tipoDocumento: 'DNI', nmrDocumento: '04000001', telefono: '090012345', identidadDocUrl: '', estadoSanidadAgraria: '', identidadDocArchivo: null, frutas: [] })
    expect((await providerScreenV1.get(1)).telefono).toBe('090012345')
  })

  it('does not apply rejected collections or payments to frontend state', async () => {
    const collection = { fecha: '2026-10-29', importe: 9999, medio: 'Transferencia' as const, referencia: 'INTEGRACION', evidencia: null, observaciones: '' }
    await expect(registerBillingCollection('1', '1', '1', collection)).rejects.toMatchObject({ statusCode: 409 })
    expect(operationsContext().collections).toHaveLength(1)
    await registerBillingCollection('1', '1', '1', { ...collection, importe: 100 })
    expect(projectBillingData(operationsContext())[0].cargas[0].facturas[0].cobros).toHaveLength(2)
    const payment = { ...collection, modo: 'Caja' as const }
    await expect(registerProviderPayment('1', '1', payment)).rejects.toMatchObject({ statusCode: 409 })
    expect(operationsContext().providerPayments).toHaveLength(1)
    await registerProviderPayment('1', '1', { ...payment, importe: 100 })
    await refreshFrontendData()
    expect(operationsContext().providerPayments).toHaveLength(2)
  })

  it('persists quality scope and review for a coordinated delivery before its load exists', async () => {
    await addQualityCampaign({ campaniaId: 2, nombre: 'Palta', fruta: 'Palta', fechaInicio: '', fechaFin: '', estado: 'planificacion', scope: 'industria' })
    expect(getQualityCampaigns().find(c => c.campaniaId === 2)?.scope).toContain('industria')
    await saveQualityDeliveryReview('entrega-2', { estadoRevision: 'Observada', mtdRegistros: [], analisisLaboratorio: [] })
    expect(projectQualityData(operationsContext()).loads.find(l => l.id === 'entrega-2')?.estadoRevision).toBe('Observada')
  })

  it('saves a new laboratory analysis against its actual participation and farm', async () => {
    await saveQualityDeliveryReview('entrega-2', { estadoRevision: 'Observada', mtdRegistros: [], analisisLaboratorio: [{ id: 'lab-new', origin: { cxpId: 1, fincaId: 1 }, tipoAnalisis: 'Materia seca', fechaMuestreo: '2026-10-29', identificacionMuestra: '', etapa: '', resultado: 'No apto', observaciones: 'Muestra de integración', archivo: null }] })
    expect(operationsContext().analyses.find(a => a.observaciones === 'Muestra de integración')).toMatchObject({ cxpId: 1, fincaId: 1, estado: 'NO_APTO' })
    expect(projectQualityData(operationsContext()).analyses.find(a => a.observaciones === 'Muestra de integración')?.estadoResultado).toBe('no_conforme')
  })

  it('keeps campaign season and notes when editing through the frontend adapter', async () => {
    await updateCampana(2, { temporada: '2026–2027', observaciones: 'Contrato V1' })
    expect(await getCampana(2)).toMatchObject({ temporada: '2026–2027', observaciones: 'Contrato V1' })
  })

  it('surfaces failed loading and campaign closure without inventing success', async () => {
    await expect(cerrarCampanaV1(1, 'Prueba con pendientes')).rejects.toMatchObject({ code: 'CAMPAIGN_PENDING' })
    const valid = apiClient.defaults.baseURL
    apiClient.defaults.baseURL = `${valid}missing/`
    await expect(refreshFrontendData()).rejects.toBeDefined()
    expect(getFrontendDataStatus().error).not.toBe('')
    apiClient.defaults.baseURL = valid
    await refreshFrontendData()
    expect(getFrontendDataStatus()).toMatchObject({ phase: 'ready', error: '' })
    expect(operationsContext().campaigns.find(c => c.campaniaId === 1)?.estado).toBe('en proceso')
  })

  it('recovers password by email and resolves user details by id', async () => {
    const recovered = await requestPasswordRecovery('persona5@example.com')
    expect(recovered.message).toContain('contraseña temporal')
    await expect(requestPasswordRecovery('noexiste@epe.local')).rejects.toMatchObject({ statusCode: 404 })
    const user = await getUserById(1)
    expect(user).toMatchObject({ usuarioId: 1, usuario: 'admin-demo', nombres: 'Administrador', apellidos: 'Demo' })
  })

  it('sends transport requirement with local file attachment and registers quotation in USD', async () => {
    const carrier = operationsContext().carriers[0]
    const file = new File(['requerimiento pdf'], 'req-transporte.pdf', { type: 'application/pdf' })
    await quotationCommands.send({
      campaniaId: 1,
      referencia: 'SOL-QA-1',
      origen: 'Piura',
      destino: 'Lima',
      mensaje: 'Necesitamos 2 unidades refrigeradas',
      carrierIds: [carrier.idEmpresaTransporteExterno],
      documento: file,
    })
    const createdReq = projectCarrierData(operationsContext()).quotations.find(q => q.codigo === 'SOL-QA-1')!
    expect(createdReq).toBeDefined()
    expect(createdReq.documentoRequerimiento?.name).toBeTruthy()
    await quotationCommands.respond(createdReq.id, {
      estado: 'Recibida',
      montoCotizadoPen: 2850,
      moneda: 'USD',
      documentoCotizacion: null,
      observaciones: 'Incluye seguro de carga',
    })
    const updatedReq = projectCarrierData(operationsContext()).quotations.find(q => q.id === createdReq.id)!
    expect(updatedReq).toMatchObject({ montoCotizadoPen: 2850, moneda: 'USD', estado: 'Recibida' })
  })
})
