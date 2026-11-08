import { PackageCheck, Save, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import InputField from "@/shared/components/InputField";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import {
    EMPTY_CONTRACT_DELIVERY,
    deliveryToValues,
    validateContractDelivery,
    type CampaignContractDeliveryLocal,
    type CampaignContractDeliveryValues,
} from "@/modules/campaigns/campaignContractDelivery.utils";
import CampaignVarietyQuantitiesFields from '@/modules/campaigns/components/CampaignVarietyQuantitiesFields';
import { deliveryVarietyBalances, sumVarietyKilos, toVarietyQuantities, validateVarietyQuantities, varietyQuantitiesToRows, type ContractVarietyOption, type VarietyQuantity, type VarietyQuantityRow } from '@/modules/campaigns/campaignVarietyQuantities.utils';
import { useModalForm } from '@/shared/hooks/useModalForm';
import { useFormSubmit } from '@/shared/hooks/useFormSubmit';
import { formatKg } from '@/shared/utils/format';

interface Props {
    open: boolean;
    delivery: CampaignContractDeliveryLocal | null;
    fruitName: string;
    varietyOptions: ContractVarietyOption[];
    initialVarieties: VarietyQuantity[];
    agreedVarieties: VarietyQuantity[];
    deliveryBreakdowns: Array<{ id: number; varieties: VarietyQuantity[] }>;
    availableTotal: number;
    onOpenChange: (open: boolean) => void;
    onSave: (values: CampaignContractDeliveryValues, varieties: VarietyQuantity[]) => void | Promise<void>;
}

export default function CampaignContractDeliveryModal({ open, delivery, fruitName, varietyOptions, initialVarieties, agreedVarieties, deliveryBreakdowns, availableTotal, onOpenChange, onSave }: Props) {
    const [values, setValues] = useModalForm<CampaignContractDeliveryValues>(open, delivery ? deliveryToValues(delivery) : EMPTY_CONTRACT_DELIVERY);
    const [rows, setRows] = useModalForm<VarietyQuantityRow[]>(open, initialVarieties.length ? varietyQuantitiesToRows(initialVarieties) : [{ frutaDerivadaId: '', kilos: delivery ? String(delivery.kilosProgramados) : '' }]);
    const balances = deliveryVarietyBalances(agreedVarieties, deliveryBreakdowns, rows, delivery?.id);
    const incompleteHistory = deliveryBreakdowns.some(row => row.id !== delivery?.id && !row.varieties.length);
    const { errors, setErrors, saving, submit } = useFormSubmit<CampaignContractDeliveryValues>({
        open,
        validate: current => ({
            ...validateContractDelivery(current),
            ...validateVarietyQuantities(rows, varietyOptions),
            ...Object.fromEntries(rows.flatMap((row, index) => {
                const balance = balances.find(item => String(item.frutaDerivadaId) === row.frutaDerivadaId);
                return balance && balance.remaining < 0 ? [[`variedades.${index}.kilos`, `Supera los ${formatKg(balance.available)} kg disponibles de esta variedad.`]] : [];
            })),
            ...(sumVarietyKilos(rows) > availableTotal ? { variedades: `El total supera los ${formatKg(availableTotal)} kg disponibles del contrato.` } : {}),
        }),
        onSubmit: current => onSave(current, toVarietyQuantities(rows)),
        backendFields: { variedades: 'variedades', fecha: 'fecha', kilosProgramados: 'variedades', destino: 'destino', observaciones: 'observaciones' },
    });

    const update = (field: keyof CampaignContractDeliveryValues, value: string) => {
        setValues((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const updateRows = (next: VarietyQuantityRow[]) => {
        setRows(next);
        setErrors(current => Object.fromEntries(Object.entries(current).filter(([field]) => !field.startsWith('variedades') && field !== 'kilosProgramados')));
    };

    // El backend vuelve a calcular el total desde las filas enviadas.
    const save = () => submit({ fecha: values.fecha, destino: values.destino, observaciones: values.observaciones, kilosProgramados: String(sumVarietyKilos(rows)) });

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<PackageCheck size={22} strokeWidth={2.25} />}
            title={delivery ? "Editar Entrega" : "Registrar Entrega"}
            description="Programa la cantidad y destino correspondiente a este contrato."
            size="lg"
            busy={saving}
            footer={(
                <>
                    <Button variant="outline" size="xl" disabled={saving} onClick={() => onOpenChange(false)}><X size={19} /> Cancelar</Button>
                    <Button size="xl" disabled={saving} onClick={save}><Save size={19} /> {saving ? 'Guardando…' : delivery ? "Guardar cambios" : "Guardar entrega"}</Button>
                </>
            )}
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputField id="delivery-date" type="date" label="Fecha programada" required value={values.fecha} error={errors.fecha} onChange={(value) => update("fecha", value)} />
                <CampaignVarietyQuantitiesFields id="delivery" fruitName={fruitName} rows={rows} options={varietyOptions} errors={{ ...errors, variedades: errors.variedades ?? errors.kilosProgramados }} totalLabel="Total de la entrega" varietyBalances={balances} onChange={updateRows} disabled={saving} />
                <FormField hint={!agreedVarieties.length
                    ? 'Completa y guarda las variedades acordadas en Editar contrato antes de programar entregas.'
                    : incompleteHistory ? 'Hay entregas históricas pendientes de desglose. Por la política vigente, no consumen los cupos actuales.'
                    : 'Los saldos se validan por variedad al guardar. El desglose queda guardado en el servidor.'} className="sm:col-span-2" />
                <InputField id="delivery-destination" label="Destino" required placeholder="Ej. Puerto del Callao" value={values.destino} error={errors.destino} onChange={(value) => update("destino", value)} className="sm:col-span-2" />
                <FormField id="delivery-notes" label="Observaciones" optional className="sm:col-span-2">
                    <Textarea id="delivery-notes" className="min-h-20 resize-none" placeholder="Añade indicaciones para esta entrega..." value={values.observaciones} onChange={(event) => update("observaciones", event.target.value)} />
                </FormField>
                <FormField error={errors._form} className="sm:col-span-2" />
            </div>
        </AppModal>
    );
}
