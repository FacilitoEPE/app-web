import { describe, expect, it } from "vitest";
import type { ProveedorDto } from "@/modules/providers/api/proveedor.dto";
import { createProviderFormSession } from "@/modules/providers/api/provider-lifecycle";

const provider: ProveedorDto = {
  proveedorId: 7,
  nombres: "Ana",
  apellido: "Pérez",
  tipoDocumento: "DNI",
  nmrDocumento: 12345678,
  identidadDocUrl: "https://example.com/id.pdf",
  zona: "Piura",
  telefono: 987654321,
  email: "ana@example.com",
  codigoLugarProduccion: 42,
};

describe("provider dialog sessions", () => {
  it("starts every editor session for the same provider with fresh feedback", () => {
    const first = createProviderFormSession(provider);
    first.errors.email = "Old validation error";
    first.saveError = "Old API error";

    const reopened = createProviderFormSession(provider);

    expect(reopened.values.nombres).toBe("Ana");
    expect(reopened.errors).toEqual({});
    expect(reopened.saveError).toBeNull();
    expect(reopened.errors).not.toBe(first.errors);
  });
});
