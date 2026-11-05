import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

// Run with pnpm contract:generate. This reads the agreed SQL; it never executes it.
const root = path.resolve(import.meta.dirname, '..')
const sqlPath = path.resolve(root, 'docs/api/contract-schema.sql')
const sql = fs.readFileSync(sqlPath, 'utf8').replace(/\r\n/g, '\n')
const check = process.argv.includes('--check')
const camel = value => value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
const pascal = value => camel(value).replace(/^./, letter => letter.toUpperCase())
const enums = Object.fromEntries([...sql.matchAll(/CREATE TYPE "([^"]+)" AS ENUM \(([^;]+)\);/g)].map(match => [match[1], [...match[2].matchAll(/'([^']+)'/g)].map(item => item[1])]))
const tables = {}
const schemas = {}

for (const match of sql.matchAll(/CREATE TABLE "([^"]+)" \(([\s\S]*?)\n\);/g)) {
  const [, table, body] = match
  const columns = [...body.matchAll(/^  "([^"]+)" (.+?)(?:,)?$/gm)]
  const pk = /PRIMARY KEY\s*\(\s*"?(\w+)/.exec(body)?.[1] ?? columns.find(item => item[2].includes('PRIMARY KEY'))?.[1]
  if (!pk) throw new Error(`Missing primary key: ${table}`)
  const properties = {}
  const defaults = {}
  const required = []
  for (const [, column, definition] of columns) {
    if (column === 'password_hash') continue
    const name = camel(column)
    const baseType = definition.match(/^(?:"[^"]+"|\w+(?:\([^)]*\))?)/)[0].replaceAll('"', '')
    const nullable = !definition.includes('NOT NULL') && column !== pk && !definition.includes('PRIMARY KEY')
    let type = /^(integer|serial)/.test(baseType) ? 'integer' : /^(numeric|decimal)/.test(baseType) ? 'number' : baseType === 'boolean' ? 'boolean' : baseType === 'jsonb' ? 'object' : 'string'
    if (baseType === 'jsonb' && /DEFAULT '\[\]'/.test(definition)) type = 'array'
    const property = { type: nullable ? [type, 'null'] : type, 'x-column': column }
    if (type === 'integer' && (column === pk || /(^id_|_id$)/.test(column))) property.minimum = 1
    if (type === 'object') property.additionalProperties = true
    if (type === 'array') property.items = {}
    if (table === 'certificado_campana' && column === 'kilos_iniciales') property.minimum = 0
    if (baseType === 'date') property.format = 'date'
    if (/^(timestamp|timestamptz)/.test(baseType)) property.format = 'date-time'
    if (/^varchar\(\d+\)/.test(baseType)) property.maxLength = Number(/\((\d+)\)/.exec(baseType)[1])
    if (type === 'string' && !nullable && !property.format) property.minLength = 1
    const decimal = /numeric\((\d+),(\d+)\)/.exec(baseType)
    if (decimal) property.multipleOf = 10 ** -Number(decimal[2])
    if (enums[baseType]) property.enum = [...enums[baseType], ...(nullable ? [null] : [])]
    const constraint = new RegExp(`(?:CHECK \\(|AND )${column} IN \\(([^)]+)\\)`).exec(body)
    if (constraint) property.enum = [...constraint[1].matchAll(/'([^']+)'/g)].map(item => item[1]).concat(nullable ? [null] : [])
    if (column === pk || /(?:^|_)archivo_id$/.test(column) || ['archivo_id', 'comprobante_id', 'evidencia_id', 'guia_salida_id', 'evidencia_descarte_id', 'reporte_recepcion_id'].includes(column)
      || ['created_at', 'updated_at', 'registrado_por_usuario_id', 'cerrada_por_usuario_id', 'cerrada_at', 'emitida_at', 'verificada_at', 'persona_snapshot', 'importe_compra', 'importe_venta', 'valor_uit_aplicado', 'limite_uit_aplicado'].includes(column)
      || (table === 'entrevista_extencion' && column === 'codigo')
      || (table === 'factura_venta' && column === 'estado')
      || (table === 'campana' && column === 'motivo_cierre')
      || (table === 'liquidacion_proveedor' && ['kilos_reconocidos','precio_kg_aplicado'].includes(column))
      || (table === 'liquidacion_transporte' && column === 'flete')
      || (table === 'factura_venta' && column === 'precio_kg_aplicado')) property.readOnly = true
    if (table === 'historial_chofer' && ['id_chofer_transporte_externo','carga_id','fecha_hora'].includes(column)
      || table === 'recepcion_planta' && column === 'id_chofer_transporte_externo') property.readOnly = true
    if (/archivo_id$|^(archivo_id|comprobante_id|evidencia_id|guia_salida_id|evidencia_descarte_id|reporte_recepcion_id)$/.test(column)) property.description = 'Referencia documental reservada. En esta versión solo null; almacenamiento diferido (FC14).'
    const defaultMatch = /DEFAULT (.+?)(?:,)?$/.exec(definition)
    if (defaultMatch) {
      const raw = defaultMatch[1]
      if (raw.startsWith("'{}'")) defaults[name] = {}
      else if (raw.startsWith("'[]'")) defaults[name] = []
      else if (/^'(.*?)'/.test(raw)) defaults[name] = /^'(.*?)'/.exec(raw)[1]
      else if (/^(true|false)/.test(raw)) defaults[name] = raw.startsWith('true')
      else if (/^\d/.test(raw)) defaults[name] = Number(raw)
      if (defaults[name] !== undefined) {
        if (type === 'number' || type === 'integer') defaults[name] = Number(defaults[name])
        property.default = defaults[name]
      }
    }
    properties[name] = property
    if (!nullable && !property.readOnly && !defaultMatch && column !== pk) required.push(name)
  }
  const references = [...sql.matchAll(new RegExp(`ALTER TABLE "${table}" ADD CONSTRAINT [^;]+?FOREIGN KEY \\(([^)]+)\\) REFERENCES "([^\"]+)" \\(([^)]+)\\)`, 'g'))]
    .map(item => ({ fields: item[1].replaceAll('"', '').split(',').map(value => camel(value.trim())), table: item[2], target: item[3].replaceAll('"', '').split(',').map(value => camel(value.trim())) }))
  const unique = [...body.matchAll(/UNIQUE \(([^)]+)\)/g)].map(item => item[1].replaceAll('"', '').split(',').map(value => camel(value.trim())))
  tables[table] = { id: camel(pk), defaults, references, unique, schema: pascal(table), required }
  schemas[pascal(table)] = { type: 'object', additionalProperties: false, properties, required: Object.keys(properties), 'x-table': table }
}

// Preserve the prototype's JSON property names. Drafts may omit fields; supplied fields are typed.
const text = { type: 'string' }, optionalText = { type: ['string','null'] }
const id = { type: 'integer', minimum: 1 }, decimal = { type: 'number' }
const object = properties => ({ type: 'object', properties, additionalProperties: true })
const jsonShapes = {
  'cosecha.organizacion': object({ harvestDate:text,serviceId:id,crewLead:text,transportConfirmed:{type:'boolean'},crewConfirmed:{type:'boolean'},arrivalConfirmed:{type:'boolean'},trainingCompleted:{type:'boolean'},evidence:optionalText,mobility:text,supplies:text }),
  'cosecha.avances': { type:'array',items:{ ...object({ id,providerId:id,fincaId:id,date:{type:'string',format:'date'},kilos:{type:'number',minimum:0},crates:{type:'integer',minimum:0},responsible:text,observations:text,evidence:optionalText }), required:['providerId','fincaId','date','kilos'] } },
  'cosecha.cierre': object({ staffReceipt:optionalText,mobilityReceipt:optionalText,completed:{type:'boolean'},endDate:text,report:optionalText,observations:text,staffPaymentRequest:optionalText,mobilityPaymentRequest:optionalText,purchaseRecord:optionalText,guide:optionalText }),
  'cosecha.industria': object(Object.fromEntries(['requestedVolume','collectionCenter','receptionDate','inspectionDate','inspectionResult','inspectionObservations','inspectionEvidence','rejectionReason','vehicleInspection','nonConformities','corrections','loadReport','purchaseRecord','guide','departureDate','arrivalDate','receivedReport'].map(key=>[key,optionalText]))),
  'guia_remision.contenido': object({ ...Object.fromEntries(['senderName','senderDocument','senderAddress','handoverDate','carrierDocumentType','carrierDocument','carrierName','carrierMtc','vehiclePlate','driverFirstNames','driverLastNames','originEstablishment','destinationEstablishment','issueDate','shipmentDate','reason','originAddress','originUbigeo','destinationAddress','destinationUbigeo','driverDocumentType','driverDocument','driverLicense','productCode','description','standardText','observations'].map(key=>[key,text])),grossWeight:decimal,packageCount:{type:'integer',minimum:0},standardCodes:{type:'array',items:text} }),
  'proveedor_guia.fincasIds': { type:'array',items:id },
  'recepcion_planta.compras': { type:'array',items:{ ...object({ id,providerId:id,recognizedQuantity:{type:'number',minimum:0},reference:text,fruit:text,quantity:decimal,guide:optionalText,document:optionalText,reviewStatus:text,observation:text }),required:['providerId','recognizedQuantity'] } },
  'recepcion_planta.logistica': object(Object.fromEntries(['logisticsStatus','estimatedArrival','windowStart','windowEnd','actualArrival','arrivalObservations','coordinationEvidence','waitingReason','rescheduledAttention','accountingStatus'].map(key=>[key,optionalText]))),
}
for (const [key,shape] of Object.entries(jsonShapes)) {
  const [table,field] = key.split('.')
  Object.assign(schemas[tables[table].schema].properties[field],shape)
}

// Domain routes represent operations/screens, not a generated CRUD for all physical tables.
// [table, collection path, module, parent table, parent column, operations]
const definitions = [
  ['fruta','/frutas','campaigns',null,null,'r'],
  ['fruta_derivada','/frutas/{parentId}/variedades','campaigns','fruta','frutaId','r'],
  ['norma','/normas','quality',null,null,'r'],
  ['rol','/roles','auth',null,null,'r'],
  ['parametro_uit','/parametros-uit','purchase-settlement',null,null,'r'],
  ['persona','/personas','providers',null,null,'crud'],
  ['proveedor','/proveedores','providers',null,null,'crud'],
  ['proveedor_x_persona','/proveedores/{parentId}/personas','providers','proveedor','proveedorId','crud'],
  ['proveedor_x_fruta','/proveedores/{parentId}/frutas','providers','proveedor','proveedorId','crud'],
  ['proveedor_x_fruta_derivada','/proveedores/{parentId}/variedades','providers','proveedor','proveedorId','crud'],
  ['finca','/proveedores/{parentId}/fincas','providers','proveedor','proveedorId','crud'],
  ['certificado_proveedor','/proveedores/{parentId}/certificados','providers','proveedor','proveedorId','crud'],
  ['cliente_negocio','/clientes-negocio','clients',null,null,'crud'],
  ['campana','/campanas','campaigns',null,null,'crud'],
  ['campania_x_proveedores','/campanas/{parentId}/proveedores','campaigns','campana','campaniaId','crud'],
  ['entrevista_extencion','/participaciones/{parentId}/entrevistas','campaigns','campania_x_proveedores','camXProvId','crud'],
  ['examen_proveedor','/proveedores/{parentId}/examenes','providers','proveedor','proveedorId','crud'],
  ['certificado_campana','/campanas/{parentId}/certificaciones','campaigns','campana','campaniaId','crud'],
  ['certificado_campana_x_proveedor','/certificaciones/{parentId}/cobertura','campaigns','certificado_campana','certificadoId','crud'],
  ['ampliacion_certificado_campana','/certificaciones/{parentId}/ampliaciones','campaigns','certificado_campana','certificadoId','a'],
  ['pago_certificado_campana','/certificaciones/{parentId}/pagos','campaigns','certificado_campana','certificadoId','a'],
  ['cliente_negocio_campana','/campanas/{parentId}/requerimientos','campaigns','campana','campaniaId','crud'],
  ['cliente_negocio_campana_x_fruta_derivada','/requerimientos/{parentId}/variedades','campaigns','cliente_negocio_campana','clienteNegocioCampanaId','crud'],
  ['contrato_venta','/requerimientos/{parentId}/contratos','commercial-planning','cliente_negocio_campana','clienteNegocioCampanaId','crud'],
  ['entrega_programada','/contratos/{parentId}/entregas','commercial-planning','contrato_venta','contratoVentaId','crud'],
  ['entrega_x_fruta_derivada','/entregas/{parentId}/variedades','commercial-planning','entrega_programada','entregaProgramadaId','crud'],
  ['empresa_transporte_externo','/transportistas','carriers',null,null,'crud'],
  ['vehiculo_externo','/transportistas/{parentId}/vehiculos','carriers','empresa_transporte_externo','idEmpresaTransporteExterno','crud'],
  ['chofer_transporte_externo','/transportistas/{parentId}/choferes','carriers','empresa_transporte_externo','idEmpresaTransporteExterno','crud'],
  ['solicitud_transporte','/campanas/{parentId}/solicitudes-transporte','carriers','campana','campaniaId','crud'],
  ['invitacion_transporte','/solicitudes-transporte/{parentId}/invitaciones','carriers','solicitud_transporte','solicitudTransporteId','crud'],
  ['cotizacion_transporte','/invitaciones-transporte/{parentId}/cotizaciones','carriers','invitacion_transporte','invitacionTransporteId','crud'],
  ['acuerdo_transporte','/campanas/{parentId}/transportistas','carriers','campana','campaniaId','crud'],
  ['adelanto_transporte','/acuerdos-transporte/{parentId}/adelantos','purchase-settlement','acuerdo_transporte','acuerdoTransporteId','a'],
  ['coordinacion_entrega','/entregas/{parentId}/coordinaciones','campaigns','entrega_programada','entregaProgramadaId','crud'],
  ['origen_entrega','/coordinaciones/{parentId}/origenes','campaigns','coordinacion_entrega','coordinacionEntregaId','crud'],
  ['cosecha','/entregas/{parentId}/cosecha','quality','entrega_programada','entregaProgramadaId','crud'],
  ['analisis_calidad','/participaciones/{parentId}/analisis-calidad','quality','campania_x_proveedores','cxpId','crud'],
  ['medicion_mtd','/participaciones/{parentId}/mediciones-mtd','quality','campania_x_proveedores','cxpId','a'],
  ['carga','/coordinaciones/{parentId}/cargas','quality','coordinacion_entrega','coordinacionEntregaId','crud'],
  ['proveedor_carga','/cargas/{parentId}/proveedores','quality','carga','cargaId','crud'],
  ['origen_carga','/proveedores-carga/{parentId}/origenes','quality','proveedor_carga','proveedorCargaId','crud'],
  ['gasto_carga','/cargas/{parentId}/gastos','quality','carga','cargaId','crud'],
  ['guia_remision','/cargas/{parentId}/guias','quality','carga','cargaId','crud'],
  ['proveedor_guia','/guias/{parentId}/proveedores','quality','guia_remision','guiaRemisionId','crud'],
  ['guia_x_norma','/guias/{parentId}/normas','quality','guia_remision','guiaRemisionId','crud'],
  ['historial_chofer','/coordinaciones/{parentId}/historial-chofer','driver-portal','coordinacion_entrega','coordinacionEntregaId','a'],
  ['recepcion_planta','/cargas/{parentId}/recepciones','logistics','carga','cargaId','crud'],
  ['liquidacion_proveedor','/cargas/{parentId}/liquidaciones-proveedor','purchase-settlement','carga','cargaId','crud'],
  ['liquidacion_transporte','/cargas/{parentId}/liquidaciones-transporte','purchase-settlement','carga','cargaId','crud'],
  ['gasto_transporte','/cargas/{parentId}/gastos-transporte','purchase-settlement','carga','cargaId','crud'],
  ['aplicacion_adelanto','/liquidaciones-transporte/{parentId}/aplicaciones-adelanto','purchase-settlement','liquidacion_transporte','liquidacionTransporteId','a'],
  ['pago_proveedor','/liquidaciones-proveedor/{parentId}/pagos','purchase-settlement','liquidacion_proveedor','liquidacionProveedorId','a'],
  ['pago_transporte','/liquidaciones-transporte/{parentId}/pagos','purchase-settlement','liquidacion_transporte','liquidacionTransporteId','a'],
  ['factura_venta','/cargas/{parentId}/facturas','billing','carga','cargaId','crud'],
  ['cobro_venta','/facturas/{parentId}/cobros','billing','factura_venta','facturaVentaId','a'],
]

const paths = {}
const ref = name => ({ $ref: `#/components/schemas/${name}` })
const response = schema => ({ description: 'Operación correcta', content: { 'application/json': { schema } } })
schemas.ApiError = { type: 'object', additionalProperties: false, properties: {
  statusCode: { type: 'integer' }, code: { type: 'string' }, message: { type: 'string' }, fieldErrors: { type: 'object', additionalProperties: { type: 'string' } },
}, required: ['statusCode','code','message','fieldErrors'] }
const errorResponses = Object.fromEntries([400,401,403,404,405,409,413,422,500].map(code => [code, { ...response(ref('ApiError')), description: 'Error: ver code, message y fieldErrors' }]))
const modules = {}
for (const [table, url, module, parentTable, scope, mode] of definitions) {
  const info = tables[table]
  const schema = schemas[info.schema]
  const editable = Object.fromEntries(Object.entries(schema.properties).filter(([name, property]) => !property.readOnly && name !== scope))
  if (table === 'campana') editable.estado = { ...editable.estado, enum: ['planificacion','en proceso'] }
  const createName = `Create${info.schema}`
  schemas[createName] = { type: 'object', additionalProperties: false, properties: editable, required: info.required.filter(name => name !== scope) }
  schemas[`Update${info.schema}`] = { ...schemas[createName], required: [], minProperties: 1 }
  schemas[`${info.schema}Page`] = { type: 'object', additionalProperties: false, properties: {
    items: { type: 'array', items: ref(info.schema) }, total: { type: 'integer', minimum: 0 }, page: { type: 'integer', minimum: 1 }, pageSize: { type: 'integer', minimum: 1, maximum: 100 },
  }, required: ['items','total','page','pageSize'] }
  const parameters = parentTable ? [{ name: 'parentId', in: 'path', required: true, description: `PK de ${parentTable}`, schema: { type: 'integer', minimum: 1 } }] : []
  const operation = (method, detail = false) => ({
    operationId: `${method}${info.schema}${detail ? 'ById' : ''}`, tags: [module], summary: `${method.toUpperCase()} ${url}${detail ? '/{id}' : ''}`,
    parameters: [...parameters, ...(detail ? [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }] : [])],
    'x-roles': module === 'driver-portal' || (table === 'recepcion_planta' && method !== 'delete') ? ['Administrador','Chofer'] : ['Administrador'],
    responses: { ...errorResponses },
  })
  const list = operation('get')
  list.parameters.push(...[
    { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
    { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
    ...Object.entries(schema.properties).filter(([name, property]) => name !== scope && !Array.isArray(property.type) && ['integer','boolean'].includes(property.type) || name !== scope && ['estado','cxpId','proveedorId','fecha','anio','frutaId','tipoCliente'].includes(name)).map(([name, property]) => ({ name, in: 'query', schema: { ...property, readOnly: undefined, default: undefined } })),
  ])
  list.responses[200] = response(ref(`${info.schema}Page`))
  paths[url] = { 'x-resource': { table, id: info.id, parentTable, scope, module, mode }, get: list }
  const get = operation('get', true)
  get.responses[200] = response(ref(info.schema))
  paths[`${url}/{id}`] = { get }
  if (mode !== 'r') {
    const post = operation('post')
    post.requestBody = { required: true, content: { 'application/json': { schema: ref(createName) } } }
    post.responses[201] = response(ref(info.schema))
    paths[url].post = post
  }
  if (mode === 'crud') {
    const patch = operation('patch', true)
    patch.requestBody = { required: true, content: { 'application/json': { schema: ref(`Update${info.schema}`) } } }
    patch.responses[200] = response(ref(info.schema))
    paths[`${url}/{id}`].patch = patch
    const remove = operation('delete', true)
    remove.responses[204] = { description: 'Eliminado sin contenido. Rechaza referencias/historial protegido.' }
    paths[`${url}/{id}`].delete = remove
  }
  ;(modules[module] ??= []).push({ table, url, scope, mode, schema: info.schema, createName })
}

// The driver's entry point derives ownership from authenticated identity in the real backend.
const loadCollection = paths['/coordinaciones/{parentId}/cargas']
const loadDetail = paths['/coordinaciones/{parentId}/cargas/{id}']
paths['/chofer/cargas'] = {
  'x-resource': { ...loadCollection['x-resource'], parentTable:null, scope:null, mode:'r', actorScope:'authenticated-driver' },
  get: { ...loadCollection.get, operationId:'getChoferCargas', tags:['driver-portal'], 'x-roles':['Administrador','Chofer'], parameters:loadCollection.get.parameters.filter(parameter=>parameter.in !== 'path') },
}
paths['/chofer/cargas/{id}'] = {
  get: { ...loadDetail.get, operationId:'getChoferCarga', tags:['driver-portal'], 'x-roles':['Administrador','Chofer'], parameters:loadDetail.get.parameters.filter(parameter=>parameter.name !== 'parentId') },
}

const actions = [
  ['/campanas/{id}/cerrar','campana',{ motivoCierre: { type: 'string', minLength: 10 } },['motivoCierre']],
  ['/guias/{id}/emitir','guia_remision',{},[]],
  ['/facturas/{id}/emitir','factura_venta',{ numeroFactura: { type: 'string', minLength: 1 }, fechaEmision: { type: 'string', format: 'date' }, fechaVencimiento: { type: ['string','null'], format: 'date' } },['numeroFactura','fechaEmision']],
]
for (const [url, table, properties, required] of actions) {
  const name = `${pascal(table)}Action`
  schemas[name] = { type: 'object', properties, required, additionalProperties: false }
  paths[url] = { 'x-action': { table }, post: {
    operationId: `${pascal(table)}Action`, tags: ['acciones'], summary: `Ejecutar ${url}`, 'x-roles': ['Administrador'],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }],
    requestBody: { required: true, content: { 'application/json': { schema: ref(name) } } }, responses: { 200: response(ref(pascal(table))), ...errorResponses },
  } }
}

// Documento general en S3: operación auxiliar sin tabla/CRUD propio en el SQL.
schemas.DocumentAvailability = {
  type: 'object', required: ['estado'], additionalProperties: false,
  properties: { estado: { type: 'string', enum: ['DISPONIBLE', 'FALTANTE', 'INVALIDO', 'NO_VERIFICABLE'] } },
}
for (const resource of ['documentos', 'archivos-locales']) {
  paths[`/${resource}/{id}/estado`] = { get: {
    operationId: resource === 'documentos' ? 'getDocumentAvailability' : 'getLegacyDocumentAvailability',
    tags: ['documentos'], summary: 'Verificar metadatos y objeto real en S3 sin descargar el documento',
    'x-roles': ['Administrador', 'Chofer'],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
    responses: { 200: response(ref('DocumentAvailability')), ...errorResponses },
  } }
}

const contract = {
  openapi: '3.1.0', info: { title: 'Agro Exportaciones F.V. — API V1', version: '1.0.0', description: 'Contrato HTTP de la API V1 implementada por epe-backend. Sus operaciones se exponen bajo /api y usan PostgreSQL. Ver business-rules.md para reglas y límites.' },
  servers: [{ url: '/api', description: 'Backend EPE (NestJS)' }],
  'x-source': { path: 'api/contract-schema.sql', sha256: crypto.createHash('sha256').update(sql).digest('hex'), date: '2026-10-29' },
  'x-database': tables, paths, components: { schemas },
}

function write(file, content) {
  const target = path.join(root, file)
  if (check) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== content) throw new Error(`Contrato desactualizado: ${file}. Ejecuta pnpm contract:generate.`)
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, content)
  }
}
write('docs/api/openapi.json', JSON.stringify(contract, null, 2) + '\n')

// DTOs live in their owning module. Shared contains only HTTP and generic types.
function tsType(property) {
  if (property.enum) return property.enum.map(value => JSON.stringify(value)).join(' | ')
  const types = Array.isArray(property.type) ? property.type : [property.type]
  return types.map(type => type === 'null' ? 'null' : type === 'number' || type === 'integer' ? 'number' : type === 'boolean' ? 'boolean' : type === 'array' ? 'JsonValue[]' : type === 'object' ? 'JsonObject' : 'string').join(' | ')
}
for (const [module, entries] of Object.entries(modules)) {
  const hasJson = entries.some(entry => Object.values(schemas[entry.schema].properties).some(property => ['object','array'].includes(property.type)))
  let dto = '// Generated by pnpm contract:generate from docs/api/openapi.json.\n'
  if (hasJson) dto += "import type { JsonObject, JsonValue } from '@/shared/api/v1-client'\n"
  for (const entry of entries) {
    for (const [name, source, input] of [[entry.schema, schemas[entry.schema], false], [entry.createName, schemas[entry.createName], true]]) {
      dto += `\nexport interface ${name}V1 {\n`
      for (const [field, property] of Object.entries(source.properties)) dto += `  ${field}${input && !source.required.includes(field) ? '?' : ''}: ${tsType(property)}\n`
      dto += '}\n'
    }
  }
  // Import only used JSON aliases to keep noUnusedLocals enabled.
  if (!dto.includes(': JsonValue[]')) dto = dto.replace('JsonObject, JsonValue', 'JsonObject')
  if (!dto.includes(': JsonObject') && dto.includes('JsonObject,')) dto = dto.replace('JsonObject, ', '')
  write(`src/modules/${module}/api/v1.dto.ts`, dto)
  let api = '// Generated by pnpm contract:generate. Pages should use domain adapters/mappers.\n'
  const helpers = [...new Set(entries.map(entry => entry.mode === 'r' ? 'createV1ReadResource' : entry.mode === 'a' ? 'createV1AppendResource' : 'createV1Resource'))]
  api += `import { ${helpers.join(', ')} } from '@/shared/api/v1-client'\n`
  api += `import type { ${entries.flatMap(entry => [entry.schema + 'V1', ...(entry.mode !== 'r' ? [entry.createName + 'V1'] : [])]).join(', ')} } from '@/modules/${module}/api/v1.dto'\n`
  for (const entry of entries) {
    const helper = entry.mode === 'r' ? 'createV1ReadResource' : entry.mode === 'a' ? 'createV1AppendResource' : 'createV1Resource'
    const types = `${entry.schema}V1${entry.mode !== 'r' ? `, ${entry.createName}V1` : ''}`
    const expr = `${helper}<${types}>(${entry.scope ? '`' + entry.url.replace('{parentId}', '${parentId}') + '`' : JSON.stringify(entry.url)})`
    api += `\nexport const ${camel(entry.table)}V1 = ${entry.scope ? `(parentId: number) => ${expr}` : expr}\n`
  }
  write(`src/modules/${module}/api/v1.api.ts`, api)
}
console.log(`${check ? 'Verificado' : 'Generado'}: ${definitions.length + 1} recursos, ${Object.keys(paths).length} rutas, ${Object.keys(tables).length} tablas fuente.`)
