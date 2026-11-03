import { historialChoferV1 } from '@/modules/driver-portal/api/v1.api';
import { operationsContext } from '@/modules/operations/api/operations-context.api';
import { loadContext } from '@/modules/operations/api/operation-links';
import { commitRemote, requireId } from '@/shared/api/data-contract';
import { jsonData } from '@/shared/api/document-state';
import { persistFile } from '@/shared/api/uploadDocument';
import { writeReceipt } from '@/modules/logistics/api/logistics-commands.api';
import { apiClient } from '@/shared/api/client';
import { jsonObject } from '@/modules/quality/api/quality-screen-data';
import type { DriverArrivalChecklist, DriverVehicleExitGuide, DriverProviderLoadDetail } from '@/modules/driver-portal/driverPortal.models';
export const driverCommands = {
    advance: (id: string, note?: string) => commitRemote(async () => {
        const g = operationsContext(), c = loadContext(id), history = g.histories.filter(h => h.coordinacionEntregaId === c.coordination.coordinacionEntregaId), stages = ['EN_CARGA', 'SALIDA', 'EN_CAMINO', 'LLEGADA', 'CIERRE'] as const;
        if (!history.length) {
            await historialChoferV1(c.coordination.coordinacionEntregaId).create({ estado: 'EN_CARGA', observacion: 'Inicio de seguimiento del despacho.' });
        }
        const last = [...history].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora)).at(-1);
        const next = stages[stages.indexOf(last?.estado ?? 'EN_CARGA') + 1];
        if (!next)
            throw new Error('El despacho ya está cerrado.');
        if (next === 'CIERRE') {
            const receipt = g.receipts.find(row => row.cargaId === c.load.cargaId);
            if (!receipt?.cierreFisicoAt) throw new Error('Logística debe registrar primero el cierre físico.');
            const checklist = jsonObject(receipt.checklist.llegada);
            const kilos = Number(checklist.kilosEnPlanta);
            const cargados = g.loadProviders.filter(row => row.cargaId === c.load.cargaId)
                .reduce((sum, row) => sum + row.kilosCargados, 0);
            if (checklist.registrado !== true || !Number.isFinite(kilos) || kilos <= 0 || kilos > cargados)
                throw new Error('Completa el checklist de recepción con un peso válido antes de cerrar el despacho.');
            if (checklist.huboDescarte === true) {
                const descarte = Number(checklist.kilosDescarte);
                if (!Number.isFinite(descarte) || descarte <= 0 || descarte > kilos || !String(checklist.motivoDescarte ?? '').trim())
                    throw new Error('Completa los kilos y el motivo del descarte en el checklist.');
                if (!receipt.documentos.actaDescarte && !receipt.logistica.actaDescarteArchivo)
                    throw new Error('Adjunta la evidencia del descarte antes de cerrar el despacho.');
            }
        }
        return historialChoferV1(c.coordination.coordinacionEntregaId).create({ estado: next, observacion: note || null });
    }),
    arrival: (id: string, value: DriverArrivalChecklist) => commitRemote(() => {
        const c = loadContext(id), old = operationsContext().receipts.find(r => r.cargaId === c.load.cargaId);
        const loaded = operationsContext().loadProviders.filter(row => row.cargaId === c.load.cargaId)
            .reduce((sum, row) => sum + row.kilosCargados, 0);
        const kilos = Number(value.kilosEnPlanta);
        if (!Number.isFinite(kilos) || kilos <= 0 || kilos > loaded)
            throw new Error('El peso en planta debe ser mayor que cero y no superar los kilos cargados.');
        if (value.huboDescarte) {
            const discarded = Number(value.kilosDescarte);
            if (!Number.isFinite(discarded) || discarded <= 0 || discarded > kilos || !value.motivoDescarte.trim())
                throw new Error('Indica una cantidad y un motivo válidos para el descarte.');
        }
        return writeReceipt(id, { checklist: { ...old?.checklist, llegada: jsonData({ ...value, registrado: true }) } });
    }),
    exit: (id: string, value: DriverVehicleExitGuide) => commitRemote(async () => {
        const archivo = await persistFile(value.archivo);
        const c = loadContext(id), old = operationsContext().receipts.find(r => r.cargaId === c.load.cargaId);
        return writeReceipt(id, { checklist: { ...old?.checklist, guiaSalida: jsonData({ ...value, archivo }) } });
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
    }) => commitRemote(async () => { await apiClient.patch(`/api/chofer/cargas/${requireId(id)}/datos`, value); }),
};
