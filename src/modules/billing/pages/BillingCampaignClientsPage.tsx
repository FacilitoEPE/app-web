import { contractedAmounts } from '@/modules/billing/billing.utils';
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Building2, Eye } from "lucide-react";
import BillingCampaignContextBanner from "@/modules/billing/components/BillingCampaignContextBanner";
import { collectedAmount, billedAmount } from "@/modules/billing/billing.utils";
import { useBillingClients } from "@/modules/billing/billing.store";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import FilterBar, { FilterSearch } from "@/shared/components/FilterBar";
import { SummaryBar } from "@/shared/components/InfoField";
import { PageError } from "@/shared/components/PageState";
import RowActions from "@/shared/components/RowActions";
import TableCard from "@/shared/components/TableCard";
import TableGridCard, { TableGridCardField, TableGridCardFields } from "@/shared/components/TableGridCard";
import { TableCountPill } from "@/shared/components/TableToolbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import PageHeader from "@/shared/layout/PageHeader";
import { formatKg, formatMoney } from "@/shared/utils/format";

export default function BillingCampaignClientsPage() {
    const navigate = useNavigate();
    const { campaignId } = useParams<{ campaignId: string }>();
    const allClients = useBillingClients();
    const [search, setSearch] = useState("");
    const campaignClients = useMemo(() => allClients.filter(client => client.campaniaId === Number(campaignId) && client.cargas.length), [allClients, campaignId]);
    const campaign = allClients.find(client => client.campaniaId === Number(campaignId));
    if (!campaign) return <PageError title="Campaña no encontrada" message="No se encontró esta campaña en Facturación."
        back={{ to: "/facturacion-cobros", label: "Volver a campañas" }} />;
    const filtered = campaignClients.filter(client => `${client.nombreEmpresa} ${client.ruc}`.toLocaleLowerCase("es")
        .includes(search.trim().toLocaleLowerCase("es")));
    const currencies = [...new Set(campaignClients.flatMap(client => client.cargas.flatMap(load => load.facturas.filter(invoice => invoice.numeroFacturaElectronica).map(invoice => invoice.moneda))))];
    const totals = currencies.map(currency => {
        const invoices = campaignClients.flatMap(client => client.cargas.flatMap(load => load.facturas)).filter(invoice => invoice.moneda === currency);
        const billed = invoices.reduce((sum, invoice) => sum + billedAmount(invoice), 0);
        const collected = invoices.reduce((sum, invoice) => sum + collectedAmount(invoice), 0);
        const symbol = currency === "USD" ? "US$" : currency === "EUR" ? "€" : "S/";
        return { currency, billed, collected, symbol };
    });
    const open = (id: string) => navigate(`/facturacion-cobros/${campaignId}/clientes/${id}`);
    return <div className="px-4 py-5 sm:px-8 lg:px-14">
        <BillingCampaignContextBanner campaign={campaign} clientCount={campaignClients.length} caption="Clientes, facturas emitidas y cobros de la campaña" />
        <PageHeader icon={<Building2 size={24} />} title="Clientes de la campaña"
            description="Selecciona un cliente con cargas registradas para preparar facturas y seguir sus cobros." />
        {totals.length > 0 && <div className={`mb-7 grid gap-3 ${totals.length > 1 ? "lg:grid-cols-2" : ""}`}>{totals.map(total => <div key={total.currency} className="rounded-xl border border-border bg-card p-4">
            <p className="mb-2 text-xs font-bold text-ink-muted">Resumen en {total.currency}</p>
            <SummaryBar items={[{ label: "Facturado", value: `${total.symbol} ${formatMoney(total.billed)}` }, { label: "Cobrado", value: `${total.symbol} ${formatMoney(total.collected)}`, tone: "brand" }, { label: "Por cobrar", value: `${total.symbol} ${formatMoney(Math.max(0, total.billed - total.collected))}`, tone: "highlight" }]} />
        </div>)}</div>}
        <FilterBar className="mb-8" onClear={() => setSearch("")} canClear={Boolean(search)}>
            <FilterSearch value={search} onChange={setSearch} placeholder="Buscar cliente o RUC…" />
        </FilterBar>
        <TableCard icon={<Building2 size={24} />} title="Clientes con cargas registradas" description="Los kilos y precios provienen de sus contratos en esta campaña."
            headerRight={<TableCountPill icon={<Building2 size={16} />} count={filtered.length} singular="cliente" plural="clientes" />}
            isEmpty={!filtered.length} emptyTitle={search ? "Sin resultados para la búsqueda" : "Aún no hay clientes con cargas"}
            emptyDescription={search ? "Prueba otro nombre o limpia la búsqueda." : "La preparación de facturas comenzará al registrar una carga para un cliente."}
            emptyAction={search ? { label: "Limpiar búsqueda", onClick: () => setSearch(""), tone: "secondary" } : undefined}
            page={1} pageCount={1} onPageChange={() => {}}>
            <div className="flex flex-col gap-3 sm:hidden">{filtered.map(client => <TableGridCard key={client.id} accentColor="border-l-brand"
                icon={<Building2 size={18} />} title={client.nombreEmpresa} subtitle={client.ruc} actions={<RowActions primary={[{ label: "Ver facturación", icon: <Eye size={18} />, onClick: () => open(client.id) }]} />}>
                <TableGridCardFields><TableGridCardField label="Cargas" value={client.cargas.length} /><TableGridCardField label="Kilos contratados" value={`${formatKg(client.kilosContratados)} kg`} />
                    <TableGridCardField label="Importe contratado" value={contractedAmounts(client)} /></TableGridCardFields>
            </TableGridCard>)}</div>
            <div className="hidden overflow-hidden rounded-xl border border-border sm:block"><Table><TableHeader className={TABLE_HEAD_BG}><TableRow className="border-border hover:bg-transparent">
                {["Cliente", "RUC", "Cargas", "Kilos contratados", "Importe contratado", "Acciones"].map(label => <TableHead key={label} className="h-14 px-4 font-semibold text-ink">{label}</TableHead>)}
            </TableRow></TableHeader><TableBody>{filtered.map(client => <TableRow key={client.id} className="border-border">
                <TableCell className="relative h-20 px-4"><TableRowAccent color="bg-brand" /><TableRowLead icon={<Building2 size={18} />} title={client.nombreEmpresa} subtitle={client.canal} /></TableCell>
                <TableCell>{client.ruc || "—"}</TableCell><TableCell>{client.cargas.length}</TableCell><TableCell>{formatKg(client.kilosContratados)} kg</TableCell>
                <TableCell className="font-semibold">{contractedAmounts(client)}</TableCell>
                <TableCell><RowActions primary={[{ label: "Ver facturación", icon: <Eye size={18} />, onClick: () => open(client.id) }]} /></TableCell>
            </TableRow>)}</TableBody></Table></div>
        </TableCard>
    </div>;
}
