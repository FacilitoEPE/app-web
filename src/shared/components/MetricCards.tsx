import type { LucideIcon } from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { cn } from "@/lib/utils";

export interface Metric {
    title: string;
    value: string;
    unit: string;
    description: string;
    icon: LucideIcon;
    /** Tono cálido para el indicador que pide atención */
    warm?: boolean;
}

/** Cifras de una entidad; las seis etapas de despacho caben en una fila amplia. */
export default function MetricCards({ metrics, label, columns = 2 }: { metrics: Metric[]; label: string; columns?: 2 | 6 }) {
    return (
        <section aria-label={label} className={cn("grid grid-cols-2 gap-3", columns === 6 && "sm:grid-cols-3 xl:grid-cols-6")}>
            {metrics.map(({ title, value, unit, description, icon: Icon, warm }) => (
                <Card
                    key={title}
                    className={cn(
                        "flex-row items-start gap-3 rounded-2xl border-0 px-4 py-5 ring-1 ring-border transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md",
                        warm && "bg-linear-to-br from-card to-status-highlight-surface",
                    )}
                >
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", warm ? "bg-status-highlight-surface text-status-highlight" : "bg-brand-surface text-brand")}>
                        <Icon size={20} strokeWidth={2.2} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <h3 className="text-[11px] font-bold leading-snug text-ink-body">{title}</h3>
                        <p className="mt-1 text-[24px] font-extrabold leading-tight tracking-tight tabular-nums text-ink">
                            {value} <span className="text-[14px] font-bold text-ink-muted">{unit}</span>
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-ink-muted">{description}</p>
                    </div>
                </Card>
            ))}
        </section>
    );
}
