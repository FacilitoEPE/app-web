import { useState } from "react";
import { ArrowLeft, Banknote, Save } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import { InfoField } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import { Button } from "@/shared/components/ui/button";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import { formatMoney } from "@/shared/utils/format";
import { formatFecha } from "@/modules/campaigns/api/fecha.util";
import { validateCarrierAdvance, type CarrierAdvanceValues } from "@/modules/campaigns/campaignCarrier.utils";

interface Props {
    description: string;
    remaining: number;
    onBack: () => void;
    onSave: (values: CarrierAdvanceValues) => Promise<void>;
}

export default function CampaignCarrierAdvanceModal({ description, remaining, onBack, onSave }: Props) {
    const [values, setValues] = useState<CarrierAdvanceValues>(() => ({
        fecha: formatFecha(new Date()),
        monto: String(remaining),
        referencia: "",
    }));
    const { errors, saving, submit, clearError } = useFormSubmit({
        open: true,
        backendFields: { fecha: "fecha", monto: "monto", referencia: "referencia" },
        validate: (current: CarrierAdvanceValues) => validateCarrierAdvance(current, remaining),
        onSubmit: onSave,
    });
    const bind = (field: keyof CarrierAdvanceValues) => ({
        id: `carrier-advance-${field}`,
        required: true,
        disabled: saving,
        error: errors[field],
        value: values[field],
        onChange: (value: string) => {
            setValues(current => ({ ...current, [field]: value }));
            clearError(field);
        },
    });

    return (
        <AppModal open busy={saving} onOpenChange={open => { if (!open) onBack(); }}
            icon={<Banknote size={22} />} title="Registrar desembolso del adelanto"
            description={description} size="md"
            footer={<>
                <Button variant="outline" size="xl" disabled={saving} onClick={onBack}><ArrowLeft size={18} /> Volver al acuerdo</Button>
                <Button size="xl" disabled={saving} onClick={() => submit(values)}><Save size={18} /> Registrar desembolso</Button>
            </>}>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <FormField error={errors._form} />
                    <InfoField label="Pendiente de desembolso" value={`S/ ${formatMoney(remaining)}`} />
                </div>
                <InputField {...bind("fecha")} label="Fecha de desembolso" type="date" />
                <InputField {...bind("monto")} label="Importe desembolsado" type="number" min={0.01} step="0.01" leading="S/" />
                <InputField {...bind("referencia")} label="Referencia del desembolso" placeholder="Ej. número de operación" maxLength={100} className="sm:col-span-2" />
                <p className="text-sm text-ink-muted sm:col-span-2">Registra un desembolso ya realizado. Quedará disponible para aplicarlo a las liquidaciones de transporte en Gestión de Compra.</p>
            </div>
        </AppModal>
    );
}
