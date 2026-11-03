import { useSectionMotion } from '@/shared/hooks/useSectionMotion';
import { useNavigate, useParams } from 'react-router-dom';
import { usesV1 } from '@/shared/api/data-contract';
import { useMemo, useState } from "react";
import {
    ArrowLeft,
    Banknote,
    CheckCircle2,
    Clock,
    Eye,
    FileSpreadsheet,
    History,
    Layers,
    Pencil,
    Scale,
    Sprout,
    Truck,
    Wallet,
} from "lucide-react";
import PurchaseSettlementImg from "@/assets/purchase_settlement.webp";
import ContextBanner from "@/shared/components/ContextBanner";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import FileDropzone from "@/shared/components/FileDropzone";
import FilterBar, { FilterSearch } from "@/shared/components/FilterBar";
import { InfoField, SummaryBar } from "@/shared/components/InfoField";
import ModalSection from "@/shared/components/ModalSection";
import SegmentedTabs, { type SegmentedTabItem } from "@/shared/components/SegmentedTabs";
import PendingDataResolutionModal from "@/shared/components/PendingDataResolutionModal";
import StatusBadge from "@/shared/components/StatusBadge";
import SuccessModal from "@/shared/components/SuccessModal";
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
import { Card, CardContent } from "@/shared/components/ui/card";
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
import { paginate } from "@/shared/utils/paginate";
import { getCampaignFruitIcon } from "@/modules/campaigns/campaignFruit";
import SettlementCampaignPaidModal from "@/modules/purchase-settlement/components/SettlementCampaignPaidModal";
import SettlementCarrierModal from "@/modules/purchase-settlement/components/SettlementCarrierModal";
import SettlementPaymentHistoryModal from "@/modules/purchase-settlement/components/SettlementPaymentHistoryModal";
import SettlementPaymentModal from "@/modules/purchase-settlement/components/SettlementPaymentModal";
import SettlementProviderModal from "@/modules/purchase-settlement/components/SettlementProviderModal";
import SettlementUitControlModal from "@/modules/purchase-settlement/components/SettlementUitControlModal";
import { carrierTotal, providerReadiness } from '@/modules/purchase-settlement/settlementOverview.utils';
import type {
    SettlementProviderEntry,
    SettlementStatus,
} from "@/modules/purchase-settlement/purchaseSettlement.models";
import {
    addProviderLinkedPerson,
    registerCarrierPayment,
    registerProviderPayment,
    saveCarrierSettlement,
    saveProviderSettlement,
    usePurchaseSettlementState,
} from "@/modules/purchase-settlement/purchaseSettlement.store";

interface CampaignSettlementRow {
    campaniaId: number;
    campaniaNombre: string;
    fruta: string;
    estado: string;
    totalCargas: number;
    totalProveedores: number;
    liquidadosProveedores: number;
}

const PROVIDER_TABS: readonly SegmentedTabItem[] = [
    { id: "Por liquidar", label: "Por liquidar", icon: Clock, tone: "brand" },
    { id: "Por pagar", label: "Por pagar", icon: Wallet, tone: "brand" },
    { id: "Pagado", label: "Pagados", icon: CheckCircle2, tone: "brand" },
];

export default function PurchaseSettlementPage() {
    const navigate = useNavigate();
    const { campaignId, loadId, section } = useParams();
    const { loads } = usePurchaseSettlementState();

    const selectedCampaignId = campaignId && Number.isFinite(Number(campaignId)) ? Number(campaignId) : null;
    const selectedLoadId = loadId ?? null;
    useSectionMotion(`${selectedCampaignId}/${selectedLoadId}`);
    const subView = section === 'proveedores' || section === 'transportista' ? section : null;
    const [providerStatusTab, setProviderStatusTab] = useState<SettlementStatus | null>(null);

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<TableViewMode>("table");

    // Modales
    const [paidModalCampaignId, setPaidModalCampaignId] = useState<number | null>(null);
    const [uitModalOpen, setUitModalOpen] = useState(false);
    const [editingProvider, setEditingProvider] = useState<SettlementProviderEntry | null>(null);
    const [carrierModalOpen, setCarrierModalOpen] = useState(false);
    const [paymentTarget, setPaymentTarget] = useState<
        | { type: "provider"; prov: SettlementProviderEntry }
        | { type: "carrier" }
        | null
    >(null);
    const [historyTarget, setHistoryTarget] = useState<
        | { type: "provider"; prov: SettlementProviderEntry }
        | { type: "carrier" }
        | null
    >(null);
    const [successInfo, setSuccessInfo] = useState<{ title: string; description: string } | null>(
        null,
    );
    const [pendingModalLoad, setPendingModalLoad] = useState<string | null>(null);

    const campaignRows = useMemo<CampaignSettlementRow[]>(() => {
        const byCamp = new Map<number, CampaignSettlementRow>();
        for (const load of loads) {
            const current = byCamp.get(load.campaniaId) ?? {
                campaniaId: load.campaniaId,
                campaniaNombre: load.campaniaNombre,
                fruta: load.fruta,
                estado: load.estadoCampania,
                totalCargas: 0,
                totalProveedores: 0,
                liquidadosProveedores: 0,
            };
            current.totalCargas += 1;
            current.totalProveedores += load.proveedores.length;
            current.liquidadosProveedores += load.proveedores.filter(
                (p) => p.estado !== "Por liquidar",
            ).length;
            byCamp.set(load.campaniaId, current);
        }
        return [...byCamp.values()];
    }, [loads]);

    const activeCampaign = useMemo(
        () => campaignRows.find((c) => c.campaniaId === selectedCampaignId) ?? null,
        [campaignRows, selectedCampaignId],
    );

    const campaignLoads = useMemo(
        () =>
            selectedCampaignId === null
                ? []
                : loads.filter((l) => l.campaniaId === selectedCampaignId),
        [loads, selectedCampaignId],
    );

    const activeLoad = useMemo(
        () => loads.find((l) => l.id === selectedLoadId) ?? null,
        [loads, selectedLoadId],
    );
    const visibleProviderStatus = providerStatusTab ?? activeLoad?.proveedores[0]?.estado ?? 'Por liquidar';

    const paidModalLoads = useMemo(
        () =>
            paidModalCampaignId === null
                ? []
                : loads.filter((l) => l.campaniaId === paidModalCampaignId),
        [loads, paidModalCampaignId],
    );

    const paidModalCampaignName = useMemo(
        () =>
            campaignRows.find((c) => c.campaniaId === paidModalCampaignId)?.campaniaNombre ??
            "Campaña",
        [campaignRows, paidModalCampaignId],
    );

    const filteredCampaigns = useMemo(() => {
        const q = search.trim().toLowerCase();
        return campaignRows.filter((c) =>
            !q ? true : `${c.campaniaNombre} ${c.fruta}`.toLowerCase().includes(q),
        );
    }, [campaignRows, search]);

    const filteredLoads = useMemo(() => {
        const q = search.trim().toLowerCase();
        return campaignLoads.filter((l) =>
            !q
                ? true
                : `${l.codigo} ${l.cliente} ${l.transporte.transportista} ${l.transporte.placa} ${l.transporte.chofer}`
                      .toLowerCase()
                      .includes(q),
        );
    }, [campaignLoads, search]);

    const {
        pageCount: campPageCount,
        currentPage: campCurrentPage,
        visible: visibleCampaigns,
    } = paginate(filteredCampaigns, page);

    const {
        pageCount: loadPageCount,
        currentPage: loadCurrentPage,
        visible: visibleLoads,
    } = paginate(filteredLoads, page);

    const getCampaignExport = (): TableExport => ({
        filename: "liquidacion_compra_campanias",
        title: "Liquidación de Compra — Campañas",
        header: ["Campaña", "Fruta", "Estado", "Cargas registradas", "Proveedores liquidados"],
        rows: filteredCampaigns.map((c) => [
            c.campaniaNombre,
            c.fruta,
            c.estado,
            String(c.totalCargas),
            `${c.liquidadosProveedores} de ${c.totalProveedores}`,
        ]),
    });

    const getLoadsExport = (): TableExport => ({
        filename: "liquidacion_cargas_campania",
        title: `Cargas en Liquidación — ${activeCampaign?.campaniaNombre ?? ""}`,
        header: [
            "Carga",
            "Cliente",
            "Transportista",
            "Placa / Chofer",
            "Kilos cargados",
            "Proveedores",
            "Transporte",
        ],
        rows: filteredLoads.map((l) => [
            l.codigo,
            l.cliente,
            l.transporte.transportista,
            `${l.transporte.placa} · ${l.transporte.chofer}`,
            `${formatKg(l.kilosCargados)} kg`,
            `${l.proveedores.filter((p) => p.estado !== "Por liquidar").length} de ${l.proveedores.length}`,
            l.transporte.estado,
        ]),
    });

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            {/* Banner de contexto en Nivel 2 y Nivel 3 */}
            {selectedCampaignId !== null && activeCampaign && (
                <ContextBanner
                    ariaLabel={activeCampaign.campaniaNombre}
                    eyebrow={{
                        icon: <Scale size={15} strokeWidth={2.4} />,
                        label: "Liquidación de Compra · Campaña",
                    }}
                    title={activeCampaign.campaniaNombre}
                    titleAddon={<StatusBadge status={activeCampaign.estado} />}
                    meta={[
                        {
                            icon: <Sprout size={15} strokeWidth={2.2} />,
                            content: `Fruta: ${activeCampaign.fruta}`,
                        },
                        {
                            icon: <Truck size={15} strokeWidth={2.2} />,
                            content: `${activeCampaign.totalCargas} cargas registradas`,
                        },
                    ]}
                    caption="Liquidación electrónica de productores (Control 75 UIT) y liquidación de fletes y gastos reales de transportistas"
                    stats={[
                        {
                            label: "proveedores liquidados",
                            value: `${activeCampaign.liquidadosProveedores} / ${activeCampaign.totalProveedores}`,
                        },
                        {
                            label: "cargas en campaña",
                            value: String(activeCampaign.totalCargas),
                        },
                    ]}
                    image={PurchaseSettlementImg}
                />
            )}

            <PageHeader
                icon={<Scale size={24} strokeWidth={2.5} />}
                title={
                    subView === "proveedores"
                        ? "Liquidación de Proveedores"
                        : subView === "transportista"
                            ? "Liquidación del Transportista"
                            : selectedCampaignId !== null
                                ? "Cargas en Liquidación"
                                : "Liquidación de Compra"
                }
                description={
                    subView === "proveedores"
                        ? "Emite la liquidación de compra por cada proveedor de la carga, controla el tope anual de 75 UIT y registra pagos."
                        : subView === "transportista"
                            ? "Registra los gastos reales de ruta, liquida el flete del viaje y aplica adelantos de campaña o pagos en caja."
                            : selectedCampaignId !== null
                                ? "Selecciona una carga para liquidar a sus proveedores agrícolas o a la empresa transportista."
                                : "Administra las liquidaciones de compra a productores (con control UIT) y servicios de transporte por campaña."
                }
                action={
                    <div className="flex flex-wrap items-center gap-2.5">
                        {subView !== 'transportista' && <Button
                            variant="outline"
                            size="xl"
                            onClick={() => setUitModalOpen(true)}
                        >
                            <Scale size={19} strokeWidth={2.4} /> Control UIT por proveedor
                        </Button>}
                        {subView !== null ? (
                            <Button
                                variant="outline"
                                size="xl"
                                onClick={() => {
                                    navigate(`/liquidacion-compra/${selectedCampaignId}`);
                                }}
                            >
                                <ArrowLeft size={19} strokeWidth={2.5} /> Volver a cargas
                            </Button>
                        ) : selectedCampaignId !== null ? (
                            <Button
                                variant="outline"
                                size="xl"
                                onClick={() => {
                                    navigate('/liquidacion-compra');
                                    setSearch("");
                                }}
                            >
                                <ArrowLeft size={19} strokeWidth={2.5} /> Volver a campañas
                            </Button>
                        ) : null}
                    </div>
                }
            />

            {/* NIVEL 1: CAMPAÑAS EN LIQUIDACIÓN DE COMPRA */}
            {selectedCampaignId === null && (
                <>
                    <FilterBar
                        onClear={() => setSearch("")}
                        canClear={search !== ""}
                        className="mb-6"
                    >
                        <FilterSearch
                            value={search}
                            onChange={(v) => {
                                setSearch(v);
                                setPage(1);
                            }}
                            placeholder="Buscar campaña por nombre o fruta..."
                        />
                    </FilterBar>

                    <TableCard
                        icon={<Scale size={24} strokeWidth={2.5} />}
                        title="Campañas en Liquidación de Compra"
                        description="Consulta los proveedores y transportistas pagados o ingresa a las cargas de la campaña."
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
                        emptyTitle="Sin campañas encontradas"
                        emptyDescription="No hay campañas que coincidan con la búsqueda."
                        page={campCurrentPage}
                        pageCount={campPageCount}
                        onPageChange={setPage}
                    >
                        <div
                            className={`flex flex-col gap-3 ${
                                viewMode === "grid"
                                    ? "sm:grid sm:grid-cols-2 lg:grid-cols-3"
                                    : "sm:hidden"
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
                                            <div className="flex w-full items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setPaidModalCampaignId(camp.campaniaId)
                                                    }
                                                >
                                                    <Eye size={15} strokeWidth={2.3} /> Pagados
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        navigate(`/liquidacion-compra/${camp.campaniaId}`);
                                                        setSearch("");
                                                    }}
                                                >
                                                    Ver cargas ({camp.totalCargas})
                                                </Button>
                                            </div>
                                        }
                                    >
                                        <TableGridCardFields>
                                            <TableGridCardField
                                                label="Cargas registradas"
                                                value={String(camp.totalCargas)}
                                            />
                                            <TableGridCardField
                                                label="Proveedores liquidados"
                                                value={`${camp.liquidadosProveedores} de ${camp.totalProveedores}`}
                                            />
                                        </TableGridCardFields>
                                    </TableGridCard>
                                );
                            })}
                        </div>

                        {viewMode === "table" && (
                            <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
                                <Table>
                                    <TableHeader className={TABLE_HEAD_BG}>
                                        <TableRow className="border-b border-border hover:bg-transparent">
                                            <TableHead className="h-14 px-6 font-semibold text-ink">
                                                Campaña
                                            </TableHead>
                                            <TableHead className="h-14 font-semibold text-ink">Fruta</TableHead>
                                            <TableHead className="h-14 font-semibold text-ink">Estado</TableHead>
                                            <TableHead className="h-14 font-semibold text-ink">
                                                Cargas registradas
                                            </TableHead>
                                            <TableHead className="h-14 font-semibold text-ink">
                                                Avance de liquidaciones
                                            </TableHead>
                                            <TableHead className="h-14 px-6 text-right font-semibold text-ink">
                                                Acciones
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {visibleCampaigns.map((camp) => {
                                            const FruitIcon =
                                                getCampaignFruitIcon(
                                                    camp.campaniaNombre,
                                                    camp.fruta,
                                                ) || Sprout;
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
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium text-ink-body">
                                                        {camp.fruta}
                                                    </TableCell>
                                                    <TableCell>
                                                        <StatusBadge status={camp.estado} />
                                                    </TableCell>
                                                    <TableCell className="font-bold tabular-nums text-ink">
                                                        {camp.totalCargas} carga(s)
                                                    </TableCell>
                                                    <TableCell className="font-bold tabular-nums text-brand">
                                                        {camp.liquidadosProveedores} de{" "}
                                                        {camp.totalProveedores} proveedores
                                                    </TableCell>
                                                    <TableCell className="px-6 text-right">
                                                        <div className="inline-flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                onClick={() =>
                                                                    setPaidModalCampaignId(
                                                                        camp.campaniaId,
                                                                    )
                                                                }
                                                            >
                                                                <Eye size={17} strokeWidth={2.3} /> Ver
                                                                pagados
                                                            </Button>
                                                            <Button
                                                                onClick={() => {
                                                                    navigate(`/liquidacion-compra/${camp.campaniaId}`);
                                                                    setSearch("");
                                                                }}
                                                            >
                                                                Ver cargas ({camp.totalCargas})
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </TableCard>
                </>
            )}

            {/* NIVEL 2: CARGAS DE LA CAMPAÑA EN LIQUIDACIÓN */}
            {selectedCampaignId !== null && subView === null && (
                <>
                    <FilterBar
                        onClear={() => setSearch("")}
                        canClear={search !== ""}
                        className="mb-6"
                    >
                        <FilterSearch
                            value={search}
                            onChange={(v) => {
                                setSearch(v);
                                setPage(1);
                            }}
                            placeholder="Buscar por carga, cliente, transportista, placa o chofer..."
                        />
                    </FilterBar>

                    <TableCard
                        icon={<Truck size={24} strokeWidth={2.5} />}
                        title="Cargas de la Campaña en Liquidación"
                        description="Elige Proveedor para liquidar la fruta comprada (con control UIT) o Transportista para liquidar el flete y gastos reales."
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
                        emptyDescription="Ninguna carga coincide con el filtro de búsqueda."
                        page={loadCurrentPage}
                        pageCount={loadPageCount}
                        onPageChange={setPage}
                    >
                        <div
                            className={`flex flex-col gap-3 ${
                                viewMode === "grid"
                                    ? "sm:grid sm:grid-cols-2 lg:grid-cols-3"
                                    : "sm:hidden"
                            }`}
                        >
                            {visibleLoads.map((load) => {
                                const liqCount = load.proveedores.filter(
                                    (p) => p.estado !== "Por liquidar",
                                ).length;
                                return (
                                    <TableGridCard
                                        key={load.id}
                                        accentColor="border-l-brand"
                                        icon={<Truck size={19} strokeWidth={2.2} />}
                                        title={`${load.codigo} · ${load.cliente}`}
                                        subtitle={`${load.transporte.placa} · ${load.transporte.chofer}`}
                                        badge={<StatusBadge status={load.transporte.estado} />}
                                        actions={
                                            <div className="flex w-full items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        navigate(`/liquidacion-compra/${selectedCampaignId}/cargas/${load.id}/proveedores`);
                                                        setProviderStatusTab(
                                                            load.proveedores[0]?.estado ??
                                                                "Por liquidar",
                                                        );
                                                    }}
                                                >
                                                    <Sprout size={15} strokeWidth={2.3} /> Proveedor (
                                                    {load.proveedores.length})
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        navigate(`/liquidacion-compra/${selectedCampaignId}/cargas/${load.id}/transportista`);
                                                    }}
                                                >
                                                    <Truck size={15} strokeWidth={2.3} /> Transportista
                                                </Button>
                                            </div>
                                        }
                                    >
                                        <TableGridCardFields>
                                            <TableGridCardField
                                                label="Kilos cargados"
                                                value={`${formatKg(load.kilosCargados)} kg`}
                                            />
                                            <TableGridCardField
                                                label="Proveedores liquidados"
                                                value={`${liqCount} de ${load.proveedores.length}`}
                                            />
                                        </TableGridCardFields>
                                    </TableGridCard>
                                );
                            })}
                        </div>

                        {viewMode === "table" && (
                            <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
                                <Table>
                                    <TableHeader className={TABLE_HEAD_BG}>
                                        <TableRow className="border-b border-border hover:bg-transparent">
                                            <TableHead className="h-14 px-6 font-semibold text-ink">
                                                Carga / Cliente
                                            </TableHead>
                                            <TableHead className="h-14 font-semibold text-ink">
                                                Transportista
                                            </TableHead>
                                            <TableHead className="h-14 font-semibold text-ink">
                                                Camión / Chofer
                                            </TableHead>
                                            <TableHead className="h-14 font-semibold text-ink">
                                                Kilos cargados
                                            </TableHead>
                                            <TableHead className="h-14 font-semibold text-ink">
                                                Liquidaciones
                                            </TableHead>
                                            <TableHead className="h-14 px-6 text-right font-semibold text-ink">
                                                Acciones
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {visibleLoads.map((load) => {
                                            const liqCount = load.proveedores.filter(
                                                (p) => p.estado !== "Por liquidar",
                                            ).length;
                                            return (
                                                <TableRow
                                                    key={load.id}
                                                    className="border-b border-border transition-colors hover:bg-surface-page/60"
                                                >
                                                    <TableCell className="relative h-20 px-6">
                                                        <TableRowAccent color="bg-brand" />
                                                        <TableRowLead
                                                            icon={
                                                                <FileSpreadsheet
                                                                    size={19}
                                                                    strokeWidth={2.2}
                                                                />
                                                            }
                                                            title={load.codigo}
                                                            subtitle={`${load.cliente} · ${formatDisplayDate(load.fechaCarga)}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-ink-body">
                                                        {load.transporte.transportista}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-ink">
                                                                {load.transporte.placa}
                                                            </span>
                                                            <span className="text-[12px] font-medium text-ink-muted">
                                                                {load.transporte.chofer}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-bold tabular-nums text-ink">
                                                        {formatKg(load.kilosCargados)} kg
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1 text-[12px] font-bold">
                                                            <span className="text-brand">
                                                                Proveedores: {liqCount} de{" "}
                                                                {load.proveedores.length}
                                                            </span>
                                                            <span className="text-ink-muted">
                                                                Transporte: {load.transporte.estado}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-6 text-right">
                                                        <div className="inline-flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => {
                                                                    navigate(`/liquidacion-compra/${selectedCampaignId}/cargas/${load.id}/proveedores`);
                                                                    setProviderStatusTab(
                                                                        load.proveedores[0]?.estado ??
                                                                            "Por liquidar",
                                                                    );
                                                                }}
                                                            >
                                                                <Sprout
                                                                    size={16}
                                                                    strokeWidth={2.3}
                                                                />{" "}
                                                                Proveedor
                                                            </Button>
                                                            <Button
                                                                onClick={() => {
                                                                    navigate(`/liquidacion-compra/${selectedCampaignId}/cargas/${load.id}/transportista`);
                                                                }}
                                                            >
                                                                <Truck
                                                                    size={16}
                                                                    strokeWidth={2.3}
                                                                />{" "}
                                                                Transportista
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </TableCard>
                </>
            )}

            {/* NIVEL 3A: LIQUIDACIÓN DE PROVEEDORES DE LA CARGA */}
            {subView === "proveedores" && activeLoad && (
                <div className="flex flex-col gap-6">
                    <SegmentedTabs
                        tabs={PROVIDER_TABS.map((t) => ({
                            ...t,
                            count: activeLoad.proveedores.filter((p) => p.estado === t.id).length,
                        }))}
                        value={visibleProviderStatus}
                        onChange={(v) => setProviderStatusTab(v as SettlementStatus)}
                        showLabelsOnMobile
                    />

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {activeLoad.proveedores
                            .filter((p) => p.estado === visibleProviderStatus)
                            .map((prov) => {
                                const pagado = prov.pagos.reduce((s, pay) => s + pay.importe, 0);
                                const saldo = Math.max(0, prov.total - pagado);

                                return (
                                    <Card
                                        key={prov.id}
                                        className="rounded-2xl border-border shadow-card"
                                    >
                                        <CardContent className="flex flex-col gap-4 p-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-surface text-brand">
                                                        <Sprout size={21} strokeWidth={2.2} />
                                                    </span>
                                                    <div>
                                                        <h3 className="text-[16px] font-bold text-ink">
                                                            {prov.proveedorNombre}
                                                        </h3>
                                                        <p className="text-[12.5px] font-medium text-ink-muted">
                                                            {prov.fincaNombre} · Variedad{" "}
                                                            {prov.variedad}
                                                        </p>
                                                    </div>
                                                </div>
                                                <StatusBadge status={prov.estado} />
                                            </div>

                                            <SummaryBar
                                                items={[
                                                    {
                                                        label: "Kilos reconocidos",
                                                        value: !prov.kilosReconocidos ? "Pendiente de recepción" : `${formatKg(prov.kilosReconocidos)} kg`,
                                                    },
                                                    {
                                                        label: "Precio / kg",
                                                        value: `${prov.moneda === 'USD' ? 'US$' : 'S/'} ${prov.precioKg.toFixed(2)}`,
                                                    },
                                                    {
                                                        label: "Total",
                                                        value: `${prov.moneda === 'USD' ? 'US$' : 'S/'} ${prov.total.toLocaleString("es-PE")}`,
                                                        tone: "brand",
                                                    },
                                                    {
                                                        label: "Saldo por pagar",
                                                        value: `${prov.moneda === 'USD' ? 'US$' : 'S/'} ${saldo.toLocaleString("es-PE")}`,
                                                        tone: saldo > 0 ? "highlight" : "brand",
                                                    },
                                                ]}
                                            />

                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <InfoField
                                                    label="Persona en liquidación (Control UIT)"
                                                    value={prov.personaLiquidadaNombre ? `${prov.personaLiquidadaNombre} (${prov.personaLiquidadaDocumento})` : "Pendiente de seleccionar"}
                                                />
                                                <InfoField
                                                    label="N° Liquidación / Fecha"
                                                    value={
                                                        prov.numeroLiquidacion
                                                            ? `${prov.numeroLiquidacion} · ${formatDisplayDate(prov.fechaLiquidacion)}`
                                                            : "Pendiente de emitir"
                                                    }
                                                />
                                            </div>

                                            {prov.archivoLiquidacion && (
                                                <FileDropzone
                                                    label="Comprobante de liquidación de compra"
                                                    file={prov.archivoLiquidacion}
                                                    onChange={() => {}}
                                                    readOnly
                                                    variant="horizontal"
                                                />
                                            )}

                                            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                                                <Button variant="outline" size="sm" onClick={() => navigate(`/liquidacion-compra/${selectedCampaignId}/cargas/${activeLoad.id}/proveedores/detalle/${prov.id}`)}>
                                                    <Eye size={15} strokeWidth={2.3} /> Ver detalle
                                                </Button>
                                                {prov.estado === "Por liquidar" ? (
                                                    <>
                                                        {providerReadiness(prov).some(item => item !== 'Persona titular o vinculada') && <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                if (!usesV1()) { setPendingModalLoad(activeLoad.codigo); return; }
                                                                const missing = providerReadiness(prov);
                                                                if (missing.includes('Kilos reconocidos en recepción')) navigate(`/logistica-despacho/${activeLoad.campaniaId}/cargas/${activeLoad.id}/recepcion`);
                                                                else if (missing.includes('Precio de compra acordado') || missing.includes('Moneda de compra admitida')) navigate(`/campaigns/${activeLoad.campaniaId}/providers`);
                                                                else setEditingProvider(prov);
                                                            }}
                                                        >
                                                            Completar pendientes
                                                        </Button>}
                                                        <Button
                                                            disabled={activeLoad.estadoCampania === 'terminado' || providerReadiness(prov).some(item => item !== 'Persona titular o vinculada')}
                                                            onClick={() => setEditingProvider(prov)}
                                                        >
                                                            <FileSpreadsheet
                                                                size={16}
                                                                strokeWidth={2.3}
                                                            />{" "}
                                                            Liquidar compra
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={activeLoad.estadoCampania === 'terminado' || prov.pagos.length > 0}
                                                            title={prov.pagos.length > 0 ? 'Esta liquidación ya tiene pagos y V1 bloquea su edición.' : undefined}
                                                            onClick={() => setEditingProvider(prov)}
                                                        >
                                                            <Pencil size={15} strokeWidth={2.3} />{" "}
                                                            Editar liquidación
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                setHistoryTarget({
                                                                    type: "provider",
                                                                    prov,
                                                                })
                                                            }
                                                        >
                                                            <History size={15} strokeWidth={2.3} />{" "}
                                                            Ver pagos ({prov.pagos.length})
                                                        </Button>
                                                        {activeLoad.estadoCampania !== 'terminado' && saldo > 0 && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() =>
                                                                    setPaymentTarget({
                                                                        type: "provider",
                                                                        prov,
                                                                    })
                                                                }
                                                            >
                                                                <Banknote
                                                                    size={15}
                                                                    strokeWidth={2.3}
                                                                />{" "}
                                                                Pagar
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* NIVEL 3B: LIQUIDACIÓN DEL TRANSPORTISTA DE LA CARGA */}
            {subView === "transportista" && activeLoad && (
                <div className="flex flex-col gap-6">
                    {(() => {
                        const t = activeLoad.transporte;
                        const totalGastosReales = t.gastosReales.reduce((s, g) => s + g.monto, 0);
                        const totalViaticosRef = t.viaticosMovilidad + t.viaticosInsumos;
                        const totalLiquidado = carrierTotal(t);
                        const totalPagado = t.pagos.reduce((s, p) => s + p.importe, 0);
                        const saldoPendiente = Math.max(0, totalLiquidado - totalPagado);
                        const totalAdelantoDisp = t.adelantosDisponibles.reduce(
                            (s, a) => s + a.saldoDisponible,
                            0,
                        );

                        return (
                            <>
                                <Card className="rounded-2xl border-border shadow-card">
                                    <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="flex items-center gap-3.5">
                                                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-brand-border bg-brand-surface text-brand">
                                                    <Truck size={24} strokeWidth={2.3} />
                                                </span>
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-[18px] font-extrabold text-ink">
                                                            {t.transportista}
                                                        </h3>
                                                        <StatusBadge status={t.estado} />
                                                    </div>
                                                    <p className="text-[13px] font-medium text-ink-muted">
                                                        Chofer de esta carga: {t.chofer} · Placa{" "}
                                                        {t.placa} · RUC {t.ruc}
                                                    </p>
                                                    {t.moneda !== 'PEN' && <p className="mt-2 text-sm text-ink-muted">Por ahora solo se permite liquidar transporte con acuerdos en PEN. Este acuerdo está en {t.moneda}.</p>}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                <Button variant="outline" onClick={() => navigate(`/liquidacion-compra/${selectedCampaignId}/cargas/${activeLoad.id}/transportista/detalle/${t.id}`)}>
                                                    <Eye size={16} strokeWidth={2.3} /> Ver detalle
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    disabled={t.moneda !== 'PEN' || activeLoad.estadoCampania === 'terminado' || t.pagos.length > 0}
                                                    title={t.moneda !== 'PEN' ? 'Por ahora solo se permite liquidar transporte con acuerdos en PEN.' : t.pagos.length > 0 ? 'Esta liquidación ya tiene pagos o adelantos aplicados y V1 bloquea su edición.' : undefined}
                                                    onClick={() => setCarrierModalOpen(true)}
                                                >
                                                    <Pencil size={16} strokeWidth={2.3} /> {t.estado === 'Por liquidar' ? 'Liquidar transporte' : 'Editar liquidación'}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() =>
                                                        setHistoryTarget({ type: "carrier" })
                                                    }
                                                >
                                                    <History size={16} strokeWidth={2.3} /> Historial
                                                    de pagos ({t.pagos.length})
                                                </Button>
                                                {activeLoad.estadoCampania !== 'terminado' && t.estado !== 'Por liquidar' && saldoPendiente > 0 && (
                                                    <Button
                                                        onClick={() =>
                                                            setPaymentTarget({ type: "carrier" })
                                                        }
                                                    >
                                                        <Banknote size={16} strokeWidth={2.3} />{" "}
                                                        Registrar pago / Aplicar adelanto
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        <SummaryBar
                                            items={[
                                                {
                                                    label: "Flete de la carga",
                                                    value: `${t.moneda === 'USD' ? 'US$' : 'S/'} ${t.fleteCarga.toLocaleString("es-PE")}`,
                                                },
                                                {
                                                    label: t.gastosReales.length ? "Gastos reales ruta" : "Viáticos aplicables",
                                                    value: `${t.moneda === 'USD' ? 'US$' : 'S/'} ${(t.gastosReales.length ? totalGastosReales : totalViaticosRef).toLocaleString("es-PE")}`,
                                                },
                                                {
                                                    label: t.estado === 'Por liquidar' ? "Total previsto" : "Total liquidado",
                                                    value: `${t.moneda === 'USD' ? 'US$' : 'S/'} ${totalLiquidado.toLocaleString("es-PE")}`,
                                                    tone: "brand",
                                                },
                                                {
                                                    label: "Saldo por pagar",
                                                    value: t.estado === 'Por liquidar' ? 'Pendiente de liquidar' : `${t.moneda === 'USD' ? 'US$' : 'S/'} ${saldoPendiente.toLocaleString("es-PE")}`,
                                                    tone: saldoPendiente > 0 ? "highlight" : "brand",
                                                },
                                            ]}
                                        />

                                        <ModalSection
                                            title="Acuerdo de la empresa y saldo en la campaña"
                                            aside={`Viáticos referenciales de carga: S/ ${totalViaticosRef.toFixed(2)}`}
                                        >
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                                <InfoField
                                                    label="Total contratado en campaña"
                                                    value={`${t.moneda === 'USD' ? 'US$' : 'S/'} ${t.totalContratadoCampania.toLocaleString("es-PE")}`}
                                                />
                                                <InfoField
                                                    label="Adelanto disponible para descontar"
                                                    value={`${t.moneda === 'USD' ? 'US$' : 'S/'} ${totalAdelantoDisp.toLocaleString("es-PE")}`}
                                                />
                                                <InfoField
                                                    label="N° Liquidación de transporte"
                                                    value={
                                                        t.numeroLiquidacion
                                                            ? `${t.numeroLiquidacion} · ${formatDisplayDate(t.fechaLiquidacion)}`
                                                            : "Sin emitir"
                                                    }
                                                />
                                            </div>
                                        </ModalSection>

                                        {t.archivoLiquidacion && (
                                            <FileDropzone
                                                label="Documento de liquidación de transporte"
                                                file={t.archivoLiquidacion}
                                                onChange={() => {}}
                                                readOnly
                                                variant="horizontal"
                                            />
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        );
                    })()}
                </div>
            )}

            {/* Modales de Liquidación de Compra */}
            <SettlementCampaignPaidModal
                open={paidModalCampaignId !== null}
                onOpenChange={(open) => !open && setPaidModalCampaignId(null)}
                campaniaNombre={paidModalCampaignName}
                loads={paidModalLoads}
            />

            <SettlementUitControlModal
                open={uitModalOpen}
                onOpenChange={setUitModalOpen}
                loads={loads}
            />

            <SettlementProviderModal
                open={editingProvider !== null}
                onOpenChange={(open) => !open && setEditingProvider(null)}
                load={activeLoad}
                providerEntry={activeLoad?.proveedores.find(provider => provider.id === editingProvider?.id) ?? editingProvider}
                existingNumbers={loads.flatMap(load => load.proveedores.map(provider => provider.numeroLiquidacion).filter(Boolean))}
                onAddLinkedPerson={addProviderLinkedPerson}
                onSave={async (loadId, providerEntryId, payload) => {
                    await saveProviderSettlement(loadId, providerEntryId, payload);
                    setProviderStatusTab("Por pagar");
                    setSuccessInfo({
                        title: "Liquidación de proveedor guardada",
                        description: `Se confirmó la liquidación ${payload.numeroLiquidacion} con validación de límite UIT.`,
                    });
                }}
            />

            <SettlementCarrierModal
                open={carrierModalOpen}
                onOpenChange={setCarrierModalOpen}
                load={activeLoad}
                existingNumbers={loads.map(load => load.transporte.numeroLiquidacion).filter(Boolean)}
                onSave={async (loadId, payload) => {
                    await saveCarrierSettlement(loadId, payload);
                    setSuccessInfo({
                        title: "Liquidación de transporte actualizada",
                        description:
                            "El flete del viaje y el desglose de gastos reales fueron guardados.",
                    });
                }}
            />

            <SettlementPaymentModal
                moneda={paymentTarget?.type === 'carrier' ? activeLoad?.transporte.moneda : paymentTarget?.prov.moneda}
                open={paymentTarget !== null}
                onOpenChange={(open) => !open && setPaymentTarget(null)}
                title={
                    paymentTarget?.type === "carrier"
                        ? "Registrar pago al transportista"
                        : "Registrar pago a proveedor"
                }
                beneficiaryName={
                    paymentTarget?.type === "carrier"
                        ? activeLoad?.transporte.transportista ?? ""
                        : paymentTarget?.prov.personaLiquidadaNombre ?? ""
                }
                documentNumber={
                    paymentTarget?.type === "carrier"
                        ? activeLoad?.transporte.numeroLiquidacion ?? ""
                        : paymentTarget?.prov.numeroLiquidacion ?? ""
                }
                totalAmount={
                    paymentTarget?.type === "carrier"
                        ? (activeLoad ? carrierTotal(activeLoad.transporte) : 0)
                        : paymentTarget?.prov.total ?? 0
                }
                paidAmount={
                    paymentTarget?.type === "carrier"
                        ? activeLoad?.transporte.pagos.reduce((s, p) => s + p.importe, 0) ?? 0
                        : paymentTarget?.prov.pagos.reduce((s, p) => s + p.importe, 0) ?? 0
                }
                availableAdvances={
                    paymentTarget?.type === "carrier"
                        ? activeLoad?.transporte.adelantosDisponibles
                        : undefined
                }
                onRegister={async (payment, advanceId) => {
                    if (!activeLoad || !paymentTarget) return;
                    if (paymentTarget.type === "carrier") {
                        await registerCarrierPayment(activeLoad.id, payment, advanceId);
                    } else {
                        await registerProviderPayment(activeLoad.id, paymentTarget.prov.id, payment);
                    }
                    setSuccessInfo({
                        title: "Pago registrado correctamente",
                        description:
                            payment.modo === "Adelanto"
                                ? "Se descontó el importe del adelanto disponible de la campaña."
                                : "El desembolso en caja fue aplicado al saldo de la liquidación.",
                    });
                }}
            />

            <SettlementPaymentHistoryModal
                readOnly={activeLoad?.estadoCampania === 'terminado'}
                moneda={historyTarget?.type === 'carrier' ? activeLoad?.transporte.moneda : historyTarget?.prov.moneda}
                open={historyTarget !== null}
                onOpenChange={(open) => !open && setHistoryTarget(null)}
                beneficiaryName={
                    historyTarget?.type === "carrier"
                        ? activeLoad?.transporte.transportista ?? ""
                        : historyTarget?.prov.personaLiquidadaNombre ?? ""
                }
                documentNumber={
                    historyTarget?.type === "carrier"
                        ? activeLoad?.transporte.numeroLiquidacion ?? ""
                        : historyTarget?.prov.numeroLiquidacion ?? ""
                }
                totalAmount={
                    historyTarget?.type === "carrier"
                        ? (activeLoad ? carrierTotal(activeLoad.transporte) : 0)
                        : historyTarget?.prov.total ?? 0
                }
                payments={
                    historyTarget?.type === "carrier"
                        ? activeLoad?.transporte.pagos ?? []
                        : historyTarget?.prov.pagos ?? []
                }
                onOpenRegisterPayment={() => {
                    if (historyTarget) {
                        setPaymentTarget(historyTarget);
                    }
                }}
            />

            <PendingDataResolutionModal
                open={pendingModalLoad !== null}
                onOpenChange={(open) => !open && setPendingModalLoad(null)}
                loadCode={pendingModalLoad ?? ""}
                campaignName={activeCampaign?.campaniaNombre ?? "Campaña"}
                initialTask="purchase-price"
                onResolved={(_task, label) => {
                    setSuccessInfo({
                        title: "Dato pendiente completado",
                        description: `Se actualizó "${label}" y la carga quedó lista para liquidar.`,
                    });
                }}
            />

            <SuccessModal
                open={successInfo !== null}
                onOpenChange={(open) => !open && setSuccessInfo(null)}
                title={successInfo?.title ?? ""}
                description={successInfo?.description ?? ""}
                badgeLabel="Liquidación de Compra"
            />
        </div>
    );
}
