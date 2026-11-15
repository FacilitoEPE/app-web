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

test('vuelve al primer error del modal al guardar y al reintentar', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 600 })
  await login(page)
  await page.goto(invoice)
  await page.getByRole('button', { name: 'Registrar cobro' }).click()
  const dialog = page.getByRole('dialog', { name: 'Registrar cobro de factura' })
  const body = dialog.locator('[class~="overflow-y-auto"]')
  const main = page.locator('main[data-route-surface]')
  const initialPageScroll = await main.evaluate(element => element.scrollTop)
  const save = dialog.getByRole('button', { name: 'Guardar cobro' })
  const firstError = dialog.getByRole('alert').first()
  for (const attempt of [1, 2]) {
    const bottom = await body.evaluate(element => {
      element.scrollTop = element.scrollHeight
      return element.scrollTop
    })
    expect(bottom).toBeGreaterThan(0)
    await expect(dialog.getByLabel(/Importe cobrado/)).not.toBeInViewport()
    await save.click()
    await expect(firstError).toContainText('Ingresa un importe mayor que 0')
    await expect.poll(() => body.evaluate(element => element.scrollTop)).toBeLessThan(bottom)
    await expect(firstError).toBeInViewport({ ratio: 1 })
    expect(await main.evaluate(element => element.scrollTop), `intento ${attempt}`).toBe(initialPageScroll)
  }
})

test('un error en una caja anidada conserva el scroll de la caja exterior y la lateral', async ({ page }) => {
  await login(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('body').evaluate(body => {
    const document = body.ownerDocument
    body.insertAdjacentHTML('beforeend', `
      <form style="position:fixed;inset:20px auto auto 20px;width:460px;display:flex;">
        <div id="qa-outer" class="overflow-y-auto" style="width:300px;height:210px">
          <div style="height:100px"></div>
          <div id="qa-inner" class="overflow-y-auto" style="height:140px">
            <div style="height:180px"></div><div id="qa-first"></div>
            <div style="height:320px"></div><div id="qa-last"></div>
            <div style="height:430px"></div>
          </div>
          <div style="height:380px"></div>
        </div>
        <div id="qa-side" class="overflow-y-auto" style="width:140px;height:210px"><div style="height:650px"></div></div>
      </form>`)
    document.getElementById('qa-outer')!.scrollTop = 150
    document.getElementById('qa-inner')!.scrollTop = 750
    document.getElementById('qa-side')!.scrollTop = 125
    document.getElementById('qa-last')!.innerHTML = '<p role="alert">Último error de prueba</p>'
    document.getElementById('qa-first')!.innerHTML = '<p role="alert">Primer error de prueba</p>'
  })
  await expect(page.getByRole('alert').filter({ hasText: 'Primer error de prueba' })).toBeInViewport({ ratio: 1 })
  await expect(page.getByRole('alert').filter({ hasText: 'Último error de prueba' })).not.toBeInViewport()
  expect(await page.locator('#qa-outer').evaluate(element => element.scrollTop)).toBe(150)
  expect(await page.locator('#qa-side').evaluate(element => element.scrollTop)).toBe(125)
})

test('registra el saldo completo con voucher y lo conserva al recargar', async ({ page }) => {
  await login(page)
  await page.goto(invoice)
  await page.getByRole('button', { name: 'Registrar cobro' }).click()
  const dialog = page.getByRole('dialog', { name: 'Registrar cobro de factura' })
  await dialog.getByLabel(/Importe cobrado/).fill('1395')
  await dialog.getByLabel(/Referencia de operación/).fill('QA-E2E-COBRO')
  await dialog.locator('input[type=file]').setInputFiles(pdf('voucher-qa.pdf'))
  await dialog.getByRole('button', { name: 'Guardar cobro' }).click()
  await expect(dialog).toBeHidden()
  const success = page.getByRole('dialog', { name: 'Cobro registrado' })
  await expect(success).toBeVisible()
  await success.getByRole('button', { name: 'Aceptar' }).click()
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
    const confirmation = page.getByRole('alertdialog', { name: '¿Registrar cierre físico?' })
    await confirmation.getByRole('button', { name: /^Sí, cerrar físicamente/ }).hover()
    await page.mouse.down()
    try {
      await expect(confirmation).toBeHidden()
    } finally {
      await page.mouse.up()
    }
  }
  await closePhysical()
  await expect(page.getByRole('alert').filter({ hasText: /Adjunta el informe de recepción/ })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Cierre físico registrado' })).toBeHidden()
  const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().endsWith(receipt))
  await page.getByRole('button', { name: 'Guardar documentos' }).click()
  expect((await saved).ok()).toBe(true)
  await expect(page.getByRole('dialog', { name: 'Documentos guardados' })).toBeVisible()
  await page.reload()
  await expect(page.getByText('informe-qa.pdf', { exact: true })).toBeVisible()
  await closePhysical()
  await expect(page.getByRole('dialog', { name: 'Cierre físico registrado' })).toBeVisible()
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

test('el chofer vuelve al aviso de error al rechazar un checklist de llegada', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 640 })
  await login(page, 'Chofer')
  await page.getByRole('button', { name: 'Cargas', exact: true }).click()
  await page.locator('[data-slot="card"]').filter({ hasText: 'CAR-DEMO-1' })
    .getByRole('button', { name: 'Ver mi despacho' }).click()
  await page.getByLabel('Kilos recibidos en planta').fill('0')
  await page.getByRole('button', { name: 'Guardar checklist de llegada' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'El peso en planta debe ser mayor que cero' }))
    .toBeInViewport({ ratio: 1 })
})

test('conserva la cotización al vincular un transportista y volver a abrir sus detalles', async ({ page }) => {
  await login(page)
  await page.goto('/campaigns/2/carriers')
  await page.getByRole('button', { name: 'Vincular transportista' }).filter({ visible: true }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Vincular transportista' })
  await dialog.getByPlaceholder('Buscar transportista...').fill('Transportes del Norte')
  await page.getByRole('option', { name: /Transportes del Norte/ }).click()
  await dialog.locator('input[type=file]').setInputFiles(pdf('cotizacion-qa.pdf'))
  await dialog.getByRole('button', { name: 'Vincular transportista' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('dialog', { name: 'Transportista vinculado' })).toBeVisible()
  await page.reload()
  const carrier = page.getByRole('row').filter({ hasText: 'Transportes del Norte' })
  await carrier.getByRole('button', { name: 'Ver detalles' }).click()
  const details = page.getByRole('dialog', { name: 'Datos del transportista' })
  await expect(details.getByText('cotizacion-qa.pdf', { exact: true })).toBeVisible()
})
