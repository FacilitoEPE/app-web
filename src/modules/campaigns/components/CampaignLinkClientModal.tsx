import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Link2, Save, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import ChipSelect from "@/shared/components/ChipSelect";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { InfoField } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import { Button } from "@/shared/components/ui/button";
import { Combobox } from "@/shared/components/ui/combobox";
import { Textarea } from "@/shared/components/ui/textarea";
import { getClientesNegocio } from "@/modules/clients/api/cliente-negocio.api";
import { getCampanas, getFrutaDerivadas } from "@/modules/campaigns/api/campaign.api";
import { getClientesNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.api";
import type { ClienteNegocio } from "@/modules/clients/api/cliente-negocio.mapper";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";
import type { FrutaDerivadaDto } from "@/modules/campaigns/api/campaign.dto";
import { usesV1 } from '@/shared/api/data-contract';
import { campaignCommands } from '@/modules/campaigns/api/campaign-commands.api';

interface CampaignLinkClientModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Finaliza únicamente el borrador visual; la conexión de guardado queda pendiente del nuevo contrato. */
    onSave?: () => void;
    campaniaId?: number | null;
    campaign?: Campana | null;
    cliente?: ClienteNegocio | null;
}

interface ClientParticipationDraft {
    clienteNegocioId: string;
    cantidadKg: string;
    fechaRegistro: string;
    variedades: string[];
    destinoSolicitado: string;
    entregaDesde: string;
    entregaHasta: string;
    observaciones: string;
}

type DraftErrors = Partial<Record<keyof ClientParticipationDraft | "campaign" | "fichaTecnica", string>>;

const emptyDraft = (clienteNegocioId = ""): ClientParticipationDraft => ({
    clienteNegocioId,
    cantidadKg: "",
    fechaRegistro: format(new Date(), "yyyy-MM-dd"),
    variedades: [],
    destinoSolicitado: "",
    entregaDesde: "",
    entregaHasta: "",
    observaciones: "",
});

const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
    planificacion: "Planificada",
    "en proceso": "En ejecución",
    terminado: "Terminada",
};

/**
 * Borrador visual de la futura participación comercial cliente-campaña.
 * TODO(api): conectar el guardado cuando el backend incorpore variedades, destino y ventana de entrega.
 */
export default function CampaignLinkClientModal({ open, onOpenChange, onSave, campaniaId = null, campaign = null, cliente = null }: CampaignLinkClientModalProps) {
    const isClientContext = cliente !== null;
    const [draft, setDraft] = useState<ClientParticipationDraft>(emptyDraft);
    const [fichaTecnica, setFichaTecnica] = useState<File | null>(null);
    const [errors, setErrors] = useState<DraftErrors>({});
    const [formError, setFormError] = useState<string>();
    const [clientes, setClientes] = useState<ClienteNegocio[]>([]);
    const [campanas, setCampanas] = useState<Campana[]>([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState("");
    const [linkedClientIds, setLinkedClientIds] = useState<Set<number>>(new Set());
    const [variedades, setVariedades] = useState<FrutaDerivadaDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const selectedCampaign = campaign ?? campanas.find((item) => item.campaniaId === Number(selectedCampaignId)) ?? null;

    useEffect(() => {
        if (!open) return;
        let active = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft(emptyDraft(cliente ? String(cliente.clienteNegocioId) : ""));
        setFichaTecnica(null);
        setErrors({});
        setFormError(undefined);
        setSelectedCampaignId(campaniaId ? String(campaniaId) : "");
        setVariedades([]);
        setIsLoading(true);

        const request = isClientContext
            ? getCampanas().then((items) => { if (active) setCampanas(items.filter((item) => item.estado !== "terminado")); })
            : Promise.all([
                getClientesNegocio(),
                campaniaId ? getClientesNegocioCampana(campaniaId) : Promise.resolve([]),
            ]).then(([catalog, linked]) => {
                if (!active) return;
                setClientes(catalog);
                setLinkedClientIds(new Set(linked.map((item) => item.clienteNegocioId)));
            });

        request
            .catch(() => { if (active) setFormError("No se pudieron cargar los selectores del formulario."); })
            .finally(() => { if (active) setIsLoading(false); });
        return () => { active = false; };
    }, [open, campaniaId, cliente, isClientContext]);

    useEffect(() => {
        if (!open || !selectedCampaign) return;
        let active = true;
        getFrutaDerivadas(selectedCampaign.frutaId)
            .then((items) => { if (active) setVariedades(items); })
            .catch(() => { if (active) setVariedades([]); });
        return () => { active = false; };
    }, [open, selectedCampaign]);

    const clientOptions = useMemo(() => clientes
        .filter((item) => usesV1() || !linkedClientIds.has(item.clienteNegocioId))
        .map((item) => ({ value: String(item.clienteNegocioId), label: item.nombreEmpresa })), [clientes, linkedClientIds]);

    const campaignOptions = useMemo(() => campanas.map((item) => ({
        value: String(item.campaniaId),
        label: `${item.nombre} · ${CAMPAIGN_STATUS_LABEL[item.estado] ?? item.estado}`,
    })), [campanas]);

    const update = <K extends keyof ClientParticipationDraft>(field: K, value: ClientParticipationDraft[K]) => {
        setDraft((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
        setFormError(undefined);
    };

    const validate = (): DraftErrors => {
        const next: DraftErrors = {};
        if (!draft.clienteNegocioId) next.clienteNegocioId = "Selecciona un cliente.";
        if (!selectedCampaign) next.campaign = "Selecciona una campaña antes de continuar.";
        if (!draft.cantidadKg.trim() || Number(draft.cantidadKg) <= 0) next.cantidadKg = "Ingresa una cantidad mayor que cero.";
        if (!usesV1() && !fichaTecnica) next.fichaTecnica = "Adjunta la ficha técnica.";
        if (draft.variedades.length === 0) next.variedades = "Selecciona al menos una variedad.";
        if (!draft.destinoSolicitado.trim()) next.destinoSolicitado = "Ingresa el destino solicitado.";
        if (!draft.entregaDesde) next.entregaDesde = "Selecciona la fecha inicial.";
        if (!draft.entregaHasta) next.entregaHasta = "Selecciona la fecha final.";
        if (draft.entregaDesde && draft.entregaHasta && draft.entregaHasta < draft.entregaDesde) next.entregaHasta = "Debe ser igual o posterior a la fecha inicial.";
        return next;
    };

    const handleSubmit = async () => {
        const nextErrors = validate();
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            setFormError("Revisa los campos marcados antes de guardar la participación.");
            return;
        }
        if (usesV1()) await campaignCommands.linkClient(selectedCampaign!.campaniaId, draft);
        await onSave?.();
        onOpenChange(false);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Link2 size={22} strokeWidth={2.25} />}
            title="Vincular Cliente"
            description="Define la participación comercial del cliente dentro de esta campaña."
            size="2xl"
            footer={(
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={19} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleSubmit} disabled={isLoading}>
                        <Save size={19} strokeWidth={2.5} /> Guardar participación
                    </Button>
                </>
            )}
        >
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {isClientContext ? (
                        <InfoField label="Cliente" value={cliente?.nombreEmpresa ?? "Cliente"} />
                    ) : (
                        <FormField label="Seleccionar cliente" required error={errors.clienteNegocioId}>
                            <Combobox
                                options={clientOptions}
                                value={draft.clienteNegocioId}
                                onChange={(value) => update("clienteNegocioId", value)}
                                placeholder={isLoading ? "Cargando clientes..." : "Buscar cliente..."}
                                emptyMessage="No hay clientes disponibles para vincular"
                                disabled={isLoading}
                            />
                        </FormField>
                    )}

                    {isClientContext ? (
                        <FormField label="Campaña" required error={errors.campaign}>
                            <Combobox
                                options={campaignOptions}
                                value={selectedCampaignId}
                                onChange={(value) => { setSelectedCampaignId(value); setDraft((current) => ({ ...current, variedades: [] })); setErrors((current) => ({ ...current, campaign: undefined, variedades: undefined })); setFormError(undefined); }}
                                placeholder={isLoading ? "Cargando campañas..." : "Seleccionar campaña..."}
                                emptyMessage="No hay campañas disponibles"
                                disabled={isLoading}
                            />
                        </FormField>
                    ) : null}

                    <InputField id="client-participation-quantity" label="Cantidad" required unit="kg" min={0} step="0.001" placeholder="0.00" value={draft.cantidadKg} error={errors.cantidadKg} onChange={(value) => update("cantidadKg", value)} />

                    <FormField error={errors.fichaTecnica} className="sm:col-span-2">
                        <FileDropzone label="Ficha técnica" variant="horizontal" required hint="PDF, Excel o imagen · Máx. 10 MB" file={fichaTecnica} onChange={(file) => { setFichaTecnica(file); setErrors((current) => ({ ...current, fichaTecnica: undefined })); setFormError(undefined); }} />
                    </FormField>

                    <FormField label="Variedades requeridas" required error={errors.variedades} hint="Selecciona una o varias variedades de la fruta de esta campaña." className="sm:col-span-2">
                        <ChipSelect
                            ariaLabel="Variedades requeridas por el cliente"
                            options={variedades.map((item) => ({ value: String(item.frutaDerivadaId), label: item.name }))}
                            value={draft.variedades}
                            onChange={(value) => update("variedades", value)}
                            emptyMessage={selectedCampaign ? "Esta fruta todavía no tiene variedades registradas." : "Selecciona una campaña para ver sus variedades."}
                        />
                    </FormField>
                    <InputField id="client-participation-destination" label="Destino solicitado" required placeholder="Ej. Países Bajos · Rotterdam" value={draft.destinoSolicitado} error={errors.destinoSolicitado} onChange={(value) => update("destinoSolicitado", value)} className="sm:col-span-2" />

                    <InputField id="client-participation-from" label="Entrega desde" required type="date" value={draft.entregaDesde} error={errors.entregaDesde} onChange={(value) => update("entregaDesde", value)} />
                    <InputField id="client-participation-to" label="Entrega hasta" required type="date" value={draft.entregaHasta} error={errors.entregaHasta} onChange={(value) => update("entregaHasta", value)} />
                    <FormField id="client-participation-notes" label="Observaciones" optional className="sm:col-span-2">
                        <Textarea id="client-participation-notes" className="min-h-20 resize-none" placeholder="Añade indicaciones comerciales relevantes..." value={draft.observaciones} onChange={(event) => update("observaciones", event.target.value)} />
                    </FormField>
                </div>

                {formError && <FormField error={formError} />}
            </div>
        </AppModal>
    );
}
