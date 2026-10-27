import { Check, Flag, MapPin, Navigation, Package, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND_ACTIVE_SURFACE } from "@/shared/styles/brandGradients";

export type DispatchStage = "En carga" | "Salida" | "En camino" | "Llegada" | "Cierre";

// eslint-disable-next-line react-refresh/only-export-components
export const DISPATCH_STAGES: readonly { id: DispatchStage; label: string; shortLabel: string }[] = [
    { id: "En carga", label: "En carga", shortLabel: "Carga" },
    { id: "Salida", label: "Salida de finca", shortLabel: "Salida" },
    { id: "En camino", label: "En camino", shortLabel: "Ruta" },
    { id: "Llegada", label: "Llegada a planta", shortLabel: "Llegada" },
    { id: "Cierre", label: "Cierre de despacho", shortLabel: "Cierre" },
];

const STAGE_ICONS = {
    "En carga": Package,
    "Salida": Flag,
    "En camino": Truck,
    "Llegada": MapPin,
    "Cierre": Navigation,
};

interface DispatchStepProgressProps {
    stage: DispatchStage;
    /** "compact": barra pequeña para celdas de tabla o tarjetas de listado; "full": stepper con íconos y etiquetas */
    variant?: "compact" | "full";
    onSelectStage?: (stage: DispatchStage) => void;
    className?: string;
}

/**
 * Componente personalizado de progreso de despacho de 5 etapas (`En carga` → `Salida` → `En camino` → `Llegada` → `Cierre`).
 * Compartido entre el Portal Móvil del Chofer y el módulo de Logística y Despacho.
 */
export default function DispatchStepProgress({
    stage,
    variant = "full",
    onSelectStage,
    className,
}: DispatchStepProgressProps) {
    const activeIndex = Math.max(
        0,
        DISPATCH_STAGES.findIndex((item) => item.id === stage),
    );

    if (variant === "compact") {
        return (
            <div className={cn("flex flex-col gap-1.5 min-w-36", className)}>
                <div className="grid grid-cols-5 gap-1">
                    {DISPATCH_STAGES.map((item, idx) => {
                        const completed = idx <= activeIndex;
                        return (
                            <span
                                key={item.id}
                                title={item.label}
                                className={cn(
                                    "h-1.5 rounded-full transition-colors",
                                    completed ? "bg-brand" : "bg-border",
                                )}
                            />
                        );
                    })}
                </div>
                <span className="text-[11px] font-medium text-ink-muted">
                    Etapa {activeIndex + 1} de {DISPATCH_STAGES.length} · {DISPATCH_STAGES[activeIndex]?.label}
                </span>
            </div>
        );
    }

    return (
        <div className={cn("w-full rounded-2xl border border-brand-border/60 bg-brand-surface/25 p-4", className)}>
            <div className="grid grid-cols-5 gap-2">
                {DISPATCH_STAGES.map((item, idx) => {
                    const Icon = STAGE_ICONS[item.id];
                    const isCompleted = idx < activeIndex;
                    const isCurrent = idx === activeIndex;
                    const isInteractive = Boolean(onSelectStage);

                    return (
                        <button
                            key={item.id}
                            type="button"
                            disabled={!isInteractive}
                            onClick={() => onSelectStage?.(item.id)}
                            className={cn(
                                "group flex flex-col items-center gap-2 text-center outline-none",
                                isInteractive ? "cursor-pointer" : "cursor-default",
                            )}
                        >
                            <div className="relative flex w-full items-center justify-center">
                                {idx > 0 && (
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            "absolute right-1/2 top-1/2 -z-10 h-0.75 w-full -translate-y-1/2 transition-colors",
                                            idx <= activeIndex ? "bg-brand" : "bg-border",
                                        )}
                                    />
                                )}
                                <span
                                    className={cn(
                                        "flex size-10 items-center justify-center rounded-full border text-xs font-bold transition-all",
                                        isCurrent
                                            ? "border-transparent text-white shadow-sm ring-4 ring-brand/20"
                                            : isCompleted
                                                ? "border-brand bg-brand-surface text-brand"
                                                : "border-border bg-card text-ink-muted",
                                    )}
                                    style={isCurrent ? BRAND_ACTIVE_SURFACE : undefined}
                                >
                                    {isCompleted ? <Check size={17} strokeWidth={2.8} /> : <Icon size={17} strokeWidth={2.3} />}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span
                                    className={cn(
                                        "text-[11.5px] font-bold leading-tight",
                                        isCurrent ? "text-brand" : isCompleted ? "text-ink" : "text-ink-muted",
                                    )}
                                >
                                    <span className="sm:hidden">{item.shortLabel}</span>
                                    <span className="hidden sm:inline">{item.label}</span>
                                </span>
                                <span className="text-[10px] font-medium text-ink-muted">Paso {idx + 1}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
