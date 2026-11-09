import { describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/client";
import { getDocumentAvailability, getProtectedDocument, getUploadErrorMessage, uploadDocument } from "@/shared/api/uploadDocument";

describe("uploadDocument", () => {
    it("resuelve una base relativa una sola vez antes de devolver la URL", async () => {
        const originalBase = apiClient.defaults.baseURL;
        apiClient.defaults.baseURL = "/mock-api/";
        const post = vi.spyOn(apiClient, "post").mockResolvedValue({ data: { url: "/api/documentos/example" } });
        try {
            const file = new File(["x"], "identidad.png", { type: "image/png" });
            await expect(uploadDocument(file)).resolves.toBe("http://localhost/api/documentos/example");
        } finally {
            post.mockRestore();
            apiClient.defaults.baseURL = originalBase;
        }
    });

    it("sube el archivo a S3 mediante la API", async () => {
        apiClient.defaults.baseURL = 'http://localhost:3000/';
        const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { url: '/api/documentos/example' } });
        const file = new File(['x'], 'contrato.pdf', { type: 'application/pdf' });
        await expect(uploadDocument(file, 'campanas/contratos')).resolves.toBe('http://localhost:3000/api/documentos/example');
        const form = post.mock.calls[0][1] as FormData;
        expect(form.get('archivo')).toBe(file);
        expect(form.get('carpeta')).toBe('campanas/contratos');
        post.mockRestore();
    });

    it("rechaza archivos que superen los 10 MB antes de enviarlos", async () => {
        const largeFile = new File(['x'], 'pesado.pdf', { type: 'application/pdf' });
        Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });
        await expect(uploadDocument(largeFile)).rejects.toThrow(/supera el tamaño máximo permitido de 10 MB/);
    });

    it("muestra un error de subida genérico", () => {
        expect(getUploadErrorMessage(new Error("network"))).toMatch(/No se pudo subir/);
    });

    it("muestra el error específico si supera 10 MB", () => {
        expect(getUploadErrorMessage(new Error("El archivo supera el tamaño máximo permitido de 10 MB."))).toMatch(/10 MB/);
    });
});

describe('verificación de documentos guardados', () => {
    const id = 'd4c005b3-7082-4a13-bba6-55a0a7ba0bd7';
    it.each(['DISPONIBLE', 'FALTANTE', 'INVALIDO', 'NO_VERIFICABLE'] as const)('consulta el estado real: %s', async estado => {
        apiClient.defaults.baseURL = 'http://localhost:3000/';
        const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { estado } });
        try {
            await expect(getDocumentAvailability(`http://localhost:3000/api/documentos/${id}`)).resolves.toBe(estado);
            expect(get).toHaveBeenCalledWith(`http://localhost:3000/api/documentos/${id}/estado`, { signal: undefined });
        } finally { get.mockRestore(); }
    });
    it('no envía credenciales a enlaces externos', async () => {
        apiClient.defaults.baseURL = 'http://localhost:3000/';
        const get = vi.spyOn(apiClient, 'get');
        try {
            await expect(getDocumentAvailability(`https://otro.example/api/documentos/${id}`)).resolves.toBe('NO_VERIFICABLE');
            expect(get).not.toHaveBeenCalled();
        } finally { get.mockRestore(); }
    });
    it('no considera disponible una respuesta incompleta o una página HTML', async () => {
        apiClient.defaults.baseURL = 'http://localhost:3000/';
        const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: '<html>SPA</html>' });
        try {
            await expect(getDocumentAvailability(`/api/documentos/${id}`)).resolves.toBe('NO_VERIFICABLE');
        } finally { get.mockRestore(); }
    });
    it('conserva fallos de red para que la UI muestre que no pudo verificar', async () => {
        apiClient.defaults.baseURL = 'http://localhost:3000/';
        const get = vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('timeout'));
        try { await expect(getDocumentAvailability(`/api/documentos/${id}`)).rejects.toThrow('timeout'); }
        finally { get.mockRestore(); }
    });
});

describe('vista previa de documentos protegidos', () => {
    it('lee el documento del servidor configurado y admite cancelación', async () => {
        apiClient.defaults.baseURL = 'http://localhost:3000/';
        const signal = new AbortController().signal;
        const data = new Blob(['%PDF'], { type: 'application/pdf' });
        const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data });
        try {
            await expect(getProtectedDocument('/api/documentos/123', signal)).resolves.toBe(data);
            expect(get).toHaveBeenCalledWith('http://localhost:3000/api/documentos/123', { responseType: 'blob', signal });
        } finally { get.mockRestore(); }
    });

    it('rechaza rutas de otro origen antes de enviar la solicitud', async () => {
        apiClient.defaults.baseURL = 'http://localhost:3000/';
        const get = vi.spyOn(apiClient, 'get');
        try {
            await expect(getProtectedDocument('https://otro.example/api/documentos/123', new AbortController().signal)).rejects.toThrow();
            expect(get).not.toHaveBeenCalled();
        } finally { get.mockRestore(); }
    });
});
