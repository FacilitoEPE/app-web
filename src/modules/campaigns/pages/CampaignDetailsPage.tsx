import { usesV1 } from '@/shared/api/data-contract';
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarRange, ClipboardCheck, FileSpreadsheet, PackageCheck, Pencil, Play, Receipt, Sprout, Truck } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/shared/components/ui/button";
import { PageError, PageLoading } from "@/shared/components/PageState";
import LinkedCard, { LinkedRow } from "@/shared/components/LinkedCard";
import StatusBadge from "@/shared/components/StatusBadge";
import { SummaryBar } from "@/shared/components/InfoField";
import PageHeader from "@/shared/layout/PageHeader";
import { getCampana, getFrutaDerivadas, updateCampana } from "@/modules/campaigns/api/campaign.api";
import { getCampaniaProveedoresByCampania } from "@/modules/campaigns/api/campania-proveedor.api";
import { getClientesNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.api";
import { getUserById } from "@/modules/auth/api/auth.api";
import { getSession } from "@/shared/offline/session";
import { operationsContext } from "@/modules/operations/api/operations-context.api";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";
import type { FrutaDerivadaDto } from "@/modules/campaigns/api/campaign.dto";
import type { CampaniaProveedor } from "@/modules/campaigns/api/campania-proveedor.mapper";
import type { ClienteNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.mapper";

import { formatCampaignNumber, getCampaignTiming } from "@/modules/campaigns/campaignDetails.utils";
import { useCampaignCertificates } from "@/modules/campaigns/campaignCertificates.store";
import { getVigenciaAutomatica, type CertificadoCampanaLocal } from "@/modules/campaigns/campaignCertificate.utils";
import { useCampaignCarriers } from "@/modules/campaigns/campaignCarriers.store";
import { useCampaignDeliveryRecords } from "@/modules/campaigns/campaignContractDeliveries.store";
import { listCampaignDeliveries } from "@/modules/campaigns/campaignDeliveryCoordination.utils";
import { useQualityDeliveryLoads } from "@/modules/quality/qualityOperations.store";
import type { Campaign } from "@/modules/campaigns/campaigns.data";
import type { CampaignGrower, CampaignClient, CampaignCertification } from "@/modules/campaigns/campaignDetails.data";

import CampaignOverviewCard from "@/modules/campaigns/components/CampaignOverviewCard";
import { useTemporaryCampaignResponsible } from "@/modules/campaigns/campaignResponsible.store";
import CampaignMetricCards from "@/modules/campaigns/components/CampaignMetricCards";
import CampaignHarvestCard from "@/modules/campaigns/components/CampaignHarvestCard";
import CampaignProvidersSummary from "@/modules/campaigns/components/CampaignProvidersSummary";
import CampaignClientsSummary from "@/modules/campaigns/components/CampaignClientsSummary";
import CampaignCertificationsList from "@/modules/campaigns/components/CampaignCertificationsList";
import CampaignBrandBanner from "@/modules/campaigns/components/CampaignBrandBanner";
import CampaignFormModal from "@/modules/campaigns/components/CampaignFormModal";
import CampaignSuccessModal from "@/modules/campaigns/components/CampaignSuccessModal";
import CampaignManagementProvidersModal from "@/modules/campaigns/components/CampaignManagementProvidersModal";
import "@/modules/campaigns/campaignDetails.css";

function toOverviewCampaign(campana: Campana): Campaign {
    return {
        id: campana.campaniaId,
        nombre: campana.nombre,
        inicio: format(campana.fechaInicio, "dd/MM/yyyy"),
        fin: format(campana.fechaFin, "dd/MM/yyyy"),
        kilos: String(campana.requerimientoComercial),
        estado: campana.estado === "planificacion" ? "Planificado" : campana.estado === "en proceso" ? "En ejecución" : "Terminado",
        fruta: campana.fruta?.name,
        variedades: [],
        temporada: campana.temporada,
        observaciones: campana.observaciones,
    };
}

function toProviderSummaries(proveedores: CampaniaProveedor[]): CampaignGrower[] {
    return proveedores.map((relation) => {
        const name = relation.proveedor ? `${relation.proveedor.nombres} ${relation.proveedor.apellido}` : "Proveedor";
        return {
            id: relation.cxpId,
            name,
            location: relation.proveedor?.zona || "—",
            hectares: 0,
            owner: name,
            phone: relation.proveedor?.telefono ? String(relation.proveedor.telefono) : "—",
            varieties: [],
        };
    });
}

const TIPO_CLIENTE_LABEL: Record<string, string> = { exportador: "Exportador", industria: "Industria" };

function toClientSummaries(clientes: ClienteNegocioCampana[]): CampaignClient[] {
    return clientes.map((relation) => ({
        id: relation.clienteNegocioCampanaId,
        name: relation.clienteNegocio?.nombreEmpresa ?? "Cliente",
        type: relation.clienteNegocio ? TIPO_CLIENTE_LABEL[relation.clienteNegocio.tipoCliente] ?? relation.clienteNegocio.tipoCliente : "—",
        contact: relation.clienteNegocio?.nombreContacto ?? "—",
        email: relation.clienteNegocio?.correoCorporativo ?? "—",
        orders: 0,
        status: "Activo",
    }));
}

function toCertificationItems(certificados: CertificadoCampanaLocal[]): CampaignCertification[] {
    return certificados.map((certificado) => ({
        id: certificado.id,
        name: certificado.nombre,
        files: [certificado.documento?.name, certificado.cotizacion?.name].filter((name): name is string => Boolean(name)),
        expires: certificado.validoHasta ? certificado.validoHasta.split("-").reverse().join("/") : "",
        status: getVigenciaAutomatica(certificado.validoDesde, certificado.validoHasta),
        icon: "leaf",
    }));
}

interface CampaignDetailsData {
    campana: Campana;
    proveedores: CampaniaProveedor[];
    clientes: ClienteNegocioCampana[];
    derivadas: FrutaDerivadaDto[];
    responsableNombre: string;
    lineamientos: { name: string; url: string } | null;
}

type LoadState = { status: "loading" } | { status: "error" } | { status: "success"; data: CampaignDetailsData };

export default function CampaignDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const campaniaId = Number(id);

    if (!Number.isInteger(campaniaId) || campaniaId < 1) {
        return <PageError icon={<Sprout />} title="Campaña inválida" message="La campaña que buscas no está disponible." back={BACK_TO_CAMPAIGNS} />;
    }

    return <CampaignDetailsView key={campaniaId} campaniaId={campaniaId} />;
}

const BACK_TO_CAMPAIGNS = { to: "/campaigns", label: "Volver a campañas" };

function CampaignDetailsView({ campaniaId }: { campaniaId: number }) {
    const temporaryResponsible = useTemporaryCampaignResponsible(campaniaId);
    const [state, setState] = useState<LoadState>({ status: "loading" });
    const [openModal, setOpenModal] = useState<"providers" | "edit" | null>(null);
    const [successOpen, setSuccessOpen] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [starting, setStarting] = useState(false);
    const [startError, setStartError] = useState("");
    const navigate = useNavigate();
    const certificados = useCampaignCertificates(campaniaId);
    const carrierLinks = useCampaignCarriers(campaniaId);
    const deliveryRecords = useCampaignDeliveryRecords();
    const qualityLoads = useQualityDeliveryLoads();

    useEffect(() => {
        let active = true;
        Promise.all([
            getCampana(campaniaId),
            getCampaniaProveedoresByCampania(campaniaId),
            getClientesNegocioCampana(campaniaId),
        ])
            .then(async ([campana, proveedores, clientes]) => {
                const derivadas = campana.frutaId ? await getFrutaDerivadas(campana.frutaId) : [];

                const sessionUser = getSession()?.user;
                let responsableNombre = "Sin asignar";
                if (campana.responsableUsuarioId != null) {
                    if (campana.responsableUsuarioId === sessionUser?.usuarioId) {
                        responsableNombre = `${sessionUser.nombres} ${sessionUser.apellidos}`.trim() || sessionUser.usuario;
                    } else {
                        try {
                            const u = await getUserById(campana.responsableUsuarioId);
                            responsableNombre = `${u.nombres} ${u.apellidos}`.trim() || u.usuario;
                        } catch {
                            responsableNombre = `Usuario #${campana.responsableUsuarioId}`;
                        }
                    }
                }

                const file = usesV1()
                    ? operationsContext().localDocuments?.find(
                          (item) => item.tipo === "campana" && item.entidadId === campana.campaniaId
                      )
                    : undefined;
                const lineamientos = file ? { name: file.name, url: file.url } : null;

                if (active) {
                    setState({
                        status: "success",
                        data: { campana, proveedores, clientes, derivadas, responsableNombre, lineamientos },
                    });
                }
            })
            .catch(() => { if (active) setState({ status: "error" }); });
        return () => { active = false; };
    }, [campaniaId, reloadKey]);

    const retry = () => {
        setState({ status: "loading" });
        setReloadKey((key) => key + 1);
    };

    const startCampaign = async () => {
        setStarting(true);
        setStartError("");
        try {
            await updateCampana(campaniaId, { estado: "en proceso" });
            retry();
        } catch (error) {
            setStartError(error instanceof Error ? error.message : "No se pudo iniciar la campaña.");
        } finally {
            setStarting(false);
        }
    };

    if (state.status === "loading") return <PageLoading label="Cargando campaña..." />;
    if (state.status === "error") {
        return <PageError icon={<Sprout />} title="No se pudo cargar la campaña" message="Verifica la conexión e inténtalo nuevamente." onRetry={retry} back={BACK_TO_CAMPAIGNS} />;
    }

    const { campana, proveedores, clientes, derivadas, responsableNombre, lineamientos } = state.data;
    const campaign: Campaign = {
        ...toOverviewCampaign(campana),
        variedades: derivadas.map((derivada) => derivada.name),
        temporada: campana.temporada,
        responsable: temporaryResponsible ? `${temporaryResponsible} (temporal)` : responsableNombre,
        observaciones: campana.observaciones,
        lineamientos,
    };
    const timing = getCampaignTiming(campaign.inicio, campaign.fin);

    const estimatedKg = proveedores.reduce((sum, item) => sum + (Number(item.cantidadProveedor) || 0), 0);
    const campaignLoads = qualityLoads.filter((load) => load.campaniaId === campaniaId && (!usesV1() || load.cargaId !== undefined));
    const uniqueClients = [...new Map(clientes.map(c => [c.clienteNegocioId, c])).values()];
    const harvestedKg = campaignLoads.reduce(
        (sum, load) => sum + load.proveedoresCarga.reduce((acc, p) => acc + p.kilosCargados, 0),
        0,
    );
    const campaignDeliveries = listCampaignDeliveries(deliveryRecords, campaniaId);
    const scheduledKg = campaignDeliveries.reduce((sum, item) => sum + item.delivery.kilosProgramados, 0);
    const coordinatedCount = campaignDeliveries.filter((item) => Boolean(item.delivery.coordinacion)).length;
    const campaignGuidesCount = campaignLoads.reduce((sum, load) => sum + load.guiasRemision.length, 0);

    return (
        <div className="campaign-details px-4 py-5 sm:px-8 lg:px-14">
            <div className="campaign-details-inner">
                <PageHeader
                    icon={<Sprout size={24} strokeWidth={2.5} />}
                    title="Detalle de Campaña"
                    description="Control y seguimiento integral de la campaña."
                    action={
                        <div className="flex flex-wrap items-center gap-2.5">
                            {campana.estado === "planificacion" && timing.hasStarted && (
                                <Button size="xl" onClick={() => void startCampaign()} disabled={starting}>
                                    <Play size={19} strokeWidth={2.5} /> {starting ? "Iniciando…" : "Iniciar campaña"}
                                </Button>
                            )}
                            <Button variant="outline" size="xl" onClick={() => navigate(`/campaigns/${campaniaId}/weekly-delivery-program`)}>
                                <CalendarRange size={19} strokeWidth={2.3} /> Programa semanal
                            </Button>
                            {campana.estado === "planificacion" && (
                                <Button variant="outline" size="xl" onClick={() => setOpenModal("edit")}>
                                    <Pencil size={19} strokeWidth={2.5} /> Editar campaña
                                </Button>
                            )}
                        </div>
                    }
                />
                {startError && <p role="alert" className="mt-2 text-sm text-destructive">{startError}</p>}
                <div className="campaign-top-grid">
                    <CampaignOverviewCard campaign={campaign} duration={timing.duration} />
                    <CampaignMetricCards requirement={campana.requerimientoComercial} estimated={estimatedKg > 0 ? estimatedKg : null} harvested={harvestedKg} remaining={timing.remaining} hasEnded={timing.hasEnded} hasStarted={timing.hasStarted} />
                </div>
                <div className="campaign-bottom-grid">
                    <div className="campaign-main-column">
                        <CampaignHarvestCard harvested={harvestedKg} estimated={estimatedKg > 0 ? estimatedKg : null} />
                        <div className="campaign-contacts-grid">
                            <CampaignProvidersSummary providers={toProviderSummaries(proveedores)} campaignName={campana.nombre} onViewAll={() => setOpenModal("providers")} />
                            <CampaignClientsSummary clients={toClientSummaries(uniqueClients)} campaignName={campana.nombre} onViewAll={() => navigate(`/campaigns/${campaniaId}/clients`)} />
                        </div>
                    </div>
                    <div className="campaign-side-column">
                        <CampaignCertificationsList certifications={toCertificationItems(certificados)} onManage={() => navigate(`/campaigns/${campaniaId}/certifications`)} />
                        <CampaignBrandBanner />
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <LinkedCard
                        icon={<PackageCheck size={22} strokeWidth={2.2} />}
                        title="Flujo Operativo, Cosecha y Logística"
                        description="Seguimiento de entregas programadas, programa semanal, cargas y transporte de la campaña."
                        manageLabel="Ver entregas"
                        onManage={() => navigate(`/campaigns/${campaniaId}/deliveries`)}
                        stats={[
                            { label: "Entregas prog.", value: campaignDeliveries.length },
                            { label: "Coordinadas", value: `${coordinatedCount}/${campaignDeliveries.length}` },
                            { label: "Cargas en campo", value: campaignLoads.length },
                            { label: "Guías SUNAT", value: campaignGuidesCount },
                        ]}
                        isEmpty={false}
                        emptyMessage=""
                        emptyActionLabel=""
                    >
                        <SummaryBar
                            items={[
                                { label: "Meta comercial", value: `${formatCampaignNumber(Number(campana.requerimientoComercial))} kg`, tone: "brand" },
                                { label: "Programado contratos", value: `${formatCampaignNumber(scheduledKg)} kg` },
                                { label: "Cosechado neto", value: `${formatCampaignNumber(harvestedKg)} kg`, tone: "highlight" },
                            ]}
                        />
                        <LinkedRow
                            icon={<CalendarRange size={16} strokeWidth={2.2} />}
                            title="Programa Semanal de Entregas"
                            subtitle="Consolidado semanal por cliente, variedad y proveedor asignado"
                            trailing={
                                <Button variant="outline" size="sm" onClick={() => navigate(`/campaigns/${campaniaId}/weekly-delivery-program`)}>
                                    Abrir programa
                                </Button>
                            }
                        />
                        <LinkedRow
                            icon={<ClipboardCheck size={16} strokeWidth={2.2} />}
                            title="Cosecha y Control de Calidad"
                            subtitle={`${campaignLoads.length} cargas registradas · ${campaignGuidesCount} guías de remisión emitidas`}
                            trailing={
                                <Button variant="outline" size="sm" onClick={() => navigate("/calidad")}>
                                    Ir a calidad
                                </Button>
                            }
                        />
                        <LinkedRow
                            icon={<Truck size={16} strokeWidth={2.2} />}
                            title="Transportistas de la Campaña"
                            subtitle={`${carrierLinks.length} transportistas vinculados para despacho`}
                            trailing={
                                <Button variant="outline" size="sm" onClick={() => navigate(`/campaigns/${campaniaId}/carriers`)}>
                                    Gestionar flota
                                </Button>
                            }
                        />
                    </LinkedCard>

                    <LinkedCard
                        icon={<Receipt size={22} strokeWidth={2.2} />}
                        title="Cierre Financiero y Liquidaciones"
                        description="Acceso directo a la facturación de clientes, liquidación de compra a productores y pagos de flete."
                        manageLabel="Ir a Facturación"
                        onManage={() => navigate("/facturacion-cobros")}
                        stats={[
                            { label: "Clientes activos", value: uniqueClients.length },
                            { label: "Proveedores", value: proveedores.length },
                            { label: "Acuerdos flete", value: carrierLinks.filter((item) => item.acuerdo !== null).length },
                        ]}
                        isEmpty={false}
                        emptyMessage=""
                        emptyActionLabel=""
                    >
                        <LinkedRow
                            icon={<Receipt size={16} strokeWidth={2.2} />}
                            title="Facturación y Cobranza (Clientes)"
                            subtitle="Emisión de facturas comerciales, letras, detracciones y vouchers de cobro"
                            trailing={
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={clientes.length > 0 ? "Activo" : "Pendiente"} />
                                    <Button variant="outline" size="sm" onClick={() => navigate("/facturacion-cobros")}>
                                        Ver facturas
                                    </Button>
                                </div>
                            }
                        />
                        <LinkedRow
                            icon={<FileSpreadsheet size={16} strokeWidth={2.2} />}
                            title="Liquidación de Compra (Proveedores)"
                            subtitle="Valorización por calibre/categoría, descuentos por adelantos y liquidaciones SUNAT"
                            trailing={
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={proveedores.length > 0 ? "En proceso" : "Pendiente"} />
                                    <Button variant="outline" size="sm" onClick={() => navigate("/liquidacion-compra")}>
                                        Ver liquidaciones
                                    </Button>
                                </div>
                            }
                        />
                        <LinkedRow
                            icon={<Truck size={16} strokeWidth={2.2} />}
                            title="Monitoreo Logístico y Despacho"
                            subtitle="Control de las 10 etapas de despacho, pesos en balanza y conformidad en destino"
                            trailing={
                                <Button variant="outline" size="sm" onClick={() => navigate("/logistica-despacho")}>
                                    Ver despachos
                                </Button>
                            }
                        />
                    </LinkedCard>
                </div>

                <CampaignManagementProvidersModal open={openModal === "providers"} onOpenChange={(open) => setOpenModal(open ? "providers" : null)} campaniaId={campaniaId} />
                <CampaignFormModal
                    open={openModal === "edit"}
                    onOpenChange={(open) => setOpenModal(open ? "edit" : null)}
                    mode="edit"
                    campaniaId={campaniaId}
                    onSuccess={() => {
                        setOpenModal(null);
                        setSuccessOpen(true);
                        setReloadKey((key) => key + 1);
                    }}
                />
                <CampaignSuccessModal open={successOpen} onOpenChange={setSuccessOpen} mode="edit" />
            </div>
        </div>
    );
}
