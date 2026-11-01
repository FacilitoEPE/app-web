import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Pencil, Eye, Trash2, Contact, Layers, Briefcase, ShieldCheck, Truck, Calendar, CalendarRange, Package, PackageCheck, ListFilter, TriangleAlert, RotateCw, SearchX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Spinner } from "@/shared/components/ui/spinner";
import StatusBadge from "@/shared/components/StatusBadge";
import TableCard from "@/shared/components/TableCard";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import TableGridCard from "@/shared/components/TableGridCard";
import { TableToolbar, TableCountPill, TableExportMenu, TableViewToggle, type TableViewMode } from "@/shared/components/TableToolbar";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
import SortableHead from "@/shared/components/SortableHead";
import { nextSort, type SortState } from "@/shared/utils/tableSort";
import ConfirmModal from "@/shared/components/ConfirmModal";
import CampaignFormModal from "@/modules/campaigns/components/CampaignFormModal";
import CampaignSuccessModal from "@/modules/campaigns/components/CampaignSuccessModal";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";
import type { CampanaEstado } from "@/modules/campaigns/api/campaign.dto";
import { getCampaignFruitVisual } from "@/modules/campaigns/campaignFruit";
import { formatCampaignNumber, getCampaignDurationLabel } from "@/modules/campaigns/campaignDetails.utils";
import type { TableExport } from "@/shared/utils/exportTable";
import { paginate } from "@/shared/utils/paginate";

type SortKey = "nombre" | "inicio" | "kilos";

/** Texto visible de cada estado del backend */
const STATUS_LABEL: Record<CampanaEstado, string> = {
    planificacion: "Planificado",
    "en proceso": "En ejecución",
    terminado: "Terminado",
};

/** Color del acento decorativo lateral por estado, para la barra de la tabla desktop */
const STATUS_ACCENT_COLORS: Record<CampanaEstado, string> = {
    planificacion: "bg-brand",
    "en proceso": "bg-status-warning",
    terminado: "bg-status-neutral",
};

/** Mismo acento que STATUS_ACCENT_COLORS, como borde izquierdo para las tarjetas móvil/grilla */
const STATUS_ACCENT_BORDER: Record<CampanaEstado, string> = {
    planificacion: "border-l-brand",
    "en proceso": "border-l-status-warning",
    terminado: "border-l-status-neutral",
};

const toDisplayDate = (date: Date) => format(date, "dd/MM/yyyy");
const durationLabel = (row: Campana) => getCampaignDurationLabel(toDisplayDate(row.fechaInicio), toDisplayDate(row.fechaFin));
const campaignCode = (row: Campana) => `CAM-${row.fechaInicio.getFullYear()}-${String(row.campaniaId).padStart(3, "0")}`;

interface CampaignTableProps {
    /** Campañas ya filtradas por la página (estado, búsqueda y fechas) */
    data: Campana[];
    isLoading: boolean;
    loadError: string | null;
    onRetry: () => void;
    /** Se llama cuando una acción de la tabla cambia datos en el backend, para recargar la página */
    onChanged: () => void;
    /** Elimina la campaña; la página muestra el error si el backend la rechaza (p. ej. por tener vínculos) */
    onDelete: (campaign: Campana) => Promise<void>;
    hasActiveFilters: boolean;
    onClearFilters: () => void;
}

export default function CampaignTable({ data, isLoading, loadError, onRetry, onChanged, onDelete, hasActiveFilters, onClearFilters }: CampaignTableProps) {
    const navigate = useNavigate();
    const [editingCampaignId, setEditingCampaignId] = useState<number | null>(null);
    // Se conserva la campaña al cerrar para que el modal no se vacíe durante su animación de salida
    const [deleting, setDeleting] = useState<{ open: boolean; campaign: Campana | null }>({ open: false, campaign: null });
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [sort, setSort] = useState<SortState<SortKey> | null>(null);
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<TableViewMode>("table");

    const sortedData = useMemo(() => {
        if (!sort) return data;
        const factor = sort.direction === "asc" ? 1 : -1;
        return [...data].sort((a, b) => {
            if (sort.key === "kilos") return (a.requerimientoComercial - b.requerimientoComercial) * factor;
            if (sort.key === "inicio") return (a.fechaInicio.getTime() - b.fechaInicio.getTime()) * factor;
            return a.nombre.localeCompare(b.nombre, "es") * factor;
        });
    }, [data, sort]);

    const toggleSort = (key: SortKey) => {
        setPage(1);
        setSort((current) => nextSort(current, key));
    };

    /** Lo que exporta la tabla: las filas visibles con los filtros aplicados */
    const getExportData = (): TableExport => ({
        filename: "campanas_exportacion",
        title: "Campañas de exportación",
        header: ["Campaña", "Código", "Fruta", "Fecha Inicio", "Fecha Fin", "Periodo", "Kilos", "Estado"],
        rows: sortedData.map((row) => [
                row.nombre,
                campaignCode(row),
                row.fruta?.name ?? "",
                toDisplayDate(row.fechaInicio),
                toDisplayDate(row.fechaFin),
                durationLabel(row),
                String(row.requerimientoComercial),
                STATUS_LABEL[row.estado],
            ]),
    });

    /** Ver detalles y Editar quedan siempre visibles (en el orden de todas las tablas); el resto va en "más opciones" */
    const getRowActions = (row: Campana) => {
        const primary: RowAction[] = [];
        const secondary: RowAction[] = [];

        primary.push({ label: "Ver detalles", icon: <Eye size={18} strokeWidth={2.5} />, onClick: () => navigate(`/campaigns/${row.campaniaId}`) });
        if (row.estado === "planificacion") {
            primary.push({ label: "Editar", icon: <Pencil size={18} strokeWidth={2.5} />, onClick: () => setEditingCampaignId(row.campaniaId) });
            // Solo una campaña que aún no empieza se puede eliminar: las demás ya tienen operación registrada
            primary.push({ label: "Eliminar", icon: <Trash2 size={18} strokeWidth={2.5} />, variant: "destructive", onClick: () => setDeleting({ open: true, campaign: row }) });
        }

        if (row.estado === "planificacion") {
            secondary.push({ label: "Ver proveedores", icon: <Briefcase size={16} strokeWidth={2.5} />, onClick: () => navigate(`/campaigns/${row.campaniaId}/providers`) });
            secondary.push({ label: "Vincular clientes", icon: <Contact size={16} strokeWidth={2.5} />, onClick: () => navigate(`/campaigns/${row.campaniaId}/clients`) });
            // Las certificaciones solo tienen sentido mientras la campaña se está planificando
            secondary.push({ label: "Gestionar certificaciones", icon: <ShieldCheck size={16} strokeWidth={2.5} />, onClick: () => navigate(`/campaigns/${row.campaniaId}/certifications`) });
        }
        // Transporte y entregas solo aplican una vez que la campaña está en ejecución; los proveedores se siguen
        // gestionando, pero ahí solo se vinculan acopiadores
        if (row.estado === "en proceso") {
            secondary.push({ label: "Ver proveedores", icon: <Briefcase size={16} strokeWidth={2.5} />, onClick: () => navigate(`/campaigns/${row.campaniaId}/providers`) });
            secondary.push({ label: "Transportistas", icon: <Truck size={16} strokeWidth={2.5} />, onClick: () => navigate(`/campaigns/${row.campaniaId}/carriers`) });
            secondary.push({ label: "Entregas", icon: <PackageCheck size={16} strokeWidth={2.5} />, onClick: () => navigate(`/campaigns/${row.campaniaId}/deliveries`) });
            secondary.push({ label: "Programa semanal de entregas", icon: <CalendarRange size={16} strokeWidth={2.5} />, onClick: () => navigate(`/campaigns/${row.campaniaId}/weekly-delivery-program`) });
        }

        return { primary, secondary };
    };

    const showSuccess = () => setIsSuccessModalOpen(true);

    const { pageCount, currentPage, visible: visibleData } = paginate(sortedData, page);

    // El marco de la tabla se mantiene siempre; carga y error ocupan el lugar del estado vacío
    const emptyState = isLoading
        ? { icon: <Spinner className="size-7" />, title: "Cargando campañas", description: "Consultando las campañas registradas.", action: undefined }
        : loadError
            ? {
                icon: <TriangleAlert size={28} strokeWidth={2} />,
                title: "No se pudieron cargar las campañas",
                description: loadError,
                action: { label: "Reintentar", icon: <RotateCw size={18} strokeWidth={2.5} />, onClick: onRetry, tone: "secondary" as const },
            }
            : {
                icon: <SearchX size={28} strokeWidth={2} />,
                title: hasActiveFilters ? "Sin resultados" : "Aún no hay campañas",
                description: hasActiveFilters
                    ? "Ninguna campaña coincide con los filtros aplicados. Prueba ajustándolos."
                    : "Cuando registres tu primera campaña de exportación aparecerá acá.",
                action: hasActiveFilters
                    ? { label: "Limpiar filtros", icon: <ListFilter size={18} strokeWidth={2.5} />, onClick: onClearFilters, tone: "secondary" as const }
                    : undefined,
            };

    return (
        <>
            <TableCard
                icon={<Layers size={24} strokeWidth={2.5} />}
                title="Campañas de Exportación"
                description="Gestiona, consulta y da seguimiento a todas tus campañas registradas."
                headerRight={
                    <TableToolbar>
                        <TableCountPill icon={<Layers size={16} strokeWidth={2.5} className="text-brand" />} count={sortedData.length} singular="campaña" plural="campañas" />
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
                {/* ─── Mobile / Grid Cards ─── */}
                <div className={`flex flex-col gap-3 ${viewMode === "grid" ? "sm:grid sm:grid-cols-2 lg:grid-cols-3" : "sm:hidden"}`}>
                    {visibleData.map((row) => {
                        const fruit = getCampaignFruitVisual(row.nombre, row.fruta?.name);
                        return (
                            <TableGridCard
                                key={row.campaniaId}
                                accentColor={STATUS_ACCENT_BORDER[row.estado]}
                                icon={
                                    <img
                                        src={fruit.image}
                                        alt={fruit.alt}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                }
                                title={row.nombre}
                                subtitle={campaignCode(row)}
                                badge={<StatusBadge status={STATUS_LABEL[row.estado]} />}
                                actions={<RowActions {...getRowActions(row)} />}
                            >
                                <div className="mx-4 flex flex-col gap-3 rounded-lg bg-surface-page border border-border p-3.5">
                                    <div className="flex items-center gap-3">
                                        <Calendar size={18} strokeWidth={2.5} className="text-ink-muted shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-0.5">Periodo</span>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[13px] font-semibold text-ink">{toDisplayDate(row.fechaInicio)} – {toDisplayDate(row.fechaFin)}</span>
                                                <span className="text-[12px]">• {durationLabel(row)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-px w-full bg-border" />

                                    <div className="flex items-center gap-3">
                                        <Package size={18} strokeWidth={2.5} className="text-ink-muted shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-0.5">Requerimiento Comercial</span>
                                            <span className="text-[13px] font-semibold text-ink">{formatCampaignNumber(row.requerimientoComercial)} Kilos</span>
                                        </div>
                                    </div>
                                </div>
                            </TableGridCard>
                        );
                    })}
                </div>

                {/* ─── Desktop Table ─── */}
                {viewMode === "table" && (
                    <div className="hidden sm:block rounded-xl overflow-hidden border border-border">
                        <Table className="table-fixed w-full">
                            <TableHeader className={TABLE_HEAD_BG}>
                                <TableRow className="border-b border-border hover:bg-transparent">
                                    <SortableHead label="Campaña" sortKey="nombre" sort={sort} onToggle={toggleSort} className="px-6" />
                                    <SortableHead label="Periodo" sortKey="inicio" sort={sort} onToggle={toggleSort} className="w-[25%]" />
                                    <SortableHead label="Req. Comercial" sortKey="kilos" sort={sort} onToggle={toggleSort} className="w-[15%]" />
                                    <TableHead className="text-ink font-semibold h-14 w-[15%] text-center">Estado</TableHead>
                                    <TableHead className="text-ink font-semibold h-14 w-56 text-center px-6">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visibleData.map((row) => {
                                    const fruit = getCampaignFruitVisual(row.nombre, row.fruta?.name);
                                    return (
                                        <TableRow key={row.campaniaId} className="border-b border-border hover:bg-surface-page/60 transition-colors">
                                            <TableCell className="h-20 px-6 relative">
                                                <TableRowAccent color={STATUS_ACCENT_COLORS[row.estado]} />
                                                <TableRowLead
                                                    icon={
                                                        <img
                                                            src={fruit.image}
                                                            alt={fruit.alt}
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    }
                                                    title={row.nombre}
                                                    subtitle={row.fruta?.name ? `${row.fruta.name} · ${campaignCode(row)}` : campaignCode(row)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Calendar size={18} strokeWidth={2} className="text-ink-muted shrink-0" />
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-[13.5px] text-ink-body leading-tight">{toDisplayDate(row.fechaInicio)} – {toDisplayDate(row.fechaFin)}</span>
                                                        <span className="text-[12.5px] font-medium mt-1">{durationLabel(row)}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Package size={18} strokeWidth={2} className="text-ink-muted shrink-0" />
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-[13.5px] text-ink-body leading-tight">{formatCampaignNumber(row.requerimientoComercial)}</span>
                                                        <span className="text-[12.5px] font-medium mt-1">Kilos</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex justify-center">
                                                    <StatusBadge status={STATUS_LABEL[row.estado]} />
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 text-center">
                                                <RowActions {...getRowActions(row)} className="justify-center text-ink-muted" />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </TableCard>

            <CampaignFormModal
                open={editingCampaignId !== null}
                onOpenChange={(open) => !open && setEditingCampaignId(null)}
                mode="edit"
                campaniaId={editingCampaignId}
                onSuccess={() => {
                    setEditingCampaignId(null);
                    showSuccess();
                    onChanged();
                }}
            />

            <ConfirmModal
                open={deleting.open}
                onOpenChange={(open) => setDeleting((current) => ({ ...current, open }))}
                icon={<Trash2 size={28} strokeWidth={2.25} />}
                title="¿Eliminar campaña?"
                description={<>Se eliminará <strong className="font-bold text-ink">{deleting.campaign?.nombre}</strong>. Esta acción no se puede deshacer.</>}
                confirmLabel="Sí, eliminar"
                onConfirm={() => { if (deleting.campaign) void onDelete(deleting.campaign); }}
            />

            <CampaignSuccessModal
                open={isSuccessModalOpen}
                onOpenChange={setIsSuccessModalOpen}
                mode="edit"
            />
        </>
    );
}
