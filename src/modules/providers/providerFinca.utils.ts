/**
 * Fincas (lugares de cultivo) de un proveedor.
 *
 * TODO(api): el backend todavía no tiene un servicio de fincas. Mientras tanto se guardan en memoria (se
 * pierden al recargar) en `providerLocalData.store.ts`, que es lo único que hay que reemplazar cuando exista
 * el servicio: `toFinca` ya devuelve la forma con números que esperaría el backend.
 */
/** Un cultivo de la finca: la fruta y las variedades de ella que se siembran */
export interface CultivoFinca {
    fruta: string;
    variedades: string[];
}

export interface FincaFormValues {
    nombre: string;
    codigoSenasa: string;
    codigoCatastral: string;
    departamento: string;
    provincia: string;
    distrito: string;
    latitud: string;
    longitud: string;
    haTotal: string;
    haCultivo: string;
    /** Una o varias frutas del catálogo de `providerCatalogo.ts`, cada una con sus variedades */
    cultivos: CultivoFinca[];
    /** Años del cultivo; opcional */
    edadCultivo: string;
}

export interface Finca {
    fincaId?: number;
    nombre: string;
    /** Código de lugar de producción SENASA y código catastral: opcionales, no toda finca los tiene */
    codigoSenasa?: string;
    codigoCatastral?: string;
    departamento: string;
    provincia: string;
    distrito: string;
    /** Las coordenadas son opcionales: no siempre se conocen al registrar la finca */
    latitud: number | null;
    longitud: number | null;
    haTotal: number;
    haCultivo: number;
    /**
     * Cultivos de la finca. Opcional en el tipo porque las fincas que nacen de una entrevista de campaña no los
     * traen; el formulario de registro sí lo exige (al menos una fruta, cada una con al menos una variedad).
     */
    cultivos?: CultivoFinca[];
    edadCultivo?: number | null;
}

/** Campos de texto y número del formulario: todos menos los cultivos, que son una lista */
export type FincaField = Exclude<keyof FincaFormValues, "cultivos">;
export type FincaErrors = Partial<Record<keyof FincaFormValues, string>>;

export const EMPTY_FINCA: FincaFormValues = {
    nombre: "",
    codigoSenasa: "",
    codigoCatastral: "",
    departamento: "",
    provincia: "",
    distrito: "",
    latitud: "",
    longitud: "",
    haTotal: "",
    haCultivo: "",
    cultivos: [],
    edadCultivo: "",
};

/** Edad máxima razonable de un cultivo, en años */
const MAX_EDAD_CULTIVO = 100;
const MAX_CODIGO_LENGTH = 50;

const isBlank = (value: string) => value.trim() === "";
const toNumber = (value: string) => (isBlank(value) ? NaN : Number(value));
const normalizeName = (value: string) => value.trim().toLocaleLowerCase("es");

/** Coordenada opcional: vacía es válida; si se escribe, debe ser un número dentro del rango. */
function validateCoordinate(value: string, limit: number): string | undefined {
    if (isBlank(value)) return undefined;
    const number = toNumber(value);
    return Number.isFinite(number) && Math.abs(number) <= limit ? undefined : `Entre -${limit} y ${limit}.`;
}

/**
 * Valida el formulario. `existingNames` son las fincas que el proveedor ya tiene registradas:
 * no se permite repetir el nombre (sin distinguir mayúsculas ni espacios de los extremos).
 */
export function validateFinca(values: FincaFormValues, existingNames: string[] = [], requireCoordinates = false): FincaErrors {
    const errors: FincaErrors = {};

    if (isBlank(values.nombre)) errors.nombre = "Ingresa el nombre de la finca.";
    else if (existingNames.some((name) => normalizeName(name) === normalizeName(values.nombre))) {
        errors.nombre = "El proveedor ya tiene una finca con este nombre.";
    }

    if (isBlank(values.departamento)) errors.departamento = "Requerido.";
    if (isBlank(values.provincia)) errors.provincia = "Requerido.";
    if (isBlank(values.distrito)) errors.distrito = "Requerido.";

    if (values.codigoSenasa.trim().length > MAX_CODIGO_LENGTH) errors.codigoSenasa = `Usa hasta ${MAX_CODIGO_LENGTH} caracteres.`;
    if (values.codigoCatastral.trim().length > MAX_CODIGO_LENGTH) errors.codigoCatastral = `Usa hasta ${MAX_CODIGO_LENGTH} caracteres.`;

    if (requireCoordinates && isBlank(values.latitud)) errors.latitud = "Ingresa la latitud.";
    if (requireCoordinates && isBlank(values.longitud)) errors.longitud = "Ingresa la longitud.";
    const latitudError = validateCoordinate(values.latitud, 90);
    if (latitudError) errors.latitud = latitudError;
    const longitudError = validateCoordinate(values.longitud, 180);
    if (longitudError) errors.longitud = longitudError;

    const haTotal = toNumber(values.haTotal);
    const haCultivo = toNumber(values.haCultivo);
    if (!Number.isFinite(haTotal) || haTotal <= 0) errors.haTotal = "Ingresa un número mayor a 0.";
    if (!Number.isFinite(haCultivo) || haCultivo < 0) errors.haCultivo = "Ingresa un número válido.";
    else if (!errors.haTotal && haCultivo > haTotal) errors.haCultivo = "No puede superar las hectáreas totales.";

    if (!isBlank(values.edadCultivo)) {
        const edad = toNumber(values.edadCultivo);
        if (!Number.isFinite(edad) || edad < 0 || edad > MAX_EDAD_CULTIVO) errors.edadCultivo = `Entre 0 y ${MAX_EDAD_CULTIVO} años.`;
    }

    return errors;
}

/**
 * Reglas de los cultivos: al menos una fruta y, de cada una, al menos una variedad. Van aparte de
 * `validateFinca` porque no todo flujo que registra una finca las pide (p. ej. la finca nueva dentro de una
 * entrevista de campaña).
 */
export function validateFincaCultivo(values: Pick<FincaFormValues, "cultivos">): FincaErrors {
    const errors: FincaErrors = {};
    if (values.cultivos.length === 0) errors.cultivos = "Agrega al menos un cultivo.";
    else {
        const sinVariedad = values.cultivos.find((cultivo) => cultivo.variedades.length === 0);
        if (sinVariedad) errors.cultivos = `Selecciona al menos una variedad de ${sinVariedad.fruta}.`;
    }
    return errors;
}

/** Lleva una finca guardada de vuelta al formulario, para editarla. */
export function fincaToFormValues(finca: Finca): FincaFormValues {
    return {
        nombre: finca.nombre,
        codigoSenasa: finca.codigoSenasa ?? "",
        codigoCatastral: finca.codigoCatastral ?? "",
        departamento: finca.departamento,
        provincia: finca.provincia,
        distrito: finca.distrito,
        latitud: finca.latitud === null ? "" : String(finca.latitud),
        longitud: finca.longitud === null ? "" : String(finca.longitud),
        haTotal: String(finca.haTotal),
        haCultivo: String(finca.haCultivo),
        cultivos: (finca.cultivos ?? []).map((cultivo) => ({ fruta: cultivo.fruta, variedades: [...cultivo.variedades] })),
        edadCultivo: finca.edadCultivo === null || finca.edadCultivo === undefined ? "" : String(finca.edadCultivo),
    };
}

/** Convierte el formulario ya validado en la finca a guardar (textos recortados, números reales). */
export function toFinca(values: FincaFormValues): Finca {
    return {
        nombre: values.nombre.trim(),
        codigoSenasa: values.codigoSenasa.trim(),
        codigoCatastral: values.codigoCatastral.trim(),
        departamento: values.departamento.trim(),
        provincia: values.provincia.trim(),
        distrito: values.distrito.trim(),
        latitud: isBlank(values.latitud) ? null : Number(values.latitud),
        longitud: isBlank(values.longitud) ? null : Number(values.longitud),
        haTotal: Number(values.haTotal),
        haCultivo: Number(values.haCultivo),
        cultivos: values.cultivos.map((cultivo) => ({ fruta: cultivo.fruta, variedades: [...cultivo.variedades] })),
        edadCultivo: isBlank(values.edadCultivo) ? null : Number(values.edadCultivo),
    };
}
