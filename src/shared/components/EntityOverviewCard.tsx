import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import { BRAND_ACTIVE_SURFACE } from "@/shared/styles/brandGradients";

export interface EntityOverviewChip {
    icon: ReactNode;
    label: ReactNode;
}

export interface EntityOverviewDetail {
    icon: ReactNode;
    label: string;
    value: ReactNode;
}

interface EntityOverviewCardProps {
    /** Iniciales o ícono dentro del recuadro verde */
    avatar: ReactNode;
    /** Línea superior en mayúsculas: qué es la entidad ("Proveedor agrícola", "Cliente · Exportador") */
    eyebrow: string;
    title: string;
    /** Datos que identifican, en píldoras bajo el nombre (documento, zona…) */
    chips?: EntityOverviewChip[];
    /** Datos de registro y contacto, en una grilla de dos columnas */
    details: EntityOverviewDetail[];
    /** Ícono grande y tenue de fondo, abajo a la derecha */
    watermark: LucideIcon;
}

/**
 * Tarjeta principal de las vistas de detalle (proveedor, cliente, transportista): quién es la entidad y sus datos
 * de registro, siempre con el mismo marco. Cada módulo la alimenta con un envoltorio fino.
 */
export default function EntityOverviewCard({ avatar, eyebrow, title, chips = [], details, watermark: Watermark }: EntityOverviewCardProps) {
    return (
        <Card className="relative min-h-60 gap-0 border-0 bg-linear-to-br from-card from-40% to-brand-surface/50 p-0 ring-1 ring-border">
            <Watermark aria-hidden="true" strokeWidth={1} className="pointer-events-none absolute -bottom-10 -right-6 size-60 rotate-12 text-brand/10" />

            <div className="relative flex flex-col gap-6 p-6 sm:p-7">
                <div className="flex items-center gap-4">
                    <span
                        aria-hidden="true"
                        className="flex size-16 shrink-0 items-center justify-center rounded-2xl text-[22px] font-extrabold text-white [&>svg]:size-7"
                        style={BRAND_ACTIVE_SURFACE}
                    >
                        {avatar}
                    </span>
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-brand">{eyebrow}</p>
                        <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-ink wrap-anywhere sm:text-[28px]">{title}</h2>
                        {chips.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {chips.map((chip, index) => (
                                    <span key={index} className="inline-flex items-center gap-1.5 rounded-full bg-brand-surface px-2.5 py-1 text-[11px] font-semibold text-brand [&>svg]:size-3">
                                        {chip.icon} {chip.label}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-border pt-5 sm:grid-cols-2">
                    {details.map(({ icon, label, value }) => (
                        <div key={label} className="flex min-w-0 items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-surface text-brand [&>svg]:size-4">{icon}</span>
                            <div className="min-w-0">
                                <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">{label}</dt>
                                <dd className="text-[13.5px] font-semibold text-ink break-words">{value}</dd>
                            </div>
                        </div>
                    ))}
                </dl>
            </div>
        </Card>
    );
}
