import { useState } from "react";
import { X, Save, FlaskConical } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import { useModalForm, useResetOnToggle } from "@/shared/hooks/useModalForm";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import InputField from "@/shared/components/InputField";
import { InfoField } from "@/shared/components/InfoField";
import SegmentedControl from "@/shared/components/SegmentedControl";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Combobox } from "@/shared/components/ui/combobox";
import {
    EMPTY_EXAM,
    EXAM_ESTADOS,
    EXAM_RESULTS,
    EXAM_TYPES,
    examEstadoLabel,
    examNeedsResult,
    examNeedsShipDate,
    examResultLabel,
    normalizeExam,
    validateExam,
    type ExamErrors,
    type ExamEstado,
    type ExamResult,
    type ExamValues,
} from "@/modules/campaigns/campaignExam";
import { formatDisplayDate } from "@/shared/utils/format";

export type ExamModalMode = "create" | "edit" | "view";

interface CampaignExamModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Proveedor al que pertenece el examen, se muestra bajo el título */
    providerName?: string;
    /** "create" arranca vacío; "edit" carga el examen; "view" lo muestra sin poder modificarlo */
    mode?: ExamModalMode;
    initialValues?: ExamValues;
    onSave?: (values: ExamValues) => void;
}

const NOT_REGISTERED = "No registrado";

const TITLES: Record<ExamModalMode, string> = {
    create: "Registrar examen",
    edit: "Editar examen",
    view: "Detalles del examen",
};

/**
 * Registro, edición y detalle de un examen de laboratorio del proveedor. El examen avanza por etapas (pendiente
 * de envío → enviado → con resultado) y cada etapa habilita sus datos: la fecha de envío cuando la muestra viaja
 * y el resultado cuando el laboratorio responde. Lo que aún no aplica no se muestra, así no hay campos muertos.
 */
export default function CampaignExamModal({ open, onOpenChange, providerName, mode = "create", initialValues, onSave }: CampaignExamModalProps) {
    const isView = mode === "view";
    const [values, , set] = useModalForm<ExamValues>(open, initialValues ?? EMPTY_EXAM);
    const [errors, setErrors] = useState<ExamErrors>({});

    useResetOnToggle(open, () => setErrors({}));

    const update = <K extends keyof ExamValues>(field: K, value: ExamValues[K]) => {
        set(field)(value);
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const handleSave = async () => {
        const nextErrors = validateExam(values);
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }
        if (onSave) await onSave(normalizeExam(values));
        else onOpenChange(false);
    };

    const showShipDate = examNeedsShipDate(values.estado);
    const showResult = examNeedsResult(values.estado);

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<FlaskConical size={22} strokeWidth={2} />}
            title={TITLES[mode]}
            description={providerName}
            size="lg"
            footer={
                isView ? (
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={20} strokeWidth={2.5} /> Cerrar
                    </Button>
                ) : (
                    <>
                        <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                            <X size={20} strokeWidth={2.5} /> Cancelar
                        </Button>
                        <Button size="xl" onClick={handleSave}>
                            <Save size={20} strokeWidth={2.5} /> {mode === "edit" ? "Guardar cambios" : "Guardar examen"}
                        </Button>
                    </>
                )
            }
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {isView ? (
                    <>
                        <InfoField label="Tipo de examen" value={values.tipoExamen || NOT_REGISTERED} className="sm:col-span-2" />
                        <InfoField label="Identificación de muestra" value={values.identificacionMuestra || NOT_REGISTERED} />
                        <InfoField label="Fecha del examen" value={formatDisplayDate(values.fecha, NOT_REGISTERED)} />
                        <InfoField label="Estado del examen" variant="plain" value={<StatusBadge status={examEstadoLabel(values.estado)} />} className="sm:col-span-2" />
                        {showShipDate && <InfoField label="Fecha de envío de la muestra" value={formatDisplayDate(values.fechaEnvioMuestra, NOT_REGISTERED)} />}
                        {showResult && (
                            <InfoField
                                label="Resultado del examen"
                                variant="plain"
                                value={values.resultado ? <StatusBadge status={examResultLabel(values.resultado)} /> : <span className="text-ink-muted">{NOT_REGISTERED}</span>}
                            />
                        )}
                        <InfoField
                            label="Observación"
                            multiline
                            value={values.observacion || <span className="text-ink-muted">Sin observaciones</span>}
                            className="sm:col-span-2"
                        />
                    </>
                ) : (
                    <>
                        <FormField label="Tipo de examen" required error={errors.tipoExamen} className="sm:col-span-2">
                            <Combobox
                                options={EXAM_TYPES}
                                value={EXAM_TYPES.find((type) => type.label === values.tipoExamen)?.value ?? ""}
                                onChange={(value) => update("tipoExamen", EXAM_TYPES.find((type) => type.value === value)?.label ?? "")}
                                placeholder="Buscar..."
                            />
                        </FormField>
                        <InputField
                            id="exam-sample"
                            label="Identificación de muestra"
                            required
                            placeholder="Ej. MUESTRA-001"
                            value={values.identificacionMuestra}
                            onChange={(value) => update("identificacionMuestra", value)}
                            error={errors.identificacionMuestra}
                        />
                        <InputField
                            id="exam-date"
                            type="date"
                            label="Fecha del examen"
                            required
                            value={values.fecha}
                            onChange={(value) => update("fecha", value)}
                            error={errors.fecha}
                        />
                        <FormField label="Estado del examen" required error={errors.estado} className="sm:col-span-2">
                            <SegmentedControl
                                options={EXAM_ESTADOS}
                                value={values.estado}
                                onChange={(value) => update("estado", value as ExamEstado)}
                            />
                        </FormField>
                        {showShipDate && (
                            <InputField
                                id="exam-sample-date"
                                type="date"
                                label="Fecha de envío de la muestra"
                                required
                                value={values.fechaEnvioMuestra}
                                onChange={(value) => update("fechaEnvioMuestra", value)}
                                error={errors.fechaEnvioMuestra}
                            />
                        )}
                        {showResult && (
                            <FormField label="Resultado del examen" required error={errors.resultado}>
                                <SegmentedControl
                                    options={EXAM_RESULTS}
                                    value={values.resultado}
                                    onChange={(value) => update("resultado", value as ExamResult)}
                                />
                            </FormField>
                        )}
                        <FormField id="exam-observation" label="Observación" optional className="sm:col-span-2">
                            <Textarea
                                id="exam-observation"
                                placeholder="Escribe alguna observación o detalle adicional..."
                                value={values.observacion}
                                onChange={(event) => update("observacion", event.target.value)}
                                className="min-h-24 resize-none"
                            />
                        </FormField>
                    </>
                )}

                <FormField
                    label={isView ? undefined : "Documento del examen"}
                    required={!isView && showResult}
                    optional={!isView && !showResult}
                    error={errors.archivo}
                    className="sm:col-span-2"
                >
                    <FileDropzone
                        label="Documento del examen"
                        hideLabel={!isView}
                        hasColon={false}
                        variant="horizontal"
                        hint="PDF, Imagen · Máx. 10 MB"
                        file={values.archivo}
                        readOnly={isView}
                        replaceable={mode === "edit"}
                        onChange={(file) => update("archivo", file)}
                    />
                </FormField>
            </div>
        </AppModal>
    );
}
