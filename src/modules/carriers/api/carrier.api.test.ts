import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiClient } = vi.hoisted(() => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/shared/api/client", () => ({ apiClient }));

import {
  createCarrier,
  createDriver,
  createVehicle,
  deleteCarrier,
  deleteDriver,
  deleteVehicle,
  getCarrier,
  getCarriers,
  updateCarrier,
  updateDriver,
  updateVehicle,
} from "@/modules/carriers/api/carrier.api";

describe("carrier API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps backend companies and their nested fleet to the UI model", async () => {
    apiClient.get.mockResolvedValueOnce({
      data: [{
        idEmpresaTransporteExterno: 7,
        nombreCompleto: "Carga Norte",
        ruc: "20123456789",
        correo: "contacto@example.com",
        numero: "+51987654321",
        vehiculos: [{
          idVehiculoExterno: 9,
          placa: "ABC-123",
          volumen: 12,
          ancho: 2,
          altura: 2,
          profundidad: 3,
          pesoNeto: 5,
          pesoBruto: 8,
        }],
        choferes: [{
          idChoferTransporteExterno: 11,
          nombre: "Ana Ruiz",
          telefono: "+51912345678",
          correo: "ana@example.com",
        }],
      }],
    });

    await expect(getCarriers()).resolves.toEqual([{
      id: 7,
      nombre: "Carga Norte",
      numero: "+51987654321",
      correo: "contacto@example.com",
      ruc: "20123456789",
      vehiculos: [{
        id: 9,
        carrierId: 7,
        placa: "ABC-123",
        volumen: 12,
        ancho: 2,
        altura: 2,
        profundidad: 3,
        pesoNeto: 5,
        pesoBruto: 8,
      }],
      choferes: [{
        id: 11,
        carrierId: 7,
        nombre: "Ana Ruiz",
        telefono: "+51912345678",
        correo: "ana@example.com",
      }],
    }]);
    expect(apiClient.get).toHaveBeenCalledWith("/v1/empresas-transporte-externo");
  });

  it("maps carrier payload names and vehicle volume to backend DTOs", async () => {
    apiClient.post.mockResolvedValue({ data: {} });
    const carrier = { nombre: "Carga Norte", numero: "+51987654321", correo: "contacto@example.com", ruc: "20123456789" };
    await createCarrier(carrier);
    expect(apiClient.post).toHaveBeenCalledWith("/v1/empresas-transporte-externo", {
      nombreCompleto: carrier.nombre,
      numero: carrier.numero,
      correo: carrier.correo,
      ruc: carrier.ruc,
    });

    await createVehicle(7, { placa: "abc-123", ancho: 2, altura: 2, profundidad: 3, volumen: 12, pesoNeto: 5, pesoBruto: 8 });
    expect(apiClient.post).toHaveBeenCalledWith("/v1/vehiculos-externos", {
      idEmpresaTransporteExterno: 7,
      placa: "ABC-123",
      volumen: 12,
      ancho: 2,
      altura: 2,
      profundidad: 3,
      pesoNeto: 5,
      pesoBruto: 8,
    });
  });

  it("calls the backend CRUD routes for carrier, vehicle and driver changes", async () => {
    apiClient.patch.mockResolvedValue({ data: {} });
    apiClient.delete.mockResolvedValue({ data: undefined });
    apiClient.get.mockResolvedValue({ data: {} });
    apiClient.post.mockResolvedValue({ data: {} });

    await getCarrier(7);
    expect(apiClient.get).toHaveBeenCalledWith("/v1/empresas-transporte-externo/7");
    await updateCarrier(7, { nombre: "Carga Actualizada" });
    expect(apiClient.patch).toHaveBeenCalledWith("/v1/empresas-transporte-externo/7", { nombreCompleto: "Carga Actualizada" });
    await deleteCarrier(7);
    expect(apiClient.delete).toHaveBeenCalledWith("/v1/empresas-transporte-externo/7");

    await updateVehicle(9, 7, { placa: "XYZ-999", ancho: 2, altura: 2, profundidad: 3, volumen: 12, pesoNeto: 5, pesoBruto: 8 });
    expect(apiClient.patch).toHaveBeenCalledWith("/v1/vehiculos-externos/9", expect.objectContaining({ volumen: 12 }));
    expect(apiClient.patch.mock.calls[1]?.[1]).not.toHaveProperty("idEmpresaTransporteExterno");
    await deleteVehicle(9);
    expect(apiClient.delete).toHaveBeenCalledWith("/v1/vehiculos-externos/9");

    await createDriver(7, { nombre: "Ana Ruiz", telefono: "+51912345678", correo: "ana@example.com" });
    expect(apiClient.post).toHaveBeenCalledWith("/v1/choferes-transporte-externo", {
      idEmpresaTransporteExterno: 7,
      nombre: "Ana Ruiz",
      telefono: "+51912345678",
      correo: "ana@example.com",
    });
    await updateDriver(11, { nombre: "Ana R." });
    expect(apiClient.patch).toHaveBeenCalledWith("/v1/choferes-transporte-externo/11", { nombre: "Ana R." });
    await deleteDriver(11);
    expect(apiClient.delete).toHaveBeenCalledWith("/v1/choferes-transporte-externo/11");
  });
});
