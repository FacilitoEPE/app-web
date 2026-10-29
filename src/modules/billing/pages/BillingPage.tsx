import { useNavigate } from 'react-router-dom';
import { usesV1 } from '@/shared/api/data-contract';
import { useMemo, useState } from "react";
import {
    AlertTriangle,
    ArrowLeft,
    Banknote,
    Building2,
    CheckCircle2,
    FileCheck2,
    FileSpreadsheet,
    Globe,
    History,
    Layers,
    Mail,
    Pencil,
    Plus,
    Receipt,
    Sprout,
    User,
    Wallet,
} from "lucide-react";
import BillingCollectionsImg from "@/assets/billing_collections.webp";
import ContextBanner from "@/shared/components/ContextBanner";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import EntityOverviewCard from "@/shared/components/EntityOverviewCard";
import FileDropzone from "@/shared/components/FileDropzone";
import FilterBar, { FilterSearch } from "@/shared/components/FilterBar";
import { SummaryBar } from "@/shared/components/InfoField";
import MetricCards, { type Metric } from "@/shared/components/MetricCards";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
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
import BillingCollectionHistoryModal from "@/modules/billing/components/BillingCollectionHistoryModal";
import BillingIssueInvoiceModal from "@/modules/billing/components/BillingIssueInvoiceModal";
import BillingPrepareInvoiceModal from "@/modules/billing/components/BillingPrepareInvoiceModal";
import BillingRegisterCollectionModal from "@/modules/billing/components/BillingRegisterCollectionModal";
import type { BillingInvoice, BillingLoad } from "@/modules/billing/billing.models";
import {
    issueBillingElectronicInvoice,
    registerBillingCollection,
    saveBillingInvoicePreparation,
    useBillingClients,
} from "@/modules/billing/billing.store";

interface CampaignBillingRow {
    campaniaId: number;
    campaniaNombre: string;
    fruta: string;
    estado: string;
    totalClientes: number;
    totalCargas: number;
    totalFacturas: number;
}

export default function BillingPage() {
    const navigate = useNavigate();
    const clients = useBillingClients();

    const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<TableViewMode>("table");

    // Estados de modales (Nivel 3)
    const [prepareTarget, setPrepareTarget] = useState<{
        load: BillingLoad;
        invoice: BillingInvoice | null;
    } | null>(null);
    const [issueTarget, setIssueTarget] = useState<{
        load: BillingLoad;
        invoice: BillingInvoice;
    } | null>(null);
    const [collectionTarget, setCollectionTarget] = useState<{
        load: BillingLoad;
        invoice: BillingInvoice;
    } | null>(null);
    const [historyTarget, setHistoryTarget] = useState<{
        load: BillingLoad;
        invoice: BillingInvoice;
    } | null>(null);
    const [successInfo, setSuccessInfo] = useState<{ title: string; description: string } | null>(
        null,
    );
    const [pendingModalLoad, setPendingModalLoad] = useState<string | null>(null);

    const campaignRows = useMemo<CampaignBillingRow[]>(() => {
        const byCamp = new Map<number, CampaignBillingRow>();
        for (const cli of clients) {
            const current = byCamp.get(cli.campaniaId) ?? {
                campaniaId: cli.campaniaId,
                campaniaNombre: cli.campaniaNombre,
                fruta: cli.fruta,
                estado: cli.estadoCampania,
                totalClientes: 0,
                totalCargas: 0,
                totalFacturas: 0,
            };
            current.totalClientes += 1;
            current.totalCargas += cli.cargas.length;
            current.totalFacturas += cli.cargas.reduce((s, l) => s + l.facturas.length, 0);
            byCamp.set(cli.campaniaId, current);
        }
        return [...byCamp.values()];
    }, [clients]);

    const activeCampaign = useMemo(
        () => campaignRows.find((c) => c.campaniaId === selectedCampaignId) ?? null,
        [campaignRows, selectedCampaignId],
    );

    const campaignClients = useMemo(
        () =>
            selectedCampaignId === null
                ? []
                : clients.filter((c) => c.campaniaId === selectedCampaignId),
        [clients, selectedCampaignId],
    );

    const activeClient = useMemo(
        () => clients.find((c) => c.id === selectedClientId) ?? null,
        [clients, selectedClientId],
    );

    // KPIs financieros para Nivel 2
    const campaignMetrics = useMemo<Metric[]>(() => {
        let facturadoEur = 0;
        let cobradoEur = 0;
        let facturadoUsd = 0;
        let cobradoUsd = 0;
        let facturadoPen = 0;
        let cobradoPen = 0;

        for (const cli of campaignClients) {
            for (const load of cli.cargas) {
                for (const inv of load.facturas) {
                    const cobrado = inv.cobros.reduce((s, c) => s + c.importe, 0);
                    if (inv.moneda === "EUR") {
                        facturadoEur += inv.total; cobradoEur += cobrado;
                    } else if (inv.moneda === "USD") {
                        facturadoUsd += inv.total;
                        cobradoUsd += cobrado;
                    } else {
                        facturadoPen += inv.total;
                        cobradoPen += cobrado;
                    }
                }
            }
        }

        const saldoUsd = Math.max(0, facturadoUsd - cobradoUsd);
        const saldoPen = Math.max(0, facturadoPen - cobradoPen);

        return [
            {
                title: "TOTAL FACTURADO",
                value: `US$ ${facturadoUsd.toLocaleString("es-PE")}`,
                unit: [facturadoPen > 0 ? `S/ ${facturadoPen.toLocaleString("es-PE")}` : "", facturadoEur > 0 ? `€ ${facturadoEur.toLocaleString("es-PE")}` : ""].filter(Boolean).join(" + ") || "USD",
                description: "Preparaciones y facturas emitidas",
                icon: Receipt,
            },
            {
                title: "TOTAL COBRADO",
                value: `US$ ${cobradoUsd.toLocaleString("es-PE")}`,
                unit: [cobradoPen > 0 ? `S/ ${cobradoPen.toLocaleString("es-PE")}` : "", cobradoEur > 0 ? `€ ${cobradoEur.toLocaleString("es-PE")}` : ""].filter(Boolean).join(" + ") || "USD",
                description: "Abonos conciliados en bancos",
                icon: CheckCircle2,
            },
            {
                title: "SALDO POR COBRAR",
                value: `US$ ${saldoUsd.toLocaleString("es-PE")}`,
                unit: [saldoPen > 0 ? `S/ ${saldoPen.toLocaleString("es-PE")}` : "", facturadoEur > cobradoEur ? `€ ${(facturadoEur-cobradoEur).toLocaleString("es-PE")}` : ""].filter(Boolean).join(" + ") || "USD",
                description: "Cuentas por cobrar pendientes",
                icon: Wallet,
                warm: saldoUsd > 0 || saldoPen > 0,
            },
            {
                title: "CLIENTES EN CAMPAÑA",
                value: String(campaignClients.length),
                unit: "clientes",
                description: "Con contratos y cargas vinculadas",
                icon: Building2,
            },
        ];
    }, [campaignClients]);

    const filteredCampaigns = useMemo(() => {
        const q = search.trim().toLowerCase();
        return campaignRows.filter((c) =>
            !q ? true : `${c.campaniaNombre} ${c.fruta}`.toLowerCase().includes(q),
        );
    }, [campaignRows, search]);

    const filteredClients = useMemo(() => {
        const q = search.trim().toLowerCase();
        return campaignClients.filter((c) =>
            !q ? true : `${c.nombreEmpresa} ${c.ruc} ${c.canal}`.toLowerCase().includes(q),
        );
    }, [campaignClients, search]);

    const {
        pageCount: campPageCount,
        currentPage: campCurrentPage,
        visible: visibleCampaigns,
    } = paginate(filteredCampaigns, page);

    const {
        pageCount: cliPageCount,
        currentPage: cliCurrentPage,
        visible: visibleClients,
    } = paginate(filteredClients, page);

    const getCampaignExport = (): TableExport => ({
        filename: "facturacion_campanias",
        title: "Facturación y Cobros — Campañas",
        header: ["Campaña", "Fruta", "Estado", "Clientes", "Cargas registradas", "Documentos"],
        rows: filteredCampaigns.map((c) => [
            c.campaniaNombre,
            c.fruta,
            c.estado,
            String(c.totalClientes),
            String(c.totalCargas),
            String(c.totalFacturas),
        ]),
    });

    const getClientsExport = (): TableExport => ({
        filename: "facturacion_clientes_campania",
        title: `Clientes en Facturación — ${activeCampaign?.campaniaNombre ?? ""}`,
        header: ["Cliente", "RUC / ID", "Canal", "Cargas", "Kilos contratados", "Total contratado"],
        rows: filteredClients.map((c) => [
            c.nombreEmpresa,
            c.ruc,
            c.canal,
            String(c.cargas.length),
            `${formatKg(c.kilosContratados)} kg`,
            `${c.moneda === "EUR" ? "€" : c.moneda === "USD" ? "US$" : "S/"} ${(c.kilosContratados * c.precioPorKg).toLocaleString("es-PE")}`,
        ]),
    });

    const getInvoiceActions = (
        load: BillingLoad,
        invoice: BillingInvoice,
    ): { primary: RowAction[]; secondary: RowAction[] } => {
        const cobrado = invoice.cobros.reduce((s, c) => s + c.importe, 0);
        const saldo = Math.max(0, invoice.total - cobrado);

        return {
            primary: [
                {
                    label: "Historial de cobros",
                    icon: <History size={18} strokeWidth={2.3} />,
                    onClick: () => setHistoryTarget({ load, invoice }),
                },
                {
                    label: "Editar preparación",
                    icon: <Pencil size={18} strokeWidth={2.3} />,
                    onClick: () => setPrepareTarget({ load, invoice }),
                },
            ],
            secondary: [
                {
                    label: "Registrar factura emitida",
                    icon: <FileCheck2 size={16} strokeWidth={2.2} />,
                    onClick: () => setIssueTarget({ load, invoice }),
                },
                ...(saldo > 0
                    ? [
                          {
                              label: "Registrar cobro",
                              icon: <Banknote size={16} strokeWidth={2.2} />,
                              variant: "brand" as const,
                              onClick: () => setCollectionTarget({ load, invoice }),
                          },
                      ]
                    : []),
            ],
        };
    };

    const hasIncompleteLoads = useMemo(
        () =>
            campaignClients.some((cli) =>
                cli.cargas.some((load) => !load.respaldoLogisticoCompleto),
            ),
        [campaignClients],
    );

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            {/* NIVEL 2: BANNER DE CAMPAÑA */}
            {selectedCampaignId !== null && selectedClientId === null && activeCampaign && (
                <ContextBanner
                    ariaLabel={activeCampaign.campaniaNombre}
                    eyebrow={{
                        icon: <Receipt size={15} strokeWidth={2.4} />,
                        label: "Facturación y Cobros · Campaña",
                    }}
                    title={activeCampaign.campaniaNombre}
                    titleAddon={<StatusBadge status={activeCampaign.estado} />}
                    meta={[
                        {
                            icon: <Sprout size={15} strokeWidth={2.2} />,
                            content: `Fruta: ${activeCampaign.fruta}`,
                        },
                        {
                            icon: <Building2 size={15} strokeWidth={2.2} />,
                            content: `${activeCampaign.totalClientes} clientes participantes`,
                        },
                    ]}
                    caption="Preparación de facturas por carga, emisión electrónica SUNAT y conciliación de cobros"
                    stats={[
                        { label: "cargas registradas", value: String(activeCampaign.totalCargas) },
                        { label: "documentos emitidos", value: String(activeCampaign.totalFacturas) },
                    ]}
                    image={BillingCollectionsImg}
                />
            )}

            <PageHeader
                icon={<Receipt size={24} strokeWidth={2.5} />}
                title={
                    selectedClientId !== null
                        ? "Cargas y Facturas del Cliente"
                        : selectedCampaignId !== null
                            ? "Clientes de la Campaña"
                            : "Facturación y Cobros"
                }
                description={
                    selectedClientId !== null
                        ? "Prepara la factura de cada carga recibida en planta, registra su emisión electrónica y concilia sus cobros."
                        : selectedCampaignId !== null
                            ? "Selecciona un cliente de la campaña para gestionar la facturación y cobranza de sus cargas."
                            : "Selecciona una campaña para administrar la facturación a clientes de exportación e industria."
                }
                action={
                    selectedClientId !== null ? (
                        <Button
                            variant="outline"
                            size="xl"
                            onClick={() => setSelectedClientId(null)}
                        >
                            <ArrowLeft size={19} strokeWidth={2.5} /> Volver a clientes
                        </Button>
                    ) : selectedCampaignId !== null ? (
                        <Button
                            variant="outline"
                            size="xl"
                            onClick={() => {
                                setSelectedCampaignId(null);
                                setSearch("");
                            }}
                        >
                            <ArrowLeft size={19} strokeWidth={2.5} /> Volver a campañas
                        </Button>
                    ) : undefined
                }
            />

            {/* NIVEL 1: LISTADO DE CAMPAÑAS EN FACTURACIÓN */}
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
                        icon={<Receipt size={24} strokeWidth={2.5} />}
                        title="Campañas en Facturación"
                        description="Ingresa a una campaña para ver sus clientes, cargas recibidas y estado de cobranza."
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
                        emptyTitle="Sin campañas registradas"
                        emptyDescription="No se encontraron campañas con el criterio de búsqueda."
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
                                            <Button
                                                size="sm"
                                                className="ml-auto"
                                                onClick={() => {
                                                    setSelectedCampaignId(camp.campaniaId);
                                                    setSearch("");
                                                }}
                                            >
                                                Ver clientes ({camp.totalClientes})
                                            </Button>
                                        }
                                    >
                                        <TableGridCardFields>
                                            <TableGridCardField
                                                label="Cargas registradas"
                                                value={String(camp.totalCargas)}
                                            />
                                            <TableGridCardField
                                                label="Facturas / Preparaciones"
                                                value={String(camp.totalFacturas)}
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
                                                Documentos
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
                                                            subtitle={`${camp.totalClientes} cliente(s) en campaña`}
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
                                                        {camp.totalFacturas} factura(s)
                                                    </TableCell>
                                                    <TableCell className="px-6 text-right">
                                                        <Button
                                                            onClick={() => {
                                                                setSelectedCampaignId(camp.campaniaId);
                                                                setSearch("");
                                                            }}
                                                        >
                                                            Ver clientes ({camp.totalClientes})
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
                </>
            )}

            {/* NIVEL 2: CLIENTES DE LA CAMPAÑA */}
            {selectedCampaignId !== null && selectedClientId === null && (
                <>
                    {hasIncompleteLoads && (
                        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-status-highlight/40 bg-status-highlight-surface px-4 py-3.5 text-[13px] font-semibold text-status-highlight">
                            <AlertTriangle size={19} className="shrink-0" strokeWidth={2.4} />
                            <span>
                                Existen cargas en esta campaña con recepción o cierre documental pendiente en
                                Logística y Despacho.
                            </span>
                        </div>
                    )}

                    <div className="mb-6">
                        <MetricCards
                            metrics={campaignMetrics}
                            label="Indicadores financieros de la campaña"
                        />
                    </div>

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
                            placeholder="Buscar cliente por razón social, RUC o canal..."
                        />
                    </FilterBar>

                    <TableCard
                        icon={<Building2 size={24} strokeWidth={2.5} />}
                        title="Clientes de la Campaña"
                        description="Revisa el volumen contratado y accede a las cargas y facturas de cada cliente."
                        headerRight={
                            <TableToolbar>
                                <TableCountPill
                                    icon={<Building2 size={16} strokeWidth={2.5} className="text-brand" />}
                                    count={filteredClients.length}
                                    singular="cliente"
                                    plural="clientes"
                                />
                                <TableExportMenu getData={getClientsExport} />
                                <TableViewToggle value={viewMode} onChange={setViewMode} />
                            </TableToolbar>
                        }
                        isEmpty={visibleClients.length === 0}
                        emptyTitle="Sin clientes encontrados"
                        emptyDescription="Ningún cliente coincide con el filtro de búsqueda."
                        page={cliCurrentPage}
                        pageCount={cliPageCount}
                        onPageChange={setPage}
                    >
                        <div
                            className={`flex flex-col gap-3 ${
                                viewMode === "grid"
                                    ? "sm:grid sm:grid-cols-2 lg:grid-cols-3"
                                    : "sm:hidden"
                            }`}
                        >
                            {visibleClients.map((cli) => {
                                const symbol = cli.moneda === "EUR" ? "€" : cli.moneda === "USD" ? "US$" : "S/";
                                const totalContract = cli.kilosContratados * cli.precioPorKg;
                                return (
                                    <TableGridCard
                                        key={cli.id}
                                        accentColor="border-l-brand"
                                        icon={<Building2 size={19} strokeWidth={2.2} />}
                                        title={cli.nombreEmpresa}
                                        subtitle={`RUC / Tax ID: ${cli.ruc}`}
                                        badge={<StatusBadge status={cli.canal} />}
                                        actions={
                                            <Button
                                                size="sm"
                                                className="ml-auto"
                                                onClick={() => setSelectedClientId(cli.id)}
                                            >
                                                Facturar / Ver facturas ({cli.cargas.length})
                                            </Button>
                                        }
                                    >
                                        <TableGridCardFields>
                                            <TableGridCardField
                                                label="Cargas registradas"
                                                value={`${cli.cargas.length} carga(s)`}
                                            />
                                            <TableGridCardField
                                                label="Kilos contratados"
                                                value={`${formatKg(cli.kilosContratados)} kg`}
                                            />
                                            <TableGridCardField
                                                label="Precio unitario"
                                                value={`${symbol} ${cli.precioPorKg.toFixed(2)} / kg`}
                                            />
                                            <TableGridCardField
                                                label="Total contratado"
                                                value={`${symbol} ${totalContract.toLocaleString("es-PE")}`}
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
                                                Cliente
                                            </TableHead>
                                            <TableHead className="h-14 font-semibold text-ink">
                                                RUC / Tax ID
                                            </TableHead>
                                            <TableHead className="h-14 font-semibold text-ink">
                                                Cargas registradas
                                            </TableHead>
                                            <TableHead className="h-14 font-semibold text-ink">
                                                Kilos contratados
                                            </TableHead>
                                            <TableHead className="h-14 font-semibold text-ink">
                                                Precio total contratado
                                            </TableHead>
                                            <TableHead className="h-14 px-6 text-right font-semibold text-ink">
                                                Acciones
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {visibleClients.map((cli) => {
                                            const symbol = cli.moneda === "EUR" ? "€" : cli.moneda === "USD" ? "US$" : "S/";
                                            const totalContract =
                                                cli.kilosContratados * cli.precioPorKg;
                                            return (
                                                <TableRow
                                                    key={cli.id}
                                                    className="border-b border-border transition-colors hover:bg-surface-page/60"
                                                >
                                                    <TableCell className="relative h-20 px-6">
                                                        <TableRowAccent color="bg-brand" />
                                                        <TableRowLead
                                                            icon={
                                                                <Building2 size={19} strokeWidth={2.2} />
                                                            }
                                                            title={cli.nombreEmpresa}
                                                            subtitle={`${cli.canal} · ${cli.pais}`}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-semibold tabular-nums text-ink-body">
                                                        {cli.ruc}
                                                    </TableCell>
                                                    <TableCell className="font-bold tabular-nums text-ink">
                                                        {cli.cargas.length} carga(s)
                                                    </TableCell>
                                                    <TableCell className="font-bold tabular-nums text-ink">
                                                        {formatKg(cli.kilosContratados)} kg
                                                    </TableCell>
                                                    <TableCell className="font-bold tabular-nums text-brand">
                                                        {symbol} {totalContract.toLocaleString("es-PE")} (
                                                        {symbol} {cli.precioPorKg.toFixed(2)}/kg)
                                                    </TableCell>
                                                    <TableCell className="px-6 text-right">
                                                        <Button
                                                            onClick={() => setSelectedClientId(cli.id)}
                                                        >
                                                            Facturar / Ver facturas
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
                </>
            )}

            {/* NIVEL 3: CARGAS Y FACTURAS DEL CLIENTE EN LA CAMPAÑA */}
            {selectedClientId !== null && activeClient && (
                <div className="flex flex-col gap-6">
                    <EntityOverviewCard
                        avatar={<Building2 />}
                        eyebrow={`Cliente Comercial · ${activeClient.canal}`}
                        title={activeClient.nombreEmpresa}
                        chips={[
                            {
                                icon: <Receipt />,
                                label: `RUC / Tax ID: ${activeClient.ruc}`,
                            },
                            {
                                icon: <Globe />,
                                label: activeClient.pais,
                            },
                        ]}
                        details={[
                            {
                                icon: <User />,
                                label: "Contacto comercial",
                                value: activeClient.contacto,
                            },
                            {
                                icon: <Mail />,
                                label: "Correo electrónico",
                                value: activeClient.correo,
                            },
                            {
                                icon: <Layers />,
                                label: "Volumen contratado",
                                value: `${formatKg(activeClient.kilosContratados)} kg`,
                            },
                            {
                                icon: <Wallet />,
                                label: "Precio y total contratado",
                                value: `${activeClient.moneda === "EUR" ? "€" : activeClient.moneda === "USD" ? "US$" : "S/"} ${activeClient.precioPorKg.toFixed(2)} / kg · Total: ${activeClient.moneda === "EUR" ? "€" : activeClient.moneda === "USD" ? "US$" : "S/"} ${(activeClient.kilosContratados * activeClient.precioPorKg).toLocaleString("es-PE")}`,
                            },
                        ]}
                        watermark={Building2}
                    />

                    {/* Bloques por cada Carga del cliente */}
                    <div className="flex flex-col gap-5">
                        {activeClient.cargas.map((load, idx) => {
                            const symbol = load.moneda === "EUR" ? "€" : load.moneda === "USD" ? "US$" : "S/";
                            const kilosFacturadosLoad = load.facturas.reduce(
                                (s, f) => s + f.kilosFacturados,
                                0,
                            );

                            return (
                                <Card
                                    key={load.id}
                                    className="rounded-2xl border-border shadow-card"
                                >
                                    <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-[17px] font-extrabold text-ink">
                                                        Carga {idx + 1} · {load.codigo}
                                                    </span>
                                                    <StatusBadge
                                                        status={
                                                            load.respaldoLogisticoCompleto
                                                                ? "Completa"
                                                                : "Por completar"
                                                        }
                                                    />
                                                </div>
                                                <p className="mt-0.5 text-[12.5px] font-medium text-ink-muted">
                                                    Recepción en planta:{" "}
                                                    {formatDisplayDate(load.fechaRecepcion)}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {!load.respaldoLogisticoCompleto && (
                                                    <Button
                                                        variant="outline"
                                                        size="lg"
                                                        onClick={() =>
                                                            usesV1() ? navigate(`/campaigns/${activeClient?.campaniaId}/clients`) : setPendingModalLoad(load.codigo)
                                                        }
                                                    >
                                                        Completar pendientes
                                                    </Button>
                                                )}
                                                <Button
                                                    size="lg"
                                                    onClick={() =>
                                                        setPrepareTarget({ load, invoice: null })
                                                    }
                                                >
                                                    <Plus size={18} strokeWidth={2.5} /> Preparar
                                                    factura
                                                </Button>
                                            </div>
                                        </div>

                                        <SummaryBar
                                            items={[
                                                {
                                                    label: "Kilos cargados",
                                                    value: `${formatKg(load.kilosCargados)} kg`,
                                                },
                                                {
                                                    label: "Kilos recibidos",
                                                    value: `${formatKg(load.kilosRecibidos)} kg`,
                                                    tone: "brand",
                                                },
                                                {
                                                    label: "Kilos facturados",
                                                    value: `${formatKg(kilosFacturadosLoad)} kg`,
                                                },
                                                {
                                                    label: "Precio de venta",
                                                    value: `${symbol} ${load.precioVentaKg.toFixed(2)} / kg`,
                                                },
                                            ]}
                                        />

                                        {load.reporteRecepcion && (
                                            <FileDropzone
                                                label="Reporte de recepción en planta (Respaldo logístico)"
                                                file={load.reporteRecepcion}
                                                onChange={() => {}}
                                                readOnly
                                                variant="horizontal"
                                            />
                                        )}

                                        {/* Tarjetas / Tabla de facturas de esta carga */}
                                        {load.facturas.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-border bg-surface-page/40 p-5 text-center text-[13px] font-medium text-ink-muted">
                                                Aún no hay preparaciones ni facturas emitidas para esta carga.
                                                Haz clic en <strong>Preparar factura</strong> para iniciar.
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-3">
                                                {load.facturas.map((inv) => {
                                                    const cobrado = inv.cobros.reduce(
                                                        (s, c) => s + c.importe,
                                                        0,
                                                    );
                                                    const saldo = Math.max(0, inv.total - cobrado);
                                                    return (
                                                        <div
                                                            key={inv.id}
                                                            className="flex flex-col justify-between gap-4 rounded-2xl border border-brand-border/60 bg-surface-page/50 p-4 sm:flex-row sm:items-center"
                                                        >
                                                            <div className="flex items-start gap-3.5">
                                                                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-surface text-brand">
                                                                    <FileSpreadsheet
                                                                        size={20}
                                                                        strokeWidth={2.3}
                                                                    />
                                                                </span>
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <span className="text-[15px] font-bold text-ink">
                                                                            {inv.numeroFacturaElectronica ||
                                                                                inv.referenciaPreparacion}
                                                                        </span>
                                                                        {inv.numeroFacturaElectronica && (
                                                                            <span className="text-[12px] font-medium text-ink-muted">
                                                                                ({inv.referenciaPreparacion})
                                                                            </span>
                                                                        )}
                                                                        <StatusBadge status={inv.estado} />
                                                                    </div>
                                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] font-semibold tabular-nums">
                                                                        <span className="text-ink-body">
                                                                            Kilos:{" "}
                                                                            {formatKg(inv.kilosFacturados)} kg
                                                                        </span>
                                                                        <span className="text-ink">
                                                                            Total: {symbol}{" "}
                                                                            {inv.total.toLocaleString(
                                                                                "es-PE",
                                                                                { minimumFractionDigits: 2 },
                                                                            )}
                                                                        </span>
                                                                        <span className="text-brand">
                                                                            Cobrado: {symbol}{" "}
                                                                            {cobrado.toLocaleString("es-PE", {
                                                                                minimumFractionDigits: 2,
                                                                            })}
                                                                        </span>
                                                                        <span className="text-status-highlight">
                                                                            Saldo: {symbol}{" "}
                                                                            {saldo.toLocaleString("es-PE", {
                                                                                minimumFractionDigits: 2,
                                                                            })}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[11.5px] font-medium text-ink-muted">
                                                                        Vencimiento:{" "}
                                                                        {formatDisplayDate(
                                                                            inv.fechaVencimiento,
                                                                        )}{" "}
                                                                        · {inv.cobros.length} cobro(s)
                                                                        registrado(s)
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-end gap-2">
                                                                {!inv.numeroFacturaElectronica && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            setIssueTarget({
                                                                                load,
                                                                                invoice: inv,
                                                                            })
                                                                        }
                                                                    >
                                                                        <FileCheck2
                                                                            size={15}
                                                                            strokeWidth={2.3}
                                                                        />{" "}
                                                                        Emitir factura
                                                                    </Button>
                                                                )}
                                                                {saldo > 0 && (
                                                                    <Button
                                                                        size="sm"
                                                                        disabled={!inv.numeroFacturaElectronica}
                                                                        title={
                                                                            !inv.numeroFacturaElectronica
                                                                                ? "Debe emitir la factura electrónica antes de registrar un cobro."
                                                                                : undefined
                                                                        }
                                                                        onClick={() =>
                                                                            setCollectionTarget({
                                                                                load,
                                                                                invoice: inv,
                                                                            })
                                                                        }
                                                                    >
                                                                        <Banknote
                                                                            size={15}
                                                                            strokeWidth={2.3}
                                                                        />{" "}
                                                                        Cobrar
                                                                    </Button>
                                                                )}
                                                                <RowActions
                                                                    {...getInvoiceActions(load, inv)}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modales de Facturación y Cobros */}
            <BillingPrepareInvoiceModal
                open={prepareTarget !== null}
                onOpenChange={(open) => !open && setPrepareTarget(null)}
                client={activeClient}
                load={prepareTarget?.load ?? null}
                editingInvoice={prepareTarget?.invoice ?? null}
                onSave={async (clientId, loadId, invoice) => {
                    await saveBillingInvoicePreparation(clientId, loadId, invoice);
                    setSuccessInfo({
                        title: invoice.id
                            ? "Preparación de factura actualizada"
                            : "Preparación de factura creada",
                        description:
                            "Los importes, kilos recibidos y respaldos de la preparación fueron guardados.",
                    });
                }}
            />

            <BillingIssueInvoiceModal
                open={issueTarget !== null}
                onOpenChange={(open) => !open && setIssueTarget(null)}
                client={activeClient}
                load={issueTarget?.load ?? null}
                invoice={issueTarget?.invoice ?? null}
                onIssue={async (clientId, loadId, invoiceId, payload) => {
                    await issueBillingElectronicInvoice(clientId, loadId, invoiceId, payload);
                    setSuccessInfo({
                        title: "Factura electrónica registrada",
                        description: `Se vinculó el comprobante electrónico ${payload.numeroFacturaElectronica} a la carga.`,
                    });
                }}
            />

            <BillingRegisterCollectionModal
                open={collectionTarget !== null}
                onOpenChange={(open) => !open && setCollectionTarget(null)}
                client={activeClient}
                load={collectionTarget?.load ?? null}
                invoice={collectionTarget?.invoice ?? null}
                onRegister={async (clientId, loadId, invoiceId, collection) => {
                    await registerBillingCollection(clientId, loadId, invoiceId, collection);
                    setSuccessInfo({
                        title: "Cobro registrado con éxito",
                        description:
                            "El movimiento fue aplicado al saldo del documento y agregado al historial de cobros.",
                    });
                }}
            />

            <BillingCollectionHistoryModal
                open={historyTarget !== null}
                onOpenChange={(open) => !open && setHistoryTarget(null)}
                client={activeClient}
                invoice={historyTarget?.invoice ?? null}
                onOpenRegisterCollection={() => {
                    if (historyTarget) {
                        setCollectionTarget(historyTarget);
                    }
                }}
            />

            <PendingDataResolutionModal
                open={pendingModalLoad !== null}
                onOpenChange={(open) => !open && setPendingModalLoad(null)}
                loadCode={pendingModalLoad ?? ""}
                campaignName={activeCampaign?.campaniaNombre ?? "Campaña"}
                initialTask="receipt"
                onResolved={(_task, label) => {
                    setSuccessInfo({
                        title: "Dato pendiente completado",
                        description: `Se actualizó "${label}" y la carga quedó lista para facturación.`,
                    });
                }}
            />

            <SuccessModal
                open={successInfo !== null}
                onOpenChange={(open) => !open && setSuccessInfo(null)}
                title={successInfo?.title ?? ""}
                description={successInfo?.description ?? ""}
                badgeLabel="Facturación y Cobros"
            />
        </div>
    );
}
