import { usesV1 } from '@/shared/api/data-contract';
import { campaignCommands } from '@/modules/campaigns/api/campaign-commands.api';
import { useSyncExternalStore } from "react";
import type { ExamValues, LocalExam } from "@/modules/campaigns/campaignExam";

/** V1: remote commands and server projections. Legacy: local compatibility state, initially empty. */

let byProvider: Record<number, LocalExam[]> = {};
let nextId = 1;
const listeners = new Set<() => void>();
const EMPTY: LocalExam[] = [];

function update(next: Record<number, LocalExam[]>) {
    byProvider = next;
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/** Registra un examen al proveedor; el más reciente queda primero. */
export function addExam(proveedorId: number, values: ExamValues) {
    if (usesV1()) return campaignCommands.exam(proveedorId, values);
    const exam: LocalExam = { ...values, id: `local-${nextId++}`, proveedorId };
    update({ ...byProvider, [proveedorId]: [exam, ...(byProvider[proveedorId] ?? EMPTY)] });
}

/** Reemplaza los datos de un examen ya registrado. */
export function updateExam(proveedorId: number, examId: string, values: ExamValues) {
    if (usesV1()) return campaignCommands.exam(proveedorId, values, examId);
    const current = byProvider[proveedorId] ?? EMPTY;
    update({ ...byProvider, [proveedorId]: current.map((exam) => (exam.id === examId ? { ...exam, ...values } : exam)) });
}

export function removeExam(proveedorId: number, examId: string) {
    if (usesV1()) return campaignCommands.deleteExam(proveedorId, examId);
    const current = byProvider[proveedorId] ?? EMPTY;
    update({ ...byProvider, [proveedorId]: current.filter((exam) => exam.id !== examId) });
}

export function useProviderExams(proveedorId: number): LocalExam[] {
    const all = useSyncExternalStore(subscribe, () => byProvider);
    return all[proveedorId] ?? EMPTY;
}

export function hydrateCampaignExams(value: Record<number, LocalExam[]>) { update(value); }
