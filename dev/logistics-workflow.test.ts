import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { createV1MockMiddleware } from './v1-mock.ts'
import { apiClient } from '@/shared/api/client'
import { refreshFrontendData } from '@/frontend-data'
import { operationsContext } from '@/modules/operations/api/operations-context.api'
import { projectLogisticsData } from '@/modules/logistics/api/logistics-screen-data'
import { logisticsCommands } from '@/modules/logistics/api/logistics-commands.api'
import { projectQualityData } from '@/modules/quality/api/quality-screen-data'
import { qualityCommands } from '@/modules/quality/api/quality-commands.api'
import { projectDriverData } from '@/modules/driver-portal/api/driver-screen-data'
import { driverCommands } from '@/modules/driver-portal/api/driver-commands.api'
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

describe('Logística con datos relacionados de desarrollo', () => {
    it('proyecta cargas, trayectos, compras, recepción y jabas de las mismas entidades', () => {
        const loads = projectLogisticsData(operationsContext())
        expect(loads.length).toBeGreaterThanOrEqual(3)
        const first = loads.find(load => load.codigo === 'CAR-DEMO-1')!
        expect(first.proveedores).toHaveLength(2)
        expect(first.compras).toHaveLength(2)
        expect(first.compras?.every(purchase => first.proveedores.some(provider => provider.proveedorId === purchase.proveedorId))).toBe(true)
        expect(first.historialChofer?.map(event => event.etapa)).toContain('Llegada')
        expect(first.recepcion.pesoRecibidoPlanta).toBe(960)
        expect(first.devolucionJabas?.jabasIniciales).toBe(50)
        expect(first.devolucionJabas?.jabasDevueltas).toBe(40)
    })

    it('agrupa participaciones repetidas de un proveedor para reconocer sus kilos una sola vez', () => {
        const graph = structuredClone(operationsContext())
        const source = graph.loadProviders.find(row => row.cargaId === 1 && row.cxpId === 1)!
        graph.loadProviders.push({ ...source, proveedorCargaId: 999, kilosCargados: 100, jabasCargadas: 5 })
        const load = projectLogisticsData(graph).find(item => item.codigo === 'CAR-DEMO-1')!
        expect(load.proveedores).toHaveLength(2)
        expect(load.proveedores.find(row => row.proveedorId === '1')).toMatchObject({
            kilosCargados: 700, kilosRecibidosPlanta: 580, jabasCargadas: 35,
        })
    })

    it('muestra el checklist del chofer en el detalle sin confundirlo con la recepción administrativa', () => {
        const graph = structuredClone(operationsContext())
        const receipt = graph.receipts.find(row => row.cargaId === 1)!
        receipt.checklist = { ...receipt.checklist,
            llegada: { registrado: true, kilosEnPlanta: '955', huboDescarte: true, kilosDescarte: '5', motivoDescarte: 'Daño visible', observacionesEntrega: 'Rampa 2' },
            guiaSalida: { numeroGuia: 'GS-001', archivo: { url: 'data:application/pdf;base64,JVBERi0=', name: 'salida.pdf' } },
        }
        receipt.compras[0] = { ...(receipt.compras[0] as Record<string, unknown>), document: { url: 'data:application/pdf;base64,JVBERi0=', name: 'compra.pdf' } }
        const load = projectLogisticsData(graph).find(item => item.codigo === 'CAR-DEMO-1')!
        expect(load.checklistChofer).toMatchObject({ llegadaRegistrada: true, kilosEnPlanta: '955', kilosDescarte: '5', guiaSalidaNumero: 'GS-001' })
        expect(load.checklistChofer?.guiaSalidaArchivo?.name).toBe('salida.pdf')
        expect(load.recepcion.pesoRecibidoPlanta).toBe(960)
        expect(load.compras?.[0].soporteArchivo?.name).toBe('compra.pdf')
    })

    it('bloquea compras liquidadas, conserva los kilos revisados y exige guía emitida para el cierre físico', async () => {
        const loads = projectLogisticsData(operationsContext())
        const load = loads.find(item => item.codigo === 'CAR-DEMO-1')!
        const provider = load.compras![0]
        expect(load.comprasBloqueadas).toBe(true)
        await expect(logisticsCommands.purchaseObservation(load.id, provider.proveedorId, 'Verificar comprobante'))
            .rejects.toThrow(/liquidaciones/i)
        const editable = loads.find(item => item.compras?.length && !item.comprasBloqueadas)!
        const editableProvider = editable.compras![0]
        await logisticsCommands.purchaseObservation(editable.id, editableProvider.proveedorId, 'Verificar comprobante de compra')
        await refreshFrontendData()
        const revised = projectLogisticsData(operationsContext()).find(item => item.id === editable.id)!
        expect(revised.compras?.find(row => row.proveedorId === editableProvider.proveedorId)?.estadoRevision).toBe('Observada')
        expect(revised.proveedores.find(row => row.proveedorId === editableProvider.proveedorId)?.kilosRecibidosPlanta).toBe(780)
        await expect(logisticsCommands.physicalClose(load.id)).rejects.toThrow(/informe de recepción/i)

        await logisticsCommands.documents(load.id, { ...load.documentosCierre, reporteRecepcionPlanta: demoPdf('recepcion.pdf') })
        await refreshFrontendData()
        await expect(logisticsCommands.physicalClose(load.id)).rejects.toThrow(/emite la guía/i)

        const withReport = projectLogisticsData(operationsContext()).find(item => item.id === load.id)!
        await logisticsCommands.documents(load.id, { ...withReport.documentosCierre, guiaRemisionFruta: demoPdf('guia-fruta.pdf') })
        await refreshFrontendData()
        expect(projectLogisticsData(operationsContext()).find(item => item.id === load.id)?.documentosCierre.guiaRemisionFruta?.name).toBe('guia-fruta.pdf')
    }, 15_000)

    it('registra llegada y devolución parcial sin convertirlas en cierre', async () => {
        const load = projectLogisticsData(operationsContext()).find(item => item.codigo === 'CAR-DEMO-1')!
        await logisticsCommands.arrival(load.id, { ...load.llegada!, llegadaReal: '2026-10-29T13:20', observaciones: 'Control en puerta' })
        await logisticsCommands.crateReturn(load.id, { ...load.devolucionJabas!, jabasIniciales: 50, jabasDevueltas: 42, coordinacion: 'Ocho jabas pendientes' })
        await refreshFrontendData()
        const updated = projectLogisticsData(operationsContext()).find(item => item.id === load.id)!
        expect(updated.llegada?.observaciones).toBe('Control en puerta')
        expect(updated.devolucionJabas?.jabasDevueltas).toBe(42)
        expect(updated.documentosCierre.cierreFisicoConfirmado).toBe(false)
    })

    it('rechaza ventanas, descargas y devoluciones inconsistentes antes de escribir en V1', async () => {
        const load = projectLogisticsData(operationsContext()).find(item => item.codigo === 'CAR-DEMO-1')!
        await expect(logisticsCommands.arrival(load.id, { ...load.llegada!, llegadaReal: '2026-10-29T20:00', motivoEspera: '', atencionReprogramada: '' }))
            .rejects.toThrow(/motivo de espera/i)
        await expect(logisticsCommands.unloading(load.id, { inicioDescarga: '2026-10-29T19:00', terminoDescarga: '2026-10-29T18:00', responsableRecepcion: 'QA', observacionesDescarga: '', evidenciaDescarga: null }))
            .rejects.toThrow(/horarios válidos/i)
        await expect(logisticsCommands.crateReturn(load.id, { ...load.devolucionJabas!, jabasIniciales: 50, jabasDevueltas: 51 }))
            .rejects.toThrow(/cantidad de jabas/i)
        expect(operationsContext().receipts.find(row => row.cargaId === Number(load.id))?.jabasDevueltas).toBe(40)
    })

    it('exige el PDF de la guía aun cuando la guía electrónica ya fue emitida', async () => {
        const load = projectLogisticsData(operationsContext()).find(item => item.codigo === 'CAR-DEMO-1')!
        const qualityLoad = projectQualityData(operationsContext()).loads.find(item => item.id === load.id)!
        const guide = qualityLoad.guiasRemision[0]
        const kilosPorProveedor = Object.fromEntries(qualityLoad.proveedoresCarga.map(provider => [provider.proveedorId, provider.kilosCargados]))
        await qualityCommands.guide(load.id, { ...guide, kilosPorProveedor, pesoBrutoTotalKg: 1000, estado: 'Generada' })
        await logisticsCommands.documents(load.id, { ...load.documentosCierre, reporteRecepcionPlanta: demoPdf('recepcion.pdf') })
        await refreshFrontendData()
        expect(projectLogisticsData(operationsContext()).find(item => item.id === load.id)?.guiaFrutaEmitida).toBe(guide.numeroGuia)
        await expect(logisticsCommands.physicalClose(load.id)).rejects.toThrow(/PDF de la guía/i)
        const withReport = projectLogisticsData(operationsContext()).find(item => item.id === load.id)!
        await logisticsCommands.documents(load.id, { ...withReport.documentosCierre, guiaRemisionFruta: demoPdf('guia-fruta.pdf') })
        await logisticsCommands.physicalClose(load.id)
        await refreshFrontendData()
        expect(projectLogisticsData(operationsContext()).find(item => item.id === load.id)?.documentosCierre.cierreFisicoConfirmado).toBe(true)
        await expect(logisticsCommands.administrativeClose(load.id)).rejects.toThrow(/guía de salida firmada/i)
        const physicallyClosed = projectLogisticsData(operationsContext()).find(item => item.id === load.id)!
        await logisticsCommands.documents(load.id, { ...physicallyClosed.documentosCierre, guiaSalidaFirmada: demoPdf('salida-firmada.pdf') })
        await expect(logisticsCommands.administrativeClose(load.id)).rejects.toThrow(/chofer debe cerrar/i)
        expect(projectDriverData(operationsContext()).loads.find(item => item.id === load.id)?.etapa).toBe('Llegada')
        await expect(driverCommands.advance(load.id)).rejects.toThrow(/checklist de recepción/i)
        await driverCommands.arrival(load.id, { kilosEnPlanta: '960', huboDescarte: false, kilosDescarte: '0',
            motivoDescarte: '', observacionesEntrega: 'Recepción conforme', registrado: true })
        await driverCommands.advance(load.id)
        await refreshFrontendData()
        expect(projectDriverData(operationsContext()).loads.find(item => item.id === load.id)?.etapa).toBe('Cierre')
        await logisticsCommands.administrativeClose(load.id)
        await refreshFrontendData()
        expect(projectLogisticsData(operationsContext()).find(item => item.id === load.id)?.documentosCierre.cierreAdministrativoConfirmado).toBe(true)
        await expect(logisticsCommands.crateReturn(load.id, { ...load.devolucionJabas!, jabasDevueltas: 41 }))
            .rejects.toThrow(/cierre administrativo/i)
    }, 15_000)
})
