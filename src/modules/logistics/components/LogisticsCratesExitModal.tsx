import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { useState } from "react";
import { Layers, Plus, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import type { FileSource } from "@/shared/utils/fileSource";
import { formatDisplayDate } from "@/shared/utils/format";
import type { LogisticsCrateMovement, LogisticsLoad } from "@/modules/logistics/logistics.models";

interface LogisticsCratesExitModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    load: LogisticsLoad | null;
    onAddMovement: (loadId: string, movement: Omit<LogisticsCrateMovement, "id">) => void;
}

export default function LogisticsCratesExitModal({
    open,
    onOpenChange,
    load,
    onAddMovement,
}: LogisticsCratesExitModalProps) {
    const [proveedorNombre, setProveedorNombre] = useState("");
    const [tipoEnvase, setTipoEnvase] = useState<"Jabas" | "Bines" | "Mallas">("Jabas");
    const [fecha, setFecha] = useState("");
    const [cantidadCargada, setCantidadCargada] = useState("");
    const [cantidadDevuelta, setCantidadDevuelta] = useState("");
    const [guiaSalidaNumero, setGuiaSalidaNumero] = useState("");
    const [guiaSalidaArchivo, setGuiaSalidaArchivo] = useState<FileSource | null>(null);
    const [observaciones, setObservaciones] = useState("");

    useResetOnToggle(open, () => {
        if (!load || !open) return;
        const firstProv = load.proveedores[0];
        setProveedorNombre(firstProv?.proveedorNombre ?? "");
        setFecha(load.fechaCarga);
        setCantidadCargada(
            firstProv ? String(firstProv.jabasCargadas + firstProv.jabasVacias) : "0",
        );
        setCantidadDevuelta(
            firstProv ? String(firstProv.jabasCargadas + firstProv.jabasVacias) : "0",
        );
        setGuiaSalidaNumero("");
        setGuiaSalidaArchivo(null);
        setObservaciones("");
    });

    if (!load) return null;

    const totalCargadas = load.proveedores.reduce(
        (s, p) => s + p.jabasCargadas + p.binesCargados + p.mallasCargadas,
        0,
    );
    const totalVacias = load.proveedores.reduce(
        (s, p) => s + p.jabasVacias + p.binesVacios + p.mallasVacias,
        0,
    );
    const totalDevueltas = load.jabasMovimientos.reduce((s, m) => s + m.cantidadDevuelta, 0);

    const pendientes = Math.max(0, (Number(cantidadCargada) || 0) - (Number(cantidadDevuelta) || 0));

    const handleRegister = () => {
        if (!proveedorNombre) return;
        onAddMovement(load.id, {
            proveedorNombre,
            tipoEnvase,
            fecha,
            cantidadCargada: Number(cantidadCargada) || 0,
            cantidadDevuelta: Number(cantidadDevuelta) || 0,
            pendientes,
            guiaSalidaNumero: guiaSalidaNumero.trim() || "S/N",
            guiaSalidaArchivo,
            observaciones: observaciones.trim(),
        });
    };

    const providerOptions = load.proveedores.map((p) => ({
        value: p.proveedorNombre,
        label: p.proveedorNombre,
    }));

    const envaseOptions = [
        { value: "Jabas", label: "Jabas" },
        { value: "Bines", label: "Bines" },
        { value: "Mallas", label: "Mallas" },
    ];

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Layers size={22} strokeWidth={2.2} />}
            title="Jabas, envases y guía de salida"
            description={`${load.codigo} · Control de devolución de envases por proveedor`}
            size="2xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} strokeWidth={2.5} /> Cerrar
                    </Button>
                    <Button size="xl" onClick={handleRegister}>
                        <Plus size={18} strokeWidth={2.5} /> Registrar movimiento y salida
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <SummaryBar
                    items={[
                        { label: "Bultos con fruta", value: `${totalCargadas} und.` },
                        { label: "Bultos vacíos", value: `${totalVacias} und.` },
                        { label: "Total devueltos", value: `${totalDevueltas} und.`, tone: "brand" },
                    ]}
                />

                <ModalSection
                    title="Movimientos de devolución registrados"
                    aside={`${load.jabasMovimientos.length} movimiento(s)`}
                >
                    {load.jabasMovimientos.length === 0 ? (
                        <div className="rounded-xl border border-border bg-surface-page/40 p-4 text-center text-[13px] font-medium text-ink-muted">
                            Aún no se han registrado devoluciones de jabas/bines para esta carga.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {load.jabasMovimientos.map((mov) => (
                                <div
                                    key={mov.id}
                                    className="flex flex-col gap-2 rounded-xl border border-border bg-surface-page/50 p-3.5"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <p className="text-[13.5px] font-bold text-ink">
                                                {mov.proveedorNombre} · {mov.tipoEnvase}
                                            </p>
                                            <p className="text-[12px] font-medium text-ink-muted">
                                                Fecha: {formatDisplayDate(mov.fecha)} · Guía de salida:{" "}
                                                {mov.guiaSalidaNumero}
                                            </p>
                                        </div>
                                        <StatusBadge
                                            status={mov.pendientes === 0 ? "Completa" : "Parcial"}
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-[12px] font-semibold">
                                        <span className="rounded-lg border border-border bg-card px-2.5 py-1 text-ink">
                                            Ingresadas: {mov.cantidadCargada}
                                        </span>
                                        <span className="rounded-lg border border-brand-border bg-brand-surface px-2.5 py-1 text-brand">
                                            Devueltas: {mov.cantidadDevuelta}
                                        </span>
                                        <span className="rounded-lg border border-border bg-card px-2.5 py-1 text-status-highlight">
                                            Pendientes: {mov.pendientes}
                                        </span>
                                    </div>
                                    {mov.observaciones && (
                                        <p className="text-[12px] text-ink-body">{mov.observaciones}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ModalSection>

                <ModalSection title="Registrar nuevo movimiento de jabas y guía de salida">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <FormField label="Proveedor" required className="sm:col-span-4">
                            <Select
                                items={providerOptions}
                                value={proveedorNombre}
                                onValueChange={(v) => v && setProveedorNombre(v as string)}
                            >
                                <SelectTrigger aria-label="Proveedor" className="h-11 rounded-lg bg-card">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {providerOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>

                        <FormField label="Tipo de envase" required className="sm:col-span-2">
                            <Select
                                items={envaseOptions}
                                value={tipoEnvase}
                                onValueChange={(v) =>
                                    v && setTipoEnvase(v as "Jabas" | "Bines" | "Mallas")
                                }
                            >
                                <SelectTrigger aria-label="Tipo de envase" className="h-11 rounded-lg bg-card">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {envaseOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>

                        <InputField
                            id="crate-fecha"
                            type="date"
                            label="Fecha de devolución"
                            required
                            value={fecha}
                            onChange={setFecha}
                            className="sm:col-span-2"
                        />
                        <InputField
                            id="crate-cargada"
                            label="Cantidad ingresada"
                            required
                            step="1"
                            min={0}
                            unit="und."
                            value={cantidadCargada}
                            onChange={setCantidadCargada}
                            className="sm:col-span-2"
                        />
                        <InputField
                            id="crate-devuelta"
                            label="Cantidad devuelta"
                            required
                            step="1"
                            min={0}
                            unit="und."
                            value={cantidadDevuelta}
                            onChange={setCantidadDevuelta}
                            hint={`Quedarán ${pendientes} pendientes`}
                            className="sm:col-span-2"
                        />

                        <InputField
                            id="crate-guia-num"
                            label="Número de guía de salida"
                            required
                            placeholder="Ej. EG01-000415"
                            value={guiaSalidaNumero}
                            onChange={setGuiaSalidaNumero}
                            className="sm:col-span-2"
                        />
                        <div className="sm:col-span-4">
                            <FileDropzone
                                label="Guía de salida firmada"
                                file={guiaSalidaArchivo}
                                onChange={(f) => setGuiaSalidaArchivo(f)}
                                variant="horizontal"
                                replaceable
                            />
                        </div>

                        <FormField
                            id="crate-obs"
                            label="Observaciones del retorno de envases"
                            optional
                            className="sm:col-span-6"
                        >
                            <Textarea
                                id="crate-obs"
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
