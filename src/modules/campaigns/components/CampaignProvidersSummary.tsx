import { plural } from "@/shared/utils/plural";
import { Truck } from "lucide-react";
import CampaignContactsCard from "@/modules/campaigns/components/CampaignContactsCard";
import { getGrowerTotals } from "@/modules/campaigns/campaignDetails.data";
import type { CampaignGrower } from "@/modules/campaigns/campaignDetails.data";
import { formatCampaignNumber } from "@/modules/campaigns/campaignDetails.utils";

export default function CampaignProvidersSummary({ providers, campaignName, onViewAll }: { providers: CampaignGrower[]; campaignName: string; onViewAll: () => void }) {
    const totals = getGrowerTotals(providers);
    return (
        <CampaignContactsCard title="Proveedores" description={`${providers.length} ${plural(providers.length, "proveedor vinculado", "proveedores vinculados")} · ${campaignName}`} icon={<Truck size={27} />} onViewAll={onViewAll} empty={!providers.length}
            stats={[{ label: "Proveedores", value: providers.length }, { label: "Hectáreas totales", value: `${formatCampaignNumber(totals.hectares)} ha` }, { label: "Variedades", value: totals.varieties }]}>
            <p className="campaign-list-label">Principales proveedores</p>
            {providers.slice(0, 2).map((provider) => (
                <div key={provider.id} className="campaign-contact-row">
                    <span className="campaign-avatar" aria-hidden="true">{provider.name[0]}</span>
                    <div className="min-w-0 flex-1"><h3 title={provider.name}>{provider.name}</h3><p>{provider.location} · {provider.hectares} ha</p></div>
                    <div className="campaign-provider-chips">{provider.varieties.slice(0, 2).map((variety, index) => <span key={variety} className={`campaign-chip ${index ? "campaign-chip-purple" : ""}`}><span aria-hidden="true" />{variety}</span>)}</div>
                </div>
            ))}
        </CampaignContactsCard>
    );
}
