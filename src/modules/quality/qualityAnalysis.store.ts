import { useSyncExternalStore } from "react";
import type { QualityAnalysisRecord } from "@/modules/quality/qualityAnalysis.utils";
import { createDemoQualityAnalysis } from "@/modules/quality/qualityAnalysis.demo";

/**
 * Muestreos y análisis de calidad por campaña en memoria.
 *
 * TODO(api): se pierden al recargar la página mientras el backend no cuente con el
 * servicio de análisis de laboratorio de cosecha y calidad.
 */
const demo = import.meta.env.DEV && import.meta.env.MODE !== "test" ? createDemoQualityAnalysis() : null;
let records: QualityAnalysisRecord[] = demo?.records ?? [];
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

export function useQualityAnalysis(campaniaId: number): QualityAnalysisRecord[] {
    return useSyncExternalStore(subscribe, () =>
        records.filter((r) => r.campaniaId === campaniaId || campaniaId === 1),
    );
}

export function getQualityAnalysis(campaniaId: number): QualityAnalysisRecord[] {
    return records.filter((r) => r.campaniaId === campaniaId || campaniaId === 1);
}

export function saveQualityAnalysis(
    entry: Omit<QualityAnalysisRecord, "id"> & { id?: number },
): QualityAnalysisRecord {
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
    records = records.filter((r) => r.id !== id);
    notify();
}

/** Para pruebas unitarias */
export function _resetQualityAnalysisStore(initial: QualityAnalysisRecord[] = [], startId = 1) {
    records = [...initial];
    nextId = startId;
    notify();
}
