import { MapPin, Save, X } from "lucide-react";
import type { LogisticsArrival, LogisticsLoad } from "@/modules/logistics/logistics.models";
import { saveLogisticsArrival } from "@/modules/logistics/logistics.store";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import InputField from "@/shared/components/InputField";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import { useModalForm } from "@/shared/hooks/useModalForm";

export default function LogisticsArrivalModal({ load, onClose }: { load: LogisticsLoad; onClose: () => void }) {
    const current = load.llegada;
    const [values, , set] = useModalForm<LogisticsArrival>(true, current ?? {
        llegadaEstimada: "", ventanaInicio: "", ventanaFin: "", llegadaReal: "", observaciones: "",
        evidencia: null, motivoEspera: "", atencionReprogramada: "",
    });
    const outside = Boolean(values.llegadaReal && values.ventanaInicio && values.ventanaFin
        && (values.llegadaReal < values.ventanaInicio || values.llegadaReal > values.ventanaFin));
    const { errors, saving, submit } = useFormSubmit<LogisticsArrival>({
        open: true, backendFields: {},
        validate: value => {
            if (value.ventanaInicio && value.ventanaFin && value.ventanaFin < value.ventanaInicio)
                return { _form: "El fin de la ventana debe ser posterior al inicio." };
            if (outside && (!value.motivoEspera.trim() || !value.atencionReprogramada))
                return { _form: "La llegada quedó fuera de la ventana: registra el motivo de espera y la nueva atención." };
            return {};
        },
        onSubmit: async value => { await saveLogisticsArrival(load.id, value); onClose(); },
    });
    const save = () => void submit({ ...values, observaciones: values.observaciones.trim(),
        motivoEspera: outside ? values.motivoEspera.trim() : "", atencionReprogramada: outside ? values.atencionReprogramada : "" });
    return <AppModal open onOpenChange={open => { if (!open) onClose(); }} busy={saving} size="xl"
        icon={<MapPin size={22} />} title={current?.llegadaReal ? "Editar coordinación y llegada" : "Registrar coordinación y llegada"} description={`${load.codigo} · ${load.destino}`}
        footer={<><Button variant="outline" onClick={onClose}><X size={18} />Cancelar</Button>
            <Button disabled={saving} onClick={save}><Save size={18} />Guardar llegada</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
            <FormField error={errors._form} className="sm:col-span-2" />
            <InputField id="log-arrival-estimated" label="Fecha y hora estimada" type="datetime-local" value={values.llegadaEstimada} onChange={set("llegadaEstimada")} />
            <InputField id="log-arrival-real" label="Fecha y hora real de llegada" type="datetime-local" value={values.llegadaReal} onChange={set("llegadaReal")} />
            <InputField id="log-arrival-window-start" label="Inicio de ventana de atención" type="datetime-local" value={values.ventanaInicio} onChange={set("ventanaInicio")} />
            <InputField id="log-arrival-window-end" label="Fin de ventana de atención" type="datetime-local" value={values.ventanaFin} onChange={set("ventanaFin")} />
            <FormField label="Observaciones" className="sm:col-span-2"><Textarea value={values.observaciones} onChange={event => set("observaciones")(event.target.value)} rows={3} /></FormField>
            <FileDropzone label="Evidencia de coordinación" file={values.evidencia} onChange={set("evidencia")} variant="horizontal" className="sm:col-span-2" replaceable />
            {outside && <>
                <InputField id="log-arrival-reason" label="Motivo de espera" required value={values.motivoEspera} onChange={set("motivoEspera")} />
                <InputField id="log-arrival-rescheduled" label="Nueva atención prevista" type="datetime-local" required value={values.atencionReprogramada} onChange={set("atencionReprogramada")} />
            </>}
        </div>
    </AppModal>;
}
