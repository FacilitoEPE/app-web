import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/client";
import { getClienteNegocioContratos } from "@/modules/clients/api/cliente-negocio-contratos.api";

vi.mock("@/shared/api/client", () => ({
  apiClient: { get: vi.fn() },
}));

const response = {
  clienteNegocio: {
    clienteNegocioId: 24,
    nombreEmpresa: "Exportadora Andina",
    nombreContacto: "Ana Pérez",
    telefono: "+51987654321",
    ruc: "20123456789",
    correoCorporativo: "ana@example.com",
    ubicacion: "Lima",
    tipoCliente: "exportador" as const,
  },
  contratos: [
    {
      clienteNegocioCampanaId: 101,
      documentoUrl: "https://example.com/contrato.pdf",
      fichaTecnicaUrl: "https://example.com/ficha.pdf",
      kilosAcordados: 1250.5,
      campaniaId: 5,
      nombreCampania: "Campaña 2026",
      fechaRegistro: "2026-03-02T00:00:00.000Z",
    },
  ],
};

beforeEach(() => vi.clearAllMocks());

describe("cliente-negocio contratos API", () => {
  it("requests and preserves the backend client contract response fields", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: response });

    await expect(getClienteNegocioContratos(24)).resolves.toEqual(response);
    expect(apiClient.get).toHaveBeenCalledWith("/v1/clientes-negocio/24/contratos");
  });

  it("returns an empty list when the client has no campaign contracts", async () => {
    const emptyResponse = { ...response, contratos: [] };
    vi.mocked(apiClient.get).mockResolvedValue({ data: emptyResponse });

    await expect(getClienteNegocioContratos(24)).resolves.toEqual(emptyResponse);
  });

  it("propagates read failures for the detail view to report", async () => {
    const failure = new Error("network unavailable");
    vi.mocked(apiClient.get).mockRejectedValue(failure);

    await expect(getClienteNegocioContratos(24)).rejects.toBe(failure);
  });
});
