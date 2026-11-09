import { usesV1 } from '@/shared/api/data-contract';
import { LandPlot, Save, X } from "lucide-react";
import { useState } from "react";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import UbigeoFields from "@/shared/components/UbigeoFields";
import { Button } from "@/shared/components/ui/button";
import { useModalForm, useResetOnToggle } from "@/shared/hooks/useModalForm";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import FruitVarietyPicker from "@/modules/providers/components/FruitVarietyPicker";
import { CATALOGO_FRUTAS } from "@/modules/providers/providerCatalogo";
import {
    EMPTY_FINCA,
    fincaToFormValues,
    toFinca,
    validateFinca,
    validateFincaCultivo,
    type Finca,
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
    onSave: (finca: Finca) => void | Promise<void>;
}

/**
 * Registro de una finca (lugar de cultivo) del proveedor, en tres bloques de distinta naturaleza: quién es la
 * finca, dónde está y qué se produce en ella. Cada bloque agrupa sus campos en filas de 2 o 3 según su peso.
 */
export default function ProviderFincaModal({ open, onOpenChange, providerName, registeredFincas, finca = null, onSave }: ProviderFincaModalProps) {
    const isEdit = finca !== null;
    const [showMap, setShowMap] = useState(false);
    useResetOnToggle(open, () => setShowMap(false));
    const [values, , set] = useModalForm<FincaFormValues>(open, finca ? fincaToFormValues(finca) : EMPTY_FINCA);
    const { errors, saving, clearError, submit } = useFormSubmit<FincaFormValues>({
        open,
        validate: current => ({
            ...validateFinca(current, registeredFincas.map(item => item.nombre), usesV1()),
            ...validateFincaCultivo(current),
        }),
        onSubmit: current => onSave(toFinca(current)),
        backendFields: {
            nombreFinca: "nombre", codigoLugarProduccion: "codigoSenasa", codigoCatastral: "codigoCatastral",
            departamento: "departamento", provincia: "provincia", distrito: "distrito",
            latitud: "latitud", longitud: "longitud", haTotalFinca: "haTotal", haCultivo: "haCultivo",
        },
    });

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
    const lat = Number(values.latitud);
    const lng = Number(values.longitud);
    const canShowMap = Boolean(values.latitud.trim() && values.longitud.trim()) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02},${lat - 0.02},${lng + 0.02},${lat + 0.02}&layer=mapnik&marker=${lat},${lng}`;

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            busy={saving}
            icon={<LandPlot size={22} strokeWidth={2} />}
            title={isEdit ? "Editar finca" : "Registrar finca"}
            description={providerName}
            size="xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" disabled={saving} onClick={() => submit(values)}>
                        <Save size={20} strokeWidth={2.5} /> {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Guardar finca"}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                {errors._form && <FormField error={errors._form} />}
                <ModalSection title="Identificación de la finca">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <InputField {...bind("nombre", true)} label="Nombre de la finca" maxLength={150} placeholder="Ej. Fundo Tambogrande" className="sm:col-span-6" />
                        <InputField {...bind("codigoSenasa")} label="Código de lugar de producción SENASA" optional maxLength={50} placeholder="Ej. 10452" className="sm:col-span-3" />
                        <InputField {...bind("codigoCatastral")} label="Código catastral" optional maxLength={50} placeholder="Ej. 000123-45" className="sm:col-span-3" />
                    </div>
                </ModalSection>

                <ModalSection title="Ubicación">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                        <UbigeoFields
                            departamento={bind("departamento", true)}
                            provincia={bind("provincia", true)}
                            distrito={bind("distrito", true)}
                            className="sm:col-span-2"
                            disabled={saving}
                        />
                        <InputField {...bind("latitud", usesV1())} label="Latitud" optional={!usesV1()} placeholder="-5.1945" step="0.0000001" className="sm:col-span-3" />
                        <InputField {...bind("longitud", usesV1())} label="Longitud" optional={!usesV1()} placeholder="-80.6328" step="0.0000001" className="sm:col-span-3" />
                        {canShowMap && (
                            <div className="space-y-3 sm:col-span-6">
                                <Button type="button" variant="outline" aria-expanded={showMap} onClick={() => setShowMap(value => !value)}>
                                    {showMap ? "Ocultar mapa" : "Ver ubicación en el mapa"}
                                </Button>
                                {showMap && <iframe title="Ubicación de la finca" src={mapUrl} className="h-56 w-full rounded-xl border" loading="lazy" />}
                            </div>
                        )}
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
