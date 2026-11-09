import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Eye, Pencil, Save, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone, { type StoredFile } from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import InputField from "@/shared/components/InputField";
import { InfoField } from "@/shared/components/InfoField";
import { Button } from "@/shared/components/ui/button";
import { getUploadErrorMessage, uploadDocument } from "@/shared/api/uploadDocument";
import { formatFecha } from "@/modules/campaigns/api/fecha.util";
import { updateClienteNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.api";
import type { ClienteNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.mapper";
import {
    createCampaignMutationGuard,
    hasCampaignClientChanges,
    toCampaignClientUpdatePayload,
    validateCampaignClientUpdate,
    type CampaignClientFieldErrors,
    type CampaignClientUpdateValues,
} from "@/modules/campaigns/api/campaign-mutations.validation";

type DocumentField = "documentoUrl" | "fichaTecnicaUrl";
type DocumentFiles = Record<DocumentField, File | null>;
const NO_FILES: DocumentFiles = { documentoUrl: null, fichaTecnicaUrl: null };

function storedFile(url: string, fallbackName: string): StoredFile {
    const rawName = url.split("?")[0].split("/").filter(Boolean).at(-1);
    return { name: rawName ? decodeURIComponent(rawName) : fallbackName, url };
}

function toValues(client: ClienteNegocioCampana): CampaignClientUpdateValues {
    return {
        documentoUrl: client.documentoUrl,
        fichaTecnicaUrl: client.fichaTecnicaUrl,
        fechaRegistro: formatFecha(client.fechaRegistro),
        cantidadKg: String(client.cantidadKg),
        kilosAcordados: String(client.kilosAcordados),
    };
}

interface CampaignClientRecordModalProps {
    open: boolean;
    mode: "view" | "edit";
    client: ClienteNegocioCampana | null;
    campaniaId: number;
    onOpenChange: (open: boolean) => void;
    onSaved: (client: ClienteNegocioCampana) => void;
}

/** Consulta o edita el vínculo con la campaña; la ficha global del cliente no se modifica aquí. */
export default function CampaignClientRecordModal({ open, mode, client, campaniaId, onOpenChange, onSaved }: CampaignClientRecordModalProps) {
    const [values, setValues] = useState<CampaignClientUpdateValues | null>(null);
    const [files, setFiles] = useState<DocumentFiles>(NO_FILES);
    const [errors, setErrors] = useState<CampaignClientFieldErrors>({});
    const [formMessage, setFormMessage] = useState<string>();
    const [isSaving, setIsSaving] = useState(false);
    const guard = useRef(createCampaignMutationGuard());

    useEffect(() => {
        if (!open || !client) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setValues(toValues(client));
        setFiles(NO_FILES);
        setErrors({});
        setFormMessage(undefined);
    }, [open, client]);

    const update = (field: keyof CampaignClientUpdateValues, value: string) => {
        setValues((current) => current ? { ...current, [field]: value } : current);
        setErrors((current) => ({ ...current, [field]: undefined }));
        setFormMessage(undefined);
    };

    const save = async () => {
        if (!client || !values || !guard.current.acquire()) return;
        const original = toValues(client);
        const nextErrors = validateCampaignClientUpdate(values, original);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) { guard.current.release(); return; }
        if (!hasCampaignClientChanges(values, original) && !files.documentoUrl && !files.fichaTecnicaUrl) {
            setFormMessage("No hay cambios para guardar.");
            guard.current.release();
            return;
        }
        setIsSaving(true);
        setFormMessage(undefined);
        try {
            const next = { ...values };
            try {
                if (files.documentoUrl) next.documentoUrl = await uploadDocument(files.documentoUrl, 'campanas/documentos-cliente');
                if (files.fichaTecnicaUrl) next.fichaTecnicaUrl = await uploadDocument(files.fichaTecnicaUrl, 'campanas/fichas-tecnicas-cliente');
            } catch (error) {
                setFormMessage(getUploadErrorMessage(error));
                return;
            }
            const updated = await updateClienteNegocioCampana(campaniaId, client.clienteNegocioCampanaId, toCampaignClientUpdatePayload(next));
            onSaved({ ...updated, clienteNegocio: updated.clienteNegocio ?? client.clienteNegocio });
        } catch {
            setFormMessage("No se pudo actualizar el vínculo. Inténtalo nuevamente.");
        } finally {
            guard.current.release();
            setIsSaving(false);
        }
    };

    const name = client?.clienteNegocio?.nombreEmpresa ?? "Cliente";
    const viewOnly = mode === "view";
    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            busy={isSaving}
            icon={viewOnly ? <Eye size={22} /> : <Pencil size={22} />}
            title={viewOnly ? "Detalle del vínculo" : "Editar vínculo con cliente"}
            description={`${name} · Campaña de exportación`}
            size="lg"
            footer={viewOnly ? <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}><X size={20} strokeWidth={2.5} /> Cerrar</Button> : (
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)} disabled={isSaving}><X size={18} /> Cancelar</Button>
                    <Button size="xl" onClick={() => void save()} disabled={isSaving || !values} aria-busy={isSaving}><Save size={18} /> {isSaving ? "Guardando..." : "Guardar cambios"}</Button>
                </>
            )}
        >
            {client && (viewOnly ? (
                // Solo los datos con los que se vinculó a la campaña; la ficha del cliente vive en Gestión comercial
                <div className="grid gap-4 sm:grid-cols-3">
                    <InfoField label="Cantidad requerida" value={client.cantidadKg} suffix="kg" />
                    <InfoField label="Kilos acordados" value={client.kilosAcordados} suffix="kg" />
                    <InfoField label="Fecha de registro" value={format(client.fechaRegistro, "dd/MM/yyyy")} />
                    <div className="grid gap-4 sm:col-span-3 sm:grid-cols-2">
                        <FileDropzone label="Requerimientos" variant="horizontal" file={storedFile(client.documentoUrl, "Requerimientos del cliente")} readOnly onChange={() => undefined} />
                        <FileDropzone label="Ficha técnica" variant="horizontal" file={storedFile(client.fichaTecnicaUrl, "Ficha técnica del cliente")} readOnly onChange={() => undefined} />
                    </div>
                </div>
            ) : values && (
                <div className="flex flex-col gap-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <InputField id="client-link-cantidad" label="Cantidad requerida" value={values.cantidadKg} error={errors.cantidadKg} step="0.001" min={0} unit="kg" disabled={isSaving} onChange={(value) => update("cantidadKg", value)} />
                        <InputField id="client-link-acordados" label="Kilos acordados" value={values.kilosAcordados} error={errors.kilosAcordados} step="0.001" min={0} unit="kg" disabled={isSaving} onChange={(value) => update("kilosAcordados", value)} />
                        <InputField id="client-link-fecha" label="Fecha de registro" type="date" value={values.fechaRegistro} error={errors.fechaRegistro} disabled={isSaving} onChange={(value) => update("fechaRegistro", value)} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField error={errors.documentoUrl}>
                            <FileDropzone label="Requerimientos" hint="Opcional: reemplaza el archivo actual" file={files.documentoUrl ?? storedFile(client.documentoUrl, "Requerimientos del cliente")} replaceable onChange={(file) => { setFiles((current) => ({ ...current, documentoUrl: file })); setFormMessage(undefined); }} />
                        </FormField>
                        <FormField error={errors.fichaTecnicaUrl}>
                            <FileDropzone label="Ficha técnica" hint="Opcional: reemplaza el archivo actual" file={files.fichaTecnicaUrl ?? storedFile(client.fichaTecnicaUrl, "Ficha técnica del cliente")} replaceable onChange={(file) => { setFiles((current) => ({ ...current, fichaTecnicaUrl: file })); setFormMessage(undefined); }} />
                        </FormField>
                    </div>
                    {formMessage && <FormField error={formMessage} />}
                </div>
            ))}
        </AppModal>
    );
}
