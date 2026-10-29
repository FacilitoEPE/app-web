import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { useState } from "react";
import { FileSpreadsheet, Save, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { InfoField, SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import type { FileSource } from "@/shared/utils/fileSource";
import { formatKg } from "@/shared/utils/format";
import type { BillingClient, BillingInvoice, BillingLoad } from "@/modules/billing/billing.models";

interface BillingPrepareInvoiceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    client: BillingClient | null;
    load: BillingLoad | null;
    editingInvoice: BillingInvoice | null;
    onSave: (
        clientId: string,
        loadId: string,
        invoice: Omit<BillingInvoice, "id" | "cobros"> & { id?: string },
    ) => void;
}

export default function BillingPrepareInvoiceModal({
    open,
    onOpenChange,
    client,
    load,
    editingInvoice,
    onSave,
}: BillingPrepareInvoiceModalProps) {
    const [referenciaPreparacion, setReferenciaPreparacion] = useState("");
    const [fechaPreparacion, setFechaPreparacion] = useState("");
    const [fechaVencimiento, setFechaVencimiento] = useState("");
    const [kilosFacturados, setKilosFacturados] = useState("");
    const [precioUnitario, setPrecioUnitario] = useState("");
    const [descuento, setDescuento] = useState("0");
    const [cargos, setCargos] = useState("0");
    const [archivoPreparacion, setArchivoPreparacion] = useState<FileSource | null>(null);
    const [observaciones, setObservaciones] = useState("");

    useResetOnToggle(open, () => {
        if (!load || !client || !open) return;
        if (editingInvoice) {
            setReferenciaPreparacion(editingInvoice.referenciaPreparacion);
            setFechaPreparacion(editingInvoice.fechaPreparacion);
            setFechaVencimiento(editingInvoice.fechaVencimiento);
            setKilosFacturados(String(editingInvoice.kilosFacturados));
            setPrecioUnitario(String(editingInvoice.precioUnitario));
            setDescuento(String(editingInvoice.descuento));
            setCargos(String(editingInvoice.cargos));
            setArchivoPreparacion(editingInvoice.archivoPreparacion);
            setObservaciones(editingInvoice.observaciones);
        } else {
            setReferenciaPreparacion("");
            setFechaPreparacion(load.fechaRecepcion);
            setFechaVencimiento("");
            setKilosFacturados(String(load.kilosRecibidos));
            setPrecioUnitario(String(load.precioVentaKg));
            setDescuento("0");
            setCargos("0");
            setArchivoPreparacion(null);
            setObservaciones("");
        }
    });

    if (!client || !load) return null;

    const kgNum = Number(kilosFacturados) || 0;
    const priceNum = Number(precioUnitario) || 0;
    const descNum = Number(descuento) || 0;
    const cargosNum = Number(cargos) || 0;
    const subtotal = kgNum * priceNum;
    const total = Math.max(0, subtotal - descNum + cargosNum);
    const symbol = client.moneda === "EUR" ? "€" : client.moneda === "USD" ? "US$" : "S/";

    const handleSubmit = async () => {
        await onSave(client.id, load.id, {
            id: editingInvoice?.id,
            referenciaPreparacion: referenciaPreparacion.trim(),
            numeroFacturaElectronica: editingInvoice?.numeroFacturaElectronica ?? "",
            estado: editingInvoice?.estado ?? "Preparación pendiente",
            fechaPreparacion,
            fechaEmision: editingInvoice?.fechaEmision ?? "",
            fechaVencimiento,
            kilosFacturados: kgNum,
            precioUnitario: priceNum,
            descuento: descNum,
            cargos: cargosNum,
            total,
            moneda: client.moneda,
            archivoPreparacion,
            archivoFacturaEmitida: editingInvoice?.archivoFacturaEmitida ?? null,
            observaciones: observaciones.trim(),
        });
        onOpenChange(false);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<FileSpreadsheet size={22} strokeWidth={2.2} />}
            title={
                editingInvoice
                    ? "Editar preparación de factura"
                    : "Confirmar preparación de factura"
            }
            description={`${client.nombreEmpresa} · Carga ${load.codigo} · Moneda ${client.moneda}`}
            size="xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleSubmit}>
                        <Save size={18} strokeWidth={2.5} /> Guardar preparación
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <SummaryBar
                    items={[
                        {
                            label: "Base (Kilos × Precio)",
                            value: `${formatKg(kgNum)} kg × ${symbol} ${priceNum.toFixed(2)}`,
                        },
                        { label: "Subtotal", value: `${symbol} ${subtotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}` },
                        {
                            label: "Total a facturar",
                            value: `${symbol} ${total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
                            tone: "brand",
                        },
                    ]}
                />

                <ModalSection title="1. Datos de origen de la recepción en planta">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <InfoField label="Cliente" value={client.nombreEmpresa} />
                        <InfoField label="RUC / Tax ID" value={client.ruc} />
                        <InfoField
                            label="Kilos recibidos en planta"
                            value={`${formatKg(load.kilosRecibidos)} kg`}
                        />
                    </div>
                </ModalSection>

                <ModalSection title="2. Parámetros de la preparación">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <InputField
                            id="prep-ref"
                            label="Referencia de preparación"
                            required
                            value={referenciaPreparacion}
                            onChange={setReferenciaPreparacion}
                            className="sm:col-span-2"
                        />
                        <InputField
                            id="prep-fecha"
                            type="date"
                            label="Fecha de preparación"
                            required
                            value={fechaPreparacion}
                            onChange={setFechaPreparacion}
                            className="sm:col-span-2"
                        />
                        <InputField
                            id="prep-venc"
                            type="date"
                            label="Fecha de vencimiento"
                            required
                            value={fechaVencimiento}
                            onChange={setFechaVencimiento}
                            className="sm:col-span-2"
                        />
                        <InputField
                            id="prep-kilos"
                            label="Kilos a facturar"
                            required
                            step="1"
                            min={0}
                            unit="kg"
                            value={kilosFacturados}
                            onChange={setKilosFacturados}
                            className="sm:col-span-3"
                        />
                        <InputField
                            id="prep-precio"
                            label="Precio de contrato por kg"
                            required
                            step="0.01"
                            min={0}
                            unit={symbol}
                            value={precioUnitario}
                            onChange={setPrecioUnitario}
                            className="sm:col-span-3"
                        />
                    </div>
                </ModalSection>

                <ModalSection title="3. Descuentos, cargos y respaldo" aside="Opcional">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InputField
                            id="prep-descuento"
                            label="Descuento comercial / ajuste"
                            step="0.01"
                            min={0}
                            unit={symbol}
                            value={descuento}
                            onChange={setDescuento}
                        />
                        <InputField
                            id="prep-cargos"
                            label="Cargos adicionales (flete / frío)"
                            step="0.01"
                            min={0}
                            unit={symbol}
                            value={cargos}
                            onChange={setCargos}
                        />
                        <div className="sm:col-span-2">
                            <FileDropzone
                                label="Sustento o liquidación previa de preparación"
                                optional
                                file={archivoPreparacion}
                                onChange={(f) => setArchivoPreparacion(f)}
                                variant="horizontal"
                                replaceable
                            />
                        </div>
                        <FormField
                            id="prep-obs"
                            label="Observaciones de facturación"
                            optional
                            className="sm:col-span-2"
                        >
                            <Textarea
                                id="prep-obs"
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
