import { useSyncExternalStore } from "react";
import type { QualityCampaign, QualityScope } from "@/modules/quality/quality.utils";
import { createDemoQualityCampaigns } from "@/modules/quality/quality.demo";

/**
 * Campañas incorporadas al módulo de Cosecha y Control de Calidad en memoria.
 *
 * TODO(api): se pierden al recargar la página mientras el backend no cuente con el
 * servicio de vinculación de campañas a control de calidad.
 */
const demo = import.meta.env.DEV && import.meta.env.MODE !== "test" ? createDemoQualityCampaigns() : null;
let records: QualityCampaign[] = demo?.records ?? [];
let nextId = demo?.nextId ?? 1;
const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useQualityCampaigns(): QualityCampaign[] {
    return useSyncExternalStore(subscribe, () => records);
}

export function getQualityCampaigns(): QualityCampaign[] {
    return records;
}

export interface AddQualityCampaignInput {
    campaniaId: number;
    nombre: string;
    fruta: string;
    fechaInicio: string;
    fechaFin: string;
    estado: string;
    scope: QualityScope;
}

export function addQualityCampaign(input: AddQualityCampaignInput): QualityCampaign {
    // Si ya existe la campaña, se asegura de incluir el nuevo scope
    const existing = records.find((item) => item.campaniaId === input.campaniaId || item.nombre === input.nombre);
    if (existing) {
        if (!existing.scope.includes(input.scope)) {
            existing.scope = [...existing.scope, input.scope];
            records = [...records];
            notify();
        }
        return existing;
    }

    const created: QualityCampaign = {
        id: nextId++,
        campaniaId: input.campaniaId,
        nombre: input.nombre,
        fruta: input.fruta,
        fechaInicio: input.fechaInicio,
        fechaFin: input.fechaFin,
        estado: input.estado,
        scope: [input.scope],
    };

    records = [created, ...records];
    notify();
    return created;
}

export function removeQualityCampaign(id: number) {
    records = records.filter((item) => item.id !== id);
    notify();
}

/** Solo para pruebas unitarias: reinicia el estado */
export function _resetQualityStore(initial: QualityCampaign[] = [], startId = 1) {
    records = [...initial];
    nextId = startId;
    notify();
}
