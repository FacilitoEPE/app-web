import { contractedAmounts } from '@/modules/billing/billing.utils';
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Banknote, Building2, Eye, FileCheck2, FileSpreadsheet, History, Mail, Phone, Plus, Receipt, User, Wallet } from "lucide-react";
import BillingCampaignContextBanner from "@/modules/billing/components/BillingCampaignContextBanner";
import BillingIssueInvoiceModal from "@/modules/billing/components/BillingIssueInvoiceModal";
import BillingPrepareInvoiceModal from "@/modules/billing/components/BillingPrepareInvoiceModal";
import BillingRegisterCollectionModal from "@/modules/billing/components/BillingRegisterCollectionModal";
import type { BillingInvoice, BillingLoad } from "@/modules/billing/billing.models";
import { billingAvailableKg, billingCampaignClosed, billingClientMatchesRoute, billingLoadReady, collectedAmount, invoiceBalance, invoiceIsIssued } from "@/modules/billing/billing.utils";
import { issueBillingElectronicInvoice, registerBillingCollection, saveBillingInvoicePreparation, useBillingClients } from "@/modules/billing/billing.store";
import EntityOverviewCard from "@/shared/components/EntityOverviewCard";
import { InfoField, SummaryBar } from "@/shared/components/InfoField";
import { PageError } from "@/shared/components/PageState";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import PageHeader from "@/shared/layout/PageHeader";
import { formatDisplayDate, formatKg, formatMoney } from "@/shared/utils/format";

type Target = { load: BillingLoad; invoice: BillingInvoice };
const money = (value: number, currency: string) => `${currency === "USD" ? "US$" : currency === "EUR" ? "€" : "S/"} ${formatMoney(value)}`;

export default function BillingClientWorkspacePage() {
    const navigate = useNavigate();
    const { campaignId, clientId } = useParams<{ campaignId: string; clientId: string }>();
    const clients = useBillingClients();
    const client = clients.find(item => billingClientMatchesRoute(item, clientId) && item.campaniaId === Number(campaignId));
    const [prepare, setPrepare] = useState<{ load: BillingLoad; invoice: BillingInvoice | null } | null>(null);
    const [issue, setIssue] = useState<Target | null>(null);
    const [collection, setCollection] = useState<Target | null>(null);
    if (!client) return <PageError title="Cliente no encontrado" message="No se encontró este cliente en la campaña."
        back={{ to: `/facturacion-cobros/${campaignId}`, label: "Volver a clientes" }} />;
    const campaignClients = clients.filter(item => item.campaniaId === client.campaniaId && item.cargas.length);
    const canEdit = !billingCampaignClosed(client);
    const invoiceRoute = (invoiceId: string) => `/facturacion-cobros/${campaignId}/clientes/${clientId}/facturas/${invoiceId}`;
    return <div className="px-4 py-5 sm:px-8 lg:px-14">
        <BillingCampaignContextBanner campaign={client} clientCount={campaignClients.length} caption={`Facturación de ${client.nombreEmpresa}`} />
        <PageHeader icon={<Receipt size={24} />} title="Cargas y facturación del cliente"
            description={`${client.nombreEmpresa} · ${client.campaniaNombre}. Prepara cada factura desde el peso recibido y registra después su emisión y cobros.`} />
        <div className="mb-7 grid gap-4 lg:grid-cols-[1.95fr_1fr]">
            <EntityOverviewCard avatar={<Building2 />} eyebrow={`Cliente · ${client.canal}`} title={client.nombreEmpresa} watermark={Building2}
                chips={[{ icon: <Receipt />, label: `RUC ${client.ruc || "sin registrar"}` }]}
                details={[{ icon: <User />, label: "Contacto", value: client.contacto || "—" }, { icon: <Phone />, label: "Teléfono", value: client.telefono || "—" }, { icon: <Mail />, label: "Correo", value: client.correo || "—" },
                    { icon: <Wallet />, label: "Kilos contratados", value: `${formatKg(client.kilosContratados)} kg` },
                    { icon: <Receipt />, label: "Precio contractual", value: client.contratosCount === 1 ? `${money(client.precioPorKg, client.moneda)} / kg` : "Según contrato de cada carga" }]} />
            <Card className="gap-4 p-5 sm:p-6"><h2 className="text-lg font-bold text-ink">Resumen del cliente</h2>
                <InfoField label="Cargas registradas" value={client.cargas.length} />
                <InfoField label="Contratos" value={client.contratosCount} />
                <InfoField label="Documentos" value={client.cargas.reduce((sum, load) => sum + load.facturas.length, 0)} />
                <InfoField label="Importe contratado" value={contractedAmounts(client)} />
            </Card>
        </div>
        <div className="mb-4"><h2 className="text-xl font-bold text-ink">Cargas del cliente</h2><p className="text-sm text-ink-muted">Una carga puede distribuirse en varias preparaciones o facturas; los cobros se registran sobre la factura emitida.</p></div>
        <div className="grid gap-5">{client.cargas.map((load, index) => {
            const available = billingAvailableKg(load);
            const ready = billingLoadReady(load);
            return <Card key={load.id} className="gap-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3"><div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand">Carga {index + 1}</p>
                    <h3 className="text-lg font-bold text-ink">{load.codigo}</h3>
                    <p className="text-sm text-ink-muted">Recepción: {formatDisplayDate(load.fechaRecepcion)} · {formatKg(load.kilosCargados)} kg cargados</p>
                </div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={ready ? "Completa" : "Por completar"} />
                    {canEdit && load.kilosCargados > 0 && !load.respaldoLogisticoCompleto && <Button variant="outline" onClick={() => navigate(`/logistica-despacho/${campaignId}/cargas/${load.id}/recepcion`)}>Completar recepción</Button>}
                    {canEdit && load.precioVentaKg <= 0 && <Button variant="outline" onClick={() => navigate(`/campaigns/${campaignId}/clients/${load.requirementId}/contracts`)}>Revisar contrato</Button>}
                    {canEdit && ready && available > 0 && <Button onClick={() => setPrepare({ load, invoice: null })}><Plus size={17} />Preparar factura</Button>}
                </div></div>
                <SummaryBar items={[{ label: "Kilos cargados", value: `${formatKg(load.kilosCargados)} kg` }, { label: "Kilos recibidos", value: load.kilosRecibidos ? `${formatKg(load.kilosRecibidos)} kg` : "Pendiente", tone: "brand" },
                    { label: "Kilos disponibles", value: `${formatKg(available)} kg` }, { label: "Precio de venta", value: `${money(load.precioVentaKg, load.moneda)} / kg` }]} />
                {!ready && <p className="rounded-xl border border-status-highlight-border bg-status-highlight-surface p-3 text-sm text-ink-body">
                    {load.kilosCargados <= 0 ? "Completa los kilos de la carga en Calidad antes de preparar o registrar otra factura." : "Para preparar la factura se requieren peso, resultado y reporte de recepción en Logística, además del precio contractual."}
                </p>}
                {load.reporteRecepcion && <InfoField label="Reporte de recepción" value={load.reporteRecepcion.name} />}
                <div className="grid gap-3">{load.facturas.map(invoice => {
                    const issued = invoiceIsIssued(invoice);
                    const paid = collectedAmount(invoice);
                    const balance = invoiceBalance(invoice);
                    return <div key={invoice.id} className="rounded-xl border border-border bg-surface-page/40 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold text-ink">{issued ? `Factura ${invoice.numeroFacturaElectronica}` : `Preparación ${invoice.referenciaPreparacion}`}</p>
                            <p className="mt-1 text-xs text-ink-muted">{formatDisplayDate(issued ? invoice.fechaEmision : invoice.fechaPreparacion)} · {formatKg(invoice.kilosFacturados)} kg · Vence {formatDisplayDate(invoice.fechaVencimiento)}</p></div>
                            <StatusBadge status={invoice.estado} /></div>
                        <div className="my-4 grid gap-2 sm:grid-cols-3"><InfoField label={issued ? "Total facturado" : "Importe por facturar"} value={money(invoice.total, invoice.moneda)} />
                            <InfoField label="Cobrado" value={money(paid, invoice.moneda)} /><InfoField label={issued ? "Saldo" : "Por facturar"} value={money(balance, invoice.moneda)} /></div>
                        <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => navigate(invoiceRoute(invoice.id))}><Eye size={16} />Ver detalle</Button>
                            {!issued && canEdit && load.kilosCargados > 0 && <><Button variant="outline" size="sm" onClick={() => setPrepare({ load, invoice })}><FileSpreadsheet size={16} />Editar preparación</Button>
                                <Button size="sm" onClick={() => setIssue({ load, invoice })}><FileCheck2 size={16} />Registrar factura emitida</Button></>}
                            {issued && <><Button variant="outline" size="sm" onClick={() => navigate(`${invoiceRoute(invoice.id)}/cobros`)}><History size={16} />Historial de cobros</Button>
                                {balance > 0 && canEdit && <Button size="sm" onClick={() => setCollection({ load, invoice })}><Banknote size={16} />Registrar cobro</Button>}</>}
                        </div>
                    </div>;
                })}</div>
                {!load.facturas.length && <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-ink-muted">Aún no hay preparaciones ni facturas para esta carga.</p>}
            </Card>;
        })}</div>
        <BillingPrepareInvoiceModal open={Boolean(prepare)} onOpenChange={open => { if (!open) setPrepare(null); }} client={client}
            load={prepare?.load ?? null} editingInvoice={prepare?.invoice ?? null}
            onSave={async (id, loadId, invoice) => { await saveBillingInvoicePreparation(id, loadId, invoice); }} />
        <BillingIssueInvoiceModal open={Boolean(issue)} onOpenChange={open => { if (!open) setIssue(null); }} client={client}
            load={issue?.load ?? null} invoice={issue?.invoice ?? null}
            onIssue={async (id, loadId, invoiceId, payload) => { await issueBillingElectronicInvoice(id, loadId, invoiceId, payload); }} />
        <BillingRegisterCollectionModal open={Boolean(collection)} onOpenChange={open => { if (!open) setCollection(null); }} client={client}
            load={collection?.load ?? null} invoice={collection?.invoice ?? null}
            onRegister={async (id, loadId, invoiceId, movement) => { await registerBillingCollection(id, loadId, invoiceId, movement); }} />
    </div>;
}
