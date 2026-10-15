import { FileSignature, Leaf, UserRound } from "lucide-react";
import ContextBanner, { type ContextBannerStat } from "@/shared/components/ContextBanner";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";
import type { ClienteNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.mapper";
import type { CampaignClientContractLocal } from "@/modules/campaigns/campaignClientContract.utils";
import { getCampaignFruitVisual } from "@/modules/campaigns/campaignFruit";

interface CampaignContractContextBannerProps {
    campaign: Campana;
    relation: ClienteNegocioCampana;
    contract: CampaignClientContractLocal;
    /** Qué se está gestionando, p. ej. "Entregas · programación del contrato" */
    caption: string;
    stats?: ContextBannerStat[];
}

/**
 * Encabezado de las vistas que salen de un contrato (entregas): el banner habla del contrato y nombra al
 * cliente y la campaña como contexto, sobre el banner compartido.
 */
export default function CampaignContractContextBanner({ campaign, relation, contract, caption, stats }: CampaignContractContextBannerProps) {
    const clientName = relation.clienteNegocio?.nombreEmpresa ?? "Cliente";
    const title = `Contrato #${String(contract.id).padStart(2, "0")}`;

    return (
        <ContextBanner
            ariaLabel={`${title} de ${clientName}`}
            eyebrow={{ icon: <FileSignature size={15} strokeWidth={2} aria-hidden="true" />, label: "Contrato comercial" }}
            title={title}
            meta={[
                { icon: <UserRound size={16} />, content: <span className="font-semibold text-brand">{clientName}</span> },
                { icon: <Leaf size={16} />, content: campaign.nombre },
            ]}
            caption={caption}
            stats={stats}
            image={getCampaignFruitVisual(campaign.nombre, campaign.fruta?.name).image}
        />
    );
}
