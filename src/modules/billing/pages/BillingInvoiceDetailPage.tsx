import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Banknote, Building2, CalendarDays, FileCheck2, FileSpreadsheet, History, Package, Pencil, Receipt, Wallet } from "lucide-react";
import BillingIssueInvoiceModal from "@/modules/billing/components/BillingIssueInvoiceModal";
import BillingPrepareInvoiceModal from "@/modules/billing/components/BillingPrepareInvoiceModal";
import BillingRegisterCollectionModal from "@/modules/billing/components/BillingRegisterCollectionModal";
import { billingCampaignClosed, billingClientMatchesRoute, collectedAmount, invoiceBalance, invoiceIsIssued } from "@/modules/billing/billing.utils";
import { issueBillingElectronicInvoice, registerBillingCollection, saveBillingInvoicePreparation, useBillingClients } from "@/modules/billing/billing.store";
import EntityOverviewCard from "@/shared/components/EntityOverviewCard";
import FileDropzone from '@/shared/components/FileDropzone';
import { InfoField } from "@/shared/components/InfoField";
import MetricCards from "@/shared/components/MetricCards";
import { PageError } from "@/shared/components/PageState";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import PageHeader from "@/shared/layout/PageHeader";
import { formatDisplayDate, formatKg, formatMoney } from "@/shared/utils/format";

const money = (value: number, currency: string) => `${currency === "USD" ? "US$" : currency === "EUR" ? "€" : "S/"} ${formatMoney(value)}`;

export default function BillingInvoiceDetailPage() {
    const navigate = useNavigate();
    const { campaignId, clientId, invoiceId } = useParams<{ campaignId: string; clientId: string; invoiceId: string }>();
    const clients = useBillingClients();
    const client = clients.find(item => billingClientMatchesRoute(item, clientId) && item.campaniaId === Number(campaignId));
    const load = client?.cargas.find(item => item.facturas.some(invoice => invoice.id === invoiceId));
    const invoice = load?.facturas.find(item => item.id === invoiceId);
    const [editOpen, setEditOpen] = useState(false);
    const [issueOpen, setIssueOpen] = useState(false);
    const [collectOpen, setCollectOpen] = useState(false);
    const back = `/facturacion-cobros/${campaignId}/clientes/${clientId}`;
    if (!client || !load || !invoice) return <PageError title="Factura no encontrada" message="No se encontró este documento para el cliente."
        back={{ to: back, label: "Volver a facturación" }} />;
    const issued = invoiceIsIssued(invoice);
    const paid = collectedAmount(invoice);
    const balance = invoiceBalance(invoice);
    const canEdit = !billingCampaignClosed(client);
    return <div className="px-4 py-5 sm:px-8 lg:px-14">
        <PageHeader icon={<Receipt size={24} />} title={issued ? "Detalle de la factura" : "Detalle de la preparación"}
            description={`${client.nombreEmpresa} · ${load.codigo} · ${client.campaniaNombre}`}
            action={canEdit && !issued && load.kilosCargados > 0 ? <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil size={18} />Editar preparación</Button> : undefined} />
        <div className="mb-6 grid gap-4 lg:grid-cols-[1.95fr_1fr]">
            <EntityOverviewCard avatar={<FileSpreadsheet />} eyebrow={issued ? "Factura emitida" : "Preparación de factura"}
                title={invoice.numeroFacturaElectronica || invoice.referenciaPreparacion} watermark={FileSpreadsheet}
                chips={[{ icon: <Receipt />, label: invoice.estado }, { icon: <Package />, label: load.codigo }]}
                details={[{ icon: <Building2 />, label: "Cliente", value: client.nombreEmpresa },
                    { icon: <CalendarDays />, label: "Preparada", value: formatDisplayDate(invoice.fechaPreparacion) },
                    { icon: <CalendarDays />, label: "Emitida", value: formatDisplayDate(invoice.fechaEmision) },
                    { icon: <Wallet />, label: "Vencimiento", value: formatDisplayDate(invoice.fechaVencimiento) }]} />
            <MetricCards label="Resumen de la factura" metrics={[
                { title: "Total", value: money(invoice.total, invoice.moneda), unit: "", description: issued ? "Facturado" : "Por facturar", icon: Receipt },
                { title: "Cobrado", value: money(paid, invoice.moneda), unit: "", description: `${invoice.cobros.length} movimientos`, icon: Banknote },
                { title: issued ? "Saldo" : "Por facturar", value: money(balance, invoice.moneda), unit: "", description: issued ? "Pendiente de cobro" : "Pendiente de emisión", icon: Wallet },
            ]} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
            <Card className="gap-4 p-5 sm:p-6"><h2 className="text-lg font-bold text-ink">Origen y preparación</h2>
                <div className="grid gap-3 sm:grid-cols-2"><InfoField label="Campaña" value={client.campaniaNombre} /><InfoField label="Cliente" value={client.nombreEmpresa} />
                    <InfoField label="RUC" value={client.ruc || "—"} /><InfoField label="Carga" value={load.codigo} />
                    <InfoField label="Kilos recibidos" value={`${formatKg(load.kilosRecibidos)} kg`} /><InfoField label="Kilos de la factura" value={`${formatKg(invoice.kilosFacturados)} kg`} />
                    <InfoField label="Precio contractual" value={`${money(invoice.precioUnitario, invoice.moneda)} / kg`} /><InfoField label="Referencia de preparación" value={invoice.referenciaPreparacion} />
                    <InfoField label="Descuento" value={money(invoice.descuento, invoice.moneda)} /><InfoField label="Cargos" value={money(invoice.cargos, invoice.moneda)} />
                    <InfoField label="Respaldo de recepción" value={load.reporteRecepcion?.name || "Pendiente"} />
                    <InfoField label="Adjunto de preparación" value={invoice.archivoPreparacion?.name || "Sin documento"} />
                    <InfoField label="Observaciones" value={invoice.observaciones || "—"} multiline className="sm:col-span-2" />
                </div>
            </Card>
            <Card className="gap-4 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold text-ink">Factura y cobros</h2><StatusBadge status={invoice.estado} /></div>
                <div className="grid gap-3 sm:grid-cols-2"><InfoField label="Número de factura" value={invoice.numeroFacturaElectronica || "Pendiente de emisión"} />
                    <InfoField label="Fecha de emisión" value={formatDisplayDate(invoice.fechaEmision)} />
                    <InfoField label="Vencimiento" value={formatDisplayDate(invoice.fechaVencimiento)} />
                    <InfoField label="Factura adjunta" value={invoice.archivoFacturaEmitida?.name || "Sin documento"} />
                    <InfoField label="Cobros registrados" value={invoice.cobros.length} /><InfoField label={issued ? "Saldo pendiente" : "Por facturar"} value={money(balance, invoice.moneda)} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">{!issued && canEdit && load.kilosCargados > 0 && <Button onClick={() => setIssueOpen(true)}><FileCheck2 size={18} />Registrar factura emitida</Button>}
                    {issued && <Button variant="outline" onClick={() => navigate(`${back}/facturas/${invoice.id}/cobros`)}><History size={18} />Ver historial de cobros</Button>}
                    {issued && balance > 0 && canEdit && <Button onClick={() => setCollectOpen(true)}><Banknote size={18} />Registrar cobro</Button>}
                </div>
            </Card>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {load.reporteRecepcion && <FileDropzone label="Reporte de recepción" file={load.reporteRecepcion} onChange={() => {}} readOnly variant="horizontal" />}
            {invoice.archivoPreparacion && <FileDropzone label="Documento de preparación" file={invoice.archivoPreparacion} onChange={() => {}} readOnly variant="horizontal" />}
            {invoice.archivoFacturaEmitida && <FileDropzone label="Factura emitida" file={invoice.archivoFacturaEmitida} onChange={() => {}} readOnly variant="horizontal" />}
        </div>
        <BillingPrepareInvoiceModal open={editOpen} onOpenChange={setEditOpen} client={client} load={load} editingInvoice={invoice}
            onSave={async (id, loadId, value) => { await saveBillingInvoicePreparation(id, loadId, value); }} />
        <BillingIssueInvoiceModal open={issueOpen} onOpenChange={setIssueOpen} client={client} load={load} invoice={invoice}
            onIssue={async (id, loadId, invoiceId, value) => { await issueBillingElectronicInvoice(id, loadId, invoiceId, value); }} />
        <BillingRegisterCollectionModal open={collectOpen} onOpenChange={setCollectOpen} client={client} load={load} invoice={invoice}
            onRegister={async (id, loadId, invoiceId, value) => { await registerBillingCollection(id, loadId, invoiceId, value); }} />
    </div>;
}
