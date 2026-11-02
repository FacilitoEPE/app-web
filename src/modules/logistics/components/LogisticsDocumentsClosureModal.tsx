import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { useState } from "react";
import { CheckCircle2, CircleAlert, FileCheck2, Lock, Save, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import ModalSection from "@/shared/components/ModalSection";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import type { FileSource } from "@/shared/utils/fileSource";
import type { LogisticsDocumentsClosure, LogisticsLoad } from "@/modules/logistics/logistics.models";

interface LogisticsDocumentsClosureModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    load: LogisticsLoad | null;
    onSave: (loadId: string, closure: LogisticsDocumentsClosure) => void;
}

export default function LogisticsDocumentsClosureModal({
    open,
    onOpenChange,
    load,
    onSave,
}: LogisticsDocumentsClosureModalProps) {
    const [guiaRemisionFruta, setGuiaRemisionFruta] = useState<FileSource | null>(null);
    const [guiaTransportista, setGuiaTransportista] = useState<FileSource | null>(null);
    const [reporteRecepcionPlanta, setReporteRecepcionPlanta] = useState<FileSource | null>(null);
    const [ticketBalanza, setTicketBalanza] = useState<FileSource | null>(null);
    const [guiaSalidaFirmada, setGuiaSalidaFirmada] = useState<FileSource | null>(null);
    const [actaDescarte, setActaDescarte] = useState<FileSource | null>(null);
    const [cierreFisico, setCierreFisico] = useState(false);
    const [fechaCierreFisico, setFechaCierreFisico] = useState("");
    const [cierreAdmin, setCierreAdmin] = useState(false);
    const [fechaCierreAdmin, setFechaCierreAdmin] = useState("");
    const [observacionesCierre, setObservacionesCierre] = useState("");
    const [validationError, setValidationError] = useState("");

    useResetOnToggle(open, () => {
        if (!load || !open) return;
        const d = load.documentosCierre;
        setGuiaRemisionFruta(d.guiaRemisionFruta);
        setGuiaTransportista(d.guiaTransportista);
        setReporteRecepcionPlanta(d.reporteRecepcionPlanta);
        setTicketBalanza(d.ticketBalanza);
        setGuiaSalidaFirmada(d.guiaSalidaFirmada);
        setActaDescarte(d.actaDescarte);
        setCierreFisico(d.cierreFisicoConfirmado);
        setFechaCierreFisico(d.fechaCierreFisico);
        setCierreAdmin(d.cierreAdministrativoConfirmado);
        setFechaCierreAdmin(d.fechaCierreAdministrativo);
        setObservacionesCierre(d.observacionesCierre);
        setValidationError("");
    });

    if (!load) return null;

    const hasAllRequiredDocuments = Boolean(
        guiaRemisionFruta &&
        guiaTransportista &&
        reporteRecepcionPlanta &&
        ticketBalanza &&
        guiaSalidaFirmada,
    );

    const checklist = [
        {
            label: "Peso recibido en planta registrado",
            ok: load.recepcion.pesoRecibidoPlanta > 0,
        },
        {
            label: "Evaluación y resultado de recepción definidos",
            ok: Boolean(load.recepcion.resultadoRecepcion),
        },
        {
            label: "Guía de remisión de fruta adjunta",
            ok: Boolean(guiaRemisionFruta),
        },
        {
            label: "Guía de transportista adjunta",
            ok: Boolean(guiaTransportista),
        },
        {
            label: "Reporte de recepción en planta y ticket de balanza",
            ok: Boolean(reporteRecepcionPlanta && ticketBalanza),
        },
        {
            label: "Guía de salida firmada por retorno de envases",
            ok: Boolean(guiaSalidaFirmada),
        },
    ];

    const completedPoints = checklist.filter((c) => c.ok).length;

    const nowFormatted = () => {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    };

    const handleConfirmPhysical = () => {
        if (!hasAllRequiredDocuments) {
            setValidationError("Adjunta los 5 documentos obligatorios (*) antes de confirmar el cierre.");
            return;
        }
        setValidationError("");
        setCierreFisico(true);
        if (!fechaCierreFisico) setFechaCierreFisico(nowFormatted());
    };

    const handleConfirmAdmin = () => {
        if (!hasAllRequiredDocuments) {
            setValidationError("Adjunta los 5 documentos obligatorios (*) antes de confirmar el cierre.");
            return;
        }
        setValidationError("");
        setCierreFisico(true);
        if (!fechaCierreFisico) setFechaCierreFisico(nowFormatted());
        setCierreAdmin(true);
        if (!fechaCierreAdmin) setFechaCierreAdmin(nowFormatted());
    };

    const handleSubmit = async () => {
        if ((cierreFisico || cierreAdmin) && !hasAllRequiredDocuments) {
            setValidationError("Adjunta los 5 documentos obligatorios (*) antes de guardar el cierre.");
            return;
        }
        setValidationError("");
        await onSave(load.id, {
            guiaRemisionFruta,
            guiaTransportista,
            reporteRecepcionPlanta,
            ticketBalanza,
            guiaSalidaFirmada,
            actaDescarte,
            cierreFisicoConfirmado: cierreFisico,
            fechaCierreFisico,
            cierreAdministrativoConfirmado: cierreAdmin,
            fechaCierreAdministrativo: fechaCierreAdmin,
            observacionesCierre: observacionesCierre.trim(),
        });
        onOpenChange(false);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<FileCheck2 size={22} strokeWidth={2.2} />}
            title="Documentos de respaldo y cierre logístico"
            description={`${load.codigo} · ${load.cliente} · Camión ${load.placa}`}
            size="2xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleSubmit}>
                        <Save size={18} strokeWidth={2.5} /> Guardar expediente y cierre
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                {validationError && (
                    <p role="alert" className="text-sm font-medium text-danger">
                        {validationError}
                    </p>
                )}
                <ModalSection
                    title="1. Documentos obligatorios de respaldo (5 obligatorios *, 1 opcional)"
                    aside={`${[guiaRemisionFruta, guiaTransportista, reporteRecepcionPlanta, ticketBalanza, guiaSalidaFirmada, actaDescarte].filter(Boolean).length} de 6 adjuntos`}
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FileDropzone
                            label="1. Guía de remisión de fruta (SUNAT)"
                            required
                            file={guiaRemisionFruta}
                            onChange={(f) => {
                                setGuiaRemisionFruta(f);
                                setValidationError("");
                            }}
                            variant="horizontal"
                            replaceable
                        />
                        <FileDropzone
                            label="2. Guía de remisión del transportista"
                            required
                            file={guiaTransportista}
                            onChange={(f) => {
                                setGuiaTransportista(f);
                                setValidationError("");
                            }}
                            variant="horizontal"
                            replaceable
                        />
                        <FileDropzone
                            label="3. Reporte de recepción en planta"
                            required
                            file={reporteRecepcionPlanta}
                            onChange={(f) => {
                                setReporteRecepcionPlanta(f);
                                setValidationError("");
                            }}
                            variant="horizontal"
                            replaceable
                        />
                        <FileDropzone
                            label="4. Ticket de balanza"
                            required
                            file={ticketBalanza}
                            onChange={(f) => {
                                setTicketBalanza(f);
                                setValidationError("");
                            }}
                            variant="horizontal"
                            replaceable
                        />
                        <FileDropzone
                            label="5. Guía de salida firmada (envases)"
                            required
                            file={guiaSalidaFirmada}
                            onChange={(f) => {
                                setGuiaSalidaFirmada(f);
                                setValidationError("");
                            }}
                            variant="horizontal"
                            replaceable
                        />
                        <FileDropzone
                            label="6. Acta de descarte"
                            optional
                            file={actaDescarte}
                            onChange={(f) => setActaDescarte(f)}
                            variant="horizontal"
                            replaceable
                        />
                    </div>
                </ModalSection>

                <ModalSection
                    title="2. Checklist automático de validación de cierre"
                    aside={`${completedPoints} / ${checklist.length} validados`}
                >
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {checklist.map((item) => (
                            <div
                                key={item.label}
                                className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-semibold ${
                                    item.ok
                                        ? "border-brand-border bg-brand-surface/40 text-ink"
                                        : "border-border bg-surface-page/50 text-ink-muted"
                                }`}
                            >
                                {item.ok ? (
                                    <CheckCircle2 size={17} className="shrink-0 text-brand" strokeWidth={2.5} />
                                ) : (
                                    <CircleAlert size={17} className="shrink-0 text-status-highlight" strokeWidth={2.5} />
                                )}
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </ModalSection>

                <ModalSection title="3. Confirmación de Cierre Físico y Cierre Administrativo">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-surface-page/50 p-4">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[14px] font-bold text-ink">Cierre físico en planta</span>
                                <StatusBadge status={cierreFisico ? "Cierre físico" : "Pendiente"} />
                            </div>
                            <p className="text-[12px] font-medium text-ink-muted">
                                Confirma que la descarga, el pesaje en balanza y el retorno físico de jabas finalizaron.
                            </p>
                            {fechaCierreFisico && (
                                <span className="text-[11.5px] font-semibold text-brand">
                                    Confirmado: {fechaCierreFisico}
                                </span>
                            )}
                            <Button
                                variant={cierreFisico ? "outline" : "default"}
                                onClick={handleConfirmPhysical}
                            >
                                <Lock size={16} strokeWidth={2.4} />{" "}
                                {cierreFisico ? "Cierre físico confirmado" : "Confirmar cierre físico"}
                            </Button>
                        </div>

                        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-surface-page/50 p-4">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[14px] font-bold text-ink">Cierre administrativo</span>
                                <StatusBadge status={cierreAdmin ? "Cierre administrativo" : "Pendiente"} />
                            </div>
                            <p className="text-[12px] font-medium text-ink-muted">
                                Habilita la carga para emisión de Factura (Módulo 7) y Liquidación de Compra (Módulo 8).
                            </p>
                            {fechaCierreAdmin && (
                                <span className="text-[11.5px] font-semibold text-brand">
                                    Confirmado: {fechaCierreAdmin}
                                </span>
                            )}
                            <Button
                                variant={cierreAdmin ? "outline" : "default"}
                                onClick={handleConfirmAdmin}
                            >
                                <CheckCircle2 size={16} strokeWidth={2.4} />{" "}
                                {cierreAdmin
                                    ? "Cierre administrativo confirmado"
                                    : "Confirmar cierre administrativo"}
                            </Button>
                        </div>

                        <FormField
                            id="clos-obs"
                            label="Observaciones de cierre documental"
                            optional
                            className="sm:col-span-2"
                        >
                            <Textarea
                                id="clos-obs"
                                rows={2}
                                value={observacionesCierre}
                                onChange={(e) => setObservacionesCierre(e.target.value)}
                            />
                        </FormField>
                    </div>
                </ModalSection>
            </div>
        </AppModal>
    );
}
