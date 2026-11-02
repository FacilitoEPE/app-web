/**
 * Certificaciones de una campaña: modelo local, validaciones y cálculos de la vista de gestión.
 */

export const CERTIFICATION_TYPES = ["Global GAP", "Orgánico USDA", "Orgánico UE", "Fairtrade", "Rainforest Alliance"];

export const TRAMITE_OPTIONS = [
    { value: "pendiente", label: "Pendiente" },
    { value: "en tramite", label: "En trámite" },
    { value: "observado", label: "Observado" },
    { value: "certificado", label: "Certificado" },
];

export const MONEDA_OPTIONS = [
    { value: "USD", label: "USD · Dólar", symbol: "$" },
    { value: "PEN", label: "PEN · Sol", symbol: "S/" },
];

export const getTramiteLabel = (value: string) => TRAMITE_OPTIONS.find((option) => option.value === value)?.label ?? value;

// ---------------------------------------------------------------------------------------------
// Registro y edición
// ---------------------------------------------------------------------------------------------

import type { FileSource } from '@/shared/utils/fileSource';

export interface CertificadoCampanaFormValues {
    tipo: string;
    nombre: string;
    organismoEmisor: string;
    validoDesde: string;
    validoHasta: string;
    estadoTramite: string;
    moneda: string;
    costo: string;
    kilosIniciales: string;
    /** Ids (cxpId) de los proveedores de la campaña que cubre la certificación */
    productores: string[];
    observaciones: string;
}

export type CertificadoCampanaField = keyof CertificadoCampanaFormValues;
export type CertificadoCampanaErrors = Partial<Record<CertificadoCampanaField, string>>;

export const EMPTY_CERTIFICADO_CAMPANA: CertificadoCampanaFormValues = {
    tipo: "",
    nombre: "",
    organismoEmisor: "",
    validoDesde: "",
    validoHasta: "",
    estadoTramite: "pendiente",
    moneda: "USD",
    costo: "",
    kilosIniciales: "",
    productores: [],
    observaciones: "",
};

const REQUIRED_MESSAGE = "Este campo es obligatorio.";

/** Acepta un número no negativo con hasta `decimals` decimales; null si no lo es */
export function parseNonNegative(value: string, decimals: number): number | null {
    const text = value.trim();
    if (!new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`).test(text)) return null;
    return Number(text);
}

export function validateCertificadoCampana(values: CertificadoCampanaFormValues): CertificadoCampanaErrors {
    const errors: CertificadoCampanaErrors = {};

    if (!values.tipo) errors.tipo = REQUIRED_MESSAGE;

    const nombre = values.nombre.trim();
    if (!nombre) errors.nombre = REQUIRED_MESSAGE;
    else if (nombre.length > 255) errors.nombre = "Usa hasta 255 caracteres.";

    const organismo = values.organismoEmisor.trim();
    if (!organismo) errors.organismoEmisor = REQUIRED_MESSAGE;
    else if (organismo.length > 255) errors.organismoEmisor = "Usa hasta 255 caracteres.";

    if (!values.estadoTramite) errors.estadoTramite = REQUIRED_MESSAGE;
    if (!values.moneda) errors.moneda = REQUIRED_MESSAGE;

    if (!values.costo.trim()) errors.costo = REQUIRED_MESSAGE;
    else if (parseNonNegative(values.costo, 2) === null) errors.costo = "Ingresa un monto no negativo con hasta 2 decimales.";

    if (values.kilosIniciales.trim() && parseNonNegative(values.kilosIniciales, 3) === null) {
        errors.kilosIniciales = "Ingresa una cantidad no negativa con hasta 3 decimales.";
    }

    // El periodo va en orden (yyyy-MM-dd compara como texto)
    if (values.validoDesde && values.validoHasta && values.validoHasta < values.validoDesde) {
        errors.validoHasta = "No puede ser anterior a la fecha de inicio.";
    }

    return errors;
}

// ---------------------------------------------------------------------------------------------
// Modelo local, ampliaciones y pagos
// ---------------------------------------------------------------------------------------------

export interface ProductorCubierto {
    id: string;
    nombre: string;
    kilos?: number;
}

export interface AmpliacionCertificado {
    id: number;
    kilos: number;
    /** yyyy-MM-dd */
    fecha: string;
    referencia: string;
}

export interface PagoCertificado {
    id: number;
    monto: number;
    /** yyyy-MM-dd */
    fecha: string;
    referencia: string;
    evidencia: FileSource | null;
}

export interface CertificadoCampanaLocal {
    id: number;
    tipo: string;
    nombre: string;
    organismoEmisor: string;
    validoDesde: string;
    validoHasta: string;
    estadoTramite: string;
    moneda: string;
    costo: number;
    kilosIniciales: number;
    productores: ProductorCubierto[];
    observaciones: string;
    documento: FileSource | null;
    cotizacion: FileSource | null;
    ampliaciones: AmpliacionCertificado[];
    pagos: PagoCertificado[];
}

export const getMonedaSymbol = (moneda: string) => MONEDA_OPTIONS.find((option) => option.value === moneda)?.symbol ?? moneda;

export const getKilosAmpliados = (certificado: Pick<CertificadoCampanaLocal, "ampliaciones">) =>
    certificado.ampliaciones.reduce((sum, item) => sum + item.kilos, 0);

/** Kilos que cubre hoy la certificación: los iniciales más todas sus ampliaciones */
export const getKilosTotales = (certificado: Pick<CertificadoCampanaLocal, "kilosIniciales" | "ampliaciones">) =>
    certificado.kilosIniciales + getKilosAmpliados(certificado);

export const getTotalPagado = (certificado: Pick<CertificadoCampanaLocal, "pagos">) =>
    certificado.pagos.reduce((sum, item) => sum + item.monto, 0);

/** Saldo por pagar; nunca negativo aunque se haya pagado de más por corrección del costo */
export const getSaldoPendiente = (certificado: Pick<CertificadoCampanaLocal, "costo" | "pagos">) =>
    Math.max(0, Math.round((certificado.costo - getTotalPagado(certificado)) * 100) / 100);

export type EstadoPago = "Sin costo" | "Pendiente" | "Parcial" | "Pagado";

export function getEstadoPago(certificado: Pick<CertificadoCampanaLocal, "costo" | "pagos">): EstadoPago {
    if (certificado.costo <= 0) return "Sin costo";
    if (getTotalPagado(certificado) <= 0) return "Pendiente";
    return getSaldoPendiente(certificado) > 0 ? "Parcial" : "Pagado";
}

export interface AmpliacionFormValues {
    kilos: string;
    fecha: string;
    referencia: string;
}

export const EMPTY_AMPLIACION: AmpliacionFormValues = { kilos: "", fecha: "", referencia: "" };
export type AmpliacionErrors = Partial<Record<keyof AmpliacionFormValues, string>>;

export function validateAmpliacion(values: AmpliacionFormValues): AmpliacionErrors {
    const errors: AmpliacionErrors = {};
    const kilos = parseNonNegative(values.kilos, 3);
    if (!values.kilos.trim()) errors.kilos = REQUIRED_MESSAGE;
    else if (kilos === null || kilos <= 0) errors.kilos = "Ingresa una cantidad mayor a 0 con hasta 3 decimales.";
    if (!values.fecha) errors.fecha = REQUIRED_MESSAGE;
    if (values.referencia.trim().length > 255) errors.referencia = "Usa hasta 255 caracteres.";
    return errors;
}

export interface PagoFormValues {
    monto: string;
    fecha: string;
    referencia: string;
}

export const EMPTY_PAGO: PagoFormValues = { monto: "", fecha: "", referencia: "" };
export type PagoErrors = Partial<Record<keyof PagoFormValues, string>>;

/** `saldoPendiente` es lo que todavía falta pagar: un pago no puede superarlo */
export function validatePago(values: PagoFormValues, saldoPendiente: number): PagoErrors {
    const errors: PagoErrors = {};
    const monto = parseNonNegative(values.monto, 2);
    if (!values.monto.trim()) errors.monto = REQUIRED_MESSAGE;
    else if (monto === null || monto <= 0) errors.monto = "Ingresa un monto mayor a 0 con hasta 2 decimales.";
    else if (saldoPendiente <= 0) errors.monto = "Esta certificación no tiene saldo pendiente.";
    else if (monto > saldoPendiente) errors.monto = `No puede superar el saldo pendiente (${saldoPendiente.toFixed(2)}).`;
    if (!values.fecha) errors.fecha = REQUIRED_MESSAGE;
    if (values.referencia.trim().length > 255) errors.referencia = "Usa hasta 255 caracteres.";
    return errors;
}

// ---------------------------------------------------------------------------------------------
// Vigencia
// ---------------------------------------------------------------------------------------------

/** Cuántos días antes del fin de la vigencia pasa a "Por vencer" (mismo umbral que el detalle de campaña) */
const DAYS_TO_EXPIRE = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type VigenciaAutomatica = "Sin fechas completas" | "Por iniciar" | "Vigente" | "Por vencer" | "Vencida";

/**
 * Estado de vigencia que se calcula solo a partir del periodo (el usuario no lo elige): sin las dos fechas
 * no se puede saber; antes del inicio "Por iniciar"; después del fin "Vencida"; los últimos 30 días "Por vencer".
 */
export function getVigenciaAutomatica(validoDesde: string, validoHasta: string, now = new Date()): VigenciaAutomatica {
    if (!validoDesde || !validoHasta) return "Sin fechas completas";
    const toUtc = (value: string) => {
        const [year, month, day] = value.split("-").map(Number);
        return Date.UTC(year, month - 1, day);
    };
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    if (today < toUtc(validoDesde)) return "Por iniciar";
    const daysLeft = Math.round((toUtc(validoHasta) - today) / DAY_MS);
    if (daysLeft < 0) return "Vencida";
    return daysLeft <= DAYS_TO_EXPIRE ? "Por vencer" : "Vigente";
}

/** yyyy-MM-dd → dd/MM/yyyy ("—" si está vacía) */
export const displayCertDate = (value: string) => (value ? value.split("-").reverse().join("/") : "—");
