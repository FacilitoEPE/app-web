import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Fondo del header de cualquier tabla de listado: la "firma" verde de las tablas; en oscuro, una banda verde tenue sobre la card */
export const TABLE_HEAD_BG = "bg-brand-surface dark:bg-brand/15";

interface TableRowAccentProps {
    /** Clase de color de fondo, ej. "bg-brand" o "bg-status-warning"; por defecto un gris neutro */
    color?: string;
}

/** Barra de acento pegada al borde absoluto izquierdo de la fila, para leer el estado de un vistazo. El TableCell que la contiene necesita `relative`. */
export function TableRowAccent({ color = "bg-status-neutral" }: TableRowAccentProps) {
    return <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 rounded-r-lg", color)} />;
}

interface TableRowLeadProps {
    /** Ícono o iniciales dentro del avatar circular */
    icon: ReactNode;
    title: ReactNode;
    subtitle?: ReactNode;
    className?: string;
}

/** Celda inicial de una fila: avatar circular + título (y subtítulo opcional debajo), igual en todas las tablas */
export function TableRowLead({ icon, title, subtitle, className }: TableRowLeadProps) {
    return (
        <div className={cn("flex items-center gap-3.5", className)}>
            <div className="w-11 h-11 rounded-full bg-brand-surface flex items-center justify-center shrink-0 border border-brand-border/50 font-bold text-[14px] overflow-hidden" style={{ color: "var(--brand-gradient-mid)" }}>
                {icon}
            </div>
            <div className="flex flex-col min-w-0">
                <span className="font-bold text-[14px] text-ink truncate leading-tight">{title}</span>
                {subtitle && <span className="text-[12.5px] font-medium text-ink-muted mt-1 truncate">{subtitle}</span>}
            </div>
        </div>
    );
}
