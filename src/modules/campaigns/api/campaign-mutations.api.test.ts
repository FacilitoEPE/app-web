import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post, patch } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("@/shared/api/client", () => ({ apiClient: { get, post, patch } }));

import { updateClienteNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.api";
import {
  createCertificadoCampana,
  updateCertificadoCampana,
} from "@/modules/campaigns/api/certificado-campana.api";

const relationDto = {
  clienteNegocioCampanaId: 12,
  clienteNegocioId: 8,
  campaniaId: 5,
  documentoUrl: "https://example.com/requirements.pdf",
  fechaRegistro: "2026-06-21T00:00:00.000Z",
  fichaTecnicaUrl: "https://example.com/technical-sheet.pdf",
  cantidadKg: 125.5,
  kilosAcordados: 140,
  createdAt: "2026-06-21T12:00:00.000Z",
  updatedAt: "2026-06-22T12:00:00.000Z",
};

const certificateDto = {
  certificadoId: 9,
  nombre: "Global GAP",
  documentUrl: "https://example.com/certificate.pdf",
  reciboUrl: "https://example.com/receipt.pdf",
  costo: 123.45,
  fechaVencimiento: "2026-08-31T00:00:00.000Z",
  campaniaId: 5,
  estado: "vigente" as const,
};

describe("campaign mutation API routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("patches only the selected campaign-client relation and maps its returned fields", async () => {
    patch.mockResolvedValueOnce({ data: relationDto });
    const input = {
      documentoUrl: relationDto.documentoUrl,
      fechaRegistro: "2026-06-21",
      fichaTecnicaUrl: relationDto.fichaTecnicaUrl,
      cantidadKg: 125.5,
      kilosAcordados: 140,
    };

    const result = await updateClienteNegocioCampana(5, 12, input);
    expect(result).toMatchObject({
      clienteNegocioCampanaId: 12,
      clienteNegocioId: 8,
      fichaTecnicaUrl: "https://example.com/technical-sheet.pdf",
      kilosAcordados: 140,
    });
    expect(result.fechaRegistro.getFullYear()).toBe(2026);
    expect(result.fechaRegistro.getMonth()).toBe(5);
    expect(result.fechaRegistro.getDate()).toBe(21);
    expect(patch).toHaveBeenCalledWith("/v1/campanas/5/clientes-negocio/12", input);
  });

  it("creates and patches certificates with backend DTO field names and exact campaign routes", async () => {
    const input = {
      nombre: certificateDto.nombre,
      documentUrl: certificateDto.documentUrl,
      reciboUrl: certificateDto.reciboUrl,
      costo: certificateDto.costo,
      fechaVencimiento: "2026-08-31",
      estado: certificateDto.estado,
    };
    post.mockResolvedValueOnce({ data: certificateDto });
    patch.mockResolvedValueOnce({ data: certificateDto });

    await expect(createCertificadoCampana(5, input)).resolves.toMatchObject({
      certificadoId: 9,
      documentoUrl: certificateDto.documentUrl,
      reciboUrl: certificateDto.reciboUrl,
      costo: 123.45,
    });
    await expect(updateCertificadoCampana(5, 9, input)).resolves.toMatchObject({
      certificadoId: 9,
      estado: "vigente",
    });
    expect(post).toHaveBeenCalledWith("/v1/campanas/5/certificados", input);
    expect(patch).toHaveBeenCalledWith("/v1/campanas/5/certificados/9", input);
  });
});
