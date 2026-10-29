import { usesV1 } from '@/shared/api/data-contract';
import { useState } from "react";
import { ShieldCheck, Save, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import InputField from "@/shared/components/InputField";
import { Button } from "@/shared/components/ui/button";
import { useModalForm, useResetOnToggle } from "@/shared/hooks/useModalForm";
import { validateCertificadoProveedorFile } from "@/modules/providers/api/provider-subresources.validation";
import {
    EMPTY_CERTIFICADO,
    validateCertificado,
    type CertificadoErrors,
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
    onSave: (values: CertificadoFormValues, file: File | null) => void;
}

/** Registro y edición de un certificado propio del proveedor: nombre, fecha de revisión SENASA y su documento. */
export default function ProviderCertificadoModal({ open, onOpenChange, providerName, certificate, onSave }: ProviderCertificadoModalProps) {
    const isEdit = certificate !== null;
    const initial: CertificadoFormValues = certificate
        ? { nombre: certificate.nombre, fechaRevisionSenasa: certificate.fechaRevisionSenasa }
        : EMPTY_CERTIFICADO;

    const [values, , set] = useModalForm<CertificadoFormValues>(open, initial);
    const [file, setFile] = useState<File | null>(null);
    const [errors, setErrors] = useState<CertificadoErrors>({});
    const [fileError, setFileError] = useState<string | undefined>();

    useResetOnToggle(open, () => {
        setFile(null);
        setErrors({});
        setFileError(undefined);
    });

    const update = (field: keyof CertificadoFormValues) => (next: string) => {
        set(field)(next);
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const handleSave = async () => {
        const nextErrors = validateCertificado(values);
        // Al registrar el documento es obligatorio; al editar, sin archivo nuevo se conserva el actual
        const nextFileError = file ? validateCertificadoProveedorFile(file) : (isEdit || usesV1()) ? undefined : "Adjunta el documento del certificado.";
        setErrors(nextErrors);
        setFileError(nextFileError);
        if (Object.keys(nextErrors).length > 0 || nextFileError) return;
        await onSave(values, file);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<ShieldCheck size={22} strokeWidth={2} />}
            title={isEdit ? "Editar certificado" : "Registrar certificado"}
            description={providerName}
            size="md"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleSave}>
                        <Save size={20} strokeWidth={2.5} /> Guardar certificado
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
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

                <FormField error={fileError}>
                    <FileDropzone
                        label="Documento del certificado"
                        required
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        hint="PDF, JPG, PNG, WebP · Máx. 10 MB"
                        // Al editar se muestra el documento actual; el lápiz de la tarjeta lo reemplaza
                        file={file ?? certificate?.documento ?? null}
                        replaceable={isEdit}
                        onChange={(next) => { setFile(next); setFileError(undefined); }}
                    />
                </FormField>
            </div>
        </AppModal>
    );
}
