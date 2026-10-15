const DAY_MS = 86_400_000;

/** Calendar dates are parsed explicitly; browser-dependent dd/mm/yyyy parsing is avoided. */
export function parseCampaignDate(value: string): number | null {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (!match) return null;
    const [, day, month, year] = match.map(Number);
    const timestamp = Date.UTC(year, month - 1, day);
    const date = new Date(timestamp);
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
        ? timestamp : null;
}

export function getCampaignTiming(start: string, end: string, now = new Date()) {
    const startDate = parseCampaignDate(start);
    const endDate = parseCampaignDate(end);
    if (startDate === null || endDate === null || endDate < startDate) {
        return { duration: null, remaining: null, hasEnded: false, hasStarted: false };
    }
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return {
        duration: Math.round((endDate - startDate) / DAY_MS) + 1,
        remaining: Math.max(0, Math.round((endDate - Math.max(today, startDate)) / DAY_MS) + 1),
        hasEnded: today > endDate,
        hasStarted: today >= startDate,
    };
}

export function getCertificationStatus(expires: string, now = new Date()) {
    const end = parseCampaignDate(expires);
    if (end === null) return "Sin fecha";
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((end - today) / DAY_MS);
    return days < 0 ? "Vencida" : days <= 30 ? "Por Vencer" : "Vigente";
}

export function getHarvestProgress(harvested: number, estimated: number | null) {
    const safeHarvested = Number.isFinite(harvested) ? Math.max(0, harvested) : 0;
    const hasEstimate = estimated !== null && Number.isFinite(estimated) && estimated > 0;
    return {
        percentage: hasEstimate ? Math.min(100, Math.round(safeHarvested / estimated * 100)) : 0,
        remaining: hasEstimate ? Math.max(0, estimated - safeHarvested) : null,
    };
}

export const formatCampaignNumber = (value: number | null) =>
    value === null || !Number.isFinite(value) ? "—" : new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(value);

export type CampaignFruit = "mango" | "palta" | "arandano" | "fresa" | "banana" | "maracuya";

const FRUIT_ALIASES: Record<CampaignFruit, string[]> = {
    mango: ["mango", "mangos"],
    palta: ["palta", "paltas", "aguacate", "aguacates"],
    arandano: ["arandano", "arandanos", "blueberry", "blueberries"],
    fresa: ["fresa", "fresas", "frutilla", "frutillas"],
    banana: ["banana", "bananas", "banano", "bananos", "platano", "platanos"],
    maracuya: ["maracuya", "maracuyas", "fruta de la pasion", "passion fruit"],
};

/** Prefer an explicit fruit field, then infer from the campaign name. */
export function identifyCampaignFruit(name: string, fruit?: string): CampaignFruit | null {
    for (const candidate of [fruit, name]) {
        if (!candidate) continue;
        const normalized = ` ${candidate.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
        for (const [key, aliases] of Object.entries(FRUIT_ALIASES)) {
            if (aliases.some((alias) => normalized.includes(` ${alias} `))) return key as CampaignFruit;
        }
    }
    return null;
}

/** Duración de la campaña en meses, ya formateada ("3 meses"). Para la tabla de campañas. */
export function getCampaignDurationLabel(start: string, end: string) {
    const from = parseCampaignDate(start);
    const to = parseCampaignDate(end);
    if (from === null || to === null) return "—";
    const a = new Date(from);
    const b = new Date(to);
    const months = Math.abs((b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth())) || 1;
    return `${months} ${months === 1 ? "mes" : "meses"}`;
}
