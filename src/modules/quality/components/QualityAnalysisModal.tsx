import { FlaskConical, Save, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import { InfoField } from "@/shared/components/InfoField";
import { Button } from "@/shared/components/ui/button";
import { Combobox } from "@/shared/components/ui/combobox";
import { Textarea } from "@/shared/components/ui/textarea";
import { useModalForm } from "@/shared/hooks/useModalForm";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import { formatDisplayDate } from "@/shared/utils/format";
import type { FileSource } from "@/shared/utils/fileSource";
import { campaignAnalysisOrigins } from "@/modules/quality/api/quality-commands.api";
import { saveQualityAnalysis } from "@/modules/quality/qualityAnalysis.store";
import { ANALYSIS_TYPE_OPTIONS, CERATITIS_MTD_LIMIT, determineResultState, mtdCeratitisStatus, type QualityAnalysisRecord } from "@/modules/quality/qualityAnalysis.utils";

interface Props { open: boolean; onOpenChange: (open: boolean) => void; campaignId: number; record: QualityAnalysisRecord | null; readOnly?: boolean }
export default function QualityAnalysisModal({ open, onOpenChange, campaignId, record, readOnly }: Props) {
    const origins = open ? campaignAnalysisOrigins(campaignId) : [];
    const [values, , set] = useModalForm(open, {
        origin: origins.find(o => o.productor === record?.productorNombre && o.finca === record?.fincaNombre)?.value ?? "",
        fecha: record?.fechaMuestreo ?? "", tipo: record?.tipo ?? "", mtd: record ? String(record.mtd) : "",
        resultado: record?.resultado ?? "", unidad: record?.unidad ?? "",
        observaciones: record?.observaciones ?? "", documento: record?.documento ?? null as FileSource | null,
        evidencia: record?.mtdEvidencia ?? null as FileSource | null,
    });
    const { errors, saving, submit } = useFormSubmit({ open, backendFields: {},
        validate: (v: typeof values) => {
            const e: Record<string, string> = {};
            if (!v.origin) e.origin = "Selecciona un proveedor y finca.";
            if (!v.fecha) e.fecha = "Indica la fecha de muestreo.";
            if (!v.tipo) e.tipo = "Selecciona el tipo de análisis.";
            if (!v.mtd.trim() || !Number.isFinite(Number(v.mtd)) || Number(v.mtd) < 0) e.mtd = "Ingresa un MTD mayor o igual a cero.";
            if (!v.evidencia) e.evidencia = "Adjunta la captura del MTD.";
            if (origins.find(o => o.value === v.origin)?.mtd !== undefined && Number(v.mtd) !== origins.find(o => o.value === v.origin)?.mtd && !(v.evidencia instanceof File)) e.evidencia = "Adjunta una captura actualizada para el nuevo MTD.";
            return e;
        },
        onSubmit: async v => {
            const origin = origins.find(o => o.value === v.origin)!;
            await saveQualityAnalysis({ id: record?.id, campaniaId: campaignId, productorNombre: origin.productor, fincaNombre: origin.finca,
                fechaMuestreo: v.fecha, tipo: v.tipo, mtd: Number(v.mtd), mtdTrampa: origin.trampa, mtdEvidencia: v.evidencia,
                resultado: v.resultado, unidad: v.unidad, estadoResultado: determineResultState(v.resultado), documento: v.documento, observaciones: v.observaciones });
            onOpenChange(false);
        },
    });
    const mtdStatus = mtdCeratitisStatus(values.mtd);
    const selectedOrigin = origins.find(o => o.value === values.origin);
    const mtdHint = mtdStatus === "cumple"
        ? `MTD dentro del límite (≤ ${CERATITIS_MTD_LIMIT}).`
        : selectedOrigin?.mtd !== undefined && values.mtd === ""
            ? `Último MTD de esta finca: ${selectedOrigin.mtd}. Ingresa la lectura actual.`
            : `Límite para cosecha: ${CERATITIS_MTD_LIMIT}.`;
    return <AppModal open={open} onOpenChange={onOpenChange} busy={saving} size="lg" icon={<FlaskConical size={22} />}
        title={readOnly ? "Detalle del análisis" : record ? "Editar análisis" : "Registrar análisis"}
        description="Muestreo y MTD por proveedor y finca de la campaña."
        footer={<><Button variant="outline" size="xl" onClick={() => onOpenChange(false)}><X size={18} />{readOnly ? "Cerrar" : "Cancelar"}</Button>{!readOnly && <Button size="xl" disabled={saving} onClick={() => submit(values)}><Save size={18} />{saving ? "Guardando…" : "Guardar análisis"}</Button>}</>}>
        <div className="flex flex-col gap-5">
            {readOnly && record ? <>
                <ModalSection title="Muestra">
                <div className="grid gap-4 sm:grid-cols-2">
                    <InfoField label="Proveedor" value={record.productorNombre} /><InfoField label="Finca" value={record.fincaNombre} />
                    <InfoField label="Fecha de muestreo" value={formatDisplayDate(record.fechaMuestreo)} /><InfoField label="Tipo" value={record.tipo} />
                </div></ModalSection>
                <ModalSection title="Control fitosanitario">
                <div className="grid items-start gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-3">
                        <InfoField label="MTD Ceratitis" value={String(record.mtd)} />
                        <InfoField label="Estado del MTD" value={mtdCeratitisStatus(record.mtd) === "bloqueado" ? "Supera el límite · Cosecha restringida" : "Dentro del límite"} />
                    </div>
                    <FileDropzone label="Captura del MTD" variant="horizontal" file={record.mtdEvidencia ?? null} readOnly onChange={() => {}} />
                </div>
                </ModalSection>
                <ModalSection title="Resultado de laboratorio">
                <div className="grid gap-4 sm:grid-cols-2">
                    <InfoField label="Resultado" value={record.resultado || "Pendiente de laboratorio"} /><InfoField label="Unidad" value={record.unidad || "Sin unidad"} />
                </div><InfoField label="Observaciones" value={record.observaciones || "Sin observaciones"} multiline />
                <FileDropzone label="Informe de análisis" file={record.documento ?? null} readOnly onChange={() => {}} />
                </ModalSection>
            </> : <>
                <ModalSection title="Muestra">
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Proveedor y finca" required error={errors.origin}><Combobox options={origins} value={values.origin} onChange={value => { const origin = origins.find(o => o.value === value); set("origin")(value); set("mtd")(""); set("evidencia")(origin?.evidencia ?? null); }} placeholder="Seleccionar proveedor y finca" /></FormField>
                    <InputField id="quality-analysis-0" label="Fecha de muestreo" type="date" required value={values.fecha} onChange={set("fecha")} error={errors.fecha} />
                </div>
                </ModalSection>
                <ModalSection title="Control fitosanitario" aside={`Límite: ${CERATITIS_MTD_LIMIT}`}>
                    <div className="grid items-start gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-3">
                            <InputField id="quality-analysis-1" label="MTD Ceratitis" type="number" min={0} step="0.0001" required value={values.mtd} onChange={set("mtd")} placeholder={selectedOrigin?.mtd === undefined ? "Ej. 0.01" : String(selectedOrigin.mtd)} hint={mtdStatus === "bloqueado" ? undefined : mtdHint} error={errors.mtd} />
                            {mtdStatus === "bloqueado" && <p role="status" className="text-xs font-medium text-destructive">MTD mayor a {CERATITIS_MTD_LIMIT}: puedes guardar el análisis, pero esta finca no puede pasar a cosecha.</p>}
                        </div>
                        <FormField error={errors.evidencia}><FileDropzone label="Captura del MTD" variant="horizontal" required file={values.evidencia} onChange={set("evidencia")} /></FormField>
                    </div>
                </ModalSection>
                <ModalSection title="Resultado de laboratorio" aside="Se puede completar después">
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Tipo de análisis" required error={errors.tipo}><Combobox options={ANALYSIS_TYPE_OPTIONS} value={values.tipo} onChange={set("tipo")} placeholder="Seleccionar tipo" /></FormField>
                    <InputField id="quality-analysis-2" label="Resultado" value={values.resultado} onChange={set("resultado")} placeholder="Completar al recibir el informe" />
                    <InputField id="quality-analysis-3" label="Unidad" value={values.unidad} onChange={set("unidad")} placeholder="%, mg/kg…" />
                </div>
                <FormField label="Observaciones"><Textarea value={values.observaciones} onChange={event => set("observaciones")(event.target.value)} rows={3} placeholder="Notas del muestreo o del laboratorio…" /></FormField>
                <FileDropzone label="Informe de análisis" optional file={values.documento} onChange={set("documento")} />
                </ModalSection>
                <FormField error={errors._form} />
            </>}
        </div>
    </AppModal>;
}
