import { campaignCarrierAssignments } from "@/modules/campaigns/api/carrier-assignments";
import { campaignCommands } from '@/modules/campaigns/api/campaign-commands.api';
import { harvestedWeeklyItems } from "@/modules/campaigns/weeklyHarvest.utils";
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { createV1MockMiddleware } from './v1-mock.ts'
import { apiClient } from '@/shared/api/client'
import { refreshFrontendData, getFrontendDataStatus } from '@/frontend-data'
import { operationsContext } from '@/modules/operations/api/operations-context.api'
import { projectQualityData } from '@/modules/quality/api/quality-screen-data'
import { projectBillingData } from '@/modules/billing/api/billing-screen-data'
import { projectSettlementData } from '@/modules/purchase-settlement/api/settlement-screen-data'
import { projectDriverData } from '@/modules/driver-portal/api/driver-screen-data'
import { getProviderLocalData, addFinca, updateFinca } from '@/modules/providers/providerLocalData.store'
import { createCampana, getCampana, getCampanas, updateCampana } from '@/modules/campaigns/api/campaign.api'
import { registerBillingCollection } from '@/modules/billing/billing.store'
import { registerProviderPayment } from '@/modules/purchase-settlement/purchaseSettlement.store'
import { addQualityCampaign, getQualityCampaigns } from '@/modules/quality/quality.store'
import { saveQualityDeliveryReview } from '@/modules/quality/qualityOperations.store'
import { cerrarCampanaV1 } from '@/modules/campaigns/api/v1-actions.api'
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
import { empresaTransporteExternoV1 } from '@/modules/carriers/api/v1.api'
import { createDriver, getCarrier, updateDriver } from '@/modules/carriers/api/carrier.api'
import { projectCampaignData } from '@/modules/campaigns/api/campaign-screen-data'
import { getLinkedCampaignIds } from '@/modules/campaigns/api/cliente-negocio-campana.api'
import { groupCarrierQuotations } from '@/modules/carriers/carrierQuotations.utils'

let server: Server
let originalBase: string | undefined
const requested: string[] = []

beforeEach(async () => {
  vi.stubEnv('VITE_API_CONTRACT', 'v1')
  requested.length = 0
  const middleware = createV1MockMiddleware(path.resolve(import.meta.dirname, '..'))
  server = createServer((request, response) => {
    requested.push(request.url ?? '')
    middleware(request, response, () => { response.statusCode = 418; response.end('Unversioned request rejected') })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  originalBase = apiClient.defaults.baseURL
  apiClient.defaults.baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mock-api/`
  await refreshFrontendData('*')
})
afterEach(async () => {
  apiClient.defaults.baseURL = originalBase
  vi.unstubAllEnvs()
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
})

describe('existing frontend with the V1 HTTP contract', () => {
  it('recupera el documento y la licencia después de registrar y editar un chofer', async () => {
    const driver = await createDriver(1, {
      nombre: 'Chofer QA', telefono: '900000011', correo: 'chofer-qa@example.com',
      tipoDocumento: 'DNI', numeroDocumento: '00123456', numeroLicencia: 'Q000123456',
    })
    await updateDriver(driver.id, { numeroDocumento: '00123457' })
    expect((await getCarrier(1)).choferes.find(row => row.id === driver.id)).toMatchObject({
      tipoDocumento: 'DNI', numeroDocumento: '00123457', numeroLicencia: 'Q000123456',
    })
  })

  it('recupera la evidencia del pago y el adjunto de un transportista en borrador', async () => {
    const certificate = operationsContext().certificates[0]
    const evidence = new File(['%PDF-pago'], 'pago.pdf', { type: 'application/pdf' })
    const quote = new File(['%PDF-cotizacion'], 'cotizacion.pdf', { type: 'application/pdf' })
    await campaignCommands.certificatePayment(certificate.campaniaId, certificate.certificadoId, { fecha: '2026-11-08', monto: '1', referencia: 'QA' }, evidence)
    const carrier = await campaignCommands.linkCarrier(2, 1, quote)
    await refreshFrontendData()
    const projected = projectCampaignData(operationsContext())
    expect(projected.certificates[certificate.campaniaId].find(row => row.id === certificate.certificadoId)?.pagos)
      .toContainEqual(expect.objectContaining({ evidencia: expect.objectContaining({ name: 'pago.pdf' }) }))
    expect(projected.carriers[2].find(row => row.id === carrier.acuerdoTransporteId))
      .toMatchObject({ acuerdo: null, cotizacion: { name: 'cotizacion.pdf' } })
  })

  it('vincula un cliente con su ficha y recupera la variedad solicitada', async () => {
    await refreshFrontendData('/campaigns/1/clients')
    const ficha = new File(['%PDF-ficha'], 'ficha.pdf', { type: 'application/pdf' })
    await campaignCommands.linkClient(1, {
      clienteNegocioId: '3', cantidadKg: '500', fechaRegistro: '2026-10-20',
      variedades: ['1'], destinoSolicitado: 'Planta QA',
      entregaDesde: '2026-10-25', entregaHasta: '2026-10-27', observaciones: '',
    }, ficha)
    await refreshFrontendData('/campaigns/1/clients')
    const graph = operationsContext()
    const saved = graph.requirements.find(row => row.destinoSolicitado === 'Planta QA')
    expect(saved?.fichaTecnicaUrl).toMatch(/^data:application\/pdf/)
    expect(graph.requirementVarieties).toContainEqual(expect.objectContaining({
      clienteNegocioCampanaId: saved?.clienteNegocioCampanaId, frutaDerivadaId: 1,
    }))
    await refreshFrontendData('/planificacion-comercial')
    await expect(getLinkedCampaignIds(3, [1, 2])).resolves.toEqual(new Set([1, 2]))
  })

  it('carga las entregas, variedades y placas en la ruta del programa semanal', async () => {
    await refreshFrontendData('/campaigns/1/weekly-delivery-program')
    const rows = weeklyCampaignItems(1)
    const graph = operationsContext()
    expect(rows.map(row => row.kilosVariedad)).toEqual([1000, 500, 600, 900])
    expect(rows).toContainEqual(expect.objectContaining({
      cliente: graph.clients[0].nombreEmpresa, placa: graph.vehicles[0].placa,
    }))
    expect(graph.loads).toHaveLength(0)
  })

  it('shows assigned deliveries before the driver registers their loads', () => {
    const g = structuredClone(operationsContext())
    g.loads = []
    g.loadProviders = []
    const data = projectDriverData(g)
    expect(data.loads).toHaveLength(g.coordinations.length)
    expect(data.loads.every(load => load.pendienteRegistro && load.id.startsWith('entrega-'))).toBe(true)
    for (const load of data.loads) {
      const coordination = g.coordinations.find(item => item.entregaProgramadaId === Number(load.id.slice('entrega-'.length)))!
      expect(load.driverId).toBe(String(coordination.idChoferTransporteExterno))
      expect(load.proveedores.length).toBeGreaterThan(0)
      expect(load.historial).toEqual([])
      expect(load.proveedores.every(provider => provider.kilosCargados === 0)).toBe(true)
    }
  })
  it('locks driver load editing after departure, guide issue, rejection or campaign completion', () => {
    const source = operationsContext()
    const load = source.loads[0]
    const coordination = source.coordinations.find(item => item.coordinacionEntregaId === load.coordinacionEntregaId)!
    const context = structuredClone(source)
    context.histories = [{ ...context.histories[0], coordinacionEntregaId: coordination.coordinacionEntregaId, estado: 'SALIDA', fechaHora: '2026-11-05T12:00:00Z' }]
    expect(projectDriverData(context).loads.find(item => item.id === String(load.cargaId))?.permiteEditarCarga).toBe(false)
    context.histories = []
    context.guides = context.guides.map(guide => ({ ...guide, emitidaAt: '2026-11-05T12:00:00Z' }))
    expect(projectDriverData(context).loads.find(item => item.id === String(load.cargaId))?.permiteEditarCarga).toBe(false)
    context.guides = []
    context.harvests = context.harvests.map(harvest => ({ ...harvest, industria: { ...harvest.industria, inspectionResult: 'No cumple' } }))
    expect(projectDriverData(context).loads.find(item => item.id === String(load.cargaId))?.rechazada).toBe(true)
    expect(projectDriverData(context).loads.find(item => item.id === String(load.cargaId))?.permiteEditarCarga).toBe(false)
    context.campaigns = context.campaigns.map(campaign => ({ ...campaign, estado: 'terminado' }))
    expect(projectDriverData(context).loads.every(item => !item.permiteEditarCarga)).toBe(true)
  })
  it('sums each client contract at its own price and keeps currencies separate', () => {
    const g = structuredClone(operationsContext())
    const contract = g.contracts[0]
    g.contracts.push({ ...contract, contratoVentaId: 999, kilosAcordados: 100, precioKg: 3, moneda: 'USD' })
    const client = projectBillingData(g).find(item => item.id === String(contract.clienteNegocioCampanaId))!
    const expected = g.contracts.filter(item => item.clienteNegocioCampanaId === contract.clienteNegocioCampanaId && item.moneda === 'USD').reduce((sum, item) => sum + item.kilosAcordados * item.precioKg, 0)
    expect(client.importesContratados.find(row => row.moneda === 'USD')?.importe).toBe(expected)
  })
  it('prefills carrier and driver identity while leaving guide providers for the user to choose', () => {
    const g = operationsContext(), load = projectQualityData(g).loads.find(l => l.id === '1')!
    const draft = createGuideDraft(load)
    expect(draft.proveedoresIncluidos).toEqual([])
    expect(draft.transportistaRuc).toBe(g.carriers[0].ruc)
    expect(draft.transportistaMtc).toBe(g.carriers[0].registroMtc)
    expect(draft.conductorNombres).toBe(g.people.find(p => p.personaId === g.drivers[0].personaId)?.nombres)
    expect(draft.conductorApellidos).toBe(g.people.find(p => p.personaId === g.drivers[0].personaId)?.apellidos)
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
    expect(projectDriverData(g).loads.find(load => load.id === String(g.loads[0].cargaId))!.fincas.map(f => f.kilosEstimados)).toEqual([600, 400])
    const multiOrigin = structuredClone(g)
    multiOrigin.loadOrigins = []
    const origin = multiOrigin.deliveryOrigins[0]
    multiOrigin.deliveryOrigins.push({ ...origin, fincaId: 2, origenEntregaId: 999 })
    expect(projectDriverData(multiOrigin).loads.find(load => load.id === String(multiOrigin.loads[0].cargaId))!.fincas.filter(f => f.id === '1')[0].kilosEstimados).toBeNull()
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
    await logisticsCommands.unloading(row.id, { inicioDescarga: '2026-10-29T08:00', terminoDescarga: '2026-10-29T09:00', responsableRecepcion: 'QA', observacionesDescarga: '', evidenciaDescarga: null })
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
    expect(weeklyCampaignItems(1).map(row => row.kilosVariedad)).toEqual([1000, 500, 600, 900])
    expect(weeklyCampaignItems(2).map(row => row.kilosVariedad)).toEqual([5000])
    const graph = operationsContext()
    expect(graph.deliveries.filter(row => [4, 5].includes(row.entregaProgramadaId))).toHaveLength(2)
    expect(graph.coordinations.some(row => [4, 5].includes(row.entregaProgramadaId))).toBe(false)
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

  it('saves the free-text responsible name and returns it when reopening the campaign', async () => {
    const saved = await createCampana({
      nombre: 'Campaña de prueba',
      frutaId: 4,
      fechaInicio: new Date(2027, 0, 1),
      fechaFin: new Date(2027, 5, 30),
      estado: 'planificacion',
      requerimientoComercial: '100',
      responsableUsuarioId: 1,
      responsableNombre: '  Lucía Torres  ',
    })
    expect(await getCampana(saved.campaniaId)).toMatchObject({
      responsableNombre: 'Lucía Torres',
      responsableUsuarioId: 1,
    })

    await updateCampana(saved.campaniaId, { observaciones: 'Datos actualizados' })
    expect(await getCampana(saved.campaniaId)).toMatchObject({ responsableNombre: 'Lucía Torres' })
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

  it('groups two recipients under one transport request and records each quotation separately', async () => {
    const [carrier, otherCarrier] = operationsContext().carriers
    await empresaTransporteExternoV1.update(otherCarrier.idEmpresaTransporteExterno, { correo: 'segundo@example.com' })
    await refreshFrontendData()
    const file = new File(['requerimiento pdf'], 'req-transporte.pdf', { type: 'application/pdf' })
    await quotationCommands.send({
      campaniaId: 1,
      referencia: 'SOL-QA-1',
      origen: 'Piura',
      destino: 'Lima',
      mensaje: 'Necesitamos 2 unidades refrigeradas',
      carrierIds: [carrier.idEmpresaTransporteExterno, otherCarrier.idEmpresaTransporteExterno],
      documento: file,
    })
    const requestGroups = () => groupCarrierQuotations(projectCarrierData(operationsContext()).quotations)
      .filter(group => group.request.codigo === 'SOL-QA-1')
    expect(requestGroups()).toHaveLength(1)
    const [group] = requestGroups()
    expect(group.request.documentoRequerimiento?.name).toBe('req-transporte.pdf')
    expect(group.recipients.map(recipient => recipient.carrierId)).toEqual([
      carrier.idEmpresaTransporteExterno, otherCarrier.idEmpresaTransporteExterno,
    ])
    await quotationCommands.respond(group.recipients[0].id, {
      estado: 'Recibida',
      montoCotizadoPen: 2850,
      moneda: 'USD',
      documentoCotizacion: null,
      observaciones: 'Incluye seguro de carga',
    })
    expect(requestGroups()).toMatchObject([{
      receivedCount: 1,
      recipients: [
        { carrierId: carrier.idEmpresaTransporteExterno, montoCotizadoPen: 2850, moneda: 'USD', estado: 'Recibida' },
        { carrierId: otherCarrier.idEmpresaTransporteExterno, montoCotizadoPen: null, estado: 'En espera' },
      ],
    }])
  })
})
