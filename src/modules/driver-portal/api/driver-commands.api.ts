import { historialChoferV1 } from '@/modules/driver-portal/api/future.api';
import { operationsContext } from '@/modules/operations/api/operations-context.api';
import { loadContext } from '@/modules/operations/api/operation-links';
import { commitRemote } from '@/shared/api/data-contract';
import { jsonData, assertNoNewFiles } from '@/shared/api/document-state';
import { writeReceipt } from '@/modules/logistics/api/logistics-commands.api';
import { writeLoad } from '@/modules/quality/api/quality-commands.api';
import type { DriverArrivalChecklist, DriverVehicleExitGuide, DriverProviderLoadDetail } from '@/modules/driver-portal/driverPortal.models';
export const driverCommands = {
    advance: (id: string, note?: string) => commitRemote(async () => {
        const g = operationsContext(), c = loadContext(id), history = g.histories.filter(h => h.coordinacionEntregaId === c.coordination.coordinacionEntregaId), stages = ['EN_CARGA', 'SALIDA', 'EN_CAMINO', 'LLEGADA', 'CIERRE'] as const;
        if (!history.length) {
            await historialChoferV1(c.coordination.coordinacionEntregaId).create({ estado: 'EN_CARGA', observacion: 'Inicio de seguimiento del despacho.' });
        }
        const last = history.at(-1), next = stages[stages.indexOf(last?.estado ?? 'EN_CARGA') + 1];
        if (!next)
            throw new Error('El despacho ya está cerrado.');
        return historialChoferV1(c.coordination.coordinacionEntregaId).create({ estado: next, observacion: note || null });
    }),
    arrival: (id: string, value: DriverArrivalChecklist) => commitRemote(() => {
        const c = loadContext(id), old = operationsContext().receipts.find(r => r.cargaId === c.load.cargaId);
        return writeReceipt(id, { checklist: { ...old?.checklist, llegada: jsonData({ ...value, registrado: true }) } });
    }),
    exit: (id: string, value: DriverVehicleExitGuide) => commitRemote(() => {
        assertNoNewFiles(value.archivo);
        const c = loadContext(id), old = operationsContext().receipts.find(r => r.cargaId === c.load.cargaId);
        return writeReceipt(id, { checklist: { ...old?.checklist, guiaSalida: jsonData({ ...value, archivo: null }) } });
    }),
    load: (id: string, value: {
        fechaCarga: string;
        anotador: string;
        viaticosMovilidad: number;
        viaticosInsumos: number;
        gastoCuadrilla: number;
        gastoAnotadores: number;
        observacionesCarga: string;
        proveedores: DriverProviderLoadDetail[];
    }) => commitRemote(() => writeLoad(id, { ...value, fechaCargaReal: value.fechaCarga, proveedoresCarga: value.proveedores.map(p => ({ ...p, rol: p.tipo, tipoFruta: 'Convencional' as const })) })),
};
