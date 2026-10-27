import { useEffect, useState } from "react";
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
import type { BillingClient, BillingInvoice, BillingLoad } from "@/modules/billing/billing.demo";

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

    useEffect(() => {
        if (!invoice || !open) return;
        setNumeroFacturaElectronica(invoice.numeroFacturaElectronica || "F001-000490");
        setFechaEmision(invoice.fechaEmision || invoice.fechaPreparacion);
        setFechaVencimiento(invoice.fechaVencimiento);
        setArchivoFacturaEmitida(invoice.archivoFacturaEmitida);
        setObservaciones(invoice.observaciones);
    }, [invoice, open]);

    if (!client || !load || !invoice) return null;

    const symbol = invoice.moneda === "USD" ? "US$" : "S/";

    const handleSubmit = () => {
        onIssue(client.id, load.id, invoice.id, {
            numeroFacturaElectronica: numeroFacturaElectronica.trim() || "F001-000490",
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
                            onChange={setNumeroFacturaElectronica}
                        />
                        <InputField
                            id="iss-emision"
                            type="date"
                            label="Fecha de emisión"
                            required
                            value={fechaEmision}
                            onChange={setFechaEmision}
                        />
                        <InputField
                            id="iss-venc"
                            type="date"
                            label="Fecha de vencimiento"
                            required
                            value={fechaVencimiento}
                            onChange={setFechaVencimiento}
                        />
                        <div className="sm:col-span-3">
                            <FileDropzone
                                label="Factura electrónica emitida (PDF / XML)"
                                required
                                file={archivoFacturaEmitida}
                                onChange={(f) => setArchivoFacturaEmitida(f)}
                                variant="horizontal"
                                replaceable
                            />
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
