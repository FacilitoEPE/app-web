import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { IncomingMessage } from 'node:http'
import type { Connect, Plugin } from 'vite'
import { createV1MockMiddleware } from './v1-mock.ts'

type Row = Record<string, unknown>
type Database = Record<string, Row[]>
interface Resource {
  id: string
  fields: string
  references?: Record<string, string>
  defaults?: Row
}

// Only resources already consumed by the frontend. JSON files contain backend DTOs.
const resources: Record<string, Resource> = {
  frutas: { id: 'frutaId', fields: 'name' },
  'frutas-derivadas': { id: 'frutaDerivadaId', fields: 'name,frutaId', references: { frutaId: 'frutas' } },
  campanas: { id: 'campaniaId', fields: 'nombre,frutaId,fechaInicio,fechaFin,estado,requerimientoComercial', references: { frutaId: 'frutas' } },
  proveedores: { id: 'proveedorId', fields: 'nombres,apellido,tipoDocumento,nmrDocumento,identidadDocUrl,zona,telefono,email,codigoLugarProduccion' },
  'clientes-negocio': { id: 'clienteNegocioId', fields: 'nombreEmpresa,nombreContacto,telefono,ruc,correoCorporativo,ubicacion,tipoCliente' },
  'campanias-proveedores': { id: 'cxpId', fields: 'campaniaId,proveedorId,fincaId,cantidadProveedor,mtdCeratitis,frutaConvencionalEstimado,tipoProveedor', references: { campaniaId: 'campanas', proveedorId: 'proveedores' }, defaults: { fincaId: null, mtdCeratitis: null, frutaConvencionalEstimado: null } },
  'clientes-campana': { id: 'clienteNegocioCampanaId', fields: 'clienteNegocioId,documentoUrl,fechaRegistro,fichaTecnicaUrl,cantidadKg,kilosAcordados', references: { campaniaId: 'campanas', clienteNegocioId: 'clientes-negocio' } },
  'certificados-campana': { id: 'certificadoId', fields: 'nombre,documentUrl,reciboUrl,costo,fechaVencimiento,estado', references: { campaniaId: 'campanas' } },
  'empresas-transporte-externo': { id: 'idEmpresaTransporteExterno', fields: 'nombreCompleto,ruc,correo,numero' },
  'vehiculos-externos': { id: 'idVehiculoExterno', fields: 'idEmpresaTransporteExterno,placa,volumen,ancho,altura,profundidad,pesoNeto,pesoBruto', references: { idEmpresaTransporteExterno: 'empresas-transporte-externo' } },
  'choferes-transporte-externo': { id: 'idChoferTransporteExterno', fields: 'idEmpresaTransporteExterno,nombre,telefono,correo', references: { idEmpresaTransporteExterno: 'empresas-transporte-externo' } },
  'frutas-proveedor': { id: 'pxfId', fields: 'frutaId', references: { proveedorId: 'proveedores', frutaId: 'frutas' } },
  'examenes-proveedor': { id: 'examenProveedorId', fields: 'fecha,tipoExamen,resultado,origen,observacion,documentoUrl', references: { proveedorId: 'proveedores' } },
  'certificados-proveedor': { id: 'certificadoProveedorId', fields: 'fechaRevisionSenasa,nombre,documentoArchivoId', references: { proveedorId: 'proveedores' } },
}

interface Route {
  pattern: RegExp
  resource: string
  parent?: { resource: string; field: string }
  readOnly?: boolean
}

const routes: Route[] = [
  { pattern: /^\/frutas\/(\d+)\/derivadas(?:\/(\d+))?$/, resource: 'frutas-derivadas', parent: { resource: 'frutas', field: 'frutaId' }, readOnly: true },
  { pattern: /^\/campanas\/(\d+)\/clientes-negocio(?:\/(\d+))?$/, resource: 'clientes-campana', parent: { resource: 'campanas', field: 'campaniaId' } },
  { pattern: /^\/campanas\/(\d+)\/certificados(?:\/(\d+))?$/, resource: 'certificados-campana', parent: { resource: 'campanas', field: 'campaniaId' } },
  { pattern: /^\/proveedores\/(\d+)\/frutas(?:\/(?:por-fruta\/)?(\d+))?$/, resource: 'frutas-proveedor', parent: { resource: 'proveedores', field: 'proveedorId' } },
  { pattern: /^\/proveedores\/(\d+)\/examenes(?:\/(\d+))?$/, resource: 'examenes-proveedor', parent: { resource: 'proveedores', field: 'proveedorId' } },
  { pattern: /^\/proveedores\/(\d+)\/certificados(?:\/(\d+))?$/, resource: 'certificados-proveedor', parent: { resource: 'proveedores', field: 'proveedorId' } },
  ...['frutas', 'campanas', 'proveedores', 'clientes-negocio', 'campanias-proveedores', 'empresas-transporte-externo', 'vehiculos-externos', 'choferes-transporte-externo'].map(resource => ({
    pattern: new RegExp(`^/${resource}(?:/(\\d+))?$`), resource, readOnly: resource === 'frutas',
  })),
]

class MockError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function loadDatabase(directory: string): Database {
  return Object.fromEntries(Object.entries(resources).map(([name, resource]) => {
    const file = path.join(directory, `${name}.json`)
    const rows: unknown = JSON.parse(readFileSync(file, 'utf8'))
    if (!Array.isArray(rows) || rows.some(row => !row || !Number.isSafeInteger(row[resource.id]) || row[resource.id] <= 0)) {
      throw new Error(`Mock API: ${file} debe contener un array de DTOs con IDs enteros positivos.`)
    }
    if (new Set(rows.map(row => row[resource.id])).size !== rows.length) {
      throw new Error(`Mock API: IDs duplicados en ${file}.`)
    }
    return [name, rows]
  }))
}

async function readBody(request: IncomingMessage): Promise<Row> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk)
    size += buffer.length
    if (size > 1024 * 1024) throw new MockError(413, 'El JSON supera 1 MB.')
    chunks.push(buffer)
  }
  if (size === 0) return {}
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (body && typeof body === 'object' && !Array.isArray(body)) return body as Row
  } catch { /* Report malformed input as an API error, never as HTML. */ }
  throw new MockError(400, 'Se esperaba un objeto JSON válido.')
}

/** Each server starts with its own seed. Mutations never write to the fixture files. */
export function createMockMiddleware(directory: string): Connect.NextHandleFunction {
  const db = loadDatabase(directory)
  const nextIds = Object.fromEntries(Object.entries(resources).map(([name, resource]) => [
    name, Math.max(0, ...db[name].map(row => Number(row[resource.id]))) + 1,
  ]))
  const find = (name: string, id: unknown): Row => {
    const row = db[name].find(item => item[resources[name].id] === id)
    if (!row) throw new MockError(404, `No existe ${name} con ID ${String(id)}.`)
    return row
  }
  const related = (name: string, field: string, id: unknown) => db[name].filter(row => row[field] === id)
  const hydrate = (name: string, row: Row): Row => {
    if (name === 'campanas') return { ...row, fruta: find('frutas', row.frutaId) }
    if (name === 'campanias-proveedores') return { ...row, proveedor: find('proveedores', row.proveedorId) }
    if (name === 'clientes-campana') return { ...row, clienteNegocio: find('clientes-negocio', row.clienteNegocioId) }
    if (name === 'frutas-proveedor') return { ...row, fruta: find('frutas', row.frutaId) }
    if (name === 'empresas-transporte-externo') return {
      ...row,
      vehiculos: related('vehiculos-externos', 'idEmpresaTransporteExterno', row.idEmpresaTransporteExterno),
      choferes: related('choferes-transporte-externo', 'idEmpresaTransporteExterno', row.idEmpresaTransporteExterno),
    }
    return row
  }

  const handle = async (request: IncomingMessage, pathname: string) => {
    const method = request.method ?? 'GET'
    if (/\/documentos\/|\/documento\//.test(pathname)) {
      throw new MockError(501, 'La API ficticia no simula subidas ni descargas de S3.')
    }
    if ((pathname === '/api/v1/auth/login' || pathname === '/auth/login') && method === 'POST') {
      const body = await readBody(request)
      const username = String(body.usuario ?? '').trim().toLowerCase()
      const isDriver = username.includes('chofer')
      const user = isDriver
        ? {
            usuarioId: 2,
            usuario: 'chofer-demo',
            personaId: 2,
            nombres: 'Miguel',
            apellidos: 'Torres Ramos',
            correo: 'chofer@transnorte.com',
            rol: { rolId: 2, nombre: 'Chofer' as const },
          }
        : {
            usuarioId: 1,
            usuario: 'admin-demo',
            personaId: 5,
            nombres: 'Administrador',
            apellidos: 'Demo',
            correo: 'admin@agroexportacionesfv.pe',
            rol: { rolId: 1, nombre: 'Administrador' as const },
          }
      return {
        status: 200,
        data: {
          accessToken: isDriver ? 'mock-chofer-token' : 'mock-admin-token',
          user,
        },
      }
    }
    if ((pathname === '/api/v1/auth/me' || pathname === '/auth/me') && method === 'GET') {
      const authHeader = String(request.headers.authorization ?? '')
      const isDriver = authHeader.includes('chofer')
      return {
        status: 200,
        data: isDriver
          ? {
              usuarioId: 2,
              usuario: 'chofer-demo',
              personaId: 2,
              nombres: 'Miguel',
              apellidos: 'Torres Ramos',
              correo: 'chofer@transnorte.com',
              rol: { rolId: 2, nombre: 'Chofer' as const },
            }
          : {
              usuarioId: 1,
              usuario: 'admin-demo',
              personaId: 5,
              nombres: 'Administrador',
              apellidos: 'Demo',
              correo: 'admin@agroexportacionesfv.pe',
              rol: { rolId: 1, nombre: 'Administrador' as const },
            },
      }
    }
    const campaignProviders = /^\/campanias-proveedores\/campania\/(\d+)$/.exec(pathname)
    if (campaignProviders && method === 'GET') {
      const id = Number(campaignProviders[1])
      find('campanas', id)
      return { status: 200, data: related('campanias-proveedores', 'campaniaId', id).map(row => hydrate('campanias-proveedores', row)) }
    }
    const contracts = /^\/clientes-negocio\/(\d+)\/contratos$/.exec(pathname)
    if (contracts && method === 'GET') {
      const id = Number(contracts[1])
      return { status: 200, data: {
        clienteNegocio: find('clientes-negocio', id),
        contratos: related('clientes-campana', 'clienteNegocioId', id)
          .sort((a, b) => String(b.fechaRegistro).localeCompare(String(a.fechaRegistro)) || Number(b.clienteNegocioCampanaId) - Number(a.clienteNegocioCampanaId))
          .map(row => ({
            clienteNegocioCampanaId: row.clienteNegocioCampanaId, documentoUrl: row.documentoUrl,
            fichaTecnicaUrl: row.fichaTecnicaUrl, kilosAcordados: row.kilosAcordados,
            campaniaId: row.campaniaId, nombreCampania: find('campanas', row.campaniaId).nombre,
            fechaRegistro: row.fechaRegistro,
          })),
      } }
    }
    const route = routes.find(item => item.pattern.test(pathname))
    if (!route) throw new MockError(404, `Ruta ficticia no implementada: ${pathname}`)
    const match = route.pattern.exec(pathname)!
    const { resource: name, parent } = route
    const resource = resources[name]
    const scope = parent ? { [parent.field]: Number(match[1]) } : {}
    if (parent) find(parent.resource, scope[parent.field])
    const idText = match[parent ? 2 : 1]
    const id = idText === undefined ? undefined : Number(idText)
    const fruitAssignment = name === 'frutas-proveedor'
    const identity = fruitAssignment ? 'frutaId' : resource.id
    const rows = db[name].filter(row => !parent || row[parent.field] === scope[parent.field])
    const current = id === undefined ? undefined : rows.find(row => row[identity] === id)

    if (method === 'GET') {
      if (fruitAssignment && id !== undefined) throw new MockError(405, 'Método no disponible para esta ruta.')
      if (id !== undefined && !current) throw new MockError(404, 'Registro ficticio no encontrado.')
      return { status: 200, data: current ? hydrate(name, current) : rows.map(row => hydrate(name, row)) }
    }
    if (route.readOnly || !['POST', 'PATCH', 'DELETE'].includes(method)
      || (method === 'POST' && (fruitAssignment ? id === undefined : id !== undefined))
      || (method !== 'POST' && id === undefined) || (fruitAssignment && method === 'PATCH')) {
      throw new MockError(405, 'Método no disponible para esta ruta ficticia.')
    }
    if (method !== 'POST' && !current) throw new MockError(404, 'Registro ficticio no encontrado.')
    if (method === 'DELETE') {
      const referenced = Object.entries(resources).some(([childName, child]) =>
        Object.entries(child.references ?? {}).some(([field, target]) => target === name
          && db[childName].some(row => row[field] === current![resource.id])),
      )
      if (referenced) throw new MockError(409, 'Elimina primero los registros relacionados en la API ficticia.')
      db[name] = db[name].filter(row => row !== current)
      return { status: 204, data: undefined }
    }
    if (fruitAssignment && current) throw new MockError(409, 'La fruta ya está asignada al proveedor.')
    const body = fruitAssignment ? { frutaId: id } : await readBody(request)
    const fields = resource.fields.split(',')
    const payload = Object.fromEntries(fields.filter(field => body[field] !== undefined).map(field => [field, body[field]]))
    const now = new Date().toISOString()
    const row: Row = {
      ...resource.defaults, ...current, ...payload, ...scope,
      [resource.id]: current?.[resource.id] ?? nextIds[name],
      createdAt: current?.createdAt ?? now, updatedAt: now,
    }
    if (name === 'campanas') row.requerimientoComercial = Number(row.requerimientoComercial)
    for (const [field, target] of Object.entries(resource.references ?? {})) find(target, row[field])
    if (method === 'POST') {
      db[name].push(row)
      nextIds[name]++
    } else {
      db[name][db[name].indexOf(current!)] = row
    }
    return { status: method === 'POST' ? 201 : 200, data: hydrate(name, row) }
  }

  return (request, response, next) => {
    const pathname = new URL(request.url ?? '/', 'http://mock.local').pathname
    if (pathname !== '/mock-api' && !pathname.startsWith('/mock-api/')) return next()
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Pragma', 'no-cache')
    void handle(request, pathname.slice('/mock-api'.length).replace(/^\/v1(?=\/)/, '').replace(/\/$/, '') || '/')
      .then(({ status, data }) => {
        response.statusCode = status
        response.end(data === undefined ? undefined : JSON.stringify(data))
      }).catch((error: unknown) => {
        const status = error instanceof MockError ? error.status : 500
        response.statusCode = status
        response.end(JSON.stringify({ statusCode: status, message: error instanceof Error ? error.message : 'Error en la API ficticia.' }))
      })
  }
}

export function mockApiPlugin(apiBaseUrl: string | undefined): Plugin {
  const normalized = apiBaseUrl?.replace(/\/$/, '') ?? ''
  const enabled = normalized === '/mock-api' || normalized.startsWith('/mock-api')
  return {
    name: 'epe-mock-api',
    config(_config, { command }) {
      if (enabled && command === 'build') {
        throw new Error('La API ficticia solo funciona con pnpm dev. Configura VITE_API_BASE_URL con la URL del backend antes de compilar.')
      }
    },
    configureServer(server) {
      if (!enabled) return
      server.middlewares.use(createV1MockMiddleware(server.config.root, undefined, true))
      server.middlewares.use(createMockMiddleware(path.join(server.config.root, 'json')))
      server.watcher.add(path.join(server.config.root, 'json/**/*.json'))
      server.watcher.on('change', (file) => {
        if (file.includes(path.sep + 'json' + path.sep)) {
          void server.restart()
        }
      })
      server.config.logger.info('[mock-api] Datos ficticios cargados desde json/. Recarga automática al modificar fixtures.')
    },
  }
}

