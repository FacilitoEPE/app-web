import RequiredMark from "@/shared/components/RequiredMark";
import { annualBeforeSettlement, importeParaUit } from '@/modules/purchase-settlement/settlementUit.utils';
import { suggestSettlementNumber } from '@/modules/purchase-settlement/settlementNumber.utils';
import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { useState } from "react";
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
    getUitParameters,
    type SettlementLinkedPerson,
    type SettlementLoad,
    type SettlementProviderEntry,
} from "@/modules/purchase-settlement/purchaseSettlement.models";

interface SettlementProviderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    load: SettlementLoad | null;
    providerEntry: SettlementProviderEntry | null;
    existingNumbers: string[];
    onAddLinkedPerson: (
        loadId: string,
        providerEntryId: string,
        person: Omit<SettlementLinkedPerson, "id" | "acumuladoAnualPen">,
    ) => SettlementLinkedPerson | Promise<SettlementLinkedPerson>;
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
    ) => void | Promise<void>;
}

export default function SettlementProviderModal({
    open,
    onOpenChange,
    load,
    providerEntry,
    existingNumbers,
    onAddLinkedPerson,
    onSave,
}: SettlementProviderModalProps) {
    const [numeroLiquidacion, setNumeroLiquidacion] = useState("");
    const [fechaLiquidacion, setFechaLiquidacion] = useState("");
    const [selectedPersonId, setSelectedPersonId] = useState("");
    const [confirmacionExcesoUit, setConfirmacionExcesoUit] = useState(false);
    const [archivoLiquidacion, setArchivoLiquidacion] = useState<FileSource | null>(null);
    const [observaciones, setObservaciones] = useState("");
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    // Sub-formulario inline para "+ Agregar persona vinculada"
    const [showAddPerson, setShowAddPerson] = useState(false);
    const [newNombres, setNewNombres] = useState("");
    const [newApellidos, setNewApellidos] = useState("");
    const [newTipoDocumento, setNewTipoDocumento] = useState('DNI');
    const [newDocumento, setNewDocumento] = useState("");
    const [newVinculo, setNewVinculo] = useState("Cónyuge / Copropietario");
    const [personError, setPersonError] = useState('');

    useResetOnToggle(open, () => {
        if (!providerEntry || !open) return;
        const date = providerEntry.fechaLiquidacion || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
        setNumeroLiquidacion(providerEntry.numeroLiquidacion || suggestSettlementNumber(existingNumbers, date, 'LC'));
        setFechaLiquidacion(date);
        setSelectedPersonId(providerEntry.personaLiquidadaId || "");
        setConfirmacionExcesoUit(providerEntry.confirmacionExcesoUit);
        setArchivoLiquidacion(providerEntry.archivoLiquidacion);
        setObservaciones(providerEntry.observaciones);
        setShowAddPerson(false);
        setPersonError('');
        setFormError('');
        setSaving(false);
    });

    if (!load || !providerEntry) return null;

    const selectedPerson = providerEntry.personasVinculadas.find((p) => p.id === selectedPersonId);

    const priceNum = providerEntry.precioKg;
    const symbol = providerEntry.moneda === 'USD' ? 'US$' : 'S/';
    const totalCompra = (providerEntry.kilosReconocidos ?? 0) * priceNum;
    const liquidationYear = Number(fechaLiquidacion.slice(0, 4));
    const uit = getUitParameters(liquidationYear);
    const uitValue = uit?.value ?? 0;
    const uitLimit = uit?.limit ?? 0;
    const limitSoles = uitValue * uitLimit;
    const previoPen = annualBeforeSettlement(providerEntry, selectedPerson?.id ?? '', Number(fechaLiquidacion.slice(0, 4)) || new Date().getFullYear());
    const proyectadoPen = previoPen + importeParaUit(totalCompra, providerEntry.moneda ?? 'PEN');
    const proyectadoUit = uitValue > 0 ? proyectadoPen / uitValue : 0;
    const percentUit = limitSoles > 0 ? (proyectadoPen / limitSoles) * 100 : 0;
    const pctUit = Math.min(100, percentUit);
    const nearOrAboveUit = percentUit >= 90;

    const personItems = providerEntry.personasVinculadas.map((p) => ({
        value: p.id,
        label: `${p.nombres} ${p.apellidos} · ${p.tipoDocumento} ${p.numeroDocumento} (${p.vinculo})`,
    }));

    const handleCreatePerson = async () => {
        if (!newNombres.trim() || !newApellidos.trim() || !newDocumento.trim() || !newVinculo.trim()) {
            setPersonError('Completa los datos de identidad y el vínculo.');
            return;
        }
        if (newTipoDocumento === 'DNI' && !/^\d{8}$/.test(newDocumento.trim())) {
            setPersonError('El DNI debe tener 8 dígitos.');
            return;
        }
        if (providerEntry.personasVinculadas.some(person => person.tipoDocumento === newTipoDocumento && person.numeroDocumento === newDocumento.trim())) {
            setPersonError('Esta persona ya está vinculada al proveedor.');
            return;
        }
        try {
        const created = await onAddLinkedPerson(load.id, providerEntry.id, {
            nombres: newNombres.trim(),
            apellidos: newApellidos.trim(),
            tipoDocumento: newTipoDocumento,
            numeroDocumento: newDocumento.trim(),
            vinculo: newVinculo.trim() || "Familiar vinculado",
        });
        setSelectedPersonId(created.id);
        setNewNombres("");
        setNewApellidos("");
        setNewDocumento("");
        setPersonError('');
        setShowAddPerson(false);
        } catch (cause) {
            setPersonError(cause instanceof Error ? cause.message : 'No se pudo vincular a la persona.');
        }
    };

    const handleSubmit = async () => {
        if (saving || !selectedPerson || !numeroLiquidacion.trim() || !fechaLiquidacion || totalCompra <= 0 || !uitValue || !uitLimit) return;
        setSaving(true);
        setFormError('');
        try {
        await onSave(load.id, providerEntry.id, {
            numeroLiquidacion: numeroLiquidacion.trim() || "",
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
        } catch (cause) {
            setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar la liquidación.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppModal
            busy={saving}
            open={open}
            onOpenChange={onOpenChange}
            icon={<FileSpreadsheet size={22} strokeWidth={2.2} />}
            title={providerEntry.estado === 'Por liquidar' ? 'Registrar liquidación de compra' : 'Editar liquidación de compra'}
            description={`${providerEntry.proveedorNombre} · Carga ${load.codigo} · ${load.campaniaNombre}`}
            size="2xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button
                        size="xl"
                        disabled={saving || !selectedPerson || !numeroLiquidacion.trim() || !fechaLiquidacion || totalCompra <= 0 || !uitValue || !uitLimit || (proyectadoPen >= limitSoles && !confirmacionExcesoUit)}
                        onClick={handleSubmit}
                    >
                        <Save size={18} strokeWidth={2.5} /> {saving ? 'Guardando…' : 'Confirmar liquidación de compra'}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                {!uit && <p role="alert" className="text-sm text-destructive">No hay parámetro UIT para el año de la liquidación. Elige un año configurado.</p>}
                {formError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{formError}</p>}
                <SummaryBar
                    items={[
                        {
                            label: "Kilos reconocidos",
                            value: `${formatKg(providerEntry.kilosReconocidos ?? 0)} kg`,
                        },
                        {
                            label: "Precio de compra / kg",
                            value: `${symbol} ${priceNum.toFixed(2)}`,
                        },
                        {
                            label: "Total a liquidar",
                            value: `${symbol} ${totalCompra.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
                            tone: "brand",
                        },
                    ]}
                />

                <ModalSection title="1. Datos del comprobante de liquidación">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <InputField
                            id="sprov-num"
                            label="Número de liquidación"
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
                        <div className="rounded-xl border border-border bg-surface-page/40 px-4 py-2.5 text-sm text-ink">
                            <span className="block text-xs font-semibold text-ink-muted">Precio acordado por kg</span>
                            <strong>{symbol} {priceNum.toFixed(2)}</strong>
                        </div>
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
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                                        id="np-doc"
                                        label="Número de documento"
                                        variant="compact"
                                        required
                                        maxLength={newTipoDocumento === 'DNI' ? 8 : 20}
                                        value={newDocumento}
                                        onChange={setNewDocumento}
                                    />
                                    <FormField label="Tipo de documento" required>
                                        <Select items={[{ value: 'DNI', label: 'DNI' }, { value: 'Carnet de extranjeria', label: 'Carné de extranjería' }, { value: 'Pasaporte', label: 'Pasaporte' }]} value={newTipoDocumento} onValueChange={value => value && setNewTipoDocumento(value as string)}>
                                            <SelectTrigger aria-label="Tipo de documento de la persona"><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="DNI">DNI</SelectItem><SelectItem value="Carnet de extranjeria">Carné de extranjería</SelectItem><SelectItem value="Pasaporte">Pasaporte</SelectItem></SelectContent>
                                        </Select>
                                    </FormField>
                                    <InputField
                                        id="np-vinculo"
                                        label="Vínculo con proveedor"
                                        variant="compact"
                                        required
                                        value={newVinculo}
                                        onChange={setNewVinculo}
                                    />
                                </div>
                                {personError && <p role="alert" className="text-sm text-destructive">{personError}</p>}
                                <div className="flex justify-end">
                                    <Button size="sm" onClick={handleCreatePerson}>
                                        <UserPlus size={15} strokeWidth={2.4} /> Guardar y seleccionar persona
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </ModalSection>

                <ModalSection
                    title={`3. Control UIT ${liquidationYear || '—'} · Límite ${uitLimit} UIT (S/ ${limitSoles.toLocaleString("es-PE")})`}
                    aside={
                        <StatusBadge
                            status={
                                proyectadoPen >= limitSoles
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
                                    + S/ {importeParaUit(totalCompra, providerEntry.moneda ?? 'PEN').toLocaleString("es-PE")}
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
                                        Con esta compra la persona seleccionada llega al{" "}
                                        <strong>{percentUit.toFixed(1)}%</strong> del límite anual de 75 UIT.
                                        Revisa su acumulado antes de guardar.
                                    </span>
                                </div>
                                {proyectadoPen >= limitSoles && <div className="flex items-center justify-between rounded-lg bg-card/90 px-3 py-2">
                                    <span className="text-[12.5px] font-bold text-ink">
                                        He revisado el aviso del límite anual de la persona seleccionada <RequiredMark />
                                    </span>
                                    <Switch
                                        checked={confirmacionExcesoUit}
                                        onCheckedChange={setConfirmacionExcesoUit}
                                    />
                                </div>}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-[12px] font-medium text-ink-muted">
                                <Scale size={15} className="text-brand" />
                                <span>
                                    Saldo disponible tras esta liquidación:{" "}
                                    <strong className="text-ink">
                                        S/ {Math.max(0, limitSoles - proyectadoPen).toLocaleString("es-PE")}
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
