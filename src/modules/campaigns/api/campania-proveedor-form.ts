import type {
  CreateCampaniaProveedorDto,
  TipoProveedorCampania,
} from "@/modules/campaigns/api/campania-proveedor.dto";

export interface CampaniaProveedorDraft {
  proveedorId: number;
  tipoProveedor: TipoProveedorCampania;
  cantidadProveedor: string;
  mtdCeratitis: string;
  frutaConvencionalEstimado?: string | number | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  latitud?: string | number | null;
  longitud?: string | number | null;
  densidadPlantacion?: string | number | null;
  distanciamiento?: string | number | null;
  frecuenciaRiego?: string | number | null;
  haTotalFinca?: string | number | null;
  haCultivo?: string | number | null;
  nombreAplicacion?: string | null;
  aplicacionesAlAno?: string | number | null;
}

export type CampaniaProveedorDraftErrors = Partial<
  Record<keyof CampaniaProveedorDraft, string>
>;

function parseNonNegative(value: string, decimalPlaces: number): number | null {
  const trimmed = value.trim();
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return null;
  const fraction = trimmed.split(".")[1] ?? "";
  if (fraction.length > decimalPlaces) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getCampaniaProveedorDraftErrors(
  draft: CampaniaProveedorDraft,
): CampaniaProveedorDraftErrors {
  const errors: CampaniaProveedorDraftErrors = {};
  const quantity = parseNonNegative(draft.cantidadProveedor, 3);
  const mtd = parseNonNegative(draft.mtdCeratitis, 3);

  if (quantity === null) {
    errors.cantidadProveedor = "La cantidad debe ser un número no negativo con hasta 3 decimales.";
  }
  if (mtd === null) {
    errors.mtdCeratitis = "El MTD debe ser un número no negativo con hasta 3 decimales.";
  } else if (mtd > 0.05) {
    errors.mtdCeratitis = "El MTD Ceratitis no puede superar el valor de 0.05.";
  }

  return errors;
}

function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

export function toCreateCampaniaProveedorInput(
  campaniaId: number,
  draft: CampaniaProveedorDraft,
): CreateCampaniaProveedorDto {
  return {
    campaniaId,
    proveedorId: draft.proveedorId,
    tipoProveedor: draft.tipoProveedor,
    cantidadProveedor: Number(draft.cantidadProveedor),
    mtdCeratitis: Number(draft.mtdCeratitis),
    frutaConvencionalEstimado: parseOptionalNumber(draft.frutaConvencionalEstimado),
    departamento: parseOptionalString(draft.departamento),
    provincia: parseOptionalString(draft.provincia),
    distrito: parseOptionalString(draft.distrito),
    latitud: parseOptionalNumber(draft.latitud),
    longitud: parseOptionalNumber(draft.longitud),
    densidadPlantacion: parseOptionalNumber(draft.densidadPlantacion),
    distanciamiento: parseOptionalNumber(draft.distanciamiento),
    frecuenciaRiego: parseOptionalNumber(draft.frecuenciaRiego),
    haTotalFinca: parseOptionalNumber(draft.haTotalFinca),
    haCultivo: parseOptionalNumber(draft.haCultivo),
    nombreAplicacion: parseOptionalString(draft.nombreAplicacion),
    aplicacionesAlAno: parseOptionalNumber(draft.aplicacionesAlAno),
  };
}

export function toUpdateCampaniaProveedorInput(
  draft: CampaniaProveedorDraft,
): import("@/modules/campaigns/api/campania-proveedor.dto").UpdateCampaniaProveedorDto {
  return {
    tipoProveedor: draft.tipoProveedor,
    cantidadProveedor: Number(draft.cantidadProveedor),
    mtdCeratitis: Number(draft.mtdCeratitis),
    frutaConvencionalEstimado: parseOptionalNumber(draft.frutaConvencionalEstimado),
    departamento: parseOptionalString(draft.departamento),
    provincia: parseOptionalString(draft.provincia),
    distrito: parseOptionalString(draft.distrito),
    latitud: parseOptionalNumber(draft.latitud),
    longitud: parseOptionalNumber(draft.longitud),
    densidadPlantacion: parseOptionalNumber(draft.densidadPlantacion),
    distanciamiento: parseOptionalNumber(draft.distanciamiento),
    frecuenciaRiego: parseOptionalNumber(draft.frecuenciaRiego),
    haTotalFinca: parseOptionalNumber(draft.haTotalFinca),
    haCultivo: parseOptionalNumber(draft.haCultivo),
    nombreAplicacion: parseOptionalString(draft.nombreAplicacion),
    aplicacionesAlAno: parseOptionalNumber(draft.aplicacionesAlAno),
  };
}
