import RequiredMark from "@/shared/components/RequiredMark";
import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import { useState } from "react";
import { FileCheck2, Save, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import type { FileSource } from "@/shared/utils/fileSource";
import { formatKg } from "@/shared/utils/format";
import type { BillingClient, BillingInvoice, BillingLoad } from "@/modules/billing/billing.models";

interface BillingIssueInvoiceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    client: BillingClient | null;
    load: BillingLoad | null;
    invoice: BillingInvoice | null;
    onIssue: (
        clientId: string,
        loadId: string,
        invoiceId: string,
        payload: {
            numeroFacturaElectronica: string;
            fechaEmision: string;
            fechaVencimiento: string;
            archivoFacturaEmitida: FileSource | null;
            observaciones: string;
        },
    ) => void | Promise<void>;
}

export default function BillingIssueInvoiceModal({
    open,
    onOpenChange,
    client,
    load,
    invoice,
    onIssue,
}: BillingIssueInvoiceModalProps) {
    const [numeroFacturaElectronica, setNumeroFacturaElectronica] = useState("");
    const [fechaEmision, setFechaEmision] = useState("");
    const [fechaVencimiento, setFechaVencimiento] = useState("");
    const [archivoFacturaEmitida, setArchivoFacturaEmitida] = useState<FileSource | null>(null);
    const [verified, setVerified] = useState(false);

    useResetOnToggle(open, () => {
        if (!invoice || !open) return;
        setNumeroFacturaElectronica(invoice.numeroFacturaElectronica || "");
        setFechaEmision(invoice.fechaEmision || "");
        setFechaVencimiento(invoice.fechaVencimiento);
        setArchivoFacturaEmitida(invoice.archivoFacturaEmitida);
        setVerified(false);
    });

    const symbol = invoice?.moneda === "EUR" ? "€" : invoice?.moneda === "USD" ? "US$" : "S/";
    const { errors, saving, clearError, submit } = useFormSubmit({
        open,
        validate: () => {
        const nextErrors: Record<string, string> = {};
        if (!numeroFacturaElectronica.trim()) {
            nextErrors.numero = "Ingresa el número de la factura electrónica.";
        }
        if (!fechaEmision) {
            nextErrors.fechaEmision = "Ingresa la fecha de emisión.";
        }
        if (!fechaVencimiento) {
            nextErrors.fechaVencimiento = "Ingresa la fecha de vencimiento.";
        } else if (fechaEmision && fechaVencimiento < fechaEmision) {
            nextErrors.fechaVencimiento = "El vencimiento no puede ser anterior a la emisión.";
        }
        if (invoice && fechaEmision && fechaEmision < invoice.fechaPreparacion) nextErrors.fechaEmision = "La emisión no puede ser anterior a la preparación.";
        if (!archivoFacturaEmitida) {
            nextErrors.archivo = "Adjunta el archivo de la factura electrónica emitida.";
        }
        if (!verified) nextErrors.verified = "Confirma que el comprobante fue emitido en SUNAT.";
        return nextErrors;
        },
        onSubmit: async () => {
        if (!client || !load || !invoice) return;
        await onIssue(client.id, load.id, invoice.id, {
            numeroFacturaElectronica: numeroFacturaElectronica.trim(),
            fechaEmision,
            fechaVencimiento,
            archivoFacturaEmitida,
            observaciones: "",
        });
        onOpenChange(false);
        },
        backendFields: { numeroFactura: "numero", fechaEmision: "fechaEmision", fechaVencimiento: "fechaVencimiento" },
    });

    if (!client || !load || !invoice) return null;

    return (
        <AppModal
            busy={saving}
            open={open}
            onOpenChange={onOpenChange}
            icon={<FileCheck2 size={22} strokeWidth={2.2} />}
            title="Registrar factura emitida"
            description={`${invoice.referenciaPreparacion} · ${client.nombreEmpresa}`}
            size="lg"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" disabled={saving} onClick={() => void submit({})}>
                        <Save size={18} strokeWidth={2.5} /> Guardar factura emitida
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                {errors._form && <p role="alert" className="text-sm text-destructive">{errors._form}</p>}
                <SummaryBar
                    items={[
                        { label: "Preparación", value: invoice.referenciaPreparacion },
                        { label: "Kilos facturados", value: `${formatKg(invoice.kilosFacturados)} kg` },
                        {
                            label: "Total factura",
                            value: `${symbol} ${invoice.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
                            tone: "brand",
                        },
                    ]}
                />
                <p className="text-sm text-ink-muted">Registra aquí un comprobante ya emitido externamente. Esta acción no emite ni valida la factura ante SUNAT.</p>

                <ModalSection title="Comprobante electrónico SUNAT">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <InputField
                            id="iss-num"
                            label="N° de factura electrónica"
                            required
                            placeholder="Ej. F001-000490"
                            value={numeroFacturaElectronica}
                            error={errors.numero}
                            onChange={(v) => {
                                setNumeroFacturaElectronica(v);
                                clearError("numero");
                            }}
                        />
                        <InputField
                            id="iss-emision"
                            type="date"
                            label="Fecha de emisión"
                            required
                            value={fechaEmision}
                            error={errors.fechaEmision}
                            onChange={(v) => {
                                setFechaEmision(v);
                                clearError("fechaEmision");
                            }}
                        />
                        <InputField
                            id="iss-venc"
                            type="date"
                            label="Fecha de vencimiento"
                            required
                            value={fechaVencimiento}
                            error={errors.fechaVencimiento}
                            onChange={(v) => {
                                setFechaVencimiento(v);
                                clearError("fechaVencimiento");
                            }}
                        />
                        <div className="sm:col-span-3">
                            <FormField error={errors.archivo}>
                                <FileDropzone
                                    label="Factura electrónica emitida (PDF)"
                                    required
                                    file={archivoFacturaEmitida}
                                    onChange={(f) => {
                                        setArchivoFacturaEmitida(f);
                                        clearError("archivo");
                                    }}
                                    variant="horizontal"
                                    replaceable
                                />
                            </FormField>
                        </div>
                        <div className="sm:col-span-3">
                            <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm text-ink-body">
                                <Checkbox aria-required="true" checked={verified} onCheckedChange={checked => { setVerified(checked === true); clearError("verified"); }} />
                                Verifiqué que este comprobante ya fue emitido en SUNAT y que el archivo adjunto corresponde a él. <RequiredMark />
                            </label>
                            {errors.verified && <p role="alert" className="mt-1 text-xs text-destructive">{errors.verified}</p>}
                        </div>
                    </div>
                </ModalSection>
            </div>
        </AppModal>
    );
}
