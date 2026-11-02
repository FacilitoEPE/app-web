import type { FileSource } from "@/shared/utils/fileSource";

/**
 * Examen de laboratorio registrado desde la lista de proveedores de la campaña.
 *
 * Un examen avanza por tres etapas: la muestra espera su envío, viaja al laboratorio y, cuando el laboratorio
 * responde, queda "con resultado". Cada etapa habilita sus propios datos (fecha de envío, resultado), así que el
 * formulario solo pide lo que ya corresponde y se vuelve a abrir en "editar" para avanzar de etapa.
 */
export type ExamResult = "positivo" | "negativo";
export type ExamEstado = "pendiente" | "enviado" | "resultado";

export const EXAM_ESTADOS: { value: ExamEstado; label: string }[] = [
    { value: "pendiente", label: "Pendiente de envío" },
    { value: "enviado", label: "Enviado al laboratorio" },
    { value: "resultado", label: "Con resultado" },
];

export const EXAM_RESULTS: { value: ExamResult; label: string }[] = [
    { value: "positivo", label: "Positivo" },
    { value: "negativo", label: "Negativo" },
];

export const EXAM_TYPES = [
    { value: "cadmio", label: "CADMIO" },
    { value: "plaguicidas", label: "Residuos de Plaguicidas" },
    { value: "microbiologico", label: "Microbiológico" },
    { value: "metales", label: "Metales Pesados" },
    { value: "nutricional", label: "Análisis Nutricional" },
    { value: "trazabilidad", label: "Trazabilidad de Campo" },
];

export interface ExamValues {
    tipoExamen: string;
    /** Fecha del examen (yyyy-mm-dd) */
    fecha: string;
    identificacionMuestra: string;
    estado: ExamEstado;
    /** Solo desde la etapa "enviado" */
    fechaEnvioMuestra: string;
    /** Solo en la etapa "con resultado" */
    resultado: ExamResult | "";
    observacion: string;
    /** Archivo recién adjuntado, o el documento que ya tenía el examen */
    archivo: FileSource | null;
}

/** Examen ya registrado: lo mismo que el formulario, más su identidad */
export interface LocalExam extends ExamValues {
    id: string;
    proveedorId: number;
}

export type ExamField = "tipoExamen" | "fecha" | "identificacionMuestra" | "estado" | "fechaEnvioMuestra" | "resultado" | "archivo";
export type ExamErrors = Partial<Record<ExamField, string>>;

export const EMPTY_EXAM: ExamValues = {
    tipoExamen: "",
    fecha: "",
    identificacionMuestra: "",
    estado: "pendiente",
    fechaEnvioMuestra: "",
    resultado: "",
    observacion: "",
    archivo: null,
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const examEstadoLabel = (estado: ExamEstado) => EXAM_ESTADOS.find((item) => item.value === estado)?.label ?? estado;
export const examResultLabel = (resultado: ExamResult) => EXAM_RESULTS.find((item) => item.value === resultado)?.label ?? resultado;

/** Qué datos aplican a la etapa actual del examen */
export const examNeedsShipDate = (estado: ExamEstado) => estado !== "pendiente";
export const examNeedsResult = (estado: ExamEstado) => estado === "resultado";

/**
 * Obligatorios: tipo, fecha, identificación y etapa. La fecha de envío desde que la muestra viaja; el resultado y
 * el documento del laboratorio cuando el examen ya tiene resultado.
 */
export function validateExam(values: ExamValues): ExamErrors {
    const errors: ExamErrors = {};
    if (!values.tipoExamen) errors.tipoExamen = "Selecciona el tipo de examen.";
    if (!DATE_PATTERN.test(values.fecha)) errors.fecha = "Ingresa la fecha del examen.";
    if (!values.identificacionMuestra.trim()) errors.identificacionMuestra = "Ingresa la identificación de la muestra.";

    if (examNeedsShipDate(values.estado)) {
        if (!DATE_PATTERN.test(values.fechaEnvioMuestra)) errors.fechaEnvioMuestra = "Ingresa la fecha de envío de la muestra.";
        else if (DATE_PATTERN.test(values.fecha) && values.fechaEnvioMuestra < values.fecha) {
            errors.fechaEnvioMuestra = "El envío no puede ser anterior a la fecha del examen.";
        }
    }
    if (examNeedsResult(values.estado)) {
        if (values.resultado !== "positivo" && values.resultado !== "negativo") errors.resultado = "Selecciona el resultado del examen.";
        if (!values.archivo) errors.archivo = "Adjunta el documento del laboratorio.";
    }
    return errors;
}

/**
 * Deja solo los datos que corresponden a la etapa: si se vuelve a "pendiente" no queda una fecha de envío ni un
 * resultado huérfanos. El formulario conserva lo escrito mientras se alterna entre etapas; esto se aplica al guardar.
 */
export function normalizeExam(values: ExamValues): ExamValues {
    return {
        ...values,
        identificacionMuestra: values.identificacionMuestra.trim(),
        observacion: values.observacion.trim(),
        fechaEnvioMuestra: examNeedsShipDate(values.estado) ? values.fechaEnvioMuestra : "",
        resultado: examNeedsResult(values.estado) ? values.resultado : "",
    };
}
