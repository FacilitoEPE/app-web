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
import type { DriverLoad, DriverProviderLoadDetail } from "@/modules/driver-portal/driverPortal.models";

interface DriverLoadDataModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    load: DriverLoad | null;
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
            proveedores: DriverProviderLoadDetail[];
        },
    ) => void;
}

export default function DriverLoadDataModal({ open, onOpenChange, load, onSave }: DriverLoadDataModalProps) {
    const [fechaCarga, setFechaCarga] = useState("");
    const [anotador, setAnotador] = useState("");
    const [viaticosMovilidad, setViaticosMovilidad] = useState("");
    const [viaticosInsumos, setViaticosInsumos] = useState("");
    const [gastoCuadrilla, setGastoCuadrilla] = useState("");
    const [gastoAnotadores, setGastoAnotadores] = useState("");
    const [observacionesCarga, setObservacionesCarga] = useState("");
    const [proveedores, setProveedores] = useState<DriverProviderLoadDetail[]>([]);

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

    const updateProvider = (index: number, patch: Partial<DriverProviderLoadDetail>) => {
        setProveedores((current) =>
            current.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
        );
    };

    const totalKilos = proveedores.reduce((sum, p) => sum + (Number(p.kilosCargados) || 0), 0);
    const totalBultosCargados = proveedores.reduce(
        (sum, p) => sum + (Number(p.jabasCargadas) || 0) + (Number(p.binesCargados) || 0) + (Number(p.mallasCargadas) || 0),
        0,
    );
    const totalBultosVacios = proveedores.reduce(
        (sum, p) => sum + (Number(p.jabasVacias) || 0) + (Number(p.binesVacios) || 0) + (Number(p.mallasVacias) || 0),
        0,
    );

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
            title="Registrar datos de carga · Anotador / jefe de cuadrilla"
            description={`${load.codigo} · ${load.campaniaNombre} · Cliente: ${load.cliente}`}
            size="2xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleSubmit}>
                        <Save size={18} strokeWidth={2.5} /> Guardar datos de carga
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <SummaryBar
                    items={[
                        { label: "Kilos programados", value: `${formatKg(load.kilosProgramados)} kg` },
                        { label: "Total cargado en camión", value: `${formatKg(totalKilos)} kg`, tone: "brand" },
                        { label: "Bultos cargados / vacíos", value: `${totalBultosCargados} / ${totalBultosVacios}` },
                    ]}
                />

                <ModalSection title="1. Datos de la carga real">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InputField
                            id="load-fecha-carga"
                            type="date"
                            label="Fecha de carga"
                            required
                            value={fechaCarga}
                            onChange={setFechaCarga}
                        />
                        <InputField
                            id="load-anotador"
                            label="Anotador / jefe de cuadrilla"
                            required
                            placeholder="Nombre del responsable en campo"
                            value={anotador}
                            onChange={setAnotador}
                        />
                    </div>
                </ModalSection>

                <ModalSection
                    title="2. Detalle por proveedor y bultos en el camión"
                    aside={`${proveedores.length} proveedor(es)`}
                >
                    <div className="flex flex-col gap-4">
                        {proveedores.map((prov, index) => (
                            <div
                                key={`${prov.proveedorId}-${index}`}
                                className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-page/40 p-4"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex size-8 items-center justify-center rounded-full bg-brand-surface text-brand">
                                            <Sprout size={16} strokeWidth={2.3} />
                                        </span>
                                        <div>
                                            <p className="text-[14px] font-bold text-ink">{prov.proveedorNombre}</p>
                                            <p className="text-[11.5px] font-medium text-ink-muted">
                                                {prov.tipo} · {prov.fincaNombre}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-brand-surface px-3 py-1 text-[11.5px] font-bold text-brand">
                                        {formatKg(prov.kilosCargados)} kg
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                                    <InputField
                                        id={`prov-var-${index}`}
                                        label="Variedad"
                                        variant="compact"
                                        value={prov.variedad}
                                        onChange={(val) => updateProvider(index, { variedad: val })}
                                    />
                                    <InputField
                                        id={`prov-kg-${index}`}
                                        label="Kilos cargados"
                                        variant="compact"
                                        step="1"
                                        min={0}
                                        unit="kg"
                                        value={String(prov.kilosCargados)}
                                        onChange={(val) => updateProvider(index, { kilosCargados: Number(val) || 0 })}
                                    />
                                    <InputField
                                        id={`prov-jabas-c-${index}`}
                                        label="Jabas cargadas"
                                        variant="compact"
                                        step="1"
                                        min={0}
                                        value={String(prov.jabasCargadas)}
                                        onChange={(val) => updateProvider(index, { jabasCargadas: Number(val) || 0 })}
                                    />
                                    <InputField
                                        id={`prov-jabas-v-${index}`}
                                        label="Jabas vacías"
                                        variant="compact"
                                        step="1"
                                        min={0}
                                        value={String(prov.jabasVacias)}
                                        onChange={(val) => updateProvider(index, { jabasVacias: Number(val) || 0 })}
                                    />
                                    <InputField
                                        id={`prov-bines-c-${index}`}
                                        label="Bines cargados"
                                        variant="compact"
                                        step="1"
                                        min={0}
                                        value={String(prov.binesCargados)}
                                        onChange={(val) => updateProvider(index, { binesCargados: Number(val) || 0 })}
                                    />
                                    <InputField
                                        id={`prov-bines-v-${index}`}
                                        label="Bines vacíos"
                                        variant="compact"
                                        step="1"
                                        min={0}
                                        value={String(prov.binesVacios)}
                                        onChange={(val) => updateProvider(index, { binesVacios: Number(val) || 0 })}
                                    />
                                    <InputField
                                        id={`prov-mallas-c-${index}`}
                                        label="Mallas cargadas"
                                        variant="compact"
                                        step="1"
                                        min={0}
                                        value={String(prov.mallasCargadas)}
                                        onChange={(val) => updateProvider(index, { mallasCargadas: Number(val) || 0 })}
                                    />
                                    <InputField
                                        id={`prov-mallas-v-${index}`}
                                        label="Mallas vacías"
                                        variant="compact"
                                        step="1"
                                        min={0}
                                        value={String(prov.mallasVacias)}
                                        onChange={(val) => updateProvider(index, { mallasVacias: Number(val) || 0 })}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </ModalSection>

                <ModalSection title="3. Viáticos y gastos operativos de carga">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                        <InputField
                            id="load-viatico-movilidad"
                            label="Movilidad (viáticos)"
                            step="0.01"
                            min={0}
                            unit="S/"
                            value={viaticosMovilidad}
                            onChange={setViaticosMovilidad}
                        />
                        <InputField
                            id="load-viatico-insumos"
                            label="Insumos del personal"
                            step="0.01"
                            min={0}
                            unit="S/"
                            value={viaticosInsumos}
                            onChange={setViaticosInsumos}
                        />
                        <InputField
                            id="load-gasto-cuadrilla"
                            label="Gasto de cuadrilla"
                            step="0.01"
                            min={0}
                            unit="S/"
                            value={gastoCuadrilla}
                            onChange={setGastoCuadrilla}
                        />
                        <InputField
                            id="load-gasto-anotadores"
                            label="Gasto de anotadores"
                            step="0.01"
                            min={0}
                            unit="S/"
                            value={gastoAnotadores}
                            onChange={setGastoAnotadores}
                        />
                    </div>
                    <FormField id="load-observaciones" label="Observaciones de la carga" optional>
                        <Textarea
                            id="load-observaciones"
                            rows={2}
                            placeholder="Condición de estiba, precintos, horarios o incidencias en campo..."
                            value={observacionesCarga}
                            onChange={(e) => setObservacionesCarga(e.target.value)}
                        />
                    </FormField>
                </ModalSection>
            </div>
        </AppModal>
    );
}
