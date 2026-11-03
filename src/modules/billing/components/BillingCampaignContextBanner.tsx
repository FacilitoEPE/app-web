import { Building2, Receipt, Sprout } from "lucide-react";
import BillingCollectionsImg from "@/assets/billing_collections.webp";
import type { BillingClient } from "@/modules/billing/billing.models";
import ContextBanner from "@/shared/components/ContextBanner";
import StatusBadge from "@/shared/components/StatusBadge";

export default function BillingCampaignContextBanner({ campaign, clientCount, caption }: { campaign: BillingClient; clientCount: number; caption: string }) {
    return <ContextBanner ariaLabel={campaign.campaniaNombre} eyebrow={{ icon: <Receipt size={15} />, label: "Facturación y Cobros · Campaña" }}
        title={campaign.campaniaNombre} titleAddon={<StatusBadge status={campaign.estadoCampania} />}
        meta={[{ icon: <Sprout size={15} />, content: `Fruta: ${campaign.fruta}` }, { icon: <Building2 size={15} />, content: `${clientCount} clientes con cargas` }]}
        caption={caption} image={BillingCollectionsImg} />;
}
