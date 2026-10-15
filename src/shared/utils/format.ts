import { format } from "date-fns";

/**
 * Formatos de cifras y fechas que comparten todas las vistas (es-PE). Antes cada archivo creaba su propio
 * `Intl.NumberFormat` y su `displayDate`; acá queda uno solo por tipo de dato.
 */
const KG = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 });
const MONEY = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DECIMAL = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 });

/** Kilos: hasta 3 decimales ("24,000.5") */
export const formatKg = (value: number) => KG.format(value);
/** Montos: siempre 2 decimales ("1,250.00") */
export const formatMoney = (value: number) => MONEY.format(value);
/** Hectáreas, toneladas, volúmenes: hasta 2 decimales */
export const formatDecimal = (value: number) => DECIMAL.format(value);

/**
 * Fecha para mostrar en tablas y detalles: "dd/MM/yyyy". Acepta un `Date` o un texto `yyyy-MM-dd` (lo que guardan
 * los formularios), que se lee como fecha local para que no se corra un día por la zona horaria.
 * Si está vacía o no es válida, devuelve `fallback`.
 */
export function formatDisplayDate(value: string | Date | null | undefined, fallback = "—"): string {
    if (!value) return fallback;
    const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
    const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
    return Number.isNaN(date.getTime()) ? fallback : format(date, "dd/MM/yyyy");
}
