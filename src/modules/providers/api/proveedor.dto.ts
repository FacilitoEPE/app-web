export interface ProveedorDto {
  proveedorId: number;
  nombres: string;
  apellido: string;
  tipoDocumento: string;
  nmrDocumento: number | string;
  identidadDocUrl: string;
  zona: string;
  telefono: number | string;
  email: string;
  codigoLugarProduccion: number | string;
  estadoSanidadAgraria?: string;
  identidadDocArchivo?: File | null;
  frutas?: { frutaId: string; variedades: string[] }[];
}

export type TipoDocumentoProveedor = "DNI" | "Pasaporte" | "Carnet de extranjeria";

export interface ProveedorInput {
  nombres: string;
  apellido: string;
  tipoDocumento: TipoDocumentoProveedor;
  nmrDocumento: number | string;
  identidadDocUrl: string;
  zona: string;
  telefono: number | string;
  email: string;
  codigoLugarProduccion: number | string;
  estadoSanidadAgraria: string;
  identidadDocArchivo: File | null;
  frutas: { frutaId: string; variedades: string[] }[];
}

export type ProveedorFormValues = Omit<ProveedorInput, "tipoDocumento" | "nmrDocumento" | "telefono" | "codigoLugarProduccion"> & {
  tipoDocumento: TipoDocumentoProveedor | "";
  nmrDocumento: string;
  telefono: string;
  codigoLugarProduccion: string;
  estadoSanidadAgraria: string;
  identidadDocArchivo: File | null;
  frutas: { frutaId: string; variedades: string[] }[];
};
