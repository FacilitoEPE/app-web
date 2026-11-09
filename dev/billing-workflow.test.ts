import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { createV1MockMiddleware } from './v1-mock.ts'
import { apiClient } from '@/shared/api/client'
import { refreshFrontendData, resetFrontendData } from '@/frontend-data'
import { operationsContext } from '@/modules/operations/api/operations-context.api'
import { projectBillingData } from '@/modules/billing/api/billing-screen-data'
import { billingCommands } from '@/modules/billing/api/billing-commands.api'
import { billingAvailableKg, billingCampaignClosed, billingCampaigns, billingLoadReady, billingTotalsByCurrency, invoiceBalance } from '@/modules/billing/billing.utils'
import { demoPdf } from '@/shared/utils/demoData'

let server: Server
let previousBase: string | undefined
beforeEach(async () => {
    vi.stubEnv('VITE_API_CONTRACT', 'v1')
    const middleware = createV1MockMiddleware(path.resolve(import.meta.dirname, '..'), undefined, true)
    server = createServer((req, res) => middleware(req, res, () => { res.statusCode = 404; res.end() }))
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    previousBase = apiClient.defaults.baseURL
    apiClient.defaults.baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mock-api/`
    await refreshFrontendData('*')
})
afterEach(async () => {
    apiClient.defaults.baseURL = previousBase
    vi.unstubAllEnvs()
    await new Promise<void>(resolve => server.close(() => resolve()))
})

describe('Facturación y cobros con datos relacionados de desarrollo', () => {
    it('relaciona campañas, clientes y cargas, y exige respaldo antes de preparar', async () => {
        const clients = projectBillingData(operationsContext())
        expect(billingCampaigns(clients).find(c => c.name === 'Mango 2026')?.clients).toHaveLength(2)
        const industry = clients.find(client => client.nombreEmpresa === 'Industrias Agro del Norte S.A.C.')!
        expect(billingCampaignClosed(industry)).toBe(false)
        expect(billingCampaignClosed({ ...industry, estadoCampania: 'terminado' })).toBe(true)
        const load = industry.cargas.find(item => item.codigo === 'CAR-IND-003')!
        expect(billingLoadReady(load)).toBe(true)
        expect(load.reporteRecepcion?.name).toBe('recepcion-carga-3.pdf')
        const exporter = clients.find(client => client.nombreEmpresa === 'Frutas del Mundo SAC')!
        expect(billingLoadReady(exporter.cargas.find(item => item.codigo === 'CAR-DEMO-1')!)).toBe(false)
        await expect(billingCommands.prepare(exporter.id, exporter.cargas[0].id, {
            referenciaPreparacion: 'LV-999999', numeroFacturaElectronica: '', estado: 'Preparación pendiente',
            fechaPreparacion: '2026-11-07', fechaEmision: '', fechaVencimiento: '', kilosFacturados: 1,
            precioUnitario: exporter.precioPorKg, descuento: 0, cargos: 0, total: exporter.precioPorKg,
            moneda: exporter.moneda, archivoPreparacion: null, archivoFacturaEmitida: null, observaciones: '',
        })).rejects.toThrow(/reporte de recepción/i)
    })

    it('prepara, registra factura emitida y aplica un cobro parcial sin superar el saldo', async () => {
        await refreshFrontendData('/facturacion-cobros/1')
        const industry = projectBillingData(operationsContext()).find(client => client.canal === 'Industria')!
        const load = industry.cargas.find(item => item.codigo === 'CAR-IND-003')!
        const clientPath = `/facturacion-cobros/1/clientes/${industry.id}`
        await refreshFrontendData(clientPath)
        expect(billingAvailableKg(load)).toBe(780)
        await billingCommands.prepare(industry.id, load.id, {
            referenciaPreparacion: 'LV-000001', numeroFacturaElectronica: '', estado: 'Preparación pendiente',
            fechaPreparacion: '2026-11-07', fechaEmision: '', fechaVencimiento: '2026-12-07', kilosFacturados: 500,
            precioUnitario: industry.precioPorKg, descuento: 10, cargos: 5, total: 1245,
            moneda: industry.moneda, archivoPreparacion: null, archivoFacturaEmitida: null, observaciones: 'Primer tramo',
        })
        let updated = projectBillingData(operationsContext()).find(client => client.id === industry.id)!.cargas.find(item => item.id === load.id)!
        expect(billingAvailableKg(updated)).toBe(280)
        const prepared = updated.facturas.find(item => item.referenciaPreparacion === 'LV-000001')!
        expect(prepared.total).toBe(1245)
        await billingCommands.issue(industry.id, load.id, prepared.id, {
            numeroFacturaElectronica: 'F001-009999', fechaEmision: '2026-11-08', fechaVencimiento: '2026-12-07',
            archivoFacturaEmitida: demoPdf('factura-emitida.pdf'), observaciones: '',
        })
        updated = projectBillingData(operationsContext()).find(client => client.id === industry.id)!.cargas.find(item => item.id === load.id)!
        const issued = updated.facturas.find(item => item.id === prepared.id)!
        expect(issued.archivoFacturaEmitida?.name).toBe('factura-emitida.pdf')
        await billingCommands.collect(industry.id, load.id, issued.id, {
            fecha: '2026-11-09', importe: 200, medio: 'Transferencia', referencia: 'OP-0001',
            evidencia: demoPdf('voucher.pdf'), observaciones: '',
        })
        resetFrontendData()
        await refreshFrontendData(`${clientPath}/facturas/${issued.id}/cobros`)
        const paid = projectBillingData(operationsContext()).find(client => client.id === industry.id)!.cargas.find(item => item.id === load.id)!.facturas.find(item => item.id === issued.id)!
        expect(invoiceBalance(paid)).toBe(1045)
        expect(paid.cobros[0].evidencia?.name).toBe('voucher.pdf')
        await expect(billingCommands.collect(industry.id, load.id, issued.id, {
            fecha: '2026-11-10', importe: 1046, medio: 'Transferencia', referencia: 'OP-0002', evidencia: demoPdf('exceso.pdf'), observaciones: '',
        })).rejects.toMatchObject({ statusCode: 409 })
        await refreshFrontendData('/facturacion-cobros/1')
        const totals = billingTotalsByCurrency(projectBillingData(operationsContext()))
        expect(totals).toEqual(expect.arrayContaining([
            { currency: 'USD', billed: 1495, collected: 100 },
            { currency: 'PEN', billed: 1245, collected: 200 },
        ]))
    })
})
