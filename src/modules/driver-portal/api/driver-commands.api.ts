import { historialChoferV1 } from '@/modules/driver-portal/api/v1.api';
import { operationsContext } from '@/modules/operations/api/operations-context.api';
import { loadContext } from '@/modules/operations/api/operation-links';
import { commitRemote, requireId } from '@/shared/api/data-contract';
import { jsonData } from '@/shared/api/document-state';
import { persistFile } from '@/shared/api/uploadDocument';
import { writeReceipt } from '@/modules/logistics/api/logistics-commands.api';
import { apiClient } from '@/shared/api/client';
import { jsonObject } from '@/modules/quality/api/quality-screen-data';
import { projectDriverData } from '@/modules/driver-portal/api/driver-screen-data';
import type { DriverArrivalChecklist, DriverVehicleExitGuide, DriverProviderLoadDetail } from '@/modules/driver-portal/driverPortal.models';
function activeDispatch(id: string) {
    const row = projectDriverData(operationsContext()).loads.find(item => item.id === id);
    if (!row || row.pendienteRegistro || row.rechazada || row.estadoCampania !== 'en proceso')
        throw new Error('El despacho requiere una carga registrada y aceptada en una campaña en ejecución.');
    return row;
}
export const driverCommands = {
    advance: (id: string, note?: string) => commitRemote(async () => {
        activeDispatch(id);
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
            const exitGuide = jsonObject(receipt.checklist.guiaSalida);
            if (!jsonObject(exitGuide.archivo).url && !receipt.documentos.guiaSalidaFirmada)
                throw new Error('Adjunta la guía de salida firmada antes de cerrar el despacho.');
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
    arrival: (id: string, value: DriverArrivalChecklist) => commitRemote(async () => {
        const row = activeDispatch(id);
        if (row?.etapa !== 'Llegada') throw new Error('Confirma tu llegada antes de registrar la recepción o el descarte.');
        const c = loadContext(id);
        const loaded = operationsContext().loadProviders.filter(row => row.cargaId === c.load.cargaId)
            .reduce((sum, row) => sum + row.kilosCargados, 0);
        const kilos = Number(value.kilosEnPlanta);
        if (!Number.isFinite(kilos) || kilos <= 0 || kilos > loaded)
            throw new Error('El peso en planta debe ser mayor que cero y no superar los kilos cargados.');
        if (value.huboDescarte) {
            const discarded = Number(value.kilosDescarte);
            if (!Number.isFinite(discarded) || discarded <= 0 || discarded > kilos || !value.motivoDescarte.trim())
                throw new Error('Indica una cantidad y un motivo válidos para el descarte.');
            if (!value.evidenciaDescarte) throw new Error('Adjunta la evidencia del descarte.');
        }
        const evidence = value.huboDescarte ? await persistFile(value.evidenciaDescarte ?? null) : null;
        return writeReceipt(id, { checklist: { llegada: jsonData({ ...value, evidenciaDescarte: evidence, registrado: true }) }, ...(evidence ? { documentos: { actaDescarte: jsonData(evidence) } } : {}) });
    }),
    exit: (id: string, value: DriverVehicleExitGuide) => commitRemote(async () => {
        const row = activeDispatch(id);
        if (!row || !['Llegada', 'Cierre'].includes(row.etapa)) throw new Error('Confirma tu llegada antes de adjuntar la guía de salida.');
        if (!value.archivo) throw new Error('Adjunta la guía de salida del vehículo.');
        const archivo = await persistFile(value.archivo);
        return writeReceipt(id, { checklist: { guiaSalida: jsonData({ ...value, archivo }) } });
    }),
    load: (id: string, value: {
        cumpleRequisitosIndustria?: boolean;
        fechaCarga: string;
        anotador: string;
        viaticosMovilidad: number;
        viaticosInsumos: number;
        gastoCuadrilla: number;
        gastoAnotadores: number;
        observacionesCarga: string;
        proveedores: DriverProviderLoadDetail[];
    }) => commitRemote(async () => {
        const row = projectDriverData(operationsContext()).loads.find(item => item.id === id);
        if (!row?.permiteEditarCarga) throw new Error('Solo puedes registrar o editar una carga de una campaña en ejecución antes de salir o emitir su guía.');
        if (row.canal === 'Industria' && value.cumpleRequisitosIndustria === undefined) throw new Error('Indica si la fruta cumple los requisitos de Industria.');
        if (value.cumpleRequisitosIndustria !== false) {
            if (!value.fechaCarga || !value.anotador.trim()) throw new Error('Completa fecha y responsable de la carga.');
            const expectedProviders = new Set(row.proveedores.map(provider => provider.proveedorId));
            const receivedProviders = new Set(value.proveedores.map(provider => provider.proveedorId));
            if (!expectedProviders.size || value.proveedores.length !== expectedProviders.size || receivedProviders.size !== expectedProviders.size || [...receivedProviders].some(id => !expectedProviders.has(id)))
                throw new Error('La carga debe conservar los proveedores de la entrega coordinada.');
            if (row.variedadesCoordinadas && value.proveedores.some(provider => !row.variedadesCoordinadas?.[provider.proveedorId]?.includes(provider.variedad)))
                throw new Error('Selecciona una variedad de las fincas coordinadas para cada proveedor.');
            if (value.proveedores.some(provider => !provider.variedad.trim() || !Number.isFinite(provider.kilosCargados) || provider.kilosCargados <= 0 || [provider.jabasCargadas, provider.jabasVacias, provider.binesCargados, provider.binesVacios, provider.mallasCargadas, provider.mallasVacias].some(amount => !Number.isInteger(amount) || amount < 0)))
                throw new Error('Revisa las variedades, kilos y cantidades de bultos de cada proveedor.');
            if ([value.viaticosMovilidad, value.viaticosInsumos, value.gastoCuadrilla, value.gastoAnotadores].some(amount => !Number.isFinite(amount) || amount < 0))
                throw new Error('Los gastos y viáticos deben ser importes válidos mayores o iguales a cero.');
            if (value.proveedores.reduce((sum, provider) => sum + provider.kilosCargados, 0) > row.kilosProgramados)
                throw new Error('Los kilos cargados no pueden superar los programados en la entrega.');
        }
        if (row.pendienteRegistro) {
            const coordination = operationsContext().coordinations.find(item => item.entregaProgramadaId === Number(id.slice('entrega-'.length)));
            if (!coordination) throw new Error('No se encontró la entrega coordinada.');
            await apiClient.post('/api/chofer/coordinaciones/' + coordination.coordinacionEntregaId + '/carga', value);
            return;
        }
        await apiClient.patch(`/api/chofer/cargas/${requireId(id)}/datos`, value);
    }),
};
