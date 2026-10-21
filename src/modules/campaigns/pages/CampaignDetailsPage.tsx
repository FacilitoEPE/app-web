import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Sprout } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/shared/components/ui/button";
import { PageError, PageLoading } from "@/shared/components/PageState";
import PageHeader from "@/shared/layout/PageHeader";
import { getCampana, getFrutaDerivadas } from "@/modules/campaigns/api/campaign.api";
import { getCampaniaProveedoresByCampania } from "@/modules/campaigns/api/campania-proveedor.api";
import { getClientesNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.api";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";
import type { FrutaDerivadaDto } from "@/modules/campaigns/api/campaign.dto";
import type { CampaniaProveedor } from "@/modules/campaigns/api/campania-proveedor.mapper";
import type { ClienteNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.mapper";

import { getCampaignTiming } from "@/modules/campaigns/campaignDetails.utils";
import { useCampaignCertificates } from "@/modules/campaigns/campaignCertificates.store";
import { getVigenciaAutomatica, type CertificadoCampanaLocal } from "@/modules/campaigns/campaignCertificate.utils";
import type { Campaign } from "@/modules/campaigns/campaigns.data";
import type { CampaignGrower, CampaignClient, CampaignCertification } from "@/modules/campaigns/campaignDetails.data";

import CampaignOverviewCard from "@/modules/campaigns/components/CampaignOverviewCard";
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

// Adaptadores: llevan los datos de la API a la forma que reciben las tarjetas del diseño
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
    };
}

// La relación campaña-proveedor no devuelve hectáreas ni variedades: se dejan en 0/vacío en vez de inventarlas
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

// La API no registra pedidos ni estado del cliente en la campaña: pedidos en 0 y todos se consideran activos
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

// Las certificaciones salen del almacén local de la gestión de certificaciones (ver campaignCertificates.store.ts)
function toCertificationItems(certificados: CertificadoCampanaLocal[]): CampaignCertification[] {
    return certificados.map((certificado) => ({
        id: certificado.id,
        name: certificado.nombre,
        files: [certificado.documento?.name, certificado.cotizacion?.name].filter((name): name is string => Boolean(name)),
        expires: certificado.validoHasta ? certificado.validoHasta.split("-").reverse().join("/") : "",
        // El mismo estado que la tabla de gestión: incluye "Por iniciar" y "Sin fechas completas"
        status: getVigenciaAutomatica(certificado.validoDesde, certificado.validoHasta),
        icon: "leaf",
    }));
}

interface CampaignDetailsData {
    campana: Campana;
    proveedores: CampaniaProveedor[];
    clientes: ClienteNegocioCampana[];
    derivadas: FrutaDerivadaDto[];
}

type LoadState = { status: "loading" } | { status: "error" } | { status: "success"; data: CampaignDetailsData };

export default function CampaignDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const campaniaId = Number(id);

    if (!Number.isInteger(campaniaId) || campaniaId < 1) {
        return <PageError icon={<Sprout />} title="Campaña inválida" message="La campaña que buscas no está disponible." back={BACK_TO_CAMPAIGNS} />;
    }

    // Cambiar de campaña reinicia la carga, los modales y las secciones desplegadas
    return <CampaignDetailsView key={campaniaId} campaniaId={campaniaId} />;
}

const BACK_TO_CAMPAIGNS = { to: "/campaigns", label: "Volver a campañas" };

function CampaignDetailsView({ campaniaId }: { campaniaId: number }) {
    const [state, setState] = useState<LoadState>({ status: "loading" });
    const [openModal, setOpenModal] = useState<"providers" | "edit" | null>(null);
    const [successOpen, setSuccessOpen] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const navigate = useNavigate();
    const certificados = useCampaignCertificates(campaniaId);

    useEffect(() => {
        let active = true;
        Promise.all([
            getCampana(campaniaId),
            // Proveedores y clientes son secciones secundarias: si fallan, la campaña igual se muestra
            getCampaniaProveedoresByCampania(campaniaId).catch(() => []),
            getClientesNegocioCampana(campaniaId).catch(() => []),
        ])
            .then(async ([campana, proveedores, clientes]) => {
                const derivadas = campana.frutaId ? await getFrutaDerivadas(campana.frutaId).catch(() => []) : [];
                if (active) setState({ status: "success", data: { campana, proveedores, clientes, derivadas } });
            })
            .catch(() => { if (active) setState({ status: "error" }); });
        return () => { active = false; };
    }, [campaniaId, reloadKey]);

    const retry = () => {
        setState({ status: "loading" });
        setReloadKey((key) => key + 1);
    };

    if (state.status === "loading") return <PageLoading label="Cargando campaña..." />;
    if (state.status === "error") {
        return <PageError icon={<Sprout />} title="No se pudo cargar la campaña" message="Verifica la conexión e inténtalo nuevamente." onRetry={retry} back={BACK_TO_CAMPAIGNS} />;
    }

    const { campana, proveedores, clientes, derivadas } = state.data;
    const campaign = { ...toOverviewCampaign(campana), variedades: derivadas.map((derivada) => derivada.name) };
    const timing = getCampaignTiming(campaign.inicio, campaign.fin);

    return (
        <div className="campaign-details px-4 py-5 sm:px-8 lg:px-14">
            <div className="campaign-details-inner">
                <PageHeader
                    icon={<Sprout size={24} strokeWidth={2.5} />}
                    title="Detalle de Campaña"
                    description="Control y seguimiento integral de la campaña."
                    action={<Button variant="outline" size="xl" onClick={() => setOpenModal("edit")}><Pencil size={19} strokeWidth={2.5} /> Editar campaña</Button>}
                />
                <div className="campaign-top-grid">
                    <CampaignOverviewCard campaign={campaign} duration={timing.duration} />
                    <CampaignMetricCards requirement={campana.requerimientoComercial} estimated={null} harvested={0} remaining={timing.remaining} hasEnded={timing.hasEnded} hasStarted={timing.hasStarted} />
                </div>
                <div className="campaign-bottom-grid">
                    <div className="campaign-main-column">
                        <CampaignHarvestCard harvested={0} estimated={null} />
                        <div className="campaign-contacts-grid">
                            <CampaignProvidersSummary providers={toProviderSummaries(proveedores)} campaignName={campana.nombre} onViewAll={() => setOpenModal("providers")} />
                            <CampaignClientsSummary clients={toClientSummaries(clientes)} campaignName={campana.nombre} onViewAll={() => navigate(`/campaigns/${campaniaId}/clients`)} />
                        </div>
                    </div>
                    <div className="campaign-side-column">
                        <CampaignCertificationsList certifications={toCertificationItems(certificados)} onManage={() => navigate(`/campaigns/${campaniaId}/certifications`)} />
                        <CampaignBrandBanner />
                    </div>
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
