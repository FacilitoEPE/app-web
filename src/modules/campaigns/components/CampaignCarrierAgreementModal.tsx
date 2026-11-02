import { usesV1 } from '@/shared/api/data-contract';
import { useState } from "react";
import { Save, Wallet, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { InfoField, SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import SegmentedControl from "@/shared/components/SegmentedControl";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useModalForm, useResetOnToggle } from "@/shared/hooks/useModalForm";
import { formatDisplayDate, formatMoney } from "@/shared/utils/format";
import { MONEDA_OPTIONS, getMonedaSymbol } from "@/modules/campaigns/campaignCertificate.utils";
import {
    PAYMENT_TYPES,
    getAgreementBalance,
    getAgreementStatus,
    toAgreementValues,
    validateAgreement,
    type AgreementErrors,
    type AgreementFormValues,
    type CarrierPaymentAgreement,
    type PaymentType,
} from "@/modules/campaigns/campaignCarrier.utils";

export type AgreementModalMode = "create" | "edit" | "view";

interface CampaignCarrierAgreementModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** "create" registra el acuerdo; "view" lo muestra (el acuerdo no es editable una vez guardado) */
    mode: AgreementModalMode;
    carrierName: string;
    campaignName: string;
    agreement: CarrierPaymentAgreement | null;
    onSave: (values: AgreementFormValues, boleta: File | null) => void;
}

const TITLES: Record<AgreementModalMode, string> = {
    create: "Registrar acuerdo de pago",
    edit: "Registrar acuerdo de pago",
    view: "Acuerdo de pago",
};

/**
 * Acuerdo de pago con un transportista para la campaña: se paga de una vez ("Pago único") o en dos partes ("Con
 * adelanto"). Son condiciones acordadas; el pago efectivo se registra en Liquidación de compra.
 * Una vez registrado, el acuerdo ya no se puede editar (solo consultar).
 * Cuando es con adelanto, adjuntar el comprobante o boleta es obligatorio; cuando es pago único, no se sube archivo.
 */
export default function CampaignCarrierAgreementModal({ open, onOpenChange, mode, carrierName, campaignName, agreement, onSave }: CampaignCarrierAgreementModalProps) {
    const isView = mode === "view";
    const [values, , set] = useModalForm<AgreementFormValues>(open, toAgreementValues(agreement));
<<<<<<< HEAD
    const [boleta, setBoleta] = useState<File | null>(agreement?.boleta ?? null);
    const [errors, setErrors] = useState<AgreementErrors & { boleta?: string }>({});
=======
    const [boleta, setBoleta] = useState<File | null>(null);
    const [errors, setErrors] = useState<AgreementErrors>({});
>>>>>>> e0912f885278a1780aadab2fa605b15095325f55

    useResetOnToggle(open, () => {
        setErrors({});
        setBoleta(null);
    });

    const update = <K extends keyof AgreementFormValues>(field: K, value: AgreementFormValues[K]) => {
        set(field)(value);
        setErrors((current) => ({ ...current, [field]: undefined, ...(field === "tipo" ? { boleta: undefined } : {}) }));
    };

    const isAdvance = values.tipo === "adelanto";

    const handleSave = async () => {
        const next: AgreementErrors & { boleta?: string } = validateAgreement(values);
        if (usesV1()) delete next.fechaAdelanto;

        // Cuando es con adelanto, el archivo es obligatorio
        if (isAdvance && !boleta) {
            next.boleta = "Adjunta la boleta o recibo del adelanto.";
        }

        if (Object.keys(next).length > 0) {
            setErrors(next);
            return;
        }

        // Si es con adelanto se adjunta el comprobante; si es pago único no se envía archivo
        await onSave(values, isAdvance ? boleta : null);
    };

    const symbol = getMonedaSymbol(isView && agreement ? agreement.moneda : values.moneda);
    const total = Number(values.total);
    const advance = Number(values.adelanto);
    const showSummary = isAdvance && total > 0 && advance > 0;

    const bind = (field: keyof AgreementFormValues) => ({
        id: `carrier-agreement-${field}`,
        required: true,
        value: values[field],
        error: errors[field],
        onChange: (next: string) => update(field, next as never),
    });

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Wallet size={22} strokeWidth={2} />}
            title={TITLES[mode]}
            description={`${carrierName} · ${campaignName}`}
            size="md"
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
                            <Save size={20} strokeWidth={2.5} /> Guardar acuerdo
                        </Button>
                    </>
                )
            }
        >
            {isView && agreement ? (
                <div className="flex flex-col gap-5">
                    <SummaryBar
                        items={
                            agreement.tipo === "adelanto" && agreement.adelanto !== null
                                ? [
                                    { label: "Total", value: `${symbol} ${formatMoney(agreement.total)}` },
                                    { label: "Adelanto", value: `${symbol} ${formatMoney(agreement.adelanto)}` },
                                    { label: "Saldo", value: `${symbol} ${formatMoney(getAgreementBalance(agreement.total, agreement.adelanto))}`, tone: agreement.saldoPagado ? "brand" : "highlight" },
                                ]
                                : [{ label: "Total acordado", value: `${symbol} ${formatMoney(agreement.total)}`, tone: "brand" }]
                        }
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InfoField label="Tipo de pago" value={PAYMENT_TYPES.find((type) => type.value === agreement.tipo)?.label} />
                        <InfoField label="Estado" variant="plain" value={<StatusBadge status={getAgreementStatus(agreement)} />} />
                        {agreement.tipo === "adelanto" && <InfoField label="Fecha del adelanto" value={formatDisplayDate(agreement.fechaAdelanto)} />}
                        <InfoField label="Fecha de pago (final)" value={formatDisplayDate(agreement.fechaPago)} />
                    </div>
                    {agreement.boleta && (
                        <FileDropzone label="Boleta o recibo del adelanto" variant="horizontal" hasColon={false} file={agreement.boleta} readOnly onChange={() => undefined} />
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    <p className="text-[12.5px] leading-relaxed text-ink-muted">
                        Estas condiciones se consultarán al liquidar al transportista. El pago efectivo se registra en Liquidación de compra.
                    </p>

                    <FormField label="Tipo de pago" required hint={PAYMENT_TYPES.find((type) => type.value === values.tipo)?.hint}>
                        <SegmentedControl options={PAYMENT_TYPES} value={values.tipo} onChange={(next) => update("tipo", next as PaymentType)} />
                    </FormField>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField id="carrier-agreement-moneda" label="Moneda" required error={errors.moneda}>
<<<<<<< HEAD
                            <Select items={usesV1() ? MONEDA_OPTIONS.filter((o) => o.value === "PEN") : MONEDA_OPTIONS} value={values.moneda || null} onValueChange={(next) => update("moneda", (next as string | null) ?? "")}>
=======
                            <Select items={MONEDA_OPTIONS.filter(o => o.value === "PEN" || o.value === "USD")} value={values.moneda || null} onValueChange={(next) => update("moneda", (next as string | null) ?? "")}>
>>>>>>> e0912f885278a1780aadab2fa605b15095325f55
                                <SelectTrigger id="carrier-agreement-moneda" className="w-full" aria-invalid={errors.moneda ? true : undefined}>
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
<<<<<<< HEAD
                                    {(usesV1() ? MONEDA_OPTIONS.filter((o) => o.value === "PEN") : MONEDA_OPTIONS).map((option) => (
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                    ))}
=======
                                    {MONEDA_OPTIONS.filter(o => o.value === "PEN" || o.value === "USD").map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
>>>>>>> e0912f885278a1780aadab2fa605b15095325f55
                                </SelectContent>
                            </Select>
                        </FormField>
                        <InputField {...bind("total")} label="Cantidad total" leading={symbol} step="0.01" min={0} placeholder="0.00" />

                        {isAdvance && (
                            <>
                                <InputField {...bind("adelanto")} label="Monto del adelanto" leading={symbol} step="0.01" min={0} placeholder="0.00" />
                                {!usesV1() && <InputField {...bind("fechaAdelanto")} type="date" label="Fecha del adelanto" />}
                            </>
                        )}
                        <InputField {...bind("fechaPago")} type="date" label="Fecha de pago (final)" className={isAdvance ? undefined : "sm:col-span-2"} />
                    </div>

                    {showSummary && (
                        <SummaryBar
                            items={[
                                { label: "Total", value: `${symbol} ${formatMoney(total)}` },
                                { label: "Adelanto", value: `${symbol} ${formatMoney(advance)}` },
                                { label: "Saldo", value: `${symbol} ${formatMoney(getAgreementBalance(total, advance))}`, tone: "highlight" },
                            ]}
                        />
                    )}

<<<<<<< HEAD
                    {isAdvance && (
                        <FormField error={errors.boleta}>
                            <FileDropzone
                                label="Boleta o recibo del adelanto"
                                variant="horizontal"
                                required
                                allowLocalSelection
                                hint="PDF o Imagen · Máx. 10 MB"
                                file={boleta}
                                onChange={(file) => {
                                    setBoleta(file);
                                    setErrors((current) => ({ ...current, boleta: undefined }));
                                }}
                            />
                        </FormField>
                    )}
=======
                    <FormField>
                        <FileDropzone
                            label="Boleta o recibo"
                            variant="horizontal"
                            optional
                            hint="PDF o Imagen · Máx. 10 MB"
                            file={boleta ?? agreement?.boleta ?? null}
                            replaceable={mode === "edit" && agreement?.boleta != null}
                            onChange={setBoleta}
                        />
                    </FormField>
>>>>>>> e0912f885278a1780aadab2fa605b15095325f55
                </div>
            )}
        </AppModal>
    );
}
