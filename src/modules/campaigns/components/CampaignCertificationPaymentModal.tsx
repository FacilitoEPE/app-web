import { useState } from "react";
import { Save, Wallet, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import InputField from "@/shared/components/InputField";
import { SummaryBar } from "@/shared/components/InfoField";
import { Button } from "@/shared/components/ui/button";
import { useModalForm, useResetOnToggle } from "@/shared/hooks/useModalForm";
import {
    EMPTY_PAGO,
    getMonedaSymbol,
    getSaldoPendiente,
    getTotalPagado,
    validatePago,
    type CertificadoCampanaLocal,
    type PagoErrors,
    type PagoFormValues,
} from "@/modules/campaigns/campaignCertificate.utils";
import { formatMoney } from "@/shared/utils/format";

interface CampaignCertificationPaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    certificate: CertificadoCampanaLocal | null;
    onSave: (values: PagoFormValues, evidencia: File | null) => void;
}

/** Pago de una certificación: cuánto, cuándo, con qué operación y con qué evidencia. No puede superar el saldo. */
export default function CampaignCertificationPaymentModal({ open, onOpenChange, certificate, onSave }: CampaignCertificationPaymentModalProps) {
    const [values, , set] = useModalForm<PagoFormValues>(open, EMPTY_PAGO);
    const [errors, setErrors] = useState<PagoErrors>({});
    const [evidence, setEvidence] = useState<File | null>(null);

    useResetOnToggle(open, () => {
        setErrors({});
        setEvidence(null);
    });

    if (!certificate) return null;

    const symbol = getMonedaSymbol(certificate.moneda);
    const balance = getSaldoPendiente(certificate);

    const bind = (field: keyof PagoFormValues) => ({
        id: `cert-payment-${field}`,
        value: values[field],
        error: errors[field],
        onChange: (next: string) => {
            set(field)(next);
            setErrors((current) => ({ ...current, [field]: undefined }));
        },
    });

    const handleSave = () => {
        const nextErrors = validatePago(values, balance);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;
        onSave(values, evidence);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Wallet size={22} strokeWidth={2} />}
            title="Registrar Pago"
            description={certificate.nombre}
            size="sm"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleSave}>
                        <Save size={20} strokeWidth={2.5} /> Guardar pago
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <SummaryBar
                    items={[
                        { label: "Costo", value: `${symbol} ${formatMoney(certificate.costo)}` },
                        { label: "Pagado", value: `${symbol} ${formatMoney(getTotalPagado(certificate))}` },
                        { label: "Saldo pendiente", value: `${symbol} ${formatMoney(balance)}`, tone: balance > 0 ? "highlight" : "brand" },
                    ]}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InputField {...bind("monto")} label="Monto:" required leading={symbol} step="0.01" min={0} placeholder="0.00" />
                    <InputField {...bind("fecha")} type="date" label="Fecha:" required />
                </div>
                <InputField {...bind("referencia")} label="Referencia de operación:" optional maxLength={255} placeholder="Ej. N° de operación o transferencia" />

                <FormField>
                    <FileDropzone
                        label="Evidencia del pago"
                        variant="horizontal"
                        optional
                        hint="PDF o imagen · Máx. 10 MB"
                        file={evidence}
                        onChange={setEvidence}
                    />
                </FormField>
            </div>
        </AppModal>
    );
}
