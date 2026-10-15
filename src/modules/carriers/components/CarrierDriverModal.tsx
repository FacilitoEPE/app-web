import { X, Save, UserRound, Phone, Mail } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import { useModalForm } from "@/shared/hooks/useModalForm";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import InputField from "@/shared/components/InputField";
import { Button } from "@/shared/components/ui/button";
import type { Carrier } from "@/modules/carriers/carriers.data";
import {
    DRIVER_BACKEND_FIELDS,
    EMPTY_DRIVER,
    validateDriver,
    type DriverField,
    type DriverFormValues,
} from "@/modules/carriers/carrierRecords.utils";

export type { DriverFormValues };

interface CarrierDriverModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Guarda el chofer; si rechaza con un 400 del backend, sus mensajes salen bajo cada campo */
    onSuccess?: (values: DriverFormValues) => void | Promise<void>;
    carrier: Carrier | null;
    /** "create" arranca vacío; "edit" arranca con `initialValues` y cambia los textos */
    mode?: "create" | "edit";
    initialValues?: Partial<DriverFormValues>;
}

export default function CarrierDriverModal({ open, onOpenChange, onSuccess, carrier, mode = "create", initialValues }: CarrierDriverModalProps) {
    const isEdit = mode === "edit";
    const [values, , set] = useModalForm<DriverFormValues>(open, { ...EMPTY_DRIVER, ...initialValues });
    const { errors, saving, clearError, submit } = useFormSubmit<DriverFormValues>({
        open,
        validate: validateDriver,
        onSubmit: async (next) => {
            if (!onSuccess) {
                onOpenChange(false);
                return;
            }
            await onSuccess(next);
        },
        backendFields: DRIVER_BACKEND_FIELDS,
    });

    if (!carrier) return null;

    const bind = (field: DriverField) => ({
        id: `driver-${field}`,
        required: true,
        value: values[field],
        error: errors[field],
        disabled: saving,
        onChange: (next: string) => {
            set(field)(next);
            clearError(field);
        },
    });

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            busy={saving}
            icon={<UserRound size={22} strokeWidth={2} />}
            title={isEdit ? "Editar Chofer" : "Registrar Chofer"}
            description={`Chofer de ${carrier.nombre}.`}
            size="md"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)} disabled={saving}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={() => void submit(values)} disabled={saving} aria-busy={saving}>
                        <Save size={20} strokeWidth={2.5} /> {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar chofer"}
                    </Button>
                </>
            }
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {Boolean(errors._form) && <FormField error={errors._form} className="sm:col-span-2" />}
                <InputField
                    {...bind("nombre")}
                    className="sm:col-span-2"
                    label="Nombre completo"
                    leading={<UserRound />}
                    placeholder="Nombres y apellidos"
                />
                <InputField
                    {...bind("telefono")}
                    label="Teléfono"
                    leading={<Phone />}
                    type="tel"
                    placeholder="987 654 321"
                />
                <InputField
                    {...bind("correo")}
                    label="Correo"
                    leading={<Mail />}
                    type="email"
                    placeholder="chofer@correo.com"
                />
            </div>
        </AppModal>
    );
}
