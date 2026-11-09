import { useState } from "react";
import { useParams } from "react-router-dom";
import { Banknote, Receipt } from "lucide-react";
import BillingRegisterCollectionModal from "@/modules/billing/components/BillingRegisterCollectionModal";
import { billingCampaignClosed, billingClientMatchesRoute, collectedAmount, invoiceBalance, invoiceIsIssued } from "@/modules/billing/billing.utils";
import { registerBillingCollection, useBillingClients } from "@/modules/billing/billing.store";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import FilterBar, { FilterSearch } from "@/shared/components/FilterBar";
import FilePreviewModal from "@/shared/components/FilePreviewModal";
import { SummaryBar } from "@/shared/components/InfoField";
import { PageError } from "@/shared/components/PageState";
import TableCard from "@/shared/components/TableCard";
import TableGridCard, { TableGridCardField, TableGridCardFields } from "@/shared/components/TableGridCard";
import { TableCountPill } from "@/shared/components/TableToolbar";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import PageHeader from "@/shared/layout/PageHeader";
import { formatDisplayDate, formatMoney } from "@/shared/utils/format";
import type { FileSource } from "@/shared/utils/fileSource";

const money = (value: number, currency: string) => `${currency === "USD" ? "US$" : currency === "EUR" ? "€" : "S/"} ${formatMoney(value)}`;

export default function BillingCollectionsPage() {
    const { campaignId, clientId, invoiceId } = useParams<{ campaignId: string; clientId: string; invoiceId: string }>();
    const client = useBillingClients().find(item => billingClientMatchesRoute(item, clientId) && item.campaniaId === Number(campaignId));
    const load = client?.cargas.find(item => item.facturas.some(invoice => invoice.id === invoiceId));
    const invoice = load?.facturas.find(item => item.id === invoiceId);
    const [search, setSearch] = useState("");
    const [registerOpen, setRegisterOpen] = useState(false);
    const [preview, setPreview] = useState<{ open: boolean; file: FileSource | null }>({ open: false, file: null });
    const back = `/facturacion-cobros/${campaignId}/clientes/${clientId}/facturas/${invoiceId}`;
    if (!client || !load || !invoice) return <PageError title="Factura no encontrada" message="No se encontró el historial de esta factura."
        back={{ to: back, label: "Volver a la factura" }} />;
    const query = search.trim().toLocaleLowerCase("es");
    const filtered = invoice.cobros.filter(item =>
        `${item.medio} ${item.referencia} ${item.fecha} ${formatDisplayDate(item.fecha)}`.toLocaleLowerCase("es").includes(query));
    const evidenceAction = (file?: FileSource | null) => file ? (
        <Button variant="link" className="h-auto max-w-full whitespace-normal px-0 text-left wrap-anywhere text-brand"
            onClick={() => setPreview({ open: true, file })}>
            {file.name}
        </Button>
    ) : "Sin documento";
    const balance = invoiceBalance(invoice);
    return <div className="px-4 py-5 sm:px-8 lg:px-14">
        <PageHeader icon={<Banknote size={24} />} title="Cobros de la factura"
            description={`${invoice.numeroFacturaElectronica || invoice.referenciaPreparacion} · ${client.nombreEmpresa} · ${client.campaniaNombre}`}
            action={invoiceIsIssued(invoice) && balance > 0 && !billingCampaignClosed(client)
                ? <Button size="xl" onClick={() => setRegisterOpen(true)}><Banknote size={18} />Registrar cobro</Button> : undefined} />
        <Card className="mb-7 gap-3 p-5 sm:p-6"><h2 className="text-lg font-bold text-ink">Saldo de la factura</h2>
            <SummaryBar items={[{ label: "Total", value: money(invoice.total, invoice.moneda) },
                { label: "Cobrado", value: money(collectedAmount(invoice), invoice.moneda), tone: "brand" },
                { label: "Pendiente", value: money(balance, invoice.moneda), tone: balance ? "highlight" : "brand" }]} />
        </Card>
        <FilterBar className="mb-8" onClear={() => setSearch("")} canClear={Boolean(search)}>
            <FilterSearch value={search} onChange={setSearch} placeholder="Buscar referencia, medio o fecha…" />
        </FilterBar>
        <TableCard icon={<Receipt size={24} />} title="Movimientos registrados" description="Abonos aplicados al saldo de esta factura."
            headerRight={<TableCountPill icon={<Banknote size={16} />} count={filtered.length} singular="cobro" plural="cobros" />}
            isEmpty={!filtered.length} emptyTitle={search ? "Sin cobros para esta búsqueda" : "Aún no hay cobros registrados"}
            emptyDescription={search ? "Prueba otra referencia o limpia la búsqueda." : "Registra el primer abono para empezar a conciliar la factura."}
            emptyAction={search ? { label: "Limpiar búsqueda", onClick: () => setSearch(""), tone: "secondary" } : undefined}
            page={1} pageCount={1} onPageChange={() => {}}>
            <div className="flex flex-col gap-3 sm:hidden">{filtered.map(item => <TableGridCard key={item.id} accentColor="border-l-brand"
                icon={<Banknote size={18} />} title={money(item.importe, invoice.moneda)} subtitle={formatDisplayDate(item.fecha)}>
                <TableGridCardFields><TableGridCardField label="Medio" value={item.medio} /><TableGridCardField label="Referencia" value={item.referencia} />
                    <TableGridCardField label="Evidencia" value={evidenceAction(item.evidencia)} className="col-span-2" /></TableGridCardFields>
            </TableGridCard>)}</div>
            <div className="hidden overflow-hidden rounded-xl border border-border sm:block"><Table><TableHeader className={TABLE_HEAD_BG}><TableRow className="border-border hover:bg-transparent">
                {["Fecha", "Importe", "Medio", "Referencia", "Evidencia"].map(label => <TableHead key={label} className="h-14 px-4 font-semibold text-ink">{label}</TableHead>)}
            </TableRow></TableHeader><TableBody>{filtered.map(item => <TableRow key={item.id} className="border-border">
                <TableCell className="relative h-20 px-4"><TableRowAccent color="bg-brand" /><TableRowLead icon={<Banknote size={18} />} title={formatDisplayDate(item.fecha)} /></TableCell>
                <TableCell className="font-semibold">{money(item.importe, invoice.moneda)}</TableCell><TableCell>{item.medio}</TableCell><TableCell>{item.referencia}</TableCell>
                <TableCell>{evidenceAction(item.evidencia)}</TableCell>
            </TableRow>)}</TableBody></Table></div>
        </TableCard>
        <FilePreviewModal open={preview.open} file={preview.file} onOpenChange={(open) => setPreview(current => ({ ...current, open }))} />
        <BillingRegisterCollectionModal open={registerOpen} onOpenChange={setRegisterOpen} client={client} load={load} invoice={invoice}
            onRegister={async (id, loadId, invoiceId, movement) => { await registerBillingCollection(id, loadId, invoiceId, movement); }} />
    </div>;
}
