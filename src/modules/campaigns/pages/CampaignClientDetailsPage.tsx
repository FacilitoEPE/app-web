import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, ContactRound, FileSignature, Mail, MapPin, PackageCheck, Pencil, Phone, Scale, UserRound, Users } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import EntityOverviewCard from "@/shared/components/EntityOverviewCard";
import FileDropzone, { type StoredFile } from "@/shared/components/FileDropzone";
import LinkedCard, { LinkedRow } from "@/shared/components/LinkedCard";
import MetricCards from "@/shared/components/MetricCards";
import { PageError, PageLoading } from "@/shared/components/PageState";
import PageHeader from "@/shared/layout/PageHeader";
import { formatDisplayDate, formatKg } from "@/shared/utils/format";
import { getCampana } from "@/modules/campaigns/api/campaign.api";
import { getClientesNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.api";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";
import type { ClienteNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.mapper";
import CampaignClientRecordModal from "@/modules/campaigns/components/CampaignClientRecordModal";
import CampaignSuccessModal from "@/modules/campaigns/components/CampaignSuccessModal";
import { useCampaignClientContracts } from "@/modules/campaigns/campaignClientContracts.store";
import { useCampaignDeliveryRecords } from "@/modules/campaigns/campaignContractDeliveries.store";

type LoadState =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; campaign: Campana; relation: ClienteNegocioCampana };

function storedFile(url: string, name: string): StoredFile | null {
    if (!url) return null;
    const rawName = url.split("?")[0].split("/").filter(Boolean).at(-1);
    return { name: rawName ? decodeURIComponent(rawName) : name, url };
}

export default function CampaignClientDetailsPage() {
    const { id, clientLinkId } = useParams<{ id: string; clientLinkId: string }>();
    const campaignId = Number(id);
    const relationId = Number(clientLinkId);
    const [state, setState] = useState<LoadState>({ status: "loading" });
    const loadSequence = useRef(0);

    const load = useCallback(async () => {
        const sequence = ++loadSequence.current;
        if (![campaignId, relationId].every((value) => Number.isSafeInteger(value) && value > 0)) {
            setState({ status: "error", message: "El cliente solicitado no es válido." });
            return;
        }
        setState({ status: "loading" });
        try {
            const [campaign, relations] = await Promise.all([getCampana(campaignId), getClientesNegocioCampana(campaignId)]);
            const relation = relations.find((item) => item.clienteNegocioCampanaId === relationId);
            if (sequence === loadSequence.current) setState(relation
                ? { status: "ready", campaign, relation }
                : { status: "error", message: "Este cliente no está vinculado a la campaña." });
        } catch {
            if (sequence === loadSequence.current) setState({ status: "error", message: "No se pudo cargar el cliente. Inténtalo nuevamente." });
        }
    }, [campaignId, relationId]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void load(); }, [load]);

    if (state.status === "loading") return <PageLoading label="Cargando cliente..." />;
    if (state.status === "error") return (
        <PageError title="Cliente no disponible" message={state.message} onRetry={() => void load()}
            back={{ to: `/campaigns/${campaignId}/clients`, label: "Volver a clientes" }} />
    );
    return <ClientDetails key={relationId} campaign={state.campaign} initialRelation={state.relation} />;
}

function ClientDetails({ campaign, initialRelation }: { campaign: Campana; initialRelation: ClienteNegocioCampana }) {
    const navigate = useNavigate();
    const [relation, setRelation] = useState(initialRelation);
    const [editOpen, setEditOpen] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);
    const contracts = useCampaignClientContracts(campaign.campaniaId, relation.clienteNegocioCampanaId);
    const deliveryRecords = useCampaignDeliveryRecords();
    const base = `/campaigns/${campaign.campaniaId}/clients/${relation.clienteNegocioCampanaId}`;
    const client = relation.clienteNegocio;
    const name = client?.nombreEmpresa ?? "Cliente";
    const deliveries = useMemo(() => contracts.flatMap((contract) =>
        (deliveryRecords[`${campaign.campaniaId}:${relation.clienteNegocioCampanaId}:${contract.id}`] ?? [])
            .map((delivery) => ({ contract, delivery }))),
    [contracts, deliveryRecords, campaign.campaniaId, relation.clienteNegocioCampanaId]);
    const scheduledKg = deliveries.reduce((sum, item) => sum + item.delivery.kilosProgramados, 0);

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            <PageHeader icon={<Users size={24} strokeWidth={2.5} />} title="Detalle del Cliente"
                description={`Información comercial de ${name} en ${campaign.nombre}.`}
                action={<Button variant="outline" size="xl" onClick={() => setEditOpen(true)}><Pencil size={19} /> Editar vínculo</Button>} />

            <div className="grid gap-4 lg:grid-cols-[1.95fr_1fr]">
                <EntityOverviewCard
                    avatar={<ContactRound />}
                    eyebrow={client?.tipoCliente === "exportador" ? "Cliente · Exportador" : client?.tipoCliente === "industria" ? "Cliente · Industria" : "Cliente de campaña"}
                    title={name}
                    watermark={Users}
                    chips={client?.ruc ? [{ icon: <ContactRound />, label: `RUC ${client.ruc}` }] : []}
                    details={[
                        { icon: <UserRound />, label: "Contacto", value: client?.nombreContacto || "No registrado" },
                        { icon: <Phone />, label: "Teléfono", value: client?.telefono || "No registrado" },
                        { icon: <Mail />, label: "Correo corporativo", value: client?.correoCorporativo || "No registrado" },
                        { icon: <MapPin />, label: "Ubicación", value: client?.ubicacion || "No registrada" },
                    ]}
                />
                <MetricCards label="Resumen comercial del cliente" metrics={[
                    { title: "Cantidad requerida", value: formatKg(relation.cantidadKg), unit: "kg", description: "Requerimiento de esta campaña", icon: Scale },
                    { title: "Kilos acordados", value: formatKg(relation.kilosAcordados), unit: "kg", description: "Acuerdo del vínculo", icon: Scale },
                    { title: "Contratos", value: String(contracts.length), unit: "", description: "Acuerdos comerciales", icon: FileSignature },
                    { title: "Entregas", value: String(deliveries.length), unit: "", description: `${formatKg(scheduledKg)} kg programados`, icon: PackageCheck },
                ]} />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <LinkedCard icon={<FileSignature size={22} />} title="Contratos del cliente" description="Acuerdos comerciales registrados para esta campaña"
                    manageLabel="Gestionar contratos" onManage={() => navigate(`${base}/contracts`)}
                    stats={[{ label: "Contratos", value: contracts.length }, { label: "Kg propuestos", value: formatKg(contracts.reduce((sum, item) => sum + item.cantidadPropuestaKg, 0)) }]}
                    isEmpty={contracts.length === 0} emptyMessage="Aún no hay contratos para este cliente en la campaña."
                    emptyActionLabel="Ir a contratos" >
                    {contracts.slice(0, 3).map((contract) => (
                        <LinkedRow key={contract.id} icon={<FileSignature size={16} />} title={`Contrato ${contract.id}`}
                            metaIcon={<CalendarDays size={13} />} subtitle={formatDisplayDate(contract.fechaRegistro)}
                            trailing={<span className="text-xs font-semibold text-ink">{formatKg(contract.cantidadPropuestaKg)} kg</span>} />
                    ))}
                </LinkedCard>
                <LinkedCard icon={<PackageCheck size={22} />} title="Entregas programadas" description="Entregas vinculadas a los contratos del cliente"
                    manageLabel="Ver contratos" onManage={() => navigate(`${base}/contracts`)}
                    stats={[{ label: "Entregas", value: deliveries.length }, { label: "Kg programados", value: formatKg(scheduledKg) }]}
                    isEmpty={deliveries.length === 0} emptyMessage="Aún no hay entregas programadas en los contratos de este cliente."
                    emptyActionLabel="Ir a contratos">
                    {deliveries.slice(0, 3).map(({ contract, delivery }) => (
                        <LinkedRow key={`${contract.id}:${delivery.id}`} icon={<PackageCheck size={16} />}
                            title={delivery.destino || `Entrega ${delivery.id}`} metaIcon={<CalendarDays size={13} />}
                            subtitle={formatDisplayDate(delivery.fecha)}
                            trailing={<span className="text-xs font-semibold text-ink">{formatKg(delivery.kilosProgramados)} kg</span>} />
                    ))}
                </LinkedCard>
            </div>

            <section className="mt-5 rounded-2xl bg-card p-5 ring-1 ring-border sm:p-6" aria-label="Documentos del vínculo">
                <div className="mb-4 flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-brand-surface text-brand"><FileSignature size={20} /></span>
                    <div><h2 className="text-[15px] font-bold text-ink">Documentos del vínculo</h2><p className="text-xs text-ink-muted">Archivos registrados al vincular al cliente con esta campaña</p></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <FileDropzone label="Requerimientos" file={storedFile(relation.documentoUrl, "Requerimientos del cliente")} readOnly onChange={() => undefined} />
                    <FileDropzone label="Ficha técnica" file={storedFile(relation.fichaTecnicaUrl, "Ficha técnica del cliente")} readOnly onChange={() => undefined} />
                </div>
            </section>

            <CampaignClientRecordModal open={editOpen} mode="edit" client={relation} campaniaId={campaign.campaniaId}
                onOpenChange={setEditOpen} onSaved={(updated) => { setRelation({ ...updated, clienteNegocio: updated.clienteNegocio ?? relation.clienteNegocio }); setEditOpen(false); setSuccessOpen(true); }} />
            <CampaignSuccessModal open={successOpen} onOpenChange={setSuccessOpen} mode="edit" />
        </div>
    );
}
