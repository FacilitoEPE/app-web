import { usesV1 } from '@/shared/api/data-contract';
import { useState } from "react";
import { LandPlot, Save, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import { Button } from "@/shared/components/ui/button";
import { useModalForm, useResetOnToggle } from "@/shared/hooks/useModalForm";
import FruitVarietyPicker from "@/modules/providers/components/FruitVarietyPicker";
import { CATALOGO_FRUTAS } from "@/modules/providers/providerCatalogo";
import {
    EMPTY_FINCA,
    fincaToFormValues,
    toFinca,
    validateFinca,
    validateFincaCultivo,
    type Finca,
    type FincaErrors,
    type FincaField,
    type FincaFormValues,
} from "@/modules/providers/providerFinca.utils";

interface ProviderFincaModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Nombre del proveedor dueño de la finca, se muestra bajo el título */
    providerName: string;
    /** Fincas que el proveedor ya tiene: solo sirven para no permitir repetir un nombre (sin la que se edita) */
    registeredFincas: Finca[];
    /** Finca a editar; sin ella, el modal registra una nueva */
    finca?: Finca | null;
    onSave: (finca: Finca) => void;
}

/**
 * Registro de una finca (lugar de cultivo) del proveedor, en tres bloques de distinta naturaleza: quién es la
 * finca, dónde está y qué se produce en ella. Cada bloque agrupa sus campos en filas de 2 o 3 según su peso.
 */
export default function ProviderFincaModal({ open, onOpenChange, providerName, registeredFincas, finca = null, onSave }: ProviderFincaModalProps) {
    const isEdit = finca !== null;
    const [values, , set] = useModalForm<FincaFormValues>(open, finca ? fincaToFormValues(finca) : EMPTY_FINCA);
    const [errors, setErrors] = useState<FincaErrors>({});

    useResetOnToggle(open, () => setErrors({}));

    const clearError = (field: keyof FincaFormValues) => setErrors((current) => ({ ...current, [field]: undefined }));

    const bind = (field: FincaField, required = false) => ({
        id: `finca-${field}`,
        required,
        value: values[field],
        error: errors[field],
        onChange: (next: string) => {
            set(field)(next);
            clearError(field);
        },
    });

    const handleSave = async () => {
        const nextErrors = { ...validateFinca(values, registeredFincas.map((finca) => finca.nombre), usesV1()), ...validateFincaCultivo(values) };
        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }
        await onSave(toFinca(values));
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<LandPlot size={22} strokeWidth={2} />}
            title={isEdit ? "Editar finca" : "Registrar finca"}
            description={providerName}
            size="xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleSave}>
                        <Save size={20} strokeWidth={2.5} /> {isEdit ? "Guardar cambios" : "Guardar finca"}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <ModalSection title="Identificación de la finca">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <InputField {...bind("nombre", true)} label="Nombre de la finca" maxLength={150} placeholder="Ej. Fundo Tambogrande" className="sm:col-span-6" />
                        <InputField {...bind("codigoSenasa")} label="Código de lugar de producción SENASA" optional maxLength={50} placeholder="Ej. 10452" className="sm:col-span-3" />
                        <InputField {...bind("codigoCatastral")} label="Código catastral" optional maxLength={50} placeholder="Ej. 000123-45" className="sm:col-span-3" />
                    </div>
                </ModalSection>

                <ModalSection title="Ubicación">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <InputField {...bind("departamento", true)} label="Departamento" placeholder="Ej. Piura" className="sm:col-span-2" />
                        <InputField {...bind("provincia", true)} label="Provincia" placeholder="Ej. Sullana" className="sm:col-span-2" />
                        <InputField {...bind("distrito", true)} label="Distrito" placeholder="Ej. Marcavelica" className="sm:col-span-2" />
                        <InputField {...bind("latitud", usesV1())} label="Latitud" optional={!usesV1()} placeholder="-5.1945" step="0.0000001" className="sm:col-span-3" />
                        <InputField {...bind("longitud", usesV1())} label="Longitud" optional={!usesV1()} placeholder="-80.6328" step="0.0000001" className="sm:col-span-3" />
                    </div>
                </ModalSection>

                <ModalSection title="Producción">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <InputField {...bind("haTotal", true)} label="Hectáreas totales" placeholder="0.00" step="0.01" unit="ha" className="sm:col-span-2" />
                        <InputField {...bind("haCultivo", true)} label="Hectáreas de cultivo" placeholder="0.00" step="0.01" unit="ha" className="sm:col-span-2" />
                        <InputField {...bind("edadCultivo")} label="Edad del cultivo" optional placeholder="0" step="0.5" min={0} unit="años" className="sm:col-span-2" />

                        <FormField label="Cultivos y variedades" required error={errors.cultivos} className="sm:col-span-6">
                            <FruitVarietyPicker
                                fruits={CATALOGO_FRUTAS}
                                value={values.cultivos}
                                onChange={(next) => { set("cultivos")(next); clearError("cultivos"); }}
                                invalid={Boolean(errors.cultivos)}
                            />
                        </FormField>
                    </div>
                </ModalSection>
            </div>
        </AppModal>
    );
}
