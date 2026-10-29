/** Certificado propio del proveedor, tal como se guarda localmente mientras no haya servicio en el backend. */
export interface CertificadoLocal {
    certificadoId: number;
    nombre: string;
    /** yyyy-MM-dd */
    fechaRevisionSenasa: string;
    /** Archivo elegido; se conserva en memoria igual que el resto de los datos */
    documento: File | null;
}

export interface CertificadoFormValues {
    nombre: string;
    fechaRevisionSenasa: string;
}

export type CertificadoErrors = Partial<Record<keyof CertificadoFormValues, string>>;

export const EMPTY_CERTIFICADO: CertificadoFormValues = { nombre: "", fechaRevisionSenasa: "" };

const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());

export function validateCertificado(values: CertificadoFormValues): CertificadoErrors {
    const errors: CertificadoErrors = {};
    if (!values.nombre.trim()) errors.nombre = "Ingresa el nombre del certificado.";
    else if (values.nombre.trim().length > 255) errors.nombre = "El nombre admite hasta 255 caracteres.";
    if (!isDateOnly(values.fechaRevisionSenasa)) errors.fechaRevisionSenasa = "Ingresa una fecha válida.";
    return errors;
}

/** yyyy-MM-dd → dd/MM/yyyy */
export const displayCertificadoDate = (value: string) => value.split("-").reverse().join("/");
