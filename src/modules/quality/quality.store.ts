import { usesV1 } from '@/shared/api/data-contract';
import { qualityCommands } from '@/modules/quality/api/quality-commands.api';
import { useSyncExternalStore } from "react";
import type { QualityCampaign, QualityScope } from "@/modules/quality/quality.utils";

/** V1: remote commands and server projections. Legacy: local compatibility state, initially empty. */
let records: QualityCampaign[] = [];
let nextId = 1;
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

export function addQualityCampaign(input: AddQualityCampaignInput): QualityCampaign | Promise<QualityCampaign> {
    if (usesV1()) return qualityCommands.addCampaign(input);
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
    if (usesV1()) return qualityCommands.removeCampaign(id);
    records = records.filter((item) => item.id !== id);
    notify();
}

/** Solo para pruebas unitarias: reinicia el estado */
export function _resetQualityStore(initial: QualityCampaign[] = [], startId = 1) {
    records = [...initial];
    nextId = startId;
    notify();
}

export function hydrateQualityCampaigns(value: QualityCampaign[]) { records = value; notify(); }
