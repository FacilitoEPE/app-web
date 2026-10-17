import { describe, expect, it } from "vitest";
import {
  getCampaniaProveedorDraftErrors,
  toCreateCampaniaProveedorInput,
  toUpdateCampaniaProveedorInput,
  type CampaniaProveedorDraft,
} from "@/modules/campaigns/api/campania-proveedor-form";

const producerDraft: CampaniaProveedorDraft = {
  proveedorId: 17,
  tipoProveedor: "productor",
  cantidadProveedor: "12.5",
};

describe("campaign provider form contract", () => {
  it("serializes only API fields by default", () => {
    expect(toCreateCampaniaProveedorInput(4, producerDraft)).toEqual({
      campaniaId: 4,
      proveedorId: 17,
      tipoProveedor: "productor",
      cantidadProveedor: 12.5,
      frutaConvencionalEstimado: null,
    });
  });

  it("omits legacy location and agronomic fields when serializing creation", () => {
    const legacyDraft = {
      ...producerDraft,
      frutaConvencionalEstimado: "500",
      departamento: "Piura",
      provincia: "Piura",
      distrito: "Tambo Grande",
      latitud: -5.19,
      longitud: -80.34,
      densidadPlantacion: 400,
      distanciamiento: 5,
      frecuenciaRiego: 3,
      haTotalFinca: 12,
      haCultivo: 8,
      nombreAplicacion: "Trampa Jackson",
      aplicacionesAlAno: 6,
    };

    expect(toCreateCampaniaProveedorInput(4, legacyDraft)).toEqual({
      campaniaId: 4,
      proveedorId: 17,
      tipoProveedor: "productor",
      cantidadProveedor: 12.5,
      frutaConvencionalEstimado: 500,
    });
  });

  it("serializes updates without legacy location and agronomic fields", () => {
    expect(toUpdateCampaniaProveedorInput(producerDraft)).toEqual({
      tipoProveedor: "productor",
      cantidadProveedor: 12.5,
      frutaConvencionalEstimado: null,
    });
  });

  it("includes fincaId when a caller supplies it", () => {
    expect(
      toCreateCampaniaProveedorInput(4, { ...producerDraft, fincaId: 23 }),
    ).toMatchObject({ fincaId: 23 });
    expect(toUpdateCampaniaProveedorInput({ ...producerDraft, fincaId: 23 })).toMatchObject({
      fincaId: 23,
    });
  });

  it("includes optional mtdCeratitis when supplied", () => {
    expect(
      toCreateCampaniaProveedorInput(4, { ...producerDraft, mtdCeratitis: "0.05" }),
    ).toMatchObject({ mtdCeratitis: 0.05 });
    expect(
      toUpdateCampaniaProveedorInput({ ...producerDraft, mtdCeratitis: "0.05" }),
    ).toMatchObject({ mtdCeratitis: 0.05 });
  });

  it("reports missing and negative quantity values", () => {
    const errors = getCampaniaProveedorDraftErrors({
      ...producerDraft,
      cantidadProveedor: "-1",
    });

    expect(errors).toMatchObject({
      cantidadProveedor: expect.any(String),
    });
    expect(errors.mtdCeratitis).toBeUndefined();
  });
});

