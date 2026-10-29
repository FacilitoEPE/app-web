import { usesV1 } from '@/shared/api/data-contract';
import { providerOperationalSummary } from '@/modules/providers/api/provider-screen-data';
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Award, CalendarCheck, FileSpreadsheet, FileText, LandPlot, MapPin, PackageCheck, Pencil, ShieldCheck, Sprout, UserRound } from "lucide-react";
import PageHeader from "@/shared/layout/PageHeader";
import ProviderOverviewCard from "@/modules/providers/components/ProviderOverviewCard";
import ProviderMetricCards from "@/modules/providers/components/ProviderMetricCards";
import ProviderProductionCard from "@/modules/providers/components/ProviderProductionCard";
import LinkedCard, { LinkedRow } from "@/shared/components/LinkedCard";
import StatusBadge from "@/shared/components/StatusBadge";
import { getProveedor, updateProveedor } from "@/modules/providers/api/proveedor.api";
import type { ProveedorInput } from "@/modules/providers/api/proveedor.dto";
import { createInFlightGuard } from "@/shared/utils/inFlightGuard";
import ProviderFormModal from "@/modules/providers/components/ProviderFormModal";
import ProviderSuccessModal from "@/modules/providers/components/ProviderSuccessModal";
import { Button } from "@/shared/components/ui/button";
import type { Proveedor } from "@/modules/providers/api/proveedor.mapper";
import { useProviderLocalData } from "@/modules/providers/providerLocalData.store";
import { displayCertificadoDate } from "@/modules/providers/providerCertificado.utils";
import { useQualityDeliveryLoads } from "@/modules/quality/qualityOperations.store";
import { PageError, PageLoading } from "@/shared/components/PageState";
import { formatDecimal } from "@/shared/utils/format";

const PREVIEW_ROWS = 3;

const fileExtension = (name: string) => (name.includes(".") ? name.split(".").pop()!.toUpperCase() : "ARCHIVO");

export default function ProviderDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const providerId = Number(id);
    const [provider, setProvider] = useState<Proveedor | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadProvider = useCallback(async () => {
        if (!Number.isInteger(providerId) || providerId < 1) {
            setError("El proveedor no es válido.");
            setIsLoading(false);
            return;
        }
        try {
            setError(null);
            setProvider(await getProveedor(providerId));
        } catch {
            setError("No se pudo cargar el proveedor desde el backend.");
        } finally {
            setIsLoading(false);
        }
    }, [providerId]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void loadProvider(); }, [loadProvider]);

    if (isLoading) return <PageLoading label="Cargando proveedor..." />;

    if (!provider) {
        return (
            <PageError
                icon={<UserRound />}
                title="Proveedor no disponible"
                message={error ?? "No se pudo cargar el proveedor."}
                onRetry={() => { setIsLoading(true); void loadProvider(); }}
                back={{ to: "/proveedores", label: "Volver a proveedores" }}
            />
        );
    }

    return <ProviderDetailsView key={provider.proveedorId} provider={provider} onSaved={setProvider} />;
}

function ProviderDetailsView({ provider, onSaved }: { provider: Proveedor; onSaved: (provider: Proveedor) => void }) {
    const navigate = useNavigate();
    const [editing, setEditing] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);
    const [mutationGuard] = useState(createInFlightGuard);
    const qualityLoads = useQualityDeliveryLoads();

    const saveProvider = async (_providerId: number | null, input: ProveedorInput) => {
        const saved = await updateProveedor(provider.proveedorId, input);
        onSaved(saved);
        setSuccessOpen(true);
        return saved;
    };
    const { fincas, certificados, produccion } = useProviderLocalData();
    const providerFincas = fincas[provider.proveedorId] ?? [];
    const providerCertificates = certificados[provider.proveedorId] ?? [];

    const totalHectares = providerFincas.reduce((sum, finca) => sum + finca.haTotal, 0);
    const cultivatedHectares = providerFincas.reduce((sum, finca) => sum + finca.haCultivo, 0);

    const goToFincas = () => navigate(`/proveedores/${provider.proveedorId}/fincas`);
    const goToCertificates = () => navigate(`/proveedores/${provider.proveedorId}/certificados`);

    const hiddenFincas = providerFincas.length - PREVIEW_ROWS;
    const hiddenCertificates = providerCertificates.length - PREVIEW_ROWS;

    const remoteSummary = usesV1() ? providerOperationalSummary(provider.proveedorId) : undefined;
    const totalDeliveredKg = remoteSummary?.kilosRecibidos ?? qualityLoads.reduce(
        (sum, item) => sum + item.proveedoresCarga.filter(p=>Number(p.proveedorId)===provider.proveedorId).reduce((acc, p) => acc + p.kilosCargados, 0),
        0,
    );
    const latestMtd = remoteSummary?.mtd;

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            <PageHeader
                icon={<UserRound size={24} strokeWidth={2.5} />}
                title="Detalle de Proveedor"
                description="Datos de registro, fincas y certificados del proveedor."
                action={<Button variant="outline" size="xl" onClick={() => setEditing(true)}><Pencil size={19} strokeWidth={2.5} /> Editar proveedor</Button>}
            />

            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 lg:grid-cols-[1.95fr_1fr]">
                <ProviderOverviewCard provider={provider} />
                <ProviderMetricCards
                    fincas={providerFincas.length}
                    totalHectares={totalHectares}
                    cultivatedHectares={cultivatedHectares}
                    certificates={providerCertificates.length}
                />
            </div>

            <div className="mt-4 grid grid-cols-1 items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-700 lg:grid-cols-[1.35fr_1fr]">
                <LinkedCard
                    icon={<LandPlot size={22} strokeWidth={2.2} />}
                    title="Fincas"
                    description={`${providerFincas.length} ${providerFincas.length === 1 ? "finca registrada" : "fincas registradas"}`}
                    manageLabel="Gestionar fincas"
                    onManage={goToFincas}
                    stats={[
                        { label: "Fincas", value: providerFincas.length },
                        { label: "Hectáreas totales", value: `${formatDecimal(totalHectares)} ha` },
                        { label: "Hectáreas de cultivo", value: `${formatDecimal(cultivatedHectares)} ha` },
                    ]}
                    isEmpty={providerFincas.length === 0}
                    emptyMessage="Este proveedor todavía no tiene fincas registradas."
                    emptyActionLabel="Registrar finca"
                >
                    {providerFincas.slice(0, PREVIEW_ROWS).map((finca) => (
                        <LinkedRow
                            key={finca.nombre}
                            icon={<Sprout size={16} strokeWidth={2.2} />}
                            title={finca.nombre}
                            metaIcon={<MapPin size={12} className="shrink-0" aria-hidden="true" />}
                            subtitle={`${finca.departamento} · ${finca.provincia} · ${finca.distrito}`}
                            trailing={
                                <>
                                    <p className="text-[13px] font-bold tabular-nums text-ink">{formatDecimal(finca.haTotal)} ha</p>
                                    <p className="text-[11px] tabular-nums text-ink-muted">{formatDecimal(finca.haCultivo)} ha de cultivo</p>
                                </>
                            }
                        />
                    ))}
                    {hiddenFincas > 0 && <p className="pt-1 text-center text-[12px] font-medium text-ink-muted">y {hiddenFincas} {hiddenFincas === 1 ? "finca más" : "fincas más"}</p>}
                </LinkedCard>

                <div className="flex flex-col gap-4">
                    <ProviderProductionCard produccion={produccion[provider.proveedorId]} />

                    <LinkedCard
                        icon={<ShieldCheck size={22} strokeWidth={2.2} />}
                        title="Certificados"
                        description={`${providerCertificates.length} ${providerCertificates.length === 1 ? "certificado registrado" : "certificados registrados"}`}
                        manageLabel="Gestionar certificados"
                        onManage={goToCertificates}
                        isEmpty={providerCertificates.length === 0}
                        emptyMessage="Este proveedor todavía no tiene certificados registrados."
                        emptyActionLabel="Registrar certificado"
                    >
                        {providerCertificates.slice(0, PREVIEW_ROWS).map((certificate) => (
                            <LinkedRow
                                key={certificate.certificadoId}
                                icon={<Award size={16} strokeWidth={2.2} />}
                                title={certificate.nombre}
                                metaIcon={<CalendarCheck size={12} className="shrink-0" aria-hidden="true" />}
                                subtitle={`Revisión SENASA · ${displayCertificadoDate(certificate.fechaRevisionSenasa)}`}
                                trailing={
                                    <span className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-1 text-[11px] font-bold text-ink-body ring-1 ring-border" title={certificate.documento?.name ?? "Sin adjunto"}>
                                        <FileText size={12} aria-hidden="true" />{fileExtension(certificate.documento?.name ?? "Sin adjunto")}
                                    </span>
                                }
                            />
                        ))}
                        {hiddenCertificates > 0 && <p className="pt-1 text-center text-[12px] font-medium text-ink-muted">y {hiddenCertificates} {hiddenCertificates === 1 ? "certificado más" : "certificados más"}</p>}
                    </LinkedCard>
                </div>
            </div>

            <div className="mt-4">
                <LinkedCard
                    icon={<FileSpreadsheet size={22} strokeWidth={2.2} />}
                    title="Participación en Campañas y Liquidaciones de Compra"
                    description="Historial de entregas en campañas activas, control MTD Ceratitis y estado de liquidación de compra."
                    manageLabel="Ver Liquidaciones de Compra"
                    onManage={() => navigate("/liquidacion-compra")}
                    stats={[
                        { label: "Campañas activas", value: 2 },
                        { label: "Kilos recepcionados", value: `${formatDecimal(totalDeliveredKg)} kg` },
                        { label: "Índice MTD Ceratitis", value: latestMtd === undefined ? "—" : formatDecimal(latestMtd) },
                    ]}
                    isEmpty={false}
                    emptyMessage=""
                    emptyActionLabel=""
                >
                    <LinkedRow
                        icon={<PackageCheck size={16} strokeWidth={2.2} />}
                        title="Campaña Mango Kent Exportación 2026"
                        subtitle={`Fincas habilitadas: ${providerFincas.length || 1} · Control fitosanitario SENASA vigente`}
                        trailing={
                            <div className="flex items-center gap-2">
                                <StatusBadge status="En ejecución" />
                                <Button variant="outline" size="sm" onClick={() => navigate("/campaigns")}>
                                    Ver campaña
                                </Button>
                            </div>
                        }
                    />
                    <LinkedRow
                        icon={<FileSpreadsheet size={16} strokeWidth={2.2} />}
                        title="Liquidación de Compra y Estado de Cuenta"
                        subtitle="Valorización por calibres/categorías, adelantos otorgados y comprobantes de pago"
                        trailing={
                            <Button variant="outline" size="sm" onClick={() => navigate("/liquidacion-compra")}>
                                Abrir liquidación
                            </Button>
                        }
                    />
                </LinkedCard>
            </div>

            <ProviderFormModal
                open={editing}
                onOpenChange={setEditing}
                mode="edit"
                provider={provider}
                mutationGuard={mutationGuard}
                onSave={saveProvider}
            />
            <ProviderSuccessModal open={successOpen} onOpenChange={setSuccessOpen} mode="edit" />
        </div>
    );
}
