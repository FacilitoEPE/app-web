import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TableGridCardProps {
    /** Clase del acento del borde izquierdo, ej. "border-l-brand"; se omite si la tarjeta no distingue estado */
    accentColor?: string;
    /** Ícono o iniciales dentro del avatar circular; se omite si la fila no tiene uno */
    icon?: ReactNode;
    title: ReactNode;
    subtitle?: ReactNode;
    /** Esquina superior derecha, normalmente un StatusBadge */
    badge?: ReactNode;
    /** Recuadro de datos entre el header y las acciones; cada tabla arma su propio layout adentro (grid, lista, con íconos...) */
    children?: ReactNode;
    /** Franja inferior de acciones; se omite (y no se dibuja la franja) en las listas de solo lectura */
    actions?: ReactNode;
    className?: string;
}

/**
 * Tarjeta de una fila en vista móvil o grilla: header (avatar + título/subtítulo + badge),
 * recuadro de datos libre y footer de acciones. Es el mismo marco en las 5 tablas de listado;
 * solo cambia lo que cada una mete en `children` (los campos que le importan).
 */
export default function TableGridCard({ accentColor, icon, title, subtitle, badge, children, actions, className }: TableGridCardProps) {
    return (
        <div data-motion-row className={cn("rounded-xl border border-border bg-card overflow-hidden", accentColor && cn("border-l-[3px]", accentColor), className)}>
            <div className="flex items-start justify-between gap-3 p-4 pb-3">
                <div className="flex items-center gap-3 min-w-0">
                    {icon && (
                        <div className="w-10 h-10 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center shrink-0 font-bold text-[13px] overflow-hidden" style={{ color: "var(--brand-gradient-mid)" }}>
                            {icon}
                        </div>
                    )}
                    <div className="flex flex-col min-w-0">
                        <span className="text-[15px] font-bold text-ink leading-tight truncate">{title}</span>
                        {subtitle && <span className="text-[12.5px] font-medium text-ink-muted truncate">{subtitle}</span>}
                    </div>
                </div>
                {badge}
            </div>

            {children}

            {actions ? (
                <div className="flex items-center mt-3 px-2.5 py-1.5 border-t border-border bg-surface-page/50">
                    {actions}
                </div>
            ) : (
                <div className="pb-4" />
            )}
        </div>
    );
}

interface TableGridCardFieldProps {
    label: ReactNode;
    value: ReactNode;
    className?: string;
}

/** Par etiqueta/valor para el recuadro de datos, en tablas que no necesitan más que eso */
export function TableGridCardField({ label, value, className }: TableGridCardFieldProps) {
    return (
        <div className={cn("flex flex-col min-w-0", className)}>
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</span>
            <span className="text-[13px] font-semibold text-ink truncate">{value}</span>
        </div>
    );
}

/** Recuadro de datos con layout de grilla 2 columnas: el más común entre las tablas */
export function TableGridCardFields({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn("mx-4 grid grid-cols-2 gap-3 rounded-lg bg-surface-page border border-border p-3", className)}>{children}</div>;
}
