import { Buffer } from 'node:buffer'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const api = 'http://127.0.0.1:4175/v1'
const pdf = (name: string) => ({ name, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') })

async function adminApi(request: APIRequestContext) {
  const login = await request.post(`${api}/auth/login`, {
    data: { usuario: 'qa_web_admin', password: 'QA-web-admin-password' },
  })
  expect(login.ok(), await login.text()).toBeTruthy()
  const headers = { Authorization: `Bearer ${(await login.json()).accessToken}` }
  return async (path: string, data: object, status = 201) => {
    const response = await request.post(`${api}${path}`, { headers, data })
    expect(response.status(), `${path}: ${await response.text()}`).toBe(status)
    return response.json()
  }
}

async function saveFromPage(page: Page, path: RegExp, button: string) {
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: button, exact: true }) })
  const saved = page.waitForResponse(response => response.request().method() === 'POST' && path.test(new URL(response.url()).pathname), { timeout: 15_000 })
  await dialog.getByRole('button', { name: button, exact: true }).click()
  const response = await saved
  expect(response.status(), await response.text()).toBe(201)
  await expect(dialog).toBeHidden()
  return response.json()
}

async function selectToday(page: Page, label: RegExp | string) {
  const trigger = page.getByRole('dialog').getByLabel(label)
  await trigger.click()
  const today = page.locator('[data-slot=popover-content]:visible:not([inert])')
    .locator('[data-today=true] button').last()
  if (await today.getAttribute('data-selected-single') !== 'true') await today.click()
  if (await trigger.getAttribute('aria-expanded') === 'true') await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(trigger).toHaveText(/\d{2}\/\d{2}\/\d{4}/)
}

async function planDelivery(page: Page) {
  const dialog = page.getByRole('dialog')
  const choose = async (trigger: string, option: RegExp) => {
    await dialog.locator(trigger).click()
    await page.getByRole('option', { name: option }).click()
  }
  await page.goto('/campaigns/1/clients/1/contracts')
  await page.getByRole('button', { name: 'Registrar contrato' }).filter({ visible: true }).first().click()
  await dialog.getByLabel(/^Precio por kg/).fill('1.5')
  await choose('#client-contract-moneda', /USD/)
  await choose('#contract-variety-0', /Kent/)
  await dialog.getByLabel(/^Cantidad/).fill('1000')
  await dialog.getByLabel(/^Condiciones de pago/).fill('Contra entrega')
  await dialog.getByLabel(/^Condiciones de entrega/).fill('FOB Paita')
  await dialog.locator('input[type=file]').setInputFiles(pdf('contrato-qa.pdf'))
  const contract = await saveFromPage(page, /\/requerimientos\/1\/contratos$/, 'Guardar contrato')
  await page.goto(`/campaigns/1/clients/1/contracts/${contract.contratoVentaId}/deliveries`)
  await page.getByRole('button', { name: 'Registrar entrega' }).filter({ visible: true }).first().click()
  await selectToday(page, /^Fecha programada/)
  await dialog.getByLabel(/^Destino/).fill('Puerto QA Paita')
  const quantity = dialog.getByLabel(/^Cantidad/)
  if (await quantity.isDisabled()) await choose('#delivery-variety-0', /Kent/)
  await quantity.fill('1000')
  const delivery = await saveFromPage(page, /\/contratos\/\d+\/entregas$/, 'Guardar entrega')
  await page.goto('/campaigns/1/deliveries')
  const row = page.getByRole('row').filter({ hasText: 'Puerto QA Paita' })
  await row.getByRole('button', { name: /Editar/ }).click()
  await dialog.getByPlaceholder('Buscar transportista vinculado...').fill('Transportes del Norte')
  await page.getByRole('option', { name: /Transportes del Norte/ }).click()
  await choose('#delivery-vehicle', /ABC-123/)
  await choose('#delivery-driver', /Miguel Torres/)
  await dialog.getByLabel(/^Fecha de inicio/).fill(`${delivery.fecha}T08:00`)
  await dialog.getByLabel(/^Fecha de fin/).fill(`${delivery.fecha}T10:00`)
  await dialog.getByRole('checkbox', { name: /José Luis Ramos/ }).check()
  const coordination = await saveFromPage(page, /\/entregas\/\d+\/coordinaciones$/, 'Guardar cambios')
  return { contract, delivery, coordination }
}

async function prepareDispatch(post: Awaited<ReturnType<typeof adminApi>>, page: Page) {
  const { contract, delivery, coordination } = await planDelivery(page)
  const date = delivery.fecha
  const deliveryPath = `/entregas/${delivery.entregaProgramadaId}`
  // QA reused approved quality records. Seed this prerequisite through the real API.
  const harvest = { codigoLote: 'LOTE-QA-WEB', fechaPrevista: date, kilosEstimados: 1000,
    kilosCosechados: 1000, kilosAceptados: 1000, estado: 'APROBADA' }
  await post(`${deliveryPath}/cosecha`, harvest, 409)
  await post('/participaciones/1/mediciones-mtd', {
    fincaId: 1, medidoAt: `${date}T09:00:00Z`, valor: 0, limiteAplicado: 1, capturas: 0, trampas: 1, diasExposicion: 1,
  })
  for (const tipo of ['Maduración', 'Acidez']) {
    await post('/participaciones/1/analisis-calidad', { fincaId: 1, tipo, fechaMuestreo: date, estado: 'APTO' })
  }
  await post(`${deliveryPath}/cosecha`, harvest)
  await page.goto('/calidad/exportador/1/carga')
  await page.getByRole('button', { name: 'Registrar carga', exact: true }).filter({ visible: true }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('#quality-load-delivery').click()
  await page.getByRole('option').filter({ hasText: `· ${contract.numero} · ABC-123 ·` }).click()
  await dialog.getByRole('button', { name: 'Continuar' }).click()
  await dialog.getByLabel(/^Anotador/).fill('QA')
  await dialog.getByLabel(/^Kilos cargados/).fill('1000')
  await dialog.getByRole('checkbox', { name: 'Jabas', exact: true }).check()
  await dialog.getByLabel(/^Jabas cargadas/).fill('50')
  const load = await saveFromPage(page, new RegExp(`/coordinaciones/${coordination.coordinacionEntregaId}/cargas$`), 'Guardar datos de carga')
  const code = load.codigo
  const loadPath = `/cargas/${load.cargaId}`
  await page.goto(`/calidad/exportador/1/guias/${load.cargaId}`)
  await page.getByRole('button', { name: 'Agregar guía' }).click()
  await dialog.getByRole('checkbox', { name: /José Luis Ramos/ }).check()
  await dialog.getByLabel(/^Número de guía/).fill('QAW-000001')
  await selectToday(page, /^Fecha de inicio de traslado/)
  for (const [id, value] of Object.entries({
    'rg-peso-bruto': '1000', 'rg-num-bultos': '50', 'rg-dir-partida': 'Finca QA', 'rg-dir-llegada': 'Planta Paita',
    'rg-est-partida': '0001', 'rg-est-llegada': '0001',
  })) await dialog.locator(`#${id}`).fill(value)
  for (const [point, ubigeo] of [['Partida', '200114'], ['Llegada', '200501']]) {
    await dialog.getByRole('group').filter({ hasText: `UBIGEO de 6 dígitos (${point})` }).getByRole('combobox').click()
    await page.getByRole('option', { name: new RegExp(ubigeo) }).click()
  }
  const guide = await saveFromPage(page, /\/cargas\/\d+\/guias$/, 'Guardar guía')
  return { code, date, loadPath, loadId: load.cargaId, guideId: guide.guiaRemisionId }
}

async function login(page: Page, driver = false) {
  await page.addInitScript(() => localStorage.setItem('epe:intro-skipped', '1'))
  await page.goto('/login')
  if (driver) await page.getByText('Chofer', { exact: true }).click()
  await page.getByLabel('Usuario', { exact: true }).fill(driver ? 'qa_web_driver' : 'qa_web_admin')
  await page.getByLabel('Contraseña', { exact: true }).fill(driver ? 'QA-web-driver-password' : 'QA-web-admin-password')
  await page.getByRole('button', { name: /^Ingresar/ }).click()
  await expect(page).toHaveURL(driver ? /\/chofer$/ : /\/modules$/)
}

test('despacha, cierra y cobra una misma carga usando la API y PostgreSQL', async ({ page, browser, request }) => {
  test.setTimeout(180_000)
  page.setDefaultTimeout(10_000)
  await login(page)
  const { code, date, loadPath, loadId, guideId } = await prepareDispatch(await adminApi(request), page)
  await page.goto(`/calidad/exportador/1/guias/${loadId}/${guideId}`)
  await page.getByRole('button', { name: 'Generar guías (1)' }).click()
  await expect(page.getByText('Generada', { exact: true })).toBeVisible()
  const driver = await browser.newPage()
  driver.setDefaultTimeout(10_000)
  try {
    await login(driver, true)
    const openDispatch = async () => {
      await driver.getByRole('button', { name: 'Cargas', exact: true }).click()
      const card = driver.locator('[data-slot=card]').filter({ hasText: code })
        .filter({ has: driver.getByRole('button', { name: 'Ver mi despacho' }) })
      await card.getByRole('button', { name: 'Ver mi despacho' }).click()
    }
    const acknowledge = async () => {
      await driver.getByRole('button', { name: 'Aceptar', exact: true }).click()
    }
    await openDispatch()
    for (const label of ['Confirmar salida de la finca', 'Confirmar que estoy en camino', 'Confirmar llegada al cliente']) {
      await driver.getByRole('button', { name: label }).click()
      await acknowledge()
    }
    await page.goto(`/logistica-despacho/1${loadPath}/recepcion`)
    await page.getByRole('button', { name: 'Registrar llegada' }).click()
    await page.getByLabel('Fecha y hora real de llegada').fill(`${date}T13:00`)
    await page.getByRole('button', { name: 'Guardar llegada' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await page.getByRole('button', { name: 'Registrar descarga' }).click()
    await page.getByLabel('Inicio de descarga').fill(`${date}T13:10`)
    await page.getByLabel('Término de descarga').fill(`${date}T13:40`)
    await page.getByLabel('Responsable de recepción').fill('Recepción QA')
    await page.getByRole('button', { name: 'Guardar descarga' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await page.getByLabel('Peso en planta').fill('1000')
    await page.getByLabel(/^Resultado/).fill('Conforme')
    const evaluation = page.waitForResponse(response => response.request().method() === 'PATCH'
      && response.url().includes(`${loadPath}/recepciones/`))
    await page.getByRole('button', { name: 'Guardar evaluación' }).click()
    const evaluationResponse = await evaluation
    expect(evaluationResponse.ok(), await evaluationResponse.text()).toBeTruthy()
    await driver.reload()
    await openDispatch()
    await driver.getByLabel('Kilos recibidos en planta').fill('1000')
    await driver.getByRole('button', { name: 'Guardar checklist de llegada' }).click()
    await acknowledge()
    await driver.locator('input[id="file-dropzone-documento-de-guía-de-salida-firmada"]').setInputFiles(pdf('salida-chofer.pdf'))
    await driver.getByRole('button', { name: 'Guardar guía de salida' }).click()
    await acknowledge()
    await driver.reload()
    await openDispatch()
    await expect(driver.getByText('Documento verificado')).toBeVisible()

    await page.goto(`/logistica-despacho/1${loadPath}/documentos`)
    const physical = page.getByRole('button', { name: 'Registrar cierre físico' })
    const administrative = page.getByRole('button', { name: 'Registrar cierre administrativo' })
    const confirmPhysical = async () => {
      await physical.click()
      await page.getByRole('button', { name: /^Sí, cerrar físicamente/ }).click({ delay: 1600 })
    }
    await confirmPhysical()
    await expect(page.getByRole('alert').filter({ hasText: /Adjunta el informe de recepción/ })).toBeVisible()
    const files = page.locator('input[type=file]')
    await files.nth(0).setInputFiles(pdf('guia-fruta.pdf'))
    await files.nth(2).setInputFiles(pdf('recepcion.pdf'))
    await files.nth(5).setInputFiles(pdf('salida-firmada.pdf'))
    const receiptSaved = page.waitForResponse(response =>
      response.request().method() === 'PATCH' && response.url().includes(`${loadPath}/recepciones/`))
    await page.getByRole('button', { name: 'Guardar documentos' }).click()
    const updatedReceipt = await receiptSaved
    expect(updatedReceipt.ok(), await updatedReceipt.text()).toBeTruthy()
    await page.reload()
    await expect(page.getByRole('status').filter({ hasText: 'Documento verificado' })).toHaveCount(3)
    await confirmPhysical()
    await expect(physical).toBeDisabled()
    await expect(administrative).toBeDisabled()
    await driver.reload()
    await openDispatch()
    await driver.getByRole('button', { name: 'Cerrar despacho' }).click()
    await acknowledge()
    await expect(driver.getByText('Despacho cerrado y completado por el conductor.')).toBeVisible()
    await page.reload()
    await administrative.click()
    await page.getByRole('button', { name: /^Sí, cerrar administrativamente/ }).click({ delay: 1600 })
    await expect(page.getByText(/El cierre administrativo bloquea cambios posteriores/)).toBeVisible()

    const client = '/facturacion-cobros/1/clientes/1'
    await page.goto(client)
    const load = page.locator('[data-slot=card]').filter({ hasText: code })
      .filter({ has: page.getByRole('button', { name: 'Preparar factura' }) })
    await load.getByRole('button', { name: 'Preparar factura' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('Referencia de preparación')).toHaveValue('LV-000001')
    await dialog.getByLabel('Kilos a facturar').fill('1000')
    await dialog.getByRole('button', { name: 'Guardar preparación' }).click()
    await expect(dialog).toBeHidden()
    const prepared = page.locator('[data-slot=card]').filter({ hasText: code })
      .filter({ has: page.getByText('Preparación LV-000001', { exact: true }) })
    await prepared.getByRole('button', { name: 'Registrar factura emitida' }).click()
    await dialog.getByLabel('N° de factura electrónica').fill('FQA-WEB-000001')
    for (const label of ['Fecha de emisión', 'Fecha de vencimiento']) await selectToday(page, label)
    await dialog.locator('input[type=file]').setInputFiles(pdf('factura-qa.pdf'))
    await dialog.getByRole('checkbox').check()
    await dialog.getByRole('button', { name: 'Guardar factura emitida' }).click()
    await expect(dialog).toBeHidden()
    const saved = await request.post(`${api}/auth/login`, {
      data: { usuario: 'qa_web_admin', password: 'QA-web-admin-password' },
    })
    const invoices = await request.get(`${api}${loadPath}/facturas`, {
      headers: { Authorization: `Bearer ${(await saved.json()).accessToken}` },
    })
    expect(invoices.ok()).toBeTruthy()
    const [invoice] = (await invoices.json()).items
    expect(invoice).toMatchObject({ importeVenta: 1500, estado: 'EMITIDA', numeroFactura: 'FQA-WEB-000001' })
    await page.goto(`${client}/facturas/${invoice.facturaVentaId}`)
    await expect(page.getByRole('status').filter({ hasText: 'Documento verificado' }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Registrar cobro' }).click()
    await dialog.getByLabel(/Importe cobrado/).fill('1500')
    await dialog.getByLabel(/Referencia de operación/).fill('QA-WEB-PAGO')
    await dialog.locator('input[type=file]').setInputFiles(pdf('voucher-qa.pdf'))
    await dialog.getByRole('button', { name: 'Guardar cobro' }).click()
    await expect(dialog).toBeHidden()
    await page.reload()
    const summary = page.getByRole('region', { name: 'Resumen de la factura' })
    await expect(summary.getByText('Sin saldo pendiente')).toBeVisible()
    await expect(summary.getByText(/US\$\s*0[.,]00/)).toBeVisible()
    await page.getByRole('button', { name: 'Ver historial de cobros' }).click()
    await expect(page.getByText('QA-WEB-PAGO', { exact: true }).filter({ visible: true })).toBeVisible()
    await expect(page.getByText('voucher-qa.pdf', { exact: true }).filter({ visible: true })).toBeVisible()
  } finally {
    await driver.close()
  }
})

test('comprueba el registro de QA de proveedores, certificación y transporte con el backend', async ({ page, request }) => {
  test.setTimeout(90_000)
  page.setDefaultTimeout(10_000)
  const post = await adminApi(request)
  const supplier = await post('/proveedores', {
    nombres: 'Acopiador', apellido: 'QA Web', tipoDocumento: 'DNI', nmrDocumento: '94000113',
    zona: 'Piura', telefono: '900001113',
  })
  await post('/transportistas', {
    nombreCompleto: 'Transportes QA Web SAC', ruc: '20940001113', numero: '900002113',
  })
  // The campaign fixture already has its one certification. Use a fresh campaign for registration.
  const campaign = await post('/campanas', {
    nombre: 'Certificación QA', frutaId: 3, fechaInicio: '2027-04-01', fechaFin: '2027-09-30',
    requerimientoComercial: 1000,
  })
  await post(`/campanas/${campaign.campaniaId}/proveedores`, {
    proveedorId: 1, cantidadProveedor: 1000, tipoProveedor: 'productor',
    moneda: 'PEN', precioCompraKg: 2,
  })

  await login(page)
  const dialog = page.getByRole('dialog')
  await page.goto('/campaigns/1/providers')
  await page.getByRole('button', { name: 'Vincular acopiador' }).filter({ visible: true }).first().click()
  await dialog.getByPlaceholder('Buscar proveedor, fruta o variedad...').fill('Acopiador QA Web')
  await page.getByRole('option', { name: /Acopiador QA Web/ }).click()
  await dialog.getByPlaceholder('Ej. 2500').fill('1000')
  await dialog.getByPlaceholder('0.00').fill('2')
  const participation = await saveFromPage(page, /\/campanas\/1\/proveedores$/, 'Vincular acopiador')
  expect(participation.proveedorId).toBe(supplier.proveedorId)
  const examPath = `/campaigns/1/providers/${participation.cxpId}/exams`
  await page.goto(examPath)
  await page.getByRole('button', { name: 'Registrar examen' }).filter({ visible: true }).first().click()
  await dialog.getByPlaceholder('Buscar...').fill('Plaguicidas')
  await page.getByRole('option', { name: 'Residuos de Plaguicidas' }).click()
  await dialog.getByLabel('Identificación de muestra').fill('MUESTRA-QA-WEB')
  await selectToday(page, 'Fecha del examen')
  await dialog.getByRole('button', { name: 'Guardar examen' }).click()
  await expect(dialog).toBeHidden()
  await page.reload()
  await expect(page.getByText('MUESTRA-QA-WEB', { exact: true }).filter({ visible: true })).toBeVisible()
  await page.goto('/campaigns/1/providers/1/interviews')
  await expect(page.getByText('FVV-MANGO-1', { exact: true }).filter({ visible: true })).toBeVisible()
  await page.goto(`/campaigns/${campaign.campaniaId}/certifications`)
  await page.getByRole('button', { name: 'Registrar certificación' }).filter({ visible: true }).first().click()
  await dialog.locator('#campaign-cert-tipo').click()
  await page.getByRole('option', { name: 'Global GAP', exact: true }).click()
  await dialog.getByLabel(/^Nombre del certificado/).fill('Global GAP QA Web')
  await dialog.getByLabel(/^Organismo emisor/).fill('Certificadora QA')
  await dialog.getByRole('group', { name: 'Productores cubiertos por la certificación' })
    .getByRole('button', { name: /José Luis Ramos/ }).click()
  await dialog.locator('#campaign-cert-moneda').click()
  await page.getByRole('option', { name: /Sol/ }).click()
  await dialog.getByLabel(/^Costo/).fill('2000')
  await saveFromPage(page, new RegExp(`/campanas/${campaign.campaniaId}/certificaciones$`), 'Registrar')
  await expect(page.getByRole('dialog', { name: 'Certificación guardada' })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Global GAP QA Web', { exact: true }).filter({ visible: true })).toBeVisible()

  await page.goto('/campaigns/1/carriers')
  await page.getByRole('button', { name: 'Vincular transportista' }).filter({ visible: true }).first().click()
  await dialog.getByPlaceholder('Buscar transportista...').fill('Transportes QA Web')
  await page.getByRole('option', { name: /Transportes QA Web/ }).click()
  await dialog.locator('input[type=file]').setInputFiles(pdf('cotizacion-qa.pdf'))
  await dialog.getByRole('button', { name: 'Vincular transportista' }).click()
  await expect(dialog).toBeHidden()
  await page.reload()
  await page.getByRole('row').filter({ hasText: 'Transportes QA Web' })
    .getByRole('button', { name: 'Ver detalles' }).click()
  await expect(dialog.getByText('cotizacion-qa.pdf', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('status').filter({ hasText: 'Documento verificado' })).toBeVisible()
})
