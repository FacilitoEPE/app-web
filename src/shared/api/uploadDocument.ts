/** Sube un documento a AWS S3 mediante la API y devuelve la dirección protegida de descarga. */
import { apiClient } from '@/shared/api/client';
import { recordRemoteMutation } from '@/shared/api/remote-mutations';
import { getAuthToken } from '@/shared/offline/session';
import type { FileSource, StoredFile } from '@/shared/utils/fileSource';

export interface S3Document { id: string; url: string; name: string; type: string; size: number }
export interface S3DocumentLink { tipo: string; entidadId: number; archivoId: string; url: string; name: string; type: string; size: number }
export type LocalDocument = S3Document;
export type LocalDocumentLink = S3DocumentLink;
export type DocumentAvailability = 'DISPONIBLE' | 'FALTANTE' | 'INVALIDO' | 'NO_VERIFICABLE';

const protectedDocumentPath = /^\/(?:v1|api(?:\/v1)?)\/(?:documentos|archivos-locales)\//;

function documentLocation(documentUrl: string) {
    const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
    const base = new URL(apiClient.defaults.baseURL || origin, origin);
    const url = new URL(documentUrl, base);
    const prefix = base.pathname.replace(/\/$/, '');
    const path = prefix && url.pathname.startsWith(`${prefix}/v1/`)
        ? url.pathname.slice(prefix.length)
        : url.pathname;
    return { base, url, path };
}

function documentRequestUrl(url: URL, path: string): URL {
    const endpoint = path.replace(/^\/api\/(?:v1\/)?/, '/v1/');
    return new URL(apiClient.getUri({ url: `${endpoint}${url.search}` }), url.origin);
}

function publicDocumentUrl(documentUrl: string): string {
    const { base, url, path } = documentLocation(documentUrl);
    return url.origin === base.origin && protectedDocumentPath.test(path)
        ? documentRequestUrl(url, path).href
        : url.href;
}

export function isProtectedDocumentUrl(documentUrl: string): boolean {
    try {
        return protectedDocumentPath.test(documentLocation(documentUrl).path);
    } catch {
        return false;
    }
}

export async function getProtectedDocument(documentUrl: string, signal: AbortSignal): Promise<Blob> {
    const { base, url, path } = documentLocation(documentUrl);
    if (url.origin !== base.origin || !protectedDocumentPath.test(path)) {
        throw new Error('La dirección del documento no permite una vista previa segura.');
    }
    const { data } = await apiClient.get<Blob>(documentRequestUrl(url, path).href, { responseType: 'blob', signal });
    return data;
}

/** Consulta metadatos y objeto real sin descargar el documento ni enviar credenciales a otros orígenes. */
export async function getDocumentAvailability(documentUrl: string, signal?: AbortSignal): Promise<DocumentAvailability> {
    let location: ReturnType<typeof documentLocation>;
    try { location = documentLocation(documentUrl); } catch { return 'NO_VERIFICABLE'; }
    const { base, url, path } = location;
    if (url.origin !== base.origin || !protectedDocumentPath.test(path) || !/^[0-9a-f-]{36}$/i.test(path.replace(protectedDocumentPath, ''))) return 'NO_VERIFICABLE';
    url.search = '';
    const { data } = await apiClient.get<{ estado: DocumentAvailability }>(documentRequestUrl(url, `${path}/estado`).href, { signal });
    return ['DISPONIBLE', 'FALTANTE', 'INVALIDO', 'NO_VERIFICABLE'].includes(data?.estado) ? data.estado : 'NO_VERIFICABLE';
}

/** Tamaño máximo de archivo permitido: 10 MB (alineado con FILE_UPLOAD_MAX_BYTES del backend) */
export const MAX_DOCUMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export async function uploadS3Document(file: File, carpeta?: string): Promise<S3Document> {
    if (file.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
        throw new Error('El archivo supera el tamaño máximo permitido de 10 MB.');
    }
    const form = new FormData();
    form.append('archivo', file);
    if (carpeta) form.append('carpeta', carpeta);
    const { data } = await apiClient.post<S3Document>('/v1/documentos', form);
    return { ...data, url: publicDocumentUrl(data.url) };
}
export const uploadLocalDocument = uploadS3Document;

export async function persistFile(file: FileSource | null, carpeta?: string): Promise<StoredFile | null> {
    if (!file) return null;
    return file instanceof File ? uploadS3Document(file, carpeta) : file;
}

export async function linkS3Document(tipo: string, entidadId: number, archivoId: string): Promise<void> {
    const token = getAuthToken();
    const { data } = await apiClient.post<S3DocumentLink>('/v1/documentos/vinculos', { tipo, entidadId, archivoId });
    recordRemoteMutation('/documentos/vinculos', { ...data, url: publicDocumentUrl(data.url) }, undefined, token);
}
export const linkLocalDocument = linkS3Document;

export async function unlinkS3Document(tipo: string, entidadId: number): Promise<void> {
    const token = getAuthToken();
    await apiClient.delete(`/v1/documentos/vinculos/${tipo}/${entidadId}`);
    recordRemoteMutation(`/documentos/vinculos/${tipo}/${entidadId}`, undefined, undefined, token);
}
export const unlinkLocalDocument = unlinkS3Document;

export async function getS3DocumentLinks(): Promise<S3DocumentLink[]> {
    const { data } = await apiClient.get<S3DocumentLink[]>('/v1/documentos/vinculos');
    return data.map(item => ({ ...item, url: publicDocumentUrl(item.url) }));
}
export const getLocalDocumentLinks = getS3DocumentLinks;

export async function uploadDocument(file: File, carpeta?: string): Promise<string> {
    const data = await uploadS3Document(file, carpeta);
    return data.url;
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
