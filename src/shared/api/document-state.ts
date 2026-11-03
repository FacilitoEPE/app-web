import type { JsonObject } from '@/shared/api/v1-client';
export function assertNoNewFiles(value: unknown): void {
    if (typeof File !== 'undefined' && value instanceof File)
        throw new Error('Los adjuntos todavía no están disponibles. Puedes guardar los demás datos sin adjuntar archivos.');
    if (Array.isArray(value))
        value.forEach(assertNoNewFiles);
    else if (value && typeof value === 'object')
        Object.values(value).forEach(assertNoNewFiles);
}
export function jsonData(value: object): JsonObject {
    assertNoNewFiles(value);
    return JSON.parse(JSON.stringify(value)) as JsonObject;
}
