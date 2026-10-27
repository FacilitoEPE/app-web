import { useState } from "react";
import {
    AlertTriangle,
    Bug,
    CheckCircle2,
    FlaskConical,
    Plus,
    Sprout,
    X,
} from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table";
import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import type { FileSource } from "@/shared/utils/fileSource";
import { formatDisplayDate } from "@/shared/utils/format";
import type {
    QualityDeliveryLoadItem,
    QualityLabAnalysisRecord,
    QualityMtdProducerRecord,
    QualityReviewStatus,
} from "@/modules/quality/qualityOperations.demo";

interface QualityDeliveryReviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    load: QualityDeliveryLoadItem | null;
    onSave: (
        loadId: string,
        payload: {
            estadoRevision: QualityReviewStatus;
            mtdRegistros: QualityMtdProducerRecord[];
            analisisLaboratorio: QualityLabAnalysisRecord[];
        },
    ) => void;
}

export default function QualityDeliveryReviewModal({
    open,
    onOpenChange,
    load,
    onSave,
}: QualityDeliveryReviewModalProps) {
    const [mtdList, setMtdList] = useState<QualityMtdProducerRecord[]>([]);
    const [labList, setLabList] = useState<QualityLabAnalysisRecord[]>([]);

    // Nuevo análisis
    const [tipoAnalisis, setTipoAnalisis] = useState<QualityLabAnalysisRecord["tipoAnalisis"]>("Residuos de Plaguicidas");
    const [fechaMuestreo, setFechaMuestreo] = useState("2026-10-25");
    const [identificacionMuestra, setIdentificacionMuestra] = useState("");
    const [etapa, setEtapa] = useState("Liberación de campo");
    const [resultado, setResultado] = useState<"Apto" | "No apto">("Apto");
    const [observaciones, setObservaciones] = useState("");
    const [archivo, setArchivo] = useState<FileSource | null>(null);

    useResetOnToggle(open, () => {
        if (!load) return;
        setMtdList(load.mtdRegistros.map((r) => ({ ...r })));
        setLabList(load.analisisLaboratorio.map((r) => ({ ...r })));
        setTipoAnalisis("Residuos de Plaguicidas");
        setFechaMuestreo(load.fechaProgramada);
        setIdentificacionMuestra(`MUE-${load.codigoCarga}-0${load.analisisLaboratorio.length + 1}`);
        setEtapa("Liberación de campo");
        setResultado("Apto");
        setObservaciones("");
        setArchivo(null);
    });

    if (!load) return null;

    const updateMtdRecord = (index: number, patch: Partial<QualityMtdProducerRecord>) => {
        setMtdList((current) =>
            current.map((item, idx) => {
                if (idx !== index) return item;
                const next = { ...item, ...patch };
                const denom = Math.max(1, next.trampas * next.diasExposicion);
                next.mtdCalculado = Number((next.capturas / denom).toFixed(4));
                return next;
            }),
        );
    };

    const handleAddAnalysis = () => {
        if (!identificacionMuestra.trim()) return;
        const created: QualityLabAnalysisRecord = {
            id: `lab-${Date.now()}`,
            tipoAnalisis,
            fechaMuestreo,
            identificacionMuestra: identificacionMuestra.trim(),
            etapa,
            resultado,
            observaciones: observaciones.trim(),
            archivo,
        };
        setLabList((current) => [created, ...current]);
        setIdentificacionMuestra(`MUE-${load.codigoCarga}-0${labList.length + 2}`);
        setObservaciones("");
        setArchivo(null);
    };

    const maxMtd = mtdList.reduce((max, item) => Math.max(max, item.mtdCalculado), 0);
    const hasHighMtd = maxMtd > 0.5;
    const hasNonAptLab = labList.some((item) => item.resultado === "No apto");

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<FlaskConical size={22} strokeWidth={2.2} />}
            title={`Análisis y revisión de la entrega · ${load.codigoCarga}`}
            description={`${load.cliente} · ${load.campaniaNombre}`}
            size="xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} /> Cancelar
                    </Button>
                    <Button
                        variant="outline"
                        size="xl"
                        onClick={() => {
                            onSave(load.id, {
                                estadoRevision: "Observada",
                                mtdRegistros: mtdList,
                                analisisLaboratorio: labList,
                            });
                            onOpenChange(false);
                        }}
                    >
                        <AlertTriangle size={18} className="text-status-warning" /> Observar entrega
                    </Button>
                    <Button
                        size="xl"
                        onClick={() => {
                            onSave(load.id, {
                                estadoRevision: "Aprobada para cosecha",
                                mtdRegistros: mtdList,
                                analisisLaboratorio: labList,
                            });
                            onOpenChange(false);
                        }}
                    >
                        <CheckCircle2 size={18} /> Aprobar para cosecha
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <SummaryBar
                    items={[
                        {
                            label: "Estado de revisión actual",
                            value: load.estadoRevision,
                            tone: load.estadoRevision === "Aprobada para cosecha" ? "brand" : "highlight",
                        },
                        {
                            label: "MTD Ceratitis máximo",
                            value: maxMtd.toFixed(4),
                            tone: hasHighMtd ? "highlight" : "brand",
                        },
                        {
                            label: "Análisis registrados",
                            value: `${labList.length} muestra(s)`,
                        },
                        {
                            label: "Aptitud de laboratorio",
                            value: hasNonAptLab ? "Con muestra No apta" : "100% Apto",
                            tone: hasNonAptLab ? "highlight" : "brand",
                        },
                    ]}
                />

                {hasHighMtd && (
                    <div className="flex items-center gap-3 rounded-2xl border border-status-error/40 bg-status-error-bg/30 p-3.5 text-[13px] font-medium text-ink">
                        <AlertTriangle size={18} className="shrink-0 text-status-error" />
                        <span>
                            <strong>Alerta Fitosanitaria SENASA:</strong> Al menos una finca supera el umbral de{" "}
                            <strong>MTD 0.5000</strong>. Verifica las capturas antes de autorizar la cosecha.
                        </span>
                    </div>
                )}

                <ModalSection
                    title="1. MTD Ceratitis obligatorio para esta carga (por productor y finca)"
                    aside="MTD = Capturas ÷ (Trampas × Días)"
                >
                    <div className="flex flex-col gap-4">
                        {mtdList.map((item, idx) => {
                            const exceeds = item.mtdCalculado > 0.5;
                            return (
                                <div
                                    key={item.id}
                                    className="flex flex-col gap-3.5 rounded-2xl border border-border/90 bg-card p-4"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Bug size={17} className="text-brand" />
                                            <div>
                                                <p className="text-[14px] font-bold text-ink">
                                                    {item.productor} · {item.finca}
                                                </p>
                                                <p className="text-[12px] text-ink-muted">
                                                    Código lugar de producción SENASA: {item.codigoSenasa}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[13px] font-extrabold tabular-nums text-ink">
                                                MTD: {item.mtdCalculado.toFixed(4)}
                                            </span>
                                            <StatusBadge status={exceeds ? "Observada" : "Apto"} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <InputField
                                            id={`mtd-cap-${item.id}`}
                                            label="Moscas capturadas"
                                            type="number"
                                            value={String(item.capturas)}
                                            onChange={(v) =>
                                                updateMtdRecord(idx, { capturas: Math.max(0, Number(v) || 0) })
                                            }
                                        />
                                        <InputField
                                            id={`mtd-trp-${item.id}`}
                                            label="Trampas evaluadas"
                                            type="number"
                                            value={String(item.trampas)}
                                            onChange={(v) =>
                                                updateMtdRecord(idx, { trampas: Math.max(1, Number(v) || 1) })
                                            }
                                        />
                                        <InputField
                                            id={`mtd-dia-${item.id}`}
                                            label="Días de exposición"
                                            type="number"
                                            value={String(item.diasExposicion)}
                                            onChange={(v) =>
                                                updateMtdRecord(idx, {
                                                    diasExposicion: Math.max(1, Number(v) || 1),
                                                })
                                            }
                                        />
                                    </div>

                                    <FileDropzone
                                        label="Reporte o evidencia del conteo SENASA"
                                        file={item.evidenciaConteo}
                                        onChange={(file) => updateMtdRecord(idx, { evidenciaConteo: file })}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </ModalSection>

                <ModalSection
                    title="2. Registrar nuevo análisis de calidad / laboratorio"
                    aside="LMR, microbiología, metales, Brix, materia seca"
                >
                    <div className="flex flex-col gap-4 rounded-2xl border border-brand-border/60 bg-brand-surface/25 p-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <FormField label="Tipo de análisis" required>
                                <Select
                                    value={tipoAnalisis}
                                    onValueChange={(v) =>
                                        setTipoAnalisis((v ?? "Residuos de Plaguicidas") as QualityLabAnalysisRecord["tipoAnalisis"])
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Residuos de Plaguicidas">
                                            Residuos de Plaguicidas (LMR)
                                        </SelectItem>
                                        <SelectItem value="Microbiológico">Microbiológico</SelectItem>
                                        <SelectItem value="Metales Pesados">Metales Pesados (Cadmio/Plomo)</SelectItem>
                                        <SelectItem value="Maduración">Maduración / Grados Brix</SelectItem>
                                        <SelectItem value="Materia seca">Materia seca (%)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormField>

                            <InputField
                                id="lab-fecha-muestreo"
                                label="Fecha de muestreo"
                                type="date"
                                value={fechaMuestreo}
                                onChange={setFechaMuestreo}
                            />

                            <InputField
                                id="lab-id-muestra"
                                label="Identificación de muestra"
                                value={identificacionMuestra}
                                onChange={setIdentificacionMuestra}
                                placeholder="Ej. MUE-LMR-2026-085"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <InputField
                                id="lab-etapa"
                                label="Etapa de muestreo"
                                value={etapa}
                                onChange={setEtapa}
                                placeholder="Pre-cosecha / Liberación"
                            />
                            <FormField label="Resultado" required>
                                <Select
                                    value={resultado}
                                    onValueChange={(v) => setResultado((v ?? "Apto") as "Apto" | "No apto")}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Apto">Apto</SelectItem>
                                        <SelectItem value="No apto">No apto</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormField>
                            <InputField
                                id="lab-obs"
                                label="Observaciones"
                                value={observaciones}
                                onChange={setObservaciones}
                                placeholder="Valores obtenidos..."
                            />
                        </div>

                        <FileDropzone
                            label="Certificado o informe de análisis (PDF)"
                            file={archivo}
                            onChange={setArchivo}
                        />

                        <div className="flex justify-end">
                            <Button type="button" variant="outline" onClick={handleAddAnalysis}>
                                <Plus size={16} /> Agregar análisis a la entrega
                            </Button>
                        </div>
                    </div>
                </ModalSection>

                <ModalSection
                    title={`3. Análisis registrados en esta carga (${labList.length})`}
                    aside="Historial de muestras"
                >
                    {labList.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border p-4 text-center text-[13px] text-ink-muted">
                            Aún no hay análisis registrados para esta entrega.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-brand-surface/60">
                                        <TableHead className="font-bold text-ink">Muestra</TableHead>
                                        <TableHead className="font-bold text-ink">Tipo de análisis</TableHead>
                                        <TableHead className="font-bold text-ink">Fecha</TableHead>
                                        <TableHead className="font-bold text-ink">Observaciones</TableHead>
                                        <TableHead className="text-center font-bold text-ink">Resultado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {labList.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-bold text-ink">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Sprout size={14} className="text-brand" />
                                                    {item.identificacionMuestra}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-[13px] font-medium text-ink">
                                                {item.tipoAnalisis}
                                            </TableCell>
                                            <TableCell className="text-[13px] text-ink-muted">
                                                {formatDisplayDate(item.fechaMuestreo)}
                                            </TableCell>
                                            <TableCell className="text-[12.5px] text-ink-muted">
                                                {item.observaciones || item.etapa}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <StatusBadge status={item.resultado} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </ModalSection>
            </div>
        </AppModal>
    );
}
