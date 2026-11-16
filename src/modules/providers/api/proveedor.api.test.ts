import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post, patch, deleteRequest } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  deleteRequest: vi.fn(),
}));

vi.mock("@/shared/api/client", () => ({ apiClient: { defaults: {}, get, post, patch, delete: deleteRequest } }));

import { createProveedor, deleteProveedor, getProveedor, getProveedores, updateProveedor } from "@/modules/providers/api/proveedor.api";

const response = {
  proveedorId: 7,
  nombres: "Ana",
  apellido: "Pérez",
  tipoDocumento: "DNI" as const,
  nmrDocumento: "12345678",
  identidadDocUrl: "https://example.com/id.pdf",
  zona: "Piura",
  telefono: "987654321",
  email: "ana@example.com",
  codigoLugarProduccion: "42",
  estadoExamenSanidadAgraria: "Registrado",
};
const { estadoExamenSanidadAgraria, ...fields } = response;
const provider = { ...fields, estadoSanidadAgraria: estadoExamenSanidadAgraria };

describe("proveedor API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads list and detail from the provider routes", async () => {
    get.mockResolvedValueOnce({ data: { items: [response], total: 1, page: 1, pageSize: 100 } })
      .mockResolvedValueOnce({ data: response });

    await expect(getProveedores()).resolves.toEqual([provider]);
    await expect(getProveedor(7)).resolves.toEqual(provider);
    expect(get).toHaveBeenNthCalledWith(1, "/v1/proveedores", expect.objectContaining({ params: { pageSize: 100 } }));
    expect(get).toHaveBeenNthCalledWith(2, "/v1/proveedores/7", expect.any(Object));
  });

  it("creates, patches, and deletes only on supported provider routes", async () => {
    const { proveedorId: _id, ...payload } = provider;
    expect(_id).toBe(7);
    post.mockResolvedValueOnce({ data: response });
    patch.mockResolvedValueOnce({ data: response });
    deleteRequest.mockResolvedValueOnce({});

    const input = { ...payload, identidadDocArchivo: null, frutas: [] };
    await expect(createProveedor(input)).resolves.toEqual(provider);
    await expect(updateProveedor(7, input)).resolves.toEqual(provider);
    await expect(deleteProveedor(7)).resolves.toBeUndefined();
    const expectedBody = {
      nombres: "Ana", apellido: "Pérez", tipoDocumento: "DNI", nmrDocumento: "12345678",
      zona: "Piura", telefono: "987654321", email: "ana@example.com", codigoLugarProduccion: "42",
      estadoExamenSanidadAgraria: "Registrado",
    };
    expect(post).toHaveBeenCalledWith("/v1/proveedores", expectedBody);
    expect(patch).toHaveBeenCalledWith("/v1/proveedores/7", expectedBody);
    expect(deleteRequest).toHaveBeenCalledWith("/v1/proveedores/7");
  });
});
