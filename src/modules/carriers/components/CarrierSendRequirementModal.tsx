import { useState } from "react";
import { X, Send, Truck, Building2, Info } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import ModalSection from "@/shared/components/ModalSection";
import FileDropzone from "@/shared/components/FileDropzone";
import RemovableChip from "@/shared/components/RemovableChip";
import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { FieldDescription } from "@/shared/components/ui/field";
import FormField from "@/shared/components/FormField";
import { Textarea } from "@/shared/components/ui/textarea";
import { Separator } from "@/shared/components/ui/separator";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import type { Carrier } from "@/modules/carriers/carriers.data";
import { usesV1 } from '@/shared/api/data-contract';
import { quotationCommands, requestCampaignOptions } from '@/modules/carriers/api/quotation-commands.api';
import InputField from '@/shared/components/InputField';
import { Combobox } from '@/shared/components/ui/combobox';

const MAX_FILE_MB = 10;
const MAX_DETAIL_LENGTH = 1000;
const ACCEPTED_FILES = ".pdf,.doc,.docx,.xls,.xlsx";

interface CarrierSendRequirementModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    selectedCarriers: Carrier[];
    /** Quita una empresa de la selección desde el propio modal */
    onRemoveCarrier: (id: number) => void;
}

/**
 * Obligatorios: al menos una empresa y el documento del requerimiento (es lo que las empresas tienen que leer).
 * Opcional: el detalle, que solo complementa al documento con fechas o condiciones.
 */
export default function CarrierSendRequirementModal({ open, onOpenChange, onSuccess, selectedCarriers, onRemoveCarrier }: CarrierSendRequirementModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState("");
    const [recipientsError, setRecipientsError] = useState("");
    const [submitError, setSubmitError] = useState("");
    const [saving, setSaving] = useState(false);
    const [detail, setDetail] = useState("");
    const [campaignId,setCampaignId]=useState(''),[reference,setReference]=useState(''),[origin,setOrigin]=useState(''),[destination,setDestination]=useState('');

    useResetOnToggle(open, () => {
        setFile(null);
        setFileError("");
        setRecipientsError("");
        setSubmitError("");
        setDetail("");
        setCampaignId('');setReference(`SOL-${Date.now()}`);setOrigin('');setDestination('');
    });

    const handleFileChange = (next: File | null) => {
        if (next && next.size > MAX_FILE_MB * 1024 * 1024) {
            setFile(null);
            setFileError(`El archivo supera los ${MAX_FILE_MB} MB permitidos.`);
            return;
        }
        setFileError("");
        setFile(next);
    };

    const count = selectedCarriers.length;
    const countLabel = `${count} ${count === 1 ? "empresa" : "empresas"}`;

    // Sin botón desactivado: al enviar, lo que falta se indica bajo su bloque
    const handleSend = async () => {
        const noRecipients = count === 0;
        const noFile = file === null;
        setRecipientsError(noRecipients ? "Selecciona al menos una empresa en la tabla." : "");
        setFileError(noFile ? "Adjunta el documento del requerimiento." : "");
        if (noRecipients || noFile) return;
        setSubmitError("");
        setSaving(true);
        try {
            if(usesV1()) {
                if(!campaignId||!reference.trim()||!origin.trim()||!destination.trim())throw new Error('Completa la campaña, referencia, origen y destino de la solicitud.');
                await quotationCommands.send({campaniaId:Number(campaignId),referencia:reference.trim(),origen:origin.trim(),destino:destination.trim(),mensaje:detail,carrierIds:selectedCarriers.map(c=>c.id),documento:file!});
            }
            onSuccess?.();
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'No se pudo registrar la solicitud.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Send size={22} strokeWidth={2} />}
            title="Enviar requerimiento de transporte"
            description="Registra la solicitud y envía el requerimiento por correo electrónico a las empresas seleccionadas."
            size="lg"
            footer={
                <>
                    <p className="hidden items-center gap-2 text-[13px] font-medium text-ink-muted sm:mr-auto sm:flex">
                        <Info size={16} strokeWidth={2} className="text-brand" />
                        <span>
                            Se enviará a <strong className="font-bold text-ink">{countLabel}</strong> {count === 1 ? "seleccionada" : "seleccionadas"}.
                        </span>
                    </p>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleSend} disabled={saving}>
                        <Send size={20} strokeWidth={2.5} /> {saving ? "Enviando..." : "Enviar requerimiento"}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
                {usesV1()&&<div className="grid gap-4 sm:grid-cols-2"><FormField label="Campaña" required><Combobox options={requestCampaignOptions()} value={campaignId} onChange={setCampaignId} placeholder="Seleccionar campaña" /></FormField><InputField id="solicitud-referencia" label="Referencia" required value={reference} onChange={setReference} /><InputField id="solicitud-origen" label="Origen" required value={origin} onChange={setOrigin} /><InputField id="solicitud-destino" label="Destino" required value={destination} onChange={setDestination} /></div>}
                <div className="flex flex-col gap-4 rounded-2xl border border-brand-border/60 bg-brand-surface p-4 sm:flex-row sm:items-center sm:gap-5">
                    <div className="flex items-center gap-4">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-card text-brand shadow-sm">
                            <Truck size={22} strokeWidth={2} />
                        </span>
                        <div className="flex flex-col">
                            <span className="text-[15px] font-bold text-ink">{countLabel} {count === 1 ? "seleccionada" : "seleccionadas"}</span>
                            <span className="text-[12.5px] font-medium text-ink-muted">Solicitud logística</span>
                        </div>
                    </div>
                    <Separator orientation="vertical" className="hidden bg-brand-border sm:block" />
                    <p className="text-[12.5px] font-medium leading-snug text-ink-muted sm:max-w-64">
                        Se notificará por correo electrónico a las empresas seleccionadas para que puedan revisar y responder tu requerimiento.
                    </p>
                </div>

                <ModalSection title="Empresas destinatarias" aside={<Badge variant="brand" className="h-5 px-2 text-[12px] font-bold">{count}</Badge>}>
                    {count > 0 ? (
                        <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto pr-1">
                            {selectedCarriers.map((carrier) => (
                                <RemovableChip
                                    key={carrier.id}
                                    dot
                                    label={carrier.nombre}
                                    onRemove={() => onRemoveCarrier(carrier.id)}
                                    className="gap-3 rounded-full py-2"
                                />
                            ))}
                        </div>
                    ) : (
                        <FormField error={recipientsError || undefined}>
                            <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-[13px] font-medium text-ink-muted">
                                <Building2 size={18} strokeWidth={2} className="shrink-0" />
                                Selecciona al menos una empresa en la tabla para enviar el requerimiento.
                            </div>
                        </FormField>
                    )}
                </ModalSection>

                <ModalSection title="Documento del requerimiento" aside="Formatos permitidos: PDF, Word o Excel">
                    <FormField error={fileError || undefined}>
                        <FileDropzone
                            label="Documento del requerimiento"
                            required
                            hint={`PDF, Word o Excel · Máx. ${MAX_FILE_MB} MB`}
                            accept={ACCEPTED_FILES}
                            file={file}
                            onChange={handleFileChange}
                        />
                    </FormField>
                </ModalSection>

                <ModalSection title="Detalle del requerimiento" aside="Opcional">
                    <div className="flex flex-col gap-1.5">
                        <Textarea
                            value={detail}
                            maxLength={MAX_DETAIL_LENGTH}
                            onChange={(e) => setDetail(e.target.value)}
                            aria-label="Detalle del requerimiento"
                            placeholder="Describe el requerimiento, fechas, condiciones o instrucciones para las empresas seleccionadas..."
                            className="min-h-28 resize-none rounded-2xl border-border shadow-none placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/30"
                        />
                        <FieldDescription className="text-right text-[12px]">
                            {detail.length.toLocaleString("en-US")}/{MAX_DETAIL_LENGTH.toLocaleString("en-US")}
                        </FieldDescription>
                    </div>
                </ModalSection>
            </div>
        </AppModal>
    );
}
