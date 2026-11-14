import { Readable } from 'node:stream'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const database = process.env.E2E_DB_NAME
if (!database || !/^epe_e2e_[a-z0-9_]+$/i.test(database) || process.env.DB_DATABASE !== database) {
  throw new Error('Usa una base PostgreSQL dedicada epe_e2e_* en DB_DATABASE y E2E_DB_NAME.')
}

const backend = new URL('../../epe-backend/', import.meta.url)
process.chdir(fileURLToPath(backend))
Object.assign(process.env, {
  NODE_ENV: 'test',
  PORT: '4175',
  DB_SYNCHRONIZE: 'false',
  AWS_ACCESS_KEY_ID: 'qa-local',
  AWS_SECRET_ACCESS_KEY: 'qa-local',
  S3_DOCUMENTS_BUCKET: 'epe-qa-local',
  RESEND_API_KEY: '',
  RESEND_FROM: '',
  AUTH_ADMIN_USERNAME: 'qa_web_admin',
  AUTH_ADMIN_PASSWORD: 'QA-web-admin-password',
  AUTH_ADMIN_DOCUMENT: '90000301',
  AUTH_ADMIN_NAMES: 'QA',
  AUTH_ADMIN_SURNAMES: 'Admin',
  AUTH_DRIVER_USERNAME: 'qa_web_driver',
  AUTH_DRIVER_PASSWORD: 'QA-web-driver-password',
  AUTH_DRIVER_DOCUMENT: '90000302',
  AUTH_DRIVER_NAMES: 'QA',
  AUTH_DRIVER_SURNAMES: 'Chofer',
  DRIVER_SHARED_USERNAME: 'qa_web_driver',
})
execFileSync(process.execPath, ['scripts/seed-v1.mjs'], { stdio: 'inherit' })

// Keep real HTTP and document controllers while isolating external storage.
const { S3StorageService } = await import(new URL('dist/archivo/services/s3-storage.service.js', backend).href)
const objects = new Map()
let revision = 0
function read(key) {
  const entry = objects.get(key)
  if (!entry) throw Object.assign(new Error('Objeto de prueba ausente'), { name: 'NoSuchKey' })
  return entry
}
Object.assign(S3StorageService.prototype, {
  async putObject(key, body, type, condition) {
    if (condition && condition.etag !== (objects.get(key)?.etag ?? null)) {
      throw Object.assign(new Error('Cambió la versión del objeto'), { $metadata: { httpStatusCode: 412 } })
    }
    objects.set(key, { content: Buffer.from(body), type, etag: String(++revision) })
  },
  async getObjectSnapshot(key) { return read(key) },
  async getObjectMetadata(key) {
    const { content, type } = read(key)
    return { contentLength: content.length, contentType: type }
  },
  async getObjectStream(key) { return Readable.from(read(key).content) },
})
await import(new URL('dist/main.js', backend).href)
