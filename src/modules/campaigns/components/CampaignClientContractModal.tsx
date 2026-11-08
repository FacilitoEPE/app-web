import { useState } from "react";
import { FileSignature, Save, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { InfoField } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import {
    CONTRACT_CURRENCIES,
    EMPTY_CAMPAIGN_CLIENT_CONTRACT,
    contractToValues,
    validateCampaignClientContract,
    type CampaignClientContractLocal,
    type CampaignClientContractValues,
} from "@/modules/campaigns/campaignClientContract.utils";
import CampaignVarietyQuantitiesFields from '@/modules/campaigns/components/CampaignVarietyQuantitiesFields';
import { sumVarietyKilos, toVarietyQuantities, validateVarietyQuantities, varietyQuantitiesToRows, type ContractVarietyOption, type VarietyQuantity, type VarietyQuantityRow } from '@/modules/campaigns/campaignVarietyQuantities.utils';
import { useModalForm, useResetOnToggle } from '@/shared/hooks/useModalForm';
import { useFormSubmit } from '@/shared/hooks/useFormSubmit';

interface Props {
    open: boolean;
    mode: "create" | "edit" | "view";
    contract: CampaignClientContractLocal | null;
    fruitName: string;
    varietyOptions: ContractVarietyOption[];
    initialVarieties: VarietyQuantity[];
    onOpenChange: (open: boolean) => void;
    onSave: (values: CampaignClientContractValues, archivo: File | null, varieties: VarietyQuantity[]) => void | Promise<void>;
}

export default function CampaignClientContractModal({ open, mode, contract, fruitName, varietyOptions, initialVarieties, onOpenChange, onSave }: Props) {
    const [values, setValues] = useModalForm(open, contract ? contractToValues(contract) : EMPTY_CAMPAIGN_CLIENT_CONTRACT);
    const [rows, setRows] = useModalForm<VarietyQuantityRow[]>(open, initialVarieties.length ? varietyQuantitiesToRows(initialVarieties) : [{ frutaDerivadaId: '', kilos: contract ? String(contract.cantidadPropuestaKg) : '' }]);
    const [archivo, setArchivo] = useState<File | null>(null);
    useResetOnToggle(open, () => setArchivo(null));
    const { errors, setErrors, saving, submit } = useFormSubmit<CampaignClientContractValues>({
        open,
        validate: current => ({ ...validateCampaignClientContract(current, archivo, Boolean(contract?.archivo)), ...validateVarietyQuantities(rows, varietyOptions) }),
        onSubmit: current => onSave(current, archivo, toVarietyQuantities(rows)),
        backendFields: { variedades: 'variedades', precioKg: 'precioKg', moneda: 'moneda', kilosAcordados: 'variedades', condicionesPago: 'condicionesPago', condicionesEntrega: 'condicionesEntrega' },
    });

    const update = (field: keyof CampaignClientContractValues, value: string) => {
        setValues((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const updateRows = (next: VarietyQuantityRow[]) => {
        setRows(next);
        setErrors(current => Object.fromEntries(Object.entries(current).filter(([field]) => !field.startsWith('variedades') && field !== 'cantidadPropuestaKg')));
    };

    const save = () => submit({ ...values, cantidadPropuestaKg: String(sumVarietyKilos(rows)) });

    const symbol = CONTRACT_CURRENCIES.find((item) => item.value === values.moneda)?.symbol ?? "$";
    const viewOnly = mode === "view";

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<FileSignature size={22} strokeWidth={2.25} />}
            title={viewOnly ? "Detalle del Contrato" : mode === "edit" ? "Editar Contrato" : "Registrar Contrato"}
            description={viewOnly ? "Consulta las condiciones comerciales acordadas." : "Registra las condiciones comerciales y adjunta el documento firmado."}
            size="xl"
            busy={saving}
            footer={viewOnly ? (
                <Button size="xl" onClick={() => onOpenChange(false)}>Cerrar</Button>
            ) : (
                <>
                    <Button variant="outline" size="xl" disabled={saving} onClick={() => onOpenChange(false)}><X size={19} /> Cancelar</Button>
                    <Button size="xl" disabled={saving} onClick={save}><Save size={19} /> {saving ? 'Guardando…' : mode === "edit" ? "Guardar cambios" : "Guardar contrato"}</Button>
                </>
            )}
        >
            {viewOnly && contract ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InfoField label="Precio por kg" value={`${symbol} ${contract.precioKg.toLocaleString("es-PE", { maximumFractionDigits: 4 })}`} />
                    <InfoField label="Moneda" value={contract.moneda} />
                    <InfoField label="Cantidad propuesta" value={contract.cantidadPropuestaKg.toLocaleString("es-PE", { maximumFractionDigits: 3 })} suffix="kg" />
                    <InfoField label="Condiciones de pago" value={contract.condicionesPago} />
                    <InfoField label="Condiciones de entrega" value={contract.condicionesEntrega} />
                    <InfoField label="Observaciones" value={contract.observaciones || "Sin observaciones"} />
                    <div className="sm:col-span-2">
                        <FileDropzone label="Contrato" variant="horizontal" file={contract.archivo} readOnly onChange={() => undefined} />
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InputField id="contract-price" label="Precio por kg" required leading={symbol} min={0} step="0.0001" placeholder="0.00" value={values.precioKg} error={errors.precioKg} onChange={(value) => update("precioKg", value)} />
                    <FormField id="client-contract-moneda" label="Moneda" required error={errors.moneda}>
                        <Select items={CONTRACT_CURRENCIES} value={values.moneda || null} onValueChange={value => update("moneda", value ?? "")}>
                            <SelectTrigger id="client-contract-moneda" className="w-full" aria-invalid={errors.moneda ? true : undefined}>
                                <SelectValue placeholder="Seleccionar moneda" />
                            </SelectTrigger>
                            <SelectContent>
                                {CONTRACT_CURRENCIES.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </FormField>
                    <CampaignVarietyQuantitiesFields id="contract" fruitName={fruitName} rows={rows} options={varietyOptions} errors={{ ...errors, variedades: errors.variedades ?? errors.cantidadPropuestaKg }} totalLabel="Total acordado" onChange={updateRows} disabled={saving} />
                    <FormField hint="El total se calcula sumando las variedades. El desglose queda guardado en el servidor." className="sm:col-span-2" />
                    <InputField id="contract-payment" label="Condiciones de pago" required placeholder="Ej. 50% adelanto y saldo contra entrega" value={values.condicionesPago} error={errors.condicionesPago} onChange={(value) => update("condicionesPago", value)} />
                    <InputField id="contract-delivery" label="Condiciones de entrega" required placeholder="Ej. FOB Puerto del Callao" value={values.condicionesEntrega} error={errors.condicionesEntrega} onChange={(value) => update("condicionesEntrega", value)} />
                    <FormField id="contract-notes" label="Observaciones" optional>
                        <Textarea id="contract-notes" className="min-h-20 resize-none" placeholder="Añade indicaciones relevantes..." value={values.observaciones} onChange={(event) => update("observaciones", event.target.value)} />
                    </FormField>
                    <FormField error={errors.archivo} className="sm:col-span-2">
                        <FileDropzone label="Contrato" variant="horizontal" required hint="PDF o imagen · Máx. 10 MB" file={archivo ?? contract?.archivo ?? null} replaceable={Boolean(contract?.archivo)} onChange={(file) => { setArchivo(file); setErrors((current) => ({ ...current, archivo: undefined })); }} />
                    </FormField>
                    <FormField error={errors._form} className="sm:col-span-2" />
                </div>
            )}
        </AppModal>
    );
}
