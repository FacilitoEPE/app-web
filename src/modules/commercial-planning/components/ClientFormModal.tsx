import { X, UserPlus, Save } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import { useModalForm } from "@/shared/hooks/useModalForm";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import FormField from "@/shared/components/FormField";
import InputField from "@/shared/components/InputField";
import SegmentedControl from "@/shared/components/SegmentedControl";
import { Button } from "@/shared/components/ui/button";
import { createClienteNegocio, updateClienteNegocio } from "@/modules/clients/api/cliente-negocio.api";
import type { ClienteNegocioInput } from "@/modules/clients/api/cliente-negocio.dto";
import type { ClienteNegocio } from "@/modules/clients/api/cliente-negocio.mapper";
import { toClienteNegocioInput, validateClienteNegocioInput } from "@/modules/clients/api/cliente-negocio.validation";

const CLIENT_TYPES = [
    { value: "exportador", label: "Exportador" },
    { value: "industria", label: "Industria" },
];

/** Propiedades del backend → campo del formulario (coinciden), para ubicar los errores 400 bajo cada campo */
const BACKEND_FIELDS: Record<string, string> = {
    nombreEmpresa: "nombreEmpresa",
    nombreContacto: "nombreContacto",
    telefono: "telefono",
    ruc: "ruc",
    correoCorporativo: "correoCorporativo",
    ubicacion: "ubicacion",
    tipoCliente: "tipoCliente",
};

const EMPTY_CLIENT: ClienteNegocioInput = {
    nombreEmpresa: "", nombreContacto: "", telefono: "", ruc: "",
    correoCorporativo: "", ubicacion: "", tipoCliente: "" as ClienteNegocioInput["tipoCliente"],
};

interface ClientFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Se llama solo cuando el backend confirmó el guardado */
    onSuccess?: (client: ClienteNegocio) => void;
    mode?: "create" | "edit";
    clientId?: number;
    initialValues?: Partial<ClienteNegocioInput>;
}

/**
 * Alta y edición de un cliente. Los datos van agrupados por afinidad: la empresa (nombre, RUC, tipo) y,
 * debajo, la persona y los medios para contactarla. Si el backend rechaza algo, el mensaje sale bajo su campo.
 */
export default function ClientFormModal({
    open, onOpenChange, onSuccess, mode = "create", clientId, initialValues,
}: ClientFormModalProps) {
    const isEdit = mode === "edit";
    const [values, , set] = useModalForm<ClienteNegocioInput>(open, { ...EMPTY_CLIENT, ...initialValues });
    const { errors, saving, clearError, submit } = useFormSubmit<ClienteNegocioInput>({
        open,
        validate: (current) => validateClienteNegocioInput(toClienteNegocioInput(current)),
        onSubmit: async (current) => {
            const input = toClienteNegocioInput(current);
            const saved = isEdit && clientId ? await updateClienteNegocio(clientId, input) : await createClienteNegocio(input);
            onSuccess?.(saved);
        },
        backendFields: BACKEND_FIELDS,
    });

    const bind = (field: keyof ClienteNegocioInput) => ({
        id: `client-${field}`,
        required: true,
        value: values[field],
        error: errors[field],
        disabled: saving,
        onChange: (next: string) => {
            set(field)(next as never);
            clearError(field);
        },
    });

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            busy={saving}
            icon={<UserPlus size={22} strokeWidth={2} />}
            title={isEdit ? "Editar cliente" : "Registrar cliente"}
            description={isEdit ? "Modifica los datos del cliente." : "Completa los datos para registrar un nuevo cliente."}
            size="md"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)} disabled={saving}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={() => void submit(values)} disabled={saving} aria-busy={saving}>
                        {saving
                            ? "Guardando..."
                            : isEdit
                                ? <><Save size={20} strokeWidth={2.5} /> Guardar cambios</>
                                : <><UserPlus size={20} strokeWidth={2.5} /> Guardar cliente</>}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                {Boolean(errors._form) && <FormField error={errors._form} />}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5" aria-busy={saving}>
                    <InputField {...bind("nombreEmpresa")} label="Empresa" maxLength={255} placeholder="Ej. Exportadora Andina S.A.C." className="sm:col-span-2" />
                    <InputField {...bind("ruc")} label="RUC" maxLength={11} inputMode="numeric" placeholder="11 dígitos" />

                    <FormField label="Tipo de cliente" required error={errors.tipoCliente}>
                        <SegmentedControl
                            options={CLIENT_TYPES}
                            value={values.tipoCliente}
                            onChange={(next) => {
                                if (saving) return;
                                set("tipoCliente")(next as ClienteNegocioInput["tipoCliente"]);
                                clearError("tipoCliente");
                            }}
                        />
                    </FormField>

                    <InputField {...bind("nombreContacto")} label="Nombre de contacto" maxLength={255} placeholder="Nombres y apellidos" />
                    <InputField {...bind("telefono")} label="Teléfono" type="tel" inputMode="tel" maxLength={16} placeholder="Ej. 987654321" />
                    <InputField {...bind("correoCorporativo")} label="Correo corporativo" type="email" inputMode="email" maxLength={320} placeholder="compras@empresa.com" />
                    <InputField {...bind("ubicacion")} label="Ubicación" placeholder="Ej. Piura, Perú" />
                </div>
            </div>
        </AppModal>
    );
}
