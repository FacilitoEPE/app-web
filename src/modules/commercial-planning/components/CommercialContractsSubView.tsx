import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Building2,
    Eye,
    FileSpreadsheet,
    FolderKanban,
    PackageCheck,
    Scale,
    Sprout,
} from "lucide-react";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import FilterBar, { FilterSearch } from "@/shared/components/FilterBar";
import MetricCards, { type Metric } from "@/shared/components/MetricCards";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
import StatusBadge from "@/shared/components/StatusBadge";
import TableCard from "@/shared/components/TableCard";
import TableGridCard, { TableGridCardField, TableGridCardFields } from "@/shared/components/TableGridCard";
import {
    TableCountPill,
    TableExportMenu,
    TableToolbar,
    TableViewToggle,
    type TableViewMode,
} from "@/shared/components/TableToolbar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table";
import type { TableExport } from "@/shared/utils/exportTable";
import { formatDisplayDate, formatKg } from "@/shared/utils/format";
import { PageError } from "@/shared/components/PageState";
import { paginate } from "@/shared/utils/paginate";
import { getCampanas } from "@/modules/campaigns/api/campaign.api";
import { getClientesNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.api";
import { useCampaignContractRecords } from "@/modules/campaigns/campaignClientContracts.store";
import { useCampaignDeliveryRecords } from "@/modules/campaigns/campaignContractDeliveries.store";
import CommercialClientCampaignDetailModal, {
    type CommercialParticipationRow,
} from "@/modules/commercial-planning/components/CommercialClientCampaignDetailModal";


export default function CommercialContractsSubView() {
    const navigate = useNavigate();
    const contractRecords = useCampaignContractRecords();
    const deliveryRecords = useCampaignDeliveryRecords();

    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);
    const [apiRows, setApiRows] = useState<CommercialParticipationRow[]>([]);
    const [search, setSearch] = useState("");
    const [campaignFilter, setCampaignFilter] = useState("all");
    const [clientFilter, setClientFilter] = useState("all");
    const [viewMode, setViewMode] = useState<TableViewMode>("table");
    const [page, setPage] = useState(1);
    const [detailModal, setDetailModal] = useState<{
        open: boolean;
        participation: CommercialParticipationRow | null;
    }>({
        open: false,
        participation: null,
    });

    useEffect(() => {
        let active = true;
        void getCampanas()
            .then(async (campanas) => {
                const collected: CommercialParticipationRow[] = [];
                for (const campana of campanas) {
                    const rels = await getClientesNegocioCampana(campana.campaniaId);
                    for (const rel of rels) {
                        const contracts =
                            contractRecords[`${campana.campaniaId}:${rel.clienteNegocioCampanaId}`] ?? [];
                        const deliveries = contracts.flatMap((c) =>
                            (
                                deliveryRecords[
                                    `${campana.campaniaId}:${rel.clienteNegocioCampanaId}:${c.id}`
                                ] ?? []
                            ).map((d) => ({
                                contractId: c.id,
                                contractName: c.archivo?.name ?? "Sin adjunto",
                                delivery: d,
                            })),
                        );
                        const acordados = contracts.reduce((s, c) => s + c.cantidadPropuestaKg, 0);
                        collected.push({
                            id: `${campana.campaniaId}-${rel.clienteNegocioCampanaId}`,
                            campaniaId: campana.campaniaId,
                            campaniaNombre: campana.nombre,
                            fruta: campana.fruta?.name ?? "",
                            variedades: [],
                            relationId: rel.clienteNegocioCampanaId,
                            clienteId: rel.clienteNegocioId,
                            clienteNombre: rel.clienteNegocio?.nombreEmpresa ?? "Cliente",
                            ruc: rel.clienteNegocio?.ruc ?? "—",
                            canal:
                                rel.clienteNegocio?.tipoCliente === "industria"
                                    ? "Industria"
                                    : "Exportador",
                            pais: "",
                            cantidadRequeridaKg: rel.kilosAcordados ?? 0,
                            kilosAcordados: acordados,
                            fechaRegistro:
                                rel.fechaRegistro instanceof Date
                                    ? rel.fechaRegistro.toISOString().slice(0, 10)
                                    : String(rel.fechaRegistro ?? ""),
                            observaciones: "",
                            contracts,
                            deliveries,
                        });
                    }
                }
                if (active) { setApiRows(collected); setError(false); }
            })
            .catch(() => {
                if (active) setError(true);
            });
        return () => {
            active = false;
        };
    }, [contractRecords, deliveryRecords, retry]);

    const rows = apiRows;

    const campaignOptions = useMemo(
        () => Array.from(new Set(rows.map((r) => r.campaniaNombre))),
        [rows],
    );
    const clientOptions = useMemo(
        () => Array.from(new Set(rows.map((r) => r.clienteNombre))),
        [rows],
    );

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((row) => {
            if (campaignFilter !== "all" && row.campaniaNombre !== campaignFilter) return false;
            if (clientFilter !== "all" && row.clienteNombre !== clientFilter) return false;
            if (q) {
                const hay = `${row.clienteNombre} ${row.ruc} ${row.campaniaNombre} ${row.fruta}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [rows, search, campaignFilter, clientFilter]);

    const { pageCount, currentPage, visible } = paginate(filteredRows, page);

    const totalContratos = rows.reduce((s, r) => s + r.contracts.length, 0);
    const totalRequerido = rows.reduce((s, r) => s + r.cantidadRequeridaKg, 0);
    const totalAcordado = rows.reduce((s, r) => s + r.kilosAcordados, 0);
    const totalEntregas = rows.reduce((s, r) => s + r.deliveries.length, 0);

    const metrics: Metric[] = [
        {
            title: "Participaciones activas",
            value: String(rows.length),
            unit: "vínculos",
            description: "Clientes vinculados a campañas",
            icon: Building2,
        },
        {
            title: "Contratos registrados",
            value: String(totalContratos),
            unit: totalContratos === 1 ? "contrato" : "contratos",
            description: "Acuerdos comerciales con respaldo PDF",
            icon: FileSpreadsheet,
        },
        {
            title: "Volumen acordado",
            value: formatKg(totalAcordado),
            unit: "kg",
            description: `De ${formatKg(totalRequerido)} kg requeridos`,
            icon: Scale,
        },
        {
            title: "Entregas programadas",
            value: String(totalEntregas),
            unit: totalEntregas === 1 ? "entrega" : "entregas",
            description: "Cronograma comercial en campañas",
            icon: PackageCheck,
        },
    ];

    const getRowActions = (row: CommercialParticipationRow): { primary: RowAction[]; secondary: RowAction[] } => ({
        primary: [
            {
                label: "Consulta cliente–campaña",
                icon: <Eye size={18} strokeWidth={2.4} />,
                onClick: () => setDetailModal({ open: true, participation: row }),
            },
            {
                label: "Gestionar contratos",
                icon: <FolderKanban size={18} strokeWidth={2.4} />,
                onClick: () =>
                    navigate(`/campaigns/${row.campaniaId}/clients/${row.relationId}/contracts`),
            },
        ],
        secondary: [],
    });

    const getExportData = (): TableExport => ({
        filename: "participaciones_contratos_comercial",
        title: "Contratos y Participaciones Cliente–Campaña",
        header: [
            "Cliente",
            "RUC",
            "Campaña",
            "Canal",
            "Cantidad requerida (kg)",
            "Kilos acordados (kg)",
            "Fecha de registro",
            "Contratos",
        ],
        rows: filteredRows.map((r) => [
            r.clienteNombre,
            r.ruc,
            r.campaniaNombre,
            r.canal,
            String(r.cantidadRequeridaKg),
            String(r.kilosAcordados),
            formatDisplayDate(r.fechaRegistro),
            r.contracts.length > 0 ? `${r.contracts.length} contrato(s)` : "Sin contrato",
        ]),
    });

    const hasActiveFilters = search !== "" || campaignFilter !== "all" || clientFilter !== "all";

    if (error) return <PageError title="No se pudieron cargar los contratos" message="Verifica la conexión e intenta nuevamente." onRetry={()=>setRetry(value=>value+1)} />;

    return (
        <div className="flex flex-col gap-6">
            <MetricCards label="Indicadores comerciales de contratos" metrics={metrics} />

            <FilterBar
                canClear={hasActiveFilters}
                onClear={() => {
                    setSearch("");
                    setCampaignFilter("all");
                    setClientFilter("all");
                }}
            >
                <FilterSearch
                    value={search}
                    onChange={setSearch}
                    placeholder="Buscar por cliente, RUC o campaña..."
                />
                <div className="w-full sm:w-60">
                    <Select value={campaignFilter} onValueChange={(v) => setCampaignFilter(v ?? "all")}>
                        <SelectTrigger aria-label="Filtrar por campaña">
                            <SelectValue placeholder="Todas las campañas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las campañas</SelectItem>
                            {campaignOptions.map((c) => (
                                <SelectItem key={c} value={c}>
                                    {c}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-full sm:w-60">
                    <Select value={clientFilter} onValueChange={(v) => setClientFilter(v ?? "all")}>
                        <SelectTrigger aria-label="Filtrar por cliente">
                            <SelectValue placeholder="Todos los clientes" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los clientes</SelectItem>
                            {clientOptions.map((c) => (
                                <SelectItem key={c} value={c}>
                                    {c}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </FilterBar>

            <TableCard
                icon={<FileSpreadsheet size={24} strokeWidth={2.2} />}
                title="Participaciones cliente–campaña y contratos"
                description="Consulta los contratos firmados y las entregas programadas de cada cliente por campaña."
                headerRight={
                    <TableToolbar>
                        <TableCountPill
                            icon={<FileSpreadsheet size={16} strokeWidth={2.5} className="text-brand" />}
                            count={filteredRows.length}
                            singular="participación"
                            plural="participaciones"
                        />
                        <TableExportMenu getData={getExportData} />
                        <TableViewToggle value={viewMode} onChange={setViewMode} />
                    </TableToolbar>
                }
                isEmpty={filteredRows.length === 0}
                emptyTitle="No se encontraron participaciones"
                emptyDescription="Prueba ajustando los filtros de campaña o cliente."
                page={currentPage}
                pageCount={pageCount}
                onPageChange={setPage}
            >
                {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                        {visible.map((row) => {
                            const actions = getRowActions(row);
                            return (
                                <TableGridCard
                                    key={row.id}
                                    accentColor={row.contracts.length > 0 ? "border-l-brand" : "border-l-status-warning"}
                                    icon={<Building2 size={18} strokeWidth={2.2} />}
                                    title={row.clienteNombre}
                                    subtitle={`${row.campaniaNombre} · ${row.canal}`}
                                    badge={
                                        <StatusBadge
                                            status={
                                                row.contracts.length > 0
                                                    ? `${row.contracts.length} contrato(s)`
                                                    : "Sin contrato"
                                            }
                                        />
                                    }
                                    actions={<RowActions primary={actions.primary} secondary={actions.secondary} />}
                                >
                                    <TableGridCardFields>
                                        <TableGridCardField
                                            label="Cantidad requerida"
                                            value={`${formatKg(row.cantidadRequeridaKg)} kg`}
                                        />
                                        <TableGridCardField
                                            label="Kilos acordados"
                                            value={`${formatKg(row.kilosAcordados)} kg`}
                                        />
                                        <TableGridCardField
                                            label="Fecha de registro"
                                            value={formatDisplayDate(row.fechaRegistro)}
                                        />
                                        <TableGridCardField
                                            label="Entregas programadas"
                                            value={`${row.deliveries.length} entrega(s)`}
                                        />
                                    </TableGridCardFields>
                                </TableGridCard>
                            );
                        })}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className={`${TABLE_HEAD_BG} hover:bg-brand-surface`}>
                                <TableHead className="py-3.5 pl-6 pr-3 font-bold text-ink">Cliente</TableHead>
                                <TableHead className="px-3 py-3.5 font-bold text-ink">Campaña / Fruta</TableHead>
                                <TableHead className="px-3 py-3.5 text-right font-bold text-ink">
                                    Cantidad en kg
                                </TableHead>
                                <TableHead className="px-3 py-3.5 text-right font-bold text-ink">
                                    Kilos acordados
                                </TableHead>
                                <TableHead className="px-3 py-3.5 font-bold text-ink">Fecha de registro</TableHead>
                                <TableHead className="px-3 py-3.5 text-center font-bold text-ink">Contrato</TableHead>
                                <TableHead className="py-3.5 pl-3 pr-6 text-right font-bold text-ink">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border/60">
                            {visible.map((row) => {
                                const actions = getRowActions(row);
                                return (
                                    <TableRow key={row.id} className="transition-colors hover:bg-muted/30">
                                        <TableCell className="relative py-3.5 pl-6 pr-3">
                                            <TableRowAccent
                                                color={
                                                    row.contracts.length > 0 ? "bg-brand" : "bg-status-warning"
                                                }
                                            />
                                            <TableRowLead
                                                icon={<Building2 size={18} strokeWidth={2.2} />}
                                                title={row.clienteNombre}
                                                subtitle={`${row.ruc} · ${row.canal}`}
                                            />
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5">
                                            <div className="flex flex-col">
                                                <span className="text-[13.5px] font-bold text-ink">
                                                    {row.campaniaNombre}
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-[12px] text-ink-muted">
                                                    <Sprout size={12} className="text-brand" />
                                                    {row.fruta} ({row.variedades.join(", ")})
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-right font-bold tabular-nums text-ink">
                                            {formatKg(row.cantidadRequeridaKg)} kg
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-right font-extrabold tabular-nums text-brand">
                                            {formatKg(row.kilosAcordados)} kg
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-[13px] font-medium text-ink-muted">
                                            {formatDisplayDate(row.fechaRegistro)}
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-center">
                                            <StatusBadge
                                                status={
                                                    row.contracts.length > 0
                                                        ? `${row.contracts.length} contrato(s)`
                                                        : "Sin contrato"
                                                }
                                            />
                                        </TableCell>
                                        <TableCell className="py-3.5 pl-3 pr-6 text-right">
                                            <RowActions primary={actions.primary} secondary={actions.secondary} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </TableCard>

            <CommercialClientCampaignDetailModal
                open={detailModal.open}
                onOpenChange={(open) => setDetailModal((current) => ({ ...current, open }))}
                participation={detailModal.participation}
            />
        </div>
    );
}
