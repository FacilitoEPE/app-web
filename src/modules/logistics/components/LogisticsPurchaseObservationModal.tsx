import { Pencil, Save, X } from "lucide-react";
import type { LogisticsPurchase } from "@/modules/logistics/logistics.models";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import { useModalForm } from "@/shared/hooks/useModalForm";

interface Props { purchase: LogisticsPurchase; providerName: string; onClose: () => void; onSave: (observation: string) => Promise<unknown> | void }

export default function LogisticsPurchaseObservationModal({ purchase, providerName, onClose, onSave }: Props) {
    const [values, , set] = useModalForm(true, { observation: purchase.observacion });
    const { errors, saving, submit } = useFormSubmit<{ observation: string }>({
        open: true, backendFields: {},
        validate: () => ({}),
        onSubmit: async value => { await onSave(value.observation.trim()); onClose(); },
    });
    return <AppModal open onOpenChange={open => { if (!open) onClose(); }} busy={saving} icon={<Pencil size={22} />}
        title="Observación de compra" description={`${purchase.referencia || "Compra sin referencia"} · ${providerName}`} size="md"
        footer={<><Button variant="outline" onClick={onClose}><X size={18} />Cancelar</Button>
            <Button disabled={saving} onClick={() => void submit(values)}><Save size={18} />Guardar observación</Button></>}>
        <FormField label="Observación" error={errors._form}>
            <Textarea value={values.observation} onChange={event => set("observation")(event.target.value)} rows={4}
                placeholder="Registra los hallazgos de la revisión documental…" />
        </FormField>
    </AppModal>;
}
