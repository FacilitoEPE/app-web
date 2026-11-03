import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import { useState } from "react";
import { Banknote, Save, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import type { FileSource } from "@/shared/utils/fileSource";
import type {
    BillingClient,
    BillingCollectionItem,
    BillingInvoice,
    BillingLoad,
} from "@/modules/billing/billing.models";

interface BillingRegisterCollectionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    client: BillingClient | null;
    load: BillingLoad | null;
    invoice: BillingInvoice | null;
    onRegister: (
        clientId: string,
        loadId: string,
        invoiceId: string,
        collection: Omit<BillingCollectionItem, "id">,
    ) => void | Promise<void>;
}

const MEDIO_OPTIONS = [
    { value: "Transferencia", label: "Transferencia bancaria" },
    { value: "Depósito", label: "Depósito en cuenta" },
    { value: "Efectivo", label: "Efectivo" },
    { value: "Otro", label: "Otro medio" },
];

export default function BillingRegisterCollectionModal({
    open,
    onOpenChange,
    client,
    load,
    invoice,
    onRegister,
}: BillingRegisterCollectionModalProps) {
    const [fecha, setFecha] = useState("");
    const [importe, setImporte] = useState("");
    const [medio, setMedio] = useState<BillingCollectionItem["medio"]>("Transferencia");
    const [referencia, setReferencia] = useState("");
    const [evidencia, setEvidencia] = useState<FileSource | null>(null);

    useResetOnToggle(open, () => {
        if (!invoice || !open) return;
        setFecha(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
        setImporte("");
        setMedio("Transferencia");
        setReferencia("");
        setEvidencia(null);
    });

    const totalCobrado = invoice?.cobros.reduce((s, c) => s + c.importe, 0) ?? 0;
    const saldoPendiente = Math.max(0, (invoice?.total ?? 0) - totalCobrado);
    const symbol = invoice?.moneda === "EUR" ? "€" : invoice?.moneda === "USD" ? "US$" : "S/";
    const { errors, saving, clearError, submit } = useFormSubmit({
        open,
        validate: () => {
            const found: Record<string, string> = {};
            const amount = Number(importe);
            if (!fecha) found.fecha = "Indica la fecha del movimiento.";
            else if (invoice?.fechaEmision && fecha < invoice.fechaEmision) found.fecha = "El cobro no puede ser anterior a la emisión.";
            if (!Number.isFinite(amount) || amount <= 0 || amount > saldoPendiente) found.importe = `Ingresa un importe mayor que 0 y no superior a ${symbol} ${saldoPendiente.toFixed(2)}.`;
            if (!referencia.trim()) found.referencia = "Ingresa la referencia de la operación.";
            if (!evidencia) found.evidencia = "Adjunta el voucher o constancia del cobro.";
            return found;
        },
        onSubmit: async () => {
        if (!client || !load || !invoice) return;
        await onRegister(client.id, load.id, invoice.id, {
            fecha,
            importe: Number(importe),
            medio,
            referencia: referencia.trim(),
            evidencia,
            observaciones: "",
        });
        onOpenChange(false);
        },
        backendFields: { fecha: "fecha", monto: "importe", referencia: "referencia", evidencia: "evidencia" },
    });

    if (!client || !load || !invoice) return null;

    return (
        <AppModal
            busy={saving}
            open={open}
            onOpenChange={onOpenChange}
            icon={<Banknote size={22} strokeWidth={2.2} />}
            title="Registrar cobro de factura"
            description={`${invoice.numeroFacturaElectronica || invoice.referenciaPreparacion} · ${client.nombreEmpresa}`}
            size="lg"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" disabled={saving} onClick={() => void submit({})}>
                        <Save size={18} strokeWidth={2.5} /> Guardar cobro
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                {errors._form && <p role="alert" className="text-sm text-destructive">{errors._form}</p>}
                <SummaryBar
                    items={[
                        {
                            label: "Total factura",
                            value: `${symbol} ${invoice.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
                        },
                        {
                            label: "Cobrado",
                            value: `${symbol} ${totalCobrado.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
                            tone: "brand",
                        },
                        {
                            label: "Saldo pendiente",
                            value: `${symbol} ${saldoPendiente.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
                            tone: "highlight",
                        },
                    ]}
                />

                <ModalSection title="Datos del movimiento de cobro">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InputField
                            id="col-fecha"
                            type="date"
                            label="Fecha del movimiento"
                            required
                            value={fecha}
                            error={errors.fecha}
                            onChange={v => { setFecha(v); clearError("fecha"); }}
                        />
                        <InputField
                            id="col-importe"
                            label={`Importe cobrado (${invoice.moneda})`}
                            required
                            step="0.01"
                            min={0}
                            unit={symbol}
                            value={importe}
                            error={errors.importe}
                            onChange={v => { setImporte(v); clearError("importe"); }}
                        />
                        <FormField label="Medio de cobro" required>
                            <Select
                                items={MEDIO_OPTIONS}
                                value={medio}
                                onValueChange={(v) =>
                                    v && setMedio(v as BillingCollectionItem["medio"])
                                }
                            >
                                <SelectTrigger aria-label="Medio de cobro" className="h-11 rounded-lg bg-card">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MEDIO_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>
                        <InputField
                            id="col-ref"
                            label="Referencia de operación / SWIFT"
                            required
                            placeholder="Ej. SWIFT-INGBNL2A-98412"
                            value={referencia}
                            error={errors.referencia}
                            onChange={v => { setReferencia(v); clearError("referencia"); }}
                        />
                        <div className="sm:col-span-2">
                            <FormField error={errors.evidencia}>
                            <FileDropzone
                                label="Voucher o evidencia del movimiento"
                                required
                                file={evidencia}
                                onChange={(f) => { setEvidencia(f); clearError("evidencia"); }}
                                variant="horizontal"
                                replaceable
                            />
                            </FormField>
                        </div>
                    </div>
                </ModalSection>
            </div>
        </AppModal>
    );
}
