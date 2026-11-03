import type { JsonObject } from '@/shared/api/v1-client';
import { recepcionPlantaV1 } from '@/modules/logistics/api/v1.api';
import { operationsContext } from '@/modules/operations/api/operations-context.api';
import { loadContext } from '@/modules/operations/api/operation-links';
import { commitRemote } from '@/shared/api/data-contract';
import { jsonObject } from '@/modules/quality/api/quality-screen-data';
import { jsonData } from '@/shared/api/document-state';
import { persistFile } from '@/shared/api/uploadDocument';
import { isPdf } from '@/shared/utils/fileSource';
import { hasChanges } from '@/modules/quality/api/quality-commands.api';
import type { LogisticsProviderBreakdown, LogisticsReceptionData, LogisticsDocumentsClosure, LogisticsArrival, LogisticsCrateReturn } from '@/modules/logistics/logistics.models';
import type { CreateRecepcionPlantaV1 } from '@/modules/logistics/api/v1.dto';
export async function writeReceipt(loadId: string, input: CreateRecepcionPlantaV1 | Partial<CreateRecepcionPlantaV1>) {
    const c = loadContext(loadId), current = operationsContext().receipts.find(r => r.cargaId === c.load.cargaId), api = recepcionPlantaV1(c.load.cargaId);
    return current ? (hasChanges(current, input) ? api.update(current.recepcionPlantaId, input) : current) : api.create(input as CreateRecepcionPlantaV1);
}
export const logisticsCommands = {
    documents: (id: string, value: LogisticsDocumentsClosure) => commitRemote(async () => {
        const c = loadContext(id), old = operationsContext().receipts.find(receipt => receipt.cargaId === c.load.cargaId);
        if (!old) throw new Error('Registra la recepción de esta carga antes de guardar su expediente.');
        if (value.guiaRemisionFruta && !isPdf(value.guiaRemisionFruta))
            throw new Error('La guía de remisión de fruta debe adjuntarse en PDF.');
        const documents = { guiaRemisionFruta: await persistFile(value.guiaRemisionFruta),
            detalleCompras: await persistFile(value.detalleCompras ?? null),
            reporteRecepcionPlanta: await persistFile(value.reporteRecepcionPlanta),
            actaDescarte: await persistFile(value.actaDescarte),
            constanciaDevolucionJabas: await persistFile(value.constanciaDevolucionJabas ?? null),
            guiaSalidaFirmada: await persistFile(value.guiaSalidaFirmada) };
        return writeReceipt(id, { documentos: { ...old.documentos, ...jsonData(documents), observacionesCierre: value.observacionesCierre } });
    }),
    physicalClose: (id: string) => commitRemote(async () => {
        const c = loadContext(id), g = operationsContext(), old = g.receipts.find(receipt => receipt.cargaId === c.load.cargaId);
        if (!old) throw new Error('Registra primero la recepción de esta carga.');
        if (!old.pesoPlantaKg || !old.resultado || !old.descargaInicioAt || !old.descargaFinAt
            || Number.isNaN(Date.parse(old.descargaInicioAt)) || Number.isNaN(Date.parse(old.descargaFinAt))
            || Date.parse(old.descargaFinAt) < Date.parse(old.descargaInicioAt))
            throw new Error('Completa el peso, resultado y horarios de descarga antes del cierre físico.');
        if (!old.logistica.reporteRecepcionArchivo && !old.documentos.reporteRecepcionPlanta)
            throw new Error('Adjunta el informe de recepción antes del cierre físico.');
        if (!g.guides.some(guide => guide.cargaId === c.load.cargaId && guide.emitidaAt))
            throw new Error('Emite la guía de remisión de fruta antes del cierre físico.');
        const fruitGuide = jsonObject(old.documentos.guiaRemisionFruta);
        if (!fruitGuide.url || !String(fruitGuide.name ?? '').toLowerCase().endsWith('.pdf'))
            throw new Error('Adjunta el PDF de la guía de remisión de fruta antes del cierre físico.');
        return writeReceipt(id, { cierreFisicoAt: old.cierreFisicoAt ?? new Date().toISOString() });
    }),
    administrativeClose: (id: string) => commitRemote(async () => {
        const c = loadContext(id), graph = operationsContext(), old = graph.receipts.find(receipt => receipt.cargaId === c.load.cargaId);
        if (!old?.cierreFisicoAt) throw new Error('Registra primero el cierre físico.');
        if (!old.documentos.guiaSalidaFirmada) throw new Error('Adjunta la guía de salida firmada antes del cierre administrativo.');
        if (!graph.histories.some(event => event.coordinacionEntregaId === c.coordination.coordinacionEntregaId && event.estado === 'CIERRE'))
            throw new Error('El chofer debe cerrar su despacho antes del cierre administrativo; después ya no podrá completar su checklist.');
        return writeReceipt(id, { cierreAdministrativoAt: old.cierreAdministrativoAt ?? new Date().toISOString() });
    }),
    arrival: (id: string, value: LogisticsArrival) => commitRemote(async () => {
        if (value.ventanaInicio && value.ventanaFin && value.ventanaFin < value.ventanaInicio)
            throw new Error('El fin de la ventana debe ser posterior al inicio.');
        const outside = Boolean(value.llegadaReal && value.ventanaInicio && value.ventanaFin
            && (value.llegadaReal < value.ventanaInicio || value.llegadaReal > value.ventanaFin));
        if (outside && (!value.motivoEspera.trim() || !value.atencionReprogramada))
            throw new Error('Registra el motivo de espera y la nueva atención para una llegada fuera de la ventana.');
        const c = loadContext(id), old = operationsContext().receipts.find(receipt => receipt.cargaId === c.load.cargaId);
        const evidence = await persistFile(value.evidencia);
        return writeReceipt(id, { logistica: { ...old?.logistica, estimatedArrival: value.llegadaEstimada,
            windowStart: value.ventanaInicio, windowEnd: value.ventanaFin, actualArrival: value.llegadaReal,
            arrivalObservations: value.observaciones, coordinationEvidence: jsonData({ evidence }).evidence,
            waitingReason: value.motivoEspera, rescheduledAttention: value.atencionReprogramada } });
    }),
    unloading: (id: string, value: Pick<LogisticsReceptionData, 'inicioDescarga' | 'terminoDescarga' | 'responsableRecepcion' | 'observacionesDescarga' | 'evidenciaDescarga'>) => commitRemote(async () => {
        if (!value.inicioDescarga || !value.terminoDescarga || value.terminoDescarga < value.inicioDescarga
            || !value.responsableRecepcion.trim())
            throw new Error('Registra horarios válidos y el responsable de la descarga.');
        const c = loadContext(id), old = operationsContext().receipts.find(receipt => receipt.cargaId === c.load.cargaId);
        const evidence = await persistFile(value.evidenciaDescarga ?? null);
        return writeReceipt(id, { descargaInicioAt: value.inicioDescarga ? new Date(value.inicioDescarga).toISOString() : null,
            descargaFinAt: value.terminoDescarga ? new Date(value.terminoDescarga).toISOString() : null,
            logistica: { ...old?.logistica, responsableRecepcion: value.responsableRecepcion,
                observacionesDescarga: value.observacionesDescarga, evidenciaDescarga: jsonData({ evidence }).evidence } });
    }),
    evaluation: (id: string, value: Pick<LogisticsReceptionData, 'pesoRecibidoPlanta' | 'resultadoRecepcion' | 'observacionesEvaluacion' | 'reporteRecepcionArchivo'>, providers: LogisticsProviderBreakdown[]) => commitRemote(async () => {
        const c = loadContext(id), g = operationsContext(), old = g.receipts.find(receipt => receipt.cargaId === c.load.cargaId);
        const total = providers.reduce((sum, provider) => sum + provider.kilosRecibidosPlanta, 0);
        if (value.pesoRecibidoPlanta <= 0 || Math.abs(total - value.pesoRecibidoPlanta) > 0.01)
            throw new Error('Los kilos reconocidos por proveedor deben sumar el peso recibido en planta.');
        if (providers.some(provider => provider.kilosRecibidosPlanta <= 0 || provider.kilosRecibidosPlanta > provider.kilosCargados))
            throw new Error('Revisa los kilos reconocidos de cada proveedor.');
        if (!value.resultadoRecepcion.trim()) throw new Error('Registra el resultado de la evaluación.');
        const previous = (old?.compras ?? []).map(jsonObject);
        const changed = providers.some(provider => {
            const row = previous.find(item => item.providerId === Number(provider.proveedorId));
            return !row || Number(row.recognizedQuantity ?? 0) !== provider.kilosRecibidosPlanta;
        });
        if (changed && g.providerSettlements.some(settlement => settlement.cargaId === c.load.cargaId))
            throw new Error('Los kilos reconocidos ya fueron aplicados a liquidaciones y no se pueden modificar.');
        const report = await persistFile(value.reporteRecepcionArchivo);
        return writeReceipt(id, { pesoPlantaKg: value.pesoRecibidoPlanta, resultado: value.resultadoRecepcion,
            observaciones: value.observacionesEvaluacion, fechaRecepcion: old?.fechaRecepcion ?? new Date().toISOString(),
            recepcionConfirmadaAt: old?.recepcionConfirmadaAt ?? new Date().toISOString(),
            ...(changed ? { compras: providers.map((provider): JsonObject => {
                const row = previous.find(item => item.providerId === Number(provider.proveedorId));
                return row ? { ...row, recognizedQuantity: provider.kilosRecibidosPlanta }
                    : { providerId: Number(provider.proveedorId), recognizedQuantity: provider.kilosRecibidosPlanta,
                        reference: '', quantity: provider.kilosCargados, document: null, reviewStatus: 'Pendiente de revisión', observation: '' };
            }) } : {}),
            logistica: { ...old?.logistica, reporteRecepcionArchivo: jsonData({ report }).report } });
    }),
    discard: (id: string, value: Pick<LogisticsReceptionData, 'huboDescarte' | 'kilosDescarte' | 'unidadDescarte' | 'motivoDescarte' | 'actaDescarteArchivo'>) => commitRemote(async () => {
        const c = loadContext(id), old = operationsContext().receipts.find(receipt => receipt.cargaId === c.load.cargaId);
        if (!old?.pesoPlantaKg || !old.resultado) throw new Error('Registra primero la evaluación de la carga.');
        if (value.huboDescarte && (value.kilosDescarte <= 0 || value.kilosDescarte > old.pesoPlantaKg || !value.motivoDescarte.trim()))
            throw new Error('Ingresa una cantidad válida y el motivo del descarte.');
        const evidence = await persistFile(value.actaDescarteArchivo);
        return writeReceipt(id, { huboDescarte: value.huboDescarte, descarteKg: value.huboDescarte ? value.kilosDescarte : 0,
            descarteConfirmadoAt: value.huboDescarte ? new Date().toISOString() : null,
            logistica: { ...old.logistica, motivoDescarte: value.motivoDescarte,
                descarteUnidad: value.unidadDescarte || 'kg', actaDescarteArchivo: jsonData({ evidence }).evidence } });
    }),
    crateReturn: (id: string, value: LogisticsCrateReturn) => commitRemote(async () => {
        const c = loadContext(id), old = operationsContext().receipts.find(receipt => receipt.cargaId === c.load.cargaId);
        if (!old) throw new Error('Registra primero la recepción de esta carga.');
        if (value.jabasIniciales == null || value.jabasDevueltas == null
            || !Number.isInteger(value.jabasIniciales) || !Number.isInteger(value.jabasDevueltas)
            || value.jabasIniciales < 0 || value.jabasDevueltas < 0 || value.jabasDevueltas > value.jabasIniciales)
            throw new Error('Revisa la cantidad de jabas que llegaron y las devueltas.');
        if (value.jabasDevueltas > 0 && !value.fechaDevolucion)
            throw new Error('Registra la fecha de devolución de las jabas.');
        const evidence = await persistFile(value.evidencia);
        return writeReceipt(id, { jabasIniciales: value.jabasIniciales, jabasDevueltas: value.jabasDevueltas,
            jabasDevolucionAt: value.fechaDevolucion ? new Date(value.fechaDevolucion).toISOString() : null,
            checklist: { ...old.checklist, crateCoordination: value.coordinacion, vehicleExit: value.salidaVehiculo,
                carrierCopy: value.copiaTransportista, crateReturnEvidence: jsonData({ evidence }).evidence } });
    }),
    purchaseObservation: (id: string, providerId: string, observation: string) => commitRemote(async () => {
        const c = loadContext(id), g = operationsContext();
        if (g.providerSettlements.some(settlement => settlement.cargaId === c.load.cargaId))
            throw new Error('Las compras de esta carga ya fueron aplicadas a liquidaciones y no se pueden modificar.');
        const old = g.receipts.find(receipt => receipt.cargaId === c.load.cargaId);
        if (!old) throw new Error('Registra la recepción de la carga antes de revisar sus compras.');
        const purchases = old.compras.map(jsonObject);
        if (!purchases.some(row => String(row.providerId) === providerId)) throw new Error('No se encontró la compra del proveedor.');
        return writeReceipt(id, { compras: purchases.map(row => String(row.providerId) === providerId
            ? { ...row, observation, reviewStatus: observation.trim() ? 'Observada' : 'Revisada' } : row) });
    }),
    sharePurchases: (id: string) => commitRemote(async () => {
        const c = loadContext(id), old = operationsContext().receipts.find(receipt => receipt.cargaId === c.load.cargaId);
        if (!old) throw new Error('Registra la recepción de la carga antes de compartir sus compras.');
        return writeReceipt(id, { logistica: { ...old.logistica, accountingStatus: 'Compartido con Contabilidad' } });
    }),
};
