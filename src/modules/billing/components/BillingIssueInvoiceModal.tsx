import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { useState } from "react";
import { FileCheck2, Save, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
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
    ) => void;
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
    const [observaciones, setObservaciones] = useState("");
    const [errors, setErrors] = useState<{
        numero?: string;
        fechaEmision?: string;
        fechaVencimiento?: string;
        archivo?: string;
    }>({});

    useResetOnToggle(open, () => {
        if (!invoice || !open) return;
        setNumeroFacturaElectronica(invoice.numeroFacturaElectronica || "");
        setFechaEmision(invoice.fechaEmision || invoice.fechaPreparacion);
        setFechaVencimiento(invoice.fechaVencimiento);
        setArchivoFacturaEmitida(invoice.archivoFacturaEmitida);
        setObservaciones(invoice.observaciones);
        setErrors({});
    });

    if (!client || !load || !invoice) return null;

    const symbol = invoice.moneda === "USD" ? "US$" : "S/";

    const handleSubmit = async () => {
        const nextErrors: typeof errors = {};
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
        if (!archivoFacturaEmitida) {
            nextErrors.archivo = "Adjunta el archivo de la factura electrónica emitida.";
        }
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        await onIssue(client.id, load.id, invoice.id, {
            numeroFacturaElectronica: numeroFacturaElectronica.trim(),
            fechaEmision,
            fechaVencimiento,
            archivoFacturaEmitida,
            observaciones: observaciones.trim(),
        });
        onOpenChange(false);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<FileCheck2 size={22} strokeWidth={2.2} />}
            title="Registrar factura electrónica emitida"
            description={`${invoice.referenciaPreparacion} · ${client.nombreEmpresa}`}
            size="lg"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleSubmit}>
                        <Save size={18} strokeWidth={2.5} /> Confirmar emisión electrónica
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
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
                                setErrors((curr) => ({ ...curr, numero: undefined }));
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
                                setErrors((curr) => ({ ...curr, fechaEmision: undefined }));
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
                                setErrors((curr) => ({ ...curr, fechaVencimiento: undefined }));
                            }}
                        />
                        <div className="sm:col-span-3">
                            <FormField error={errors.archivo}>
                                <FileDropzone
                                    label="Factura electrónica emitida (PDF / XML)"
                                    required
                                    file={archivoFacturaEmitida}
                                    onChange={(f) => {
                                        setArchivoFacturaEmitida(f);
                                        setErrors((curr) => ({ ...curr, archivo: undefined }));
                                    }}
                                    variant="horizontal"
                                    replaceable
                                />
                            </FormField>
                        </div>
                        <FormField
                            id="iss-obs"
                            label="Observaciones de emisión"
                            optional
                            className="sm:col-span-3"
                        >
                            <Textarea
                                id="iss-obs"
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
