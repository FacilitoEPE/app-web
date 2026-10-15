import { CalendarDays, Leaf } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ContextBanner, { type ContextBannerStat } from "@/shared/components/ContextBanner";
import StatusBadge from "@/shared/components/StatusBadge";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";
import { getCampaignFruitVisual } from "@/modules/campaigns/campaignFruit";

const campaignStatus: Record<Campana["estado"], string> = {
    planificacion: "Planificado",
    "en proceso": "En proceso",
    terminado: "Terminado",
};

const displayDate = (value: Date) => Number.isNaN(value.getTime()) ? "—" : format(value, "dd MMM yyyy", { locale: es });

interface CampaignContextBannerProps {
    campaign: Campana;
    /** Qué se está gestionando, p. ej. "Clientes · gestión comercial" */
    caption: string;
    stats?: ContextBannerStat[];
}

/**
 * Encabezado de las vistas que salen directo de una campaña (proveedores, clientes, certificaciones, pagos),
 * sobre el banner compartido. Las que salen de un proveedor o un cliente de la campaña usan el banner de ese
 * nivel (`CampaignProviderContextBanner`, `CampaignClientContextBanner`).
 */
export default function CampaignContextBanner({ campaign, caption, stats }: CampaignContextBannerProps) {
    const fruit = getCampaignFruitVisual(campaign.nombre, campaign.fruta?.name);

    return (
        <ContextBanner
            ariaLabel={/^campaña\b/i.test(campaign.nombre) ? campaign.nombre : `Campaña ${campaign.nombre}`}
            eyebrow={{ icon: <Leaf size={15} strokeWidth={2} aria-hidden="true" />, label: "Campaña de exportación" }}
            title={campaign.nombre}
            titleAddon={<StatusBadge status={campaignStatus[campaign.estado]} />}
            meta={[{
                icon: <CalendarDays size={16} />,
                content: <>{displayDate(campaign.fechaInicio)} <span className="text-brand">→</span> {displayDate(campaign.fechaFin)}</>,
            }]}
            caption={caption}
            stats={stats}
            image={fruit.image}
        />
    );
}
