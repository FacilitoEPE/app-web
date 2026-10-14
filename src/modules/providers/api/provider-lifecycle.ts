import type { ProveedorDto, ProveedorFormValues } from "@/modules/providers/api/proveedor.dto";
import { toProveedorInput } from "@/modules/providers/api/proveedor.validation";

const EMPTY_PROVIDER: ProveedorFormValues = {
  nombres: "",
  apellido: "",
  tipoDocumento: "",
  nmrDocumento: "",
  identidadDocUrl: "",
  identidadDocArchivo: null,
  zona: "",
  telefono: "",
  email: "",
  codigoLugarProduccion: "",
  estadoSanidadAgraria: "",
  frutas: [],
};

export function createProviderFormSession(provider: ProveedorDto | null = null) {
  return {
    values: provider ? toProveedorInput(provider) : { ...EMPTY_PROVIDER },
    errors: {} as Partial<Record<keyof ProveedorFormValues, string>>,
    saveError: null as string | null,
  };
}

