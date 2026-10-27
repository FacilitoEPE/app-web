import { useState } from "react";
import { PackageCheck, Save, Sprout, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import { SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { formatKg, formatMoney } from "@/shared/utils/format";
import type {
    QualityDeliveryLoadItem,
    QualityProviderLoadDetail,
} from "@/modules/quality/qualityOperations.demo";

interface QualityLoadFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    load: QualityDeliveryLoadItem | null;
    onSave: (
        loadId: string,
        payload: {
            fechaCargaReal: string;
            anotador: string;
            cumpleRequisitosIndustria: boolean;
            motivoRechazoIndustria: string;
            viaticosMovilidad: number;
            viaticosInsumos: number;
            gastoCuadrilla: number;
            gastoAnotadores: number;
            observacionesCarga: string;
            proveedoresCarga: QualityProviderLoadDetail[];
        },
    ) => void;
}

export default function QualityLoadFormModal({
    open,
    onOpenChange,
    load,
    onSave,
}: QualityLoadFormModalProps) {
    const [fechaCargaReal, setFechaCargaReal] = useState("");
    const [anotador, setAnotador] = useState("");
    const [cumpleRequisitos, setCumpleRequisitos] = useState(true);
    const [motivoRechazo, setMotivoRechazo] = useState("");
    const [viaticosMovilidad, setViaticosMovilidad] = useState("");
    const [viaticosInsumos, setViaticosInsumos] = useState("");
    const [gastoCuadrilla, setGastoCuadrilla] = useState("");
    const [gastoAnotadores, setGastoAnotadores] = useState("");
    const [observacionesCarga, setObservacionesCarga] = useState("");
    const [proveedores, setProveedores] = useState<QualityProviderLoadDetail[]>([]);

    useResetOnToggle(open, () => {
        if (!load) return;
        setFechaCargaReal(load.fechaCargaReal);
        setAnotador(load.anotador);
        setCumpleRequisitos(load.cumpleRequisitosIndustria);
        setMotivoRechazo(load.motivoRechazoIndustria);
        setViaticosMovilidad(String(load.viaticosMovilidad));
        setViaticosInsumos(String(load.viaticosInsumos));
        setGastoCuadrilla(String(load.gastoCuadrilla));
        setGastoAnotadores(String(load.gastoAnotadores));
        setObservacionesCarga(load.observacionesCarga);
        setProveedores(load.proveedoresCarga.map((p) => ({ ...p })));
    });

    if (!load) return null;

    const updateProvider = (index: number, patch: Partial<QualityProviderLoadDetail>) => {
        setProveedores((current) =>
            current.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
        );
    };

    const totalKilos = proveedores.reduce((s, p) => s + (Number(p.kilosCargados) || 0), 0);
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

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<PackageCheck size={22} strokeWidth={2.2} />}
            title={`Registrar datos de carga · Anotador / jefe de cuadrilla (${load.codigoCarga})`}
            description={`${load.cliente} · ${load.transportista} (${load.placa})`}
            size="xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} /> Cancelar
                    </Button>
                    <Button
                        size="xl"
                        onClick={() => {
                            onSave(load.id, {
                                fechaCargaReal,
                                anotador: anotador.trim(),
                                cumpleRequisitosIndustria: cumpleRequisitos,
                                motivoRechazoIndustria: motivoRechazo.trim(),
                                viaticosMovilidad: Number(viaticosMovilidad) || 0,
                                viaticosInsumos: Number(viaticosInsumos) || 0,
                                gastoCuadrilla: Number(gastoCuadrilla) || 0,
                                gastoAnotadores: Number(gastoAnotadores) || 0,
                                observacionesCarga: observacionesCarga.trim(),
                                proveedoresCarga: proveedores,
                            });
                            onOpenChange(false);
                        }}
                    >
                        <Save size={18} /> Guardar datos de carga
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <SummaryBar
                    items={[
                        {
                            label: "Total del camión (Kilos)",
                            value: `${formatKg(totalKilos)} kg`,
                            tone: "brand",
                        },
                        {
                            label: "Total bultos cargados",
                            value: `${totalBultos} envases`,
                        },
                        {
                            label: "Viáticos y gastos de carga",
                            value: `S/ ${formatMoney(totalGastos)}`,
                        },
                    ]}
                />

                {load.scope === "industria" && (
                    <ModalSection
                        title="Evaluación previa de aptitud (Industria)"
                        aside="Parámetros industriales"
                    >
                        <div className="flex items-center justify-between rounded-xl border border-brand-border bg-brand-surface/40 px-4 py-3">
                            <div>
                                <p className="text-[13.5px] font-bold text-ink">
                                    ¿La fruta cumple los requisitos industriales?
                                </p>
                                <p className="text-[12px] text-ink-muted">
                                    Desactiva si el lote presenta fermentación o daño severo para registrar rechazo.
                                </p>
                            </div>
                            <Switch checked={cumpleRequisitos} onCheckedChange={setCumpleRequisitos} />
                        </div>
                        {!cumpleRequisitos && (
                            <InputField
                                id="lf-motivo-rechazo"
                                label="Motivo del rechazo de lote industrial"
                                required
                                value={motivoRechazo}
                                onChange={setMotivoRechazo}
                                placeholder="Describe la causa del rechazo..."
                            />
                        )}
                    </ModalSection>
                )}

                <ModalSection
                    title="1. Datos de la carga real"
                    aside="Fecha efectiva y responsable"
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InputField
                            id="lf-fecha-carga"
                            label="Fecha de carga"
                            type="date"
                            required
                            value={fechaCargaReal}
                            onChange={setFechaCargaReal}
                        />
                        <InputField
                            id="lf-anotador"
                            label="Anotador / jefe de cuadrilla"
                            required
                            value={anotador}
                            onChange={setAnotador}
                        />
                    </div>
                </ModalSection>

                <ModalSection
                    title="2. Detalle por proveedor (Kilos y matriz de bultos)"
                    aside="Jabas, bines y mallas"
                >
                    <div className="flex flex-col gap-4">
                        {proveedores.map((prov, idx) => (
                            <div
                                key={prov.proveedorId}
                                className="flex flex-col gap-3.5 rounded-2xl border border-border/90 bg-card p-4"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Sprout size={17} className="text-brand" />
                                        <span className="text-[14px] font-bold text-ink">
                                            {prov.proveedorNombre} · {prov.fincaNombre} ({prov.rol})
                                        </span>
                                    </div>
                                    <div className="w-44">
                                        <Select
                                            value={prov.variedad}
                                            onValueChange={(v) => updateProvider(idx, { variedad: v ?? "Kent" })}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Kent">Variedad Kent</SelectItem>
                                                <SelectItem value="Edward">Variedad Edward</SelectItem>
                                                <SelectItem value="Keitt">Variedad Keitt</SelectItem>
                                                <SelectItem value="Hass">Variedad Hass</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    <InputField
                                        id={`lf-kg-${prov.proveedorId}`}
                                        label="Kilos cargados"
                                        type="number"
                                        value={String(prov.kilosCargados)}
                                        onChange={(v) =>
                                            updateProvider(idx, { kilosCargados: Number(v) || 0 })
                                        }
                                    />
                                    <InputField
                                        id={`lf-jc-${prov.proveedorId}`}
                                        label="Jabas cargadas"
                                        type="number"
                                        value={String(prov.jabasCargadas)}
                                        onChange={(v) =>
                                            updateProvider(idx, { jabasCargadas: Number(v) || 0 })
                                        }
                                    />
                                    <InputField
                                        id={`lf-jv-${prov.proveedorId}`}
                                        label="Jabas vacías"
                                        type="number"
                                        value={String(prov.jabasVacias)}
                                        onChange={(v) =>
                                            updateProvider(idx, { jabasVacias: Number(v) || 0 })
                                        }
                                    />
                                    <InputField
                                        id={`lf-bc-${prov.proveedorId}`}
                                        label="Bines cargados"
                                        type="number"
                                        value={String(prov.binesCargados)}
                                        onChange={(v) =>
                                            updateProvider(idx, { binesCargados: Number(v) || 0 })
                                        }
                                    />
                                    <InputField
                                        id={`lf-bv-${prov.proveedorId}`}
                                        label="Bines vacíos"
                                        type="number"
                                        value={String(prov.binesVacios)}
                                        onChange={(v) =>
                                            updateProvider(idx, { binesVacios: Number(v) || 0 })
                                        }
                                    />
                                    <InputField
                                        id={`lf-mc-${prov.proveedorId}`}
                                        label="Mallas cargadas"
                                        type="number"
                                        value={String(prov.mallasCargadas)}
                                        onChange={(v) =>
                                            updateProvider(idx, { mallasCargadas: Number(v) || 0 })
                                        }
                                    />
                                    <InputField
                                        id={`lf-mv-${prov.proveedorId}`}
                                        label="Mallas vacías"
                                        type="number"
                                        value={String(prov.mallasVacias)}
                                        onChange={(v) =>
                                            updateProvider(idx, { mallasVacias: Number(v) || 0 })
                                        }
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </ModalSection>

                <ModalSection
                    title="3. Viáticos y gastos de carga (S/)"
                    aside="Movilidad, insumos, cuadrilla y anotadores"
                >
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <InputField
                            id="lf-viatico-mov"
                            label="Movilidad (S/)"
                            type="number"
                            value={viaticosMovilidad}
                            onChange={setViaticosMovilidad}
                        />
                        <InputField
                            id="lf-viatico-ins"
                            label="Insumos personal (S/)"
                            type="number"
                            value={viaticosInsumos}
                            onChange={setViaticosInsumos}
                        />
                        <InputField
                            id="lf-gasto-cuad"
                            label="Gasto cuadrilla (S/)"
                            type="number"
                            value={gastoCuadrilla}
                            onChange={setGastoCuadrilla}
                        />
                        <InputField
                            id="lf-gasto-anot"
                            label="Gasto anotadores (S/)"
                            type="number"
                            value={gastoAnotadores}
                            onChange={setGastoAnotadores}
                        />
                    </div>
                    <FormField label="Observaciones de carga">
                        <Textarea
                            value={observacionesCarga}
                            onChange={(e) => setObservacionesCarga(e.target.value)}
                            placeholder="Condiciones de estiba, precintos o notas de campo..."
                        />
                    </FormField>
                </ModalSection>
            </div>
        </AppModal>
    );
}
