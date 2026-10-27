import { useSyncExternalStore } from "react";
import { DISPATCH_STAGES, type DispatchStage } from "@/shared/components/DispatchStepProgress";
import {
    DEMO_DRIVER_LOADS,
    DEMO_DRIVERS,
    type DriverArrivalChecklist,
    type DriverLoad,
    type DriverProfile,
    type DriverProviderLoadDetail,
    type DriverVehicleExitGuide,
} from "@/modules/driver-portal/driverPortal.demo";

interface DriverPortalState {
    activeDriverId: string;
    loads: DriverLoad[];
}

let state: DriverPortalState = {
    activeDriverId: DEMO_DRIVERS[0].id,
    loads: DEMO_DRIVER_LOADS,
};

const listeners = new Set<() => void>();

function emit() {
    for (const listener of listeners) {
        listener();
    }
}

export function useDriverPortalState(): DriverPortalState {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        () => state,
    );
}

export function getRegisteredDrivers(): DriverProfile[] {
    return DEMO_DRIVERS;
}

export function setActiveDriver(driverId: string) {
    state = { ...state, activeDriverId: driverId };
    emit();
}

export function advanceDriverLoadStage(loadId: string, note?: string) {
    state = {
        ...state,
        loads: state.loads.map((load) => {
            if (load.id !== loadId) return load;
            const currentIndex = DISPATCH_STAGES.findIndex((s) => s.id === load.etapa);
            const nextStage: DispatchStage =
                currentIndex >= 0 && currentIndex < DISPATCH_STAGES.length - 1
                    ? DISPATCH_STAGES[currentIndex + 1].id
                    : load.etapa;
            if (nextStage === load.etapa) return load;

            const now = new Date();
            const pad = (n: number) => String(n).padStart(2, "0");
            const fechaHora = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

            const defaultNotes: Record<DispatchStage, string> = {
                "En carga": "Inicio de carga en finca registrado por el conductor.",
                "Salida": "Salida de finca confirmada por el conductor.",
                "En camino": "Unidad en tránsito confirmada en ruta hacia destino.",
                "Llegada": "Llegada a planta del cliente confirmada por el conductor.",
                "Cierre": "Despacho cerrado con conformidad de entrega y guía de salida.",
            };

            return {
                ...load,
                etapa: nextStage,
                historial: [
                    ...load.historial,
                    {
                        etapa: nextStage,
                        fechaHora,
                        nota: note?.trim() || defaultNotes[nextStage],
                    },
                ],
            };
        }),
    };
    emit();
}

export function saveDriverArrivalChecklist(loadId: string, checklist: DriverArrivalChecklist) {
    state = {
        ...state,
        loads: state.loads.map((load) =>
            load.id === loadId ? { ...load, checklistLlegada: { ...checklist, registrado: true } } : load,
        ),
    };
    emit();
}

export function saveDriverVehicleExitGuide(loadId: string, guiaSalida: DriverVehicleExitGuide) {
    state = {
        ...state,
        loads: state.loads.map((load) => (load.id === loadId ? { ...load, guiaSalida } : load)),
    };
    emit();
}

export function saveDriverLoadFieldData(
    loadId: string,
    payload: {
        fechaCarga: string;
        anotador: string;
        viaticosMovilidad: number;
        viaticosInsumos: number;
        gastoCuadrilla: number;
        gastoAnotadores: number;
        observacionesCarga: string;
        proveedores: DriverProviderLoadDetail[];
    },
) {
    state = {
        ...state,
        loads: state.loads.map((load) => (load.id === loadId ? { ...load, ...payload } : load)),
    };
    emit();
}
