import { X, Truck, Save, Building2, UserRound } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import ModalSection from "@/shared/components/ModalSection";
import { useModalForm } from "@/shared/hooks/useModalForm";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import FormField from "@/shared/components/FormField";
import InputField from "@/shared/components/InputField";
import SegmentedControl from "@/shared/components/SegmentedControl";
import UbigeoFields from "@/shared/components/UbigeoFields";
import { Button } from "@/shared/components/ui/button";
import {
    CARRIER_TIPOS,
    CARRIER_TIPO_OPTIONS,
    EMPTY_CARRIER,
    validateCarrier,
    type CarrierField,
    type CarrierFormValues,
    type CarrierTipo,
} from "@/modules/carriers/carrierProfile.utils";
import { CARRIER_BACKEND_FIELDS } from "@/modules/carriers/carrierRecords.utils";

export type { CarrierFormValues };

interface CarrierFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Guarda al transportista; si rechaza con un 400 del backend, sus mensajes salen bajo cada campo */
    onSuccess?: (values: CarrierFormValues) => void | Promise<void>;
    /** "create" arranca vacío; "edit" arranca con `initialValues` y cambia los textos */
    mode?: "create" | "edit";
    initialValues?: Partial<CarrierFormValues>;
}

/**
 * Alta y edición de un transportista. El tipo (público o privado) se elige arriba y decide qué datos se piden:
 * el público es una empresa con su RUC; el independiente, una persona con documento de identidad y CGN.
 */
export default function CarrierFormModal({
    open,
    onOpenChange,
    onSuccess,
    mode = "create",
    initialValues,
}: CarrierFormModalProps) {
    const isEdit = mode === "edit";
    // Al abrir y al cerrar vuelve a los valores de origen: en alta queda vacío, en edición carga al transportista
    const [values, , set] = useModalForm<CarrierFormValues>(open, { ...EMPTY_CARRIER, ...initialValues });
    const { errors, setErrors, saving, clearError, submit } = useFormSubmit<CarrierFormValues>({
        open,
        validate: validateCarrier,
        onSubmit: async (next) => {
            await onSuccess?.(next);
        },
        backendFields: CARRIER_BACKEND_FIELDS,
    });

    const isPrivado = values.tipo === "privado";
    const tipo = CARRIER_TIPOS[values.tipo];

    const bind = (field: CarrierField, required = false) => ({
        id: `carrier-${field}`,
        required,
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
            icon={isPrivado ? <UserRound size={22} strokeWidth={2} /> : <Building2 size={22} strokeWidth={2} />}
            title={isEdit ? "Editar transportista" : "Registrar transportista"}
            description={isEdit
                ? "Modifica los datos del transportista."
                : "Completa los datos para registrar un nuevo transportista."}
            size="lg"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)} disabled={saving}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={() => void submit(values)} disabled={saving} aria-busy={saving}>
                        {isEdit
                            ? <><Save size={20} strokeWidth={2.5} /> {saving ? "Guardando..." : "Guardar cambios"}</>
                            : <><Truck size={20} strokeWidth={2.5} /> {saving ? "Guardando..." : "Guardar transportista"}</>}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6 pt-1 pb-1">
                {Boolean(errors._form) && <FormField error={errors._form} />}

                <FormField label="Tipo de transportista" required hint={tipo.description}>
                    <SegmentedControl
                        options={CARRIER_TIPO_OPTIONS}
                        value={values.tipo}
                        onChange={(next) => {
                            if (saving) return;
                            set("tipo")(next as CarrierTipo);
                            // Los errores del tipo anterior ya no aplican: cada tipo exige campos distintos
                            setErrors({});
                        }}
                    />
                </FormField>

                <ModalSection title={isPrivado ? "Datos personales y registros" : "Datos de la empresa y registros"}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <InputField
                            {...bind("nombre", true)}
                            label={tipo.nameLabel}
                            maxLength={150}
                            placeholder={isPrivado ? "Ej. Juan Pérez Rojas" : "Ej. Transportes Andes S.A.C."}
                            className="sm:col-span-3"
                        />
                        {isPrivado ? (
                            <InputField
                                {...bind("documento", true)}
                                label="Documento de identidad"
                                maxLength={20}
                                inputMode="numeric"
                                placeholder="Ej. 45871236"
                                className="sm:col-span-3"
                            />
                        ) : (
                            <InputField
                                {...bind("ruc", true)}
                                label="RUC"
                                maxLength={11}
                                inputMode="numeric"
                                placeholder="11 dígitos"
                                className="sm:col-span-3"
                            />
                        )}

                        <InputField
                            {...bind("mtc", true)}
                            label="MTC"
                            maxLength={30}
                            placeholder="Registro MTC"
                            className="sm:col-span-3"
                        />
                        {isPrivado ? (
                            <InputField
                                {...bind("cgn", true)}
                                label="CGN"
                                maxLength={30}
                                placeholder="Número de CGN"
                                className="sm:col-span-3"
                            />
                        ) : null}

                        {isPrivado && (
                            <InputField
                                {...bind("ruc")}
                                label="RUC"
                                optional
                                maxLength={11}
                                inputMode="numeric"
                                placeholder="11 dígitos"
                                className="sm:col-span-3"
                            />
                        )}
                    </div>
                </ModalSection>

                <ModalSection title="Información de contacto">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <InputField
                            {...bind("numero", true)}
                            label="Teléfono"
                            type="tel"
                            inputMode="tel"
                            maxLength={20}
                            placeholder="Ej. 987654321"
                            className="sm:col-span-3"
                        />
                        <InputField
                            {...bind("correo", true)}
                            label="Correo electrónico"
                            type="email"
                            inputMode="email"
                            maxLength={120}
                            placeholder="correo@dominio.com"
                            className="sm:col-span-3"
                        />
                    </div>
                </ModalSection>

                <ModalSection title="Ubicación">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <UbigeoFields
                            departamento={bind("departamento", true)}
                            provincia={bind("provincia", true)}
                            distrito={bind("ciudad", true)}
                            distritoLabel="Ciudad"
                            disabled={saving}
                        />
                    </div>
                </ModalSection>
            </div>
        </AppModal>
    );
}
