import { useEffect, useRef, useState } from "react";
import { X, Link2 } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import InputField from "@/shared/components/InputField";
import SegmentedControl from "@/shared/components/SegmentedControl";
import FormField from "@/shared/components/FormField";
import { Button } from "@/shared/components/ui/button";
import { Combobox } from "@/shared/components/ui/combobox";
import { Textarea } from "@/shared/components/ui/textarea";
import { getProveedores } from "@/modules/providers/api/proveedor.api";
import type { Proveedor } from "@/modules/providers/api/proveedor.mapper";
import { createCampaniaProveedor, getCampaniaProveedoresByCampania, updateCampaniaProveedor } from "@/modules/campaigns/api/campania-proveedor.api";
import type { TipoProveedorCampania } from "@/modules/campaigns/api/campania-proveedor.dto";
import {
    getCampaniaProveedorDraftErrors,
    toCreateCampaniaProveedorInput,
    toUpdateCampaniaProveedorInput,
    type CampaniaProveedorDraft,
} from "@/modules/campaigns/api/campania-proveedor-form";
import { createCampaniaProveedorSubmissionController } from "@/modules/campaigns/api/campania-proveedor-submission";
import { fetchCampaignProviderOptions } from "@/modules/campaigns/api/campaign-provider-options";
import { MONEDA_OPTIONS, getMonedaSymbol } from "@/modules/campaigns/campaignCertificate.utils";

interface CampaignLinkProviderModalProps {
    open: boolean;
    campaniaId?: number | null;
    onOpenChange: (open: boolean) => void;
    /** Se llama solo cuando el backend confirmó el vínculo */
    onSave?: () => void;
    /** Se llama cuando el resultado quedó incierto y conviene recargar la lista de la página */
    onRefresh?: () => void;
    mode?: "create" | "edit";
    /** Tipo fijo del proveedor: no se pregunta (en una campaña en ejecución solo se vinculan acopiadores) */
    lockedType?: TipoProveedorCampania;
    initialData?: import("@/modules/campaigns/api/campania-proveedor.mapper").CampaniaProveedor | null;
}

type DraftField = "cantidadProveedor" | "observacionesParticipacion" | "precioEstimado" | "moneda";
type DraftValues = {
    cantidadProveedor: string;
    observacionesParticipacion: string;
    precioEstimado: string;
    moneda: string;
    frutaConvencionalEstimado: number | null;
    departamento: string | null;
    provincia: string | null;
    distrito: string | null;
    latitud: number | null;
    longitud: number | null;
    densidadPlantacion: number | null;
    distanciamiento: number | null;
    frecuenciaRiego: number | null;
    haTotalFinca: number | null;
    haCultivo: number | null;
    nombreAplicacion: string | null;
    aplicacionesAlAno: number | null;
};
// type DraftErrors = CampaniaProveedorDraftErrors & Partial<Record<"proveedorId" | "frutaConvencional" | "observacionesParticipacion", string>>;

const EMPTY_DRAFT: DraftValues = {
    cantidadProveedor: "",
    observacionesParticipacion: "",
    precioEstimado: "",
    moneda: "PEN",
    frutaConvencionalEstimado: null,
    departamento: null,
    provincia: null,
    distrito: null,
    latitud: null,
    longitud: null,
    densidadPlantacion: null,
    distanciamiento: null,
    frecuenciaRiego: null,
    haTotalFinca: null,
    haCultivo: null,
    nombreAplicacion: null,
    aplicacionesAlAno: null,
};

const PROVIDER_TYPES = [
    { label: "Productor", value: "productor" },
    { label: "Acopiador", value: "acopio" },
];
/** Vincula un proveedor por vez: se valida, se guarda y el backend confirma antes de mostrar éxito. */
export default function CampaignLinkProviderModal({ open, campaniaId, onOpenChange, onSave, onRefresh, mode = "create", lockedType, initialData }: CampaignLinkProviderModalProps) {
    const [providerType, setProviderType] = useState<TipoProveedorCampania>("productor");
    const [selectedProvider, setSelectedProvider] = useState("");
    const [draft, setDraft] = useState<DraftValues>(EMPTY_DRAFT);
    // const [errors, setErrors] = useState<DraftErrors>({});
    const [errors, setErrors] = useState<Partial<Record<keyof DraftValues, string>> & { proveedorId?: string }>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [linkedIds, setLinkedIds] = useState<Set<number>>(new Set());
    const [isLoadingProviders, setIsLoadingProviders] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    // Proveedor cuyo guardado no se pudo confirmar: el formulario queda bloqueado hasta reconciliar con el backend
    const [unresolvedProviderId, setUnresolvedProviderId] = useState<number | null>(null);
    const unresolvedRef = useRef<number | null>(null);
    const onSaveRef = useRef(onSave);
    const onRefreshRef = useRef(onRefresh);

    useEffect(() => {
        onSaveRef.current = onSave;
        onRefreshRef.current = onRefresh;
    }, [onSave, onRefresh]);

    const [controller] = useState(() => createCampaniaProveedorSubmissionController<CampaniaProveedorDraft>({
        create: (campaignId, provider) => createCampaniaProveedor(toCreateCampaniaProveedorInput(campaignId, provider)),
        list: getCampaniaProveedoresByCampania,
    }));

    const markUnresolved = (providerId: number | null) => {
        unresolvedRef.current = providerId;
        setUnresolvedProviderId(providerId);
    };

    // Cada apertura es una sesión nueva; si quedó un guardado sin confirmar, primero se consulta al backend
    useEffect(() => {
        if (!open) return;
        let active = true;

        // El formulario se reinicia al abrir: es sincronizar el estado local con el vínculo que se va a editar.
        if (mode === "edit" && initialData) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setProviderType(initialData.tipoProveedor);
            setSelectedProvider(String(initialData.proveedorId));
            setDraft({
                ...EMPTY_DRAFT,
                cantidadProveedor: initialData.cantidadProveedor ? String(initialData.cantidadProveedor) : "",
                frutaConvencionalEstimado: initialData.frutaConvencionalEstimado ?? null,
            });
        } else {
            setProviderType(lockedType ?? "productor");
            setSelectedProvider("");
            setDraft(EMPTY_DRAFT);
        }

        setErrors({});
        setFormError(null);
        setIsLoadingProviders(true);

        const requests: Promise<unknown>[] = [
            fetchCampaignProviderOptions(getProveedores).then(({ providers, failed }) => {
                if (!active) return;
                setProveedores(providers);
                if (failed) setFormError("No se pudieron cargar los proveedores. Cierra y vuelve a abrir el formulario.");
            }),
        ];

        if (campaniaId) {
            requests.push(
                getCampaniaProveedoresByCampania(campaniaId)
                    .then((relations) => { if (active) setLinkedIds(new Set(relations.map((relation) => relation.proveedorId))); })
                    .catch(() => { if (active) setLinkedIds(new Set()); }),
            );
        }

        const pendingId = unresolvedRef.current;
        if (campaniaId && pendingId !== null) {
            requests.push(
                controller.reconcile(campaniaId, [pendingId]).then((result) => {
                    if (!active) return;
                    if (result.status === "unresolved") {
                        setFormError("Aún no se puede confirmar el vínculo anterior. Para evitar duplicados, vuelve a abrir el formulario más tarde.");
                        return;
                    }
                    markUnresolved(null);
                    if (result.status === "complete") {
                        // El vínculo anterior sí se guardó: se informa como éxito sin volver a enviarlo
                        onSaveRef.current?.();
                    } else {
                        onRefreshRef.current?.();
                    }
                }),
            );
        }

        void Promise.all(requests).finally(() => { if (active) setIsLoadingProviders(false); });
        return () => { active = false; };
        // Solo reinicia al abrir (o al cambiar de campaña): si dependiera de `mode`/`initialData`, cualquier render del
        // padre con un objeto nuevo borraría lo que el usuario ya escribió.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, campaniaId, controller, lockedType]);

    const isLocked = isSaving || unresolvedProviderId !== null;

    const updateDraft = <K extends keyof DraftValues>(field: K, value: DraftValues[K]) => {
        setDraft((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
        setFormError(null);
    };

    const handleSubmit = async () => {
        if (isLocked || !campaniaId) return;
        const proveedor = proveedores.find((provider) => String(provider.proveedorId) === selectedProvider);
        const candidate: CampaniaProveedorDraft = { proveedorId: proveedor?.proveedorId ?? (mode === "edit" && initialData ? initialData.proveedorId : 0), tipoProveedor: providerType, ...draft };
        const draftErrors: typeof errors = getCampaniaProveedorDraftErrors(candidate);
        if (!proveedor && mode === "create") draftErrors.proveedorId = "Selecciona un proveedor.";
        if (Object.keys(draftErrors).length > 0 || (!proveedor && mode === "create")) {
            setErrors(draftErrors);
            setFormError("Revisa los campos marcados antes de guardar.");
            return;
        }

        setIsSaving(true);
        setErrors({});
        setFormError(null);
        try {
            if (mode === "edit" && initialData) {
                await updateCampaniaProveedor(initialData.cxpId, toUpdateCampaniaProveedorInput(candidate));
                onSave?.();
                return;
            }

            const result = await controller.submit(campaniaId, [candidate]);
            if (result.status === "complete") {
                onSave?.();
                return;
            }
            if (result.status === "unresolved") {
                markUnresolved(candidate.proveedorId);
                setFormError("No se pudo confirmar si el vínculo se guardó. Para evitar duplicados, cierra y vuelve a abrir el formulario para verificarlo.");
                return;
            }
            onRefresh?.();
            setFormError("No se pudo vincular el proveedor. Revisa los datos e inténtalo nuevamente.");
        } catch {
            setFormError("Ocurrió un error inesperado al procesar la solicitud.");
        } finally {
            setIsSaving(false);
        }
    };

    const providerOptions = proveedores
        .filter((provider) => !linkedIds.has(provider.proveedorId))
        .map((provider) => ({ value: String(provider.proveedorId), label: `${provider.nombres} ${provider.apellido}` }));

    const currencySymbol = getMonedaSymbol(draft.moneda);

    const renderField = ({
        field,
        label,
        step,
        placeholder,
        suffix,
        leading,
    }: {
        field: DraftField;
        label: string;
        step?: string;
        placeholder?: string;
        suffix?: string;
        leading?: string;
    }) => (
        <InputField
            key={field}
            id={`link-provider-${field}`}
            label={label}
            value={draft[field]}
            onChange={(value) => updateDraft(field, value)}
            error={errors[field]}
            placeholder={placeholder}
            step={step}
            min={0}
            unit={suffix}
            leading={leading}
            required
            disabled={isLocked}
        />
    );

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            busy={isSaving}
            icon={<Link2 size={22} strokeWidth={2} />}
            title={mode === "edit" ? "Editar Vínculo de Proveedor" : lockedType === "acopio" ? "Vincular Acopiador" : "Vincular Proveedor"}
            description={mode === "edit" ? "Modifica los datos del proveedor vinculado a esta campaña." : (lockedType === "acopio" ? "Asocia un acopiador a esta campaña. Los campos con * son obligatorios." : "Asocia un productor o acopiador a esta campaña. Los campos con * son obligatorios.")}
            size="xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)} disabled={isSaving}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleSubmit} disabled={isLocked || isLoadingProviders || !campaniaId} aria-busy={isSaving}>
                        <Link2 size={20} strokeWidth={2.5} /> {isSaving ? "Guardando..." : mode === "edit" ? "Guardar cambios" : lockedType === "acopio" ? "Vincular acopiador" : "Vincular proveedor"}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                
                <FormField label="Seleccionar Proveedor:" required error={errors.proveedorId}>
                    <Combobox
                        options={mode === "edit" && initialData && initialData.proveedor ? [{ value: String(initialData.proveedorId), label: `${initialData.proveedor.nombres} ${initialData.proveedor.apellido}` }] : providerOptions}
                        value={selectedProvider}
                        onChange={(value) => { setSelectedProvider(value); setErrors((current) => ({ ...current, proveedorId: undefined })); }}
                        placeholder={isLoadingProviders ? "Cargando proveedores..." : "Buscar proveedor, fruta o variedad..."}
                        emptyMessage="No hay proveedores disponibles para vincular"
                        disabled={isLoadingProviders || isLocked || mode === "edit"}
                    />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    {!lockedType && (
                        <FormField label="Tipo de Proveedor:">
                            <SegmentedControl
                                options={PROVIDER_TYPES}
                                value={providerType}
                                onChange={(value) => {
                                    setProviderType(value as TipoProveedorCampania);
                                    setErrors({});
                                    setFormError(null);
                                }}
                            />
                        </FormField>
                    )}
                    <div className={lockedType ? "sm:col-span-2" : undefined}>
                        {renderField({ field: "cantidadProveedor", label: "Cantidad de kilos estimados", step: "0.001", placeholder: "Ej. 2500", suffix: "KG" })}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    {renderField({ field: "precioEstimado", label: "Precio estimado o acordado", step: "0.01", placeholder: "0.00", leading: currencySymbol })}
                    <FormField label="Moneda" required>
                        <Combobox
                            options={MONEDA_OPTIONS}
                            value={draft.moneda}
                            onChange={(value) => updateDraft("moneda", value)}
                            disabled={isLocked}
                            placeholder="Seleccionar moneda"
                        />
                    </FormField>
                </div>

                <FormField label="Observaciones de Participación">
                    <Textarea 
                        className="min-h-24 resize-none" 
                        placeholder="Escribe aquí las observaciones..."
                        value={draft.observacionesParticipacion}
                        onChange={(e) => updateDraft("observacionesParticipacion", e.target.value)}
                        disabled={isLocked}
                    />
                </FormField>
            </div>

            {/* Error general del formulario (no de un campo); solo se dibuja si existe */}
            {formError && <FormField error={formError} className="mt-6" />}
        </AppModal>
    );
}
