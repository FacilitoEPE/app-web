import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
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
import { billingAvailableKg } from "@/modules/billing/billing.utils";
import { useBillingClients } from "@/modules/billing/billing.store";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

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
    ) => void | Promise<void>;
}

export default function BillingPrepareInvoiceModal({
    open,
    onOpenChange,
    client,
    load,
    editingInvoice,
    onSave,
}: BillingPrepareInvoiceModalProps) {
    const clients = useBillingClients();
    const [referenciaPreparacion, setReferenciaPreparacion] = useState("");
    const [fechaPreparacion, setFechaPreparacion] = useState("");
    const [fechaVencimiento, setFechaVencimiento] = useState("");
    const [kilosFacturados, setKilosFacturados] = useState("");
    const [precioUnitario, setPrecioUnitario] = useState("");
    const [descuento, setDescuento] = useState("0");
    const [cargos, setCargos] = useState("0");
    const [archivoPreparacion, setArchivoPreparacion] = useState<FileSource | null>(null);
    const [observaciones, setObservaciones] = useState("");

    const existingReferences = clients.flatMap(c => c.cargas.flatMap(l => l.facturas.map(f => Number(f.referenciaPreparacion.match(/^LV-(\d+)$/)?.[1] || 0))));
    const nextReference = `LV-${String(1 + Math.max(0, ...existingReferences)).padStart(6, "0")}`;

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
            setReferenciaPreparacion(nextReference);
            setFechaPreparacion(load.fechaRecepcion > today() ? load.fechaRecepcion : today());
            setFechaVencimiento("");
            setKilosFacturados(String(billingAvailableKg(load)));
            setPrecioUnitario(String(load.precioVentaKg));
            setDescuento("0");
            setCargos("0");
            setArchivoPreparacion(null);
            setObservaciones("");
        }
    });

    const kgNum = Number(kilosFacturados) || 0;
    const priceNum = Number(precioUnitario) || 0;
    const descNum = Number(descuento) || 0;
    const cargosNum = Number(cargos) || 0;
    const subtotal = kgNum * priceNum;
    const total = Math.max(0, subtotal - descNum + cargosNum);
    const currency = editingInvoice?.moneda ?? load?.moneda ?? 'PEN';
    const symbol = currency === "EUR" ? "€" : currency === "USD" ? "US$" : "S/";

    const availableKg = (load ? billingAvailableKg(load) : 0) + (editingInvoice?.kilosFacturados ?? 0);
    const { errors, saving, clearError, submit } = useFormSubmit({
        open,
        validate: () => {
            const found: Record<string, string> = {};
            if (!referenciaPreparacion.trim()) found.referencia = "La referencia es obligatoria.";
            if (!fechaPreparacion) found.fecha = "Indica la fecha de preparación.";
            if (load && fechaPreparacion && fechaPreparacion < load.fechaRecepcion) found.fecha = "La preparación no puede ser anterior a la recepción.";
            if (fechaVencimiento && fechaPreparacion && fechaVencimiento < fechaPreparacion) found.vencimiento = "El vencimiento no puede ser anterior a la preparación.";
            if (!Number.isFinite(kgNum) || kgNum <= 0 || kgNum > availableKg) found.kilos = `Ingresa un peso mayor que 0 y no superior a ${formatKg(availableKg)} kg.`;
            if (descNum < 0 || descNum > subtotal) found.descuento = "El descuento debe estar entre 0 y el subtotal.";
            if (cargosNum < 0) found.cargos = "Los cargos no pueden ser negativos.";
            if (load && !load.respaldoLogisticoCompleto) found._form = "La carga necesita recepción completa y reporte antes de preparar la factura.";
            return found;
        },
        onSubmit: async () => {
        if (!client || !load) return;
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
            moneda: currency,
            archivoPreparacion,
            archivoFacturaEmitida: editingInvoice?.archivoFacturaEmitida ?? null,
            observaciones: observaciones.trim(),
        });
        onOpenChange(false);
        },
        backendFields: { referenciaPreparacion: "referencia", fechaPreparacion: "fecha", fechaVencimiento: "vencimiento", kilosFacturados: "kilos", descuento: "descuento", cargos: "cargos" },
    });

    if (!client || !load) return null;

    return (
        <AppModal
            busy={saving}
            open={open}
            onOpenChange={onOpenChange}
            icon={<FileSpreadsheet size={22} strokeWidth={2.2} />}
            title={editingInvoice ? "Editar preparación de factura" : "Preparar factura"}
            description={`${client.nombreEmpresa} · Carga ${load.codigo} · Moneda ${currency}`}
            size="xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" disabled={saving} onClick={() => void submit({})}>
                        <Save size={18} strokeWidth={2.5} /> Guardar preparación
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                {errors._form && <p role="alert" className="text-sm text-destructive">{errors._form}</p>}

                <ModalSection title="Recepción en planta">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <InfoField label="Cliente" value={client.nombreEmpresa} />
                        <InfoField label="RUC / Tax ID" value={client.ruc} />
                        <InfoField
                            label="Kilos recibidos en planta"
                            value={`${formatKg(load.kilosRecibidos)} kg`}
                        />
                    </div>
                </ModalSection>

                <ModalSection title="Preparación de factura">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <InputField
                            id="prep-ref"
                            label="Referencia de preparación"
                            required
                            value={referenciaPreparacion}
                            readOnly
                            hint="Se genera al preparar la factura."
                            error={errors.referencia}
                            className="sm:col-span-2"
                        />
                        <InputField
                            id="prep-fecha"
                            type="date"
                            label="Fecha de preparación"
                            required
                            value={fechaPreparacion}
                            error={errors.fecha}
                            onChange={v => { setFechaPreparacion(v); clearError("fecha"); }}
                            className="sm:col-span-2"
                        />
                        <InputField
                            id="prep-venc"
                            type="date"
                            label="Fecha de vencimiento"
                            optional
                            value={fechaVencimiento}
                            error={errors.vencimiento}
                            onChange={v => { setFechaVencimiento(v); clearError("vencimiento"); }}
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
                            error={errors.kilos}
                            hint={`Disponibles: ${formatKg(availableKg)} kg`}
                            onChange={v => { setKilosFacturados(v); clearError("kilos"); }}
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
                            readOnly
                            hint="Precio fijado en el contrato."
                            className="sm:col-span-3"
                        />
                    </div>
                </ModalSection>

                <ModalSection title="Descuentos, cargos y respaldo" aside="Opcional">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InputField
                            id="prep-descuento"
                            label="Descuento comercial / ajuste"
                            step="0.01"
                            min={0}
                            unit={symbol}
                            value={descuento}
                            error={errors.descuento}
                            onChange={v => { setDescuento(v); clearError("descuento"); }}
                        />
                        <InputField
                            id="prep-cargos"
                            label="Cargos adicionales (flete / frío)"
                            step="0.01"
                            min={0}
                            unit={symbol}
                            value={cargos}
                            error={errors.cargos}
                            onChange={v => { setCargos(v); clearError("cargos"); }}
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
                <SummaryBar items={[{ label: "Base", value: `${formatKg(kgNum)} kg × ${symbol} ${priceNum.toFixed(2)}` },
                    { label: "Subtotal", value: `${symbol} ${subtotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}` },
                    { label: "Total a facturar", value: `${symbol} ${total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`, tone: "brand" }]} />
            </div>
        </AppModal>
    );
}
