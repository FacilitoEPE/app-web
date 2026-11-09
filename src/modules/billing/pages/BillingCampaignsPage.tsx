import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Receipt, Sprout } from "lucide-react";
import { billingCampaigns } from "@/modules/billing/billing.utils";
import { useBillingClients } from "@/modules/billing/billing.store";
import FilterBar, { FilterSearch } from "@/shared/components/FilterBar";
import StatusBadge from "@/shared/components/StatusBadge";
import TableCard from "@/shared/components/TableCard";
import { TableCountPill } from "@/shared/components/TableToolbar";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import TableGridCard, { TableGridCardField, TableGridCardFields } from "@/shared/components/TableGridCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import PageHeader from "@/shared/layout/PageHeader";

export default function BillingCampaignsPage() {
    const navigate = useNavigate();
    const clients = useBillingClients();
    const [search, setSearch] = useState("");
    const campaigns = useMemo(() => billingCampaigns(clients), [clients]);
    const filtered = campaigns.filter(campaign => `${campaign.name} ${campaign.fruit}`.toLocaleLowerCase("es")
        .includes(search.trim().toLocaleLowerCase("es")));
    const open = (id: number) => navigate(`/facturacion-cobros/${id}`);
    const viewClients = (id: number) => (
        <Button variant="outline" size="sm" onClick={() => open(id)}><Eye size={16} />Ver clientes</Button>
    );
    return <div className="px-4 py-5 sm:px-8 lg:px-14">
        <PageHeader icon={<Receipt size={24} />} title="Facturación y Cobros"
            description="Consulta las campañas con cargas registradas y continúa con la facturación de sus clientes." />
        <FilterBar className="mb-8" onClear={() => setSearch("")} canClear={Boolean(search)}>
            <FilterSearch value={search} onChange={setSearch} placeholder="Buscar campaña o fruta…" />
        </FilterBar>
        <TableCard icon={<Receipt size={24} />} title="Campañas en facturación"
            description="Cada campaña agrupa sus clientes, cargas y documentos de venta."
            headerRight={<TableCountPill icon={<Receipt size={16} />} count={filtered.length} singular="campaña" plural="campañas" />}
            isEmpty={!filtered.length} emptyTitle={search ? "Sin resultados para la búsqueda" : "Aún no hay cargas para facturar"}
            emptyDescription={search ? "Prueba otro nombre o limpia la búsqueda." : "Las campañas aparecerán cuando se registre una carga de sus clientes."}
            emptyAction={search ? { label: "Limpiar búsqueda", onClick: () => setSearch(""), tone: "secondary" } : undefined}
            page={1} pageCount={1} onPageChange={() => {}}>
            <div className="flex flex-col gap-3 sm:hidden">{filtered.map(campaign => <TableGridCard key={campaign.id}
                accentColor="border-l-brand" icon={<Sprout size={18} />} title={campaign.name} subtitle={campaign.fruit}
                badge={<StatusBadge status={campaign.status} />}
                actions={viewClients(campaign.id)}>
                <TableGridCardFields><TableGridCardField label="Clientes con carga" value={campaign.clients.length} />
                    <TableGridCardField label="Cargas" value={campaign.clients.reduce((sum, client) => sum + client.cargas.length, 0)} />
                    <TableGridCardField label="Documentos" value={campaign.clients.reduce((sum, client) => sum + client.cargas.reduce((count, load) => count + load.facturas.length, 0), 0)} />
                </TableGridCardFields>
            </TableGridCard>)}</div>
            <div className="hidden overflow-hidden rounded-xl border border-border sm:block"><Table><TableHeader className={TABLE_HEAD_BG}>
                <TableRow className="border-border hover:bg-transparent">{["Campaña", "Fruta", "Estado", "Clientes con carga", "Cargas", "Documentos", "Acciones"].map(label => <TableHead key={label} className="h-14 px-4 font-semibold text-ink">{label}</TableHead>)}</TableRow>
            </TableHeader><TableBody>{filtered.map(campaign => <TableRow key={campaign.id} className="border-border">
                <TableCell className="relative h-20 px-4"><TableRowAccent color="bg-brand" /><TableRowLead icon={<Sprout size={18} />} title={campaign.name} /></TableCell>
                <TableCell>{campaign.fruit}</TableCell><TableCell><StatusBadge status={campaign.status} /></TableCell>
                <TableCell>{campaign.clients.length}</TableCell><TableCell>{campaign.clients.reduce((sum, client) => sum + client.cargas.length, 0)}</TableCell>
                <TableCell>{campaign.clients.reduce((sum, client) => sum + client.cargas.reduce((count, load) => count + load.facturas.length, 0), 0)}</TableCell>
                <TableCell>{viewClients(campaign.id)}</TableCell>
            </TableRow>)}</TableBody></Table></div>
        </TableCard>
    </div>;
}
