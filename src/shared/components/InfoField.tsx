import type { ReactNode } from "react";
import type {  } from "lucide-react";
import { cn } from "@/lib/utils";

/** Etiqueta de un dato de solo lectura. Exportada para que los visualizadores (p. ej. `FileDropzone` en `readOnly`) se vean igual. */
export const INFO_LABEL_CLASS = "text-[10px] font-bold uppercase tracking-wide text-ink-muted";

interface InfoFieldProps {
    label: ReactNode;
    value: ReactNode;
    /** Unidad pegada al borde derecho, ej. "m", "ha", "/año" */
    suffix?: string;
    /**
     * "box" (por defecto): el valor en una caja de una línea, como un campo.
     * "plain": el valor tal cual, sin caja — para lo que ya tiene su propia forma (un badge, píldoras, una lista).
     */
    variant?: "box" | "plain";
    /** Texto largo (observaciones): la caja crece y respeta los saltos de línea en vez de cortar el texto */
    multiline?: boolean;
    className?: string;
}

/**
 * Campo de solo lectura: etiqueta + valor. Para vistas de "ver detalles" que no son formularios — nada de
 * `<Input readOnly>` fingiendo ser un campo editable, ni etiquetas en mayúsculas armadas a mano.
 */
export function InfoField({ label, value, suffix, variant = "box", multiline = false, className }: InfoFieldProps) {
    return (
        <div className={cn("flex min-w-0 flex-col gap-2", className)}>
            <span className={INFO_LABEL_CLASS}>{label}</span>
            {variant === "plain" ? (
                <div className="min-w-0 text-[13px] font-medium text-ink">{value}</div>
            ) : (
                <div className={cn(
                    "relative flex items-center rounded-lg border border-border/60 bg-card px-3 text-[13px] font-medium text-ink",
                    multiline ? "min-h-10 py-2.5" : "h-10",
                )}>
                    <span className={multiline ? "whitespace-pre-wrap wrap-anywhere" : "truncate"}>{value}</span>
                    {suffix && <span className="absolute right-3 text-xs font-bold text-ink-muted">{suffix}</span>}
                </div>
            )}
        </div>
    );
}

interface SummaryBarItem {
    label: string;
    value: ReactNode;
    /** Resalta la cifra que importa (p. ej. el saldo pendiente): "brand" en verde, "highlight" en ámbar */
    tone?: "brand" | "highlight";
}

interface SummaryBarProps {
    items: SummaryBarItem[];
    className?: string;
}

/**
 * Resumen de contexto de un modal ("costo · pagado · saldo"): una sola franja informativa con las cifras
 * separadas por líneas. A propósito no usa cajas de campo, para que no se confunda con algo que se llena;
 * para valores de solo lectura dentro de un formulario o detalle está `InfoField`.
 */
export function SummaryBar({ items, className }: SummaryBarProps) {
    return (
        <dl className={cn("grid divide-x divide-border/70 rounded-xl border border-brand-border/60 bg-brand-surface/40 py-3", className)} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
            {items.map(({ label, value, tone }) => (
                <div key={label} className="flex min-w-0 flex-col items-center gap-0.5 px-2 text-center">
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">{label}</dt>
                    <dd className={cn("max-w-full truncate text-[15px] font-bold tabular-nums", tone === "brand" ? "text-brand" : tone === "highlight" ? "text-status-highlight" : "text-ink")}>{value}</dd>
                </div>
            ))}
        </dl>
    );
}

