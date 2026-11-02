import type { DriverInput, VehicleInput } from "@/modules/carriers/api/carrier.api";

/** Valores del formulario de vehículo, como texto: así se distingue "vacío" de "0". */
export interface VehicleFormValues {
    placa: string;
    ancho: string;
    altura: string;
    profundidad: string;
    /** Dato propio del vehículo (no se calcula con las medidas): lo declara su ficha técnica */
    volumen: string;
    pesoNeto: string;
    pesoBruto: string;
}

export type VehicleField = keyof VehicleFormValues;

export const EMPTY_VEHICLE: VehicleFormValues = {
    placa: "", ancho: "", altura: "", profundidad: "", volumen: "", pesoNeto: "", pesoBruto: "",
};

export interface DriverFormValues {
    nombre: string;
    telefono: string;
    correo: string;
    tipoDocumento: string;
    numeroDocumento: string;
    numeroLicencia: string;
}

export type DriverField = keyof DriverFormValues;

export const EMPTY_DRIVER: DriverFormValues = {
    nombre: "",
    telefono: "",
    correo: "",
    tipoDocumento: "DNI",
    numeroDocumento: "",
    numeroLicencia: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MEASURES: { field: Exclude<VehicleField, "placa">; label: string }[] = [
    { field: "ancho", label: "el ancho" },
    { field: "altura", label: "la altura" },
    { field: "profundidad", label: "la profundidad" },
    { field: "volumen", label: "el volumen" },
    { field: "pesoNeto", label: "el peso neto" },
    { field: "pesoBruto", label: "el peso bruto" },
];

/**
 * Revisión previa del vehículo: todo es obligatorio y las medidas y pesos deben ser números mayores a cero.
 * El detalle fino (duplicados, límites) lo responde el backend, que se muestra bajo cada campo.
 */
export function validateVehicle(values: VehicleFormValues): Partial<Record<VehicleField, string>> {
    const errors: Partial<Record<VehicleField, string>> = {};
    if (!values.placa.trim()) errors.placa = "Ingresa la placa del vehículo.";
    for (const { field, label } of MEASURES) {
        const raw = values[field].trim();
        if (!raw) errors[field] = `Ingresa ${label}.`;
        else if (!(Number(raw) > 0)) errors[field] = "Debe ser un número mayor a cero.";
    }
    if (!errors.pesoNeto && !errors.pesoBruto && Number(values.pesoBruto) < Number(values.pesoNeto)) {
        errors.pesoBruto = "El peso bruto no puede ser menor al peso neto.";
    }
    return errors;
}

/** Revisión previa del chofer: nombre, tipo y número de documento, licencia, teléfono y correo son obligatorios. */
export function validateDriver(values: DriverFormValues): Partial<Record<DriverField, string>> {
    const errors: Partial<Record<DriverField, string>> = {};
    if (!values.nombre.trim()) errors.nombre = "Ingresa el nombre completo del chofer.";
    if (!values.tipoDocumento.trim()) errors.tipoDocumento = "Selecciona el tipo de documento.";
    if (!values.numeroDocumento.trim()) errors.numeroDocumento = "Ingresa el número de documento.";
    if (!values.numeroLicencia.trim()) errors.numeroLicencia = "Ingresa el número de licencia de conducir.";
    if (!values.telefono.trim()) errors.telefono = "Ingresa un teléfono de contacto.";
    if (!values.correo.trim()) errors.correo = "Ingresa el correo del chofer.";
    else if (!EMAIL_PATTERN.test(values.correo.trim())) errors.correo = "Ingresa un correo válido.";
    return errors;
}

export function toVehicleInput(values: VehicleFormValues): VehicleInput {
    return {
        placa: values.placa,
        ancho: Number(values.ancho),
        altura: Number(values.altura),
        profundidad: Number(values.profundidad),
        volumen: Number(values.volumen),
        pesoNeto: Number(values.pesoNeto),
        pesoBruto: Number(values.pesoBruto),
    };
}

export function toDriverInput(values: DriverFormValues): DriverInput {
    return {
        nombre: values.nombre.trim(),
        telefono: values.telefono.trim(),
        correo: values.correo.trim(),
        tipoDocumento: values.tipoDocumento.trim(),
        numeroDocumento: values.numeroDocumento.trim(),
        numeroLicencia: values.numeroLicencia.trim(),
    };
}

/** Propiedades del backend → campo del formulario, para ubicar los errores 400 bajo cada campo */
export const VEHICLE_BACKEND_FIELDS: Record<string, string> = {
    placa: "placa", ancho: "ancho", altura: "altura", profundidad: "profundidad", volumen: "volumen", pesoNeto: "pesoNeto", pesoBruto: "pesoBruto",
};
export const DRIVER_BACKEND_FIELDS: Record<string, string> = {
    nombre: "nombre",
    telefono: "telefono",
    correo: "correo",
    tipoDocumento: "tipoDocumento",
    numeroDocumento: "numeroDocumento",
    numeroLicencia: "numeroLicencia",
};
export const CARRIER_BACKEND_FIELDS: Record<string, string> = { nombreCompleto: "nombre", ruc: "ruc", correo: "correo", numero: "numero" };
