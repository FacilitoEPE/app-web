/** Sube un documento a AWS S3 mediante la API y devuelve la dirección protegida de descarga. */
import { apiClient } from '@/shared/api/client';
import type { FileSource, StoredFile } from '@/shared/utils/fileSource';

export interface S3Document { id: string; url: string; name: string; type: string; size: number }
export interface S3DocumentLink { tipo: string; entidadId: number; archivoId: string; url: string; name: string; type: string; size: number }
export type LocalDocument = S3Document;
export type LocalDocumentLink = S3DocumentLink;

/** Tamaño máximo de archivo permitido: 10 MB (alineado con FILE_UPLOAD_MAX_BYTES del backend) */
export const MAX_DOCUMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export async function uploadS3Document(file: File): Promise<S3Document> {
    if (file.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
        throw new Error('El archivo supera el tamaño máximo permitido de 10 MB.');
    }
    const form = new FormData();
    form.append('archivo', file);
    const { data } = await apiClient.post<S3Document>('/api/documentos', form);
    const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    return { ...data, url: new URL(data.url, new URL(apiClient.defaults.baseURL || origin, origin)).href };
}
export const uploadLocalDocument = uploadS3Document;

export async function persistFile(file: FileSource | null): Promise<StoredFile | null> {
    if (!file) return null;
    return file instanceof File ? uploadS3Document(file) : file;
}

export async function linkS3Document(tipo: string, entidadId: number, archivoId: string): Promise<void> {
    await apiClient.post('/api/documentos/vinculos', { tipo, entidadId, archivoId });
}
export const linkLocalDocument = linkS3Document;

export async function unlinkS3Document(tipo: string, entidadId: number): Promise<void> {
    await apiClient.delete(`/api/documentos/vinculos/${tipo}/${entidadId}`);
}
export const unlinkLocalDocument = unlinkS3Document;

export async function getS3DocumentLinks(): Promise<S3DocumentLink[]> {
    const { data } = await apiClient.get<S3DocumentLink[]>('/api/documentos/vinculos');
    const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const base = new URL(apiClient.defaults.baseURL || origin, origin);
    return data.map(item => ({ ...item, url: new URL(item.url, base).href }));
}
export const getLocalDocumentLinks = getS3DocumentLinks;

export async function uploadDocument(file: File): Promise<string> {
    const data = await uploadS3Document(file);
    return new URL(data.url, apiClient.defaults.baseURL || window.location.origin).href;
}

/** Mensaje para mostrar en un formulario cuando falló la subida de un archivo */
export function getUploadErrorMessage(error: unknown): string {
    if (error instanceof Error && (/10\s*mb/i.test(error.message) || error.message.includes('413') || /too large/i.test(error.message))) {
        return error.message;
    }
    if (typeof error === 'string' && (error.includes('413') || /too large/i.test(error))) {
        return 'El archivo supera el tamaño máximo permitido de 10 MB.';
    }
    return 'No se pudo subir el archivo. Inténtalo nuevamente.';
}
