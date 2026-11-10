import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { createV1MockMiddleware } from './v1-mock.ts'
import { apiClient } from '@/shared/api/client'
import { refreshFrontendData, resetFrontendData } from '@/frontend-data'
import { operationsContext, type OperationsContext } from '@/modules/operations/api/operations-context.api'
import { projectQualityData } from '@/modules/quality/api/quality-screen-data'
import { projectDriverData } from '@/modules/driver-portal/api/driver-screen-data'
import { projectBillingData } from '@/modules/billing/api/billing-screen-data'
import { billingLoadReady } from '@/modules/billing/billing.utils'
import { projectLogisticsData } from '@/modules/logistics/api/logistics-screen-data'
import { projectSettlementData } from '@/modules/purchase-settlement/api/settlement-screen-data'
import { driverCommands } from '@/modules/driver-portal/api/driver-commands.api'
import { campaignAnalysisOrigins, qualityCommands } from '@/modules/quality/api/quality-commands.api'
import { createGuideDraft, guideAllocationTotals } from '@/modules/quality/remissionGuide.utils'
import { qualityGuideStandardText } from '@/modules/quality/qualityGuideNorms.utils'
import { demoPdf } from '@/shared/utils/demoData'

let server: Server
let previousBase: string | undefined
beforeEach(async () => {
    vi.stubEnv('VITE_API_CONTRACT', 'v1')
    const middleware = createV1MockMiddleware(path.resolve(import.meta.dirname, '..'), () => new Date('2026-11-08T15:00:00Z'), true)
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
describe('Flujo de calidad con datos sintéticos de desarrollo', () => {
    it('relaciona análisis por finca, cargas y guías en ambos canales', () => {
        const data = projectQualityData(operationsContext())
        expect(data.analyses).toHaveLength(12)
        expect(data.analyses.some(a => a.estadoResultado === 'pendiente')).toBe(true)
        expect(data.analyses.some(a => a.documento?.name.endsWith('.pdf'))).toBe(true)
        expect(campaignAnalysisOrigins(1).length).toBeGreaterThanOrEqual(2)
        for (const scope of ['exportador', 'industria']) {
            expect(data.loads.some(l => l.scope === scope && l.cargaId)).toBe(true)
            expect(data.loads.some(l => l.scope === scope && l.id.startsWith('entrega-'))).toBe(true)
            expect(data.loads.some(l => l.scope === scope && l.guiasRemision.length)).toBe(true)
        }
        const demo = data.loads.find(load => load.codigoCarga === 'CAR-DEMO-1')!
        const draft = createGuideDraft(demo)
        expect(draft.proveedoresIncluidos).toEqual([])
        expect(draft.numeroGuia).toBe('')
        expect(draft.fechaInicioTraslado).toBe(demo.fechaProgramada)
        expect(draft.fechaEntregaTransportista).toBe('')
        expect(draft.conductorNombres).toBe('Miguel')
        expect(draft.conductorApellidos).toBe('Torres Ramos')
        expect(draft.transportistaMtc).toBe('1542870-CNG')
        expect(demo.guiasRemision[0].conductorNombres).toBe('Miguel')
        expect(demo.guiasRemision[0].conductorApellidos).toBe('Torres Ramos')
        expect(demo.proveedoresCarga.every(provider => provider.tipoFruta === 'Orgánica')).toBe(true)
        expect(qualityGuideStandardText(['NOP', 'RTPO']).match(/ORGANICO: CAAE AMERICA/g)).toHaveLength(1)
    })
    it('registra una muestra pendiente y después conserva resultado, informe y evidencia MTD', async () => {
        const origin = campaignAnalysisOrigins(1)[0]
        const entry = { campaniaId: 1, productorNombre: origin.productor, fincaNombre: origin.finca, fechaMuestreo: '2026-11-02', tipo: 'Microbiológico', mtd: 0.02, resultado: '', estadoResultado: 'pendiente' as const, mtdEvidencia: demoPdf('captura-nueva.pdf') }
        const saved = await qualityCommands.analysis(entry)
        await qualityCommands.analysis({ ...entry, id: saved.id, resultado: 'Conforme', estadoResultado: 'conforme', documento: demoPdf('informe-nuevo.pdf') })
        await refreshFrontendData()
        const updated = projectQualityData(operationsContext()).analyses.find(a => a.id === saved.id)!
        expect(updated.resultado).toBe('Conforme')
        expect(updated.documento?.name).toBe('informe-nuevo.pdf')
        expect(updated.mtdEvidencia?.name).toBe('captura-nueva.pdf')
        expect(updated.documento && 'url' in updated.documento && updated.documento.url).toMatch(/^data:application\/pdf;base64,/)
    })
    it('registra carga de entrega coordinada y crea su guía con proveedores de esa carga', async () => {
        const pending = projectQualityData(operationsContext()).loads.find(l => l.scope === 'industria' && l.puedeRegistrarCarga)!
        await qualityCommands.saveLoad(pending.id, { ...pending, cumpleRequisitosIndustria: true, fechaCargaReal: '2026-11-07', anotador: 'Anotador de prueba', proveedoresCarga: pending.proveedoresCarga.map(p => ({ ...p, kilosCargados: 1000, jabasCargadas: 50 })) })
        await refreshFrontendData()
        const load = projectQualityData(operationsContext()).loads.find(l => l.scope === 'industria' && l.fechaProgramada === pending.fechaProgramada && l.cargaId)!
        const guide = { ...createGuideDraft(load), proveedoresIncluidos: load.proveedoresCarga.map(p => p.proveedorId), kilosPorProveedor: Object.fromEntries(load.proveedoresCarga.map(p => [p.proveedorId, p.kilosCargados])), numeroGuia: 'T001-00000003', pesoBrutoTotalKg: 1000, numeroBultos: 50, codEstablecimientoPartida: '0001', codEstablecimientoLlegada: '0001', ubigeoPartida: '200114', ubigeoLlegada: '200101', direccionPartida: 'Camino rural km 2', direccionLlegada: 'Planta Piura', conductorTipoDoc: 'CE' as const, conductorNombres: 'Miguel', conductorApellidos: 'Torres', observacionesSunat: 'Precinto 12' }
        await qualityCommands.guide(load.id, guide)
        await refreshFrontendData()
        const saved = projectQualityData(operationsContext()).loads.find(l => l.id === load.id)!
        expect(saved.guiasRemision[0].numeroGuia).toBe('T001-00000003')
        expect(saved.guiasRemision[0].proveedoresIncluidos).toEqual(saved.proveedoresCarga.map(p => p.proveedorId))
        expect(saved.guiasRemision[0].conductorTipoDoc).toBe('CE')
        expect(saved.guiasRemision[0].conductorNombres).toBe('Miguel')
        expect(saved.guiasRemision[0].conductorApellidos).toBe('Torres')
        expect(saved.guiasRemision[0].observacionesSunat).toBe('Precinto 12')
    })
    it('edita una guía existente y vuelve a cargar todos los datos visibles en su detalle', async () => {
        const load = projectQualityData(operationsContext()).loads.find(row => row.codigoCarga === 'CAR-DEMO-1')!
        const guide = load.guiasRemision[0]
        const changed = { ...guide, fechaEntregaTransportista: '2026-10-30', pesoBrutoTotalKg: 510,
            transportistaMtc: 'MTC-EDITADO', conductorTipoDoc: 'Pasaporte' as const,
            conductorNumeroDoc: 'P-40000002', conductorNombres: 'Miguel', conductorApellidos: 'Torres Ramos',
            ubigeoPartida: '200110', direccionPartida: 'Fundo norte km 3', codEstablecimientoPartida: '0012',
            ubigeoLlegada: '200501', direccionLlegada: 'Planta Paita', codEstablecimientoLlegada: '0009',
            normasSeleccionadas: ['NOP', 'EU'] }
        await qualityCommands.guide(load.id, changed)
        await refreshFrontendData()
        const saved = projectQualityData(operationsContext()).loads.find(row => row.id === load.id)!.guiasRemision[0]
        expect(saved).toMatchObject({ numeroGuia: guide.numeroGuia, fechaInicioTraslado: guide.fechaInicioTraslado,
            fechaEntregaTransportista: '2026-10-30', pesoBrutoTotalKg: 510, numeroBultos: guide.numeroBultos,
            transportistaRuc: guide.transportistaRuc, transportistaDenominacion: guide.transportistaDenominacion,
            transportistaMtc: 'MTC-EDITADO', vehiculoPlaca: guide.vehiculoPlaca,
            conductorTipoDoc: 'Pasaporte', conductorNumeroDoc: 'P-40000002', conductorNombres: 'Miguel',
            conductorApellidos: 'Torres Ramos', conductorLicencia: guide.conductorLicencia,
            ubigeoPartida: '200110', direccionPartida: 'Fundo norte km 3', codEstablecimientoPartida: '0012',
            ubigeoLlegada: '200501', direccionLlegada: 'Planta Paita', codEstablecimientoLlegada: '0009',
            normasSeleccionadas: ['NOP', 'EU'], kilosPorProveedor: guide.kilosPorProveedor })
    })
    it('comparte una sola carga administrativa con el chofer y bloquea otra alta de la misma entrega', async () => {
        const pending = projectQualityData(operationsContext()).loads.find(l => l.scope === 'exportador' && l.puedeRegistrarCarga)!
        const values = { ...pending, fechaCargaReal: '2026-11-07', anotador: 'Anotador de prueba',
            proveedoresCarga: pending.proveedoresCarga.map(p => ({ ...p, kilosCargados: 200, jabasCargadas: 10 })) }
        const saved = await qualityCommands.saveLoad(pending.id, values)
        await expect(qualityCommands.saveLoad(pending.id, { ...values, anotador: 'Otro registro' })).rejects.toThrow(/ya tiene una carga/i)
        const { data } = await apiClient.get<OperationsContext>('/v1/chofer/contexto')
        const portal = projectDriverData(data).loads
        expect(portal.some(load => load.id === pending.id)).toBe(false)
        expect(portal.find(load => load.id === String(saved!.cargaId))).toMatchObject({
            anotador: values.anotador, etapa: 'En carga', rechazada: false, permiteEditarCarga: true,
            proveedores: values.proveedoresCarga.map(p => expect.objectContaining({ kilosCargados: p.kilosCargados, jabasCargadas: p.jabasCargadas })),
        })
        expect(data.loads.filter(load => load.coordinacionEntregaId === saved!.coordinacionEntregaId)).toHaveLength(1)
    })
    it('cambia la variedad de la fila guardada sin sumar una segunda vez los kilos o los bultos', async () => {
        const pending = projectQualityData(operationsContext()).loads.find(l => l.scope === 'exportador' && l.puedeRegistrarCarga)!
        const saved = await qualityCommands.saveLoad(pending.id, { ...pending, fechaCargaReal: '2026-11-07', anotador: 'Calidad',
            proveedoresCarga: pending.proveedoresCarga.map(p => ({ ...p, kilosCargados: 100, jabasCargadas: 4 })) })
        const id = String(saved!.cargaId)
        const before = projectQualityData(operationsContext()).loads.find(row => row.id === id)!
        const provider = before.proveedoresCarga[0]
        const variety = operationsContext().varieties.find(v => v.frutaId === 1 && v.name !== provider.variedad)!
        await qualityCommands.saveLoad(id, { ...before, proveedoresCarga: before.proveedoresCarga.map(p => p === provider ? { ...p, variedad: variety.name } : p) })
        resetFrontendData()
        await refreshFrontendData('/calidad/exportador/1/carga')
        const updated = projectQualityData(operationsContext()).loads.find(row => row.id === id)!
        expect(updated.proveedoresCarga).toEqual(before.proveedoresCarga.map(p => p === provider ? { ...p, variedad: variety.name } : p))
    })
    it.each(['/proveedores', '/origenes'])('revierte el alta si falla %s y permite reintentar después de recargar', async suffix => {
        const pending = projectQualityData(operationsContext()).loads.find(l => l.scope === 'exportador' && l.puedeRegistrarCarga)!
        const coordination = operationsContext().coordinations.find(c => `entrega-${c.entregaProgramadaId}` === pending.id)!
        const values = { ...pending, fechaCargaReal: '2026-11-07', anotador: 'Calidad',
            proveedoresCarga: pending.proveedoresCarga.map(p => ({ ...p, kilosCargados: 100, jabasCargadas: 4 })) }
        const hook = apiClient.interceptors.request.use(request => {
            if (request.method === 'post' && request.url?.endsWith(suffix)) throw new Error('Detalle interrumpido')
            return request
        })
        try {
            await expect(qualityCommands.saveLoad(pending.id, values)).rejects.toThrow('Detalle interrumpido')
        } finally {
            apiClient.interceptors.request.eject(hook)
        }
        resetFrontendData()
        await refreshFrontendData('/calidad/exportador/1/carga')
        expect(operationsContext().loads.some(row => row.coordinacionEntregaId === coordination.coordinacionEntregaId)).toBe(false)
        expect(projectQualityData(operationsContext()).loads.find(row => row.id === pending.id)?.puedeRegistrarCarga).toBe(true)
        const saved = await qualityCommands.saveLoad(pending.id, values)
        expect(projectQualityData(operationsContext()).loads.find(row => row.cargaId === saved!.cargaId)?.proveedoresCarga[0].kilosCargados).toBe(100)
    })
    it('permite completar una cabecera histórica de 0 kg sin enviarla al despacho o la facturación', async () => {
        const pending = projectQualityData(operationsContext()).loads.find(l => l.scope === 'exportador' && l.puedeRegistrarCarga)!
        const coordination = operationsContext().coordinations.find(c => `entrega-${c.entregaProgramadaId}` === pending.id)!
        const { data: orphan } = await apiClient.post<{ cargaId: number }>(`/v1/coordinaciones/${coordination.coordinacionEntregaId}/cargas`, {
            codigo: 'CARGA-INCOMPLETA', fechaCarga: '2026-11-07', anotadorNombre: 'Calidad',
        })
        resetFrontendData()
        await refreshFrontendData('*')
        const g = operationsContext(), id = String(orphan.cargaId)
        expect(projectQualityData(g).loads.find(row => row.id === pending.id)).toMatchObject({ cargaIncompleta: true, puedeRegistrarCarga: true })
        expect(projectDriverData(g).loads.find(row => row.id === pending.id)).toMatchObject({ cargaIncompleta: true, pendienteRegistro: true, permiteEditarCarga: false })
        expect(projectLogisticsData(g).some(row => row.id === id)).toBe(false)
        expect(projectSettlementData(g).some(row => row.id === id)).toBe(false)
        expect(projectBillingData(g).some(client => client.cargas.some(row => row.id === id))).toBe(false)
        const withHistoricalInvoice = structuredClone(g)
        withHistoricalInvoice.invoices.push({ ...g.invoices[0], facturaVentaId: 999, cargaId: orphan.cargaId })
        const invoiceHistory = projectBillingData(withHistoricalInvoice).flatMap(client => client.cargas).find(row => row.id === id)!
        expect(invoiceHistory.facturas.map(invoice => invoice.id)).toEqual(['999'])
        expect(billingLoadReady(invoiceHistory)).toBe(false)
        const saved = await qualityCommands.saveLoad(pending.id, { ...pending, fechaCargaReal: '2026-11-07', anotador: 'Calidad',
            proveedoresCarga: pending.proveedoresCarga.map(p => ({ ...p, kilosCargados: 100, jabasCargadas: 4 })) })
        expect(saved?.cargaId).toBe(orphan.cargaId)
        resetFrontendData()
        await refreshFrontendData('*')
        expect(projectDriverData(operationsContext()).loads.find(row => row.id === id)).toMatchObject({ permiteEditarCarga: true })
    })
    it('conserva la carga del chofer y precarga sus kilos y bultos en la guía', async () => {
        const g = operationsContext()
        const pending = projectDriverData(g).loads.find(row => row.pendienteRegistro && row.canal === 'Exportación')!
        const providers = pending.proveedores.map(p => ({ ...p, kilosCargados: 100, jabasCargadas: 4 }))
        const [provider] = providers
        expect(pending.variedadesCoordinadas?.[provider.proveedorId]).toEqual(['Mango Kent'])
        const values = { fechaCarga: '2026-11-07', anotador: 'Chofer', viaticosMovilidad: 0, viaticosInsumos: 0,
            gastoCuadrilla: 0, gastoAnotadores: 0, observacionesCarga: '', proveedores: providers }
        await expect(driverCommands.load(pending.id, { ...values, proveedores: [{ ...provider, variedad: 'Mango Edward' }, ...providers.slice(1)] }))
            .rejects.toThrow(/variedad de las fincas coordinadas/)
        await driverCommands.load(pending.id, values)
        const { data } = await apiClient.get<OperationsContext>('/v1/chofer/contexto')
        const coordination = data.coordinations.find(c => `entrega-${c.entregaProgramadaId}` === pending.id)!
        const saved = data.loads.find(row => row.coordinacionEntregaId === coordination.coordinacionEntregaId)!
        expect(projectDriverData(data).loads.find(row => row.id === String(saved.cargaId))?.proveedores[0]).toMatchObject({ variedad: 'Mango Kent', kilosCargados: 100 })

        await refreshFrontendData('*')
        await driverCommands.load(String(saved.cargaId), { ...values, proveedores: [
            { ...provider, kilosCargados: 500, jabasCargadas: 30, jabasVacias: 4, binesCargados: 15, binesVacios: 3, mallasCargadas: 5, mallasVacias: 3 },
            ...providers.slice(1),
        ] })
        await refreshFrontendData('*')
        const load = projectQualityData(operationsContext()).loads.find(row => row.cargaId === saved.cargaId)!
        const included = [provider.proveedorId]
        expect(guideAllocationTotals(load, included, { [provider.proveedorId]: 500 })).toEqual({ kilos: 500, bultos: 60 })
        expect(guideAllocationTotals(load, included, { [provider.proveedorId]: 250 })).toEqual({ kilos: 250, bultos: null })
    })
    it('guarda el rechazo industrial sin crear carga y lo comparte con el chofer', async () => {
        const pending = projectQualityData(operationsContext()).loads.find(l => l.scope === 'industria' && l.puedeRegistrarCarga)!
        await qualityCommands.saveLoad(pending.id, { ...pending, cumpleRequisitosIndustria: false, motivoRechazoIndustria: 'Fermentación' })
        expect(projectQualityData(operationsContext()).loads.find(l => l.id === pending.id)).toMatchObject({
            cargaId: undefined, puedeRegistrarCarga: false, motivoRechazoIndustria: 'Fermentación',
        })
        await expect(qualityCommands.saveLoad(pending.id, { ...pending, cumpleRequisitosIndustria: true })).rejects.toThrow(/no está disponible/i)
        const { data } = await apiClient.get<OperationsContext>('/v1/chofer/contexto')
        expect(projectDriverData(data).loads.find(load => load.id === pending.id)).toMatchObject({
            pendienteRegistro: true, rechazada: true, permiteEditarCarga: false,
        })
    })
    it('conserva los datos del primer guardado si administrador y chofer registran a la vez', async () => {
        const pending = projectQualityData(operationsContext()).loads.find(l => l.scope === 'exportador' && l.puedeRegistrarCarga)!
        const admin = { ...pending, fechaCargaReal: '2026-11-07', anotador: 'Administrador',
            proveedoresCarga: pending.proveedoresCarga.map(p => ({ ...p, kilosCargados: 200, jabasCargadas: 10 })) }
        const driver = { ...admin, fechaCarga: admin.fechaCargaReal, anotador: 'Chofer',
            proveedores: admin.proveedoresCarga.map(p => ({ ...p, tipo: p.rol, kilosCargados: 250 })) }
        const attempts = await Promise.allSettled([
            qualityCommands.saveLoad(pending.id, admin),
            driverCommands.load(pending.id, driver),
        ])
        expect(attempts.filter(attempt => attempt.status === 'fulfilled')).toHaveLength(1)
        const { data } = await apiClient.get<OperationsContext>('/v1/chofer/contexto')
        const coordination = data.coordinations.find(c => `entrega-${c.entregaProgramadaId}` === pending.id)!
        const loads = data.loads.filter(load => load.coordinacionEntregaId === coordination.coordinacionEntregaId)
        expect(loads).toHaveLength(1)
        const winner = attempts[0].status === 'fulfilled' ? admin : driver
        expect(loads[0].anotadorNombre).toBe(winner.anotador)
        const providerKg = data.loadProviders.filter(p => p.cargaId === loads[0].cargaId).map(p => p.kilosCargados)
        expect(providerKg).toEqual(winner === admin ? admin.proveedoresCarga.map(p => p.kilosCargados) : driver.proveedores.map(p => p.kilosCargados))
    })
    it('reparte un proveedor entre varias guías y permite eliminar solo un borrador de la misma carga', async () => {
        const pending = projectQualityData(operationsContext()).loads.find(l => l.scope === 'exportador' && l.puedeRegistrarCarga)!
        await qualityCommands.saveLoad(pending.id, { ...pending, fechaCargaReal: '2026-11-07', anotador: 'Anotador de prueba', proveedoresCarga: pending.proveedoresCarga.map(p => ({ ...p, kilosCargados: 200, jabasCargadas: 10 })) })
        await refreshFrontendData()
        const load = projectQualityData(operationsContext()).loads.find(l => l.scope === 'exportador' && l.fechaProgramada === pending.fechaProgramada && l.cargaId)!
        const provider = load.proveedoresCarga[0]
        const base = { ...createGuideDraft(load), proveedoresIncluidos: [provider.proveedorId], numeroBultos: 1,
            codEstablecimientoPartida: '0001', codEstablecimientoLlegada: '0001', ubigeoPartida: '200114', ubigeoLlegada: '200101',
            direccionPartida: 'Finca de prueba', direccionLlegada: 'Planta de prueba' }
        const firstKg = Math.min(100, provider.kilosCargados / 2)
        await qualityCommands.guide(load.id, { ...base, numeroGuia: 'T001-00990001', kilosPorProveedor: { [provider.proveedorId]: firstKg }, pesoBrutoTotalKg: firstKg, normasSeleccionadas: ['NOP', 'EU'] })
        await refreshFrontendData()
        const afterFirst = projectQualityData(operationsContext()).loads.find(l => l.id === load.id)!
        const first = afterFirst.guiasRemision.find(guide => guide.numeroGuia === 'T001-00990001')!
        expect(first.estado).toBe('Lista para generar')
        expect(first.kilosPorProveedor?.[provider.proveedorId]).toBe(firstKg)
        expect(first.normasSeleccionadas).toEqual(['NOP', 'EU'])
        expect(operationsContext().guides.find(guide => String(guide.guiaRemisionId) === first.id)?.contenido.standardText).toBe(qualityGuideStandardText(['NOP', 'EU']))
        await expect(qualityCommands.guide(load.id, { ...first, estado: 'Generada' })).rejects.toThrow(/todos los kilos/i)
        const secondKg = Math.min(100, provider.kilosCargados - firstKg)
        await qualityCommands.guide(load.id, { ...base, numeroGuia: 'T001-00990002', kilosPorProveedor: { [provider.proveedorId]: secondKg }, pesoBrutoTotalKg: secondKg })
        await expect(qualityCommands.guide(load.id, { ...base, numeroGuia: 'T001-00990003', kilosPorProveedor: { [provider.proveedorId]: provider.kilosCargados }, pesoBrutoTotalKg: provider.kilosCargados })).rejects.toThrow(/kilos asignados/i)
        await qualityCommands.removeGuide(load.id, first.id)
        await refreshFrontendData()
        const remaining = projectQualityData(operationsContext()).loads.find(l => l.id === load.id)!.guiasRemision
        expect(remaining.some(guide => guide.id === first.id)).toBe(false)
        expect(remaining.some(guide => guide.numeroGuia === 'T001-00990002')).toBe(true)
        const second = remaining.find(guide => guide.numeroGuia === 'T001-00990002')!
        await qualityCommands.guide(load.id, { ...second, kilosPorProveedor: { [provider.proveedorId]: provider.kilosCargados }, pesoBrutoTotalKg: provider.kilosCargados, estado: 'Generada' })
        await refreshFrontendData()
        const issued = projectQualityData(operationsContext()).loads.find(l => l.id === load.id)!.guiasRemision.find(guide => guide.id === second.id)!
        expect(issued.estado).toBe('Generada')
        await expect(qualityCommands.removeGuide(load.id, issued.id)).rejects.toThrow(/emitida/i)
        await expect(qualityCommands.guide(load.id, { ...issued, numeroGuia: 'T001-00990004' })).rejects.toThrow(/emitida/i)
    }, 20000)
})
