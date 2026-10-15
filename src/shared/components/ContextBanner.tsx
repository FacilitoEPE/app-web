import type { ReactNode } from "react";

export interface ContextBannerMeta {
    icon: ReactNode;
    content: ReactNode;
}

export interface ContextBannerStat {
    label: string;
    value: string;
}

interface ContextBannerProps {
    /** Nombre accesible de la región, p. ej. "Campaña Mango 2026" */
    ariaLabel: string;
    /** Línea superior en mayúsculas que dice de qué entidad es la vista, con su ícono */
    eyebrow: { icon: ReactNode; label: string };
    title: string;
    /** Elemento junto al título, normalmente un StatusBadge */
    titleAddon?: ReactNode;
    /** Datos clave de la entidad (documento, zona, fechas…), cada uno con su ícono */
    meta?: ContextBannerMeta[];
    /** Qué se está gestionando en la vista, p. ej. "Fincas · cultivos y superficie" */
    caption?: string;
    /** Cifras rápidas del recurso gestionado, en píldoras */
    stats?: ContextBannerStat[];
    /** Imagen decorativa del lado derecho, recortada en curva */
    image: string;
}

/**
 * Panel informativo que encabeza las vistas que salen de una vista principal (campaña → certificaciones,
 * proveedor → fincas…): dice de quién es la vista y qué se gestiona en ella. Es genérico a propósito: cada
 * módulo lo alimenta con sus datos mediante un envoltorio fino (ver `CampaignContextBanner`,
 * `ProviderContextBanner`), para que todos compartan el mismo marco y ritmo visual.
 */
/** Lugar reservado mientras llegan los datos del banner: mismo marco y alto, así la vista no salta al aparecer. */
export function ContextBannerPlaceholder() {
    return (
        <div aria-hidden="true" className="mb-7 min-h-39 animate-pulse rounded-2xl border border-brand-border bg-linear-to-r from-brand-surface/70 via-card to-card dark:from-brand/15" />
    );
}

export default function ContextBanner({ ariaLabel, eyebrow, title, titleAddon, meta = [], caption, stats = [], image }: ContextBannerProps) {
    return (
        <section aria-label={ariaLabel} className="relative isolate mb-7 min-h-39 overflow-hidden rounded-2xl border border-brand-border bg-card shadow-sm">
            <div className="absolute inset-0 -z-10 bg-linear-to-r from-brand-surface/70 via-card to-card dark:from-brand/15" aria-hidden="true" />
            <div className="absolute -right-10 -top-20 -z-10 size-64 rounded-full border border-brand-border/60" aria-hidden="true" />
            <div className="absolute -bottom-28 right-20 -z-10 size-72 rounded-full border border-brand-border/40" aria-hidden="true" />

            <div className="relative z-10 flex max-w-full flex-col gap-3 px-5 py-5 sm:max-w-[64%] sm:px-7 sm:py-6">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-brand">
                    {eyebrow.icon} {eyebrow.label}
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-xl font-bold tracking-tight text-ink wrap-anywhere sm:text-2xl">{title}</h2>
                    {titleAddon}
                </div>

                {(meta.length > 0 || caption) && (
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] font-medium text-ink-body">
                        {meta.map((item, index) => (
                            <span key={index} className="inline-flex items-center gap-2">
                                <span className="inline-flex shrink-0 text-brand" aria-hidden="true">{item.icon}</span>
                                {item.content}
                            </span>
                        ))}
                        {meta.length > 0 && caption && <span className="hidden h-4 w-px bg-border sm:block" aria-hidden="true" />}
                        {caption && <span className="text-ink-muted">{caption}</span>}
                    </div>
                )}

                {stats.length > 0 && (
                    <dl className="mt-1 flex flex-wrap gap-2">
                        {stats.map(({ label, value }) => (
                            <div key={label} className="flex items-baseline gap-1.5 rounded-full border border-brand-border/70 bg-card/80 px-3 py-1">
                                <dd className="text-[13px] font-bold tabular-nums text-ink">{value}</dd>
                                <dt className="text-[11.5px] font-medium text-ink-muted">{label}</dt>
                            </div>
                        ))}
                    </dl>
                )}
            </div>

            <div className="absolute inset-y-0 right-0 hidden w-[38%] overflow-hidden sm:block" style={{ clipPath: "ellipse(96% 118% at 100% 50%)" }} aria-hidden="true">
                <img src={image} alt="" className="h-full w-full object-cover object-center" />
                <div className="absolute inset-0 bg-linear-to-r from-brand/25 via-transparent to-ink/15" />
            </div>
        </section>
    );
}
