import { useEffect, useState } from "react";
import { Save, X, Banknote } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import { useModalForm, useResetOnToggle } from "@/shared/hooks/useModalForm";
import FormField from "@/shared/components/FormField";
import InputField from "@/shared/components/InputField";
import { Button } from "@/shared/components/ui/button";
import { Combobox } from "@/shared/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import FileDropzone from "@/shared/components/FileDropzone";
import { getCarriers } from "@/modules/carriers/api/carrier.api";
import { generatePaymentCode } from "@/modules/campaigns/carrierPayments.data";
import {
    EMPTY_PAYMENT_DRAFT,
    validatePaymentDraft,
    type PaymentDraft,
    type PaymentDraftErrors,
    type PaymentType,
} from "@/modules/campaigns/carrierPayments.utils";

interface CampaignRegisterPaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave?: (draft: PaymentDraft) => void;
}

/** Campo de monto en soles: un `InputField` numérico con el prefijo "S/" */
function AmountField({ id, label, value, error, onChange }: { id: string; label: string; value: string; error?: string; onChange: (value: string) => void }) {
    return <InputField id={id} label={label} required leading="S/" step="0.01" min={0} placeholder="0" value={value} error={error} onChange={onChange} />;
}

export default function CampaignRegisterPaymentModal({ open, onOpenChange, onSave }: CampaignRegisterPaymentModalProps) {
    const [draft, , set] = useModalForm<PaymentDraft>(open, EMPTY_PAYMENT_DRAFT);
    const [errors, setErrors] = useState<PaymentDraftErrors>({});
    const [carriers, setCarriers] = useState<string[]>([]);
    const [carriersState, setCarriersState] = useState<"loading" | "ready" | "error">("loading");
    // Un código nuevo cada vez que se abre el modal para registrar un pago
    const [paymentCode, setPaymentCode] = useState(generatePaymentCode);

    useResetOnToggle(open, () => {
        setErrors({});
        setPaymentCode(generatePaymentCode());
    });

    // Las empresas disponibles se consultan al abrir, para reflejar las que se acaban de registrar
    useEffect(() => {
        if (!open) return;
        let active = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCarriersState("loading");
        getCarriers()
            .then((items) => {
                if (!active) return;
                setCarriers(items.map((carrier) => carrier.nombre));
                setCarriersState("ready");
            })
            .catch(() => { if (active) setCarriersState("error"); });
        return () => { active = false; };
    }, [open]);

    const update = <K extends keyof PaymentDraft>(field: K, value: PaymentDraft[K]) => {
        set(field)(value);
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const handleSave = () => {
        const withCode = { ...draft, codigo: paymentCode };
        const nextErrors = validatePaymentDraft(withCode);
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }
        if (onSave) onSave(withCode);
        else onOpenChange(false);
    };

    const tipo = draft.tipo;

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Banknote size={22} strokeWidth={2} />}
            title="Registrar Pago"
            description="Registra un pago al transportista. Los campos con * son obligatorios."
            size="md"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleSave}>
                        <Save size={20} strokeWidth={2.5} /> Guardar
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <span className="self-start rounded-full border border-border bg-surface-page px-3 py-1.5 text-[11px] font-mono font-semibold text-ink-muted">
                    {paymentCode}
                </span>

                <FormField
                    label="Empresa de transporte:"
                    required
                    error={carriersState === "error" ? "No se pudieron cargar las empresas. Cierra y vuelve a abrir el formulario." : errors.transportista}
                >
                    <Combobox
                        options={carriers.map((name) => ({ value: name, label: name }))}
                        value={draft.transportista}
                        onChange={(value) => update("transportista", value)}
                        placeholder={carriersState === "loading" ? "Cargando empresas..." : "Seleccione una empresa..."}
                        emptyMessage="Aún no hay empresas de transporte registradas"
                        disabled={carriersState !== "ready"}
                    />
                </FormField>

                <FormField label="Tipo de pago:" required error={errors.tipo}>
                    <Select
                        value={tipo || null}
                        onValueChange={(value) => update("tipo", ((value as PaymentType | null) ?? ""))}
                    >
                        <SelectTrigger className="w-full" aria-invalid={errors.tipo ? true : undefined}>
                            <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Adelanto">Adelanto</SelectItem>
                            <SelectItem value="Completo">Completo</SelectItem>
                        </SelectContent>
                    </Select>
                </FormField>

                {/*
                    Adelanto = se paga una parte ahora y el resto queda pendiente, por eso pide el total
                    y cuándo se cierra; Completo = se paga todo de una vez, solo pide cuándo se acordó.
                */}
                {tipo === "Adelanto" && (
                    <div className="flex flex-col gap-5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                            <AmountField id="payment-amount" label="Cantidad:" value={draft.cantidad} error={errors.cantidad} onChange={(value) => update("cantidad", value)} />
                            <AmountField id="payment-total" label="Cantidad Total:" value={draft.cantidadTotal} error={errors.cantidadTotal} onChange={(value) => update("cantidadTotal", value)} />
                        </div>

                        <InputField id="payment-date" type="date" label="Fecha de pago final:" required value={draft.fecha} error={errors.fecha} onChange={(value) => update("fecha", value)} />
                    </div>
                )}

                {tipo === "Completo" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                        <InputField id="payment-date" type="date" label="Fecha acordada:" required value={draft.fecha} error={errors.fecha} onChange={(value) => update("fecha", value)} />
                        <AmountField id="payment-amount" label="Cantidad:" value={draft.cantidad} error={errors.cantidad} onChange={(value) => update("cantidad", value)} />
                    </div>
                )}

                {tipo === "" && (
                    <p className="text-[13px] text-ink-muted italic -mt-2">Elige un tipo de pago para continuar.</p>
                )}

                <FileDropzone label="Boleta" hint="PDF, imagen · Máx. 10 MB" file={draft.boleta} onChange={(file) => update("boleta", file)} />
            </div>
        </AppModal>
    );
}
