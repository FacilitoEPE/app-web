import { useEffect, useState } from "react";
import { AlertTriangle, FileSpreadsheet, Save, Scale, UserPlus, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import type { FileSource } from "@/shared/utils/fileSource";
import { formatKg } from "@/shared/utils/format";
import {
    UIT_LIMITE_SOLES,
    UIT_LIMITE_UNIDADES,
    UIT_VALOR_2026,
    type SettlementLinkedPerson,
    type SettlementLoad,
    type SettlementProviderEntry,
} from "@/modules/purchase-settlement/purchaseSettlement.demo";

interface SettlementProviderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    load: SettlementLoad | null;
    providerEntry: SettlementProviderEntry | null;
    onAddLinkedPerson: (
        loadId: string,
        providerEntryId: string,
        person: Omit<SettlementLinkedPerson, "id" | "acumuladoAnualPen">,
    ) => SettlementLinkedPerson;
    onSave: (
        loadId: string,
        providerEntryId: string,
        payload: {
            numeroLiquidacion: string;
            fechaLiquidacion: string;
            precioKg: number;
            personaLiquidadaId: string;
            personaLiquidadaNombre: string;
            personaLiquidadaDocumento: string;
            personaLiquidadaVinculo: string;
            confirmacionExcesoUit: boolean;
            archivoLiquidacion: FileSource | null;
            observaciones: string;
        },
    ) => void;
}

export default function SettlementProviderModal({
    open,
    onOpenChange,
    load,
    providerEntry,
    onAddLinkedPerson,
    onSave,
}: SettlementProviderModalProps) {
    const [numeroLiquidacion, setNumeroLiquidacion] = useState("");
    const [fechaLiquidacion, setFechaLiquidacion] = useState("");
    const [precioKg, setPrecioKg] = useState("");
    const [selectedPersonId, setSelectedPersonId] = useState("");
    const [confirmacionExcesoUit, setConfirmacionExcesoUit] = useState(false);
    const [archivoLiquidacion, setArchivoLiquidacion] = useState<FileSource | null>(null);
    const [observaciones, setObservaciones] = useState("");

    // Sub-formulario inline para "+ Agregar persona vinculada"
    const [showAddPerson, setShowAddPerson] = useState(false);
    const [newNombres, setNewNombres] = useState("");
    const [newApellidos, setNewApellidos] = useState("");
    const [newDocumento, setNewDocumento] = useState("");
    const [newVinculo, setNewVinculo] = useState("Cónyuge / Copropietario");

    useEffect(() => {
        if (!providerEntry || !open) return;
        setNumeroLiquidacion(providerEntry.numeroLiquidacion || "E001-000188");
        setFechaLiquidacion(providerEntry.fechaLiquidacion);
        setPrecioKg(String(providerEntry.precioKg));
        setSelectedPersonId(
            providerEntry.personaLiquidadaId || providerEntry.personasVinculadas[0]?.id || "",
        );
        setConfirmacionExcesoUit(providerEntry.confirmacionExcesoUit);
        setArchivoLiquidacion(providerEntry.archivoLiquidacion);
        setObservaciones(providerEntry.observaciones);
        setShowAddPerson(false);
    }, [providerEntry, open]);

    if (!load || !providerEntry) return null;

    const selectedPerson =
        providerEntry.personasVinculadas.find((p) => p.id === selectedPersonId) ??
        providerEntry.personasVinculadas[0];

    const priceNum = Number(precioKg) || 0;
    const totalCompra = providerEntry.kilosCargados * priceNum;
    const previoPen = selectedPerson?.acumuladoAnualPen ?? 0;
    const proyectadoPen = previoPen + totalCompra;
    const proyectadoUit = proyectadoPen / UIT_VALOR_2026;
    const pctUit = Math.min(100, (proyectadoPen / UIT_LIMITE_SOLES) * 100);
    const nearOrAboveUit = pctUit >= 90;

    const personItems = providerEntry.personasVinculadas.map((p) => ({
        value: p.id,
        label: `${p.nombres} ${p.apellidos} · ${p.tipoDocumento} ${p.numeroDocumento} (${p.vinculo})`,
    }));

    const handleCreatePerson = () => {
        if (!newNombres.trim() || !newApellidos.trim() || !newDocumento.trim()) return;
        const created = onAddLinkedPerson(load.id, providerEntry.id, {
            nombres: newNombres.trim(),
            apellidos: newApellidos.trim(),
            tipoDocumento: "DNI",
            numeroDocumento: newDocumento.trim(),
            vinculo: newVinculo.trim() || "Familiar vinculado",
        });
        setSelectedPersonId(created.id);
        setNewNombres("");
        setNewApellidos("");
        setNewDocumento("");
        setShowAddPerson(false);
    };

    const handleSubmit = () => {
        if (!selectedPerson) return;
        onSave(load.id, providerEntry.id, {
            numeroLiquidacion: numeroLiquidacion.trim() || "E001-000188",
            fechaLiquidacion,
            precioKg: priceNum,
            personaLiquidadaId: selectedPerson.id,
            personaLiquidadaNombre: `${selectedPerson.nombres} ${selectedPerson.apellidos}`,
            personaLiquidadaDocumento: selectedPerson.numeroDocumento,
            personaLiquidadaVinculo: selectedPerson.vinculo,
            confirmacionExcesoUit,
            archivoLiquidacion,
            observaciones: observaciones.trim(),
        });
        onOpenChange(false);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<FileSpreadsheet size={22} strokeWidth={2.2} />}
            title="Confirmar / Editar liquidación de compra (Proveedor)"
            description={`${providerEntry.proveedorNombre} · Carga ${load.codigo} · ${load.campaniaNombre}`}
            size="2xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button
                        size="xl"
                        disabled={nearOrAboveUit && !confirmacionExcesoUit}
                        onClick={handleSubmit}
                    >
                        <Save size={18} strokeWidth={2.5} /> Confirmar liquidación de compra
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <SummaryBar
                    items={[
                        {
                            label: "Kilos cargados",
                            value: `${formatKg(providerEntry.kilosCargados)} kg`,
                        },
                        {
                            label: "Precio de compra / kg",
                            value: `S/ ${priceNum.toFixed(2)}`,
                        },
                        {
                            label: "Total a liquidar",
                            value: `S/ ${totalCompra.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
                            tone: "brand",
                        },
                    ]}
                />

                <ModalSection title="1. Datos del comprobante de liquidación">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <InputField
                            id="sprov-num"
                            label="Número de liquidación SUNAT"
                            required
                            value={numeroLiquidacion}
                            onChange={setNumeroLiquidacion}
                        />
                        <InputField
                            id="sprov-fecha"
                            type="date"
                            label="Fecha de liquidación"
                            required
                            value={fechaLiquidacion}
                            onChange={setFechaLiquidacion}
                        />
                        <InputField
                            id="sprov-precio"
                            label="Precio acordado por kg"
                            required
                            step="0.01"
                            min={0}
                            unit="S/"
                            value={precioKg}
                            onChange={setPrecioKg}
                        />
                    </div>
                </ModalSection>

                <ModalSection
                    title="2. Persona de esta liquidación y trazabilidad"
                    aside={
                        <button
                            type="button"
                            onClick={() => setShowAddPerson((prev) => !prev)}
                            className="inline-flex items-center gap-1 text-[12px] font-bold text-brand hover:underline"
                        >
                            <UserPlus size={14} strokeWidth={2.5} />{" "}
                            {showAddPerson ? "Cancelar registro" : "+ Agregar persona vinculada"}
                        </button>
                    }
                >
                    <div className="flex flex-col gap-4">
                        <FormField
                            label="Persona natural a quien se emite la liquidación"
                            required
                            hint="Mantiene la trazabilidad con el proveedor y finca de origen de la carga."
                        >
                            <Select
                                items={personItems}
                                value={selectedPersonId}
                                onValueChange={(v) => v && setSelectedPersonId(v as string)}
                            >
                                <SelectTrigger
                                    aria-label="Persona de esta liquidación"
                                    className="h-11 rounded-lg bg-card font-semibold"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {personItems.map((item) => (
                                        <SelectItem key={item.value} value={item.value}>
                                            {item.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>

                        {showAddPerson && (
                            <div className="flex flex-col gap-4 rounded-2xl border border-brand-border bg-brand-surface/35 p-4">
                                <p className="text-[13px] font-bold text-ink">
                                    Registrar nueva persona vinculada al proveedor
                                </p>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                                    <InputField
                                        id="np-nombres"
                                        label="Nombres"
                                        variant="compact"
                                        required
                                        value={newNombres}
                                        onChange={setNewNombres}
                                    />
                                    <InputField
                                        id="np-apellidos"
                                        label="Apellidos"
                                        variant="compact"
                                        required
                                        value={newApellidos}
                                        onChange={setNewApellidos}
                                    />
                                    <InputField
                                        id="np-dni"
                                        label="N° DNI"
                                        variant="compact"
                                        required
                                        maxLength={8}
                                        value={newDocumento}
                                        onChange={setNewDocumento}
                                    />
                                    <InputField
                                        id="np-vinculo"
                                        label="Vínculo con proveedor"
                                        variant="compact"
                                        required
                                        value={newVinculo}
                                        onChange={setNewVinculo}
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button size="sm" onClick={handleCreatePerson}>
                                        <UserPlus size={15} strokeWidth={2.4} /> Guardar y seleccionar persona
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </ModalSection>

                {/* PANEL PERSONALIZADO: CONTROL UIT 2026 · LÍMITE 75 UIT */}
                <ModalSection
                    title={`3. Control UIT 2026 · Límite ${UIT_LIMITE_UNIDADES} UIT (S/ ${UIT_LIMITE_SOLES.toLocaleString("es-PE")})`}
                    aside={
                        <StatusBadge
                            status={
                                proyectadoPen >= UIT_LIMITE_SOLES
                                    ? "Límite superado"
                                    : nearOrAboveUit
                                        ? "Cerca del límite"
                                        : "Dentro del límite"
                            }
                        />
                    }
                >
                    <div className="flex flex-col gap-3.5 rounded-2xl border border-brand-border/70 bg-surface-page/50 p-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div>
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                                    Acumulado anual previo
                                </span>
                                <span className="text-[14px] font-bold tabular-nums text-ink">
                                    S/ {previoPen.toLocaleString("es-PE")}
                                </span>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                                    Compra actual
                                </span>
                                <span className="text-[14px] font-bold tabular-nums text-brand">
                                    + S/ {totalCompra.toLocaleString("es-PE")}
                                </span>
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                                    Acumulado proyectado
                                </span>
                                <span className="text-[14px] font-extrabold tabular-nums text-ink">
                                    S/ {proyectadoPen.toLocaleString("es-PE")} ({proyectadoUit.toFixed(1)} UIT)
                                </span>
                            </div>
                        </div>

                        <Progress value={pctUit} className="h-2.5" />

                        {nearOrAboveUit ? (
                            <div className="flex flex-col gap-3 rounded-xl border border-status-highlight/40 bg-status-highlight-surface p-3.5">
                                <div className="flex items-start gap-2.5 text-[12.5px] font-semibold text-status-highlight">
                                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                                    <span>
                                        Atención: Con esta compra la persona seleccionada alcanza el{" "}
                                        <strong>{pctUit.toFixed(1)}%</strong> del tope anual de 75 UIT. Confirma la
                                        autorización o selecciona una persona vinculada con saldo disponible.
                                    </span>
                                </div>
                                <div className="flex items-center justify-between rounded-lg bg-card/90 px-3 py-2">
                                    <span className="text-[12.5px] font-bold text-ink">
                                        Confirmo haber verificado el límite de 75 UIT para esta liquidación
                                    </span>
                                    <Switch
                                        checked={confirmacionExcesoUit}
                                        onCheckedChange={setConfirmacionExcesoUit}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-[12px] font-medium text-ink-muted">
                                <Scale size={15} className="text-brand" />
                                <span>
                                    Saldo disponible tras esta liquidación:{" "}
                                    <strong className="text-ink">
                                        S/ {Math.max(0, UIT_LIMITE_SOLES - proyectadoPen).toLocaleString("es-PE")}
                                    </strong>
                                </span>
                            </div>
                        )}
                    </div>
                </ModalSection>

                <ModalSection title="4. Comprobante adjunto y observaciones">
                    <div className="flex flex-col gap-4">
                        <FileDropzone
                            label="Liquidación de compra electrónica (PDF / XML)"
                            file={archivoLiquidacion}
                            onChange={(f) => setArchivoLiquidacion(f)}
                            variant="horizontal"
                            replaceable
                        />
                        <FormField id="sprov-obs" label="Observaciones" optional>
                            <Textarea
                                id="sprov-obs"
                                rows={2}
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                            />
                        </FormField>
                    </div>
                </ModalSection>
            </div>
        </AppModal>
    );
}
