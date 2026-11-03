import { useSectionMotion } from '@/shared/hooks/useSectionMotion';
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    CheckCircle2,
    Eye,
    Flag,
    Layers,
    MapPin,
    Navigation,
    Package,
    PackageCheck,
    Sprout,
    Truck,
} from "lucide-react";
import LogisticsDispatchImg from "@/assets/logistics_dispatch.webp";
import ContextBanner from "@/shared/components/ContextBanner";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import DispatchStepProgress from "@/shared/components/DispatchStepProgress";
import FilterBar, { FilterSearch, FilterSelectField } from "@/shared/components/FilterBar";
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
import { Button } from "@/shared/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table";
import PageHeader from "@/shared/layout/PageHeader";
import type { TableExport } from "@/shared/utils/exportTable";
import { formatDisplayDate, formatKg } from "@/shared/utils/format";
import { getCampaignFruitIcon } from "@/modules/campaigns/campaignFruit";
import type { LogisticsLoad } from "@/modules/logistics/logistics.models";
import { useLogisticsLoads } from "@/modules/logistics/logistics.store";
import { formatLogisticsDateTime } from "@/modules/logistics/logistics.utils";
import { PageError } from "@/shared/components/PageState";

interface CampaignSummaryRow {
    campaniaId: number;
    campaniaNombre: string;
    fruta: string;
    estado: string;
    kilosRequeridos: number;
    enCarga: number;
    salida: number;
    enCamino: number;
    llegada: number;
    cierre: number;
    totalCargas: number;
}

const STAGE_OPTIONS = [
    { value: "En carga", label: "En carga" },
    { value: "Salida", label: "Salida de finca" },
    { value: "En camino", label: "En camino" },
    { value: "Llegada", label: "Llegada a planta" },
    { value: "Cierre", label: "Cierre completado" },
];

export default function LogisticsPage() {
    const navigate = useNavigate();
    const { campaignId } = useParams<{ campaignId?: string }>();
    const loads = useLogisticsLoads();

    const selectedCampaignId = campaignId ? Number(campaignId) : null;
    useSectionMotion(String(selectedCampaignId));
    const [search, setSearch] = useState("");
    const [campaignFilter, setCampaignFilter] = useState("");
    const [stageFilter, setStageFilter] = useState("");
    const [viewMode, setViewMode] = useState<TableViewMode>("table");

    const campaignSummaries = useMemo<CampaignSummaryRow[]>(() => {
        const byCamp = new Map<number, CampaignSummaryRow>();
        for (const load of loads) {
            const current = byCamp.get(load.campaniaId) ?? {
                campaniaId: load.campaniaId,
                campaniaNombre: load.campaniaNombre,
                fruta: load.fruta,
                estado: load.estadoCampania,
                kilosRequeridos: load.kilosRequeridosCampania,
                enCarga: 0,
                salida: 0,
                enCamino: 0,
                llegada: 0,
                cierre: 0,
                totalCargas: 0,
            };
            current.totalCargas += 1;
            if (load.etapaDespacho === "En carga") current.enCarga += 1;
            if (load.etapaDespacho === "Salida") current.salida += 1;
            if (load.etapaDespacho === "En camino") current.enCamino += 1;
            if (load.etapaDespacho === "Llegada") current.llegada += 1;
            if (load.etapaDespacho === "Cierre") current.cierre += 1;
            byCamp.set(load.campaniaId, current);
        }
        return [...byCamp.values()];
    }, [loads]);

    const activeCampaignSummary = useMemo(
        () => campaignSummaries.find((c) => c.campaniaId === selectedCampaignId) ?? null,
        [campaignSummaries, selectedCampaignId],
    );

    const scopedLoads = useMemo(
        () =>
            selectedCampaignId === null
                ? loads
                : loads.filter((l) => l.campaniaId === selectedCampaignId),
        [loads, selectedCampaignId],
    );

    // 6 KPIs (como en la referencia: Kilos requeridos, En carga, Salida de finca, En camino, Llegada, Cierre)
    const metrics = useMemo<Metric[]>(() => {
        const totalKilosReq =
            selectedCampaignId !== null && activeCampaignSummary
                ? activeCampaignSummary.kilosRequeridos
                : campaignSummaries.reduce((s, c) => s + c.kilosRequeridos, 0);

        const countStage = (stage: string) =>
            scopedLoads.filter((l) => l.etapaDespacho === stage).length;

        return [
            {
                title: "KILOS REQUERIDOS",
                value: formatKg(totalKilosReq),
                unit: "kg",
                description: "Meta comercial acumulada",
                icon: Package,
            },
            { title: "EN CARGA", value: String(countStage("En carga")), unit: "cargas", description: "En preparación", icon: Package, warm: countStage("En carga") > 0 },
            { title: "SALIDA DE FINCA", value: String(countStage("Salida")), unit: "cargas", description: "Salida registrada", icon: Flag },
            { title: "EN CAMINO", value: String(countStage("En camino")), unit: "cargas", description: "En ruta a planta", icon: Truck },
            { title: "LLEGADA", value: String(countStage("Llegada")), unit: "cargas", description: "En planta", icon: Truck },
            {
                title: "CIERRE COMPLETADO",
                value: String(countStage("Cierre")),
                unit: "cargas",
                description: "Con recepción y expediente cerrado",
                icon: CheckCircle2,
            },
        ];
    }, [scopedLoads, selectedCampaignId, activeCampaignSummary, campaignSummaries]);

    const campaignOptions = useMemo(
        () =>
            campaignSummaries.map((c) => ({
                value: String(c.campaniaId),
                label: c.campaniaNombre,
            })),
        [campaignSummaries],
    );

    const hasActiveFilters = search.trim() !== "" || campaignFilter !== "" || stageFilter !== "";

    const clearFilters = () => {
        setSearch("");
        setCampaignFilter("");
        setStageFilter("");
    };

    // Filtrado para Nivel 1 (Campañas)
    const filteredCampaigns = useMemo(() => {
        const q = search.trim().toLowerCase();
        return campaignSummaries.filter((c) => {
            if (campaignFilter && String(c.campaniaId) !== campaignFilter) return false;
            if (stageFilter) {
                const hasStage = loads.some(
                    (l) => l.campaniaId === c.campaniaId && l.etapaDespacho === stageFilter,
                );
                if (!hasStage) return false;
            }
            if (q && !`${c.campaniaNombre} ${c.fruta}`.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [campaignSummaries, campaignFilter, stageFilter, search, loads]);

    // Filtrado para Nivel 2 (Cargas de la campaña)
    const filteredLoads = useMemo(() => {
        const q = search.trim().toLowerCase();
        return scopedLoads.filter((l) => {
            if (stageFilter && l.etapaDespacho !== stageFilter) return false;
            if (
                q &&
                !`${l.codigo} ${l.cliente} ${l.placa} ${l.chofer} ${l.destino}`
                    .toLowerCase()
                    .includes(q)
            )
                return false;
            return true;
        });
    }, [scopedLoads, stageFilter, search]);

    const visibleCampaigns = filteredCampaigns;
    const visibleLoads = filteredLoads;

    const getCampaignExport = (): TableExport => ({
        filename: "logistica_resumen_campanias",
        title: "Logística y Despacho — Resumen por Campaña",
        header: [
            "Campaña",
            "Fruta",
            "Estado",
            "Kilos requeridos",
            "En carga",
            "Salida",
            "En camino",
            "Llegada",
            "Cerradas",
        ],
        rows: filteredCampaigns.map((c) => [
            c.campaniaNombre,
            c.fruta,
            c.estado,
            `${formatKg(c.kilosRequeridos)} kg`,
            String(c.enCarga),
            String(c.salida),
            String(c.enCamino),
            String(c.llegada),
            String(c.cierre),
        ]),
    });

    const getLoadsExport = (): TableExport => ({
        filename: "logistica_cargas_campania",
        title: `Cargas Logísticas — ${activeCampaignSummary?.campaniaNombre ?? "Campaña"}`,
        header: ["Carga", "Cliente", "Destino", "Placa", "Chofer", "Kilos cargados", "Kilos en planta", "Estado"],
        rows: filteredLoads.map((l) => [
            l.codigo,
            l.cliente,
            l.destino,
            l.placa,
            l.chofer,
            `${formatKg(l.proveedores.reduce((s, p) => s + p.kilosCargados, 0))} kg`,
            `${formatKg(l.recepcion.pesoRecibidoPlanta)} kg`,
            l.etapaDespacho,
        ]),
    });

    const getLoadActions = (load: LogisticsLoad): { primary: RowAction[] } => ({
        primary: [
            {
                label: "Ver detalle",
                icon: <Eye size={18} strokeWidth={2.3} />,
                onClick: () => navigate(`/logistica-despacho/${load.campaniaId}/cargas/${load.id}`),
            },
        ],
    });

    if (campaignId && (!Number.isSafeInteger(selectedCampaignId) || !activeCampaignSummary)) return <PageError title="Campaña no encontrada" message="No hay cargas de esta campaña en Logística." back={{ to: "/logistica-despacho", label: "Volver a campañas" }} />;

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            {/* Banner de contexto en Nivel 2 */}
            {selectedCampaignId !== null && activeCampaignSummary && (
                <ContextBanner
                    ariaLabel={activeCampaignSummary.campaniaNombre}
                    eyebrow={{
                        icon: <Truck size={15} strokeWidth={2.4} />,
                        label: "Logística y Despacho · Campaña",
                    }}
                    title={activeCampaignSummary.campaniaNombre}
                    titleAddon={<StatusBadge status={activeCampaignSummary.estado} />}
                    meta={[
                        {
                            icon: <Sprout size={15} strokeWidth={2.2} />,
                            content: `Fruta: ${activeCampaignSummary.fruta}`,
                        },
                        {
                            icon: <Navigation size={15} strokeWidth={2.2} />,
                            content: `${activeCampaignSummary.totalCargas} cargas registradas`,
                        },
                    ]}
                    caption="Seguimiento de despacho, recepción en planta, control de jabas y cierre documental"
                    stats={[
                        {
                            label: "kilos requeridos",
                            value: `${formatKg(activeCampaignSummary.kilosRequeridos)} kg`,
                        },
                        { label: "en llegada / planta", value: String(activeCampaignSummary.llegada) },
                        { label: "cerradas", value: String(activeCampaignSummary.cierre) },
                    ]}
                    image={LogisticsDispatchImg}
                />
            )}

            <PageHeader
                icon={<Truck size={24} strokeWidth={2.5} />}
                title={
                    selectedCampaignId === null
                        ? "Logística y Despacho"
                        : "Cargas de la Campaña"
                }
                description={
                    selectedCampaignId === null
                        ? "Monitorea el avance de cargas en tránsito, recepción en planta, devolución de jabas y cierres por campaña."
                        : "Gestiona las compras de la carga, recepción y calidad en planta, devolución de jabas y documentos de cierre."
                }
                action={
                    selectedCampaignId !== null ? (
                        <Button
                            variant="outline"
                            size="xl"
                            onClick={() => {
                                navigate("/logistica-despacho");
                                clearFilters();
                            }}
                        >
                            <ArrowLeft size={19} strokeWidth={2.5} /> Volver a campañas
                        </Button>
                    ) : undefined
                }
            />

            <div className="mb-6">
                <MetricCards metrics={metrics} label="Indicadores de logística y despacho" columns={6} />
            </div>

            <FilterBar onClear={clearFilters} canClear={hasActiveFilters} className="mb-6">
                <FilterSearch
                    value={search}
                    onChange={(v) => {
                        setSearch(v);
                    }}
                    placeholder={
                        selectedCampaignId === null
                            ? "Buscar por campaña o fruta..."
                            : "Buscar por código de carga, cliente, placa o chofer..."
                    }
                />
                {selectedCampaignId === null && (
                    <FilterSelectField
                        label="Campaña"
                        options={campaignOptions}
                        value={campaignFilter}
                        onChange={(v) => {
                            setCampaignFilter(v);
                        }}
                    />
                )}
                <FilterSelectField
                    label="Estado despacho"
                    options={STAGE_OPTIONS}
                    value={stageFilter}
                    onChange={(v) => {
                        setStageFilter(v);
                    }}
                />
            </FilterBar>

            {/* NIVEL 1: TABLA RESUMEN DE LOGÍSTICA POR CAMPAÑA */}
            {selectedCampaignId === null ? (
                <TableCard
                    icon={<Truck size={24} strokeWidth={2.5} />}
                    title="Resumen de Logística por Campaña"
                    description="Selecciona una campaña para ingresar al detalle operativo de sus cargas y recepciones."
                    headerRight={
                        <TableToolbar>
                            <TableCountPill
                                icon={<Layers size={16} strokeWidth={2.5} className="text-brand" />}
                                count={filteredCampaigns.length}
                                singular="campaña"
                                plural="campañas"
                            />
                            <TableExportMenu getData={getCampaignExport} />
                            <TableViewToggle value={viewMode} onChange={setViewMode} />
                        </TableToolbar>
                    }
                    isEmpty={visibleCampaigns.length === 0}
                    emptyTitle="Sin campañas en logística"
                    emptyDescription="No se encontraron campañas con los filtros seleccionados."
                    page={1}
                    pageCount={1}
                    onPageChange={() => {}}
                >
                    {/* Móvil / Grid */}
                    <div
                        className={`flex flex-col gap-3 ${
                            viewMode === "grid" ? "sm:grid sm:grid-cols-2 lg:grid-cols-3" : "sm:hidden"
                        }`}
                    >
                        {visibleCampaigns.map((camp) => {
                            const FruitIcon =
                                getCampaignFruitIcon(camp.campaniaNombre, camp.fruta) || Sprout;
                            return (
                                <TableGridCard
                                    key={camp.campaniaId}
                                    accentColor="border-l-brand"
                                    icon={<FruitIcon size={20} strokeWidth={2.2} />}
                                    title={camp.campaniaNombre}
                                    subtitle={`Fruta: ${camp.fruta}`}
                                    badge={<StatusBadge status={camp.estado} />}
                                    actions={
                                        <Button
                                            size="sm"
                                            className="ml-auto"
                                            onClick={() => {
                                                navigate(`/logistica-despacho/${camp.campaniaId}`);
                                                clearFilters();
                                            }}
                                        >
                                            Ingresar a cargas ({camp.totalCargas})
                                        </Button>
                                    }
                                >
                                    <TableGridCardFields>
                                        <TableGridCardField
                                            label="Kilos requeridos"
                                            value={`${formatKg(camp.kilosRequeridos)} kg`}
                                        />
                                        <TableGridCardField
                                            label="En carga / Salida"
                                            value={`${camp.enCarga} / ${camp.salida}`}
                                        />
                                        <TableGridCardField
                                            label="En camino / Llegada"
                                            value={`${camp.enCamino} / ${camp.llegada}`}
                                        />
                                        <TableGridCardField
                                            label="Cerradas"
                                            value={`${camp.cierre} de ${camp.totalCargas}`}
                                        />
                                    </TableGridCardFields>
                                </TableGridCard>
                            );
                        })}
                    </div>

                    {/* Desktop Table */}
                    {viewMode === "table" && (
                        <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
                            <Table>
                                <TableHeader className={TABLE_HEAD_BG}>
                                    <TableRow className="border-b border-border hover:bg-transparent">
                                        <TableHead className="h-14 px-6 font-semibold text-ink">Campaña</TableHead>
                                        <TableHead className="h-14 font-semibold text-ink">Fruta</TableHead>
                                        <TableHead className="h-14 font-semibold text-ink">Estado</TableHead>
                                        <TableHead className="h-14 font-semibold text-ink">Kilos requeridos</TableHead>
                                        <TableHead className="h-14 text-center font-semibold text-ink">En carga</TableHead>
                                        <TableHead className="h-14 text-center font-semibold text-ink">Salida</TableHead>
                                        <TableHead className="h-14 text-center font-semibold text-ink">En camino</TableHead>
                                        <TableHead className="h-14 text-center font-semibold text-ink">Llegada</TableHead>
                                        <TableHead className="h-14 text-center font-semibold text-ink">Cerradas</TableHead>
                                        <TableHead className="h-14 px-6 text-right font-semibold text-ink">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visibleCampaigns.map((camp) => {
                                        const FruitIcon =
                                            getCampaignFruitIcon(camp.campaniaNombre, camp.fruta) || Sprout;
                                        return (
                                            <TableRow
                                                key={camp.campaniaId}
                                                className="border-b border-border transition-colors hover:bg-surface-page/60"
                                            >
                                                <TableCell className="relative h-20 px-6">
                                                    <TableRowAccent color="bg-brand" />
                                                    <TableRowLead
                                                        icon={<FruitIcon size={20} strokeWidth={2} />}
                                                        title={camp.campaniaNombre}
                                                        subtitle={`${camp.totalCargas} cargas registradas`}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium text-ink-body">{camp.fruta}</TableCell>
                                                <TableCell>
                                                    <StatusBadge status={camp.estado} />
                                                </TableCell>
                                                <TableCell className="font-bold tabular-nums text-ink">
                                                    {formatKg(camp.kilosRequeridos)} kg
                                                </TableCell>
                                                <TableCell className="text-center font-bold tabular-nums text-ink-body">
                                                    {camp.enCarga}
                                                </TableCell>
                                                <TableCell className="text-center font-bold tabular-nums text-ink-body">
                                                    {camp.salida}
                                                </TableCell>
                                                <TableCell className="text-center font-bold tabular-nums text-ink-body">
                                                    {camp.enCamino}
                                                </TableCell>
                                                <TableCell className="text-center font-bold tabular-nums text-brand">
                                                    {camp.llegada}
                                                </TableCell>
                                                <TableCell className="text-center font-bold tabular-nums text-brand">
                                                    {camp.cierre}
                                                </TableCell>
                                                <TableCell className="px-6 text-right">
                                                    <Button
                                                        size="default"
                                                        onClick={() => {
                                                            navigate(`/logistica-despacho/${camp.campaniaId}`);
                                                            clearFilters();
                                                        }}
                                                    >
                                                        Ingresar a cargas ({camp.totalCargas})
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </TableCard>
            ) : (
                /* NIVEL 2: CARGAS DE LA CAMPAÑA */
                <TableCard
                    icon={<PackageCheck size={24} strokeWidth={2.5} />}
                    title="Cargas y Despachos de la Campaña"
                    description="Abre el detalle de cada carga para consultar su recorrido y gestionar compras, recepción, jabas y documentos."
                    headerRight={
                        <TableToolbar>
                            <TableCountPill
                                icon={<Truck size={16} strokeWidth={2.5} className="text-brand" />}
                                count={filteredLoads.length}
                                singular="carga"
                                plural="cargas"
                            />
                            <TableExportMenu getData={getLoadsExport} />
                            <TableViewToggle value={viewMode} onChange={setViewMode} />
                        </TableToolbar>
                    }
                    isEmpty={visibleLoads.length === 0}
                    emptyTitle="Sin cargas encontradas"
                    emptyDescription="No hay cargas que coincidan con los filtros aplicados."
                    page={1}
                    pageCount={1}
                    onPageChange={() => {}}
                >
                    {/* Móvil / Grid */}
                    <div
                        className={`flex flex-col gap-3 ${
                            viewMode === "grid" ? "sm:grid sm:grid-cols-2 lg:grid-cols-3" : "sm:hidden"
                        }`}
                    >
                        {visibleLoads.map((load) => {
                            const totalCargados = load.proveedores.reduce(
                                (s, p) => s + p.kilosCargados,
                                0,
                            );
                            return (
                                <TableGridCard
                                    key={load.id}
                                    accentColor="border-l-brand"
                                    icon={<Truck size={19} strokeWidth={2.2} />}
                                    title={`${load.codigo} · ${load.cliente}`}
                                    subtitle={`${load.placa} · ${load.chofer}`}
                                    badge={<StatusBadge status={load.etapaDespacho} />}
                                    actions={<RowActions {...getLoadActions(load)} />}
                                >
                                    <div className="mx-4 flex flex-col gap-3">
                                        <DispatchStepProgress
                                            stage={load.etapaDespacho}
                                            variant="compact"
                                        />
                                    </div>
                                    <TableGridCardFields className="mt-2">
                                        <TableGridCardField
                                            label="Kilos cargados"
                                            value={`${formatKg(totalCargados)} kg`}
                                        />
                                        <TableGridCardField
                                            label="Kilos en planta"
                                            value={
                                                load.recepcion.pesoRecibidoPlanta > 0
                                                    ? `${formatKg(load.recepcion.pesoRecibidoPlanta)} kg`
                                                    : "Pendiente"
                                            }
                                        />
                                        <TableGridCardField
                                            label="Fecha de carga"
                                            value={formatDisplayDate(load.fechaCarga)}
                                        />
                                        <TableGridCardField label="Canal" value={load.canal} />
                                        <TableGridCardField label="Último reporte" value={load.historialChofer?.at(-1)
                                            ? formatLogisticsDateTime(load.historialChofer.at(-1)?.fechaHora) : "Sin reporte"} />
                                    </TableGridCardFields>
                                </TableGridCard>
                            );
                        })}
                    </div>

                    {/* Desktop Table */}
                    {viewMode === "table" && (
                        <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
                            <Table>
                                <TableHeader className={TABLE_HEAD_BG}>
                                    <TableRow className="border-b border-border hover:bg-transparent">
                                        <TableHead className="h-14 px-6 font-semibold text-ink">Carga / Canal</TableHead>
                                        <TableHead className="h-14 font-semibold text-ink">Cliente / Destino</TableHead>
                                        <TableHead className="h-14 font-semibold text-ink">Camión / Chofer</TableHead>
                                        <TableHead className="h-14 font-semibold text-ink">Kilos (Campo / Planta)</TableHead>
                                        <TableHead className="h-14 font-semibold text-ink">Estado del despacho</TableHead>
                                        <TableHead className="h-14 font-semibold text-ink">Último reporte</TableHead>
                                        <TableHead className="h-14 w-36 px-6 text-center font-semibold text-ink">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visibleLoads.map((load) => {
                                        const totalCargados = load.proveedores.reduce(
                                            (s, p) => s + p.kilosCargados,
                                            0,
                                        );
                                        return (
                                            <TableRow
                                                key={load.id}
                                                className="border-b border-border transition-colors hover:bg-surface-page/60"
                                            >
                                                <TableCell className="relative h-22 px-6">
                                                    <TableRowAccent color="bg-brand" />
                                                    <TableRowLead
                                                        icon={<Truck size={18} strokeWidth={2.2} />}
                                                        title={load.codigo}
                                                        subtitle={`${load.canal} · ${formatDisplayDate(load.fechaCarga)}`}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-ink">{load.cliente}</span>
                                                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-muted">
                                                            <MapPin size={12} className="text-brand" /> {load.destino}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-ink">
                                                            {load.placa} · {load.chofer}
                                                        </span>
                                                        <span className="text-[12px] font-medium text-ink-muted">
                                                            {load.transportista}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-0.5 tabular-nums">
                                                        <span className="text-[13px] font-bold text-ink">
                                                            Campo: {formatKg(totalCargados)} kg
                                                        </span>
                                                        <span className="text-[12px] font-semibold text-brand">
                                                            Planta:{" "}
                                                            {load.recepcion.pesoRecibidoPlanta > 0
                                                                ? `${formatKg(load.recepcion.pesoRecibidoPlanta)} kg`
                                                                : "Pendiente"}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col items-start gap-1.5">
                                                        <StatusBadge status={load.etapaDespacho} />
                                                        <DispatchStepProgress
                                                            stage={load.etapaDespacho}
                                                            variant="compact"
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-56 text-[12px] font-medium text-ink-body">
                                                    <span>{load.historialChofer?.at(-1)
                                                        ? formatLogisticsDateTime(load.historialChofer.at(-1)?.fechaHora) : "Sin reporte"}</span>
                                                    {load.ultimoReporte && <span className="mt-1 block truncate text-ink-muted" title={load.ultimoReporte}>{load.ultimoReporte}</span>}
                                                </TableCell>
                                                <TableCell className="px-6">
                                                    <RowActions
                                                        {...getLoadActions(load)}
                                                        className="justify-center"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </TableCard>
            )}

        </div>
    );
}
