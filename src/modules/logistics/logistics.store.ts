import { usesV1 } from '@/shared/api/data-contract';
import { logisticsCommands } from '@/modules/logistics/api/logistics-commands.api';
import { useSyncExternalStore } from "react";
import {
    type LogisticsCrateMovement,
    type LogisticsDocumentsClosure,
    type LogisticsLoad,
    type LogisticsProviderBreakdown,
    type LogisticsReceptionData,
} from "@/modules/logistics/logistics.models";

let loads: LogisticsLoad[] = [];
const listeners = new Set<() => void>();

function emit() {
    for (const listener of listeners) {
        listener();
    }
}

export function useLogisticsLoads(): LogisticsLoad[] {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => loads,
    );
}

export function updateLogisticsPurchases(
    loadId: string,
    payload: {
        fechaCarga: string;
        anotador: string;
        viaticosMovilidad: number;
        viaticosInsumos: number;
        gastoCuadrilla: number;
        gastoAnotadores: number;
        observacionesCarga: string;
        proveedores: LogisticsProviderBreakdown[];
    },
) {
    if (usesV1()) return logisticsCommands.purchases(loadId, payload);
    loads = loads.map((item) => (item.id === loadId ? { ...item, ...payload } : item));
    emit();
}

export function updateLogisticsReception(
    loadId: string,
    recepcion: LogisticsReceptionData,
    proveedores: LogisticsProviderBreakdown[],
) {
    if (usesV1()) return logisticsCommands.receive(loadId, recepcion, proveedores);
    loads = loads.map((item) =>
        item.id === loadId
            ? {
                  ...item,
                  recepcion,
                  proveedores,
                  documentosCierre: {
                      ...item.documentosCierre,
                      reporteRecepcionPlanta:
                          recepcion.reporteRecepcionArchivo ?? item.documentosCierre.reporteRecepcionPlanta,
                      actaDescarte: recepcion.actaDescarteArchivo ?? item.documentosCierre.actaDescarte,
                  },
              }
            : item,
    );
    emit();
}

export function addLogisticsCrateMovement(loadId: string, movement: Omit<LogisticsCrateMovement, "id">) {
    if (usesV1()) return logisticsCommands.crates(loadId, movement);
    loads = loads.map((item) => {
        if (item.id !== loadId) return item;
        const nextMovement: LogisticsCrateMovement = {
            ...movement,
            id: `mov-${Date.now()}`,
        };
        return {
            ...item,
            jabasMovimientos: [...item.jabasMovimientos, nextMovement],
            documentosCierre: {
                ...item.documentosCierre,
                guiaSalidaFirmada: movement.guiaSalidaArchivo ?? item.documentosCierre.guiaSalidaFirmada,
            },
        };
    });
    emit();
}

export function updateLogisticsDocumentsClosure(loadId: string, closure: LogisticsDocumentsClosure) {
    if (usesV1()) return logisticsCommands.closure(loadId, closure);
    loads = loads.map((item) =>
        item.id === loadId
            ? {
                  ...item,
                  etapaDespacho:
                      closure.cierreFisicoConfirmado && closure.cierreAdministrativoConfirmado
                          ? "Cierre"
                          : item.etapaDespacho,
                  documentosCierre: closure,
              }
            : item,
    );
    emit();
}

export function hydrateLogisticsData(value: LogisticsLoad[]) { loads = value; emit(); }
