import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { useState } from "react";
import { PackageCheck, Save, Sprout, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import { SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatKg } from "@/shared/utils/format";
import type { LogisticsLoad, LogisticsProviderBreakdown } from "@/modules/logistics/logistics.models";

interface LogisticsPurchasesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    load: LogisticsLoad | null;
    onSave: (
        loadId: string,
        payload: {
            fechaCarga: string;
            anotador: string;
            viaticosMovilidad: number;
            viaticosInsumos: number;
            gastoCuadrilla: number;
            gastoAnotadores: number;
            observacionesCarga: string;
            proveedores: LogisticsProviderBreakdown[];
        },
    ) => void;
}

export default function LogisticsPurchasesModal({
    open,
    onOpenChange,
    load,
    onSave,
}: LogisticsPurchasesModalProps) {
    const [fechaCarga, setFechaCarga] = useState("");
    const [anotador, setAnotador] = useState("");
    const [viaticosMovilidad, setViaticosMovilidad] = useState("");
    const [viaticosInsumos, setViaticosInsumos] = useState("");
    const [gastoCuadrilla, setGastoCuadrilla] = useState("");
    const [gastoAnotadores, setGastoAnotadores] = useState("");
    const [observacionesCarga, setObservacionesCarga] = useState("");
    const [proveedores, setProveedores] = useState<LogisticsProviderBreakdown[]>([]);

    useResetOnToggle(open, () => {
        if (!load || !open) return;
        setFechaCarga(load.fechaCarga);
        setAnotador(load.anotador);
        setViaticosMovilidad(String(load.viaticosMovilidad));
        setViaticosInsumos(String(load.viaticosInsumos));
        setGastoCuadrilla(String(load.gastoCuadrilla));
        setGastoAnotadores(String(load.gastoAnotadores));
        setObservacionesCarga(load.observacionesCarga);
        setProveedores(load.proveedores.map((p) => ({ ...p })));
    });

    if (!load) return null;

    const updateProvider = (index: number, patch: Partial<LogisticsProviderBreakdown>) => {
        setProveedores((current) =>
            current.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
        );
    };

    const totalCargados = proveedores.reduce((s, p) => s + (Number(p.kilosCargados) || 0), 0);
    const totalBultos = proveedores.reduce(
        (s, p) =>
            s +
            (Number(p.jabasCargadas) || 0) +
            (Number(p.binesCargados) || 0) +
            (Number(p.mallasCargadas) || 0),
        0,
    );
    const totalGastos =
        (Number(viaticosMovilidad) || 0) +
        (Number(viaticosInsumos) || 0) +
        (Number(gastoCuadrilla) || 0) +
        (Number(gastoAnotadores) || 0);

    const handleSubmit = async () => {
        await onSave(load.id, {
            fechaCarga,
            anotador: anotador.trim() || "Anotador de campo",
            viaticosMovilidad: Number(viaticosMovilidad) || 0,
            viaticosInsumos: Number(viaticosInsumos) || 0,
            gastoCuadrilla: Number(gastoCuadrilla) || 0,
            gastoAnotadores: Number(gastoAnotadores) || 0,
            observacionesCarga: observacionesCarga.trim(),
            proveedores,
        });
        onOpenChange(false);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<PackageCheck size={22} strokeWidth={2.2} />}
            title="Compras de la carga · Kilos, bultos y gastos"
            description={`${load.codigo} · ${load.cliente} · Camión ${load.placa}`}
            size="2xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleSubmit}>
                        <Save size={18} strokeWidth={2.5} /> Guardar compras de carga
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <SummaryBar
                    items={[
                        { label: "Total kilos cargados", value: `${formatKg(totalCargados)} kg`, tone: "brand" },
                        { label: "Bultos cargados", value: `${totalBultos} und.` },
                        { label: "Viáticos y gastos", value: `S/ ${totalGastos.toFixed(2)}`, tone: "highlight" },
                    ]}
                />

                <ModalSection title="1. Responsable y fecha de carga en campo">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InputField
                            id="log-pur-fecha"
                            type="date"
                            label="Fecha de carga"
                            required
                            value={fechaCarga}
                            onChange={setFechaCarga}
                        />
                        <InputField
                            id="log-pur-anotador"
                            label="Anotador / jefe de cuadrilla"
                            required
                            value={anotador}
                            onChange={setAnotador}
                        />
                    </div>
                </ModalSection>

                <ModalSection
                    title="2. Proveedores en el camión (kilos y bultos)"
                    aside={`${proveedores.length} proveedor(es)`}
                >
                    <div className="flex flex-col gap-4">
                        {proveedores.map((prov, idx) => (
                            <div
                                key={prov.proveedorId}
                                className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface-page/40 p-4"
                            >
                                <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex size-8 items-center justify-center rounded-full bg-brand-surface text-brand">
                                            <Sprout size={16} strokeWidth={2.3} />
                                        </span>
                                        <div>
                                            <p className="text-[13.5px] font-bold text-ink">{prov.proveedorNombre}</p>
                                            <p className="text-[11.5px] font-medium text-ink-muted">
                                                {prov.tipo} · {prov.fincaNombre}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-brand-surface px-3 py-0.5 text-[11.5px] font-bold text-brand">
                                        {formatKg(prov.kilosCargados)} kg
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <InputField
                                        id={`lp-var-${idx}`}
                                        label="Variedad"
                                        variant="compact"
                                        value={prov.variedad}
                                        onChange={(v) => updateProvider(idx, { variedad: v })}
                                    />
                                    <InputField
                                        id={`lp-kg-${idx}`}
                                        label="Kilos cargados"
                                        variant="compact"
                                        step="1"
                                        min={0}
                                        unit="kg"
                                        value={String(prov.kilosCargados)}
                                        onChange={(v) => updateProvider(idx, { kilosCargados: Number(v) || 0 })}
                                    />
                                    <InputField
                                        id={`lp-jc-${idx}`}
                                        label="Jabas cargadas"
                                        variant="compact"
                                        step="1"
                                        min={0}
                                        value={String(prov.jabasCargadas)}
                                        onChange={(v) => updateProvider(idx, { jabasCargadas: Number(v) || 0 })}
                                    />
                                    <InputField
                                        id={`lp-jv-${idx}`}
                                        label="Jabas vacías"
                                        variant="compact"
                                        step="1"
                                        min={0}
                                        value={String(prov.jabasVacias)}
                                        onChange={(v) => updateProvider(idx, { jabasVacias: Number(v) || 0 })}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </ModalSection>

                <ModalSection title="3. Viáticos y gastos de carga">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                        <InputField
                            id="lp-movilidad"
                            label="Gasto de movilidad"
                            step="0.01"
                            min={0}
                            unit="S/"
                            value={viaticosMovilidad}
                            onChange={setViaticosMovilidad}
                        />
                        <InputField
                            id="lp-insumos"
                            label="Insumos del personal"
                            step="0.01"
                            min={0}
                            unit="S/"
                            value={viaticosInsumos}
                            onChange={setViaticosInsumos}
                        />
                        <InputField
                            id="lp-cuadrilla"
                            label="Cuadrilla"
                            step="0.01"
                            min={0}
                            unit="S/"
                            value={gastoCuadrilla}
                            onChange={setGastoCuadrilla}
                        />
                        <InputField
                            id="lp-anotadores"
                            label="Anotadores"
                            step="0.01"
                            min={0}
                            unit="S/"
                            value={gastoAnotadores}
                            onChange={setGastoAnotadores}
                        />
                    </div>
                    <FormField id="lp-obs" label="Observaciones de carga" optional>
                        <Textarea
                            id="lp-obs"
                            rows={2}
                            value={observacionesCarga}
                            onChange={(e) => setObservacionesCarga(e.target.value)}
                        />
                    </FormField>
                </ModalSection>
            </div>
        </AppModal>
    );
}
