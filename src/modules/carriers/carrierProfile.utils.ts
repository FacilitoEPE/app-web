import { usesV1 } from '@/shared/api/data-contract';
import type { Carrier } from "@/modules/carriers/carriers.data";
import type { CarrierInput } from "@/modules/carriers/api/carrier.api";

/** Público: empresa con vehículos y choferes propios. Privado: persona independiente a título propio. */
export type CarrierTipo = "publico" | "privado";

/**
 * Datos del transportista que todavía no existen en el contrato del backend: su tipo, sus registros
 * (MTC, CGN), el documento de identidad del independiente y su ubicación. Viven en `carrierExtras.store.ts`.
 */
export interface CarrierExtras {
    tipo: CarrierTipo;
    mtc: string;
    /** Solo del independiente (privado) */
    cgn: string;
    /** Documento de identidad: solo del independiente (privado) */
    documento: string;
    departamento: string;
    provincia: string;
    ciudad: string;
}

/** Valores del formulario: lo que ya guarda la API (`CarrierInput`) más los datos nuevos. */
export interface CarrierFormValues extends CarrierExtras {
    nombre: string;
    numero: string;
    correo: string;
    ruc: string;
}

export type CarrierField = Exclude<keyof CarrierFormValues, "tipo">;
export type CarrierErrors = Partial<Record<CarrierField, string>>;

/** Un transportista tal como lo muestran la tabla y el detalle: lo que devuelve la API más sus datos nuevos. */
export type CarrierProfile = Carrier & CarrierExtras;

export const EMPTY_CARRIER_EXTRAS: CarrierExtras = {
    // Las empresas que ya existen en el backend son transportistas con flota propia
    tipo: "publico",
    mtc: "",
    cgn: "",
    documento: "",
    departamento: "",
    provincia: "",
    ciudad: "",
};

export const EMPTY_CARRIER: CarrierFormValues = {
    ...EMPTY_CARRIER_EXTRAS,
    nombre: "",
    numero: "",
    correo: "",
    ruc: "",
};

export interface CarrierTipoMeta {
    /** Texto del selector: "Público · Transportista" */
    label: string;
    /** Palabra corta para la tabla y los badges */
    short: string;
    /** Cómo se llama el campo del nombre en este tipo */
    nameLabel: string;
    description: string;
}

export const CARRIER_TIPOS: Record<CarrierTipo, CarrierTipoMeta> = {
    publico: {
        label: "Público · Transportista",
        short: "Público",
        nameLabel: "Nombre de la empresa",
        description: "Transportista con sus propios vehículos y choferes.",
    },
    privado: {
        label: "Privado · Independiente",
        short: "Privado",
        nameLabel: "Nombre completo",
        description: "Persona independiente. Sus vehículos y choferes se registran a su nombre, sin vincularlos a una empresa.",
    },
};

export const CARRIER_TIPO_OPTIONS = (Object.keys(CARRIER_TIPOS) as CarrierTipo[]).map((tipo) => ({ value: tipo, label: CARRIER_TIPOS[tipo].label }));

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RUC_PATTERN = /^\d{11}$/;

/**
 * Qué se exige según el tipo: el público identifica a la empresa por su RUC; el independiente, por su
 * documento de identidad y su CGN, y su RUC es opcional (pero si lo escribe, debe ser válido).
 */
export function validateCarrier(values: CarrierFormValues): CarrierErrors {
    const errors: CarrierErrors = {};
    const isPrivado = values.tipo === "privado";
    const require = (field: CarrierField, message: string) => {
        if (!values[field].trim()) errors[field] = message;
    };

    require("nombre", isPrivado ? "Ingresa el nombre completo." : "Ingresa el nombre de la empresa.");
    require("mtc", "Ingresa el número de registro MTC.");
    require("numero", "Ingresa un teléfono de contacto.");
    require("correo", "Ingresa el correo de contacto.");
    require("departamento", "Ingresa el departamento.");
    require("provincia", "Ingresa la provincia.");
    require("ciudad", "Ingresa la ciudad.");
    if (isPrivado) {
        require("documento", "Ingresa el documento de identidad.");
        if (!usesV1()) require("cgn", "Ingresa el número de CGN.");
    }

    const ruc = values.ruc.trim();
    if (!ruc && !isPrivado) errors.ruc = "Ingresa el RUC.";
    else if (ruc && !RUC_PATTERN.test(ruc)) errors.ruc = "El RUC debe tener 11 dígitos.";

    if (!errors.correo && !EMAIL_PATTERN.test(values.correo.trim())) errors.correo = "Ingresa un correo válido.";

    return errors;
}

/**
 * Separa lo que ya guarda la API de lo que se guarda aparte. Los campos propios de otro tipo se vacían: un
 * transportista público no conserva el CGN ni el documento que quedaron escritos antes de cambiar de tipo.
 */
export function splitCarrierValues(values: CarrierFormValues): { input: CarrierInput; extras: CarrierExtras } {
    const isPrivado = values.tipo === "privado";
    return {
        input: {
            nombre: values.nombre.trim(),
            numero: values.numero.trim(),
            correo: values.correo.trim(),
            ruc: values.ruc.trim(),
        },
        extras: {
            tipo: values.tipo,
            mtc: values.mtc.trim(),
            cgn: isPrivado ? values.cgn.trim() : "",
            documento: isPrivado ? values.documento.trim() : "",
            departamento: values.departamento.trim(),
            provincia: values.provincia.trim(),
            ciudad: values.ciudad.trim(),
        },
    };
}

/** Une al transportista de la API con sus datos nuevos; sin ellos, usa los valores por defecto. */
export function toCarrierProfile(carrier: Carrier, extras: CarrierExtras | undefined): CarrierProfile {
    return { ...carrier, ...EMPTY_CARRIER_EXTRAS, ...extras };
}

/** Documento que identifica al transportista: el RUC de la empresa o el documento de identidad del independiente */
export function carrierIdentification(carrier: Pick<CarrierProfile, "tipo" | "documento" | "ruc">): string {
    if (carrier.tipo === "privado") return carrier.documento ? `Documento ${carrier.documento}` : carrier.ruc ? `RUC ${carrier.ruc}` : "Sin documento";
    return carrier.ruc ? `RUC ${carrier.ruc}` : "Sin RUC";
}

/** Ubicación en una línea: "Ciudad, Provincia, Departamento"; vacía si no se registró. */
export function carrierLocation(carrier: Pick<CarrierExtras, "ciudad" | "provincia" | "departamento">): string {
    return [carrier.ciudad, carrier.provincia, carrier.departamento].filter(Boolean).join(", ");
}
