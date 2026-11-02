import { Factory, Globe } from "lucide-react";
import type { SegmentedTabItem } from "@/shared/components/SegmentedTabs";

export type QualityScope = "exportador" | "industria";

export interface QualityCampaign {
    id: number;
    campaniaId: number;
    nombre: string;
    fruta: string;
    fechaInicio: string;
    fechaFin: string;
    estado: string;
    scope: QualityScope[];
}

export const QUALITY_TABS: readonly SegmentedTabItem[] = [
    { id: "exportador", label: "Exportador", icon: Globe, tone: "neutral" },
    { id: "industria", label: "Industria", icon: Factory, tone: "neutral" },
];

export interface QualityActionItem {
    id: "analisis" | "carga" | "guias";
    label: string;
}

export type QualitySection = "resumen" | QualityActionItem["id"];

export function qualityCampaignHref(scope: QualityScope, campaignId: number, section: QualitySection = "resumen"): string {
    const base = `/calidad/${scope}/${campaignId}`;
    return section === "resumen" ? base : `${base}/${section}`;
}

export function getQualityActionsForScope(scope: QualityScope): QualityActionItem[] {
    if (scope === "industria") {
        return [
            { id: "carga", label: "Carga" },
            { id: "guias", label: "Guías de remisión" },
        ];
    }
    return [
        { id: "analisis", label: "Análisis y revisión" },
        { id: "carga", label: "Carga" },
        { id: "guias", label: "Guías de remisión" },
    ];
}

export function filterQualityCampaigns(
    items: QualityCampaign[],
    scope: QualityScope,
    campaignFilter: string,
    statusFilter: string,
    search: string,
): QualityCampaign[] {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
        if (!item.scope.includes(scope)) return false;
        if (campaignFilter && item.nombre !== campaignFilter) return false;
        if (statusFilter && item.estado.toLowerCase() !== statusFilter.toLowerCase()) return false;
        if (query) {
            const matchName = item.nombre.toLowerCase().includes(query);
            const matchFruit = item.fruta.toLowerCase().includes(query);
            if (!matchName && !matchFruit) return false;
        }
        return true;
    });
}
