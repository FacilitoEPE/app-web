/**
 * Informe de entrevista a un productor de la campaña.
 *
 * TODO(api): el backend todavía no tiene un servicio de entrevistas. Mientras tanto la página guarda
 * los informes en memoria (se pierden al recargar) para que el flujo completo se pueda recorrer y
 * validar el diseño. Cuando exista el servicio basta con reemplazar el guardado local por la llamada.
 */
export interface InterviewValues {
    fincaNombre?: string;
    densidadPlantacion: string;
    distanciamiento: string;
    frecuenciaRiego: string;
    haTotalFinca: string;
    haCultivo: string;
    nombreAplicacion: string;
    aplicacionesAlAno: string;
    departamento: string;
    provincia: string;
    distrito: string;
    latitud: string;
    longitud: string;
    /** Campos técnicos opcionales de evaluación de campo */
    estimacionCosechaKg?: string;
    estadoFitosanitario?: string;
    accesoVial?: string;
    evidenciaNombre?: string;
}

export type InterviewField = keyof InterviewValues;
export type InterviewErrors = Partial<Record<InterviewField, string>>;

export const EMPTY_INTERVIEW: InterviewValues = {
    densidadPlantacion: "",
    distanciamiento: "",
    frecuenciaRiego: "",
    haTotalFinca: "",
    haCultivo: "",
    nombreAplicacion: "",
    aplicacionesAlAno: "",
    departamento: "",
    provincia: "",
    distrito: "",
    latitud: "",
    longitud: "",
};

/** Datos agronómicos propios de una finca en una campaña, no del proveedor en general. */
export type InterviewAgronomicField = "densidadPlantacion" | "distanciamiento" | "frecuenciaRiego" | "nombreAplicacion" | "aplicacionesAlAno";
export type InterviewAgronomicValues = Pick<InterviewValues, InterviewAgronomicField>;
export type InterviewAgronomicErrors = Partial<Record<InterviewAgronomicField, string>>;

export const EMPTY_INTERVIEW_AGRONOMICS: InterviewAgronomicValues = {
    densidadPlantacion: "",
    distanciamiento: "",
    frecuenciaRiego: "",
    nombreAplicacion: "",
    aplicacionesAlAno: "",
};

export function validateInterviewAgronomics(values: InterviewAgronomicValues): InterviewAgronomicErrors {
    const errors: InterviewAgronomicErrors = {};
    if (!isNonNegative(values.densidadPlantacion) || Number(values.densidadPlantacion) === 0) errors.densidadPlantacion = "Ingresa un número mayor a 0.";
    if (!isNonNegative(values.distanciamiento) || Number(values.distanciamiento) === 0) errors.distanciamiento = "Ingresa un número mayor a 0.";
    if (!isNonNegativeInteger(values.frecuenciaRiego)) errors.frecuenciaRiego = "Ingresa un entero desde 0.";
    if (isBlank(values.nombreAplicacion)) errors.nombreAplicacion = "Ingresa el nombre de la aplicación.";
    if (!isNonNegativeInteger(values.aplicacionesAlAno)) errors.aplicacionesAlAno = "Ingresa un entero desde 0.";
    return errors;
}

const isBlank = (value: string) => value.trim() === "";
const isNonNegative = (value: string) => !isBlank(value) && Number.isFinite(Number(value)) && Number(value) >= 0;
const isNonNegativeInteger = (value: string) => isNonNegative(value) && Number.isInteger(Number(value));
