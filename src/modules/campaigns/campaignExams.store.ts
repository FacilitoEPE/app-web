import { useSyncExternalStore } from "react";
import type { ExamValues, LocalExam } from "@/modules/campaigns/campaignExam";
import { createDemoExams } from "@/modules/campaigns/campaignExams.demo";

/**
 * Exámenes de laboratorio registrados desde la campaña, en memoria y por proveedor (los exámenes pertenecen al
 * proveedor, igual que los que ya existen en el backend, y se ven desde cualquier campaña donde participe).
 *
 * TODO(api): se pierden al recargar la página y viven acá, y no dentro de un componente, para que sobrevivan al
 * navegar entre la lista de proveedores de la campaña y la gestión de exámenes. Cuando el documento pueda subirse
 * como URL (ver campaignExam.ts), este es el único archivo a reemplazar: `addExam`, `updateExam` y `removeExam`
 * pasan a llamar a la API y `useProviderExams` a leer lo que ella devuelva.
 *
 * En desarrollo arranca con datos de demostración (`campaignExams.demo.ts`); en producción y en las pruebas
 * arranca vacío, sin simular respuestas del backend.
 */
const useDemoData = import.meta.env.DEV && import.meta.env.MODE !== "test";
const demo = useDemoData ? createDemoExams() : null;

let byProvider: Record<number, LocalExam[]> = demo?.exams ?? {};
let nextId = demo?.nextId ?? 1;
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
    const exam: LocalExam = { ...values, id: `local-${nextId++}`, proveedorId };
    update({ ...byProvider, [proveedorId]: [exam, ...(byProvider[proveedorId] ?? EMPTY)] });
}

/** Reemplaza los datos de un examen ya registrado. */
export function updateExam(proveedorId: number, examId: string, values: ExamValues) {
    const current = byProvider[proveedorId] ?? EMPTY;
    update({ ...byProvider, [proveedorId]: current.map((exam) => (exam.id === examId ? { ...exam, ...values } : exam)) });
}

export function removeExam(proveedorId: number, examId: string) {
    const current = byProvider[proveedorId] ?? EMPTY;
    update({ ...byProvider, [proveedorId]: current.filter((exam) => exam.id !== examId) });
}

export function useProviderExams(proveedorId: number): LocalExam[] {
    const all = useSyncExternalStore(subscribe, () => byProvider);
    return all[proveedorId] ?? EMPTY;
}
