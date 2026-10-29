import fs from 'node:fs'
import path from 'node:path'

export type Row = Record<string, unknown>
export type Database = Record<string, Row[]>
export interface Schema {
  $ref?: string
  type?: string | string[]
  properties?: Record<string, Schema>
  required?: string[]
  enum?: unknown[]
  items?: Schema
  additionalProperties?: boolean | Schema
  minLength?: number
  maxLength?: number
  minProperties?: number
  minimum?: number
  maximum?: number
  multipleOf?: number
  format?: string
  readOnly?: boolean
  default?: unknown
}
export interface Table {
  id: string
  schema: string
  defaults: Row
  references: { fields: string[]; table: string; target: string[] }[]
  unique: string[][]
}
export interface Resource { table: string; id: string; scope: string | null; parentTable: string | null; mode: string; actorScope?: string }
export interface Operation {
  parameters?: { name: string; in: string; schema: Schema }[]
  requestBody?: { content: { 'application/json': { schema: Schema } } }
  responses: Record<string, { content?: { 'application/json': { schema: Schema } } }>
}
export interface PathItem {
  'x-resource'?: Resource
  'x-action'?: { table: string }
  get?: Operation
  post?: Operation
  patch?: Operation
  delete?: Operation
}
export interface Contract {
  'x-database': Record<string, Table>
  paths: Record<string, PathItem>
  components: { schemas: Record<string, Schema> }
}

export class FutureError extends Error {
  status: number
  code: string
  fieldErrors: Record<string, string>
  constructor(status: number, code: string, message: string, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}

export function resolveSchema(contract: Contract, schema: Schema): Schema {
  return schema.$ref ? contract.components.schemas[schema.$ref.split('/').at(-1)!] : schema
}

/** Validator for the JSON Schema keywords emitted by contract:generate, including nullable types. */
export function validateFutureSchema(contract: Contract, inputSchema: Schema, value: unknown, prefix = ''): Record<string, string> {
  const schema = resolveSchema(contract, inputSchema)
  const errors: Record<string, string> = {}
  const key = prefix || 'body'
  const types = Array.isArray(schema.type) ? schema.type : [schema.type]
  if (value === null && types.includes('null')) return errors
  const valid = !schema.type || types.some(type => type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
    : type === 'array' ? Array.isArray(value) : type === 'integer' ? Number.isSafeInteger(value)
      : type === 'number' ? typeof value === 'number' && Number.isFinite(value) : type === typeof value)
  if (!valid) return { [key]: `Tipo esperado: ${types.join(' | ')}.` }
  if (schema.enum && !schema.enum.includes(value)) errors[key] = 'Valor fuera del catálogo permitido.'
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.trim().length < schema.minLength) errors[key] = 'Texto requerido.'
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors[key] = `Máximo ${schema.maxLength} caracteres.`
    if (schema.format === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) errors[key] = 'Fecha válida YYYY-MM-DD requerida.'
    if (schema.format === 'date-time' && (!/(Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(Date.parse(value)))) errors[key] = 'Instante ISO 8601 con zona horaria requerido.'
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors[key] = `Mínimo ${schema.minimum}.`
    if (schema.maximum !== undefined && value > schema.maximum) errors[key] = `Máximo ${schema.maximum}.`
    if (schema.multipleOf !== undefined) {
      const scaled = value / schema.multipleOf
      if (Math.abs(scaled - Math.round(scaled)) > Math.max(0.00001, Number.EPSILON * Math.abs(scaled) * 4)) errors[key] = 'Exceso de decimales para este campo.'
    }
  }
  if (Array.isArray(value)) value.forEach((item, index) => Object.assign(errors, validateFutureSchema(contract, schema.items ?? {}, item, `${prefix}[${index}]`)))
  else if (value && typeof value === 'object') {
    const row = value as Row
    if (schema.minProperties && Object.keys(row).length < schema.minProperties) errors[key] = 'Envía al menos un campo editable.'
    for (const field of schema.required ?? []) if (row[field] === undefined) errors[prefix ? `${prefix}.${field}` : field] = 'Campo requerido.'
    for (const [field, item] of Object.entries(row)) {
      const childKey = prefix ? `${prefix}.${field}` : field
      const property = Object.hasOwn(schema.properties ?? {}, field) ? schema.properties![field] : undefined
      if (property) Object.assign(errors, validateFutureSchema(contract, property, item, childKey))
      else if (schema.additionalProperties === false) errors[childKey] = 'Campo desconocido o de solo lectura.'
      else if (typeof schema.additionalProperties === 'object') Object.assign(errors, validateFutureSchema(contract, schema.additionalProperties, item, childKey))
    }
  }
  return errors
}

export function loadFutureContract(root: string): { contract: Contract; database: Database } {
  const contract: Contract = JSON.parse(fs.readFileSync(path.join(root, 'docs/future-api.openapi.json'), 'utf8'))
  const database: Database = {}
  for (const [table, definition] of Object.entries(contract['x-database'])) {
    const rows: unknown = JSON.parse(fs.readFileSync(path.join(root, 'json/future', `${table}.json`), 'utf8'))
    if (!Array.isArray(rows)) throw new Error(`Fixture ${table}: se esperaba un array.`)
    const ids = new Set()
    for (const row of rows) {
      const errors = validateFutureSchema(contract, { $ref: `#/components/schemas/${definition.schema}` }, row)
      if (Object.keys(errors).length) throw new Error(`Fixture ${table}: ${JSON.stringify(errors)}`)
      const id = row[definition.id]
      if (!Number.isSafeInteger(id) || id <= 0 || ids.has(id)) throw new Error(`Fixture ${table}: ID inválido o duplicado.`)
      ids.add(id)
    }
    database[table] = rows
  }
  return { contract, database }
}
