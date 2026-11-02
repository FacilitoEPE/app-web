import { X, Save, UserRound, Phone, Mail } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import ModalSection from "@/shared/components/ModalSection";
import FormField from "@/shared/components/FormField";
import { useModalForm } from "@/shared/hooks/useModalForm";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import InputField from "@/shared/components/InputField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
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

const DOCUMENT_TYPES = [
    { value: "DNI", label: "DNI" },
    { value: "Pasaporte", label: "Pasaporte" },
    { value: "Carnet de extranjeria", label: "Carnet de extranjería" },
];

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
            size="lg"
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
            <div className="flex flex-col gap-6 pt-1 pb-1">
                {Boolean(errors._form) && <FormField error={errors._form} />}

                <ModalSection title="Datos personales e identidad">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InputField
                            {...bind("nombre")}
                            className="sm:col-span-2"
                            label="Nombre completo"
                            placeholder="Nombres y apellidos"
                        />
                        <FormField
                            id="driver-tipoDocumento"
                            label="Tipo de documento"
                            required
                            error={errors.tipoDocumento}
                        >
                            <Select
                                items={DOCUMENT_TYPES}
                                value={values.tipoDocumento || "DNI"}
                                onValueChange={(val) => {
                                    set("tipoDocumento")(val ?? "DNI");
                                    clearError("tipoDocumento");
                                }}
                                disabled={saving}
                            >
                                <SelectTrigger id="driver-tipoDocumento" className="w-full">
                                    <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOCUMENT_TYPES.map((doc) => (
                                        <SelectItem key={doc.value} value={doc.value}>
                                            {doc.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>
                        <InputField
                            {...bind("numeroDocumento")}
                            label="Número de documento"
                            placeholder="Ej. 45871236"
                            maxLength={20}
                            type="text"
                            inputMode={values.tipoDocumento === "DNI" ? "numeric" : "text"}
                        />
                    </div>
                </ModalSection>

                <ModalSection title="Habilitación de conducción">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InputField
                            {...bind("numeroLicencia")}
                            className="sm:col-span-2"
                            label="Número de licencia de conducir"
                            placeholder="Ej. Q45871236"
                            maxLength={20}
                        />
                    </div>
                </ModalSection>

                <ModalSection title="Información de contacto">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InputField
                            {...bind("telefono")}
                            label="Teléfono"
                            leading={<Phone />}
                            type="tel"
                            inputMode="tel"
                            maxLength={20}
                            placeholder="Ej. 987 654 321"
                        />
                        <InputField
                            {...bind("correo")}
                            label="Correo electrónico"
                            leading={<Mail />}
                            type="email"
                            inputMode="email"
                            maxLength={120}
                            placeholder="chofer@correo.com"
                        />
                    </div>
                </ModalSection>
            </div>
        </AppModal>
    );
}
