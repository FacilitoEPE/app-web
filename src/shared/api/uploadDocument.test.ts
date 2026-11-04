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

    it("muestra un error de subida", () => {
        expect(getUploadErrorMessage(new Error("network"))).toMatch(/No se pudo subir/);
    });
});
