import { useMemo, useState } from "react";
import {
    Calendar,
    ClipboardCheck,
    Eye,
    FileText,
    Layers,
    ListFilter,
    PackageCheck,
    SearchX,
    ShieldCheck,
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table";
import StatusBadge from "@/shared/components/StatusBadge";
import TableCard from "@/shared/components/TableCard";
import { TABLE_HEAD_BG, TableRowLead } from "@/shared/components/DataTableRow";
import TableGridCard from "@/shared/components/TableGridCard";
import {
    TableCountPill,
    TableExportMenu,
    TableToolbar,
    TableViewToggle,
    type TableViewMode,
} from "@/shared/components/TableToolbar";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
import SortableHead from "@/shared/components/SortableHead";
import { nextSort, type SortState } from "@/shared/utils/tableSort";
import { formatDisplayDate, formatKg } from "@/shared/utils/format";
import { paginate } from "@/shared/utils/paginate";
import type { TableExport } from "@/shared/utils/exportTable";
import { getCampaignFruitVisual } from "@/modules/campaigns/campaignFruit";
import { useQualityDeliveryLoads } from "@/modules/quality/qualityOperations.store";
import type { QualityCampaign, QualityScope } from "@/modules/quality/quality.utils";

type SortKey = "nombre" | "fruta" | "inicio";

interface QualityTableProps {
    data: QualityCampaign[];
    scope: QualityScope;
    isLoading?: boolean;
    hasActiveFilters: boolean;
    onClearFilters: () => void;
    onViewDetails: (campaign: QualityCampaign) => void;
    onSelectAction: (actionId: "analisis" | "carga" | "guias", campaign: QualityCampaign) => void;
}

export default function QualityTable({
    data,
    scope,
    isLoading = false,
    hasActiveFilters,
    onClearFilters,
    onViewDetails,
    onSelectAction,
}: QualityTableProps) {
    const [sort, setSort] = useState<SortState<SortKey> | null>(null);
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<TableViewMode>("table");
    const qualityLoads = useQualityDeliveryLoads();

    const campaignMetricsFor = (row: QualityCampaign) => {
        const cLoads = qualityLoads.filter((item) => item.campaniaId === row.id && item.scope === scope);
        const cGuidesCount = cLoads.reduce((sum, item) => sum + item.guiasRemision.length, 0);
        const totalKg = cLoads.reduce(
            (sum, item) => sum + item.proveedoresCarga.reduce((acc, p) => acc + p.kilosCargados, 0),
            0,
        );
        const approvedCount = cLoads.filter((item) => item.estadoRevision === "Aprobada para cosecha").length;
        return {
            reviewsLabel: scope === "exportador" ? `${approvedCount}/${cLoads.length} aprobadas` : "Ingreso directo",
            loadsLabel: `${cLoads.length} ${cLoads.length === 1 ? "carga" : "cargas"} · ${formatKg(totalKg)} kg`,
            guidesLabel: `${cGuidesCount} ${cGuidesCount === 1 ? "guía SUNAT" : "guías SUNAT"}`,
        };
    };

    const sortedData = useMemo(() => {
        if (!sort) return data;
        const factor = sort.direction === "asc" ? 1 : -1;
        return [...data].sort((a, b) => {
            if (sort.key === "inicio") return a.fechaInicio.localeCompare(b.fechaInicio) * factor;
            if (sort.key === "fruta") return a.fruta.localeCompare(b.fruta, "es") * factor;
            return a.nombre.localeCompare(b.nombre, "es") * factor;
        });
    }, [data, sort]);

    const toggleSort = (key: SortKey) => {
        setPage(1);
        setSort((current) => nextSort(current, key));
    };

    const getExportData = (): TableExport => ({
        filename: `cosecha_control_calidad_${scope}`,
        title: `Cosecha y Control de Calidad — ${scope === "exportador" ? "Exportador" : "Industria"}`,
        header: ["Campaña", "Fruta", "Inicio", "Fin", "Cosecha / Cargas", "Guías SUNAT", "Estado de campaña"],
        rows: sortedData.map((row) => {
            const m = campaignMetricsFor(row);
            return [
                row.nombre,
                row.fruta,
                formatDisplayDate(row.fechaInicio),
                formatDisplayDate(row.fechaFin),
                m.loadsLabel,
                m.guidesLabel,
                row.estado,
            ];
        }),
    });

    const getRowActions = (row: QualityCampaign): { primary: RowAction[]; secondary: RowAction[] } => {
        const primary: RowAction[] = [
            {
                label: "Ver detalles",
                icon: <Eye size={18} strokeWidth={2.2} />,
                onClick: () => onViewDetails(row),
            },
        ];

        const secondary: RowAction[] = [];

        if (scope === "exportador") {
            secondary.push({
                label: "Análisis y revisión",
                icon: <ClipboardCheck size={16} strokeWidth={2.2} />,
                onClick: () => onSelectAction("analisis", row),
            });
        }

        secondary.push(
            {
                label: "Carga",
                icon: <PackageCheck size={16} strokeWidth={2.2} />,
                onClick: () => onSelectAction("carga", row),
            },
            {
                label: "Guías de remisión",
                icon: <FileText size={16} strokeWidth={2.2} />,
                onClick: () => onSelectAction("guias", row),
            },
        );

        return { primary, secondary };
    };

    const { pageCount, currentPage, visible: visibleData } = paginate(sortedData, page);

    const emptyState = {
        icon: <SearchX size={28} strokeWidth={2} />,
        title: hasActiveFilters ? "Sin resultados" : "Aún no hay campañas registradas",
        description: hasActiveFilters
            ? "Ninguna campaña coincide con los filtros aplicados. Prueba ajustándolos o limpiándolos."
            : `Cuando agregues una campaña al alcance ${scope === "exportador" ? "Exportador" : "Industria"}, aparecerá acá.`,
        action: hasActiveFilters
            ? {
                label: "Limpiar filtros",
                icon: <ListFilter size={18} strokeWidth={2.5} />,
                onClick: onClearFilters,
                tone: "secondary" as const,
            }
            : undefined,
    };

    return (
        <TableCard
            icon={<ShieldCheck size={24} strokeWidth={2.5} />}
            title="Campañas en Cosecha y Calidad"
            description="Gestiona, consulta y da seguimiento a los análisis, cargas y guías de remisión de tus campañas."
            headerRight={
                <TableToolbar>
                    <TableCountPill
                        icon={<Layers size={16} strokeWidth={2.5} className="text-brand" />}
                        count={sortedData.length}
                        singular="campaña"
                        plural="campañas"
                    />
                    <TableExportMenu getData={getExportData} />
                    <TableViewToggle value={viewMode} onChange={setViewMode} />
                </TableToolbar>
            }
            isEmpty={isLoading || visibleData.length === 0}
            emptyIcon={emptyState.icon}
            emptyTitle={emptyState.title}
            emptyDescription={emptyState.description}
            emptyAction={emptyState.action}
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
        >
            {/* Grid / Mobile Cards */}
            <div className={`flex flex-col gap-3 ${viewMode === "grid" ? "sm:grid sm:grid-cols-2 lg:grid-cols-3" : "sm:hidden"}`}>
                {visibleData.map((row) => {
                    const fruit = getCampaignFruitVisual(row.nombre, row.fruta);
                    const m = campaignMetricsFor(row);
                    return (
                        <TableGridCard
                            key={row.id}
                            icon={
                                <img
                                    src={fruit.image}
                                    alt={fruit.alt}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            }
                            title={row.nombre}
                            subtitle={`Fruta: ${row.fruta}`}
                            badge={<StatusBadge status={row.estado} />}
                            actions={<RowActions {...getRowActions(row)} />}
                        >
                            <div className="mx-4 flex flex-col gap-2 rounded-lg bg-surface-page border border-border p-3">
                                <div className="flex items-center gap-2.5">
                                    <Calendar size={16} strokeWidth={2.5} className="text-ink-muted shrink-0" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Periodo</span>
                                        <span className="text-[12px] font-semibold text-ink">
                                            {formatDisplayDate(row.fechaInicio)} → {formatDisplayDate(row.fechaFin)}
                                        </span>
                                    </div>
                                </div>
                                <div className="h-px w-full bg-border" />
                                <div className="flex items-center justify-between text-[12px]">
                                    <span className="font-medium text-ink-muted">{scope === "exportador" ? "Revisión:" : "Ingreso:"}</span>
                                    <span className="font-semibold text-ink">{m.reviewsLabel}</span>
                                </div>
                                <div className="flex items-center justify-between text-[12px]">
                                    <span className="font-medium text-ink-muted">Cargas registradas:</span>
                                    <span className="font-semibold text-ink">{m.loadsLabel}</span>
                                </div>
                                <div className="flex items-center justify-between text-[12px]">
                                    <span className="font-medium text-ink-muted">Guías de remisión:</span>
                                    <span className="font-semibold text-ink">{m.guidesLabel}</span>
                                </div>
                            </div>
                        </TableGridCard>
                    );
                })}
            </div>

            {/* Desktop Table */}
            <div className={`hidden ${viewMode === "table" ? "sm:block" : "hidden"} overflow-x-auto`}>
                <Table>
                    <TableHeader className={TABLE_HEAD_BG}>
                        <TableRow className="border-b border-border hover:bg-transparent">
                            <SortableHead label="Campaña" sortKey="nombre" sort={sort} onToggle={toggleSort} className="h-14" />
                            <SortableHead label="Fruta" sortKey="fruta" sort={sort} onToggle={toggleSort} className="h-14" />
                            <SortableHead label="Inicio / Fin" sortKey="inicio" sort={sort} onToggle={toggleSort} className="h-14" />
                            <TableHead className="h-14 font-semibold text-ink">
                                {scope === "exportador" ? "Revisión MTD / Cargas" : "Cargas Industria"}
                            </TableHead>
                            <TableHead className="h-14 font-semibold text-ink">
                                Guías SUNAT
                            </TableHead>
                            <TableHead className="h-14 font-semibold text-ink">
                                Estado de campaña
                            </TableHead>
                            <TableHead className="h-14 w-44 px-6 text-center font-semibold text-ink">
                                Acciones
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visibleData.map((row) => {
                            const fruit = getCampaignFruitVisual(row.nombre, row.fruta);
                            const m = campaignMetricsFor(row);
                            return (
                                <TableRow key={row.id} className="border-b border-border hover:bg-surface-page/60 transition-colors">
                                    <TableCell className="h-20">
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
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium text-ink-body">
                                        {row.fruta}
                                    </TableCell>
                                    <TableCell className="font-medium text-ink-body tabular-nums">
                                        {formatDisplayDate(row.fechaInicio)} → {formatDisplayDate(row.fechaFin)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-semibold text-ink">{m.loadsLabel}</span>
                                            <span className="mt-0.5 text-[11.5px] font-medium text-ink-muted">{m.reviewsLabel}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-ink-body">
                                        {m.guidesLabel}
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={row.estado} />
                                    </TableCell>
                                    <TableCell className="px-6 text-center">
                                        <RowActions {...getRowActions(row)} />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </TableCard>
    );
}
