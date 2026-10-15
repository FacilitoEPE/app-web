import { Fingerprint, Leaf, MapPin, Sprout } from "lucide-react";
import ContextBanner, { type ContextBannerMeta, type ContextBannerStat } from "@/shared/components/ContextBanner";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";
import type { CampaniaProveedor } from "@/modules/campaigns/api/campania-proveedor.mapper";
import { getCampaignFruitVisual } from "@/modules/campaigns/campaignFruit";

const ROLE_LABEL: Record<CampaniaProveedor["tipoProveedor"], string> = {
    productor: "Productor de la campaña",
    acopio: "Acopiador de la campaña",
};

interface CampaignProviderContextBannerProps {
    campaign: Campana;
    relation: CampaniaProveedor;
    /** Qué se está gestionando, p. ej. "Entrevistas · fincas y datos agronómicos" */
    caption: string;
    stats?: ContextBannerStat[];
}

/**
 * Encabezado de las vistas que salen de un proveedor dentro de una campaña (entrevistas, exámenes): el banner
 * habla del proveedor —el nivel inmediato anterior— y nombra la campaña como contexto, sobre el banner compartido.
 */
export default function CampaignProviderContextBanner({ campaign, relation, caption, stats }: CampaignProviderContextBannerProps) {
    const provider = relation.proveedor;
    const fullName = provider ? `${provider.nombres} ${provider.apellido}`.trim() : "Proveedor";
    const meta: ContextBannerMeta[] = [
        { icon: <Leaf size={16} />, content: <span className="font-semibold text-brand">{campaign.nombre}</span> },
        ...(provider ? [{ icon: <Fingerprint size={16} />, content: `${provider.tipoDocumento} ${provider.nmrDocumento}` }] : []),
        ...(provider?.zona ? [{ icon: <MapPin size={16} />, content: provider.zona }] : []),
    ];

    return (
        <ContextBanner
            ariaLabel={`Proveedor ${fullName} en la campaña ${campaign.nombre}`}
            eyebrow={{ icon: <Sprout size={15} strokeWidth={2} aria-hidden="true" />, label: ROLE_LABEL[relation.tipoProveedor] }}
            title={fullName}
            meta={meta}
            caption={caption}
            stats={stats}
            image={getCampaignFruitVisual(campaign.nombre, campaign.fruta?.name).image}
        />
    );
}
