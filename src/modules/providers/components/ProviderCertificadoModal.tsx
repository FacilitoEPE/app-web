import { useState } from "react";
import { ShieldCheck, Save, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import InputField from "@/shared/components/InputField";
import { Button } from "@/shared/components/ui/button";
import { useModalForm, useResetOnToggle } from "@/shared/hooks/useModalForm";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import { validateCertificadoProveedorFile } from "@/modules/providers/api/provider-subresources.validation";
import {
    EMPTY_CERTIFICADO,
    validateCertificado,
    type CertificadoFormValues,
    type CertificadoLocal,
} from "@/modules/providers/providerCertificado.utils";

interface ProviderCertificadoModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Nombre del proveedor dueño del certificado, se muestra bajo el título */
    providerName: string;
    /** Certificado a editar; sin él, el modal registra uno nuevo */
    certificate: CertificadoLocal | null;
    /** Al editar, `file` es null si no se cambió el documento */
    onSave: (values: CertificadoFormValues, file: File | null) => void | Promise<void>;
}

/** Registro y edición de un certificado propio del proveedor: nombre, fecha de revisión SENASA y su documento. */
export default function ProviderCertificadoModal({ open, onOpenChange, providerName, certificate, onSave }: ProviderCertificadoModalProps) {
    const isEdit = certificate !== null;
    const initial: CertificadoFormValues = certificate
        ? { nombre: certificate.nombre, fechaRevisionSenasa: certificate.fechaRevisionSenasa }
        : EMPTY_CERTIFICADO;

    const [values, , set] = useModalForm<CertificadoFormValues>(open, initial);
    const [file, setFile] = useState<File | null>(null);
    useResetOnToggle(open, () => setFile(null));
    const { errors, saving, clearError, submit } = useFormSubmit<CertificadoFormValues>({
        open,
        validate: current => {
            const fileError = file ? validateCertificadoProveedorFile(file) : certificate?.documento ? undefined : "Adjunta el documento del certificado.";
            return { ...validateCertificado(current), ...(fileError ? { documento: fileError } : {}) };
        },
        onSubmit: current => onSave(current, file),
        backendFields: { nombre: "nombre", fechaRevisionSenasa: "fechaRevisionSenasa", documentoUrl: "documento" },
    });

    const update = (field: keyof CertificadoFormValues) => (next: string) => {
        set(field)(next);
        clearError(field);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            busy={saving}
            icon={<ShieldCheck size={22} strokeWidth={2} />}
            title={isEdit ? "Editar certificado" : "Registrar certificado"}
            description={providerName}
            size="md"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" disabled={saving} onClick={() => submit(values)}>
                        <Save size={20} strokeWidth={2.5} /> {saving ? "Guardando…" : "Guardar certificado"}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                {errors._form && <FormField error={errors._form} />}
                <InputField
                    id="certificado-nombre"
                    label="Nombre del certificado"
                    required
                    maxLength={255}
                    placeholder="Ej. Certificado SENASA"
                    value={values.nombre}
                    error={errors.nombre}
                    onChange={update("nombre")}
                />

                <InputField
                    id="certificado-fecha"
                    type="date"
                    label="Fecha de revisión SENASA"
                    required
                    value={values.fechaRevisionSenasa}
                    error={errors.fechaRevisionSenasa}
                    onChange={update("fechaRevisionSenasa")}
                />

                <FormField error={errors.documento}>
                    <FileDropzone
                        label="Documento del certificado"
                        required
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        hint="PDF, JPG, PNG, WebP · Máx. 10 MB"
                        // Al editar se muestra el documento actual; el lápiz de la tarjeta lo reemplaza
                        file={file ?? certificate?.documento ?? null}
                        replaceable={isEdit}
                        onChange={(next) => { setFile(next); clearError("documento"); }}
                    />
                </FormField>
            </div>
        </AppModal>
    );
}
