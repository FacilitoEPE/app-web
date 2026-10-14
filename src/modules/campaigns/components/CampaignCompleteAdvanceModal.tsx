import { useState } from "react";
import { Check, X, Wallet } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import FormField from "@/shared/components/FormField";
import { InfoField } from "@/shared/components/InfoField";
import { Button } from "@/shared/components/ui/button";
import FileDropzone from "@/shared/components/FileDropzone";
import type { CarrierPayment } from "@/modules/campaigns/carrierPayments.data";

interface CampaignCompleteAdvanceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    payment: CarrierPayment | null;
    onSave?: (receipt: File) => void;
}

/** Cierra un pago que ya tuvo un adelanto: muestra lo ya pagado y lo que falta, y pide la boleta del saldo */
export default function CampaignCompleteAdvanceModal({ open, onOpenChange, payment, onSave }: CampaignCompleteAdvanceModalProps) {
    const [receipt, setReceipt] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Al cerrar se limpia, así la próxima vez que se abra (para otro pago) no arrastra el archivo anterior
    useResetOnToggle(open, () => {
        setReceipt(null);
        setError(null);
    });

    const handleConfirm = () => {
        if (!receipt) {
            setError("Adjunta la boleta del saldo para completar el pago.");
            return;
        }
        if (onSave) onSave(receipt);
        else onOpenChange(false);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Wallet size={22} strokeWidth={2} />}
            title="Completar Pago"
            description={payment ? `Cierra el saldo pendiente de ${payment.transportista}.` : "Cierra el saldo pendiente."}
            size="md"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleConfirm}>
                        <Check size={20} strokeWidth={2.5} /> Confirmar
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <span className="self-start rounded-full border border-border bg-surface-page px-3 py-1.5 text-[11px] font-mono font-semibold">
                    {payment?.codigo}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <InfoField label="Pago Realizado" value={`Adelanto · S/ ${payment ? payment.cantidad.toLocaleString("es-PE") : 0}`} />
                    <InfoField label="Pago Pendiente" value={`Pendiente · S/ ${payment?.cantidadPendiente ? payment.cantidadPendiente.toLocaleString("es-PE") : 0}`} />
                </div>

                <FormField error={error ?? undefined}>
                    <FileDropzone
                        label="Boleta"
                        hint="PDF, imagen · Máx. 10 MB"
                        file={receipt}
                        onChange={(file) => { setReceipt(file); setError(null); }}
                    />
                </FormField>
            </div>
        </AppModal>
    );
}
