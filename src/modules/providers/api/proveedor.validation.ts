import { usesV1 } from '@/shared/api/data-contract';
import type { ProveedorDto, ProveedorFormValues, ProveedorInput } from "@/modules/providers/api/proveedor.dto";

export type ProveedorField = keyof ProveedorFormValues;
export type ProveedorFieldErrors = Partial<Record<ProveedorField, string>>;

export function toProveedorInput(provider: ProveedorDto): ProveedorFormValues {
  return {
    nombres: provider.nombres,
    apellido: provider.apellido,
    tipoDocumento: provider.tipoDocumento as ProveedorFormValues["tipoDocumento"],
    nmrDocumento: String(provider.nmrDocumento),
    identidadDocUrl: provider.identidadDocUrl,
    zona: provider.zona,
    telefono: String(provider.telefono),
    email: provider.email,
    codigoLugarProduccion: String(provider.codigoLugarProduccion),
    estadoSanidadAgraria: "",
    identidadDocArchivo: null,
    frutas: [],
  };
}

export function toProveedorPayload(values: ProveedorFormValues): ProveedorInput {
  return {
    nombres: values.nombres.trim(),
    apellido: values.apellido.trim(),
    tipoDocumento: values.tipoDocumento as ProveedorInput["tipoDocumento"],
    nmrDocumento: usesV1() ? values.nmrDocumento.trim() : Number(values.nmrDocumento.trim()),
    identidadDocUrl: values.identidadDocUrl.trim(),
    zona: values.zona.trim(),
    telefono: usesV1() ? values.telefono.trim() : Number(values.telefono.trim()),
    email: values.email.trim(),
    codigoLugarProduccion: usesV1() ? values.codigoLugarProduccion.trim() : Number(values.codigoLugarProduccion.trim()),
    estadoSanidadAgraria: values.estadoSanidadAgraria.trim(),
    identidadDocArchivo: values.identidadDocArchivo,
    frutas: values.frutas,
  };
}

export function validateProveedorInput(values: ProveedorFormValues): ProveedorFieldErrors {
  const errors: ProveedorFieldErrors = {};
  if (usesV1()) {
    for (const field of ['nombres','apellido','tipoDocumento','nmrDocumento','zona','telefono'] as const) if (!values[field].trim()) errors[field]='Este campo es obligatorio.';
    if (values.nmrDocumento.length>30) errors.nmrDocumento='Usa hasta 30 caracteres.';
    if (values.telefono.length>30) errors.telefono='Usa hasta 30 caracteres.';
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email='Ingresa un correo válido.';
    return errors;
  }
  const required: ProveedorField[] = [
    "nombres", "apellido", "tipoDocumento", "nmrDocumento", "zona", "telefono", "email", "codigoLugarProduccion", "estadoSanidadAgraria"
  ];
  for (const field of required) {
    if (!String(values[field] ?? "").trim()) errors[field] = "Este campo es obligatorio.";
  }

  if (!errors.nombres && values.nombres.trim().length > 150) errors.nombres = "Usa hasta 150 caracteres.";
  if (!errors.apellido && values.apellido.trim().length > 150) errors.apellido = "Usa hasta 150 caracteres.";
  if (!errors.tipoDocumento && !["DNI", "Pasaporte", "Carnet de extranjeria"].includes(values.tipoDocumento)) {
    errors.tipoDocumento = "Selecciona un tipo de documento válido.";
  }
  for (const field of ["nmrDocumento", "telefono", "codigoLugarProduccion"] as const) {
    const value = Number(values[field].trim());
    if (!errors[field] && (!/^[1-9]\d*$/.test(values[field].trim()) || !Number.isSafeInteger(value) || value > 2147483647)) {
      errors[field] = "Ingresa un número entero válido mayor que cero.";
    }
  }
  if (values.identidadDocUrl) {
    try {
      const url = new URL(values.identidadDocUrl.trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Unsupported URL protocol");
    } catch {
      errors.identidadDocUrl = "Ingresa una URL válida que comience con http:// o https://.";
    }
  } else if (!values.identidadDocArchivo) {
    errors.identidadDocArchivo = "Debes adjuntar un documento de identidad.";
  }
  if (!errors.zona && !values.zona.trim()) errors.zona = "Este campo es obligatorio.";
  if (!errors.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) || values.email.trim().length > 320)) {
    errors.email = "Ingresa un correo electrónico válido de hasta 320 caracteres.";
  }
  return errors;
}
