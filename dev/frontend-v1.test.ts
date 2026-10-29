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
  it('hydrates every operational screen from the same V1 scenario without legacy requests', async () => {
    expect(getFrontendDataStatus().phase).toBe('ready')
    expect(await getCampanas()).toHaveLength(3)
    expect(getProviderLocalData().fincas[1][0].fincaId).toBe(1)
    expect(providerOperationalSummary(1)).toMatchObject({ kilosRecibidos: 580, mtd: 0.01 })
    expect(weeklyCampaignItems(1).map(row => row.kilosVariedad)).toEqual([1000, 500])
    expect(weeklyCampaignItems(2)).toEqual([])
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
    expect(requested.every(url => url.startsWith('/mock-api/v1/'))).toBe(true)
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
    expect(requested.some(url => url.startsWith('/mock-api/v1/proveedores/1/fincas'))).toBe(true)
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
})
