import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/shared/api/client";
import {
  createClienteNegocio,
  deleteClienteNegocio,
  getClientesNegocio,
  updateClienteNegocio,
} from "@/modules/clients/api/cliente-negocio.api";
import { toClienteNegocioInput } from "@/modules/clients/api/cliente-negocio.validation";

vi.mock("@/shared/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const input = {
  nombreEmpresa: "Exportadora Andina",
  nombreContacto: "Ana Pérez",
  telefono: "+51987654321",
  ruc: "20123456789",
  correoCorporativo: "ana@example.com",
  ubicacion: "Lima",
  tipoCliente: "exportador" as const,
};
const dto = { ...input, clienteNegocioId: 7, createdAt: "2026-09-01", updatedAt: "2026-09-02" };

beforeEach(() => vi.clearAllMocks());

describe("cliente-negocio API", () => {
  it("loads and maps the persisted client list", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [dto] });
    await expect(getClientesNegocio()).resolves.toEqual([dto]);
    expect(apiClient.get).toHaveBeenCalledWith("/v1/clientes-negocio");
  });

  it("creates clients using the verified backend contract", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: dto });
    await expect(createClienteNegocio(input)).resolves.toEqual(dto);
    expect(apiClient.post).toHaveBeenCalledWith("/v1/clientes-negocio", input);
  });

  it("patches only the selected client's supported fields", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: dto });
    await expect(updateClienteNegocio(7, { nombreContacto: "Ana María Pérez" })).resolves.toEqual(dto);
    expect(apiClient.patch).toHaveBeenCalledWith("/v1/clientes-negocio/7", { nombreContacto: "Ana María Pérez" });
  });

  it("sends an entity-derived edit body without identifiers or audit fields", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: dto });
    const entity = { ...dto, nombreEmpresa: " Exportadora Andina " };
    const input = toClienteNegocioInput(entity);

    await updateClienteNegocio(entity.clienteNegocioId, input);

    expect(apiClient.patch).toHaveBeenCalledWith("/v1/clientes-negocio/7", {
      nombreEmpresa: "Exportadora Andina",
      nombreContacto: "Ana Pérez",
      telefono: "+51987654321",
      ruc: "20123456789",
      correoCorporativo: "ana@example.com",
      ubicacion: "Lima",
      tipoCliente: "exportador",
    });
  });

  it("deletes by id and resolves only after the API confirms", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ data: undefined });
    await expect(deleteClienteNegocio(7)).resolves.toBeUndefined();
    expect(apiClient.delete).toHaveBeenCalledWith("/v1/clientes-negocio/7");
  });
});
