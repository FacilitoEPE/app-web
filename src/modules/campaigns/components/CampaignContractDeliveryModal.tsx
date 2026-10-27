import { useEffect, useState } from "react";
import { PackageCheck, Save, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import InputField from "@/shared/components/InputField";
import { Button } from "@/shared/components/ui/button";
import { Combobox } from "@/shared/components/ui/combobox";
import { Textarea } from "@/shared/components/ui/textarea";
import {
    EMPTY_CONTRACT_DELIVERY,
    deliveryToValues,
    validateContractDelivery,
    type CampaignContractDeliveryErrors,
    type CampaignContractDeliveryLocal,
    type CampaignContractDeliveryValues,
} from "@/modules/campaigns/campaignContractDelivery.utils";

const VARIEDAD_OPTIONS = [
    { value: "Kent", label: "Kent (Exportación / Fresco)" },
    { value: "Edward", label: "Edward" },
    { value: "Keitt", label: "Keitt" },
    { value: "Hass", label: "Hass" },
    { value: "Ataulfo", label: "Ataulfo" },
];

interface Props {
    open: boolean;
    delivery: CampaignContractDeliveryLocal | null;
    onOpenChange: (open: boolean) => void;
    onSave: (values: CampaignContractDeliveryValues) => void;
}

export default function CampaignContractDeliveryModal({ open, delivery, onOpenChange, onSave }: Props) {
    const [values, setValues] = useState<CampaignContractDeliveryValues>({ ...EMPTY_CONTRACT_DELIVERY, variedad: "Kent" });
    const [errors, setErrors] = useState<CampaignContractDeliveryErrors>({});

    useEffect(() => {
        if (!open) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setValues(delivery ? deliveryToValues(delivery) : { ...EMPTY_CONTRACT_DELIVERY, variedad: "Kent" });
        setErrors({});
    }, [open, delivery]);

    const update = (field: keyof CampaignContractDeliveryValues, value: string) => {
        setValues((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const save = () => {
        const nextErrors = validateContractDelivery(values);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length === 0) onSave(values);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<PackageCheck size={22} strokeWidth={2.25} />}
            title={delivery ? "Editar Entrega" : "Registrar Entrega"}
            description="Programa la cantidad, variedad y destino correspondiente a este contrato."
            size="lg"
            footer={(
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}><X size={19} /> Cancelar</Button>
                    <Button size="xl" onClick={save}><Save size={19} /> {delivery ? "Guardar cambios" : "Guardar entrega"}</Button>
                </>
            )}
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField id="delivery-date" type="date" label="Fecha" required value={values.fecha} error={errors.fecha} onChange={(value) => update("fecha", value)} />
                <InputField id="delivery-kilos" label="Kilos programados" required unit="kg" min={0} step="0.001" placeholder="0.00" value={values.kilosProgramados} error={errors.kilosProgramados} onChange={(value) => update("kilosProgramados", value)} />
                <FormField id="delivery-variety" label="Variedad comprometida" required>
                    <Combobox
                        options={VARIEDAD_OPTIONS}
                        value={values.variedad ?? "Kent"}
                        onChange={(val) => update("variedad", val)}
                        placeholder="Seleccionar variedad"
                    />
                </FormField>
                <InputField id="delivery-destination" label="Destino" required placeholder="Ej. Puerto del Callao" value={values.destino} error={errors.destino} onChange={(value) => update("destino", value)} />
                <FormField id="delivery-notes" label="Observaciones" optional className="sm:col-span-2">
                    <Textarea id="delivery-notes" className="min-h-20 resize-none" placeholder="Añade indicaciones para esta entrega..." value={values.observaciones} onChange={(event) => update("observaciones", event.target.value)} />
                </FormField>
            </div>
        </AppModal>
    );
}
