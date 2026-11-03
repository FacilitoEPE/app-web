import { PackageCheck, X } from "lucide-react";
import type { QualityDeliveryLoadItem } from "@/modules/quality/qualityOperations.models";
import AppModal from "@/shared/components/AppModal";
import { InfoField, SummaryBar } from "@/shared/components/InfoField";
import ModalSection from "@/shared/components/ModalSection";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { formatDisplayDate, formatKg, formatMoney } from "@/shared/utils/format";

interface Props {
    load: QualityDeliveryLoadItem;
    onClose: () => void;
}

const packageTypes = [
    { name: "Jabas", loaded: "jabasCargadas", empty: "jabasVacias" },
    { name: "Bines", loaded: "binesCargados", empty: "binesVacios" },
    { name: "Mallas", loaded: "mallasCargadas", empty: "mallasVacias" },
] as const;

export default function QualityLoadDetailModal({ load, onClose }: Props) {
    const kilos = load.proveedoresCarga.reduce((total, row) => total + row.kilosCargados, 0);
    const expenses = [
        { label: "Movilidad", amount: load.viaticosMovilidad },
        { label: "Insumos del personal", amount: load.viaticosInsumos },
        { label: "Cuadrilla", amount: load.gastoCuadrilla },
        { label: "Anotadores", amount: load.gastoAnotadores },
    ];
    const investment = expenses.reduce((total, item) => total + item.amount, 0);

    return <AppModal
        open
        onOpenChange={open => { if (!open) onClose(); }}
        icon={<PackageCheck size={22} />}
        title="Detalle de la carga"
        description={`${load.codigoCarga} · ${load.cliente} · ${load.contratoRef}`}
        size="xl"
        footer={<Button variant="outline" onClick={onClose}><X size={18} />Cerrar</Button>}
    >
        <div className="flex flex-col gap-6">
            <SummaryBar items={[
                { label: "Kilos cargados", value: `${formatKg(kilos)} kg`, tone: "brand" },
                { label: "Kilos programados", value: `${formatKg(load.kilosProgramados)} kg` },
                { label: "Inversión total", value: `S/ ${formatMoney(investment)}` },
            ]} />

            <ModalSection title="Entrega y transporte">
                <div className="grid gap-4 sm:grid-cols-2">
                    <InfoField label="Fecha de carga" value={formatDisplayDate(load.fechaCargaReal)} />
                    <InfoField label="Destino" value={load.destino || "—"} />
                    <InfoField label="Transportista y camión" value={`${load.transportista} · ${load.placa}`} />
                    <InfoField label="Chofer" value={load.chofer || "—"} />
                    <InfoField label="Anotador / jefe de cuadrilla" value={load.anotador || "—"} />
                    {load.scope === "industria" && (load.cumpleRequisitosIndustria || load.motivoRechazoIndustria) &&
                        <InfoField label="Calidad de carga" variant="plain" value={<StatusBadge status={load.cumpleRequisitosIndustria ? "Aprobada" : "Rechazada"} />} />}
                </div>
                {load.scope === "industria" && !load.cumpleRequisitosIndustria && load.motivoRechazoIndustria &&
                    <InfoField label="Motivo del rechazo" value={load.motivoRechazoIndustria} multiline />}
            </ModalSection>

            <ModalSection title="Detalle por proveedor">
                <div className="flex flex-col gap-3">
                    {load.proveedoresCarga.map((provider, index) => {
                        const packages = packageTypes.filter(type => provider[type.loaded] > 0 || provider[type.empty] > 0);
                        return <div key={`${provider.proveedorId}-${index}`} className="overflow-hidden rounded-xl border border-border bg-card">
                            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border bg-brand-surface/40 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-ink">{provider.proveedorNombre}</p>
                                    <p className="text-xs text-ink-muted">{provider.fincaNombre}</p>
                                </div>
                                <strong className="whitespace-nowrap text-sm text-ink">{formatKg(provider.kilosCargados)} kg</strong>
                            </div>
                            <div className="flex flex-col gap-2 px-4 py-3 text-sm text-ink-body">
                                <p><span className="text-ink-muted">Variedad:</span> <span className="font-medium text-ink">{provider.variedad || "—"}</span></p>
                                {packages.map(type => <p key={type.name} className="flex flex-wrap justify-between gap-x-3">
                                    <span className="font-medium text-ink">{type.name}</span>
                                    <span>{formatKg(provider[type.loaded])} {type.name === "Bines" ? "cargados" : "cargadas"} · {formatKg(provider[type.empty])} {type.name === "Bines" ? "vacíos" : "vacías"}</span>
                                </p>)}
                                {packages.length === 0 && <p className="text-ink-muted">Sin bultos registrados.</p>}
                            </div>
                        </div>;
                    })}
                </div>
            </ModalSection>

            {investment > 0 && <ModalSection title="Gastos de carga">
                <div className="overflow-hidden rounded-xl border border-border text-sm">
                    {expenses.filter(item => item.amount > 0).map(item => <div key={item.label} className="flex justify-between gap-3 border-b border-border px-4 py-2.5">
                        <span className="text-ink-body">{item.label}</span><span className="font-medium text-ink">S/ {formatMoney(item.amount)}</span>
                    </div>)}
                </div>
            </ModalSection>}

            {load.observacionesCarga && <InfoField label="Observaciones de carga" value={load.observacionesCarga} multiline />}
        </div>
    </AppModal>;
}
