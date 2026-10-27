import { History, Plus, Receipt, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import { SummaryBar } from "@/shared/components/InfoField";
import ModalSection from "@/shared/components/ModalSection";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { formatDisplayDate } from "@/shared/utils/format";
import type { SettlementPaymentItem } from "@/modules/purchase-settlement/purchaseSettlement.demo";

interface SettlementPaymentHistoryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    beneficiaryName: string;
    documentNumber: string;
    totalAmount: number;
    payments: SettlementPaymentItem[];
    onOpenRegisterPayment: () => void;
}

export default function SettlementPaymentHistoryModal({
    open,
    onOpenChange,
    beneficiaryName,
    documentNumber,
    totalAmount,
    payments,
    onOpenRegisterPayment,
}: SettlementPaymentHistoryModalProps) {
    const totalPagado = payments.reduce((s, p) => s + p.importe, 0);
    const saldoPendiente = Math.max(0, totalAmount - totalPagado);

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<History size={22} strokeWidth={2.2} />}
            title="Historial de pagos y comprobantes"
            description={`${beneficiaryName} · Liquidación ${documentNumber || "S/N"}`}
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
                                onOpenRegisterPayment();
                            }}
                        >
                            <Plus size={18} strokeWidth={2.5} /> Registrar pago
                        </Button>
                    )}
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <SummaryBar
                    items={[
                        {
                            label: "Total liquidado",
                            value: `S/ ${totalAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
                        },
                        {
                            label: "Total pagado",
                            value: `S/ ${totalPagado.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
                            tone: "brand",
                        },
                        {
                            label: "Saldo pendiente",
                            value: `S/ ${saldoPendiente.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
                            tone: saldoPendiente > 0 ? "highlight" : "brand",
                        },
                    ]}
                />

                <ModalSection
                    title="Movimientos de pago registrados"
                    aside={`${payments.length} abono(s)`}
                >
                    {payments.length === 0 ? (
                        <div className="rounded-xl border border-border bg-surface-page/40 p-6 text-center text-[13px] font-medium text-ink-muted">
                            Aún no se han registrado pagos para esta liquidación.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3.5">
                            {payments.map((pay) => (
                                <div
                                    key={pay.id}
                                    className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-page/50 p-4"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <span className="flex size-9 items-center justify-center rounded-full bg-brand-surface text-brand">
                                                <Receipt size={17} strokeWidth={2.3} />
                                            </span>
                                            <div>
                                                <p className="text-[14px] font-bold text-ink">
                                                    S/{" "}
                                                    {pay.importe.toLocaleString("es-PE", {
                                                        minimumFractionDigits: 2,
                                                    })}{" "}
                                                    · {pay.medio} ({pay.modo})
                                                </p>
                                                <p className="text-[12px] font-medium text-ink-muted">
                                                    Fecha: {formatDisplayDate(pay.fecha)} · Ref:{" "}
                                                    {pay.referencia}
                                                </p>
                                            </div>
                                        </div>
                                        <StatusBadge status="Pagado" />
                                    </div>
                                    {pay.observaciones && (
                                        <p className="text-[12.5px] font-medium text-ink-body">
                                            {pay.observaciones}
                                        </p>
                                    )}
                                    {pay.evidencia && (
                                        <FileDropzone
                                            label="Evidencia del movimiento"
                                            file={pay.evidencia}
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
