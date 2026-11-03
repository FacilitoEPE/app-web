import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, FileCheck2, Save } from "lucide-react";
import LogisticsCampaignContextBanner from "@/modules/logistics/components/LogisticsCampaignContextBanner";
import type { LogisticsDocumentsClosure } from "@/modules/logistics/logistics.models";
import { closeLogisticsAdministrative, closeLogisticsPhysical, saveLogisticsDocuments, useLogisticsLoads } from "@/modules/logistics/logistics.store";
import { formatLogisticsDateTime } from "@/modules/logistics/logistics.utils";
import ConfirmModal from "@/shared/components/ConfirmModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { InfoField } from "@/shared/components/InfoField";
import { PageError } from "@/shared/components/PageState";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import PageHeader from "@/shared/layout/PageHeader";
import type { FileSource } from "@/shared/utils/fileSource";

type DocumentKey = "guiaRemisionFruta" | "detalleCompras" | "reporteRecepcionPlanta" | "actaDescarte" | "constanciaDevolucionJabas" | "guiaSalidaFirmada";
const documentFields: { key: DocumentKey; label: string; source: string }[] = [
    { key: "guiaRemisionFruta", label: "Guía de remisión de la fruta", source: "Transporte" },
    { key: "detalleCompras", label: "Detalle de compras", source: "Cosecha / Acopio" },
    { key: "reporteRecepcionPlanta", label: "Informe de recepción / evaluación", source: "Planta" },
    { key: "actaDescarte", label: "Evidencia de descarte", source: "Recepción" },
    { key: "constanciaDevolucionJabas", label: "Constancia de devolución de jabas", source: "Logística" },
    { key: "guiaSalidaFirmada", label: "Guía de salida firmada del vehículo", source: "Logística" },
];

export default function LogisticsDocumentsPage() {
    const navigate = useNavigate();
    const { campaignId, loadId } = useParams<{ campaignId: string; loadId: string }>();
    const backHref = `/logistica-despacho/${campaignId}`;
    const load = useLogisticsLoads().find(item => item.id === loadId && item.campaniaId === Number(campaignId));
    const [documents, setDocuments] = useState<LogisticsDocumentsClosure | null>(load ? { ...load.documentosCierre } : null);
    const [confirm, setConfirm] = useState<"physical" | "administrative" | null>(null);
    const [closing, setClosing] = useState(false);
    const [error, setError] = useState("");
    const { errors, saving, submit } = useFormSubmit<LogisticsDocumentsClosure>({
        open: true, backendFields: {}, validate: () => ({}),
        onSubmit: async value => { if (load) await saveLogisticsDocuments(load.id, value); },
    });
    if (!load || !documents) return <PageError title="Carga no encontrada" message="No se encontró esta carga en la campaña." back={{ to: backHref, label: "Volver a cargas" }} />;
    const saved = load.documentosCierre;
    const driverClosed = Boolean(load.historialChofer?.some(event => event.etapa === "Cierre"));
    const checklist = [
        { label: "Llegada registrada", done: Boolean(load.llegada?.llegadaReal) },
        { label: "Recepción documentada", done: Boolean(saved.reporteRecepcionPlanta || load.recepcion.reporteRecepcionArchivo) },
        { label: "Guía de fruta emitida y PDF adjunto", done: Boolean(load.guiaFrutaEmitida && saved.guiaRemisionFruta?.name.toLowerCase().endsWith(".pdf")) },
        { label: "Evaluación registrada", done: Boolean(load.recepcion.pesoRecibidoPlanta && load.recepcion.resultadoRecepcion) },
        { label: "Descarte informado o resultado registrado", done: Boolean(load.recepcion.huboDescarte || load.recepcion.resultadoRecepcion) },
        { label: "Compras revisadas", done: Boolean(load.compras?.length && load.compras.every(purchase => purchase.estadoRevision !== "Pendiente de revisión")) },
        { label: "Jabas conciliadas o pendiente identificado", done: load.devolucionJabas?.jabasIniciales != null },
        { label: "Salida documentada", done: Boolean(saved.guiaSalidaFirmada) },
    ];
    const updateFile = (key: DocumentKey, file: FileSource | null) => setDocuments(current => current ? { ...current, [key]: file } : current);
    const close = async () => {
        if (!confirm || closing) return;
        setClosing(true); setError("");
        try {
            if (confirm === "physical") await closeLogisticsPhysical(load.id);
            else await closeLogisticsAdministrative(load.id);
            setConfirm(null);
        } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo registrar el cierre."); setConfirm(null); }
        finally { setClosing(false); }
    };
    return <div className="px-4 py-5 sm:px-8 lg:px-14">
        <LogisticsCampaignContextBanner load={load} caption="Documentos y cierre" />
        <PageHeader icon={<FileCheck2 size={24} />} title="Documentos y cierre"
            description={`${load.codigo} · ${load.cliente}. Reúne el expediente y registra los cierres físico y administrativo por separado.`} />
        {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
        <Card className="gap-5 p-5 sm:p-6"><div><h2 className="text-lg font-bold text-ink">Expediente de la entrega</h2><p className="text-sm text-ink-muted">Consulta o adjunta los documentos de cada etapa.</p></div>
            {saved.cierreAdministrativoConfirmado && <p className="text-sm text-ink-muted">El cierre administrativo bloquea cambios posteriores en la recepción y su expediente.</p>}
            <FormField error={errors._form} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{documentFields.map(field => {
                const file = documents[field.key] ?? null;
                return <div key={field.key} className="min-w-0 rounded-xl border border-border p-4">
                    <p className="text-sm font-semibold text-ink">{field.label}</p>
                    <p className="mb-3 text-xs text-ink-muted">Fuente: {field.source}</p>
                    {field.key === "guiaRemisionFruta" && load.guiaFrutaEmitida && <p className="mb-2 text-xs text-brand">Guía electrónica emitida: {load.guiaFrutaEmitida}</p>}
                    <FileDropzone label={field.label} hideLabel file={file} onChange={value => updateFile(field.key, value)} disabled={saved.cierreAdministrativoConfirmado}
                        accept={field.key === "guiaRemisionFruta" ? "application/pdf" : undefined} variant="horizontal" replaceable />
                    {file && "url" in file && <a href={file.url} download={file.name} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-brand underline">Descargar</a>}
                </div>;
            })}</div>
            <FormField label="Observaciones del cierre"><Textarea value={documents.observacionesCierre} disabled={saved.cierreAdministrativoConfirmado} onChange={event => setDocuments(current => current ? { ...current, observacionesCierre: event.target.value } : current)} rows={3} /></FormField>
            <div className="flex justify-end"><Button disabled={saving || saved.cierreAdministrativoConfirmado} onClick={() => void submit(documents)}><Save size={18} />Guardar documentos</Button></div>
        </Card>
        <Card className="mt-4 gap-4 p-5 sm:p-6"><h2 className="text-lg font-bold text-ink">Checklist de cierre</h2>
            <div className="grid gap-2 sm:grid-cols-2">{checklist.map(item => <div key={item.label} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-ink-body">
                <span aria-hidden="true" className={item.done ? "text-brand" : "text-ink-muted"}>{item.done ? "✓" : "○"}</span>{item.label}</div>)}</div>
        </Card>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Card className="gap-3 p-5 sm:p-6"><h2 className="text-lg font-bold text-ink">Cierre físico</h2>
                <InfoField label="Estado" value={saved.cierreFisicoConfirmado ? `Registrado · ${formatLogisticsDateTime(saved.fechaCierreFisico)}` : "Pendiente"} />
                <Button variant="outline" disabled={saved.cierreFisicoConfirmado} onClick={() => setConfirm("physical")}><CheckCircle2 size={18} />Registrar cierre físico</Button>
            </Card>
            <Card className="gap-3 p-5 sm:p-6"><h2 className="text-lg font-bold text-ink">Cierre administrativo</h2>
                <InfoField label="Estado" value={saved.cierreAdministrativoConfirmado ? `Registrado · ${formatLogisticsDateTime(saved.fechaCierreAdministrativo)}` : "Pendiente"} />
                <Button variant="outline" disabled={saved.cierreAdministrativoConfirmado || !saved.cierreFisicoConfirmado || !driverClosed} onClick={() => setConfirm("administrative")}><CheckCircle2 size={18} />Registrar cierre administrativo</Button>
                {!driverClosed && <p className="text-xs text-ink-muted">El chofer debe completar su checklist y cerrar el despacho antes de este cierre.</p>}
            </Card>
        </div>
        <p className="mt-4 text-sm text-ink-muted">Cerrar la entrega no finaliza la campaña ni registra pagos del cliente o liquidaciones del proveedor.</p>
        <div className="mt-6"><Button variant="outline" onClick={() => navigate(backHref)}>Volver a cargas</Button></div>
        <ConfirmModal open={Boolean(confirm)} onOpenChange={open => { if (!open) setConfirm(null); }}
            title={confirm === "physical" ? "¿Registrar cierre físico?" : "¿Registrar cierre administrativo?"}
            description="Se registrará la fecha del cierre de esta carga. Revisa el expediente antes de continuar."
            confirmLabel={confirm === "physical" ? "Sí, cerrar físicamente" : "Sí, cerrar administrativamente"}
            onConfirm={() => void close()} />
    </div>;
}
