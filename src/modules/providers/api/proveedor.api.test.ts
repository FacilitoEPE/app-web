import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post, patch, deleteRequest } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  deleteRequest: vi.fn(),
}));

vi.mock("@/shared/api/client", () => ({ apiClient: { get, post, patch, delete: deleteRequest } }));

import { createProveedor, deleteProveedor, getProveedor, getProveedores, updateProveedor } from "@/modules/providers/api/proveedor.api";

const provider = {
  proveedorId: 7,
  nombres: "Ana",
  apellido: "Pérez",
  tipoDocumento: "DNI" as const,
  nmrDocumento: 12345678,
  identidadDocUrl: "https://example.com/id.pdf",
  zona: "Piura",
  telefono: 987654321,
  email: "ana@example.com",
  codigoLugarProduccion: 42,
  estadoSanidadAgraria: "Registrado",
  identidadDocArchivo: null as File | null,
  frutas: [],
};

describe("proveedor API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads list and detail from the provider routes", async () => {
    get.mockResolvedValueOnce({ data: [provider] }).mockResolvedValueOnce({ data: provider });

    await expect(getProveedores()).resolves.toEqual([provider]);
    await expect(getProveedor(7)).resolves.toEqual(provider);
    expect(get).toHaveBeenNthCalledWith(1, "/v1/proveedores");
    expect(get).toHaveBeenNthCalledWith(2, "/v1/proveedores/7");
  });

  it("creates, patches, and deletes only on supported provider routes", async () => {
    const { proveedorId: _id, ...payload } = provider;
    expect(_id).toBe(7);
    post.mockResolvedValueOnce({ data: provider });
    patch.mockResolvedValueOnce({ data: provider });
    deleteRequest.mockResolvedValueOnce({});

    await expect(createProveedor(payload)).resolves.toEqual(provider);
    await expect(updateProveedor(7, payload)).resolves.toEqual(provider);
    await expect(deleteProveedor(7)).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith("/v1/proveedores", payload);
    expect(patch).toHaveBeenCalledWith("/v1/proveedores/7", payload);
    expect(deleteRequest).toHaveBeenCalledWith("/v1/proveedores/7");
  });
});
