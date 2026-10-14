import { useId, type ReactNode } from "react";
import { sparklinePath } from "@/modules/campaigns/campaignStats.utils";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string | number | ReactNode;
    icon: ReactNode;
    trend?: {
        value: string;
        direction: "up" | "down" | "neutral";
    };
    sparklineVariant?: "green" | "grey" | "yellow";
    /** Serie de los últimos meses que dibuja la curva; sin ella no hay curva */
    series?: number[];
    onClick?: () => void;
    active?: boolean;
}

/** Flecha de la comparativa: sube, baja o línea cuando no hubo cambio */
function TrendIcon({ direction, size }: { direction: "up" | "down" | "neutral"; size: number }) {
    if (direction === "up") return <ArrowUpRight size={size} strokeWidth={2.5} />;
    if (direction === "down") return <ArrowDownRight size={size} strokeWidth={2.5} />;
    return <Minus size={size} strokeWidth={2.5} />;
}

const SPARKLINE_COLOR = { green: "var(--brand)", grey: "var(--status-neutral)", yellow: "var(--status-highlight)" } as const;

/** Curva de fondo de la card: la serie real de los últimos meses (ver `getCampaignMonthlySeries`) */
function Sparkline({ series, variant = "green" }: { series: number[]; variant?: keyof typeof SPARKLINE_COLOR }) {
    const gradientId = useId();
    const path = sparklinePath(series);
    if (!path) return null;
    const color = SPARKLINE_COLOR[variant];

    return (
        <svg
            className="hidden sm:block absolute bottom-0 right-0 w-[60%] h-[60%] z-0 rounded-br-2xl pointer-events-none"
            viewBox="0 0 120 60"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={`${path} L 120 60 L 0 60 Z`} fill={`url(#${gradientId})`} />
            <path d={path} stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    );
}

export default function StatCard({ title, value, icon, trend, sparklineVariant = "green", series, onClick, active = false }: StatCardProps) {
    const trendColor =
        trend?.direction === "down"
            ? "text-status-warning"
            : trend?.direction === "up"
            ? "text-brand"
            : "text-ink-muted";

    const isInteractive = Boolean(onClick);

    return (
        <Card
            onClick={onClick}
            role={isInteractive ? "button" : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            aria-pressed={isInteractive ? active : undefined}
            onKeyDown={(event) => {
                if (!isInteractive) return;
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onClick?.();
                }
            }}
            className={`relative rounded-2xl border border-border shadow-card h-33 sm:h-40 bg-card transition-all border-l-[3px] outline-none ${
                isInteractive ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-brand/40" : ""
            } ${
                active
                    ? "border-l-brand shadow-card-hover ring-1 ring-brand/20"
                    : "border-l-transparent hover:shadow-card-hover hover:-translate-y-0.5 hover:border-l-brand"
            }`}
        >
            {/* MÓVIL: ícono y tendencia arriba, cifra y rótulo abajo. Con el rótulo
                al final, un título de dos líneas ya no empuja la cifra hacia abajo
                y todas las tarjetas alinean sus números a la misma altura. */}
            <CardContent className="sm:hidden p-3.5 flex flex-col h-full relative z-10">
                <div className="flex items-center justify-between gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-surface flex items-center justify-center shrink-0 border border-brand-border/50 [&>svg]:size-4" style={{ color: "var(--brand-gradient-mid)" }}>
                        {icon}
                    </div>
                    {trend && (
                        <div className={`flex items-center gap-0.5 shrink-0 ${trendColor}`}>
                            <TrendIcon direction={trend.direction} size={14} />
                            <span className="text-[12px] font-bold leading-none">{trend.value}</span>
                        </div>
                    )}
                </div>

                <div className="mt-auto min-w-0">
                    <span className="block text-[28px] font-bold text-ink leading-none tracking-tight">
                        {value}
                    </span>
                    <span className="block text-[11.5px] font-semibold text-ink-muted leading-tight mt-1 line-clamp-2">
                        {title}
                    </span>
                </div>
            </CardContent>

            {/* ESCRITORIO: hay espacio para el ícono grande, la comparativa y la sparkline */}
            <CardContent className="hidden sm:flex p-5 pt-1 flex-col h-full relative z-10 justify-between">
                <div className="flex items-start gap-4 min-w-0">
                    <div className="w-16 h-16 rounded-full bg-brand-surface flex items-center justify-center shrink-0 border border-brand-border/50" style={{ color: "var(--brand-gradient-mid)" }}>
                        {icon}
                    </div>
                    <div className="flex flex-col pt-1 min-w-0">
                        <span className="text-[14px] font-semibold text-ink leading-snug">
                            {title}
                        </span>
                        <span className="text-[40px] font-bold text-ink leading-[1.1] tracking-tight mt-1">
                            {value}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-0.5 mt-auto">
                    {trend && (
                        <>
                            <div className={`flex items-center gap-1 ${trendColor}`}>
                                <TrendIcon direction={trend.direction} size={18} />
                                <span className="text-[15px] font-bold">{trend.value}</span>
                            </div>
                            <span className="text-[12px] text-ink-muted font-medium">
                                vs. mes anterior
                            </span>
                        </>
                    )}
                </div>
            </CardContent>

            {/* Curva de los últimos meses (solo desde sm): en móvil la tarjeta es demasiado compacta y la
                curva termina cruzando la cifra y la tendencia. */}
            {series && <Sparkline series={series} variant={sparklineVariant} />}
        </Card>
    );
}
