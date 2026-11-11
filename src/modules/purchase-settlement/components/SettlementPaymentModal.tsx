import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { getBadRequestFieldErrors } from '@/shared/validation/api-form-errors';
import { useState } from "react";
import { Banknote, Save, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import SegmentedControl from "@/shared/components/SegmentedControl";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import type { FileSource } from "@/shared/utils/fileSource";
import type {
    CarrierAdvanceItem,
    SettlementPaymentItem,
} from "@/modules/purchase-settlement/purchaseSettlement.models";

interface SettlementPaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    beneficiaryName: string;
    documentNumber: string;
    totalAmount: number;
    paidAmount: number;
    moneda?: string;
    availableAdvances?: CarrierAdvanceItem[];
    onRegister: (payment: Omit<SettlementPaymentItem, "id">, advanceId?: string) => void | Promise<void>;
}

const MEDIO_OPTIONS = [
    { value: "Transferencia", label: "Transferencia bancaria" },
    { value: "Depósito", label: "Depósito en cuenta" },
    { value: "Efectivo", label: "Efectivo en caja" },
];

export default function SettlementPaymentModal({
    open,
    onOpenChange,
    title,
    beneficiaryName,
    documentNumber,
    totalAmount,
    paidAmount,
    moneda,
    availableAdvances = [],
    onRegister,
}: SettlementPaymentModalProps) {
    const symbol = moneda === 'USD' ? 'US$' : 'S/';
    const [modo, setModo] = useState<"Caja" | "Adelanto">("Caja");
    const [selectedAdvanceId, setSelectedAdvanceId] = useState("");
    const [fecha, setFecha] = useState("");
    const [importe, setImporte] = useState("");
    const [medio, setMedio] = useState<"Transferencia" | "Depósito" | "Efectivo">("Transferencia");
    const [referencia, setReferencia] = useState("");
    const [evidencia, setEvidencia] = useState<FileSource | null>(null);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const saldoPendiente = Math.max(0, totalAmount - paidAmount);
    const activeAdvances = availableAdvances.filter((a) => a.saldoDisponible > 0);

    useResetOnToggle(open, () => {
        if (!open) return;
        setModo("Caja");
        setSelectedAdvanceId(activeAdvances[0]?.id ?? "");
        setFecha(new Date().toISOString().slice(0,10));
        setImporte(String(saldoPendiente));
        setMedio("Transferencia");
        setReferencia("");
        setEvidencia(null);
        setError("");
        setSaving(false);
    });

    const advanceItems = activeAdvances.map((a) => ({
        value: a.id,
        label: `${a.referencia} · Disponible: ${symbol} ${a.saldoDisponible.toLocaleString("es-PE")}`,
    }));

    const handleSubmit = async () => {
        if (saving) return;
        const amount = Number(importe);
        if (!fecha || !Number.isFinite(amount) || amount <= 0 || amount > saldoPendiente) {
            setError('Indica una fecha y un importe mayor que cero que no supere el saldo pendiente.');
            return;
        }
        if (modo === 'Caja' && !referencia.trim()) {
            setError(medio === 'Efectivo' ? 'Indica la referencia del pago en caja.' : 'Indica el número de operación bancaria para este medio de pago.');
            return;
        }
        if (modo === 'Caja' && medio !== 'Efectivo' && !evidencia) {
            setError('Adjunta el voucher o constancia de este pago.');
            return;
        }
        const advance = activeAdvances.find(a => a.id === selectedAdvanceId);
        if (modo === 'Adelanto' && (!advance || amount > advance.saldoDisponible)) {
            setError('Selecciona un adelanto con saldo suficiente.');
            return;
        }
        setSaving(true);
        setError('');

        try {
        if (modo === "Adelanto") {
            const adv = advance;
            await onRegister(
                {
                    fecha,
                    importe: amount,
                    modo: "Adelanto",
                    medio: "Aplicación de adelanto",
                    referencia: adv?.referencia ?? "ADEL-CAMP",
                    evidencia,
                    observaciones: '',
                },
                selectedAdvanceId,
            );
        } else {
            await onRegister({
                fecha,
                importe: amount,
                modo: "Caja",
                medio,
                referencia: referencia.trim(),
                evidencia,
                observaciones: '',
            });
        }
        onOpenChange(false);
        } catch (cause) {
            const fieldErrors = getBadRequestFieldErrors(cause, { monto: '_form', fecha: '_form', medio: '_form', referencia: '_form' });
            setError(Object.values(fieldErrors).filter(Boolean).join(' ') || (cause instanceof Error ? cause.message : 'No se pudo registrar el pago.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppModal
            busy={saving}
            open={open}
            onOpenChange={onOpenChange}
            icon={<Banknote size={22} strokeWidth={2.2} />}
            title={title}
            description={`${beneficiaryName} · Liquidación ${documentNumber || "S/N"}`}
            size="lg"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" disabled={saving} onClick={handleSubmit}>
                        <Save size={18} strokeWidth={2.5} /> {saving ? 'Guardando…' : 'Confirmar pago'}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
                <SummaryBar
                    items={[
                        {
                            label: "Total liquidado",
                            value: `${symbol} ${totalAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
                        },
                        {
                            label: "Pagado",
                            value: `${symbol} ${paidAmount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
                            tone: "brand",
                        },
                        {
                            label: "Saldo por pagar",
                            value: `${symbol} ${saldoPendiente.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
                            tone: "highlight",
                        },
                    ]}
                />

                {activeAdvances.length > 0 && (
                    <ModalSection title="Modo de cancelación (Caja vs. Adelanto de campaña)">
                        <SegmentedControl
                            options={[
                                { label: "Registrar pago en caja", value: "Caja" },
                                {
                                    label: `Aplicar adelanto disponible (${activeAdvances.length})`,
                                    value: "Adelanto",
                                },
                            ]}
                            value={modo}
                            onChange={(v) => setModo(v as "Caja" | "Adelanto")}
                        />
                    </ModalSection>
                )}

                <ModalSection title="Datos del desembolso / aplicación">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {modo === "Adelanto" && (
                            <FormField
                                label="Desembolso de adelanto a descontar"
                                required
                                className="sm:col-span-2"
                            >
                                <Select
                                    items={advanceItems}
                                    value={selectedAdvanceId}
                                    onValueChange={(v) => v && setSelectedAdvanceId(v as string)}
                                >
                                    <SelectTrigger
                                        aria-label="Adelanto disponible"
                                        className="h-11 rounded-lg bg-card font-semibold"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {advanceItems.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormField>
                        )}

                        <InputField
                            id="spay-fecha"
                            type="date"
                            label="Fecha de pago"
                            required
                            value={fecha}
                            onChange={setFecha}
                        />
                        <InputField
                            id="spay-importe"
                            label="Importe a pagar"
                            required
                            step="0.01"
                            min={0}
                            unit={symbol}
                            value={importe}
                            onChange={setImporte}
                        />

                        {modo === "Caja" && (
                            <>
                                <FormField label="Medio de pago" required>
                                    <Select
                                        items={MEDIO_OPTIONS}
                                        value={medio}
                                        onValueChange={(v) => {
                                            if (v) setMedio(v as "Transferencia" | "Depósito" | "Efectivo");
                                            setError('');
                                        }}
                                    >
                                        <SelectTrigger
                                            aria-label="Medio de pago"
                                            className="h-11 rounded-lg bg-card"
                                        >
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
                                    id="spay-ref"
                                    label={medio === 'Efectivo' ? 'Referencia de caja' : 'N° de operación bancaria'}
                                    required
                                    placeholder={medio === 'Efectivo' ? 'Ej. REC-CAJA-001' : 'Ej. BCP-OP-991024'}
                                    value={referencia}
                                    onChange={setReferencia}
                                />
                            </>
                        )}

                        {modo === 'Caja' && medio !== 'Efectivo' && <div className="sm:col-span-2">
                            <FileDropzone
                                label="Voucher o constancia de pago"
                                required
                                file={evidencia}
                                onChange={(f) => setEvidencia(f)}
                                variant="horizontal"
                                replaceable
                            />
                        </div>}
                    </div>
                </ModalSection>
            </div>
        </AppModal>
    );
}
