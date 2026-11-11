import { useState } from "react";
import { ClipboardCheck, PackageX, Save, X } from "lucide-react";
import type { LogisticsLoad, LogisticsProviderBreakdown } from "@/modules/logistics/logistics.models";
import { saveLogisticsDiscard, saveLogisticsEvaluation, saveLogisticsUnloading } from "@/modules/logistics/logistics.store";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { InfoField } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import { useModalForm } from "@/shared/hooks/useModalForm";
import { formatKg } from "@/shared/utils/format";
import type { FileSource } from "@/shared/utils/fileSource";

interface ModalProps { load: LogisticsLoad; onClose: () => void }

export function LogisticsUnloadingModal({ load, onClose }: ModalProps) {
    const current = load.recepcion;
    const [values, , set] = useModalForm<{
        start: string; end: string; responsible: string; observations: string; evidence: FileSource | null;
    }>(true, { start: current.inicioDescarga, end: current.terminoDescarga,
        responsible: current.responsableRecepcion, observations: current.observacionesDescarga,
        evidence: current.evidenciaDescarga ?? null });
    const { errors, saving, submit } = useFormSubmit({
        open: true, backendFields: {},
        validate: (value: { start: string; end: string; responsible: string }) => {
            const found: Record<string, string> = {};
            if (!value.start || !value.end) found._form = "Registra el inicio y el término de la descarga.";
            else if (value.end < value.start) found.end = "El término no puede ser anterior al inicio.";
            if (!value.responsible.trim()) found.responsible = "Ingresa el responsable de recepción.";
            return found;
        },
        onSubmit: async () => {
            await saveLogisticsUnloading(load.id, { inicioDescarga: values.start, terminoDescarga: values.end,
                responsableRecepcion: values.responsible.trim(), observacionesDescarga: values.observations.trim(),
                evidenciaDescarga: values.evidence });
            onClose();
        },
    });
    return <AppModal open onOpenChange={open => { if (!open) onClose(); }} busy={saving} size="lg"
        icon={<ClipboardCheck size={22} />} title={current.inicioDescarga ? "Editar descarga" : "Registrar descarga"} description={`${load.codigo} · ${load.cliente}`}
        footer={<><Button variant="outline" onClick={onClose}><X size={18} />Cancelar</Button>
            <Button disabled={saving} onClick={() => void submit(values)}><Save size={18} />Guardar descarga</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
            <FormField error={errors._form} className="sm:col-span-2" />
            <InputField id="log-unload-start" label="Inicio de descarga" type="datetime-local" required value={values.start} onChange={set("start")} />
            <InputField id="log-unload-end" label="Término de descarga" type="datetime-local" required value={values.end} onChange={set("end")} error={errors.end} />
            <InputField id="log-unload-responsible" label="Responsable de recepción" required value={values.responsible} onChange={set("responsible")} error={errors.responsible} className="sm:col-span-2" />
            <FormField label="Observaciones" className="sm:col-span-2"><Textarea value={values.observations} onChange={event => set("observations")(event.target.value)} rows={3} /></FormField>
            <FileDropzone label="Evidencia de descarga" file={values.evidence} onChange={set("evidence")} variant="horizontal" className="sm:col-span-2" replaceable />
        </div>
    </AppModal>;
}

export function LogisticsDiscardModal({ load, onClose }: ModalProps) {
    const current = load.recepcion;
    const [values, , set] = useModalForm<{ quantity: string; reason: string; evidence: FileSource | null }>(true, {
        quantity: current.huboDescarte ? String(current.kilosDescarte) : "",
        reason: current.motivoDescarte, evidence: current.actaDescarteArchivo,
    });
    const { errors, saving, submit } = useFormSubmit({
        open: true, backendFields: {},
        validate: (value: { quantity: number; reason: string }) => {
            if (!Number.isFinite(value.quantity) || value.quantity < 0 || value.quantity > current.pesoRecibidoPlanta)
                return { _form: "La cantidad descartada debe estar entre cero y el peso recibido en planta." };
            if (value.quantity > 0 && !value.reason.trim()) return { reason: "Indica el motivo del descarte." };
            return {};
        },
        onSubmit: async value => {
            await saveLogisticsDiscard(load.id, { huboDescarte: value.quantity > 0, kilosDescarte: value.quantity,
                unidadDescarte: "kg", motivoDescarte: value.reason.trim(), actaDescarteArchivo: values.evidence });
            onClose();
        },
    });
    return <AppModal open onOpenChange={open => { if (!open) onClose(); }} busy={saving} size="md"
        icon={<PackageX size={22} />} title={current.huboDescarte ? "Editar descarte" : "Registrar descarte"} description={`${load.codigo} · Peso recibido: ${formatKg(current.pesoRecibidoPlanta)} kg`}
        footer={<><Button variant="outline" onClick={onClose}><X size={18} />Cancelar</Button>
            <Button disabled={saving} onClick={() => void submit({ quantity: Number(values.quantity), reason: values.reason })}><Save size={18} />Guardar descarte</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
            <FormField error={errors._form} className="sm:col-span-2" />
            <InputField id="log-discard-quantity" label="Cantidad descartada" type="number" min={0} step="0.01" unit="kg" required value={values.quantity} onChange={set("quantity")} className="sm:col-span-2" />
            <FormField label="Motivo" required={Number(values.quantity) > 0} error={errors.reason} className="sm:col-span-2"><Textarea aria-required={Number(values.quantity) > 0} value={values.reason} onChange={event => set("reason")(event.target.value)} rows={3} /></FormField>
            <FileDropzone label="Documento o evidencia" file={values.evidence} onChange={set("evidence")} variant="horizontal" className="sm:col-span-2" replaceable />
        </div>
    </AppModal>;
}

export function LogisticsEvaluationForm({ load, locked = false }: { load: LogisticsLoad; locked?: boolean }) {
    const current = load.recepcion;
    const [weight, setWeight] = useState(current.pesoRecibidoPlanta ? String(current.pesoRecibidoPlanta) : "");
    const [result, setResult] = useState(current.resultadoRecepcion);
    const [observations, setObservations] = useState(current.observacionesEvaluacion);
    const [report, setReport] = useState<FileSource | null>(current.reporteRecepcionArchivo);
    const [providers, setProviders] = useState<LogisticsProviderBreakdown[]>(load.proveedores.map(provider => ({ ...provider })));
    const allocatedProviders = (weight: number) => providers.length === 1
        ? [{ ...providers[0], kilosRecibidosPlanta: weight }] : providers;
    const { errors, saving, submit } = useFormSubmit({
        open: true, backendFields: {},
        validate: (value: { weight: number; result: string }) => {
            const allocation = allocatedProviders(value.weight);
            const sum = allocation.reduce((total, provider) => total + provider.kilosRecibidosPlanta, 0);
            if (!Number.isFinite(value.weight) || value.weight <= 0 || Math.abs(sum - value.weight) > 0.01)
                return { _form: "Distribuye los kilos recibidos por proveedor hasta igualar el peso en planta." };
            if (!allocation.length || allocation.some(provider => provider.kilosRecibidosPlanta <= 0 || provider.kilosRecibidosPlanta > provider.kilosCargados))
                return { _form: "Los kilos recibidos de cada proveedor deben ser positivos y no superar sus kilos cargados." };
            if (!value.result.trim()) return { result: "Ingresa el resultado de la evaluación." };
            return {};
        },
        onSubmit: async value => {
            await saveLogisticsEvaluation(load.id, { pesoRecibidoPlanta: value.weight, resultadoRecepcion: value.result.trim(),
                observacionesEvaluacion: observations.trim(), reporteRecepcionArchivo: report }, allocatedProviders(value.weight));
        },
    });
    const totalLoaded = load.proveedores.reduce((sum, provider) => sum + provider.kilosCargados, 0);
    const plant = Number(weight);
    const difference = Number.isFinite(plant) && plant > 0 ? totalLoaded - plant : null;
    return <div className="grid gap-4">
        <FormField error={errors._form} />
        <div className="grid gap-4 sm:grid-cols-2">
            <InfoField label="Peso de origen" value={`${formatKg(totalLoaded)} kg`} />
            <InputField id="log-eval-weight" label="Peso en planta" type="number" min={0} step="0.01" unit="kg" required
                readOnly={locked || load.comprasBloqueadas} value={weight} onChange={setWeight} />
            <InputField id="log-eval-result" label="Resultado" required disabled={locked} value={result} onChange={setResult} error={errors.result} className="sm:col-span-2" />
        </div>
        <FormField label="Observaciones"><Textarea value={observations} disabled={locked} onChange={event => setObservations(event.target.value)} rows={3} /></FormField>
        <FileDropzone label="Informe de evaluación" required={!locked && !load.documentosCierre.cierreFisicoConfirmado} hint={!load.documentosCierre.cierreFisicoConfirmado ? "Requerido para el cierre físico · PDF · Máx. 10 MB" : undefined} file={report} onChange={setReport} disabled={locked} variant="horizontal" replaceable />
        {providers.length > 1 && <div className="grid gap-2">
            <p className="text-sm font-semibold text-ink">Kilos reconocidos por proveedor</p>
            {providers.map(provider => <div key={provider.proveedorId} className="grid items-center gap-2 rounded-xl border border-border p-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
                <div><p className="text-sm font-semibold text-ink">{provider.proveedorNombre}</p><p className="text-xs text-ink-muted">{provider.fincaNombre} · {formatKg(provider.kilosCargados)} kg cargados</p></div>
                <InputField id={`log-eval-${provider.proveedorId}`} label="Kilos recibidos" required type="number" min={0} step="0.01" unit="kg"
                    readOnly={locked || load.comprasBloqueadas} value={provider.kilosRecibidosPlanta ? String(provider.kilosRecibidosPlanta) : ""}
                    onChange={value => setProviders(rows => rows.map(row => row.proveedorId === provider.proveedorId
                        ? { ...row, kilosRecibidosPlanta: Number(value) || 0 } : row))} />
            </div>)}
        </div>}
        {difference !== null && <p className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-ink-body">Diferencia entre origen y planta: <strong>{formatKg(difference)} kg</strong>. Esta diferencia no se considera descarte automáticamente.</p>}
        {load.comprasBloqueadas && <p className="text-xs text-ink-muted">Los kilos reconocidos ya se usaron en liquidaciones. Puedes actualizar el resultado y las observaciones sin cambiar los pesos.</p>}
        <div className="flex justify-end"><Button disabled={saving || locked} onClick={() => void submit({ weight: Number(weight), result })}><Save size={18} />Guardar evaluación</Button></div>
    </div>;
}
