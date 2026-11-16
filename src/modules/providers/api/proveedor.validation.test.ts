import { describe, expect, it } from "vitest";
import type { ProveedorDto } from "@/modules/providers/api/proveedor.dto";
import type { ProveedorFormValues } from "@/modules/providers/api/proveedor.dto";
import { toProveedorInput, toProveedorPayload, validateProveedorInput } from "@/modules/providers/api/proveedor.validation";

const validInput: ProveedorFormValues = {
  nombres: "  Ana  ",
  apellido: "  Pérez ",
  tipoDocumento: "DNI",
  nmrDocumento: "12345678",
  identidadDocUrl: " https://example.com/id.pdf ",
  zona: " Piura ",
  telefono: "987654321",
  email: " ana@example.com ",
  codigoLugarProduccion: "42",
  estadoSanidadAgraria: "Registrado",
  identidadDocArchivo: null,
  frutas: [],
};

describe("provider form contract", () => {
  it("trims writable fields and projects only the backend create/update DTO", () => {
    expect(toProveedorPayload(validInput)).toEqual({
      nombres: "Ana",
      apellido: "Pérez",
      tipoDocumento: "DNI",
      nmrDocumento: "12345678",
      identidadDocUrl: "https://example.com/id.pdf",
      zona: "Piura",
      telefono: "987654321",
      email: "ana@example.com",
      codigoLugarProduccion: "42",
      estadoSanidadAgraria: "Registrado",
      identidadDocArchivo: null,
      frutas: [],
    });
  });

  it("validates required fields, contact lengths and the optional email", () => {
    expect(validateProveedorInput({ ...validInput, email: validInput.email.trim() })).toEqual({});
    expect(validateProveedorInput({ ...validInput, email: "" })).toEqual({});
    expect(validateProveedorInput({ ...validInput, email: "nope", telefono: "1".repeat(31), nmrDocumento: "" })).toMatchObject({
      email: expect.any(String),
      telefono: expect.any(String),
      nmrDocumento: expect.any(String),
    });
  });

  it("maps API data into editable string values without unsupported fields", () => {
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

    expect(toProveedorInput(provider)).toEqual({
      nombres: "Ana",
      apellido: "Pérez",
      tipoDocumento: "DNI",
      nmrDocumento: "12345678",
      identidadDocUrl: "https://example.com/id.pdf",
      zona: "Piura",
      telefono: "987654321",
      email: "ana@example.com",
      codigoLugarProduccion: "42",
      estadoSanidadAgraria: "",
      identidadDocArchivo: null,
      frutas: [],
    });
  });
});
