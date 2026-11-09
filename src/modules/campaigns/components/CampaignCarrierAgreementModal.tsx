import { usesV1 } from '@/shared/api/data-contract';
import { useState } from "react";
import { Banknote, Save, Wallet, X } from "lucide-react";
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
    onRegisterAdvance?: () => void;
}

const TITLES: Record<AgreementModalMode, string> = {
    create: "Registrar acuerdo de pago",
    edit: "Registrar acuerdo de pago",
    view: "Acuerdo de pago",
};

/**
 * Acuerdo de pago con un transportista para la campaña: se paga de una vez ("Pago único") o en dos partes ("Con
 * adelanto"). Una vez registrado, el acuerdo se consulta y permite registrar sus desembolsos por separado.
 */
export default function CampaignCarrierAgreementModal({ open, onOpenChange, mode, carrierName, campaignName, agreement, onSave, onRegisterAdvance }: CampaignCarrierAgreementModalProps) {
    const isView = mode === "view";
    const [values, , set] = useModalForm<AgreementFormValues>(open, toAgreementValues(agreement));
    const [boleta, setBoleta] = useState<File | null>(null);
    const [errors, setErrors] = useState<AgreementErrors & { boleta?: string }>({});

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

        if (isAdvance && !usesV1() && !boleta) {
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
    const disbursed = agreement?.adelantoDesembolsado ?? 0;
    const remaining = getAgreementBalance(agreement?.adelanto ?? 0, disbursed);
    const canDisburse = usesV1() && agreement?.tipo === "adelanto" && agreement.moneda === "PEN" && remaining > 0 && onRegisterAdvance;

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
                    <>
                        <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                            <X size={20} strokeWidth={2.5} /> Cerrar
                        </Button>
                        {canDisburse && <Button size="xl" onClick={onRegisterAdvance}><Banknote size={18} /> Registrar desembolso del adelanto</Button>}
                    </>
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
                                    { label: "Adelanto acordado", value: `${symbol} ${formatMoney(agreement.adelanto)}` },
                                    { label: "Saldo pactado al final", value: `${symbol} ${formatMoney(getAgreementBalance(agreement.total, agreement.adelanto))}` },
                                ]
                                : [{ label: "Total acordado", value: `${symbol} ${formatMoney(agreement.total)}`, tone: "brand" }]
                        }
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InfoField label="Tipo de pago" value={PAYMENT_TYPES.find((type) => type.value === agreement.tipo)?.label} />
                        <InfoField label="Estado" variant="plain" value={<StatusBadge status={getAgreementStatus(agreement)} />} />
                        {agreement.tipo === "adelanto" && <>
                            <InfoField label="Último desembolso" value={formatDisplayDate(agreement.fechaAdelanto)} />
                            {usesV1() && <>
                                <InfoField label="Adelanto desembolsado" value={`${symbol} ${formatMoney(disbursed)}`} />
                                <InfoField label="Pendiente de desembolso" value={`${symbol} ${formatMoney(remaining)}`} />
                            </>}
                        </>}
                        <InfoField label="Fecha de pago (final)" value={formatDisplayDate(agreement.fechaPago)} />
                    </div>
                    {agreement.boleta && (
                        <FileDropzone label="Documento del acuerdo" variant="horizontal" hasColon={false} file={agreement.boleta} readOnly onChange={() => undefined} />
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    <p className="text-[12.5px] leading-relaxed text-ink-muted">
                        Estas condiciones se consultarán al liquidar al transportista. Si acuerdas un adelanto, registra el desembolso después de realizarlo.
                    </p>

                    <FormField label="Tipo de pago" required hint={PAYMENT_TYPES.find((type) => type.value === values.tipo)?.hint}>
                        <SegmentedControl options={PAYMENT_TYPES} value={values.tipo} onChange={(next) => update("tipo", next as PaymentType)} />
                    </FormField>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField id="carrier-agreement-moneda" label="Moneda" required error={errors.moneda}>
                            <Select items={MONEDA_OPTIONS} value={values.moneda || null} onValueChange={(next) => update("moneda", (next as string | null) ?? "")}>
                                <SelectTrigger id="carrier-agreement-moneda" className="w-full" aria-invalid={errors.moneda ? true : undefined}>
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONEDA_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>
                        <InputField {...bind("total")} label="Cantidad total" leading={symbol} step="0.01" min={0} placeholder="0.00" />

                        {isAdvance && (
                            <>
                                <InputField {...bind("adelanto")} label="Monto del adelanto acordado" leading={symbol} step="0.01" min={0} placeholder="0.00" />
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
                                { label: "Saldo pactado al final", value: `${symbol} ${formatMoney(getAgreementBalance(total, advance))}`, tone: "highlight" },
                            ]}
                        />
                    )}

                    {isAdvance && (
                        <FormField error={errors.boleta}>
                            <FileDropzone
                                label={usesV1() ? "Documento del acuerdo" : "Boleta o recibo del adelanto"}
                                variant="horizontal"
                                required={!usesV1()}
                                optional={usesV1()}
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
                </div>
            )}
        </AppModal>
    );
}
