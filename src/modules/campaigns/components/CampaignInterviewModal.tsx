import { useState } from "react";
import { ClipboardList, LandPlot, Save, Sprout, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import InputField from "@/shared/components/InputField";
import { InfoField } from "@/shared/components/InfoField";
import ModalSection from "@/shared/components/ModalSection";
import SegmentedTabs, { type SegmentedTabItem } from "@/shared/components/SegmentedTabs";
import { Button } from "@/shared/components/ui/button";
import { Combobox } from "@/shared/components/ui/combobox";
import { useModalForm, useResetOnToggle } from "@/shared/hooks/useModalForm";
import {
    EMPTY_FINCA,
    toFinca,
    validateFinca,
    type Finca,
    type FincaErrors,
    type FincaField,
    type FincaFormValues,
} from "@/modules/providers/providerFinca.utils";
import {
    EMPTY_INTERVIEW_AGRONOMICS,
    validateInterviewAgronomics,
    type InterviewAgronomicErrors,
    type InterviewAgronomicField,
    type InterviewAgronomicValues,
    type InterviewValues,
} from "@/modules/campaigns/campaignInterview";
import { getAvailableInterviewFincas, toInterviewValues, type CampaignInterviewRecord } from "@/modules/campaigns/campaignInterview.utils";

const FINCA_TABS: readonly SegmentedTabItem[] = [
    { id: "existing", label: "Finca existente", icon: LandPlot },
    { id: "new", label: "Nueva finca", icon: Sprout },
];

export interface InterviewSubmission {
    values: InterviewValues;
    /** Solo se agrega al padrón del proveedor cuando se guarda una entrevista nueva. */
    newFinca?: Finca;
}

interface CampaignInterviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    providerName: string;
    fincas: Finca[];
    interviewedFincaNames: string[];
    previewCode: string;
    initialRecord?: CampaignInterviewRecord | null;
    isViewOnly?: boolean;
    onSave: (submission: InterviewSubmission) => void;
}

/** Entrevista de campaña: vincula una finca del proveedor o registra una nueva, y captura solo los datos agronómicos de esta campaña. */
export default function CampaignInterviewModal({
    open, onOpenChange, providerName, fincas, interviewedFincaNames, previewCode, initialRecord, isViewOnly = false, onSave,
}: CampaignInterviewModalProps) {
    const [fincaMode, setFincaMode] = useState<"existing" | "new">(fincas.length ? "existing" : "new");
    const [selectedFinca, setSelectedFinca] = useState("");
    const [selectorError, setSelectorError] = useState<string>();
    const [fincaErrors, setFincaErrors] = useState<FincaErrors>({});
    const [agronomicErrors, setAgronomicErrors] = useState<InterviewAgronomicErrors>({});
    const [submitError, setSubmitError] = useState<string>();
    const [newFinca, , setFincaField] = useModalForm<FincaFormValues>(open, EMPTY_FINCA);
    const [agronomic, , setAgronomicField] = useModalForm<InterviewAgronomicValues>(
        open,
        initialRecord?.values ?? EMPTY_INTERVIEW_AGRONOMICS,
    );

    useResetOnToggle(open, () => {
        setFincaMode(fincas.length ? "existing" : "new");
        setSelectedFinca("");
        setSelectorError(undefined);
        setFincaErrors({});
        setAgronomicErrors({});
        setSubmitError(undefined);
    });

    const isEditing = initialRecord !== undefined && initialRecord !== null;
    const availableFincas = getAvailableInterviewFincas(fincas, interviewedFincaNames);
    const fincaOptions = availableFincas.map(({ finca, index }) => ({
        value: String(index),
        label: `${finca.nombre} · ${finca.distrito} · ${finca.haCultivo} ha`,
    }));

    const bindFinca = (field: FincaField) => ({
        id: `interview-finca-${field}`,
        value: newFinca[field],
        error: fincaErrors[field],
        required: field !== "latitud" && field !== "longitud",
        onChange: (value: string) => {
            setFincaField(field)(value);
            setFincaErrors((current) => ({ ...current, [field]: undefined }));
        },
    });
    const bindAgronomic = (field: InterviewAgronomicField) => ({
        id: `interview-agronomic-${field}`,
        value: agronomic[field],
        error: agronomicErrors[field],
        required: true,
        onChange: (value: string) => {
            setAgronomicField(field)(value);
            setAgronomicErrors((current) => ({ ...current, [field]: undefined }));
        },
    });

    const handleSave = () => {
        setSubmitError(undefined);
        const nextAgronomicErrors = validateInterviewAgronomics(agronomic);
        setAgronomicErrors(nextAgronomicErrors);

        let finca: Finca | undefined;
        if (isEditing) {
            const values = initialRecord.values;
            finca = {
                nombre: values.fincaNombre ?? "",
                departamento: values.departamento,
                provincia: values.provincia,
                distrito: values.distrito,
                latitud: values.latitud ? Number(values.latitud) : null,
                longitud: values.longitud ? Number(values.longitud) : null,
                haTotal: Number(values.haTotalFinca),
                haCultivo: Number(values.haCultivo),
            };
        } else if (fincaMode === "existing") {
            finca = fincas[Number(selectedFinca)];
            if (!selectedFinca || !finca || !availableFincas.some(({ index }) => String(index) === selectedFinca)) {
                finca = undefined;
                setSelectorError("Selecciona una finca disponible del proveedor.");
            }
        } else {
            const nextFincaErrors = validateFinca(newFinca, fincas.map((item) => item.nombre));
            setFincaErrors(nextFincaErrors);
            if (Object.keys(nextFincaErrors).length === 0) finca = toFinca(newFinca);
        }

        if (!finca || Object.keys(nextAgronomicErrors).length > 0) return;
        try {
            onSave({ values: toInterviewValues(finca, agronomic), newFinca: !isEditing && fincaMode === "new" ? finca : undefined });
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : "No se pudo guardar la entrevista. Inténtalo otra vez.");
        }
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<ClipboardList size={22} strokeWidth={2} />}
            title={isViewOnly ? "Detalle de la entrevista" : isEditing ? "Editar entrevista" : "Registrar entrevista"}
            description={`Productor · ${providerName}`}
            size="2xl"
            footer={isViewOnly ? undefined : (
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}><X size={18} /> Cancelar</Button>
                    <Button size="xl" onClick={handleSave}><Save size={18} /> {isEditing ? "Guardar cambios" : "Guardar entrevista"}</Button>
                </>
            )}
        >
            <div className="flex flex-col gap-6">
                {!isEditing && (
                    <SegmentedTabs tabs={FINCA_TABS} value={fincaMode} onChange={(value) => { setFincaMode(value as "existing" | "new"); setSelectorError(undefined); }} className="w-full" showLabelsOnMobile />
                )}

                <div className="grid gap-6 md:grid-cols-2 md:gap-7">
                    <ModalSection title={isEditing ? "Finca entrevistada" : fincaMode === "existing" ? "Finca existente del proveedor" : "Nueva finca del proveedor"}>
                        {!isEditing && fincaMode === "existing" && (
                            <FormField id="interview-existing-finca" label="Seleccionar finca" required error={selectorError} hint={fincaOptions.length === 0 ? "Todas las fincas ya fueron entrevistadas. Registra una nueva finca." : undefined}>
                                <Combobox
                                    options={fincaOptions}
                                    value={selectedFinca}
                                    onChange={(value) => { setSelectedFinca(value); setSelectorError(undefined); }}
                                    placeholder="Selecciona una finca del padrón"
                                    emptyMessage="No hay fincas disponibles."
                                />
                            </FormField>
                        )}

                        {!isEditing && fincaMode === "new" && (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <InputField {...bindFinca("nombre")} label="Nombre de la finca" placeholder="Ej. Fundo Tambogrande" className="sm:col-span-2" />
                                <InputField {...bindFinca("haTotal")} label="Hectáreas totales" placeholder="0.00" step="0.01" unit="ha" />
                                <InputField {...bindFinca("haCultivo")} label="Hectáreas de cultivo" placeholder="0.00" step="0.01" unit="ha" />
                                <InputField {...bindFinca("departamento")} label="Departamento" placeholder="Piura" />
                                <InputField {...bindFinca("provincia")} label="Provincia" placeholder="Sullana" />
                                <InputField {...bindFinca("distrito")} label="Distrito" placeholder="Marcavelica" className="sm:col-span-2" />
                                <InputField {...bindFinca("latitud")} label="Latitud" placeholder="-5.1945" step="0.0000001" optional />
                                <InputField {...bindFinca("longitud")} label="Longitud" placeholder="-80.6328" step="0.0000001" optional />
                            </div>
                        )}

                        {isEditing && <InfoField label="Finca" value={initialRecord.values.fincaNombre ?? "—"} />}
                        <InfoField label="Código FYV de la finca en campaña" value={initialRecord?.codigoFyv ?? previewCode} />
                        {!isEditing && <p className="text-[12px] leading-relaxed text-ink-muted">El código se asigna automáticamente al guardar la entrevista.</p>}
                    </ModalSection>

                    <ModalSection title="Datos agronómicos de esta campaña">
                        <p className="text-[12px] leading-relaxed text-ink-muted">La densidad, el riego y las aplicaciones corresponden a esta finca en la campaña seleccionada.</p>
                        {isViewOnly ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <InfoField label="Densidad de plantación" value={agronomic.densidadPlantacion} />
                                <InfoField label="Distanciamiento" value={agronomic.distanciamiento} suffix="m" />
                                <InfoField label="Frecuencia de riego" value={agronomic.frecuenciaRiego} suffix="/día" />
                                <InfoField label="Nombre de aplicación" value={agronomic.nombreAplicacion} />
                                <InfoField label="Aplicaciones al año" value={agronomic.aplicacionesAlAno} suffix="/año" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <InputField {...bindAgronomic("densidadPlantacion")} label="Densidad de plantación" placeholder="0.00" step="0.001" />
                                <InputField {...bindAgronomic("distanciamiento")} label="Distanciamiento" placeholder="0.00" step="0.001" unit="m" />
                                <InputField {...bindAgronomic("frecuenciaRiego")} label="Frecuencia de riego" placeholder="0" step="1" unit="/día" />
                                <InputField {...bindAgronomic("nombreAplicacion")} label="Nombre de aplicación" placeholder="Fertilizante X" />
                                <InputField {...bindAgronomic("aplicacionesAlAno")} label="Aplicaciones al año" placeholder="0" step="1" unit="/año" />
                            </div>
                        )}
                    </ModalSection>
                </div>
                <FormField error={submitError} />
            </div>
        </AppModal>
    );
}
