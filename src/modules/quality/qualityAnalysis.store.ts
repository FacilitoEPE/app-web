import { usesV1 } from '@/shared/api/data-contract';
import { qualityCommands } from '@/modules/quality/api/quality-commands.api';
import { useSyncExternalStore } from "react";
import type { QualityAnalysisRecord } from "@/modules/quality/qualityAnalysis.utils";

/** V1: remote commands and server projections. Legacy: local compatibility state, initially empty. */
let records: QualityAnalysisRecord[] = [];
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

export function useQualityAnalysis(campaniaId: number): QualityAnalysisRecord[] {
    const all=useSyncExternalStore(subscribe,()=>records);
    return all.filter(row=>row.campaniaId===campaniaId);
}

export function getQualityAnalysis(campaniaId: number): QualityAnalysisRecord[] {
    return records.filter((r) => r.campaniaId === campaniaId);
}

export function saveQualityAnalysis(
    entry: Omit<QualityAnalysisRecord, "id"> & { id?: number },
): QualityAnalysisRecord | Promise<QualityAnalysisRecord> {
    if (usesV1()) return qualityCommands.analysis(entry);
    if (entry.id) {
        records = records.map((r) => (r.id === entry.id ? { ...(entry as QualityAnalysisRecord) } : r));
        notify();
        return entry as QualityAnalysisRecord;
    }

    const created: QualityAnalysisRecord = {
        ...entry,
        id: nextId++,
    };
    records = [created, ...records];
    notify();
    return created;
}

export function deleteQualityAnalysis(id: number) {
    if (usesV1()) return qualityCommands.deleteAnalysis(id);
    records = records.filter((r) => r.id !== id);
    notify();
}

/** Para pruebas unitarias */
export function _resetQualityAnalysisStore(initial: QualityAnalysisRecord[] = [], startId = 1) {
    records = [...initial];
    nextId = startId;
    notify();
}

export function hydrateQualityAnalyses(value: QualityAnalysisRecord[]) { records = value; notify(); }
