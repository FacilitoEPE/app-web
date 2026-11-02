import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Eye, PackagePlus, Pencil, Plus, ShieldCheck, Users, Wallet } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
import StatusBadge from "@/shared/components/StatusBadge";
import TableCard from "@/shared/components/TableCard";
import TableGridCard, { TableGridCardField, TableGridCardFields } from "@/shared/components/TableGridCard";
import { TableCountPill, TableToolbar } from "@/shared/components/TableToolbar";
import PageHeader from "@/shared/layout/PageHeader";
import CampaignContextBanner from "@/modules/campaigns/components/CampaignContextBanner";
import CampaignCertificationFormModal from "@/modules/campaigns/components/CampaignCertificationFormModal";
import CampaignCertificationViewModal from "@/modules/campaigns/components/CampaignCertificationViewModal";
import CampaignCertificationExpansionModal from "@/modules/campaigns/components/CampaignCertificationExpansionModal";
import CampaignCertificationPaymentModal from "@/modules/campaigns/components/CampaignCertificationPaymentModal";
import CampaignSuccessModal from "@/modules/campaigns/components/CampaignSuccessModal";
import { getCampana } from "@/modules/campaigns/api/campaign.api";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";
import {
    addCampaignCertificate,
    addCertificateExpansion,
    addCertificatePayment,
    updateCampaignCertificate,
    useCampaignCertificates,
} from "@/modules/campaigns/campaignCertificates.store";
import {
    displayCertDate,
    getEstadoPago,
    getKilosAmpliados,
    getKilosTotales,
    getTramiteLabel,
    getVigenciaAutomatica,
    type CertificadoCampanaLocal,
} from "@/modules/campaigns/campaignCertificate.utils";
import { PageError, PageLoading } from "@/shared/components/PageState";
import { formatKg } from "@/shared/utils/format";
import { paginate } from "@/shared/utils/paginate";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; campaign: Campana };
type Panel = "form" | "view" | "expansion" | "payment";
type SuccessMode = "certification" | "expansion" | "certificationPayment";

const periodLabel = (certificate: CertificadoCampanaLocal) =>
    certificate.validoDesde && certificate.validoHasta
        ? `${displayCertDate(certificate.validoDesde)} – ${displayCertDate(certificate.validoHasta)}`
        : "Sin periodo definido";

/** Gestión de las certificaciones de una campaña: lista, registro, edición, detalle, ampliaciones y pagos. */
export default function CampaignCertificationsPage() {
    const { id } = useParams<{ id: string }>();
    const campaniaId = Number(id);
    const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

    const load = useCallback(async () => {
        if (!Number.isInteger(campaniaId) || campaniaId < 1) {
            setLoadState({ status: "error", message: "La campaña no es válida." });
            return;
        }
        setLoadState({ status: "loading" });
        try {
            setLoadState({ status: "ready", campaign: await getCampana(campaniaId) });
        } catch {
            setLoadState({ status: "error", message: "No se pudo cargar la campaña." });
        }
    }, [campaniaId]);

    // Carga inicial desde la API: el estado se actualiza al resolverse la petición.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void load(); }, [load]);

    if (loadState.status !== "ready") {
        return loadState.status === "loading"
            ? <PageLoading label="Cargando certificaciones..." />
            : <PageError title="Certificaciones no disponibles" message={loadState.message} onRetry={() => void load()} back={{ to: "/campaigns", label: "Volver a campañas" }} />;
    }

    return <CertificationsView key={campaniaId} campaign={loadState.campaign} />;
}

function CertificationsView({ campaign }: { campaign: Campana }) {
    const campaniaId = campaign.campaniaId;
    const certificates = useCampaignCertificates(campaniaId);
    const [page, setPage] = useState(1);
    // Se conserva el id al cerrar para que los modales no se vacíen durante su animación de salida
    const [panel, setPanel] = useState<{ open: Panel | null; certificateId: number | null; last: Panel }>({ open: null, certificateId: null, last: "form" });
    const [success, setSuccess] = useState<{ open: boolean; mode: SuccessMode }>({ open: false, mode: "certification" });

    const selected = certificates.find((item) => item.id === panel.certificateId) ?? null;

    const openPanel = (next: Panel, certificateId: number | null = null) => setPanel({ open: next, certificateId, last: next });
    const closePanel = () => setPanel((current) => ({ ...current, open: null }));
    const finish = (mode: SuccessMode) => {
        closePanel();
        setSuccess({ open: true, mode });
    };

    const { pageCount, currentPage, visible: visibleData } = paginate(certificates, page);

    const getRowActions = (certificate: CertificadoCampanaLocal): { primary: RowAction[]; secondary: RowAction[] } => ({
        primary: [
            { label: "Ver detalles", icon: <Eye size={18} strokeWidth={2.5} />, onClick: () => openPanel("view", certificate.id) },
            { label: "Editar", icon: <Pencil size={18} strokeWidth={2.5} />, onClick: () => openPanel("form", certificate.id) },
        ],
        secondary: [
            { label: "Registrar ampliación", icon: <PackagePlus size={16} strokeWidth={2.5} />, onClick: () => openPanel("expansion", certificate.id) },
            { label: "Registrar pago", icon: <Wallet size={16} strokeWidth={2.5} />, onClick: () => openPanel("payment", certificate.id) },
        ],
    });

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            <CampaignContextBanner campaign={campaign} caption="Certificaciones · vigencia, kilos y pagos" />

            <PageHeader
                icon={<ShieldCheck size={24} strokeWidth={2.5} />}
                title="Gestión de Certificaciones"
                description="Registra las certificaciones de la campaña y da seguimiento a su vigencia, kilos y pagos."
                action={
                    certificates.length === 0 ? (
                        <Button size="xl" onClick={() => openPanel("form")}>
                            <Plus size={20} strokeWidth={2.5} /> Registrar certificación
                        </Button>
                    ) : undefined
                }
            />

            <TableCard
                icon={<ShieldCheck size={24} strokeWidth={2.5} />}
                title="Certificaciones de la Campaña"
                description="Consulta el estado de cada certificación; el detalle completo está en Ver detalles."
                headerRight={
                    <TableToolbar>
                        <TableCountPill icon={<ShieldCheck size={16} strokeWidth={2.5} className="text-brand" />} count={certificates.length} singular="certificación" plural="certificaciones" />
                    </TableToolbar>
                }
                isEmpty={certificates.length === 0}
                emptyIcon={<ShieldCheck size={28} strokeWidth={2} />}
                emptyTitle="Aún no hay certificaciones"
                emptyDescription="Esta campaña todavía no tiene certificaciones registradas. Haz clic en 'Registrar certificación' para comenzar."
                emptyAction={{ label: "Registrar certificación", icon: <Plus size={18} strokeWidth={2.5} />, onClick: () => openPanel("form") }}
                page={currentPage}
                pageCount={pageCount}
                onPageChange={setPage}
            >
                {/* Móvil en tarjetas; desde sm, tabla */}
                <div className="flex flex-col gap-3 sm:hidden">
                    {visibleData.map((certificate) => (
                        <TableGridCard
                            key={certificate.id}
                            accentColor="border-l-brand"
                            icon={<ShieldCheck size={18} strokeWidth={2} />}
                            title={certificate.nombre}
                            subtitle={`${certificate.tipo} · ${certificate.organismoEmisor}`}
                            actions={<RowActions {...getRowActions(certificate)} />}
                        >
                            <TableGridCardFields>
                                <TableGridCardField label="Vigencia" value={getVigenciaAutomatica(certificate.validoDesde, certificate.validoHasta)} />
                                <TableGridCardField label="Total actual" value={`${formatKg(getKilosTotales(certificate))} kg`} />
                                <TableGridCardField label="Productores" value={String(certificate.productores.length)} />
                                <TableGridCardField label="Trámite" value={getTramiteLabel(certificate.estadoTramite)} />
                                <TableGridCardField label="Pago" value={getEstadoPago(certificate)} />
                            </TableGridCardFields>
                        </TableGridCard>
                    ))}
                </div>

                <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
                    <Table>
                        <TableHeader className={TABLE_HEAD_BG}>
                            <TableRow className="border-b border-border hover:bg-transparent">
                                <TableHead className="h-14 px-6 font-semibold text-ink">Certificación</TableHead>
                                <TableHead className="h-14 font-semibold text-ink">Vigencia</TableHead>
                                <TableHead className="h-14 font-semibold text-ink">Productores</TableHead>
                                <TableHead className="h-14 font-semibold text-ink">Kilos</TableHead>
                                <TableHead className="h-14 text-center font-semibold text-ink">Trámite</TableHead>
                                <TableHead className="h-14 text-center font-semibold text-ink">Pago</TableHead>
                                <TableHead className="h-14 w-40 px-6 text-center font-semibold text-ink">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleData.map((certificate) => (
                                <TableRow key={certificate.id} className="border-b border-border transition-colors hover:bg-surface-page/60">
                                    <TableCell className="relative h-20 px-6">
                                        <TableRowAccent color="bg-brand" />
                                        <TableRowLead
                                            icon={<ShieldCheck size={20} strokeWidth={2} />}
                                            title={certificate.nombre}
                                            subtitle={`${certificate.tipo} · ${certificate.organismoEmisor}`}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col items-start gap-1.5">
                                            <span className="text-[13px] font-medium text-ink-body">{periodLabel(certificate)}</span>
                                            <StatusBadge status={getVigenciaAutomatica(certificate.validoDesde, certificate.validoHasta)} />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center gap-2 font-medium text-ink-body">
                                            <Users size={16} className="shrink-0 text-ink-muted" />
                                            {certificate.productores.length === 0
                                                ? "Sin productores"
                                                : `${certificate.productores.length} ${certificate.productores.length === 1 ? "productor" : "productores"}`}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-[14px] font-bold tabular-nums text-ink">{formatKg(getKilosTotales(certificate))} kg</span>
                                            <span className="mt-0.5 text-[12px] tabular-nums text-ink-muted">
                                                {formatKg(certificate.kilosIniciales)} inicial · +{formatKg(getKilosAmpliados(certificate))}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-center">
                                            <StatusBadge status={getTramiteLabel(certificate.estadoTramite)} />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-center">
                                            <StatusBadge status={getEstadoPago(certificate)} />
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6">
                                        <RowActions {...getRowActions(certificate)} className="justify-center" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </TableCard>

            <CampaignCertificationFormModal
                open={panel.open === "form"}
                onOpenChange={(open) => !open && closePanel()}
                campaniaId={campaniaId}
                certificate={panel.last === "form" ? selected : null}
                onSave={async (values, productores, archivos) => {
                    // TODO(api): reemplazar por la llamada al servicio cuando exista
                    if (selected && panel.last === "form") await updateCampaignCertificate(campaniaId, selected.id, values, productores, archivos);
                    else await addCampaignCertificate(campaniaId, values, productores, archivos);
                    finish("certification");
                }}
            />

            <CampaignCertificationViewModal
                open={panel.open === "view"}
                onOpenChange={(open) => !open && closePanel()}
                certificate={selected}
            />

            <CampaignCertificationExpansionModal
                open={panel.open === "expansion"}
                onOpenChange={(open) => !open && closePanel()}
                certificate={selected}
                onSave={async (values) => {
                    if (!selected) return;
                    await addCertificateExpansion(campaniaId, selected.id, values);
                    finish("expansion");
                }}
            />

            <CampaignCertificationPaymentModal
                open={panel.open === "payment"}
                onOpenChange={(open) => !open && closePanel()}
                certificate={selected}
                onSave={async (values, evidencia) => {
                    if (!selected) return;
                    await addCertificatePayment(campaniaId, selected.id, values, evidencia);
                    finish("certificationPayment");
                }}
            />

            <CampaignSuccessModal open={success.open} onOpenChange={(open) => setSuccess((current) => ({ ...current, open }))} mode={success.mode} />
        </div>
    );
}
