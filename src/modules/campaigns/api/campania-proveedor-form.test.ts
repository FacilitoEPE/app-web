import { describe, expect, it } from "vitest";
import {
  getCampaniaProveedorDraftErrors,
  toCreateCampaniaProveedorInput,
  type CampaniaProveedorDraft,
} from "@/modules/campaigns/api/campania-proveedor-form";

const producerDraft: CampaniaProveedorDraft = {
  proveedorId: 17,
  tipoProveedor: "productor",
  cantidadProveedor: "12.5",
  mtdCeratitis: "0.375",
};

describe("campaign provider form contract", () => {
  it("serializes all required fields with null for unprovided fields by default", () => {
    expect(toCreateCampaniaProveedorInput(4, producerDraft)).toEqual({
      campaniaId: 4,
      proveedorId: 17,
      tipoProveedor: "productor",
      cantidadProveedor: 12.5,
      mtdCeratitis: 0.375,
      frutaConvencionalEstimado: null,
      departamento: null,
      provincia: null,
      distrito: null,
      latitud: null,
      longitud: null,
      densidadPlantacion: null,
      distanciamiento: null,
      frecuenciaRiego: null,
      haTotalFinca: null,
      haCultivo: null,
      nombreAplicacion: null,
      aplicacionesAlAno: null,
    });
  });

  it("serializes provided optional fields properly", () => {
    expect(
      toCreateCampaniaProveedorInput(4, {
        ...producerDraft,
        frutaConvencionalEstimado: "500",
        departamento: "  Piura  ",
        latitud: -5.19,
      }),
    ).toEqual({
      campaniaId: 4,
      proveedorId: 17,
      tipoProveedor: "productor",
      cantidadProveedor: 12.5,
      mtdCeratitis: 0.375,
      frutaConvencionalEstimado: 500,
      departamento: "Piura",
      provincia: null,
      distrito: null,
      latitud: -5.19,
      longitud: null,
      densidadPlantacion: null,
      distanciamiento: null,
      frecuenciaRiego: null,
      haTotalFinca: null,
      haCultivo: null,
      nombreAplicacion: null,
      aplicacionesAlAno: null,
    });
  });

  it("reports missing, negative, and out-of-range values", () => {
    const errors = getCampaniaProveedorDraftErrors({
      ...producerDraft,
      mtdCeratitis: "",
      cantidadProveedor: "-1",
    });

    expect(errors).toMatchObject({
      cantidadProveedor: expect.any(String),
      mtdCeratitis: expect.any(String),
    });
  });
});

