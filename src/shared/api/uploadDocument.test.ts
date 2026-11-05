import { describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/client";
import { getUploadErrorMessage, uploadDocument } from "@/shared/api/uploadDocument";

describe("uploadDocument", () => {
    it("sube el archivo a S3 mediante la API", async () => {
        apiClient.defaults.baseURL = 'http://localhost:3000/';
        const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { url: '/api/documentos/example' } });
        const file = new File(['x'], 'contrato.pdf', { type: 'application/pdf' });
        await expect(uploadDocument(file)).resolves.toBe('http://localhost:3000/api/documentos/example');
        expect((post.mock.calls[0][1] as FormData).get('archivo')).toBe(file);
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
