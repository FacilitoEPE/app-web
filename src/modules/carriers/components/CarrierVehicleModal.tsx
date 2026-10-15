import { X, Save, Truck } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import { useModalForm } from "@/shared/hooks/useModalForm";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import InputField from "@/shared/components/InputField";
import { Button } from "@/shared/components/ui/button";
import type { Carrier } from "@/modules/carriers/carriers.data";
import {
    EMPTY_VEHICLE,
    VEHICLE_BACKEND_FIELDS,
    validateVehicle,
    type VehicleField,
    type VehicleFormValues,
} from "@/modules/carriers/carrierRecords.utils";

export type { VehicleFormValues };

interface CarrierVehicleModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Guarda el vehículo; si rechaza con un 400 del backend, sus mensajes salen bajo cada campo */
    onSuccess?: (values: VehicleFormValues) => void | Promise<void>;
    carrier: Carrier | null;
    /** "create" arranca vacío; "edit" arranca con `initialValues` y cambia los textos */
    mode?: "create" | "edit";
    initialValues?: Partial<VehicleFormValues>;
}

export default function CarrierVehicleModal({ open, onOpenChange, onSuccess, carrier, mode = "create", initialValues }: CarrierVehicleModalProps) {
    const isEdit = mode === "edit";
    const [values, , set] = useModalForm<VehicleFormValues>(open, { ...EMPTY_VEHICLE, ...initialValues });
    const { errors, saving, clearError, submit } = useFormSubmit<VehicleFormValues>({
        open,
        validate: validateVehicle,
        onSubmit: async (next) => {
            if (!onSuccess) {
                onOpenChange(false);
                return;
            }
            await onSuccess(next);
        },
        backendFields: VEHICLE_BACKEND_FIELDS,
    });

    if (!carrier) return null;

    const bind = (field: VehicleField) => ({
        id: `vehicle-${field}`,
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
            icon={<Truck size={22} strokeWidth={2} />}
            title={isEdit ? "Editar Vehículo" : "Registrar Vehículo"}
            description={`Datos técnicos del vehículo de ${carrier.nombre}.`}
            size="lg"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)} disabled={saving}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={() => void submit(values)} disabled={saving} aria-busy={saving}>
                        <Save size={20} strokeWidth={2.5} /> {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar vehículo"}
                    </Button>
                </>
            }
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-6 sm:gap-5">
                {Boolean(errors._form) && <FormField error={errors._form} className="sm:col-span-6" />}

                <InputField
                    {...bind("placa")}
                    label="Placa"
                    placeholder="ABC-123"
                    maxLength={8}
                    onChange={(value) => {
                        set("placa")(value.toUpperCase());
                        clearError("placa");
                    }}
                    inputClassName="uppercase"
                    className="sm:col-span-3"
                />
                <InputField {...bind("volumen")} label="Volumen" unit="m³" step="any" min={0} placeholder="0.00" className="sm:col-span-3" />

                <InputField {...bind("ancho")} label="Ancho" unit="m" step="any" min={0} placeholder="0.00" className="sm:col-span-2" />
                <InputField {...bind("altura")} label="Altura" unit="m" step="any" min={0} placeholder="0.00" className="sm:col-span-2" />
                <InputField {...bind("profundidad")} label="Profundidad" unit="m" step="any" min={0} placeholder="0.00" className="sm:col-span-2" />

                <InputField {...bind("pesoNeto")} label="Peso neto" unit="t" step="any" min={0} placeholder="0.00" className="sm:col-span-3" />
                <InputField {...bind("pesoBruto")} label="Peso bruto" unit="t" step="any" min={0} placeholder="0.00" className="sm:col-span-3" />
            </div>
        </AppModal>
    );
}
