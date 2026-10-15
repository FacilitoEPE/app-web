import type { Campana } from "@/modules/campaigns/api/campaign.mapper";

export interface StatTrend {
    value: string;
    direction: "up" | "down" | "neutral";
}

const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth();

/** Cuántas campañas cumplen `matches` y tienen su fecha de referencia en el mes indicado (0 = este mes, -1 = el anterior) */
function countInMonth(campaigns: Campana[], now: Date, offset: number, referenceDate: (campaign: Campana) => Date, matches: (campaign: Campana) => boolean) {
    const target = monthIndex(now) + offset;
    return campaigns.filter((campaign) => matches(campaign) && monthIndex(referenceDate(campaign)) === target).length;
}

/** Variación porcentual entre dos meses. Si el mes anterior estaba en 0, cualquier valor nuevo cuenta como +100%. */
export function getTrend(current: number, previous: number): StatTrend {
    const percent = previous === 0 ? (current === 0 ? 0 : 100) : Math.round(((current - previous) / previous) * 100);
    if (percent === 0) return { value: "0%", direction: "neutral" };
    return { value: `${percent > 0 ? "+" : ""}${percent}%`, direction: percent > 0 ? "up" : "down" };
}

/**
 * Tendencia de una tarjeta: campañas que cumplen `matches` y empiezan (o terminan) este mes, comparadas
 * con las del mes anterior. Es lo que se puede calcular con las campañas que ya devuelve el backend;
 * no hay un servicio de históricos.
 */
export function getCampaignTrend(
    campaigns: Campana[],
    now: Date,
    matches: (campaign: Campana) => boolean = () => true,
    referenceDate: (campaign: Campana) => Date = (campaign) => campaign.fechaInicio,
): StatTrend {
    return getTrend(
        countInMonth(campaigns, now, 0, referenceDate, matches),
        countInMonth(campaigns, now, -1, referenceDate, matches),
    );
}

/**
 * Serie de los últimos `months` meses (del más antiguo al actual) con cuántas campañas cumplen `matches` en cada
 * mes, según la misma fecha de referencia que la tendencia. Es lo que dibuja la curva de cada tarjeta.
 */
export function getCampaignMonthlySeries(
    campaigns: Campana[],
    now: Date,
    matches: (campaign: Campana) => boolean = () => true,
    referenceDate: (campaign: Campana) => Date = (campaign) => campaign.fechaInicio,
    months = 6,
): number[] {
    return Array.from({ length: months }, (_, index) => countInMonth(campaigns, now, index - (months - 1), referenceDate, matches));
}

/**
 * Trazo SVG suave para una serie, en una caja de `width`×`height`. El valor más alto toca el margen superior;
 * una serie toda en cero queda como una línea plana abajo (no inventa una subida).
 */
export function sparklinePath(series: number[], width = 120, height = 60, padTop = 10, padBottom = 6): string {
    if (series.length === 0) return "";
    const max = Math.max(...series, 0) || 1;
    const step = series.length > 1 ? width / (series.length - 1) : 0;
    const points = series.map((value, index) => ({
        x: Math.round(index * step * 100) / 100,
        y: Math.round((height - padBottom - (value / max) * (height - padTop - padBottom)) * 100) / 100,
    }));
    if (points.length === 1) return `M 0 ${points[0].y} L ${width} ${points[0].y}`;
    return points.reduce((path, point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const previous = points[index - 1];
        const midX = Math.round(((previous.x + point.x) / 2) * 100) / 100;
        return `${path} C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
    }, "");
}
