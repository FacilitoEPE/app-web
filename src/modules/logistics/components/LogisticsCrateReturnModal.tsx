import { Layers, Save, X } from "lucide-react";
import type { LogisticsCrateReturn, LogisticsLoad } from "@/modules/logistics/logistics.models";
import { saveLogisticsCrateReturn } from "@/modules/logistics/logistics.store";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import InputField from "@/shared/components/InputField";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import { useModalForm } from "@/shared/hooks/useModalForm";
import type { FileSource } from "@/shared/utils/fileSource";

export default function LogisticsCrateReturnModal({ load, onClose }: { load: LogisticsLoad; onClose: () => void }) {
    const current = load.devolucionJabas;
    const [values, , set] = useModalForm<{
        initial: string; returned: string; date: string; coordination: string; vehicleExit: string;
        carrierCopy: boolean; evidence: FileSource | null;
    }>(true, {
        initial: current?.jabasIniciales == null ? "" : String(current.jabasIniciales),
        returned: current?.jabasDevueltas == null ? "" : String(current.jabasDevueltas),
        date: current?.fechaDevolucion ?? "", coordination: current?.coordinacion ?? "",
        vehicleExit: current?.salidaVehiculo ?? "", carrierCopy: current?.copiaTransportista ?? false,
        evidence: current?.evidencia ?? null,
    });
    const { errors, saving, submit } = useFormSubmit<LogisticsCrateReturn>({
        open: true, backendFields: {},
        validate: value => {
            if (value.jabasIniciales == null || !Number.isInteger(value.jabasIniciales) || value.jabasIniciales < 0)
                return { initial: "Ingresa la cantidad de jabas que llegó." };
            if (value.jabasDevueltas == null || !Number.isInteger(value.jabasDevueltas) || value.jabasDevueltas < 0 || value.jabasDevueltas > value.jabasIniciales)
                return { returned: "Las devueltas no pueden superar las que llegaron." };
            if (value.jabasDevueltas > 0 && !value.fechaDevolucion) return { date: "Registra la fecha de devolución." };
            return {};
        },
        onSubmit: async value => { await saveLogisticsCrateReturn(load.id, value); onClose(); },
    });
    const save = () => void submit({ jabasIniciales: values.initial === "" ? null : Number(values.initial),
        jabasDevueltas: values.returned === "" ? null : Number(values.returned), fechaDevolucion: values.date,
        coordinacion: values.coordination.trim(), salidaVehiculo: values.vehicleExit,
        copiaTransportista: values.carrierCopy, evidencia: values.evidence });
    return <AppModal open onOpenChange={open => { if (!open) onClose(); }} busy={saving} size="lg"
        icon={<Layers size={22} />} title={current?.fechaDevolucion ? "Editar devolución de jabas y salida" : "Registrar devolución de jabas y salida"} description={`${load.codigo} · ${load.transportista}`}
        footer={<><Button variant="outline" onClick={onClose}><X size={18} />Cancelar</Button>
            <Button disabled={saving} onClick={save}><Save size={18} />Guardar devolución</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
            <FormField error={errors._form} className="sm:col-span-2" />
            <InputField id="log-crates-initial" label="Cantidad que llegó" type="number" min={0} step="1" required value={values.initial} onChange={set("initial")} error={errors.initial} />
            <InputField id="log-crates-returned" label="Cantidad devuelta" type="number" min={0} step="1" required value={values.returned} onChange={set("returned")} error={errors.returned} />
            <InputField id="log-crates-date" label="Fecha de devolución" required={Number(values.returned) > 0} type="date" value={values.date} onChange={set("date")} error={errors.date} />
            <InputField id="log-crates-coordination" label="Coordinación con planta" value={values.coordination} onChange={set("coordination")} />
            <InputField id="log-crates-exit" label="Salida del vehículo" type="datetime-local" value={values.vehicleExit} onChange={set("vehicleExit")} />
            <FormField label="Copia entregada al transportista"><label className="flex h-10 items-center gap-3 rounded-lg border border-border px-3 text-sm text-ink">
                <Checkbox checked={values.carrierCopy} onCheckedChange={value => set("carrierCopy")(Boolean(value))} />{values.carrierCopy ? "Entregada" : "Pendiente"}
            </label></FormField>
            <FileDropzone label="Constancia o evidencia" file={values.evidence} onChange={set("evidence")} variant="horizontal" className="sm:col-span-2" replaceable />
        </div>
    </AppModal>;
}
