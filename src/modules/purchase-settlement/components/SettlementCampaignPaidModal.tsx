import { useState } from "react";
import { CheckCircle2, Sprout, Truck, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import ModalSection from "@/shared/components/ModalSection";
import SegmentedControl from "@/shared/components/SegmentedControl";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { formatDisplayDate, formatKg } from "@/shared/utils/format";
import type { SettlementLoad } from "@/modules/purchase-settlement/purchaseSettlement.models";

interface SettlementCampaignPaidModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    campaniaNombre: string;
    loads: SettlementLoad[];
}

export default function SettlementCampaignPaidModal({
    open,
    onOpenChange,
    campaniaNombre,
    loads,
}: SettlementCampaignPaidModalProps) {
    const [tab, setTab] = useState<"proveedores" | "transportistas">("proveedores");

    const paidProviders = loads.flatMap((load) =>
        load.proveedores
            .filter((p) => p.pagos.length > 0)
            .map((p) => ({
                loadCode: load.codigo,
                prov: p,
                pagado: p.pagos.reduce((s, pay) => s + pay.importe, 0),
            })),
    );

    const paidCarriers = loads
        .filter((load) => load.transporte.pagos.length > 0)
        .map((load) => {
            const totalGastos = load.transporte.gastosReales.reduce((s, g) => s + g.monto, 0);
            const totalDoc = load.transporte.fleteCarga + totalGastos;
            const pagado = load.transporte.pagos.reduce((s, pay) => s + pay.importe, 0);
            return {
                loadCode: load.codigo,
                transporte: load.transporte,
                totalDoc,
                pagado,
            };
        });

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<CheckCircle2 size={22} strokeWidth={2.2} />}
            title={`Pagados · ${campaniaNombre}`}
            description="Consulta rápida de liquidaciones de proveedores y transportistas con pagos registrados en la campaña."
            size="xl"
            footer={
                <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                    <X size={18} strokeWidth={2.5} /> Cerrar
                </Button>
            }
        >
            <div className="flex flex-col gap-6">
                <SegmentedControl
                    options={[
                        {
                            label: `Proveedores con pagos (${paidProviders.length})`,
                            value: "proveedores",
                        },
                        {
                            label: `Transportistas con pagos (${paidCarriers.length})`,
                            value: "transportistas",
                        },
                    ]}
                    value={tab}
                    onChange={(v) => setTab(v as "proveedores" | "transportistas")}
                />

                {tab === "proveedores" ? (
                    <ModalSection title="Proveedores liquidados / pagados">
                        {paidProviders.length === 0 ? (
                            <div className="rounded-xl border border-border bg-surface-page/40 p-6 text-center text-[13px] font-medium text-ink-muted">
                                No hay pagos a proveedores registrados en esta campaña.
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {paidProviders.map(({ loadCode, prov, pagado }) => (
                                    <div
                                        key={prov.id}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-page/50 p-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="flex size-10 items-center justify-center rounded-full bg-brand-surface text-brand">
                                                <Sprout size={18} strokeWidth={2.3} />
                                            </span>
                                            <div>
                                                <p className="text-[14px] font-bold text-ink">
                                                    {prov.personaLiquidadaNombre}
                                                </p>
                                                <p className="text-[12px] font-medium text-ink-muted">
                                                    {loadCode} · Liquidación{" "}
                                                    {prov.numeroLiquidacion || "S/N"} ·{" "}
                                                    {formatDisplayDate(prov.fechaLiquidacion)} ·{" "}
                                                    {formatKg(prov.kilosCargados)} kg
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="text-right tabular-nums">
                                                <span className="block text-[11px] font-bold uppercase text-ink-muted">
                                                    Pagado / Total
                                                </span>
                                                <span className="text-[13.5px] font-extrabold text-brand">
                                                    {prov.moneda === 'USD' ? 'US$' : 'S/'} {pagado.toLocaleString("es-PE")} / {prov.moneda === 'USD' ? 'US$' : 'S/'}{" "}
                                                    {prov.total.toLocaleString("es-PE")}
                                                </span>
                                            </div>
                                            <StatusBadge status={prov.estado} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ModalSection>
                ) : (
                    <ModalSection title="Transportistas liquidados / pagados">
                        {paidCarriers.length === 0 ? (
                            <div className="rounded-xl border border-border bg-surface-page/40 p-6 text-center text-[13px] font-medium text-ink-muted">
                                No hay pagos a transportistas registrados en esta campaña.
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {paidCarriers.map(({ loadCode, transporte, totalDoc, pagado }) => (
                                    <div
                                        key={transporte.id}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-page/50 p-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="flex size-10 items-center justify-center rounded-full bg-brand-surface text-brand">
                                                <Truck size={18} strokeWidth={2.3} />
                                            </span>
                                            <div>
                                                <p className="text-[14px] font-bold text-ink">
                                                    {transporte.transportista}
                                                </p>
                                                <p className="text-[12px] font-medium text-ink-muted">
                                                    {loadCode} · Placa {transporte.placa} · Liquidación{" "}
                                                    {transporte.numeroLiquidacion || "S/N"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="text-right tabular-nums">
                                                <span className="block text-[11px] font-bold uppercase text-ink-muted">
                                                    Pagado / Total
                                                </span>
                                                <span className="text-[13.5px] font-extrabold text-brand">
                                                    {transporte.moneda === 'USD' ? 'US$' : 'S/'} {pagado.toLocaleString("es-PE")} / {transporte.moneda === 'USD' ? 'US$' : 'S/'}{" "}
                                                    {totalDoc.toLocaleString("es-PE")}
                                                </span>
                                            </div>
                                            <StatusBadge status={transporte.estado} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ModalSection>
                )}
            </div>
        </AppModal>
    );
}
