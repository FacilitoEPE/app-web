import { History, Plus, Receipt, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import { SummaryBar } from "@/shared/components/InfoField";
import ModalSection from "@/shared/components/ModalSection";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { formatDisplayDate } from "@/shared/utils/format";
import type { BillingClient, BillingInvoice } from "@/modules/billing/billing.models";

interface BillingCollectionHistoryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    client: BillingClient | null;
    invoice: BillingInvoice | null;
    onOpenRegisterCollection: () => void;
}

export default function BillingCollectionHistoryModal({
    open,
    onOpenChange,
    client,
    invoice,
    onOpenRegisterCollection,
}: BillingCollectionHistoryModalProps) {
    if (!client || !invoice) return null;

    const totalCobrado = invoice.cobros.reduce((s, c) => s + c.importe, 0);
    const saldoPendiente = Math.max(0, invoice.total - totalCobrado);
    const symbol = invoice.moneda === "EUR" ? "€" : invoice.moneda === "USD" ? "US$" : "S/";

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<History size={22} strokeWidth={2.2} />}
            title="Historial de cobros del documento"
            description={`${invoice.numeroFacturaElectronica || invoice.referenciaPreparacion} · ${client.nombreEmpresa}`}
            size="xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} strokeWidth={2.5} /> Cerrar
                    </Button>
                    {saldoPendiente > 0 && (
                        <Button
                            size="xl"
                            onClick={() => {
                                onOpenChange(false);
                                onOpenRegisterCollection();
                            }}
                        >
                            <Plus size={18} strokeWidth={2.5} /> Registrar cobro
                        </Button>
                    )}
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <SummaryBar
                    items={[
                        {
                            label: "Total del documento",
                            value: `${symbol} ${invoice.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
                        },
                        {
                            label: "Cobrado",
                            value: `${symbol} ${totalCobrado.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
                            tone: "brand",
                        },
                        {
                            label: "Saldo pendiente",
                            value: `${symbol} ${saldoPendiente.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
                            tone: saldoPendiente > 0 ? "highlight" : "brand",
                        },
                    ]}
                />

                <ModalSection
                    title="Abonos y movimientos registrados"
                    aside={<StatusBadge status={invoice.estado} />}
                >
                    {invoice.cobros.length === 0 ? (
                        <div className="rounded-xl border border-border bg-surface-page/40 p-6 text-center text-[13px] font-medium text-ink-muted">
                            Aún no se han registrado cobros para este documento.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3.5">
                            {invoice.cobros.map((col) => (
                                <div
                                    key={col.id}
                                    className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-page/50 p-4"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <span className="flex size-9 items-center justify-center rounded-full bg-brand-surface text-brand">
                                                <Receipt size={17} strokeWidth={2.3} />
                                            </span>
                                            <div>
                                                <p className="text-[14px] font-bold text-ink">
                                                    {symbol}{" "}
                                                    {col.importe.toLocaleString("es-PE", {
                                                        minimumFractionDigits: 2,
                                                    })}{" "}
                                                    · {col.medio}
                                                </p>
                                                <p className="text-[12px] font-medium text-ink-muted">
                                                    Fecha: {formatDisplayDate(col.fecha)} · Ref: {col.referencia}
                                                </p>
                                            </div>
                                        </div>
                                        <StatusBadge status="Cobrado" />
                                    </div>
                                    {col.observaciones && (
                                        <p className="text-[12.5px] font-medium text-ink-body">
                                            {col.observaciones}
                                        </p>
                                    )}
                                    {col.evidencia && (
                                        <FileDropzone
                                            label="Evidencia del movimiento"
                                            file={col.evidencia}
                                            onChange={() => {}}
                                            readOnly
                                            variant="horizontal"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ModalSection>
            </div>
        </AppModal>
    );
}
