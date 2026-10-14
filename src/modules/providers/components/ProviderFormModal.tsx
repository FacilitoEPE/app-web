import { useState } from "react";
import { Save, UserPlus, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import { useModalForm, useResetOnToggle } from "@/shared/hooks/useModalForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import type { ProveedorFormValues, ProveedorInput, TipoDocumentoProveedor } from "@/modules/providers/api/proveedor.dto";
import type { Proveedor } from "@/modules/providers/api/proveedor.mapper";
import type { ProveedorField, ProveedorFieldErrors } from "@/modules/providers/api/proveedor.validation";
import FruitVarietyPicker from "@/modules/providers/components/FruitVarietyPicker";
import { CATALOGO_FRUTAS, toCultivos, toFrutasProveedor } from "@/modules/providers/providerCatalogo";
import { saveProduccion, useProviderLocalData } from "@/modules/providers/providerLocalData.store";
import { validateProveedorInput } from "@/modules/providers/api/proveedor.validation";
import { createProviderFormSession } from "@/modules/providers/api/provider-lifecycle";
import { submitValidatedProveedor } from "@/modules/providers/api/proveedor-submission";
import { createInFlightGuard } from "@/shared/utils/inFlightGuard";
import FileDropzone from "@/shared/components/FileDropzone";
import { uploadDocument } from "@/shared/api/uploadDocument";

const DOCUMENT_TYPES = [
    { value: "DNI", label: "DNI" },
    { value: "Pasaporte", label: "Pasaporte" },
    { value: "Carnet de extranjeria", label: "Carnet de extranjería" },
];

const SANIDAD_TYPES = [
    { value: "Sin registrar", label: "Sin registrar" },
    { value: "Registrado", label: "Registrado" },
    { value: "En proceso", label: "En proceso" },
];

interface ProviderFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode?: "create" | "edit";
    provider?: Proveedor | null;
    mutationGuard: ReturnType<typeof createInFlightGuard>;
    onSave: (providerId: number | null, input: ProveedorInput) => Promise<Proveedor>;
}

export default function ProviderFormModal({ open, onOpenChange, mode = "create", provider, mutationGuard, onSave }: ProviderFormModalProps) {
    const isEdit = mode === "edit";
    // Las frutas todavía no las guarda el backend: se leen y se guardan en el almacén local que muestra el detalle
    const { produccion } = useProviderLocalData();
    const local = provider ? produccion[provider.proveedorId] : undefined;
    const session = createProviderFormSession(provider).values;
    const [values, , set] = useModalForm(open, {
        ...session,
        estadoSanidadAgraria: session.estadoSanidadAgraria || local?.estadoSanidad || "",
        frutas: toFrutasProveedor((local?.frutas ?? []).map(({ nombre, variedades }) => ({ fruta: nombre, variedades }))),
    });
    const [errors, setErrors] = useState<ProveedorFieldErrors>({});
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useResetOnToggle(open, () => {
        setErrors({});
        setSaveError(null);
    });

    const updateField = <Field extends ProveedorField>(field: Field, value: ProveedorFormValues[Field]) => {
        set(field)(value);
        setErrors((current) => ({ ...current, [field]: undefined }));
        setSaveError(null);
    };

    const handleSubmit = async () => {
        try {
            const result = await submitValidatedProveedor(
                values, 
                validateProveedorInput, 
                mutationGuard, 
                async (input) => {
                    let urlToSave = input.identidadDocUrl;
                    if (values.identidadDocArchivo) {
                        urlToSave = await uploadDocument(values.identidadDocArchivo);
                    }
                    const saved = await onSave(provider?.proveedorId ?? null, { ...input, identidadDocUrl: urlToSave });
                    // TODO(api): las frutas y el estado de sanidad pasan al backend cuando el proveedor los modele
                    saveProduccion(saved.proveedorId, {
                        estadoSanidad: values.estadoSanidadAgraria || "Sin registrar",
                        frutas: toCultivos(values.frutas ?? []).map(({ fruta, variedades }) => ({ nombre: fruta, variedades })),
                    });
                    return saved;
                }, 
                () => {
                    setIsSaving(true);
                    setErrors({});
                    setSaveError(null);
                }
            );
            if (result.status === "invalid") setErrors(result.errors);
            if (result.status === "saved") onOpenChange(false);
        } catch {
            setSaveError("No se pudieron guardar los cambios. Revisa la información e intenta nuevamente.");
        } finally {
            setIsSaving(false);
        }
    };

    /** Props comunes de un campo de texto del formulario: id, valor, error y cambio enlazados al estado */
    const bind = (field: ProveedorField) => ({
        id: `provider-${field}`,
        required: true,
        value: (values[field] as string) ?? "",
        error: errors[field],
        disabled: isSaving,
        onChange: (next: string) => updateField(field, next),
    });

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            busy={isSaving}
            icon={<UserPlus size={22} strokeWidth={2} />}
            title={isEdit ? "Editar proveedor" : "Registrar proveedor"}
            description={isEdit ? "Modifica los datos del proveedor." : "Completa la información para registrar un nuevo proveedor."}
            size="xl"
            footer={
                <>
                    <Button variant="outline" size="xl" disabled={isSaving} onClick={() => onOpenChange(false)}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" disabled={isSaving} onClick={handleSubmit} aria-busy={isSaving}>
                        {isEdit
                            ? <><Save size={20} strokeWidth={2.5} /> {isSaving ? "Guardando..." : "Guardar cambios"}</>
                            : <><UserPlus size={20} strokeWidth={2.5} /> {isSaving ? "Creando..." : "Crear proveedor"}</>}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6 pt-1 pb-3">
                <ModalSection title="Datos personales">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <InputField {...bind("nombres")} label="Nombres" maxLength={150} placeholder="Ej. Juan" />
                        <InputField {...bind("apellido")} label="Apellidos" maxLength={150} placeholder="Ej. Pérez García" />
                        <InputField {...bind("telefono")} label="Teléfono" type="tel" inputMode="numeric" placeholder="Ej. 987654321" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField {...bind("email")} label="Correo electrónico" type="email" maxLength={320} placeholder="correo@ejemplo.com" />
                        <InputField {...bind("zona")} label="Zona / Región" placeholder="Ej. Piura, Valle de los Incas" />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                        <FormField id="provider-tipoDocumento" label="Tipo de documento" required className="sm:col-span-3" error={errors.tipoDocumento}>
                            <Select items={DOCUMENT_TYPES} value={(values.tipoDocumento as string) || null} onValueChange={(value) => updateField("tipoDocumento", (value ?? "") as TipoDocumentoProveedor | "")} disabled={isSaving}>
                                <SelectTrigger
                                    id="provider-tipoDocumento"
                                    className="w-full"
                                    aria-invalid={errors.tipoDocumento ? true : undefined}
                                    aria-describedby={errors.tipoDocumento ? "provider-tipoDocumento-error" : undefined}
                                >
                                    <SelectValue placeholder="Selecciona..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOCUMENT_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FormField>
                        <InputField {...bind("nmrDocumento")} label="Número de documento" className="sm:col-span-3" step="1" min={1} inputMode="numeric" placeholder="12345678" />
                        <FormField className="sm:col-span-6" error={errors.identidadDocArchivo}>
                            <FileDropzone
                                variant="horizontal"
                                label="Adjunto de identidad"
                                hint="PDF o Imagen · Máx. 10 MB"
                                file={values.identidadDocArchivo ?? null}
                                onChange={(file) => updateField("identidadDocArchivo", file)}
                                disabled={isSaving}
                            />
                        </FormField>
                    </div>
                </ModalSection>

                <ModalSection title="Información productiva">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField {...bind("codigoLugarProduccion")} label="Código de lugar de producción" step="1" min={1} inputMode="numeric" placeholder="Ej. 10452" />
                        <FormField id="provider-estadoSanidad" label="Estado de sanidad agraria" required error={errors.estadoSanidadAgraria}>
                            <Select items={SANIDAD_TYPES} value={(values.estadoSanidadAgraria as string) || null} onValueChange={(value) => updateField("estadoSanidadAgraria", value ?? "")} disabled={isSaving}>
                                <SelectTrigger
                                    id="provider-estadoSanidad"
                                    className="w-full"
                                    aria-invalid={errors.estadoSanidadAgraria ? true : undefined}
                                >
                                    <SelectValue placeholder="Seleccionar estado..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {SANIDAD_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FormField>
                    </div>
                    <FormField label="Frutas y variedades" hint="Agrega las frutas que trabaja el proveedor y marca sus variedades.">
                        <FruitVarietyPicker
                            fruits={CATALOGO_FRUTAS}
                            value={toCultivos(values.frutas ?? [])}
                            onChange={(next) => updateField("frutas", toFrutasProveedor(next))}
                            disabled={isSaving}
                            varietiesHint="Marca las que produce el proveedor"
                        />
                    </FormField>
                </ModalSection>

                {/* Error general del formulario (no de un campo); solo se dibuja si existe */}
                {saveError && <FormField error={saveError} />}
            </div>
        </AppModal>
    );
}
