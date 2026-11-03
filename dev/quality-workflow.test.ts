import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { createV1MockMiddleware } from './v1-mock.ts'
import { apiClient } from '@/shared/api/client'
import { refreshFrontendData } from '@/frontend-data'
import { operationsContext } from '@/modules/operations/api/operations-context.api'
import { projectQualityData } from '@/modules/quality/api/quality-screen-data'
import { campaignAnalysisOrigins, qualityCommands } from '@/modules/quality/api/quality-commands.api'
import { createGuideDraft } from '@/modules/quality/remissionGuide.utils'
import { qualityGuideStandardText } from '@/modules/quality/qualityGuideNorms.utils'
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
    await refreshFrontendData()
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
        const pending = projectQualityData(operationsContext()).loads.find(l => l.scope === 'industria' && l.id.startsWith('entrega-'))!
        await qualityCommands.saveLoad(pending.id, { ...pending, fechaCargaReal: '2026-11-07', anotador: 'Anotador de prueba', proveedoresCarga: pending.proveedoresCarga.map(p => ({ ...p, kilosCargados: 1000, jabasCargadas: 50 })) })
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
    it('reparte un proveedor entre varias guías y permite eliminar solo un borrador de la misma carga', async () => {
        const pending = projectQualityData(operationsContext()).loads.find(l => l.scope === 'exportador' && l.id.startsWith('entrega-'))!
        await qualityCommands.saveLoad(pending.id, { ...pending, fechaCargaReal: '2026-11-07', anotador: 'Anotador de prueba', proveedoresCarga: pending.proveedoresCarga.map(p => ({ ...p, kilosCargados: 1000, jabasCargadas: 50 })) })
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
