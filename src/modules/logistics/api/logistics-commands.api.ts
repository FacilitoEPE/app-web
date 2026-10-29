import { recepcionPlantaV1 } from '@/modules/logistics/api/future.api';
import { operationsContext } from '@/modules/operations/api/operations-context.api';
import { loadContext } from '@/modules/operations/api/operation-links';
import { commitRemote } from '@/shared/api/data-contract';
import { assertNoNewFiles, jsonData } from '@/shared/api/document-state';
import { writeLoad, hasChanges } from '@/modules/quality/api/quality-commands.api';
import type { LogisticsProviderBreakdown, LogisticsReceptionData, LogisticsCrateMovement, LogisticsDocumentsClosure } from '@/modules/logistics/logistics.models';
import type { CreateRecepcionPlantaV1 } from '@/modules/logistics/api/future.dto';
export async function writeReceipt(loadId: string, input: CreateRecepcionPlantaV1 | Partial<CreateRecepcionPlantaV1>) {
    const c = loadContext(loadId), current = operationsContext().receipts.find(r => r.cargaId === c.load.cargaId), api = recepcionPlantaV1(c.load.cargaId);
    return current ? (hasChanges(current, input) ? api.update(current.recepcionPlantaId, input) : current) : api.create(input as CreateRecepcionPlantaV1);
}
export const logisticsCommands = {
    purchases: (id: string, payload: {
        fechaCarga: string;
        anotador: string;
        viaticosMovilidad: number;
        viaticosInsumos: number;
        gastoCuadrilla: number;
        gastoAnotadores: number;
        observacionesCarga: string;
        proveedores: LogisticsProviderBreakdown[];
    }) => commitRemote(() => writeLoad(id, { ...payload, fechaCargaReal: payload.fechaCarga, proveedoresCarga: payload.proveedores.map(p => ({ ...p, rol: p.tipo, tipoFruta: 'Convencional' as const })) })),
    receive: (id: string, value: LogisticsReceptionData, providers: LogisticsProviderBreakdown[]) => commitRemote(async () => {
        assertNoNewFiles(value);
        const old = operationsContext().receipts.find(r => r.cargaId === Number(id));
        return writeReceipt(id, { pesoPlantaKg: value.pesoRecibidoPlanta, resultado: value.resultadoRecepcion, huboDescarte: value.huboDescarte, descarteKg: value.huboDescarte ? value.kilosDescarte : 0, fechaRecepcion: old?.fechaRecepcion ?? new Date().toISOString(), recepcionConfirmadaAt: old?.recepcionConfirmadaAt ?? new Date().toISOString(), descargaInicioAt: value.inicioDescarga ? new Date(value.inicioDescarga).toISOString() : null, descargaFinAt: value.terminoDescarga ? new Date(value.terminoDescarga).toISOString() : null, observaciones: value.observacionesEvaluacion, compras: providers.map(p => ({ providerId: Number(p.proveedorId), recognizedQuantity: p.kilosRecibidosPlanta, reference: '', quantity: p.kilosCargados, document: null, reviewStatus: 'Revisado', observation: '' })), logistica: { ...old?.logistica, responsableRecepcion: value.responsableRecepcion, observacionesDescarga: value.observacionesDescarga, calidadRecepcion: value.calidadRecepcion, destinoDescarte: value.destinoDescarte, motivoDescarte: value.motivoDescarte } });
    }),
    crates: (id: string, value: Omit<LogisticsCrateMovement, 'id'>) => commitRemote(async () => {
        assertNoNewFiles(value.guiaSalidaArchivo);
        const old = operationsContext().receipts.find(r => r.cargaId === Number(id)), previous = Array.isArray(old?.checklist.envases) ? old.checklist.envases : [], entry = { ...value, id: previous.length + 1, guiaSalidaArchivo: null };
        return writeReceipt(id, { checklist: { ...old?.checklist, envases: [...previous, jsonData(entry)] } });
    }),
    closure: (id: string, value: LogisticsDocumentsClosure) => commitRemote(async () => {
        assertNoNewFiles(value);
        const old = operationsContext().receipts.find(r => r.cargaId === Number(id));
        if (value.cierreFisicoConfirmado && (!old?.pesoPlantaKg || !old.resultado || !old.descargaInicioAt || !old.descargaFinAt))
            throw new Error('Completa la recepción, el resultado y la descarga antes del cierre físico.');
        if (value.cierreAdministrativoConfirmado && !value.cierreFisicoConfirmado)
            throw new Error('Registra primero el cierre físico.');
        return writeReceipt(id, { cierreFisicoAt: value.cierreFisicoConfirmado ? (old?.cierreFisicoAt ?? new Date().toISOString()) : null, cierreAdministrativoAt: value.cierreAdministrativoConfirmado ? (old?.cierreAdministrativoAt ?? new Date().toISOString()) : null, documentos: { ...old?.documentos, observacionesCierre: value.observacionesCierre } });
    }),
};
