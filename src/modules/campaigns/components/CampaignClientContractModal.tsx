import { useEffect, useState } from "react";
import { FileSignature, Save, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { InfoField } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import { Button } from "@/shared/components/ui/button";
import { Combobox } from "@/shared/components/ui/combobox";
import { Textarea } from "@/shared/components/ui/textarea";
import {
    CONTRACT_CURRENCIES,
    EMPTY_CAMPAIGN_CLIENT_CONTRACT,
    contractToValues,
    validateCampaignClientContract,
    type CampaignClientContractErrors,
    type CampaignClientContractLocal,
    type CampaignClientContractValues,
} from "@/modules/campaigns/campaignClientContract.utils";

interface Props {
    open: boolean;
    mode: "create" | "edit" | "view";
    contract: CampaignClientContractLocal | null;
    onOpenChange: (open: boolean) => void;
    onSave: (values: CampaignClientContractValues, archivo: File | null) => void;
}

export default function CampaignClientContractModal({ open, mode, contract, onOpenChange, onSave }: Props) {
    const [values, setValues] = useState(EMPTY_CAMPAIGN_CLIENT_CONTRACT);
    const [archivo, setArchivo] = useState<File | null>(null);
    const [errors, setErrors] = useState<CampaignClientContractErrors>({});

    useEffect(() => {
        if (!open) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setValues(contract ? contractToValues(contract) : EMPTY_CAMPAIGN_CLIENT_CONTRACT);
        setArchivo(null);
        setErrors({});
    }, [open, contract]);

    const update = (field: keyof CampaignClientContractValues, value: string) => {
        setValues((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const save = () => {
        const nextErrors = validateCampaignClientContract(values, archivo, Boolean(contract?.archivo));
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;
        onSave(values, archivo);
    };

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
            footer={viewOnly ? (
                <Button size="xl" onClick={() => onOpenChange(false)}>Cerrar</Button>
            ) : (
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}><X size={19} /> Cancelar</Button>
                    <Button size="xl" onClick={save}><Save size={19} /> {mode === "edit" ? "Guardar cambios" : "Guardar contrato"}</Button>
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
                    <FormField label="Moneda" required error={errors.moneda}>
                        <Combobox options={CONTRACT_CURRENCIES} value={values.moneda} onChange={(value) => update("moneda", value)} placeholder="Seleccionar moneda" />
                    </FormField>
                    <InputField id="contract-quantity" label="Cantidad propuesta" required unit="kg" min={0} step="0.001" placeholder="0.00" hint="Al registrar, esta cantidad se considera como kilos acordados." value={values.cantidadPropuestaKg} error={errors.cantidadPropuestaKg} onChange={(value) => update("cantidadPropuestaKg", value)} />
                    <InputField id="contract-payment" label="Condiciones de pago" required placeholder="Ej. 50% adelanto y saldo contra entrega" value={values.condicionesPago} error={errors.condicionesPago} onChange={(value) => update("condicionesPago", value)} />
                    <InputField id="contract-delivery" label="Condiciones de entrega" required placeholder="Ej. FOB Puerto del Callao" value={values.condicionesEntrega} error={errors.condicionesEntrega} onChange={(value) => update("condicionesEntrega", value)} />
                    <FormField id="contract-notes" label="Observaciones" optional>
                        <Textarea id="contract-notes" className="min-h-20 resize-none" placeholder="Añade indicaciones relevantes..." value={values.observaciones} onChange={(event) => update("observaciones", event.target.value)} />
                    </FormField>
                    <FormField error={errors.archivo} className="sm:col-span-2">
                        <FileDropzone label="Contrato" variant="horizontal" required hint="PDF o imagen · Máx. 10 MB" file={archivo ?? contract?.archivo ?? null} replaceable={Boolean(contract?.archivo)} onChange={(file) => { setArchivo(file); setErrors((current) => ({ ...current, archivo: undefined })); }} />
                    </FormField>
                </div>
            )}
        </AppModal>
    );
}
