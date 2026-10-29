import { useResetOnToggle } from "@/shared/hooks/useModalForm";
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
import { Textarea } from "@/shared/components/ui/textarea";
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
    ) => void;
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
    const [observaciones, setObservaciones] = useState("");

    useResetOnToggle(open, () => {
        if (!invoice || !open) return;
        const cobrado = invoice.cobros.reduce((s, c) => s + c.importe, 0);
        const saldo = Math.max(0, invoice.total - cobrado);
        setFecha(new Date().toISOString().slice(0,10));
        setImporte(String(saldo));
        setMedio("Transferencia");
        setReferencia("");
        setEvidencia(null);
        setObservaciones("");
    });

    if (!client || !load || !invoice) return null;

    const totalCobrado = invoice.cobros.reduce((s, c) => s + c.importe, 0);
    const saldoPendiente = Math.max(0, invoice.total - totalCobrado);
    const symbol = invoice.moneda === "EUR" ? "€" : invoice.moneda === "USD" ? "US$" : "S/";

    const handleSubmit = async () => {
        const amount = Number(importe) || 0;
        if (amount <= 0) return;
        await onRegister(client.id, load.id, invoice.id, {
            fecha,
            importe: amount,
            medio,
            referencia: referencia.trim() || "OP-S/N",
            evidencia,
            observaciones: observaciones.trim(),
        });
        onOpenChange(false);
    };

    return (
        <AppModal
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
                    <Button size="xl" onClick={handleSubmit}>
                        <Save size={18} strokeWidth={2.5} /> Guardar cobro
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
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
                            onChange={setFecha}
                        />
                        <InputField
                            id="col-importe"
                            label={`Importe cobrado (${invoice.moneda})`}
                            required
                            step="0.01"
                            min={0}
                            unit={symbol}
                            value={importe}
                            onChange={setImporte}
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
                            onChange={setReferencia}
                        />
                        <div className="sm:col-span-2">
                            <FileDropzone
                                label="Voucher o evidencia del movimiento"
                                file={evidencia}
                                onChange={(f) => setEvidencia(f)}
                                variant="horizontal"
                                replaceable
                            />
                        </div>
                        <FormField
                            id="col-obs"
                            label="Observaciones del cobro"
                            optional
                            className="sm:col-span-2"
                        >
                            <Textarea
                                id="col-obs"
                                rows={2}
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                            />
                        </FormField>
                    </div>
                </ModalSection>
            </div>
        </AppModal>
    );
}
