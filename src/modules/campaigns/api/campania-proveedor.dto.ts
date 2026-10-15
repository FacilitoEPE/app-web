import type { ProveedorDto } from "@/modules/providers/api/proveedor.dto";

export type TipoProveedorCampania = "acopio" | "productor";

export interface CampaniaProveedorDto {
  cxpId: number;
  campaniaId: number;
  proveedor?: ProveedorDto;
  proveedorId: number;
  cantidadProveedor: number;
  mtdCeratitis: number;
  frutaConvencionalEstimado: number | null;
  tipoProveedor: TipoProveedorCampania;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  densidadPlantacion?: number | null;
  distanciamiento?: number | null;
  frecuenciaRiego?: number | null;
  haTotalFinca?: number | null;
  haCultivo?: number | null;
  nombreAplicacion?: string | null;
  aplicacionesAlAno?: number | null;
}

export interface CreateCampaniaProveedorDto {
  campaniaId: number;
  proveedorId: number;
  cantidadProveedor: number;
  mtdCeratitis: number;
  frutaConvencionalEstimado?: number | null;
  tipoProveedor: TipoProveedorCampania;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  densidadPlantacion?: number | null;
  distanciamiento?: number | null;
  frecuenciaRiego?: number | null;
  haTotalFinca?: number | null;
  haCultivo?: number | null;
  nombreAplicacion?: string | null;
  aplicacionesAlAno?: number | null;
}

export type UpdateCampaniaProveedorDto = Partial<
  Omit<CreateCampaniaProveedorDto, "campaniaId" | "proveedorId">
>;
