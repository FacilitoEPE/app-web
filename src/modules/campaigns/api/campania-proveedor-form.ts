import { usesV1 } from '@/shared/api/data-contract';
import type {
  CreateCampaniaProveedorDto,
  TipoProveedorCampania,
} from "@/modules/campaigns/api/campania-proveedor.dto";

export interface CampaniaProveedorDraft {
  precioEstimado?: string;
  moneda?: string;
  observacionesParticipacion?: string;
  proveedorId: number;
  tipoProveedor: TipoProveedorCampania;
  cantidadProveedor: string;
  mtdCeratitis?: string;
  fincaId?: number | null;
  frutaConvencionalEstimado?: string | number | null;
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

  if (quantity === null) {
    errors.cantidadProveedor = "La cantidad debe ser un número no negativo con hasta 3 decimales.";
  }

  return errors;
}

function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function toCreateCampaniaProveedorInput(
  campaniaId: number,
  draft: CampaniaProveedorDraft,
): CreateCampaniaProveedorDto {
  return {
    campaniaId,
    proveedorId: draft.proveedorId,
    ...(draft.fincaId == null ? {} : { fincaId: draft.fincaId }),
    tipoProveedor: draft.tipoProveedor,
    cantidadProveedor: Number(draft.cantidadProveedor),
    ...(usesV1() ? {precioCompraKg:draft.precioEstimado?.trim()?Number(draft.precioEstimado):null,moneda:draft.moneda??"PEN",observaciones:draft.observacionesParticipacion??null}:{}),
    ...(draft.mtdCeratitis != null && draft.mtdCeratitis !== ""
      ? { mtdCeratitis: Number(draft.mtdCeratitis) }
      : {}),
    frutaConvencionalEstimado: parseOptionalNumber(draft.frutaConvencionalEstimado),
  };
}

export function toUpdateCampaniaProveedorInput(
  draft: CampaniaProveedorDraft,
): import("@/modules/campaigns/api/campania-proveedor.dto").UpdateCampaniaProveedorDto {
  return {
    tipoProveedor: draft.tipoProveedor,
    ...(draft.fincaId == null ? {} : { fincaId: draft.fincaId }),
    cantidadProveedor: Number(draft.cantidadProveedor),
    ...(usesV1() ? {precioCompraKg:draft.precioEstimado?.trim()?Number(draft.precioEstimado):null,moneda:draft.moneda??"PEN",observaciones:draft.observacionesParticipacion??null}:{}),
    ...(draft.mtdCeratitis != null && draft.mtdCeratitis !== ""
      ? { mtdCeratitis: Number(draft.mtdCeratitis) }
      : {}),
    frutaConvencionalEstimado: parseOptionalNumber(draft.frutaConvencionalEstimado),
  };
}
