import { useState } from "react";
import { PackagePlus, Save, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import InputField from "@/shared/components/InputField";
import { SummaryBar } from "@/shared/components/InfoField";
import { Button } from "@/shared/components/ui/button";
import { useModalForm, useResetOnToggle } from "@/shared/hooks/useModalForm";
import {
    EMPTY_AMPLIACION,
    getKilosAmpliados,
    getKilosTotales,
    validateAmpliacion,
    type AmpliacionErrors,
    type AmpliacionFormValues,
    type CertificadoCampanaLocal,
} from "@/modules/campaigns/campaignCertificate.utils";
import { formatKg } from "@/shared/utils/format";

interface CampaignCertificationExpansionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    certificate: CertificadoCampanaLocal | null;
    onSave: (values: AmpliacionFormValues) => void;
}

/** Ampliación de kilos de una certificación: cuánto se suma, desde cuándo y con qué respaldo. */
export default function CampaignCertificationExpansionModal({ open, onOpenChange, certificate, onSave }: CampaignCertificationExpansionModalProps) {
    const [values, , set] = useModalForm<AmpliacionFormValues>(open, EMPTY_AMPLIACION);
    const [errors, setErrors] = useState<AmpliacionErrors>({});

    useResetOnToggle(open, () => setErrors({}));

    if (!certificate) return null;

    const bind = (field: keyof AmpliacionFormValues) => ({
        id: `cert-expansion-${field}`,
        value: values[field],
        error: errors[field],
        onChange: (next: string) => {
            set(field)(next);
            setErrors((current) => ({ ...current, [field]: undefined }));
        },
    });

    const handleSave = async () => {
        const nextErrors = validateAmpliacion(values);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;
        await onSave(values);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<PackagePlus size={22} strokeWidth={2} />}
            title="Registrar Ampliación"
            description={certificate.nombre}
            size="sm"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleSave}>
                        <Save size={20} strokeWidth={2.5} /> Guardar ampliación
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <SummaryBar
                    items={[
                        { label: "Kilos iniciales", value: `${formatKg(certificate.kilosIniciales)} kg` },
                        { label: "Ampliaciones", value: `${formatKg(getKilosAmpliados(certificate))} kg` },
                        { label: "Total actual", value: `${formatKg(getKilosTotales(certificate))} kg`, tone: "brand" },
                    ]}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InputField {...bind("kilos")} label="Kilos adicionales:" required unit="kg" step="0.001" min={0} placeholder="0" />
                    <InputField {...bind("fecha")} type="date" label="Fecha:" required />
                </div>
                <InputField {...bind("referencia")} label="Referencia o evidencia:" optional maxLength={255} placeholder="Ej. Adenda 02 / correo del organismo" />
            </div>
        </AppModal>
    );
}
