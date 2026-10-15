import { Leaf, Mail, UserRound } from "lucide-react";
import ContextBanner, { type ContextBannerMeta, type ContextBannerStat } from "@/shared/components/ContextBanner";
import StatusBadge from "@/shared/components/StatusBadge";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";
import type { ClienteNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.mapper";
import { getCampaignFruitVisual } from "@/modules/campaigns/campaignFruit";

interface CampaignClientContextBannerProps {
    campaign: Campana;
    relation: ClienteNegocioCampana;
    /** Qué se está gestionando, p. ej. "Contratos · acuerdos comerciales" */
    caption: string;
    stats?: ContextBannerStat[];
}

/**
 * Encabezado de las vistas que salen de un cliente vinculado a una campaña (contratos): el banner habla del
 * cliente y nombra la campaña como contexto, sobre el banner compartido.
 */
export default function CampaignClientContextBanner({ campaign, relation, caption, stats }: CampaignClientContextBannerProps) {
    const client = relation.clienteNegocio;
    const name = client?.nombreEmpresa ?? "Cliente";
    const meta: ContextBannerMeta[] = [
        { icon: <Leaf size={16} />, content: <span className="font-semibold text-brand">{campaign.nombre}</span> },
        ...(client?.correoCorporativo ? [{ icon: <Mail size={16} />, content: client.correoCorporativo }] : []),
    ];

    return (
        <ContextBanner
            ariaLabel={`Cliente ${name} en la campaña ${campaign.nombre}`}
            eyebrow={{ icon: <UserRound size={15} strokeWidth={2} aria-hidden="true" />, label: "Cliente vinculado" }}
            title={name}
            titleAddon={client?.tipoCliente && <StatusBadge status={client.tipoCliente === "exportador" ? "Exportador" : "Industria"} />}
            meta={meta}
            caption={caption}
            stats={stats}
            image={getCampaignFruitVisual(campaign.nombre, campaign.fruta?.name).image}
        />
    );
}
