import { plural } from "@/shared/utils/plural";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Eye, Users, FlaskConical, Tractor, Truck, SearchX, ListFilter, Link, TriangleAlert, RotateCw, UserRoundCheck, Pencil } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import FilterBar, { FilterSearch } from "@/shared/components/FilterBar";
import SegmentedTabs, { type SegmentedTabItem } from "@/shared/components/SegmentedTabs";
import StatusBadge from "@/shared/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
import TableCard from "@/shared/components/TableCard";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import TableGridCard, { TableGridCardFields, TableGridCardField } from "@/shared/components/TableGridCard";
import { TableToolbar, TableCountPill, TableExportMenu, TableViewToggle, type TableViewMode } from "@/shared/components/TableToolbar";
import PageHeader from "@/shared/layout/PageHeader";
import CampaignLinkProviderModal from "@/modules/campaigns/components/CampaignLinkProviderModal";
import CampaignSuccessModal from "@/modules/campaigns/components/CampaignSuccessModal";

import { ContextBannerPlaceholder } from "@/shared/components/ContextBanner";
import CampaignContextBanner from "@/modules/campaigns/components/CampaignContextBanner";
import { useCampaign } from "@/modules/campaigns/useCampaign";
import { getCampaniaProveedoresByCampania } from "@/modules/campaigns/api/campania-proveedor.api";
import type { CampaniaProveedor } from "@/modules/campaigns/api/campania-proveedor.mapper";
import type { TipoProveedorCampania } from "@/modules/campaigns/api/campania-proveedor.dto";
import { formatCampaignNumber } from "@/modules/campaigns/campaignDetails.utils";
import { getCampaignInterviews } from "@/modules/campaigns/campaignInterview.utils";
import { useProviderLocalData } from "@/modules/providers/providerLocalData.store";
import type { TableExport } from "@/shared/utils/exportTable";
import { paginate } from "@/shared/utils/paginate";

const PROVIDER_TABS: readonly SegmentedTabItem[] = [
    { id: "productor", label: "Productor", icon: Tractor },
    { id: "acopio", label: "Acopiador", icon: Truck },
];

const TYPE_LABEL: Record<TipoProveedorCampania, string> = {
    productor: "Productor",
    acopio: "Acopiador",
};

type SuccessMode = "provider";
/** Relación sobre la que está abierto un modal; se conserva al cerrar para no vaciar el modal durante su animación de salida */
type RelationModal = { open: boolean; relation: CampaniaProveedor | null };
const CLOSED: RelationModal = { open: false, relation: null };

const providerName = (row: CampaniaProveedor) => (row.proveedor ? `${row.proveedor.nombres} ${row.proveedor.apellido}` : "Proveedor sin datos");
const providerDocument = (row: CampaniaProveedor) => (row.proveedor ? `${row.proveedor.tipoDocumento} ${row.proveedor.nmrDocumento}` : "—");

export default function CampaignProvidersPage() {
    const { id } = useParams<{ id: string }>();
    const campaniaId = Number(id);
    const isValidCampaign = Number.isInteger(campaniaId) && campaniaId > 0;

    const campaign = useCampaign(campaniaId);
    const onlyCollectors = campaign?.estado === "en proceso";
    const { fincas: providerFincas } = useProviderLocalData();
    const [pickedTab, setPickedTab] = useState<TipoProveedorCampania | null>(null);
    const [firstTabWithData, setFirstTabWithData] = useState<TipoProveedorCampania>("productor");
    const activeTab = pickedTab ?? (onlyCollectors ? "acopio" : firstTabWithData);
    const [relations, setRelations] = useState<CampaniaProveedor[]>([]);
    const [isLoading, setIsLoading] = useState(isValidCampaign);
    const [loadError, setLoadError] = useState<string | null>(isValidCampaign ? null : "La campaña no es válida.");
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [successMode, setSuccessMode] = useState<SuccessMode>("provider");

    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<TableViewMode>("table");
    const [search, setSearch] = useState("");

    const loadRelations = useCallback(async () => {
        if (!isValidCampaign) return;
        try {
            const data = await getCampaniaProveedoresByCampania(campaniaId);
            setRelations(data);
            const withData = PROVIDER_TABS.find((tab) => data.some((row) => row.tipoProveedor === tab.id));
            if (withData) setFirstTabWithData(withData.id as TipoProveedorCampania);
            setLoadError(null);
        } catch {
            setLoadError("No se pudieron cargar los proveedores de la campaña.");
        } finally {
            setIsLoading(false);
        }
    }, [campaniaId, isValidCampaign]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void loadRelations(); }, [loadRelations]);

    const retry = () => {
        setIsLoading(true);
        void loadRelations();
    };

    const hasActiveFilters = search !== "";
    const clearFilters = () => setSearch("");

    const filteredData = useMemo(() => {
        const searchLower = search.trim().toLowerCase();
        return relations.filter((row) => {
            const matchesTab = row.tipoProveedor === activeTab;
            const haystack = `${providerName(row)} ${row.proveedor?.nmrDocumento ?? ""} ${row.proveedor?.zona ?? ""}`.toLowerCase();
            return matchesTab && haystack.includes(searchLower);
        });
    }, [relations, activeTab, search]);

    const evaluationSummary = (row: CampaniaProveedor) => {
        if (row.tipoProveedor === "productor") {
            const interviews = getCampaignInterviews(row.cxpId);
            const registeredFincas = providerFincas[row.proveedorId] ?? [];
            const status = interviews.length > 0 ? "Aprobado" : "Pendiente";
            const caption = `${interviews.length} ${interviews.length === 1 ? "finca entrevistada" : "fincas entrevistadas"} · ${registeredFincas.length} en padrón`;
            return { status, caption };
        }
        const mtd = row.mtdCeratitis != null ? `MTD ${formatCampaignNumber(Number(row.mtdCeratitis))}` : "MTD en evaluación";
        const status = row.mtdCeratitis != null ? "Activo" : "En proceso";
        return { status, caption: mtd };
    };

    const getExportData = (): TableExport => ({
        filename: "proveedores_campana",
        title: "Proveedores de la campaña",
        header: ["Nombre", "Documento", "Zona", "Tipo", "Cantidad (kg)", "Evaluación"],
        rows: filteredData.map((row) => [
            providerName(row),
            providerDocument(row),
            row.proveedor?.zona ?? "",
            TYPE_LABEL[row.tipoProveedor],
            String(row.cantidadProveedor),
            evaluationSummary(row).caption,
        ]),
    });

    const { pageCount, currentPage, visible: visibleData } = paginate(filteredData, page);

    const showSuccess = (mode: SuccessMode) => {
        setSuccessMode(mode);
        setIsSuccessModalOpen(true);
    };

    const [editModal, setEditModal] = useState<RelationModal>(CLOSED);

    const navigate = useNavigate();

    const getRowActions = (row: CampaniaProveedor): { primary: RowAction[]; secondary: RowAction[] } => ({
        primary: [
            { label: "Ver detalles", icon: <Eye size={18} strokeWidth={2.5} />, onClick: () => navigate(`/campaigns/${campaniaId}/providers/${row.cxpId}`) },
            { label: "Editar vínculo", icon: <Pencil size={18} strokeWidth={2.5} />, onClick: () => setEditModal({ open: true, relation: row }) },
        ],
        secondary: [
            { label: "Gestionar exámenes", icon: <FlaskConical size={16} strokeWidth={2.5} />, onClick: () => navigate(`/campaigns/${campaniaId}/providers/${row.cxpId}/exams`) },
            ...(row.tipoProveedor === "productor"
                ? [
                    { label: "Gestionar entrevistas", icon: <UserRoundCheck size={16} strokeWidth={2.5} />, onClick: () => navigate(`/campaigns/${campaniaId}/providers/${row.cxpId}/interviews`) },
                ]
                : []),
        ],
    });

    const accentFor = (row: CampaniaProveedor) => (row.tipoProveedor === "productor" ? "bg-brand" : "bg-status-neutral");
    const iconFor = (row: CampaniaProveedor, size: number) =>
        row.tipoProveedor === "productor" ? <Tractor size={size} strokeWidth={2} /> : <Truck size={size} strokeWidth={2} />;

    const emptyState = isLoading
        ? { icon: <Spinner className="size-7" />, title: "Cargando proveedores", description: "Consultando los proveedores vinculados a esta campaña.", action: undefined }
        : loadError
            ? {
                icon: <TriangleAlert size={28} strokeWidth={2} />,
                title: "No se pudieron cargar los proveedores",
                description: loadError,
                action: isValidCampaign ? { label: "Reintentar", icon: <RotateCw size={18} strokeWidth={2.5} />, onClick: retry, tone: "secondary" as const } : undefined,
            }
            : {
                icon: <SearchX size={28} strokeWidth={2} />,
                title: hasActiveFilters ? "Sin resultados" : "Aún no hay proveedores vinculados",
                description: hasActiveFilters
                    ? "Ningún proveedor coincide con los filtros aplicados. Prueba ajustándolos."
                    : "Cuando vincules un proveedor a esta campaña aparecerá acá.",
                action: hasActiveFilters
                    ? { label: "Limpiar filtros", icon: <ListFilter size={18} strokeWidth={2.5} />, onClick: clearFilters, tone: "secondary" as const }
                    : undefined,
            };

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            {campaign === undefined ? <ContextBannerPlaceholder /> : campaign && (
                <CampaignContextBanner
                    campaign={campaign}
                    caption="Proveedores · productores y acopiadores"
                    stats={PROVIDER_TABS.map((tab) => {
                        const count = relations.filter((row) => row.tipoProveedor === tab.id).length;
                        return { label: plural(count, tab.label.toLowerCase(), `${tab.label.toLowerCase()}es`), value: String(count) };
                    })}
                />
            )}

            <PageHeader
                icon={<Users size={24} strokeWidth={2.5} />}
                title="Proveedores de la Campaña"
                description={onlyCollectors ? "En ejecución solo se pueden vincular acopiadores." : "Gestiona los productores y acopiadores vinculados a esta campaña."}
                action={
                    <Button size="xl" onClick={() => setIsLinkModalOpen(true)} disabled={!isValidCampaign || !campaign}>
                        <Link size={20} strokeWidth={2.5} /> {onlyCollectors ? "Vincular acopiador" : "Vincular proveedor"}
                    </Button>
                }
            />

            <SegmentedTabs
                tabs={PROVIDER_TABS.map((tab) => ({ ...tab, count: relations.filter((row) => row.tipoProveedor === tab.id).length }))}
                value={activeTab}
                onChange={(val) => { setPickedTab(val as TipoProveedorCampania); setPage(1); }}
                className="mb-8"
            />

            <FilterBar onClear={clearFilters} canClear={hasActiveFilters} className="mb-8">
                <FilterSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Buscar por nombre, documento o zona..." />
            </FilterBar>

            <TableCard
                icon={<Users size={24} strokeWidth={2.5} />}
                title={activeTab === "productor" ? "Productores Vinculados" : "Acopiadores Vinculados"}
                description="Gestiona, consulta y da seguimiento a los proveedores de esta campaña."
                headerRight={
                    <TableToolbar>
                        <TableCountPill icon={<Users size={16} strokeWidth={2.5} className="text-brand" />} count={filteredData.length} singular="proveedor" plural="proveedores" />
                        <TableExportMenu getData={getExportData} />
                        <TableViewToggle value={viewMode} onChange={setViewMode} />
                    </TableToolbar>
                }
                isEmpty={isLoading || loadError !== null || visibleData.length === 0}
                emptyIcon={emptyState.icon}
                emptyTitle={emptyState.title}
                emptyDescription={emptyState.description}
                emptyAction={emptyState.action}
                page={currentPage}
                pageCount={pageCount}
                onPageChange={setPage}
            >
                <div className={`flex flex-col gap-3 ${viewMode === "grid" ? "sm:grid sm:grid-cols-2 lg:grid-cols-3" : "sm:hidden"}`}>
                    {visibleData.map((row) => {
                        const evalInfo = evaluationSummary(row);
                        return (
                            <TableGridCard
                                key={row.cxpId}
                                accentColor={row.tipoProveedor === "productor" ? "border-l-brand" : "border-l-status-neutral"}
                                icon={iconFor(row, 18)}
                                title={providerName(row)}
                                subtitle={providerDocument(row)}
                                badge={<StatusBadge status={evalInfo.status} />}
                                actions={<RowActions className="justify-center" {...getRowActions(row)} />}
                            >
                                <TableGridCardFields>
                                    <TableGridCardField label="Zona" value={row.proveedor?.zona || "—"} />
                                    <TableGridCardField label="Cantidad" value={`${formatCampaignNumber(Number(row.cantidadProveedor))} kg`} />
                                    <TableGridCardField label="Fincas / Evaluación" value={evalInfo.caption} />
                                </TableGridCardFields>
                            </TableGridCard>
                        );
                    })}
                </div>

                {viewMode === "table" && (
                    <div className="hidden sm:block rounded-xl overflow-hidden border border-border">
                        <Table>
                            <TableHeader className={TABLE_HEAD_BG}>
                                <TableRow className="border-b border-border hover:bg-transparent">
                                    <TableHead className="text-ink font-semibold h-14 px-6">Nombres</TableHead>
                                    <TableHead className="text-ink font-semibold h-14">Zona</TableHead>
                                    <TableHead className="text-ink font-semibold h-14">Tipo de Proveedor</TableHead>
                                    <TableHead className="text-ink font-semibold h-14">Cantidad estimada</TableHead>
                                    <TableHead className="text-ink font-semibold h-14">Fincas / Evaluación</TableHead>
                                    <TableHead className="text-ink font-semibold h-14 text-center px-6 w-36">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visibleData.map((row) => {
                                    const evalInfo = evaluationSummary(row);
                                    return (
                                        <TableRow key={row.cxpId} className="border-b border-border hover:bg-surface-page/60">
                                            <TableCell className="h-20 px-6 relative">
                                                <TableRowAccent color={accentFor(row)} />
                                                <TableRowLead icon={iconFor(row, 18)} title={providerName(row)} subtitle={providerDocument(row)} />
                                            </TableCell>
                                            <TableCell className="text-ink-body font-medium">{row.proveedor?.zona || "—"}</TableCell>
                                            <TableCell className="text-ink-body font-medium">{TYPE_LABEL[row.tipoProveedor]}</TableCell>
                                            <TableCell className="text-ink-body font-medium">{formatCampaignNumber(Number(row.cantidadProveedor))} kg</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col items-start gap-1">
                                                    <StatusBadge status={evalInfo.status} />
                                                    <span className="text-[11.5px] font-medium text-ink-muted">{evalInfo.caption}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6">
                                                <RowActions className="justify-center text-ink-muted" {...getRowActions(row)} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </TableCard>

            <CampaignLinkProviderModal
                mode="create"
                onlyCollectors={onlyCollectors}
                open={isLinkModalOpen}
                campaniaId={isValidCampaign ? campaniaId : null}
                onOpenChange={setIsLinkModalOpen}
                onSave={(type) => {
                    if (type) setPickedTab(type);
                    setPage(1);
                    setIsLinkModalOpen(false);
                    showSuccess("provider");
                    void loadRelations();
                }}
                onRefresh={() => void loadRelations()}
            />

            <CampaignLinkProviderModal
                mode="edit"
                onlyCollectors={onlyCollectors}
                open={editModal.open}
                initialData={editModal.relation}
                campaniaId={isValidCampaign ? campaniaId : null}
                onOpenChange={(open) => setEditModal((current) => ({ ...current, open }))}
                onSave={(type) => {
                    if (type) setPickedTab(type);
                    setPage(1);
                    setEditModal((current) => ({ ...current, open: false }));
                    showSuccess("provider");
                    void loadRelations();
                }}
                onRefresh={() => void loadRelations()}
            />

            <CampaignSuccessModal
                open={isSuccessModalOpen}
                onOpenChange={setIsSuccessModalOpen}
                mode={successMode}
            />
        </div>
    );
}
