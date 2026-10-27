import { useState } from "react";
import {
    CheckCircle2,
    ClipboardCheck,
    FileCheck2,
    FlaskConical,
    Plus,
    Save,
    Sprout,
    Users,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { InfoField, SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table";
import { Textarea } from "@/shared/components/ui/textarea";
import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import type { FileSource } from "@/shared/utils/fileSource";
import { formatDisplayDate, formatKg } from "@/shared/utils/format";
import type {
    QualityDeliveryLoadItem,
    QualityHarvestAdvance,
    QualityHarvestClosure,
    QualityHarvestOrganization,
} from "@/modules/quality/qualityOperations.demo";

interface QualityHarvestWizardModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    load: QualityDeliveryLoadItem | null;
    onSave: (
        loadId: string,
        payload: {
            organizacionCosecha: QualityHarvestOrganization;
            avancesCosecha: QualityHarvestAdvance[];
            cierreCosecha: QualityHarvestClosure;
        },
    ) => void;
    onOpenRemissionGuides: (load: QualityDeliveryLoadItem) => void;
}

const STEPS = [
    { id: 1, label: "1. Revisar análisis", icon: FlaskConical },
    { id: 2, label: "2. Preparar cosecha", icon: Users },
    { id: 3, label: "3. Registrar avances", icon: Sprout },
    { id: 4, label: "4. Cerrar cosecha", icon: ClipboardCheck },
    { id: 5, label: "5. Generar guía", icon: FileCheck2 },
] as const;

export default function QualityHarvestWizardModal({
    open,
    onOpenChange,
    load,
    onSave,
    onOpenRemissionGuides,
}: QualityHarvestWizardModalProps) {
    const [step, setStep] = useState<number>(1);
    const [org, setOrg] = useState<QualityHarvestOrganization>({
        jefeCuadrilla: "",
        personalAsignado: 15,
        fechaProgramadaInicio: "",
        jabas: 0,
        tijeras: 0,
        bines: 0,
        mallas: 0,
        otrosMateriales: "",
        movilidadTraslado: "",
        observaciones: "",
        confirmada: false,
    });
    const [avances, setAvances] = useState<QualityHarvestAdvance[]>([]);
    const [cierre, setCierre] = useState<QualityHarvestClosure>({
        fechaTermino: "",
        cosechaCompletada: false,
        informeFinalCosecha: null,
        solicitudPagoPersonal: null,
        solicitudPagoMovilidad: null,
        reciboPagoPersonal: null,
        reciboPagoMovilidad: null,
        registroCompraFruta: null,
    });

    // Nuevo avance de cosecha
    const [newAdvProductor, setNewAdvProductor] = useState("");
    const [newAdvFinca, setNewAdvFinca] = useState("");
    const [newAdvFecha, setNewAdvFecha] = useState("");
    const [newAdvKilos, setNewAdvKilos] = useState("");
    const [newAdvJabas, setNewAdvJabas] = useState("");
    const [newAdvResponsable, setNewAdvResponsable] = useState("");
    const [newAdvEvidencia, setNewAdvEvidencia] = useState<FileSource | null>(null);

    useResetOnToggle(open, () => {
        if (!load) return;
        setStep(1);
        setOrg({ ...load.organizacionCosecha });
        setAvances(load.avancesCosecha.map((a) => ({ ...a })));
        setCierre({ ...load.cierreCosecha });

        const firstProv = load.proveedoresCarga[0];
        setNewAdvProductor(firstProv?.proveedorNombre ?? "Segundo Teodoro Juárez Zeta");
        setNewAdvFinca(firstProv?.fincaNombre ?? "Fundo San Isidro");
        setNewAdvFecha(load.fechaProgramada);
        setNewAdvKilos("4500");
        setNewAdvJabas("225");
        setNewAdvResponsable(load.anotador);
        setNewAdvEvidencia(null);
    });

    if (!load) return null;

    const totalCosechado = avances.reduce((s, a) => s + a.kilosCosechados, 0);
    const totalJabas = avances.reduce((s, a) => s + a.jabas, 0);

    const handleAddAdvance = () => {
        const kg = Number(newAdvKilos) || 0;
        if (kg <= 0) return;
        const created: QualityHarvestAdvance = {
            id: `adv-${Date.now()}`,
            productor: newAdvProductor,
            finca: newAdvFinca,
            fechaReal: newAdvFecha || load.fechaProgramada,
            kilosCosechados: kg,
            jabas: Number(newAdvJabas) || 0,
            responsable: newAdvResponsable || org.jefeCuadrilla,
            evidencia: newAdvEvidencia,
        };
        setAvances((current) => [created, ...current]);
        setNewAdvKilos("");
        setNewAdvJabas("");
        setNewAdvEvidencia(null);
    };

    const handleSaveAll = () => {
        onSave(load.id, {
            organizacionCosecha: org,
            avancesCosecha: avances,
            cierreCosecha: cierre,
        });
        onOpenChange(false);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Sprout size={22} strokeWidth={2.2} />}
            title={`Flujo de Operación de Cosecha · ${load.codigoCarga}`}
            description={`${load.cliente} · ${load.campaniaNombre} (Exportación)`}
            size="xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} /> Cerrar
                    </Button>
                    {step > 1 && (
                        <Button variant="outline" size="xl" onClick={() => setStep((s) => s - 1)}>
                            ← Paso anterior
                        </Button>
                    )}
                    {step < 5 ? (
                        <Button size="xl" onClick={() => setStep((s) => s + 1)}>
                            Siguiente paso →
                        </Button>
                    ) : null}
                    <Button size="xl" onClick={handleSaveAll}>
                        <Save size={18} /> Guardar operación de cosecha
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                {/* Stepper de 5 pasos */}
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-brand-border/60 bg-brand-surface/25 p-3 sm:grid-cols-5">
                    {STEPS.map((item) => {
                        const Icon = item.icon;
                        const active = step === item.id;
                        const done = step > item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setStep(item.id)}
                                className={cn(
                                    "flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[12.5px] font-bold transition-all cursor-pointer",
                                    active
                                        ? "bg-brand text-white shadow-xs"
                                        : done
                                          ? "bg-brand-surface text-brand"
                                          : "bg-card text-ink-muted hover:text-ink",
                                )}
                            >
                                <Icon size={15} className="shrink-0" />
                                <span className="truncate">{item.label}</span>
                            </button>
                        );
                    })}
                </div>

                <SummaryBar
                    items={[
                        {
                            label: "Estado de revisión",
                            value: load.estadoRevision,
                            tone: load.estadoRevision === "Aprobada para cosecha" ? "brand" : "highlight",
                        },
                        {
                            label: "Kilos programados",
                            value: `${formatKg(load.kilosProgramados)} kg`,
                        },
                        {
                            label: "Kilos cosechados (Avances)",
                            value: `${formatKg(totalCosechado)} kg (${totalJabas} jabas)`,
                            tone: "brand",
                        },
                        {
                            label: "Estado de cierre",
                            value: cierre.cosechaCompletada ? "Cosecha cerrada" : "En operación",
                            tone: cierre.cosechaCompletada ? "brand" : "highlight",
                        },
                    ]}
                />

                {/* PASO 1: Revisar análisis */}
                {step === 1 && (
                    <ModalSection
                        title="Paso 1 · Revisión fitosanitaria y análisis de laboratorio"
                        aside="MTD Ceratitis y liberación de residuos"
                    >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <InfoField
                                label="Estado de liberación"
                                value={load.estadoRevision}
                            />
                            <InfoField
                                label="Registros MTD evaluados"
                                value={`${load.mtdRegistros.length} finca(s)`}
                            />
                            <InfoField
                                label="Muestras de laboratorio"
                                value={`${load.analisisLaboratorio.length} informe(s)`}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            {load.mtdRegistros.map((m) => (
                                <div
                                    key={m.id}
                                    className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5 text-[13px]"
                                >
                                    <span>
                                        <strong>{m.productor}</strong> · {m.finca} (SENASA {m.codigoSenasa})
                                    </span>
                                    <span className="font-extrabold text-brand">
                                        MTD: {m.mtdCalculado.toFixed(4)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </ModalSection>
                )}

                {/* PASO 2: Preparar cosecha (Organización) */}
                {step === 2 && (
                    <ModalSection
                        title="Paso 2 · Organización de cosecha y materiales de campo"
                        aside="Cuadrilla, herramientas y movilidad"
                    >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <InputField
                                id="hw-jefe-cuadrilla"
                                label="Jefe de cuadrilla / responsable"
                                required
                                value={org.jefeCuadrilla}
                                onChange={(v) => setOrg((c) => ({ ...c, jefeCuadrilla: v }))}
                            />
                            <InputField
                                id="hw-personal"
                                label="Personal asignado (personas)"
                                type="number"
                                value={String(org.personalAsignado)}
                                onChange={(v) => setOrg((c) => ({ ...c, personalAsignado: Number(v) || 0 }))}
                            />
                            <InputField
                                id="hw-fecha-inicio"
                                label="Fecha programada de inicio"
                                type="date"
                                value={org.fechaProgramadaInicio}
                                onChange={(v) => setOrg((c) => ({ ...c, fechaProgramadaInicio: v }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <InputField
                                id="hw-jabas"
                                label="Jabas asignadas"
                                type="number"
                                value={String(org.jabas)}
                                onChange={(v) => setOrg((c) => ({ ...c, jabas: Number(v) || 0 }))}
                            />
                            <InputField
                                id="hw-tijeras"
                                label="Tijeras de cosecha"
                                type="number"
                                value={String(org.tijeras)}
                                onChange={(v) => setOrg((c) => ({ ...c, tijeras: Number(v) || 0 }))}
                            />
                            <InputField
                                id="hw-bines"
                                label="Bines"
                                type="number"
                                value={String(org.bines)}
                                onChange={(v) => setOrg((c) => ({ ...c, bines: Number(v) || 0 }))}
                            />
                            <InputField
                                id="hw-mallas"
                                label="Mallas"
                                type="number"
                                value={String(org.mallas)}
                                onChange={(v) => setOrg((c) => ({ ...c, mallas: Number(v) || 0 }))}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <InputField
                                id="hw-otros-mat"
                                label="Otros materiales e insumos"
                                value={org.otrosMateriales}
                                onChange={(v) => setOrg((c) => ({ ...c, otrosMateriales: v }))}
                            />
                            <InputField
                                id="hw-movilidad"
                                label="Movilidad y traslado de cuadrilla"
                                value={org.movilidadTraslado}
                                onChange={(v) => setOrg((c) => ({ ...c, movilidadTraslado: v }))}
                            />
                        </div>

                        <FormField label="Observaciones de organización">
                            <Textarea
                                value={org.observaciones}
                                onChange={(e) => setOrg((c) => ({ ...c, observaciones: e.target.value }))}
                            />
                        </FormField>

                        <div className="flex items-center justify-between rounded-xl border border-brand-border bg-brand-surface/40 px-4 py-3">
                            <div>
                                <p className="text-[13.5px] font-bold text-ink">Organización confirmada</p>
                                <p className="text-[12px] text-ink-muted">
                                    Habilita el inicio del corte y acopio en las parcelas programadas.
                                </p>
                            </div>
                            <Switch
                                checked={org.confirmada}
                                onCheckedChange={(checked) => setOrg((c) => ({ ...c, confirmada: checked }))}
                            />
                        </div>
                    </ModalSection>
                )}

                {/* PASO 3: Avances por proveedor y finca */}
                {step === 3 && (
                    <div className="flex flex-col gap-5">
                        <ModalSection
                            title="Paso 3 · Registrar avance de cosecha por proveedor y finca"
                            aside="Cortes parciales o totales"
                        >
                            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-brand-border/60 bg-brand-surface/25 p-4 sm:grid-cols-3">
                                <InputField
                                    id="hw-adv-prod"
                                    label="Productor"
                                    value={newAdvProductor}
                                    onChange={setNewAdvProductor}
                                />
                                <InputField
                                    id="hw-adv-finca"
                                    label="Finca / Parcela"
                                    value={newAdvFinca}
                                    onChange={setNewAdvFinca}
                                />
                                <InputField
                                    id="hw-adv-fecha"
                                    label="Fecha real de cosecha"
                                    type="date"
                                    value={newAdvFecha}
                                    onChange={setNewAdvFecha}
                                />
                                <InputField
                                    id="hw-adv-kilos"
                                    label="Kilos cosechados"
                                    type="number"
                                    value={newAdvKilos}
                                    onChange={setNewAdvKilos}
                                />
                                <InputField
                                    id="hw-adv-jabas"
                                    label="Número de jabas"
                                    type="number"
                                    value={newAdvJabas}
                                    onChange={setNewAdvJabas}
                                />
                                <InputField
                                    id="hw-adv-resp"
                                    label="Responsable de campo"
                                    value={newAdvResponsable}
                                    onChange={setNewAdvResponsable}
                                />
                                <div className="sm:col-span-3">
                                    <FileDropzone
                                        label="Planilla o evidencia fotográfica del avance"
                                        file={newAdvEvidencia}
                                        onChange={setNewAdvEvidencia}
                                    />
                                </div>
                                <div className="flex justify-end sm:col-span-3">
                                    <Button type="button" variant="outline" onClick={handleAddAdvance}>
                                        <Plus size={16} /> Registrar avance
                                    </Button>
                                </div>
                            </div>
                        </ModalSection>

                        <ModalSection
                            title={`Avances registrados (${avances.length})`}
                            aside="Historial de cortes en campo"
                        >
                            <div className="overflow-x-auto rounded-xl border border-border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-brand-surface/60">
                                            <TableHead className="font-bold text-ink">Origen (Productor / Finca)</TableHead>
                                            <TableHead className="font-bold text-ink">Fecha</TableHead>
                                            <TableHead className="text-right font-bold text-ink">Kilos</TableHead>
                                            <TableHead className="text-right font-bold text-ink">Jabas</TableHead>
                                            <TableHead className="font-bold text-ink">Responsable</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {avances.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-bold text-ink">
                                                    {item.productor} ·{" "}
                                                    <span className="font-medium text-ink-muted">{item.finca}</span>
                                                </TableCell>
                                                <TableCell>{formatDisplayDate(item.fechaReal)}</TableCell>
                                                <TableCell className="text-right font-extrabold tabular-nums text-brand">
                                                    {formatKg(item.kilosCosechados)} kg
                                                </TableCell>
                                                <TableCell className="text-right font-bold tabular-nums">
                                                    {item.jabas}
                                                </TableCell>
                                                <TableCell className="text-[13px] text-ink-muted">
                                                    {item.responsable}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </ModalSection>
                    </div>
                )}

                {/* PASO 4: Cierre, pagos y compra de fruta */}
                {step === 4 && (
                    <ModalSection
                        title="Paso 4 · Cierre de cosecha, pagos de campo y compra de fruta"
                        aside="6 respaldos operativos"
                    >
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <InputField
                                id="hw-cierre-fecha"
                                label="Fecha de término de cosecha"
                                type="date"
                                value={cierre.fechaTermino}
                                onChange={(v) => setCierre((c) => ({ ...c, fechaTermino: v }))}
                            />
                            <div className="flex items-center justify-between rounded-xl border border-brand-border bg-brand-surface/40 px-4 py-3">
                                <div>
                                    <p className="text-[13.5px] font-bold text-ink">Cosecha completada</p>
                                    <p className="text-[12px] text-ink-muted">
                                        Confirma que la totalidad de la carga fue acopiada.
                                    </p>
                                </div>
                                <Switch
                                    checked={cierre.cosechaCompletada}
                                    onCheckedChange={(checked) =>
                                        setCierre((c) => ({ ...c, cosechaCompletada: checked }))
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FileDropzone
                                label="1. Informe final de cosecha"
                                file={cierre.informeFinalCosecha}
                                onChange={(file) => setCierre((c) => ({ ...c, informeFinalCosecha: file }))}
                            />
                            <FileDropzone
                                label="2. Solicitud de pago de personal"
                                file={cierre.solicitudPagoPersonal}
                                onChange={(file) => setCierre((c) => ({ ...c, solicitudPagoPersonal: file }))}
                            />
                            <FileDropzone
                                label="3. Solicitud de pago de movilidad"
                                file={cierre.solicitudPagoMovilidad}
                                onChange={(file) => setCierre((c) => ({ ...c, solicitudPagoMovilidad: file }))}
                            />
                            <FileDropzone
                                label="4. Recibo de pago del personal"
                                file={cierre.reciboPagoPersonal}
                                onChange={(file) => setCierre((c) => ({ ...c, reciboPagoPersonal: file }))}
                            />
                            <FileDropzone
                                label="5. Recibo de pago de movilidad"
                                file={cierre.reciboPagoMovilidad}
                                onChange={(file) => setCierre((c) => ({ ...c, reciboPagoMovilidad: file }))}
                            />
                            <FileDropzone
                                label="6. Registro de compra de fruta"
                                file={cierre.registroCompraFruta}
                                onChange={(file) => setCierre((c) => ({ ...c, registroCompraFruta: file }))}
                            />
                        </div>
                    </ModalSection>
                )}

                {/* PASO 5: Generación de guía de Exportación */}
                {step === 5 && (
                    <ModalSection
                        title="Paso 5 · Generación de Guía de Remisión SUNAT y enlace a Logística"
                        aside="Emisión de guías electrónicas"
                    >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <InfoField
                                label="Kilos cosechados listos"
                                value={`${formatKg(totalCosechado)} kg`}
                            />
                            <InfoField
                                label="Unidad y conductor"
                                value={`${load.placa} · ${load.chofer}`}
                            />
                            <InfoField
                                label="Guías emitidas"
                                value={`${load.guiasRemision.length} guía(s)`}
                            />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border bg-brand-surface/40 p-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 size={22} className="text-brand" />
                                <div>
                                    <p className="text-[14px] font-bold text-ink">
                                        Operación lista para Guía de Remisión Remitente SUNAT
                                    </p>
                                    <p className="text-[12.5px] text-ink-muted">
                                        Puedes abrir directamente el configurador de guías con los 8 bloques SUNAT y
                                        códigos UBIGEO.
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                onClick={() => {
                                    handleSaveAll();
                                    onOpenRemissionGuides(load);
                                }}
                            >
                                <FileCheck2 size={18} /> Configurar Guía de Remisión SUNAT
                            </Button>
                        </div>
                    </ModalSection>
                )}
            </div>
        </AppModal>
    );
}
