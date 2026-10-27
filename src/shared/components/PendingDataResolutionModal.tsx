import { useState } from "react";
import {
    CheckCircle2,
    ClipboardCheck,
    DollarSign,
    FileCheck2,
    Link2,
    PackageCheck,
    Scale,
    Truck,
    Wrench,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import type { FileSource } from "@/shared/utils/fileSource";

export type PendingTaskType =
    | "purchase-price"
    | "sale-price"
    | "breakdown"
    | "receipt"
    | "guide"
    | "load"
    | "link";

interface PendingDataResolutionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    loadCode: string;
    campaignName: string;
    initialTask?: PendingTaskType;
    onResolved?: (task: PendingTaskType, summary: string) => void;
}

const TASKS: readonly {
    id: PendingTaskType;
    label: string;
    shortLabel: string;
    description: string;
    icon: typeof DollarSign;
}[] = [
    {
        id: "purchase-price",
        label: "1. Precio de compra por kg (Proveedor)",
        shortLabel: "Precio compra",
        description: "Registra el precio acordado por kilo con el productor o acopiador en la campaña.",
        icon: DollarSign,
    },
    {
        id: "sale-price",
        label: "2. Precio de venta en contrato (Cliente)",
        shortLabel: "Precio venta",
        description: "Actualiza la tarifa de venta por kilo y moneda del contrato del cliente.",
        icon: DollarSign,
    },
    {
        id: "breakdown",
        label: "3. Desglose de kilos recibidos por proveedor",
        shortLabel: "Desglose planta",
        description: "Distribuye el peso neto de balanza entre los proveedores que participaron en el camión.",
        icon: Scale,
    },
    {
        id: "receipt",
        label: "4. Recepción y calidad en planta",
        shortLabel: "Recepción planta",
        description: "Completa el peso recibido en planta, resultado de calidad y reporte PDF de recepción.",
        icon: ClipboardCheck,
    },
    {
        id: "guide",
        label: "5. Guía de remisión SUNAT de la carga",
        shortLabel: "Guía SUNAT",
        description: "Asocia el número de Guía de Remisión Remitente y su respaldo electrónico.",
        icon: FileCheck2,
    },
    {
        id: "load",
        label: "6. Datos de carga en campo (Anotador)",
        shortLabel: "Datos de carga",
        description: "Registra los kilos y jabas/bines cargados en campo por proveedor.",
        icon: PackageCheck,
    },
    {
        id: "link",
        label: "7. Vinculación de entrega con transporte",
        shortLabel: "Vincular viaje",
        description: "Vincula la entrega programada con el transportista, placa y chofer ejecutor.",
        icon: Link2,
    },
];

export default function PendingDataResolutionModal({
    open,
    onOpenChange,
    loadCode,
    campaignName,
    initialTask = "receipt",
    onResolved,
}: PendingDataResolutionModalProps) {
    const [activeTask, setActiveTask] = useState<PendingTaskType>(initialTask);

    // Campos transversales rápidos
    const [precioCompraKg, setPrecioCompraKg] = useState("3.20");
    const [proveedorNombre, setProveedorNombre] = useState("Segundo Teodoro Juárez Zeta");

    const [precioVentaKg, setPrecioVentaKg] = useState("1.85");
    const [monedaVenta, setMonedaVenta] = useState<"USD" | "PEN">("USD");

    const [kilosProv1, setKilosProv1] = useState("12220");
    const [kilosProv2, setKilosProv2] = useState("7300");

    const [pesoPlantaKg, setPesoPlantaKg] = useState("14750");
    const [resultadoPlanta, setResultadoPlanta] = useState("Aceptada");
    const [archivoReporte, setArchivoReporte] = useState<FileSource | null>(null);

    const [numeroGuia, setNumeroGuia] = useState("EG07-000019");
    const [ubigeoPartida, setUbigeoPartida] = useState("200114");

    const [kilosCampo, setKilosCampo] = useState("14800");
    const [bultosCampo, setBultosCampo] = useState("37");

    const [transportista, setTransportista] = useState("Transportes Frigoríficos del Norte S.A.C.");
    const [placa, setPlaca] = useState("B8T-914");

    useResetOnToggle(open, () => {
        setActiveTask(initialTask);
    });

    const currentTaskMeta = TASKS.find((t) => t.id === activeTask) ?? TASKS[0];

    const handleCompleteTask = () => {
        onResolved?.(activeTask, currentTaskMeta.label);
        onOpenChange(false);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Wrench size={22} strokeWidth={2.2} />}
            title={`Completar datos pendientes · ${loadCode}`}
            description={`Resolución transversal sin salir de ${campaignName}`}
            size="xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleCompleteTask}>
                        <CheckCircle2 size={18} /> Guardar y desbloquear operación
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <SummaryBar
                    items={[
                        { label: "Carga seleccionada", value: loadCode, tone: "brand" },
                        { label: "Campaña", value: campaignName },
                        {
                            label: "Sub-formulario activo",
                            value: currentTaskMeta.shortLabel,
                            tone: "highlight",
                        },
                    ]}
                />

                {/* Selector de las 7 sub-tareas transversales */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                    {TASKS.map((t) => {
                        const Icon = t.icon;
                        const active = activeTask === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setActiveTask(t.id)}
                                className={cn(
                                    "flex flex-col items-start gap-1.5 rounded-xl border p-2.5 text-left text-[12px] font-bold transition-all cursor-pointer",
                                    active
                                        ? "border-brand bg-brand text-white shadow-xs"
                                        : "border-border bg-card text-ink-muted hover:border-brand-border hover:text-ink",
                                )}
                            >
                                <Icon size={15} />
                                <span className="line-clamp-2 leading-tight">{t.shortLabel}</span>
                            </button>
                        );
                    })}
                </div>

                <ModalSection
                    title={currentTaskMeta.label}
                    aside={currentTaskMeta.description}
                >
                    {activeTask === "purchase-price" && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <InputField
                                id="pd-prov-nom"
                                label="Proveedor participante"
                                required
                                value={proveedorNombre}
                                onChange={setProveedorNombre}
                            />
                            <InputField
                                id="pd-precio-compra"
                                label="Precio de compra por kg (S/)"
                                type="number"
                                required
                                value={precioCompraKg}
                                onChange={setPrecioCompraKg}
                            />
                        </div>
                    )}

                    {activeTask === "sale-price" && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="Moneda del contrato" required>
                                <Select
                                    value={monedaVenta}
                                    onValueChange={(v) => setMonedaVenta((v ?? "USD") as "USD" | "PEN")}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USD">Dólares (USD)</SelectItem>
                                        <SelectItem value="PEN">Soles (PEN)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormField>
                            <InputField
                                id="pd-precio-venta"
                                label="Precio de venta por kg"
                                type="number"
                                required
                                value={precioVentaKg}
                                onChange={setPrecioVentaKg}
                            />
                        </div>
                    )}

                    {activeTask === "breakdown" && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <InputField
                                id="pd-kg-prov1"
                                label="Kilos recibidos · Segundo Teodoro Juárez Zeta"
                                type="number"
                                required
                                value={kilosProv1}
                                onChange={setKilosProv1}
                            />
                            <InputField
                                id="pd-kg-prov2"
                                label="Kilos recibidos · María Elena Chiroque Bereche"
                                type="number"
                                required
                                value={kilosProv2}
                                onChange={setKilosProv2}
                            />
                        </div>
                    )}

                    {activeTask === "receipt" && (
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <InputField
                                    id="pd-peso-planta"
                                    label="Peso neto recibido en planta (kg)"
                                    type="number"
                                    required
                                    value={pesoPlantaKg}
                                    onChange={setPesoPlantaKg}
                                />
                                <FormField label="Resultado de recepción" required>
                                    <Select value={resultadoPlanta} onValueChange={(v) => setResultadoPlanta(v ?? "Aceptada")}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Aceptada">Aceptada</SelectItem>
                                            <SelectItem value="Aceptada con observaciones">
                                                Aceptada con observaciones
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormField>
                            </div>
                            <FileDropzone
                                label="Reporte de recepción y ticket de balanza (PDF)"
                                file={archivoReporte}
                                onChange={setArchivoReporte}
                            />
                        </div>
                    )}

                    {activeTask === "guide" && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <InputField
                                id="pd-num-guia"
                                label="Número de Guía de Remisión SUNAT"
                                required
                                value={numeroGuia}
                                onChange={setNumeroGuia}
                            />
                            <InputField
                                id="pd-ubigeo"
                                label="UBIGEO de partida (6 dígitos)"
                                required
                                value={ubigeoPartida}
                                onChange={setUbigeoPartida}
                            />
                        </div>
                    )}

                    {activeTask === "load" && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <InputField
                                id="pd-kg-campo"
                                label="Kilos reales cargados en camión"
                                type="number"
                                required
                                value={kilosCampo}
                                onChange={setKilosCampo}
                            />
                            <InputField
                                id="pd-bultos-campo"
                                label="Total envases (jabas / bines) cargados"
                                type="number"
                                required
                                value={bultosCampo}
                                onChange={setBultosCampo}
                            />
                        </div>
                    )}

                    {activeTask === "link" && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <InputField
                                id="pd-trans-link"
                                label="Empresa de transporte vinculada"
                                required
                                value={transportista}
                                onChange={setTransportista}
                            />
                            <InputField
                                id="pd-placa-link"
                                label="Placa de unidad asignada"
                                required
                                value={placa}
                                onChange={(v) => setPlaca(v.toUpperCase())}
                            />
                        </div>
                    )}
                </ModalSection>

                <div className="flex items-center gap-2 rounded-xl border border-brand-border/60 bg-brand-surface/30 px-4 py-2.5 text-[12.5px] font-medium text-ink-muted">
                    <Truck size={15} className="text-brand" />
                    <span>
                        Al guardar este formulario transversal, el dato queda actualizado en su módulo de origen y
                        habilita inmediatamente la Facturación o Liquidación de Compra.
                    </span>
                </div>
            </div>
        </AppModal>
    );
}
