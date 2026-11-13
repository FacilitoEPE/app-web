import { expect, test, type Page } from '@playwright/test'
import { Buffer } from 'node:buffer'

const invoice = '/facturacion-cobros/1/clientes/1/facturas/1'
const documents = '/logistica-despacho/1/cargas/1/documentos'
const pdf = (name: string) => ({
  name,
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n%%EOF'),
})

async function login(page: Page, role: 'Administrador' | 'Chofer' = 'Administrador') {
  await page.addInitScript(() => localStorage.setItem('epe:intro-skipped', '1'))
  await page.goto('/login')
  if (role === 'Chofer') await page.getByText('Chofer', { exact: true }).click()
  await page.getByLabel('Usuario', { exact: true }).fill(role === 'Chofer' ? 'chofer-demo' : 'admin-demo')
  await page.getByLabel('Contraseña', { exact: true }).fill('Clave-de-prueba')
  await page.getByRole('button', { name: /^Ingresar/ }).click()
  await expect(page).toHaveURL(role === 'Chofer' ? /\/chofer$/ : /\/modules$/)
}

test('registra el saldo completo con voucher y lo conserva al recargar', async ({ page }) => {
  await login(page)
  await page.goto(invoice)
  await page.getByRole('button', { name: 'Registrar cobro' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel(/Importe cobrado/).fill('1395')
  await dialog.getByLabel(/Referencia de operación/).fill('QA-E2E-COBRO')
  await dialog.locator('input[type=file]').setInputFiles(pdf('voucher-qa.pdf'))
  await dialog.getByRole('button', { name: 'Guardar cobro' }).click()
  await expect(dialog).toBeHidden()
  await page.reload()
  const summary = page.getByRole('region', { name: 'Resumen de la factura' })
  await expect(summary.getByText('Sin saldo pendiente')).toBeVisible()
  await expect(summary.getByText(/US\$\s*0[.,]00/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Registrar cobro' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Ver historial de cobros' }).click()
  await expect(page.getByText('QA-E2E-COBRO', { exact: true }).filter({ visible: true })).toBeVisible()
  await expect(page.getByText('voucher-qa.pdf', { exact: true }).filter({ visible: true })).toBeVisible()
})

test('exige guardar el informe antes del cierre físico y espera el cierre del chofer', async ({ page }) => {
  await login(page)
  const receipt = '/mock-api/v1/cargas/1/recepciones/1'
  const response = await page.request.patch(receipt, {
    headers: { Authorization: 'Bearer mock-token-1' },
    data: {
      resultado: 'Conforme', descargaInicioAt: '2026-10-29T18:10:00Z', descargaFinAt: '2026-10-29T18:40:00Z',
    },
  })
  expect(response.ok()).toBe(true)
  const issue = await page.request.post('/mock-api/v1/guias/1/emitir', {
    headers: { Authorization: 'Bearer mock-token-1' }, data: {},
  })
  expect(issue.ok()).toBe(true)
  await page.goto(documents)
  await expect(page.getByRole('heading', { name: 'Expediente de la entrega' })).toBeVisible()
  await page.locator('input[type=file]').nth(0).setInputFiles(pdf('guia-fruta-qa.pdf'))
  await page.locator('input[type=file]').nth(2).setInputFiles(pdf('informe-qa.pdf'))
  const physical = page.getByRole('button', { name: 'Registrar cierre físico' })
  const administrative = page.getByRole('button', { name: 'Registrar cierre administrativo' })
  const closePhysical = async () => {
    await physical.click()
    await page.getByRole('button', { name: /^Sí, cerrar físicamente/ }).click({ delay: 1600 })
  }
  await closePhysical()
  await expect(page.getByRole('alert').filter({ hasText: /Adjunta el informe de recepción/ })).toBeVisible()
  const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().endsWith(receipt))
  await page.getByRole('button', { name: 'Guardar documentos' }).click()
  expect((await saved).ok()).toBe(true)
  await page.reload()
  await expect(page.getByText('informe-qa.pdf', { exact: true })).toBeVisible()
  await closePhysical()
  await expect(physical).toBeDisabled()
  await expect(administrative).toBeDisabled()
  await expect(page.getByText(/El chofer debe completar su checklist/)).toBeVisible()
})

test('el chofer vuelve al portal al intentar abrir una pantalla administrativa', async ({ page }) => {
  await login(page, 'Chofer')
  await page.goto(invoice)
  await expect(page).toHaveURL(/\/chofer$/)
  await expect(page.getByRole('heading', { name: 'Detalle de la factura' })).toHaveCount(0)
})

test('conserva la cotización al vincular un transportista y volver a abrir sus detalles', async ({ page }) => {
  await login(page)
  await page.goto('/campaigns/2/carriers')
  await page.getByRole('button', { name: 'Vincular transportista' }).filter({ visible: true }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('Buscar transportista...').fill('Transportes del Norte')
  await page.getByRole('option', { name: /Transportes del Norte/ }).click()
  await dialog.locator('input[type=file]').setInputFiles(pdf('cotizacion-qa.pdf'))
  await dialog.getByRole('button', { name: 'Vincular transportista' }).click()
  await expect(dialog).toBeHidden()
  await page.reload()
  const carrier = page.getByRole('row').filter({ hasText: 'Transportes del Norte' })
  await carrier.getByRole('button', { name: 'Ver detalles' }).click()
  await expect(dialog.getByText('cotizacion-qa.pdf', { exact: true })).toBeVisible()
})
