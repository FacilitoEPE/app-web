import type { ReactNode } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";

interface LinkedCardProps {
    icon: ReactNode;
    title: string;
    description: string;
    /** Texto del acceso directo a la vista de gestión, p. ej. "Gestionar fincas" */
    manageLabel: string;
    onManage: () => void;
    stats?: { label: string; value: string | number }[];
    /** Estado vacío: mensaje y acción para registrar el primero */
    isEmpty: boolean;
    emptyMessage: string;
    emptyActionLabel: string;
    className?: string;
    children: ReactNode;
}

/**
 * Resumen de un recurso de una entidad (fincas o certificados de un proveedor, exámenes o entrevistas de un
 * proveedor en campaña): encabezado con acceso directo a su vista de
 * gestión, cifras y una lista corta. Mismo esquema que las tarjetas de proveedores y clientes de campaña.
 */
export default function LinkedCard({
    icon,
    title,
    description,
    manageLabel,
    onManage,
    stats,
    isEmpty,
    emptyMessage,
    emptyActionLabel,
    className,
    children,
}: LinkedCardProps) {
    return (
        <Card className={cn("flex flex-col gap-0 rounded-2xl border-0 p-0 ring-1 ring-border", className)}>
            <div className="flex items-center gap-3 px-5 pt-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-surface text-brand">{icon}</span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-[15px] font-bold leading-tight text-ink">{title}</h2>
                    <p className="truncate text-[12px] text-ink-muted" title={description}>{description}</p>
                </div>
                {!isEmpty && (
                    <Button variant="outline" size="sm" className="shrink-0 rounded-full border-brand-border bg-brand-surface text-[12px] font-semibold text-brand hover:bg-accent" onClick={onManage}>
                        {manageLabel} <ArrowRight size={14} aria-hidden="true" />
                    </Button>
                )}
            </div>

            {stats && !isEmpty && (
                <dl className="mx-5 mt-4 flex border-b border-border pb-4 text-center">
                    {stats.map(({ label, value }) => (
                        <div key={label} className="min-w-0 flex-1 border-border not-first:border-l">
                            <dd className="text-[17px] font-bold tabular-nums text-ink">{value}</dd>
                            <dt className="text-[11px] text-ink-muted">{label}</dt>
                        </div>
                    ))}
                </dl>
            )}

            {isEmpty ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 py-10 text-center">
                    <p className="max-w-xs text-[13px] leading-relaxed text-ink-muted">{emptyMessage}</p>
                    <Button size="sm" onClick={onManage}><Plus size={16} strokeWidth={2.5} /> {emptyActionLabel}</Button>
                </div>
            ) : (
                <div className="flex flex-1 flex-col gap-2 px-5 pb-5 pt-4">{children}</div>
            )}
        </Card>
    );
}

interface LinkedRowProps {
    icon: ReactNode;
    title: string;
    /** Ícono chico que antecede al subtítulo (ubicación, fecha…) */
    metaIcon?: ReactNode;
    subtitle: string;
    trailing?: ReactNode;
}

/**
 * Fila de la lista de una `LinkedCard`. Se distingue del encabezado de la tarjeta a propósito: va en
 * una caja propia con filo de color a la izquierda, ícono cuadrado y neutro, y el dato clave alineado a la derecha.
 */
export function LinkedRow({ icon, title, metaIcon, subtitle, trailing }: LinkedRowProps) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-l-[3px] border-border/70 border-l-brand bg-surface-page/60 py-2.5 pl-3 pr-3.5 transition-colors hover:bg-brand-surface/50">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-ink-muted ring-1 ring-border">{icon}</span>
            <div className="min-w-0 flex-1">
                <h3 className="truncate text-[13px] font-bold text-ink" title={title}>{title}</h3>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11.5px] text-ink-muted">
                    {metaIcon}
                    <span className="truncate">{subtitle}</span>
                </p>
            </div>
            {trailing && <div className="shrink-0 text-right">{trailing}</div>}
        </div>
    );
}
