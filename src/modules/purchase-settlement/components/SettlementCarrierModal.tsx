import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { suggestSettlementNumber } from '@/modules/purchase-settlement/settlementNumber.utils';
import { useState } from "react";
import { Plus, Save, Trash2, Truck, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import type { FileSource } from "@/shared/utils/fileSource";
import type { CarrierRealExpense, SettlementLoad } from "@/modules/purchase-settlement/purchaseSettlement.models";

interface SettlementCarrierModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    load: SettlementLoad | null;
    existingNumbers: string[];
    onSave: (
        loadId: string,
        payload: {
            numeroLiquidacion: string;
            fechaLiquidacion: string;
            fleteCarga: number;
            gastosReales: CarrierRealExpense[];
            archivoLiquidacion: FileSource | null;
            observaciones: string;
        },
    ) => void | Promise<void>;
}

export default function SettlementCarrierModal({
    open,
    onOpenChange,
    load,
    existingNumbers,
    onSave,
}: SettlementCarrierModalProps) {
    const [numeroLiquidacion, setNumeroLiquidacion] = useState("");
    const [fechaLiquidacion, setFechaLiquidacion] = useState("");
    const [fleteCarga, setFleteCarga] = useState("");
    const [gastosReales, setGastosReales] = useState<CarrierRealExpense[]>([]);
    const [archivoLiquidacion, setArchivoLiquidacion] = useState<FileSource | null>(null);
    const [observaciones, setObservaciones] = useState("");
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    useResetOnToggle(open, () => {
        if (!load || !open) return;
        const t = load.transporte;
        const date = t.fechaLiquidacion || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
        setNumeroLiquidacion(t.numeroLiquidacion || suggestSettlementNumber(existingNumbers, date, 'LT'));
        setFechaLiquidacion(date);
        setFleteCarga(t.estado === 'Por liquidar' ? '' : String(t.fleteCarga));
        setGastosReales(t.gastosReales.map((g) => ({ ...g })));
        setArchivoLiquidacion(t.archivoLiquidacion);
        setObservaciones(t.observaciones);
        setFormError('');
        setSaving(false);
    });

    if (!load) return null;

    const symbol = load.transporte.moneda === 'USD' ? 'US$' : 'S/';
    const currencyAllowed = load.transporte.moneda === 'PEN';
    const fleteNum = Number(fleteCarga) || 0;
    const totalGastosReales = gastosReales.reduce((s, g) => s + (Number(g.monto) || 0), 0);
    const viaticosRef = load.transporte.viaticosMovilidad + load.transporte.viaticosInsumos;
    const totalLiquidar = fleteNum + (gastosReales.length ? totalGastosReales : viaticosRef);
    const alreadyPaid = load.transporte.pagos.reduce((sum, payment) => sum + payment.importe, 0);

    const addExpenseRow = () => {
        setGastosReales((current) => [
            ...current,
            { id: `exp-${Date.now()}`, concepto: "", monto: 0 },
        ]);
    };

    const removeExpenseRow = (id: string) => {
        setGastosReales((current) => current.filter((item) => item.id !== id));
    };

    const handleSubmit = async () => {
        if (!currencyAllowed || saving || !numeroLiquidacion.trim() || !fechaLiquidacion || fleteNum <= 0 || totalLiquidar < alreadyPaid || gastosReales.some(g => !g.concepto.trim() || !Number.isFinite(Number(g.monto)) || Number(g.monto) <= 0)) return;
        setSaving(true);
        setFormError('');
        try {
        await onSave(load.id, {
            numeroLiquidacion: numeroLiquidacion.trim() || "",
            fechaLiquidacion,
            fleteCarga: fleteNum,
            gastosReales,
            archivoLiquidacion,
            observaciones: observaciones.trim(),
        });
        onOpenChange(false);
        } catch (cause) {
            setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar la liquidación.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppModal
            busy={saving}
            open={open}
            onOpenChange={onOpenChange}
            icon={<Truck size={22} strokeWidth={2.2} />}
            title="Gastos reales y liquidación de transporte"
            description={`${load.transporte.transportista} · Placa ${load.transporte.placa} · Carga ${load.codigo}`}
            size="xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" disabled={!currencyAllowed || saving || !numeroLiquidacion.trim() || !fechaLiquidacion || fleteNum <= 0 || totalLiquidar < alreadyPaid || gastosReales.some(g => !g.concepto.trim() || !Number.isFinite(Number(g.monto)) || Number(g.monto) <= 0)} onClick={handleSubmit}>
                        <Save size={18} strokeWidth={2.5} /> {saving ? 'Guardando…' : 'Guardar liquidación de transporte'}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                {!currencyAllowed && <FormField error="Por ahora solo se permite liquidar transporte con acuerdos en PEN. Revisa la moneda del acuerdo en Campañas." />}
                {formError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{formError}</p>}
                <SummaryBar
                    items={[
                        {
                            label: "Flete de la carga",
                            value: `${symbol} ${fleteNum.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
                        },
                        {
                            label: gastosReales.length ? "Gastos reales sustentados" : "Viáticos referenciales aplicables",
                            value: `${symbol} ${(gastosReales.length ? totalGastosReales : viaticosRef).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
                            tone: "highlight",
                        },
                        {
                            label: "Total liquidación",
                            value: `${symbol} ${totalLiquidar.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`,
                            tone: "brand",
                        },
                    ]}
                />
                {totalLiquidar < alreadyPaid && <p role="alert" className="text-sm text-destructive">El total actualizado no puede ser menor que los {symbol} {alreadyPaid.toFixed(2)} ya pagados o aplicados.</p>}

                <ModalSection
                    title="1. Datos de liquidación y flete del viaje"
                    aside={`Viáticos referenciales en campo: S/ ${viaticosRef.toFixed(2)}`}
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <InputField
                            id="carr-liq-num"
                            label="Número de liquidación"
                            required
                            value={numeroLiquidacion}
                            onChange={setNumeroLiquidacion}
                        />
                        <InputField
                            id="carr-liq-fecha"
                            type="date"
                            label="Fecha de liquidación"
                            required
                            value={fechaLiquidacion}
                            onChange={setFechaLiquidacion}
                        />
                        <InputField
                            id="carr-liq-flete"
                            label="Precio del flete de esta carga"
                            required
                            placeholder="Ingresa el monto"
                            disabled={load.transporte.estado !== 'Por liquidar'}
                            step="0.01"
                            min={0}
                            unit={symbol}
                            value={fleteCarga}
                            onChange={setFleteCarga}
                        />
                    </div>
                </ModalSection>

                <ModalSection
                    title="2. Detalle de gastos reales en ruta"
                    aside={
                        <button
                            type="button"
                            onClick={addExpenseRow}
                            className="inline-flex items-center gap-1 text-[12px] font-bold text-brand hover:underline"
                        >
                            <Plus size={14} strokeWidth={2.5} /> + Agregar gasto real
                        </button>
                    }
                >
                    {gastosReales.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-surface-page/40 p-4 text-center text-[13px] font-medium text-ink-muted">
                            Sin gastos reales adicionales registrados. Haz clic en{" "}
                            <strong>+ Agregar gasto real</strong> si hubo peajes, combustible Reefer o
                            estiba adicional.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {gastosReales.map((g, idx) => (
                                <div
                                    key={g.id}
                                    className="grid grid-cols-1 items-end gap-3 rounded-xl border border-border bg-surface-page/40 p-3 sm:grid-cols-12"
                                >
                                    <InputField
                                        id={`exp-conc-${idx}`}
                                        label="Concepto del gasto"
                                        required
                                        variant="compact"
                                        placeholder="Ej. Peajes ruta Tambogrande - Paita"
                                        value={g.concepto}
                                        onChange={(val) =>
                                            setGastosReales((curr) =>
                                                curr.map((item, i) =>
                                                    i === idx ? { ...item, concepto: val } : item,
                                                ),
                                            )
                                        }
                                        className="sm:col-span-7"
                                    />
                                    <InputField
                                        id={`exp-monto-${idx}`}
                                        label="Monto real"
                                        required
                                        variant="compact"
                                        step="0.01"
                                        min={0}
                                        unit={symbol}
                                        value={String(g.monto)}
                                        onChange={(val) =>
                                            setGastosReales((curr) =>
                                                curr.map((item, i) =>
                                                    i === idx
                                                        ? { ...item, monto: Number(val) || 0 }
                                                        : item,
                                                ),
                                            )
                                        }
                                        className="sm:col-span-4"
                                    />
                                    <div className="flex justify-end sm:col-span-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeExpenseRow(g.id)}
                                            aria-label="Eliminar gasto"
                                            className="text-ink-muted hover:text-destructive"
                                        >
                                            <Trash2 size={16} strokeWidth={2.3} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ModalSection>

                <ModalSection title="3. Documento adjunto y observaciones">
                    <div className="flex flex-col gap-4">
                        <FileDropzone
                            label="Liquidación o factura del transportista"
                            file={archivoLiquidacion}
                            onChange={(f) => setArchivoLiquidacion(f)}
                            variant="horizontal"
                            replaceable
                        />
                        <FormField id="carr-liq-obs" label="Observaciones" optional>
                            <Textarea
                                id="carr-liq-obs"
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
