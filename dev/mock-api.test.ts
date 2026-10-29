import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { createMockMiddleware, mockApiPlugin } from './mock-api.ts'
import { apiClient } from '@/shared/api/client'
import { getCampanas, getCampana, createCampana, deleteCampana } from '@/modules/campaigns/api/campaign.api'
import { getCampaniaProveedoresByCampania } from '@/modules/campaigns/api/campania-proveedor.api'
import { getClientesNegocioCampana } from '@/modules/campaigns/api/cliente-negocio-campana.api'
import { getClienteNegocioContratos } from '@/modules/clients/api/cliente-negocio-contratos.api'
import { getCarrier, createVehicle, updateVehicle, deleteVehicle } from '@/modules/carriers/api/carrier.api'

const directory = path.resolve(import.meta.dirname, '../json')
let server: Server
let origin: string
let originalBaseUrl: string | undefined

beforeEach(async () => {
  const middleware = createMockMiddleware(directory)
  server = createServer((request, response) => middleware(request, response, () => {
    response.statusCode = 418
    response.end('outside mock API')
  }))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  originalBaseUrl = apiClient.defaults.baseURL
  apiClient.defaults.baseURL = `${origin}/mock-api/`
})

afterEach(async () => {
  apiClient.defaults.baseURL = originalBaseUrl
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
})

describe('JSON mock API through the existing frontend services', () => {
  it('maps campaigns, providers, clients and contract summaries with consistent relations', async () => {
    const campaigns = await getCampanas()
    expect(campaigns.length).toBeGreaterThan(3)
    const campaign = await getCampana(1)
    expect(campaign.fruta?.name).toBe('Mango')
    expect(campaign.fechaInicio).toBeInstanceOf(Date)
    const providers = await getCampaniaProveedoresByCampania(1)
    expect(providers[0].proveedor?.proveedorId).toBe(providers[0].proveedorId)
    const clients = await getClientesNegocioCampana(1)
    expect(clients[0].clienteNegocio?.nombreEmpresa).toBe('Exportadora Andina SAC')
    const summary = await getClienteNegocioContratos(1)
    expect(summary.contratos.some(item => item.nombreCampania === campaign.nombre)).toBe(true)
    expect(summary.clienteNegocio.clienteNegocioId).toBe(1)
  })

  it('supports create and delete without changing JSON seeds or reusing deleted IDs', async () => {
    const initialCount = (await getCampanas()).length
    const input = {
      nombre: 'Campaña de prueba', frutaId: 1, fechaInicio: new Date(2024, 0, 1),
      fechaFin: new Date(2024, 5, 30), estado: 'terminado' as const, requerimientoComercial: '25000',
    }
    const created = await createCampana(input)
    expect(created.fruta?.name).toBe('Mango')
    expect(created.requerimientoComercial).toBe(25000)
    expect((await getCampanas()).length).toBe(initialCount + 1)
    await deleteCampana(created.campaniaId)
    await expect(getCampana(created.campaniaId)).rejects.toMatchObject({ statusCode: 404 })
    const next = await createCampana(input)
    expect(next.campaniaId).toBeGreaterThan(created.campaniaId)
    // A fresh server always starts from disk; neither mutation changed the seed.
    const fresh = createMockMiddleware(directory)
    expect(fresh).toBeTypeOf('function')
    expect((await import('node:fs')).readFileSync(path.join(directory, 'campanas.json'), 'utf8')).not.toContain('Campaña de prueba')
  })

  it('reflects child mutations and updated names in subsequent relation responses', async () => {
    const input = { placa: 'XYZ-999', volumen: 20, ancho: 2, altura: 2, profundidad: 5, pesoNeto: 4000, pesoBruto: 10000 }
    const vehicle = await createVehicle(1, input)
    expect((await getCarrier(1)).vehiculos.some(item => item.id === vehicle.id)).toBe(true)
    await updateVehicle(vehicle.id, 1, { ...input, placa: 'XYZ-998' })
    expect((await getCarrier(1)).vehiculos.find(item => item.id === vehicle.id)?.placa).toBe('XYZ-998')
    await deleteVehicle(vehicle.id)
    expect((await getCarrier(1)).vehiculos.some(item => item.id === vehicle.id)).toBe(false)
    await apiClient.patch('/proveedores/1', { nombres: 'Nombre editado' })
    expect((await getCampaniaProveedoresByCampania(1))[0].proveedor?.nombres).toBe('Nombre editado')
  })

  it('returns scoped errors, keeps IDs immutable, and prevents dangling references', async () => {
    const result = await apiClient.patch('/campanas/1/clientes-negocio/1', { clienteNegocioCampanaId: 999, campaniaId: 2, kilosAcordados: 12345 })
    expect(result.data).toMatchObject({ clienteNegocioCampanaId: 1, campaniaId: 1, kilosAcordados: 12345 })
    await expect(apiClient.patch('/campanas/2/clientes-negocio/1', { kilosAcordados: 1 })).rejects.toMatchObject({ statusCode: 404 })
    await expect(deleteCampana(1)).rejects.toMatchObject({ statusCode: 409 })
    await expect(createVehicle(999, { placa: 'ZZZ-999', volumen: 1, ancho: 1, altura: 1, profundidad: 1, pesoNeto: 1, pesoBruto: 2 })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('assigns and unassigns provider fruit using the fruit ID from the existing route', async () => {
    const created = await apiClient.post('/proveedores/1/frutas/2')
    expect(created.data).toMatchObject({ proveedorId: 1, frutaId: 2, fruta: { name: 'Uva' } })
    await expect(apiClient.post('/proveedores/1/frutas/2')).rejects.toMatchObject({ statusCode: 409 })
    await apiClient.delete('/proveedores/1/frutas/2')
    const { data } = await apiClient.get('/proveedores/1/frutas')
    expect(data.some((row: { frutaId: number }) => row.frutaId === 2)).toBe(false)
  })

  it('never falls through to HTML for mock errors or captures unrelated paths', async () => {
    const unknown = await fetch(`${origin}/mock-api/not-implemented`)
    expect(unknown.status).toBe(404)
    expect(unknown.headers.get('cache-control')).toBe('no-store')
    expect(unknown.headers.get('content-type')).toContain('application/json')
    await expect(apiClient.post('/proveedores/1/certificados/documentos/subida')).rejects.toMatchObject({ statusCode: 501 })
    expect((await fetch(`${origin}/mock-api-other`)).status).toBe(418)
    expect((await fetch(`${origin}/campaigns`)).status).toBe(418)
    const malformed = await fetch(`${origin}/mock-api/campanas`, { method: 'POST', body: '{' })
    expect(malformed.status).toBe(400)
  })
})

it('rejects a production build pointing to the dev-only mock API', () => {
  const mockPlugin = mockApiPlugin('/mock-api/')
  const config = mockPlugin.config as (config: object, env: { command: string }) => void
  expect(() => config({}, { command: 'build' })).toThrow('solo funciona con pnpm dev')
  const realPlugin = mockApiPlugin('http://localhost:3000/')
  const realConfig = realPlugin.config as typeof config
  expect(() => realConfig({}, { command: 'build' })).not.toThrow()
})
