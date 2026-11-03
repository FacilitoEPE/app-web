import { CalendarDays, Leaf } from "lucide-react";
import ContextBanner from "@/shared/components/ContextBanner";
import StatusBadge from "@/shared/components/StatusBadge";
import { formatDisplayDate } from "@/shared/utils/format";
import { getCampaignFruitVisual } from "@/modules/campaigns/campaignFruit";
import type { QualityCampaign, QualityScope } from "@/modules/quality/quality.utils";

const STATUS_LABELS: Record<string, string> = {
    planificacion: "Planificado",
    "en proceso": "En ejecución",
    terminado: "Terminado",
};

interface Props {
    campaign: QualityCampaign;
    scope: QualityScope;
    caption: string;
    count: number;
    singular: string;
    plural: string;
}

/** Contexto de campaña para las gestiones de Calidad, con el mismo marco de Campañas. */
export default function QualityCampaignContextBanner({ campaign, scope, caption, count, singular, plural }: Props) {
    return <ContextBanner
        ariaLabel={/^campaña\b/i.test(campaign.nombre) ? campaign.nombre : `Campaña ${campaign.nombre}`}
        eyebrow={{ icon: <Leaf size={15} strokeWidth={2} aria-hidden="true" />, label: "Campaña de exportación" }}
        title={campaign.nombre}
        titleAddon={<StatusBadge status={STATUS_LABELS[campaign.estado] ?? campaign.estado} />}
        meta={[{ icon: <CalendarDays size={16} />, content: <>{formatDisplayDate(campaign.fechaInicio)} <span className="text-brand">→</span> {formatDisplayDate(campaign.fechaFin)}</> }]}
        caption={`${caption} · ${scope === "exportador" ? "Exportador" : "Industria"}`}
        stats={[{ label: count === 1 ? singular : plural, value: String(count) }]}
        image={getCampaignFruitVisual(campaign.nombre, campaign.fruta).image}
    />;
}
