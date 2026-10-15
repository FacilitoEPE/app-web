import { plural } from "@/shared/utils/plural";
import { Users } from "lucide-react";
import CampaignContactsCard from "@/modules/campaigns/components/CampaignContactsCard";
import type { CampaignClient } from "@/modules/campaigns/campaignDetails.data";

export default function CampaignClientsSummary({ clients, campaignName, onViewAll }: { clients: CampaignClient[]; campaignName: string; onViewAll: () => void }) {
    const activeCount = clients.filter((client) => client.status === "Activo").length;
    const mainClients = [...clients].sort((a, b) => b.orders - a.orders).slice(0, 2);
    return (
        <CampaignContactsCard title="Clientes" description={`${clients.length} ${plural(clients.length, "cliente registrado", "clientes registrados")} · ${campaignName}`} icon={<Users size={27} />} onViewAll={onViewAll} empty={!clients.length}
            stats={[{ label: "Clientes", value: clients.length }, { label: "Activos", value: activeCount, tone: "green" }, { label: "Inactivos", value: clients.length - activeCount, tone: "red" }, { label: "Pedidos", value: clients.reduce((sum, client) => sum + client.orders, 0) }]}>
            <p className="campaign-list-label">Principales clientes</p>
            {mainClients.map((client) => (
                <div key={client.id} className="campaign-contact-row">
                    <span className="campaign-avatar" aria-hidden="true">{client.name[0]}</span>
                    <div className="min-w-0 flex-1"><h3>{client.name}</h3><p>{client.type}</p></div>
                    <p className="campaign-client-contact" title={`${client.contact} · ${client.email}`}>{client.contact}</p>
                    <span className="campaign-client-orders">{client.orders} pedidos</span>
                </div>
            ))}
        </CampaignContactsCard>
    );
}
