import type { ProveedorDto } from "@/modules/providers/api/proveedor.dto";

export type TipoProveedorCampania = "acopio" | "productor";

export interface CampaniaProveedorDto {
  precioCompraKg?: number | null;
  moneda?: string;
  observaciones?: string | null;
  cxpId: number;
  campaniaId: number;
  proveedor?: ProveedorDto;
  proveedorId: number;
  fincaId?: number | null;
  cantidadProveedor: number;
  mtdCeratitis?: number | null;
  frutaConvencionalEstimado: number | null;
  tipoProveedor: TipoProveedorCampania;
}

export interface CreateCampaniaProveedorDto {
  precioCompraKg?: number | null;
  moneda?: string;
  observaciones?: string | null;
  campaniaId: number;
  proveedorId: number;
  fincaId?: number | null;
  cantidadProveedor: number;
  mtdCeratitis?: number;
  frutaConvencionalEstimado?: number | null;
  tipoProveedor: TipoProveedorCampania;
}

export type UpdateCampaniaProveedorDto = Partial<
  Omit<CreateCampaniaProveedorDto, "campaniaId" | "proveedorId">
>;
