/** Sube un documento al servidor local y devuelve la dirección protegida de descarga. */
import { apiClient } from '@/shared/api/client';
import type { FileSource, StoredFile } from '@/shared/utils/fileSource';

export interface LocalDocument { id: string; url: string; name: string; type: string; size: number }
export interface LocalDocumentLink { tipo: string; entidadId: number; archivoId: string; url: string; name: string; type: string; size: number }

export async function uploadLocalDocument(file: File): Promise<LocalDocument> {
    const form = new FormData();
    form.append('archivo', file);
    const { data } = await apiClient.post<LocalDocument>('/api/archivos-locales', form);
    const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    return { ...data, url: new URL(data.url, new URL(apiClient.defaults.baseURL || origin, origin)).href };
}
export async function persistFile(file: FileSource | null): Promise<StoredFile | null> {
    if (!file) return null;
    return file instanceof File ? uploadLocalDocument(file) : file;
}

export async function linkLocalDocument(tipo: string, entidadId: number, archivoId: string): Promise<void> {
    await apiClient.post('/api/archivos-locales/vinculos', { tipo, entidadId, archivoId });
}
export async function unlinkLocalDocument(tipo: string, entidadId: number): Promise<void> {
    await apiClient.delete(`/api/archivos-locales/vinculos/${tipo}/${entidadId}`);
}

export async function getLocalDocumentLinks(): Promise<LocalDocumentLink[]> {
    const { data } = await apiClient.get<LocalDocumentLink[]>('/api/archivos-locales/vinculos');
    const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const base = new URL(apiClient.defaults.baseURL || origin, origin);
    return data.map(item => ({ ...item, url: new URL(item.url, base).href }));
}

export async function uploadDocument(file: File): Promise<string> {
    const data = await uploadLocalDocument(file);
    return new URL(data.url, apiClient.defaults.baseURL || window.location.origin).href;
}

/** Mensaje para mostrar en un formulario cuando falló la subida de un archivo */
export function getUploadErrorMessage(error: unknown): string {
    void error;
    return "No se pudo subir el archivo. Inténtalo nuevamente.";
}
