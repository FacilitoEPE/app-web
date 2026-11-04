import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { IncomingMessage } from 'node:http'
import type { Connect } from 'vite'
import { demoPdf } from '../src/shared/utils/demoData.ts'
import { ApiV1Error, loadV1Contract, validateV1Schema, type Database, type Resource, type Row } from './v1-contract.ts'

const fail = (code: string, message: string, field?: string): never => {
  throw new ApiV1Error(409, code, message, field ? { [field]: message } : {})
}
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const number = (row: Row, key: string) => Number(row[key] ?? 0)
const asRows = (value: unknown): Row[] => Array.isArray(value) ? value as Row[] : []

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk)
    size += buffer.length
    if (size > 1024 * 1024) throw new ApiV1Error(413, 'BODY_TOO_LARGE', 'El JSON supera 1 MB.')
    chunks.push(buffer)
  }
  try { return size ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {} }
  catch { throw new ApiV1Error(400, 'INVALID_JSON', 'Se esperaba JSON válido.') }
}

/** Contract-driven V1 mock. Auth/storage/PostgreSQL remain responsibilities of the real backend. */
export function createV1MockMiddleware(root: string, clock: () => Date = () => new Date(), qualityDemo = false): Connect.NextHandleFunction {
  const loaded = loadV1Contract(root)
  const contract = loaded.contract
  let db = loaded.database
  if (qualityDemo) {
    for (const filename of ['quality-demo.json', 'logistics-demo.json']) {
      const fixtures = JSON.parse(readFileSync(path.join(root, 'json', filename), 'utf8')) as Record<string, { append: Row[]; replace: Row[] }>
      for (const [table, changes] of Object.entries(fixtures)) {
        const id = loaded.contract['x-database'][table].id
        db[table] = db[table].map(row => changes.replace.find(item => item[id] === row[id]) ?? row).concat(changes.append)
        for (const row of db[table]) {
          const errors = validateV1Schema(loaded.contract, { $ref: `#/components/schemas/${loaded.contract['x-database'][table].schema}` }, row)
          if (Object.keys(errors).length) throw new Error(`Demo fixture ${table}: ${JSON.stringify(errors)}`)
        }
      }
    }
  }
  let nextLocalFileId = 1
  const localFiles = new Map<number, { id: string | number; url: string; name: string; type: string; size: number }>()
  let localLinks: Array<{ tipo: string; entidadId: number; id: string | number; archivoId?: string; url: string; name: string; type: string; size: number }> = []
  // Fixtures documentales exclusivos del servidor ficticio de desarrollo.
  const qualityDocumentsReady = Promise.all([
    ...(qualityDemo ? db.analisis_calidad : []).filter(row => row.estado !== 'PENDIENTE').map(row => ({ tipo: 'analisis_calidad', entidadId: Number(row.analisisCalidadId), name: `analisis-${row.analisisCalidadId}.pdf` })),
    ...(qualityDemo ? db.medicion_mtd : []).map(row => ({ tipo: 'medicion_mtd', entidadId: Number(row.medicionMtdId), name: `captura-mtd-${row.medicionMtdId}.pdf` })),
    ...(qualityDemo ? db.recepcion_planta : []).filter(row => row.cargaId === 3).map(row => ({ tipo: 'recepcion_planta', entidadId: Number(row.recepcionPlantaId), name: `recepcion-carga-${row.cargaId}.pdf` })),
  ].map(async (entry, index) => {
    const pdf = demoPdf(entry.name, 'Calidad - documento sintetico de demostracion')
    const url = `data:application/pdf;base64,${Buffer.from(await pdf.arrayBuffer()).toString('base64')}`
    return { ...entry, id: 10000 + index, archivoId: String(10000 + index), url, type: pdf.type, size: pdf.size }
  })).then(documents => { localLinks = documents })
  const meta = contract['x-database']
  const nextIds = Object.fromEntries(Object.entries(meta).map(([table, def]) => [table, Math.max(0, ...db[table].map(row => Number(row[def.id]))) + 1]))
  const find = (table: string, id: unknown): Row => {
    const row = db[table].find(item => item[meta[table].id] === id)
    if (!row) throw new ApiV1Error(404, 'NOT_FOUND', `No existe ${table} con ID ${String(id)}.`)
    return row
  }
  const related = (table: string, field: string, id: unknown) => db[table].filter(row => row[field] === id)
  const sum = (table: string, field: string, id: unknown, amount: string) => related(table, field, id).reduce((total, row) => total + number(row, amount), 0)
  const campaignFor = (table: string, row: Row, visited = new Set<string>()): Row | undefined => {
    if (table === 'campana') return row
    if (typeof row.campaniaId === 'number') return find('campana', row.campaniaId)
    const key = `${table}:${row[meta[table].id]}`
    if (visited.has(key)) return
    visited.add(key)
    for (const reference of meta[table].references) {
      const target = db[reference.table].find(item => reference.fields.every((field, index) => row[field] != null && item[reference.target[index]] === row[field]))
      if (target) {
        const result = campaignFor(reference.table, target, visited)
        if (result) return result
      }
    }
  }
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  const campaignStatus = (row: Row) => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone:'America/Lima', year:'numeric', month:'2-digit', day:'2-digit' }).format(clock())
    return today < String(row.fechaInicio).slice(0,10) ? 'planificacion' : today > String(row.fechaFin).slice(0,10) ? 'terminado' : 'en proceso'
  }
  const refreshCampaignStatuses = () => {
    for (const row of db.campana) if (row.estado !== 'terminado') row.estado = campaignStatus(row)
  }

  function references(table: string, row: Row) {
    for (const ref of meta[table].references) {
      if (ref.fields.some(field => row[field] == null)) continue
      if (!db[ref.table].some(item => ref.fields.every((field, index) => row[field] === item[ref.target[index]]))) {
        throw new ApiV1Error(422, 'INVALID_REFERENCE', `Referencia inválida a ${ref.table}.`, { [ref.fields.join(',')]: 'La relación no existe o no pertenece al mismo contexto.' })
      }
    }
    for (const fields of meta[table].unique) {
      if (fields.some(field => row[field] == null)) continue
      if (db[table].some(item => item[meta[table].id] !== row[meta[table].id] && fields.every(field => same(item[field], row[field])))) {
        fail('DUPLICATE', `Ya existe un registro con ${fields.join(', ')}.`, fields[0])
      }
    }
  }
  // Validate all fixture references, including compound relationships, before starting.
  for (const [table, rows] of Object.entries(db)) for (const row of rows) references(table, row)

  const receipt = (loadId: unknown) => related('recepcion_planta', 'cargaId', loadId)[0]
  const coordination = (loadId: unknown) => find('coordinacion_entrega', find('carga', loadId).coordinacionEntregaId)
  const saleContract = (loadId: unknown) => find('contrato_venta', find('entrega_programada', coordination(loadId).entregaProgramadaId).contratoVentaId)
  const purchases = (loadId: unknown) => asRows(receipt(loadId)?.compras)
  const loadedFor = (loadId: unknown, providerId: unknown) => related('proveedor_carga', 'cargaId', loadId).filter(row => find('campania_x_proveedores', row.cxpId).proveedorId === providerId)

  function protect(table: string, row: Row, current?: Row) {
    const campaign = campaignFor(table, row)
    const originalCampaign = current ? campaignFor(table, current) : undefined
    if (campaign?.estado === 'terminado' || campaign?.cerradaAt || originalCampaign?.estado === 'terminado' || originalCampaign?.cerradaAt) fail('CAMPAIGN_CLOSED', 'La campaña está cerrada.')
    const guide = table === 'guia_remision' ? current : row.guiaRemisionId ? find('guia_remision', row.guiaRemisionId) : undefined
    if (guide?.emitidaAt) fail('GUIDE_IMMUTABLE', 'La guía emitida y sus proveedores/normas son inmutables.')
    if (!current) return
    const movements: Record<string, [string, string][]> = {
      liquidacion_proveedor: [['pago_proveedor','liquidacionProveedorId']],
      liquidacion_transporte: [['pago_transporte','liquidacionTransporteId'],['aplicacion_adelanto','liquidacionTransporteId']],
      factura_venta: [['cobro_venta','facturaVentaId']],
    }
    if ((movements[table] ?? []).some(([child, field]) => related(child, field, current[meta[table].id]).length)) fail('DOCUMENT_HAS_MOVEMENTS', 'Conserva el documento que ya tiene movimientos financieros.')
    if (table === 'factura_venta' && current.estado === 'EMITIDA') fail('INVOICE_IMMUTABLE', 'La factura emitida no se modifica desde el editor de preparación.')
    if (table === 'recepcion_planta' && related('liquidacion_proveedor', 'cargaId', row.cargaId).length && !same(current.compras, row.compras)) fail('RECEIPT_HAS_SETTLEMENTS', 'Los reconocidos ya fueron aplicados a liquidaciones.')
    if (table === 'coordinacion_entrega' && !same(current.fleteAsignado, row.fleteAsignado)) {
      const load = related('carga','coordinacionEntregaId',row.coordinacionEntregaId)[0]
      if (load && related('liquidacion_transporte','cargaId',load.cargaId).length) fail('FREIGHT_APPLIED', 'El flete ya fue liquidado.')
    }
    if (table === 'proveedor_carga' && receipt(row.cargaId)) fail('LOAD_ALREADY_RECEIVED', 'La carga ya tiene recepción; conserva sus orígenes y kilos cargados.')
  }

  function compute(table: string, row: Row, current?: Row) {
    if (table === 'campana') row.estado = campaignStatus(row)
    if (table === 'recepcion_planta') row.idChoferTransporteExterno = coordination(row.cargaId).idChoferTransporteExterno
    if (table === 'historial_chofer') {
      row.idChoferTransporteExterno = find('coordinacion_entrega',row.coordinacionEntregaId).idChoferTransporteExterno
      row.cargaId = related('carga','coordinacionEntregaId',row.coordinacionEntregaId)[0]?.cargaId ?? null
      row.fechaHora = new Date().toISOString()
    }
    if (table === 'entrevista_extencion' && !current) {
      const party = find('campania_x_proveedores', row.camXProvId)
      const fruit = find('fruta', find('campana', party.campaniaId).frutaId)
      const prefix = String(fruit.name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '-')
      row.codigo = `FVV-${prefix}-${row.entrevistaId}`
    }
    if (table === 'contrato_venta' && !row.numero) row.numero = `CTR-MOCK-${row.contratoVentaId}`
    if (table === 'liquidacion_proveedor') {
      const recognized = purchases(row.cargaId).find(item => item.providerId === row.proveedorId)
        ?? fail('RECOGNIZED_WEIGHT_REQUIRED', 'Registra los kilos reconocidos del proveedor antes de liquidar.')
      const origins = loadedFor(row.cargaId, row.proveedorId)
      const prices = new Set(origins.map(item => item.precioCompraKgAplicado ?? find('campania_x_proveedores', item.cxpId).precioCompraKg))
      if (prices.size !== 1 || ![...prices][0]) fail('PURCHASE_PRICE_REQUIRED', 'Completa un precio de compra uniforme para el proveedor.')
      row.kilosReconocidos = recognized.recognizedQuantity
      row.precioKgAplicado = Number([...prices][0])
      row.importeCompra = money(number(row,'kilosReconocidos') * number(row,'precioKgAplicado'))
      const provider = find('proveedor',row.proveedorId)
      if (provider.personaId !== row.personaLiquidacionId && !related('proveedor_x_persona','proveedorId',row.proveedorId).some(item => item.personaId === row.personaLiquidacionId && item.activo)) fail('PERSON_NOT_LINKED', 'La persona debe ser el titular o estar vinculada al proveedor.')
      const person = find('persona',row.personaLiquidacionId)
      row.personaSnapshot = current?.personaSnapshot ?? { nombres: person.nombres, apellidos: person.apellidos, tipoDocumento: person.tipoDocumento, dni: person.numeroDocumento }
      const parameter = db.parametro_uit.find(item => item.anio === Number(String(row.fecha).slice(0,4)))
        ?? fail('UIT_PARAMETER_REQUIRED', 'Falta configurar el parámetro anual de UIT.')
      row.valorUitAplicado = current?.valorUitAplicado ?? parameter.valor
      row.limiteUitAplicado = current?.limiteUitAplicado ?? parameter.limiteUit
    }
    if (table === 'liquidacion_transporte') {
      const freight = coordination(row.cargaId).fleteAsignado
      if (freight == null) fail('FREIGHT_REQUIRED', 'Asigna el flete de la entrega antes de liquidar.')
      row.flete = freight
    }
    if (table === 'factura_venta') {
      const source = saleContract(row.cargaId)
      if (!source.precioKg) fail('SALE_PRICE_REQUIRED', 'Completa el precio del contrato antes de facturar.')
      row.precioKgAplicado = source.precioKg
      if (row.moneda !== source.moneda) fail('CURRENCY_MISMATCH', 'La factura usa la moneda de su contrato.', 'moneda')
      row.importeVenta = money(number(row,'kilosFacturados') * number(row,'precioKgAplicado') - number(row,'descuento') + number(row,'cargos'))
    }
  }

  function business(table: string, row: Row, current?: Row) {
    const positive: Record<string,string[]> = {
      campana:['requerimientoComercial'], campania_x_proveedores:['cantidadProveedor'], contrato_venta:['kilosAcordados'], entrega_programada:['kilosProgramados'], proveedor_carga:['kilosCargados'], proveedor_guia:['kilosAsignados'], factura_venta:['kilosFacturados','importeVenta'],
      pago_proveedor:['monto'],pago_transporte:['monto'],cobro_venta:['monto'],pago_certificado_campana:['monto'],adelanto_transporte:['monto'],aplicacion_adelanto:['monto'],ampliacion_certificado_campana:['kilosAdicionales'],
    }
    for (const field of positive[table] ?? []) if (!(number(row,field) > 0)) fail('POSITIVE_REQUIRED', 'El valor debe ser mayor que cero.',field)
    for (const field of ['monto','precioKg','precioCompraKg','precioCompraKgAplicado','fleteAsignado','kilosOrigen']) if (row[field] != null && !(number(row,field) > 0)) fail('POSITIVE_REQUIRED','El valor debe ser mayor que cero.',field)
    for (const field of ['descuento','cargos','adelantoAcordado','viaticosMovilidad','viaticosInsumos','jabasCargadas','jabasVacias','binesCargados','binesVacios','mallasCargadas','mallasVacias']) if (number(row,field) < 0) fail('NEGATIVE_VALUE','No se admiten valores negativos.',field)
    for (const [start,end] of [['fechaInicio','fechaFin'],['disponibilidadDesde','disponibilidadHasta'],['entregaDesde','entregaHasta'],['vigenciaDesde','fechaVencimiento'],['fechaEmision','fechaVencimiento'],['descargaInicioAt','descargaFinAt']]) {
      if (row[start] && row[end] && Date.parse(String(row[end])) < Date.parse(String(row[start]))) fail('INVALID_DATE_RANGE','La fecha final es anterior a la inicial.',end)
    }
    if (['campania_x_proveedores','acuerdo_transporte','liquidacion_proveedor','liquidacion_transporte','cotizacion_transporte','contrato_venta','factura_venta'].includes(table) && !['PEN', 'USD'].includes(String(row.moneda))) fail('INVALID_CURRENCY','Selecciona soles o dólares.','moneda')
    if (table === 'certificado_campana' && row.moneda != null && !['PEN', 'USD'].includes(String(row.moneda))) fail('INVALID_CURRENCY','Selecciona soles o dólares.','moneda')
    if (table === 'campana' && row.estado !== 'terminado' && db.campana.some(item => item.campaniaId !== row.campaniaId && item.frutaId === row.frutaId && item.estado !== 'terminado')) fail('ACTIVE_CAMPAIGN_EXISTS','La fruta ya tiene una campaña habilitada.')
    if (table === 'campania_x_proveedores' && row.tipoProveedor === 'acopio' && row.frutaConvencionalEstimado != null) fail('PRODUCER_ONLY','La estimación convencional corresponde solo a productores.')
    if (table === 'finca') {
      if (number(row,'haTotalFinca') < 0 || number(row,'haCultivo') < 0 || number(row,'haCultivo') > number(row,'haTotalFinca')) fail('INVALID_HECTARES','Las hectáreas de cultivo deben estar entre cero y el total.')
      if (Math.abs(number(row,'latitud')) > 90 || Math.abs(number(row,'longitud')) > 180) fail('INVALID_COORDINATES','Coordenadas fuera del rango geográfico.')
    }
    if (table === 'empresa_transporte_externo') {
      if (row.tipoTransportista === 'EMPRESA' ? !/^\d{11}$/.test(String(row.ruc ?? '')) : !row.tipoDocumento || !String(row.numeroDocumento ?? '').trim()) fail('TRANSPORT_ID_REQUIRED','Completa RUC de empresa o documento del independiente.')
    }
    if (['entrevista_extencion','analisis_calidad','medicion_mtd','origen_entrega','origen_carga'].includes(table)) {
      const party = find('campania_x_proveedores',row.cxpId ?? row.camXProvId)
      const farm = find('finca',row.fincaId)
      if (party.proveedorId !== farm.proveedorId) fail('FARM_PROVIDER_MISMATCH','La finca no pertenece al proveedor de la participación.')
      if (table === 'entrevista_extencion' && party.tipoProveedor !== 'productor') fail('PRODUCER_ONLY','Solo los productores registran entrevistas.')
    }
    if (table === 'examen_proveedor') {
      if (row.cxpId && find('campania_x_proveedores',row.cxpId).proveedorId !== row.proveedorId) fail('PROVIDER_MISMATCH','El examen y la participación deben corresponder al mismo proveedor.')
      if (row.fincaId && find('finca',row.fincaId).proveedorId !== row.proveedorId) fail('FARM_PROVIDER_MISMATCH','La finca no pertenece al proveedor.')
      if (row.estadoExamen !== 'Pendiente' && !row.fechaEnvio) fail('SHIP_DATE_REQUIRED','Ingresa la fecha de envío.','fechaEnvio')
      if (row.estadoExamen === 'Con resultado' && !row.resultado) fail('EXAM_RESULT_REQUIRED','Ingresa el resultado.','resultado')
      if (row.fechaEnvio && String(row.fechaEnvio) < String(row.fecha)) fail('INVALID_DATE_RANGE','El envío no puede ser anterior al examen.')
      if (row.estadoExamen === 'Pendiente') { row.fechaEnvio = null; row.resultado = null }
      else if (row.estadoExamen === 'Enviado') row.resultado = null
    }
    if (table === 'entrega_programada' && !String(row.destino).trim()) fail('DESTINATION_REQUIRED','Ingresa el destino como texto.','destino')
    if (table === 'historial_chofer') {
      const stages = ['EN_CARGA','SALIDA','EN_CAMINO','LLEGADA','CIERRE']
      const history = related(table,'coordinacionEntregaId',row.coordinacionEntregaId)
      const previous = Math.max(-1,...history.map(item => stages.indexOf(String(item.estado))))
      if (stages.indexOf(String(row.estado)) !== previous + 1) fail('INVALID_DRIVER_STAGE','Registra la siguiente etapa del despacho sin saltos.')
      if (row.estado === 'SALIDA' && !related('guia_remision','cargaId',row.cargaId).some(item => item.emitidaAt)) fail('ISSUED_GUIDE_REQUIRED','Emite la guía antes de registrar la salida.')
      if (row.estado === 'CIERRE' && !receipt(row.cargaId)?.cierreFisicoAt) fail('RECEIPT_REQUIRED','Completa el cierre físico antes del cierre del chofer.')
    }
    if (table === 'acuerdo_transporte') {
      if (row.estado === 'CONFIRMADO' && ['tipoPago','montoAcordado','fechaAcuerdo','fechaPagoFinal'].some(field => row[field] == null)) fail('AGREEMENT_INCOMPLETE','Completa el acuerdo antes de confirmarlo.')
      if (row.montoAcordado != null && number(row,'adelantoAcordado') > number(row,'montoAcordado')) fail('ADVANCE_EXCEEDS_AGREEMENT','El adelanto supera el acuerdo.')
    }
    if (table === 'coordinacion_entrega') {
      const start = Date.parse(String(row.inicioProgramado)), end = Date.parse(String(row.finProgramado))
      if (end <= start) fail('INVALID_TIME_RANGE','El fin debe ser posterior al inicio.')
      const agreement = find('acuerdo_transporte',row.acuerdoTransporteId)
      if (agreement.estado !== 'CONFIRMADO') fail('AGREEMENT_INCOMPLETE','Confirma el acuerdo antes de coordinar la entrega.')
      const other = db.coordinacion_entrega.filter(item => item.coordinacionEntregaId !== row.coordinacionEntregaId)
      if (other.some(item => item.idChoferTransporteExterno === row.idChoferTransporteExterno && start < Date.parse(String(item.finProgramado)) && end > Date.parse(String(item.inicioProgramado)))) fail('DRIVER_OVERLAP','El chofer tiene una reserva superpuesta.')
      const total = other.filter(item => item.acuerdoTransporteId === row.acuerdoTransporteId).reduce((n,item) => n + number(item,'fleteAsignado'),number(row,'fleteAsignado'))
      if (total > number(agreement,'montoAcordado') && !String(row.observacionFlete ?? '').trim()) fail('FREIGHT_OBSERVATION_REQUIRED','Explica el exceso de flete sobre el acuerdo.','observacionFlete')
    }
    if (table === 'recepcion_planta') validateReceipt(row,current)
    if (table === 'factura_venta') {
      const rec = receipt(row.cargaId)
      if (!rec?.pesoPlantaKg) fail('RECEIPT_REQUIRED','Registra la recepción antes de facturar.')
      const total = related('factura_venta','cargaId',row.cargaId).filter(item => item.facturaVentaId !== row.facturaVentaId).reduce((n,item) => n+number(item,'kilosFacturados'),number(row,'kilosFacturados'))
      if (total > number(rec,'pesoPlantaKg') + 0.01) fail('INVOICED_WEIGHT_EXCEEDED','Las facturas superan los kilos recibidos de la carga.')
    }
    if (table === 'adelanto_transporte') {
      const agreement = find('acuerdo_transporte',row.acuerdoTransporteId)
      if (agreement.tipoPago !== 'CON_ADELANTO' || agreement.estado !== 'CONFIRMADO') fail('ADVANCE_NOT_AGREED','El acuerdo no habilita adelantos.')
      if (sum(table,'acuerdoTransporteId',row.acuerdoTransporteId,'monto') + number(row,'monto') > number(agreement,'adelantoAcordado')) fail('ADVANCE_EXCEEDED','El desembolso supera el adelanto acordado.')
    }
    if (table === 'aplicacion_adelanto') {
      const advance = find('adelanto_transporte',row.adelantoTransporteId)
      const settlement = find('liquidacion_transporte',row.liquidacionTransporteId)
      if (coordination(settlement.cargaId).acuerdoTransporteId !== advance.acuerdoTransporteId) fail('ADVANCE_CONTEXT_MISMATCH','El adelanto pertenece a otra empresa o campaña.')
      if (sum(table,'adelantoTransporteId',row.adelantoTransporteId,'monto') + number(row,'monto') > number(advance,'monto')) fail('ADVANCE_UNAVAILABLE','La aplicación supera el adelanto disponible.')
    }
    const targets: Record<string,[string,string,string]> = {
      pago_proveedor:['liquidacion_proveedor','liquidacionProveedorId','importeCompra'],
      pago_transporte:['liquidacion_transporte','liquidacionTransporteId','flete'],
      aplicacion_adelanto:['liquidacion_transporte','liquidacionTransporteId','flete'],
      cobro_venta:['factura_venta','facturaVentaId','importeVenta'],
      pago_certificado_campana:['certificado_campana','certificadoId','costo'],
    }
    if (targets[table]) {
      const [parent,field,amount] = targets[table]
      const document = find(parent,row[field])
      if (table === 'cobro_venta' && document.estado !== 'EMITIDA') fail('INVOICE_NOT_ISSUED','Emite la factura antes de registrar cobros.')
      let limit = number(document,amount), paid = sum(table,field,row[field],'monto')
      if (parent === 'liquidacion_transporte') {
        limit += related('gasto_transporte','cargaId',document.cargaId).filter(item => item.incluidoEnLiquidacion).reduce((n,item) => n+number(item,'monto'),0)
        paid = sum('pago_transporte',field,row[field],'monto') + sum('aplicacion_adelanto',field,row[field],'monto')
      }
      if (paid + number(row,'monto') > limit + 0.005) fail('BALANCE_EXCEEDED','El movimiento supera el saldo del documento.','monto')
    }
  }

  function validateReceipt(row: Row, current?: Row) {
    const entries = asRows(row.compras)
    const providers = new Set()
    for (const item of entries) {
      if (!Number.isSafeInteger(item.providerId) || providers.has(item.providerId)) fail('INVALID_RECOGNIZED_BREAKDOWN','Proveedor inválido o repetido en compras.')
      providers.add(item.providerId)
      const loaded = loadedFor(row.cargaId,item.providerId).reduce((n,origin) => n+number(origin,'kilosCargados'),0)
      if (typeof item.recognizedQuantity !== 'number' || item.recognizedQuantity <= 0 || item.recognizedQuantity > loaded + 0.01) fail('INVALID_RECOGNIZED_WEIGHT','Los reconocidos deben ser positivos y no superar los cargados del proveedor.')
    }
    if (row.pesoPlantaKg != null && (number(row,'pesoPlantaKg') <= 0 || Math.abs(entries.reduce((n,item) => n+number(item,'recognizedQuantity'),0) - number(row,'pesoPlantaKg')) > 0.01)) fail('RECOGNIZED_TOTAL_MISMATCH','El reparto reconocido debe sumar el peso de planta (tolerancia 0,01 kg).')
    if (number(row,'descarteKg') < 0 || number(row,'descarteKg') > number(row,'pesoPlantaKg')) fail('INVALID_DISCARD','Descarte fuera del peso de planta.')
    if (row.huboDescarte === false && number(row,'descarteKg') !== 0 || row.huboDescarte === true && number(row,'descarteKg') <= 0) fail('INVALID_DISCARD','Revisa la confirmación de descarte.')
    if (row.jabasDevueltas != null && (number(row,'jabasDevueltas') < 0 || row.jabasIniciales != null && number(row,'jabasDevueltas') > number(row,'jabasIniciales'))) fail('INVALID_CRATES','Revisa las jabas devueltas.')
    if (current?.cierreAdministrativoAt) fail('RECEIPT_CLOSED','La recepción tiene cierre administrativo.')
  }

  function action(table: string, current: Row, body: Row): Row {
    const row: Row = { ...current, updatedAt: new Date().toISOString() }
    protect(table,row)
    if (table === 'factura_venta') {
      if (current.estado === 'EMITIDA') fail('INVOICE_IMMUTABLE','La factura ya fue emitida.')
      Object.assign(row,body,{ estado:'EMITIDA' })
      if (row.fechaVencimiento && String(row.fechaVencimiento) < String(row.fechaEmision)) fail('INVALID_DATE_RANGE','El vencimiento no puede ser anterior a la emisión.')
    } else if (table === 'guia_remision') {
      if (current.emitidaAt) fail('GUIDE_IMMUTABLE','La guía ya fue emitida.')
      const assignments = related('proveedor_guia','guiaRemisionId',row.guiaRemisionId)
      if (!assignments.length || Math.abs(assignments.reduce((n,item) => n+number(item,'kilosAsignados'),0) - number(row,'pesoBrutoKg')) > 0.01) fail('GUIDE_WEIGHT_MISMATCH','Distribuye todos los kilos de la guía entre sus proveedores.')
      const standards = related('guia_x_norma','guiaRemisionId',row.guiaRemisionId).map(item => find('norma',item.normaId).codigo)
      row.contenido = { ...(row.contenido as Row), standardCodes:standards }
      row.emitidaAt = new Date().toISOString()
    } else {
      if (current.estado !== 'en proceso') fail('CAMPAIGN_NOT_IN_PROGRESS','Solo se cierra una campaña en proceso.')
      const loads = db.carga.filter(item => campaignFor('carga',item)?.campaniaId === row.campaniaId)
      if (loads.some(item => !receipt(item.cargaId)?.cierreFisicoAt || !receipt(item.cargaId)?.cierreAdministrativoAt)) fail('CAMPAIGN_PENDING','Hay cargas sin cierre físico/administrativo.')
      const financial = (name: string, field: string, child: string, amount: string) => db[name].filter(item => campaignFor(name,item)?.campaniaId === row.campaniaId).some(item => sum(child,field,item[meta[name].id],'monto') + 0.005 < number(item,amount))
      if (financial('liquidacion_proveedor','liquidacionProveedorId','pago_proveedor','importeCompra') || financial('factura_venta','facturaVentaId','cobro_venta','importeVenta') || financial('certificado_campana','certificadoId','pago_certificado_campana','costo')) fail('CAMPAIGN_PENDING','Hay documentos con saldo pendiente.')
      for (const load of loads) {
        const transport = related('liquidacion_transporte','cargaId',load.cargaId)[0]
        const suppliers = new Set(related('proveedor_carga','cargaId',load.cargaId).map(item => find('campania_x_proveedores',item.cxpId).proveedorId))
        if (!transport || [...suppliers].some(provider => !related('liquidacion_proveedor','cargaId',load.cargaId).some(item => item.proveedorId === provider))) fail('CAMPAIGN_PENDING','Hay compras o transportes sin liquidar.')
        const total = number(transport,'flete') + related('gasto_transporte','cargaId',load.cargaId).filter(item => item.incluidoEnLiquidacion).reduce((n,item) => n+number(item,'monto'),0)
        const paid = sum('pago_transporte','liquidacionTransporteId',transport.liquidacionTransporteId,'monto') + sum('aplicacion_adelanto','liquidacionTransporteId',transport.liquidacionTransporteId,'monto')
        if (Math.abs(total-paid) > 0.005) fail('CAMPAIGN_PENDING','Hay transporte con saldo pendiente.')
        const invoices = related('factura_venta','cargaId',load.cargaId)
        if (invoices.some(item => item.estado !== 'EMITIDA') || Math.abs(invoices.reduce((n,item) => n+number(item,'kilosFacturados'),0) - number(receipt(load.cargaId)!,'pesoPlantaKg')) > 0.01) fail('CAMPAIGN_PENDING','Hay facturación incompleta.')
        if (!related('historial_chofer','coordinacionEntregaId',load.coordinacionEntregaId).some(item => item.estado === 'CIERRE')) fail('CAMPAIGN_PENDING','Hay despachos sin cierre del chofer.')
      }
      if (db.adelanto_transporte.filter(item => campaignFor('adelanto_transporte',item)?.campaniaId === row.campaniaId).some(item => number(item,'monto') - sum('aplicacion_adelanto','adelantoTransporteId',item.adelantoTransporteId,'monto') > 0.005)) fail('CAMPAIGN_PENDING','Hay adelantos de transporte sin conciliar.')
      // Additional documentary/operational checks still belong to the real backend (see guide).
      if (db.entrega_programada.some(item => campaignFor('entrega_programada',item)?.campaniaId === row.campaniaId && !related('coordinacion_entrega','entregaProgramadaId',item.entregaProgramadaId).some(coord => related('carga','coordinacionEntregaId',coord.coordinacionEntregaId).length))) fail('CAMPAIGN_PENDING','Hay entregas sin completar.')
      row.estado = 'terminado'; row.cerradaAt = new Date().toISOString(); row.cerradaPorUsuarioId = 1; row.motivoCierre = body.motivoCierre
    }
    return row
  }

  const compiled = Object.entries(contract.paths).map(([template,item]) => ({
    template, item, names: [...template.matchAll(/\{(\w+)\}/g)].map(match => match[1]),
    pattern: new RegExp(`^${template.replace(/\{\w+\}/g,'(\\d+)')}/?$`),
  }))
  const resourceFor = (template: string): Resource => contract.paths[template.replace(/\/\{id\}$/,'')]['x-resource']!

  const buildOperationsContext = (): Row => ({
    localDocuments: localLinks,
    campaigns: db.campana,
    fruits: db.fruta,
    varieties: db.fruta_derivada,
    providers: db.proveedor,
    people: db.persona,
    farms: db.finca,
    providerPeople: db.proveedor_x_persona,
    providerFruits: db.proveedor_x_fruta,
    providerVarieties: db.proveedor_x_fruta_derivada,
    providerCertificates: db.certificado_proveedor,
    exams: db.examen_proveedor,
    clients: db.cliente_negocio,
    participations: db.campania_x_proveedores,
    interviews: db.entrevista_extencion,
    certificates: db.certificado_campana,
    coverage: db.certificado_campana_x_proveedor,
    expansions: db.ampliacion_certificado_campana,
    certificatePayments: db.pago_certificado_campana,
    requirements: db.cliente_negocio_campana,
    requirementVarieties: db.cliente_negocio_campana_x_fruta_derivada,
    contracts: db.contrato_venta,
    deliveries: db.entrega_programada,
    deliveryVarieties: db.entrega_x_fruta_derivada,
    carriers: db.empresa_transporte_externo,
    vehicles: db.vehiculo_externo,
    drivers: db.chofer_transporte_externo,
    requests: db.solicitud_transporte,
    invitations: db.invitacion_transporte,
    quotations: db.cotizacion_transporte,
    agreements: db.acuerdo_transporte,
    coordinations: db.coordinacion_entrega,
    deliveryOrigins: db.origen_entrega,
    harvests: db.cosecha,
    analyses: db.analisis_calidad,
    measurements: db.medicion_mtd,
    loads: db.carga,
    loadProviders: db.proveedor_carga,
    loadOrigins: db.origen_carga,
    loadExpenses: db.gasto_carga,
    guides: db.guia_remision,
    guideProviders: db.proveedor_guia,
    guideStandards: db.guia_x_norma,
    standards: db.norma,
    receipts: db.recepcion_planta,
    histories: db.historial_chofer,
    providerSettlements: db.liquidacion_proveedor,
    transportSettlements: db.liquidacion_transporte,
    transportExpenses: db.gasto_transporte,
    advances: db.adelanto_transporte,
    applications: db.aplicacion_adelanto,
    providerPayments: db.pago_proveedor,
    transportPayments: db.pago_transporte,
    uit: db.parametro_uit,
    invoices: db.factura_venta,
    collections: db.cobro_venta,
  })

  async function handle(request: IncomingMessage, url: URL) {
    await qualityDocumentsReady
    refreshCampaignStatuses()
    let pathname = url.pathname
    if (pathname.startsWith('/mock-api/api')) pathname = pathname.slice('/mock-api/api'.length)
    else if (pathname.startsWith('/mock-api/v1')) pathname = pathname.slice('/mock-api/v1'.length)
    else if (pathname.startsWith('/mock-api')) pathname = pathname.slice('/mock-api'.length)
    else if (pathname.startsWith('/api')) pathname = pathname.slice('/api'.length)

    if (pathname.startsWith('/v1/')) pathname = pathname.slice('/v1'.length)
    else if (pathname === '/v1') pathname = '/'
    if (pathname.startsWith('/api/')) pathname = pathname.slice('/api'.length)
    else if (pathname === '/api') pathname = '/'

    pathname = pathname || '/'
    if ((pathname === '/archivos-locales' || pathname === '/documentos') && request.method === 'POST') {
      const id = nextLocalFileId++
      const chunks: Buffer[] = []
      let size = 0
      for await (const chunk of request) {
        const buffer = Buffer.from(chunk)
        size += buffer.length
        if (size > 11 * 1024 * 1024) throw new ApiV1Error(413, 'FILE_TOO_LARGE', 'El archivo supera 10 MB.')
        chunks.push(buffer)
      }
      const form = await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': request.headers['content-type'] ?? '' } }).formData().catch(() => { throw new ApiV1Error(400, 'INVALID_MULTIPART', 'No se pudo leer el archivo adjunto.') })
      const uploaded = form.get('archivo')
      if (!uploaded || typeof uploaded === 'string') throw new ApiV1Error(400, 'FILE_REQUIRED', 'Adjunta un archivo.')
      const bytes = Buffer.from(await uploaded.arrayBuffer())
      const file = { id: String(id), url: `data:${uploaded.type};base64,${bytes.toString('base64')}`, name: uploaded.name, type: uploaded.type, size: uploaded.size }
      localFiles.set(id, file)
      return { status: 201, data: file }
    }
    if ((pathname === '/archivos-locales/vinculos' || pathname === '/documentos/vinculos') && request.method === 'GET') return { status: 200, data: localLinks }
    if ((pathname === '/archivos-locales/vinculos' || pathname === '/documentos/vinculos') && request.method === 'POST') {
      const body = await readJson(request) as { tipo: string; entidadId: number; archivoId: number | string }
      const file = localFiles.get(Number(body.archivoId)) ?? { id: String(body.archivoId), url: `/api/documentos/${body.archivoId}`, name: 'documento.pdf', type: 'application/pdf', size: 128 }
      localLinks = localLinks.filter(item => !(item.tipo === body.tipo && item.entidadId === Number(body.entidadId)))
      localLinks.push({ tipo: body.tipo, entidadId: Number(body.entidadId), archivoId: String(body.archivoId), ...file })
      return { status: 201, data: { ok: true } }
    }
    const unlinkRoute = /^\/(?:archivos-locales|documentos)\/vinculos\/([^/]+)\/(\d+)$/.exec(pathname)
    if (unlinkRoute && request.method === 'DELETE') {
      const tipo = decodeURIComponent(unlinkRoute[1])
      const entidadId = Number(unlinkRoute[2])
      localLinks = localLinks.filter(item => !(item.tipo === tipo && item.entidadId === entidadId))
      return { status: 200, data: { ok: true } }
    }
    const fileContentRoute = /^\/(?:archivos-locales|documentos)\/(\d+)(?:\/contenido)?$/.exec(pathname)
    if (fileContentRoute && request.method === 'GET') {
      const id = Number(fileContentRoute[1])
      const file = localFiles.get(id) ?? { id: String(id), url: `/api/documentos/${id}`, name: `documento-${id}.pdf`, type: 'application/pdf', size: 128 }
      return { status: 200, data: file }
    }
    if (pathname === '/auth/login' && request.method === 'POST') {
      const body = await readJson(request) as { usuario?: string; password?: string }
      const username = String(body?.usuario ?? '').trim().toLowerCase()
      const u = db.usuario.find(row => String(row.usuario).toLowerCase() === username && row.activo)
        ?? (username === 'admin' ? db.usuario.find(row => row.usuario === 'admin-demo') : undefined)
        ?? (username === 'chofer' ? db.usuario.find(row => row.usuario === 'chofer-demo') : undefined)
        ?? (username ? undefined : db.usuario.find(row => row.activo))
      if (!u) throw new ApiV1Error(401, 'UNAUTHORIZED', 'Credenciales inválidas')
      const p = db.persona.find(row => row.personaId === u.personaId)
      const r = db.rol.find(row => row.rolId === u.rolId)
      const user = {
        usuarioId: u.usuarioId,
        usuario: u.usuario,
        personaId: u.personaId,
        nombres: p?.nombres ?? '',
        apellidos: p?.apellidos ?? '',
        correo: p?.correo ?? null,
        rol: { rolId: u.rolId, nombre: r?.nombre ?? '' },
      }
      return { status: 200, data: { accessToken: `mock-token-${u.usuarioId}`, user } }
    }
    if (pathname === '/auth/me' && request.method === 'GET') {
      const authHeader = request.headers.authorization
      const tokenMatch = /mock-token-(\d+)/.exec(authHeader ?? '')
      const uid = tokenMatch ? Number(tokenMatch[1]) : (db.usuario.find(u => u.activo)?.usuarioId ?? 1)
      const u = db.usuario.find(row => row.usuarioId === uid && row.activo) ?? db.usuario[0]
      if (!u) throw new ApiV1Error(401, 'UNAUTHORIZED', 'No autorizado')
      const p = db.persona.find(row => row.personaId === u.personaId)
      const r = db.rol.find(row => row.rolId === u.rolId)
      return { status: 200, data: { usuarioId: u.usuarioId, usuario: u.usuario, personaId: u.personaId, nombres: p?.nombres ?? '', apellidos: p?.apellidos ?? '', correo: p?.correo ?? null, rol: { rolId: u.rolId, nombre: r?.nombre ?? '' } } }
    }
    if (pathname === '/auth/recuperar-password' && request.method === 'POST') {
      const body = await readJson(request) as { correo?: string }
      const correo = String(body?.correo ?? '').trim().toLowerCase()
      const matched = db.usuario.some(u => u.activo && db.persona.some(p => p.personaId === u.personaId && String(p.correo ?? '').trim().toLowerCase() === correo))
      if (!correo || !matched) throw new ApiV1Error(404, 'NOT_FOUND', 'No se encontró una cuenta activa asociada a ese correo electrónico.')
      return { status: 200, data: { message: 'Se envió una contraseña temporal a tu correo electrónico.' } }
    }
    const userByIdRoute = /^\/auth\/usuarios\/(\d+)$/.exec(pathname)
    if (userByIdRoute && request.method === 'GET') {
      const uid = Number(userByIdRoute[1])
      const u = db.usuario.find(row => row.usuarioId === uid && row.activo)
      if (!u) throw new ApiV1Error(404, 'NOT_FOUND', 'Usuario no encontrado')
      const p = db.persona.find(row => row.personaId === u.personaId)
      const r = db.rol.find(row => row.rolId === u.rolId)
      return { status: 200, data: { usuarioId: u.usuarioId, usuario: u.usuario, personaId: u.personaId, nombres: p?.nombres ?? '', apellidos: p?.apellidos ?? '', correo: p?.correo ?? null, rol: { rolId: u.rolId, nombre: r?.nombre ?? '' } } }
    }
    if (pathname === '/chofer/contexto' && request.method === 'GET') {
      return { status: 200, data: buildOperationsContext() }
    }
    const driverLoadDataRoute = /^\/chofer\/cargas\/(\d+)\/datos$/.exec(pathname)
    if (driverLoadDataRoute && request.method === 'PATCH') {
      const id = Number(driverLoadDataRoute[1])
      const carga = db.carga.find(row => row.cargaId === id)
      if (!carga) throw new ApiV1Error(404, 'NOT_FOUND', 'Carga no encontrada')
      const body = await readJson(request) as Row
      Object.assign(carga, { updatedAt: new Date().toISOString() })
      if (body.fechaCarga !== undefined) carga.fechaCarga = body.fechaCarga
      if (body.observacionesCarga !== undefined) carga.observaciones = body.observacionesCarga
      return { status: 200, data: { ok: true, carga } }
    }
    const route = compiled.find(item => item.pattern.test(pathname))
    if (!route) throw new ApiV1Error(404,'ROUTE_NOT_FOUND','Ruta V1 no documentada.')
    const method = (request.method ?? 'GET').toLowerCase() as 'get'|'post'|'patch'|'delete'
    if (!['get','post','patch','delete'].includes(method)) throw new ApiV1Error(405,'METHOD_NOT_ALLOWED','Método no definido para esta ruta.')
    const operation = route.item[method]
    if (!operation) throw new ApiV1Error(405,'METHOD_NOT_ALLOWED','Método no definido para esta ruta.')
    const captures = route.pattern.exec(pathname)!
    const params = Object.fromEntries(route.names.map((name,index) => [name,Number(captures[index+1])]))
    if (Object.values(params).some(value => !Number.isSafeInteger(value) || value <= 0)) throw new ApiV1Error(400,'INVALID_ID','Los IDs deben ser enteros positivos.')
    const table = route.item['x-action']?.table ?? resourceFor(route.template).table
    const definition = meta[table]
    const resource = route.item['x-action'] ? undefined : resourceFor(route.template)
    if (resource?.parentTable) find(resource.parentTable,params.parentId)
    const rows = db[table].filter(row => (!resource?.scope || row[resource.scope] === params.parentId)
      && (!resource?.actorScope || coordination(row.cargaId).idChoferTransporteExterno === 1))
    const current = params.id ? rows.find(row => row[definition.id] === params.id) : undefined
    if (params.id && !current) throw new ApiV1Error(404,'NOT_FOUND','El recurso no existe en este contexto.')
    let status = 200, data: unknown
    if (method === 'get') {
      if (current) data = current
      else {
        const allowed = operation.parameters?.filter(parameter => parameter.in === 'query') ?? []
        const query: Row = { page:1,pageSize:20 }
        for (const [key,raw] of url.searchParams) {
          const parameter = allowed.find(item => item.name === key)
          if (!parameter) throw new ApiV1Error(400,'INVALID_QUERY',`Filtro no permitido: ${key}.`)
          const types = Array.isArray(parameter.schema.type) ? parameter.schema.type : [parameter.schema.type]
          const value = types.includes('integer') || types.includes('number') ? Number(raw) : types.includes('boolean') ? raw === 'true' ? true : raw === 'false' ? false : raw : raw
          const errors = validateV1Schema(contract,parameter.schema,value,key)
          if (Object.keys(errors).length) throw new ApiV1Error(400,'INVALID_QUERY','Revisa los filtros.',errors)
          query[key] = value
        }
        const filtered = rows.filter(row => Object.entries(query).every(([key,value]) => ['page','pageSize'].includes(key) || row[key] === value))
          .sort((a,b) => number(a,definition.id) - number(b,definition.id))
        const page = Number(query.page), pageSize = Number(query.pageSize)
        data = { items:filtered.slice((page-1)*pageSize,page*pageSize),total:filtered.length,page,pageSize }
      }
    } else if (method === 'delete') {
      protect(table,current!,current)
      const referenced = Object.entries(meta).some(([child,def]) => def.references.some(ref => ref.table === table && db[child].some(row => ref.fields.every((field,index) => row[field] != null && row[field] === current![ref.target[index]]))))
      if (referenced) fail('RESOURCE_IN_USE','Conserva el recurso que tiene referencias o historial.')
      db[table] = db[table].filter(row => row !== current)
      status = 204
    } else {
      const input = await readJson(request)
      const errors = validateV1Schema(contract,operation.requestBody!.content['application/json'].schema,input)
      if (Object.keys(errors).length) throw new ApiV1Error(422,'VALIDATION_FAILED','Revisa los campos enviados.',errors)
      let row: Row
      if (route.item['x-action']) row = action(table,current!,input as Row)
      else {
        const now = new Date().toISOString()
        row = Object.fromEntries(Object.entries(contract.components.schemas[definition.schema].properties!).map(([key,prop]) => [key,
          current?.[key] ?? definition.defaults[key] ?? (key === 'createdAt' || key === 'updatedAt' || prop.format === 'date-time' && !Array.isArray(prop.type) ? now : null),
        ]))
        Object.assign(row,current,input,{ [definition.id]:current?.[definition.id] ?? nextIds[table],updatedAt:now })
        if (resource?.scope) row[resource.scope] = params.parentId
        if ('registradoPorUsuarioId' in row && !current) row.registradoPorUsuarioId = 1
        protect(table,row,current)
        references(table,row)
        compute(table,row,current)
        business(table,row,current)
        references(table,row)
      }
      const outputErrors = validateV1Schema(contract,{ $ref:`#/components/schemas/${definition.schema}` },row)
      if (Object.keys(outputErrors).length) throw new ApiV1Error(422,'INCOMPLETE_RESOURCE','El recurso no satisface el contrato.',outputErrors)
      if (current) db[table][db[table].indexOf(current)] = row
      else { db[table].push(row); nextIds[table]++; status = 201 }
      data = row
    }
    const responseSchema = operation.responses[String(status)]?.content?.['application/json'].schema
    if (responseSchema) {
      const errors = validateV1Schema(contract,responseSchema,data)
      if (Object.keys(errors).length) throw new ApiV1Error(500,'MOCK_CONTRACT_ERROR','La respuesta ficticia incumple OpenAPI.',errors)
    }
    return { status,data }
  }

  // Serialize in-memory mutations so simultaneous requests cannot spend the same balance twice.
  let queue = Promise.resolve()
  return (request,response,next) => {
    const url = new URL(request.url ?? '/','http://mock.local')
    const isMockV1 = url.pathname === '/mock-api/v1' || url.pathname.startsWith('/mock-api/v1/')
    const isMockApi = url.pathname === '/mock-api/api' || url.pathname.startsWith('/mock-api/api/')
    const isMockAuthOrSpecial = url.pathname.startsWith('/mock-api/auth')
      || url.pathname.startsWith('/mock-api/archivos-locales') || url.pathname.startsWith('/mock-api/documentos')
      || url.pathname.startsWith('/mock-api/chofer')
    const isDirectApi = url.pathname === '/api' || url.pathname.startsWith('/api/')
      || url.pathname === '/v1' || url.pathname.startsWith('/v1/')
    if (!isMockV1 && !isMockApi && !isMockAuthOrSpecial && !isDirectApi) return next()
    response.setHeader('Content-Type','application/json; charset=utf-8')
    response.setHeader('Cache-Control','no-store')
    response.setHeader('Pragma','no-cache')
    queue = queue.then(async () => {
      const snapshot: Database = structuredClone(db)
      try {
        const result = await handle(request,url)
        response.statusCode = result.status
        response.end(result.data === undefined ? undefined : JSON.stringify(result.data))
      } catch (error) {
        db = snapshot
        const failure = error instanceof ApiV1Error ? error : new ApiV1Error(500,'MOCK_ERROR',error instanceof Error ? error.message : 'Error del mock.')
        response.statusCode = failure.status
        response.end(JSON.stringify({ statusCode:failure.status,code:failure.code,message:failure.message,fieldErrors:failure.fieldErrors }))
      }
    })
  }
}
