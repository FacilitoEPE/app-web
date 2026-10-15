import type { ReactNode } from "react";
import { SearchX } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/components/ui/empty";
import TablePagination from "@/shared/components/TablePagination";
import { cn } from "@/lib/utils";

export interface TableEmptyAction {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    /** Registro/creación en verde; acciones de recuperación como limpiar filtros en neutro. */
    tone?: "primary" | "secondary";
}

interface TableEmptyStateProps {
    icon: ReactNode;
    title: string;
    description: string;
    action?: TableEmptyAction;
}

/** Estado vacío común de las tablas, incluidas las tablas compactas dentro de un modal. */
export function TableEmptyState({ icon, title, description, action }: TableEmptyStateProps) {
    return (
        <Empty className="rounded-xl border border-border bg-surface-page/25 py-12 sm:py-14">
            <EmptyHeader>
                <EmptyMedia variant="brand">{icon}</EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>
            {action && (
                <EmptyContent>
                    <Button
                        size="lg"
                        variant={action.tone === "secondary" ? "outline" : "default"}
                        onClick={action.onClick}
                        className="min-w-38 px-4 font-semibold"
                    >
                        {action.icon}{action.label}
                    </Button>
                </EmptyContent>
            )}
        </Empty>
    );
}

interface TableCardProps {
    icon: ReactNode;
    title: string;
    description: string;
    /** Lado derecho del header: por defecto el contador "Mostrando X de Y", pero cada vista decide qué poner (pills, botones, toggles...) */
    headerRight?: ReactNode;
    /** Cuerpo de la tabla: tarjetas móviles + tabla desktop, lo decide cada vista */
    children: ReactNode;
    isEmpty: boolean;
    emptyIcon?: ReactNode;
    emptyTitle: string;
    emptyDescription: string;
    emptyAction?: TableEmptyAction;
    page: number;
    pageCount: number;
    onPageChange: (page: number) => void;
    className?: string;
}

/**
 * Marco fijo de las tablas de listado: header (ícono, título, descripción, contador), cuerpo,
 * estado vacío y paginación. El cuerpo (tarjetas móviles + tabla desktop) lo compone cada vista,
 * porque las columnas y el contenido de cada fila cambian de una tabla a otra.
 */
export default function TableCard({
    icon,
    title,
    description,
    headerRight,
    children,
    isEmpty,
    emptyIcon = <SearchX size={28} strokeWidth={2} />,
    emptyTitle,
    emptyDescription,
    emptyAction,
    page,
    pageCount,
    onPageChange,
    className,
}: TableCardProps) {
    return (
        <Card className={cn("rounded-2xl border-border shadow-card overflow-hidden", className)}>
            <CardContent className="p-3 flex flex-col gap-5 sm:gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-surface" style={{ color: "var(--brand-gradient-mid)" }}>
                            {icon}
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-[15px] sm:text-[17px] font-bold text-ink leading-tight mb-1">{title}</h2>
                            <p className="text-[12.5px] sm:text-[13px] font-medium">{description}</p>
                        </div>
                    </div>
                    {headerRight}
                </div>

                {!isEmpty && children}

                {isEmpty && <TableEmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />}

                <TablePagination page={page} pageCount={pageCount} onPageChange={onPageChange} />
            </CardContent>
        </Card>
    );
}
