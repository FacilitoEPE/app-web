import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { createV1MockMiddleware } from './v1-mock.ts'
import { loadV1Contract, validateV1Schema } from './v1-contract.ts'
import { apiClient } from '@/shared/api/client'
import { campanaV1, campaniaXProveedoresV1, clienteNegocioCampanaV1 } from '@/modules/campaigns/api/v1.api'
import { fincaV1, proveedorV1, examenProveedorV1 } from '@/modules/providers/api/v1.api'
import { acuerdoTransporteV1 } from '@/modules/carriers/api/v1.api'
import { facturaVentaV1, cobroVentaV1 } from '@/modules/billing/api/v1.api'
import { emitirFacturaV1 } from '@/modules/billing/api/v1-actions.api'
import { pagoProveedorV1, liquidacionProveedorV1, aplicacionAdelantoV1 } from '@/modules/purchase-settlement/api/v1.api'
import { emitirGuiaV1 } from '@/modules/quality/api/v1-actions.api'
import { cerrarCampanaV1 } from '@/modules/campaigns/api/v1-actions.api'
import { cargasAsignadasV1 } from '@/modules/driver-portal/api/v1-loads.api'

const root = path.resolve(import.meta.dirname, '..')
let server: Server
let base: string | undefined
let origin: string
let now: Date

beforeEach(async () => {
  now = new Date('2026-11-01T12:00:00Z')
  const middleware = createV1MockMiddleware(root, () => now)
  server = createServer((request,response) => middleware(request,response,() => {
    response.statusCode = 418
    response.end('outside v1')
  }))
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve))
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  base = apiClient.defaults.baseURL
  apiClient.defaults.baseURL = `${origin}/mock-api/`
})
afterEach(async () => {
  apiClient.defaults.baseURL = base
  await new Promise<void>((resolve,reject) => server.close(error => error ? reject(error) : resolve()))
})

describe('V1 API contract', () => {
  it('calcula el estado por fecha de Lima al crear, editar y consultar', async () => {
    const created = await campanaV1.create({ nombre:'Prueba', frutaId:4, fechaInicio:'2026-11-02', fechaFin:'2026-11-03', requerimientoComercial:100 })
    expect(created.estado).toBe('planificacion')
    now = new Date('2026-11-02T04:59:59Z')
    expect((await campanaV1.get(created.campaniaId)).estado).toBe('planificacion')
    now = new Date('2026-11-02T05:00:00Z')
    expect((await campanaV1.get(created.campaniaId)).estado).toBe('en proceso')
    expect((await campanaV1.update(created.campaniaId, { fechaInicio:'2026-11-04', fechaFin:'2026-11-05' })).estado).toBe('planificacion')
    now = new Date('2026-11-06T05:00:00Z')
    expect((await campanaV1.get(created.campaniaId)).estado).toBe('terminado')
    now = new Date('2026-11-01T12:00:00Z')
    expect((await campanaV1.get(created.campaniaId)).estado).toBe('terminado')
  })

  it('serves every documented collection with a response that matches OpenAPI', async () => {
    const { contract,database } = loadV1Contract(root)
    for (const [template,item] of Object.entries(contract.paths)) {
      const resource = item['x-resource']
      if (!resource) continue
      const parentId = resource.parentTable ? database[resource.parentTable][0]?.[contract['x-database'][resource.parentTable].id] ?? 1 : 1
      const route = template.replace('{parentId}',String(parentId))
      const { data } = await apiClient.get(`/api${route}`)
      expect(validateV1Schema(contract,item.get!.responses['200'].content!['application/json'].schema,data),route).toEqual({})
    }
  })

  it('paginates and filters with typed query errors', async () => {
    const page = await campanaV1.list({ page:2,pageSize:1 })
    expect(page).toMatchObject({ page:2,pageSize:1,total:3 })
    expect(page.items[0].campaniaId).toBe(2)
    const filtered = await campanaV1.list({ estado:'en proceso' })
    expect(filtered.items).toHaveLength(1)
    await expect(campanaV1.list({ pageSize:101 })).rejects.toMatchObject({ statusCode:400,code:'INVALID_QUERY' })
    await expect(campanaV1.list({ unknown:1 })).rejects.toMatchObject({ statusCode:400,code:'INVALID_QUERY' })
  })

  it('preserves textual documents and leading zeros, rejects unknown fields and incorrect types', async () => {
    expect((await proveedorV1.get(1)).nmrDocumento).toBe('04000001')
    await expect(proveedorV1.update(1,{ telefono:'090012345' })).resolves.toMatchObject({ telefono:'090012345' })
    await expect(apiClient.patch('/v1/proveedores/1',{ telefono:90012345 })).rejects.toMatchObject({ statusCode:422,fieldErrors:{ telefono:expect.any(String) } })
    await expect(apiClient.patch('/v1/proveedores/1',{ proveedorId:999 })).rejects.toMatchObject({ statusCode:422 })
    await expect(apiClient.patch('/v1/proveedores/1',{ documentoArchivoId:999 })).rejects.toMatchObject({ statusCode:422 })
    await expect(campanaV1.update(1,{ fechaFin:'2026-02-30' })).rejects.toMatchObject({ statusCode:422 })
  })

  it('blocks new duplicate client links and keeps existing requirements editable', async () => {
    expect((await clienteNegocioCampanaV1(1).list({ clienteNegocioId:1 })).total).toBe(2)
    const duplicate = { statusCode:409, code:'CAMPAIGN_CLIENT_ALREADY_LINKED' }
    const body = { clienteNegocioId:1,fechaRegistro:'2026-10-29',kilosAcordados:200 }
    await expect(clienteNegocioCampanaV1(1).create(body)).rejects.toMatchObject(duplicate)
    await expect(clienteNegocioCampanaV1(1).update(1,{ observaciones:'Edición histórica' })).resolves.toMatchObject({ clienteNegocioId:1 })
    await expect(clienteNegocioCampanaV1(1).update(3,{ clienteNegocioId:1 })).rejects.toMatchObject(duplicate)
    const create = () => clienteNegocioCampanaV1(1).create({ ...body, clienteNegocioId:3 })
    const results = await Promise.allSettled([create(), create()])
    expect(results).toContainEqual(expect.objectContaining({ status:'fulfilled', value:expect.objectContaining({ clienteNegocioId:3 }) }))
    expect(results).toContainEqual(expect.objectContaining({ status:'rejected', reason:expect.objectContaining(duplicate) }))
    expect((await clienteNegocioCampanaV1(1).list({ clienteNegocioId:3 })).total).toBe(1)
  })

  it('keeps one provider participation per campaign', async () => {
    await expect(campaniaXProveedoresV1(1).create({ proveedorId:1,cantidadProveedor:100,tipoProveedor:'acopio' })).rejects.toMatchObject({ code:'DUPLICATE' })
    await expect(apiClient.patch('/v1/campanas/1/proveedores/1',{ fincaId:1 })).rejects.toMatchObject({ statusCode:422 })
  })

  it('allows linking producers during planning and preserves existing producers during execution', async () => {
    const producer = { proveedorId:4, cantidadProveedor:100, tipoProveedor:'productor' as const }
    await expect(campaniaXProveedoresV1(1).create(producer)).rejects.toMatchObject({ statusCode:409, code:'CAMPAIGN_COLLECTORS_ONLY' })
    await expect(campaniaXProveedoresV1(1).update(3,{ tipoProveedor:'productor' })).rejects.toMatchObject({ code:'CAMPAIGN_COLLECTORS_ONLY' })
    await expect(campaniaXProveedoresV1(1).update(4,{ cantidadProveedor:120 })).resolves.toMatchObject({ tipoProveedor:'productor', cantidadProveedor:120 })
    await expect(campaniaXProveedoresV1(2).create(producer)).resolves.toMatchObject({ tipoProveedor:'productor', proveedorId:4 })
  })

  it('returns scoped 404 and rejects invalid references without corrupting the existing record', async () => {
    await expect(fincaV1(2).get(1)).rejects.toMatchObject({ statusCode:404 })
    await expect(fincaV1(1).update(1,{ frutaDerivadaId:999 })).rejects.toMatchObject({ statusCode:422,code:'INVALID_REFERENCE' })
    expect((await fincaV1(1).get(1)).frutaDerivadaId).toBe(1)
    await expect(fincaV1(1).update(1,{ haCultivo:100 })).rejects.toMatchObject({ code:'INVALID_HECTARES' })
  })

  it('accepts drafts without final exam results or a complete transport agreement', async () => {
    const exam = await examenProveedorV1(1).create({ fecha:'2026-10-29',tipoExamen:'cadmio',estadoExamen:'Pendiente',codigoMuestra:'M-002' })
    expect(exam.resultado).toBeNull()
    await expect(examenProveedorV1(1).update(exam.examenProveedorId,{ estadoExamen:'Con resultado',fechaEnvio:'2026-10-29' })).rejects.toMatchObject({ code:'EXAM_RESULT_REQUIRED' })
    const result = await examenProveedorV1(1).update(exam.examenProveedorId,{ estadoExamen:'Con resultado',fechaEnvio:'2026-10-29',resultado:'negativo' })
    expect(result.resultado).toBe('negativo')
    expect((await acuerdoTransporteV1(1).get(2)).montoAcordado).toBeNull()
    await expect(acuerdoTransporteV1(1).update(2,{ estado:'CONFIRMADO' })).rejects.toMatchObject({ code:'AGREEMENT_INCOMPLETE' })
  })

  it('enforces one active campaign per fruit and PEN or USD for purchase/transport', async () => {
    await expect(campanaV1.create({ nombre:'Otra Mango',frutaId:1,fechaInicio:'2026-10-29',fechaFin:'2026-12-31',requerimientoComercial:100 })).rejects.toMatchObject({ code:'ACTIVE_CAMPAIGN_EXISTS' })
    await expect(acuerdoTransporteV1(1).update(2,{ moneda:'USD' })).resolves.toMatchObject({ moneda:'USD' })
    await expect(acuerdoTransporteV1(1).update(2,{ moneda:'EUR' as 'PEN' })).rejects.toMatchObject({ code:'INVALID_CURRENCY' })
  })

  it('allows consecutive trips and rejects overlapping driver intervals', async () => {
    const endpoint='/v1/entregas/2/coordinaciones/2'
    await expect(apiClient.patch(endpoint,{ inicioProgramado:'2026-10-29T14:00:00Z',finProgramado:'2026-10-29T16:00:00Z' })).rejects.toMatchObject({ code:'DRIVER_OVERLAP' })
    const result = await apiClient.patch(endpoint,{ inicioProgramado:'2026-10-29T15:00:00Z',finProgramado:'2026-10-29T17:00:00Z' })
    expect(result.data.inicioProgramado).toBe('2026-10-29T15:00:00Z')
  })

  it('uses recognized rather than loaded kilograms and freezes historical identity', async () => {
    const document = await liquidacionProveedorV1(1).get(1)
    expect(document.kilosReconocidos).toBe(580)
    expect(document.importeCompra).toBe(1160)
    await proveedorV1.update(1,{ nombres:'Nombre nuevo' })
    expect((await liquidacionProveedorV1(1).get(1)).personaSnapshot.nombres).toBe('José Luis')
    await expect(apiClient.patch('/v1/cargas/1/recepciones/1',{ compras:[{ providerId:1,recognizedQuantity:9999 }] })).rejects.toMatchObject({ code:'RECEIPT_HAS_SETTLEMENTS' })
  })

  it('prevents overpayments, protects documents, and serializes concurrent balance consumption', async () => {
    await expect(pagoProveedorV1(1).create({ fecha:'2026-10-29',monto:1001,medio:'TRANSFERENCIA',referencia:'EXCESO' })).rejects.toMatchObject({ code:'BALANCE_EXCEEDED' })
    const results = await Promise.allSettled([
      pagoProveedorV1(1).create({ fecha:'2026-10-29',monto:600,medio:'TRANSFERENCIA',referencia:'UNO' }),
      pagoProveedorV1(1).create({ fecha:'2026-10-29',monto:600,medio:'TRANSFERENCIA',referencia:'DOS' }),
    ])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect((await pagoProveedorV1(1).list()).total).toBe(2)
    await expect(liquidacionProveedorV1(1).remove(1)).rejects.toMatchObject({ code:'DOCUMENT_HAS_MOVEMENTS' })
    await expect(aplicacionAdelantoV1(1).create({ adelantoTransporteId:1,fecha:'2026-10-29',monto:101 })).rejects.toMatchObject({ code:'DUPLICATE' })
    const load = await apiClient.post('/v1/coordinaciones/2/cargas',{ codigo:'CAR-2',fechaCarga:'2026-10-30',anotadorNombre:'Ana' })
    const settlement = await apiClient.post(`/v1/cargas/${load.data.cargaId}/liquidaciones-transporte`,{ numero:'LT-2',fecha:'2026-10-30' })
    await expect(aplicacionAdelantoV1(settlement.data.liquidacionTransporteId).create({ adelantoTransporteId:1,fecha:'2026-10-30',monto:101 })).rejects.toMatchObject({ code:'ADVANCE_UNAVAILABLE' })
  })

  it('supports multiple invoices per load and validates preparation, emission and collections', async () => {
    const invoices = await facturaVentaV1(1).list()
    expect(invoices.total).toBe(2)
    expect(invoices.items[0].importeVenta).toBe(1495)
    await expect(cobroVentaV1(2).create({ fecha:'2026-10-29',monto:10,medio:'TRANSFERENCIA',referencia:'PREMATURO' })).rejects.toMatchObject({ code:'INVOICE_NOT_ISSUED' })
    await expect(facturaVentaV1(1).create({ referenciaPreparacion:'TERCERA',fechaPreparacion:'2026-10-29',kilosFacturados:1,moneda:'USD' })).rejects.toMatchObject({ code:'INVOICED_WEIGHT_EXCEEDED' })
    const emitted = await emitirFacturaV1(2,{ numeroFactura:'F001-0002',fechaEmision:'2026-10-29' })
    expect(emitted.estado).toBe('EMITIDA')
    await expect(cobroVentaV1(2).create({ fecha:'2026-10-29',monto:100,medio:'TRANSFERENCIA',referencia:'COBRO-2' })).resolves.toMatchObject({ monto:100 })
  })

  it('emits a guide, freezes its lines and returns pending campaign closures explicitly', async () => {
    const guide = await emitirGuiaV1(1)
    expect(guide.emitidaAt).toBeTruthy()
    expect(guide.contenido.standardCodes).toEqual(['NOP'])
    await expect(apiClient.patch('/v1/guias/1/proveedores/1',{ kilosAsignados:1 })).rejects.toMatchObject({ code:'GUIDE_IMMUTABLE' })
    await expect(cerrarCampanaV1(1,'Fin de temporada')).rejects.toMatchObject({ code:'CAMPAIGN_PENDING' })
    expect((await campanaV1.get(1)).estado).toBe('en proceso')
  })

  it('keeps V1 separate from unprefixed requests and never returns HTML for errors', async () => {
    expect((await fetch(`${origin}/mock-api/campanas`)).status).toBe(418)
    const missing = await fetch(`${origin}/mock-api/v1/no-existe`)
    expect(missing.status).toBe(404)
    expect(missing.headers.get('cache-control')).toBe('no-store')
    expect(await missing.json()).toMatchObject({ code:'ROUTE_NOT_FOUND',fieldErrors:{} })
    const malformed = await fetch(`${origin}/mock-api/v1/personas`,{ method:'POST',body:'{' })
    expect(malformed.status).toBe(400)
    await expect(apiClient.patch('/v1/roles/1',{ nombre:'Otro' })).rejects.toMatchObject({ statusCode:405 })
  })

  it('provides a driver entry point without trusting a client driver selector and prevents stage skipping', async () => {
    expect((await cargasAsignadasV1.list()).items[0].cargaId).toBe(1)
    await expect(cargasAsignadasV1.list({ driverId:999 })).rejects.toMatchObject({ code:'INVALID_QUERY' })
    await expect(apiClient.post('/v1/coordinaciones/1/historial-chofer',{ estado:'LLEGADA' })).rejects.toMatchObject({ code:'INVALID_DRIVER_STAGE' })
  })

  it('lists and registers a pending delivery for a driver without a linked account', async () => {
    const { data: driver } = await apiClient.post('/v1/transportistas/1/choferes', {
      nombre: 'Chofer de prueba', telefono: '900000003',
    })
    await apiClient.patch('/v1/entregas/2/coordinaciones/2', { idChoferTransporteExterno: driver.idChoferTransporteExterno })
    const { data: context } = await apiClient.get('/v1/chofer/contexto')
    expect(context.coordinations).toContainEqual(expect.objectContaining({
      coordinacionEntregaId: 2, idChoferTransporteExterno: driver.idChoferTransporteExterno,
    }))
    const route = '/v1/chofer/coordinaciones/2/carga'
    const input = {
      fechaCarga: '2026-11-01', anotador: 'Ana', cumpleRequisitosIndustria: true, observacionesCarga: '',
      viaticosMovilidad: 0, viaticosInsumos: 0, gastoCuadrilla: 0, gastoAnotadores: 0,
      proveedores: [{
        proveedorId: '1', variedad: 'Kent', kilosCargados: 100, jabasCargadas: 1, jabasVacias: 0,
        binesCargados: 0, binesVacios: 0, mallasCargadas: 0, mallasVacias: 0,
      }],
    }
    expect((await apiClient.post(route, input)).status).toBe(201)
    expect((await cargasAsignadasV1.list()).items).toContainEqual(expect.objectContaining({ coordinacionEntregaId: 2 }))
    await expect(apiClient.post(route, input)).rejects.toMatchObject({ code: 'RESOURCE_IN_USE' })
  })

  it('supports authentication, driver context and file preview/unlink without undocumented V1 errors', async () => {
    // 1. Login endpoint
    const loginRes = await apiClient.post('/v1/auth/login', { usuario: 'admin-demo', password: 'AnyPassword' })
    expect(loginRes.data).toMatchObject({
      accessToken: 'mock-token-1',
      user: { usuario: 'admin-demo', rol: { nombre: 'Administrador' } },
    })

    // 2. Auth me endpoint with bearer token
    const meRes = await apiClient.get('/v1/auth/me', {
      headers: { Authorization: `Bearer ${loginRes.data.accessToken}` },
    })
    expect(meRes.data).toMatchObject({
      usuarioId: 1,
      usuario: 'admin-demo',
      rol: { nombre: 'Administrador' },
    })

    // 3. Chofer context endpoint
    const contextRes = await apiClient.get('/v1/chofer/contexto')
    expect(contextRes.status).toBe(200)
    expect(Array.isArray(contextRes.data.campaigns)).toBe(true)
    expect(Array.isArray(contextRes.data.loads)).toBe(true)

    // 4. Chofer load update endpoint
    const patchRes = await apiClient.patch('/v1/chofer/cargas/1/datos', {
      fechaCarga: '2026-10-30',
      observacionesCarga: 'Carga completada sin incidentes',
    })
    expect(patchRes.status).toBe(200)
    expect(patchRes.data.ok).toBe(true)

    // 5. Normalizes /mock-api/v1 and /mock-api/v1/v1 prefixes
    const v1Res = await fetch(`${origin}/mock-api/v1/campanas`)
    expect(v1Res.status).toBe(200)
    const jsonV1 = await v1Res.json()
    expect(jsonV1.total).toBeGreaterThan(0)

    const apiV1Res = await fetch(`${origin}/mock-api/api/v1/campanas`)
    expect(apiV1Res.status).toBe(200)
    const jsonApiV1 = await apiV1Res.json()
    expect(jsonApiV1.total).toBeGreaterThan(0)

    // 6. Local files unlink and preview
    await apiClient.post('/v1/archivos-locales/vinculos', { tipo: 'TEST', entidadId: 99, archivoId: 1 })
    const previewRes = await apiClient.get('/v1/archivos-locales/1/contenido')
    expect(previewRes.status).toBe(200)
    const unlinkRes = await apiClient.delete('/v1/archivos-locales/vinculos/TEST/99')
    expect(unlinkRes.status).toBe(200)
  })

  it('requires an in-progress campaign and preserves a closed campaign as read-only', async () => {
    await expect(campanaV1.update(3,{ estado:'en proceso' })).rejects.toMatchObject({ code:'CAMPAIGN_CLOSED' })
    await expect(cerrarCampanaV1(2,'Cierre de prueba')).rejects.toMatchObject({ code:'CAMPAIGN_NOT_IN_PROGRESS' })
    const created = await campanaV1.create({ nombre:'Arándano de prueba',frutaId:3,estado:'en proceso',fechaInicio:'2026-10-01',fechaFin:'2026-12-31',requerimientoComercial:100 })
    const closed = await cerrarCampanaV1(created.campaniaId,'Cierre sin operaciones registradas')
    expect(closed.estado).toBe('terminado')
    await expect(campanaV1.update(created.campaniaId,{ observaciones:'Modificar historia' })).rejects.toMatchObject({ code:'CAMPAIGN_CLOSED' })
  })
})
