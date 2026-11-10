import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post, patch, deleteRequest } = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    deleteRequest: vi.fn(),
}));

vi.mock("@/shared/api/client", () => ({ apiClient: { get, post, patch, delete: deleteRequest } }));

import {
    assignProveedorFruta,
    createCertificadoProveedor,
    createExamenProveedor,
    deleteCertificadoProveedor,
    deleteExamenProveedor,
    getCertificadosProveedor,
    getExamenesProveedor,
    getFrutasProveedor,
    unassignProveedorFruta,
    updateCertificadoProveedor,
    updateExamenProveedor,
} from "@/modules/providers/api/provider-subresources.api";

const fruta = { pxfId: 1, proveedorId: 7, frutaId: 3, fruta: { frutaId: 3, name: "Mango" } };
const examen = {
    examenProveedorId: 8,
    proveedorId: 7,
    fecha: "2026-09-20T00:00:00.000Z",
    tipoExamen: "Residuo",
    resultado: "negativo" as const,
    origen: "Laboratorio",
    observacion: "Sin observaciones",
    documentoUrl: "https://example.com/examen.pdf",
};
const certificado = {
    certificadoProveedorId: 9,
    proveedorId: 7,
    fechaRevisionSenasa: "2026-09-21T00:00:00.000Z",
    nombre: "Registro SENASA",
    documentoArchivoId: 4,
};

describe("provider subresource API", () => {
    beforeEach(() => vi.clearAllMocks());

    it("reads assigned fruit and assigns or removes it using the path-parameter contract", async () => {
        get.mockResolvedValueOnce({ data: [fruta] });
        post.mockResolvedValueOnce({ data: fruta });
        deleteRequest.mockResolvedValueOnce({});

        await expect(getFrutasProveedor(7)).resolves.toEqual([fruta]);
        await expect(assignProveedorFruta(7, 3)).resolves.toEqual(fruta);
        await expect(unassignProveedorFruta(7, 3)).resolves.toBeUndefined();
        expect(get).toHaveBeenCalledWith("/v1/proveedores/7/frutas");
        expect(post).toHaveBeenCalledWith("/v1/proveedores/7/frutas/3");
        expect(deleteRequest).toHaveBeenCalledWith("/v1/proveedores/7/frutas/por-fruta/3");
    });

    it("reads and mutates provider exams with exact IDs and DTO fields", async () => {
        get.mockResolvedValueOnce({ data: [examen] });
        post.mockResolvedValueOnce({ data: examen });
        patch.mockResolvedValueOnce({ data: examen });
        deleteRequest.mockResolvedValueOnce({});
        const examenProveedorId = examen.examenProveedorId;
        const payload = { fecha: examen.fecha, tipoExamen: examen.tipoExamen, resultado: examen.resultado, origen: examen.origen, observacion: examen.observacion, documentoUrl: examen.documentoUrl };

        await expect(getExamenesProveedor(7)).resolves.toEqual([examen]);
        await expect(createExamenProveedor(7, payload)).resolves.toEqual(examen);
        await expect(updateExamenProveedor(7, examenProveedorId, payload)).resolves.toEqual(examen);
        await expect(deleteExamenProveedor(7, examenProveedorId)).resolves.toBeUndefined();
        expect(get).toHaveBeenCalledWith("/v1/proveedores/7/examenes");
        expect(post).toHaveBeenCalledWith("/v1/proveedores/7/examenes", payload);
        expect(patch).toHaveBeenCalledWith("/v1/proveedores/7/examenes/8", payload);
        expect(deleteRequest).toHaveBeenCalledWith("/v1/proveedores/7/examenes/8");
    });

    it("reads and mutates provider certificates with exact IDs and DTO fields", async () => {
        get.mockResolvedValueOnce({ data: [certificado] });
        post.mockResolvedValueOnce({ data: certificado });
        patch.mockResolvedValueOnce({ data: certificado });
        deleteRequest.mockResolvedValueOnce({});
        const certificadoProveedorId = certificado.certificadoProveedorId;
        const payload = { fechaRevisionSenasa: certificado.fechaRevisionSenasa, nombre: certificado.nombre, documentoArchivoId: certificado.documentoArchivoId };

        await expect(getCertificadosProveedor(7)).resolves.toEqual([certificado]);
        await expect(createCertificadoProveedor(7, payload)).resolves.toEqual(certificado);
        await expect(updateCertificadoProveedor(7, certificadoProveedorId, payload)).resolves.toEqual(certificado);
        await expect(deleteCertificadoProveedor(7, certificadoProveedorId)).resolves.toBeUndefined();
        expect(get).toHaveBeenCalledWith("/v1/proveedores/7/certificados/documentos/registro");
        expect(post).toHaveBeenCalledWith("/v1/proveedores/7/certificados/documentos/registro", payload);
        expect(patch).toHaveBeenCalledWith("/v1/proveedores/7/certificados/9/documentos/registro", payload);
        expect(deleteRequest).toHaveBeenCalledWith("/v1/proveedores/7/certificados/9/documentos/registro");
    });

    it("uploads a certificate directly to S3, confirms availability, then creates it with the file ID", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ archivoId: 4, estado: "DISPONIBLE" }) });
        vi.stubGlobal("fetch", fetchMock);
        post.mockResolvedValueOnce({ data: { archivoId: 4, estado: "PENDIENTE", uploadUrl: "https://s3.test/upload", method: "PUT", headers: { "Content-Type": "application/pdf" }, expiresInSeconds: 300 } })
            .mockResolvedValueOnce({ data: { archivoId: 4, estado: "DISPONIBLE" } })
            .mockResolvedValueOnce({ data: { ...certificado } });
        const { createCertificadoProveedorWithFile } = await import("@/modules/providers/api/provider-subresources.api");
        const file = new File(["pdf"], "certificado.pdf", { type: "application/pdf" });
        await createCertificadoProveedorWithFile(7, file, { fechaRevisionSenasa: "2026-09-21", nombre: "Registro SENASA" });
        expect(post.mock.calls).toEqual([
            ["/v1/proveedores/7/certificados/documentos/subida", { nombreOriginal: "certificado.pdf", mimeType: "application/pdf", tamanoBytes: 3 }],
            ["/v1/proveedores/7/certificados/documentos/4/confirmacion"],
            ["/v1/proveedores/7/certificados/documentos/registro", { fechaRevisionSenasa: "2026-09-21", nombre: "Registro SENASA", documentoArchivoId: 4 }],
        ]);
        expect(fetchMock).toHaveBeenCalledWith("https://s3.test/upload", { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: file });
        vi.unstubAllGlobals();
    });

    it("does not create a certificate when S3 confirmation is not available", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
        post.mockResolvedValueOnce({ data: { archivoId: 4, estado: "PENDIENTE", uploadUrl: "https://s3.test/upload", method: "PUT", headers: {}, expiresInSeconds: 300 } })
            .mockResolvedValueOnce({ data: { archivoId: 4, estado: "PENDIENTE" } });
        const { createCertificadoProveedorWithFile } = await import("@/modules/providers/api/provider-subresources.api");
        await expect(createCertificadoProveedorWithFile(7, new File(["pdf"], "x.pdf", { type: "application/pdf" }), { fechaRevisionSenasa: "2026-09-21", nombre: "Registro" })).rejects.toThrow(/disponible/i);
        expect(post).toHaveBeenCalledTimes(2);
        vi.unstubAllGlobals();
    });

    it("stops after an unsuccessful S3 upload", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
        post.mockResolvedValueOnce({ data: { archivoId: 4, estado: "PENDIENTE", uploadUrl: "https://s3.test/upload", method: "PUT", headers: {}, expiresInSeconds: 300 } });
        const { createCertificadoProveedorWithFile } = await import("@/modules/providers/api/provider-subresources.api");
        await expect(createCertificadoProveedorWithFile(7, new File(["pdf"], "x.pdf", { type: "application/pdf" }), { fechaRevisionSenasa: "2026-09-21", nombre: "Registro" })).rejects.toThrow(/subir/i);
        expect(post).toHaveBeenCalledTimes(1);
        vi.unstubAllGlobals();
    });

    it("rejects invalid files before requesting an upload URL", async () => {
        const { createCertificadoProveedorWithFile } = await import("@/modules/providers/api/provider-subresources.api");
        await expect(createCertificadoProveedorWithFile(7, new File(["gif"], "x.gif", { type: "image/gif" }), { fechaRevisionSenasa: "2026-09-21", nombre: "Registro" })).rejects.toThrow(/tipo de archivo/i);
        expect(post).not.toHaveBeenCalled();
    });

    it("requests a fresh certificate download URL", async () => {
        get.mockResolvedValueOnce({ data: { archivoId: 4, downloadUrl: "https://s3.test/download", expiresInSeconds: 300 } });
        const { getCertificadoProveedorDownloadUrl } = await import("@/modules/providers/api/provider-subresources.api");
        await expect(getCertificadoProveedorDownloadUrl(7, 9)).resolves.toBe("https://s3.test/download");
        expect(get).toHaveBeenCalledWith("/v1/proveedores/7/certificados/9/documento/descarga");
    });

    it("uploads and confirms a replacement before patching the certificate with the new file ID", async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal("fetch", fetchMock);
        post.mockResolvedValueOnce({ data: { archivoId: 11, estado: "PENDIENTE", uploadUrl: "https://s3.test/replacement", method: "PUT", headers: { "Content-Type": "image/png" }, expiresInSeconds: 300 } })
            .mockResolvedValueOnce({ data: { archivoId: 11, estado: "DISPONIBLE" } });
        patch.mockResolvedValueOnce({ data: { ...certificado, documentoArchivoId: 11 } });
        const { updateCertificadoProveedorWithFile } = await import("@/modules/providers/api/provider-subresources.api");
        const file = new File(["png"], "replacement.png", { type: "image/png" });
        await expect(updateCertificadoProveedorWithFile(7, 9, file, { fechaRevisionSenasa: "2026-09-21", nombre: "Registro SENASA" })).resolves.toMatchObject({ documentoArchivoId: 11 });
        expect(post.mock.calls).toEqual([
            ["/v1/proveedores/7/certificados/documentos/subida", { nombreOriginal: "replacement.png", mimeType: "image/png", tamanoBytes: 3 }],
            ["/v1/proveedores/7/certificados/documentos/11/confirmacion"],
        ]);
        expect(patch).toHaveBeenCalledWith("/v1/proveedores/7/certificados/9/documentos/registro", { fechaRevisionSenasa: "2026-09-21", nombre: "Registro SENASA", documentoArchivoId: 11 });
        expect(fetchMock).toHaveBeenCalledWith("https://s3.test/replacement", { method: "PUT", headers: { "Content-Type": "image/png" }, body: file });
        vi.unstubAllGlobals();
    });
});
