import type { ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import Hint from "@/shared/components/Hint";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface RowAction {
    label: string;
    icon: ReactNode;
    onClick?: () => void;
    /** "destructive" pinta la acción en rojo; "brand" (solo en el menú "secondary") la resalta en verde */
    variant?: "default" | "brand" | "destructive";
}

interface RowActionsProps {
    /** Acciones que se quedan siempre visibles como íconos, normalmente Editar y Ver detalles */
    primary: RowAction[];
    /** El resto de acciones, agrupadas detrás del botón de 3 puntitos */
    secondary?: RowAction[];
    align?: "start" | "end";
    className?: string;
}

/** Fila de acciones de tabla: 1-2 íconos siempre visibles + el resto colapsado en un menú de "más opciones". */
export default function RowActions({ primary, secondary = [], align = "end", className }: RowActionsProps) {
    return (
        <div className={cn("flex items-center justify-end gap-3", className)}>
            {primary.map((action) => (
                <Hint key={action.label} label={action.label}>
                    <button
                        onClick={action.onClick}
                        aria-label={action.label}
                        className={cn(
                            "shrink-0 h-9 w-9 flex items-center justify-center rounded-lg text-ink-muted transition-all duration-300 hover:text-white hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm outline-none focus-visible:ring-2",
                            action.variant === "destructive"
                                ? "hover:bg-destructive hover:shadow-danger focus-visible:ring-destructive/50"
                                : "hover:bg-brand hover:shadow-glow focus-visible:ring-brand/50"
                        )}
                    >
                        {action.icon}
                    </button>
                </Hint>
            ))}

            {secondary.length > 0 && (
                <>
                    {primary.length > 0 && (
                        <div className="w-0.25 h-5 bg-border mx-1 shrink-0" />
                    )}
                    <DropdownMenu>
                        <Hint label="Más opciones">
                            <DropdownMenuTrigger
                                aria-label="Más opciones"
                                className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg text-ink-muted transition-all duration-300 hover:bg-brand hover:text-white hover:shadow-glow hover:-translate-y-0.5 data-[state=open]:bg-brand data-[state=open]:text-white data-[state=open]:shadow-glow active:translate-y-0 active:shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                            >
                                <MoreVertical size={18} strokeWidth={2.5} />
                            </DropdownMenuTrigger>
                        </Hint>
                        <DropdownMenuContent align={align} sideOffset={8} className="w-52 p-1.5 rounded-xl shadow-xl border-border/50 bg-popover">
                            {secondary.map((action) => (
                                <DropdownMenuItem
                                    key={action.label}
                                    onClick={action.onClick}
                                    variant={action.variant === "destructive" ? "destructive" : "default"}
                                    className={cn(
                                        "gap-2.5 px-3 py-2.5 text-[14px] font-medium rounded-lg cursor-pointer transition-all duration-200",
                                        action.variant === "brand"
                                            ? "text-brand [&_svg]:text-brand"
                                            : action.variant === "destructive"
                                                ? ""
                                                // El resaltado verde (texto + ícono) lo da DropdownMenuItem
                                                : "text-ink-body [&_svg]:text-ink-muted"
                                    )}
                                >
                                    {action.icon}
                                    {action.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>
            )}
        </div>
    );
}
