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
import { demoPdf } from "@/shared/utils/demoData";
import type { TableExport } from "@/shared/utils/exportTable";
import { formatDisplayDate, formatKg } from "@/shared/utils/format";
import { paginate } from "@/shared/utils/paginate";
import { getCampanas } from "@/modules/campaigns/api/campaign.api";
import { getClientesNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.api";
import { useCampaignContractRecords } from "@/modules/campaigns/campaignClientContracts.store";
import { useCampaignDeliveryRecords } from "@/modules/campaigns/campaignContractDeliveries.store";
import CommercialClientCampaignDetailModal, {
    type CommercialParticipationRow,
} from "@/modules/commercial-planning/components/CommercialClientCampaignDetailModal";

const DEMO_PARTICIPATIONS: CommercialParticipationRow[] = [
    {
        id: "part-1",
        campaniaId: 1,
        campaniaNombre: "Campaña Mango Kent 2026",
        fruta: "Mango",
        variedades: ["Kent", "Edward"],
        relationId: 1,
        clienteId: 1,
        clienteNombre: "Nature's Pride B.V.",
        ruc: "NL813492018B01",
        canal: "Exportador",
        pais: "Países Bajos",
        cantidadRequeridaKg: 60000,
        kilosAcordados: 60000,
        fechaRegistro: "2026-09-18",
        observaciones: "Cliente prioritario con ventana de embarque octubre-diciembre.",
        contracts: [
            {
                id: 101,
                fechaRegistro: "2026-09-20",
                precioKg: 1.85,
                moneda: "USD",
                cantidadPropuestaKg: 40000,
                condicionesPago: "50% contra embarque BL · 50% a 15 días de arribo",
                condicionesEntrega: "FOB Puerto de Paita · Contenedor Reefer 40 pies",
                observaciones: "Calibre 7-10 con certificación GlobalG.A.P.",
                archivo: demoPdf("contrato_natures_pride_lote1.pdf", "Contrato Natures Pride Lote 1"),
            },
            {
                id: 102,
                fechaRegistro: "2026-10-02",
                precioKg: 1.9,
                moneda: "USD",
                cantidadPropuestaKg: 20000,
                condicionesPago: "Transferencia SWIFT a 15 días",
                condicionesEntrega: "Planta Empacadora Paita · Zona Industrial II",
                observaciones: "Ampliación de volumen para variedad Kent orgánica.",
                archivo: demoPdf("adenda_natures_pride_lote2.pdf", "Adenda Natures Pride Lote 2"),
            },
        ],
        deliveries: [
            {
                contractId: 101,
                contractName: "contrato_natures_pride_lote1.pdf",
                delivery: {
                    id: 1,
                    fecha: "2026-10-25",
                    kilosProgramados: 20000,
                    destino: "Planta Empacadora Paita · Zona Industrial II",
                    observaciones: "Primer despacho de campaña.",
                    coordinacion: {
                        carrierId: 1,
                        vehicleId: 1,
                        driverId: 1,
                        proveedores: [{ proveedorId: 1, fincas: ["Fundo San Isidro"] }],
                        fechaInicio: "2026-10-25",
                        fechaFin: "2026-10-25",
                        condicionesCarga: "Cosecha matutina",
                        observaciones: "",
                    },
                },
            },
            {
                contractId: 102,
                contractName: "adenda_natures_pride_lote2.pdf",
                delivery: {
                    id: 2,
                    fecha: "2026-10-28",
                    kilosProgramados: 20000,
                    destino: "Terminal Portuario Paita",
                    observaciones: "Segundo despacho programado.",
                    coordinacion: null,
                },
            },
        ],
    },
    {
        id: "part-2",
        campaniaId: 1,
        campaniaNombre: "Campaña Mango Kent 2026",
        fruta: "Mango",
        variedades: ["Edward", "Haden"],
        relationId: 2,
        clienteId: 2,
        clienteNombre: "Agroindustrias del Chira S.A.",
        ruc: "20526198412",
        canal: "Industria",
        pais: "Perú",
        cantidadRequeridaKg: 45000,
        kilosAcordados: 30000,
        fechaRegistro: "2026-09-25",
        observaciones: "Abastecimiento de fruta industrial en bines plásticos.",
        contracts: [
            {
                id: 103,
                fechaRegistro: "2026-09-28",
                precioKg: 2.4,
                moneda: "PEN",
                cantidadPropuestaKg: 30000,
                condicionesPago: "Factura a 15 días de recepción en balanza",
                condicionesEntrega: "Planta Procesadora Sullana · Km 1028",
                observaciones: "Brix mínimo 12° para pulpa concentrada.",
                archivo: demoPdf("contrato_agrochira_2026.pdf", "Contrato Agroindustrias del Chira"),
            },
        ],
        deliveries: [
            {
                contractId: 103,
                contractName: "contrato_agrochira_2026.pdf",
                delivery: {
                    id: 3,
                    fecha: "2026-10-26",
                    kilosProgramados: 15000,
                    destino: "Planta Procesadora Sullana · Km 1028",
                    observaciones: "Recepción en bines de 400 kg.",
                    coordinacion: null,
                },
            },
        ],
    },
    {
        id: "part-3",
        campaniaId: 2,
        campaniaNombre: "Campaña Palta Hass 2026",
        fruta: "Palta",
        variedades: ["Hass"],
        relationId: 3,
        clienteId: 3,
        clienteNombre: "Westfalia Fruit International",
        ruc: "GB641908214",
        canal: "Exportador",
        pais: "Reino Unido",
        cantidadRequeridaKg: 80000,
        kilosAcordados: 50000,
        fechaRegistro: "2026-10-01",
        observaciones: "Programa europeo con certificación Rainforest Alliance.",
        contracts: [
            {
                id: 104,
                fechaRegistro: "2026-10-04",
                precioKg: 2.35,
                moneda: "USD",
                cantidadPropuestaKg: 50000,
                condicionesPago: "Carta de crédito irrevocable",
                condicionesEntrega: "Packing Agroexportador Chiclayo",
                observaciones: "Materia seca entre 22% y 25%.",
                archivo: demoPdf("contrato_westfalia_palta_2026.pdf", "Contrato Westfalia Palta Hass"),
            },
        ],
        deliveries: [
            {
                contractId: 104,
                contractName: "contrato_westfalia_palta_2026.pdf",
                delivery: {
                    id: 4,
                    fecha: "2026-10-24",
                    kilosProgramados: 22000,
                    destino: "Packing Agroexportador Chiclayo",
                    observaciones: "Lote aprobado al 99.2%.",
                    coordinacion: {
                        carrierId: 2,
                        vehicleId: 2,
                        driverId: 2,
                        proveedores: [{ proveedorId: 4, fincas: ["Fundo Tierra Verde"] }],
                        fechaInicio: "2026-10-24",
                        fechaFin: "2026-10-24",
                        condicionesCarga: "Furgón refrigerado",
                        observaciones: "",
                    },
                },
            },
        ],
    },
];

export default function CommercialContractsSubView() {
    const navigate = useNavigate();
    const contractRecords = useCampaignContractRecords();
    const deliveryRecords = useCampaignDeliveryRecords();

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
                    const rels = await getClientesNegocioCampana(campana.campaniaId).catch(() => []);
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
                                contractName: c.archivo.name,
                                delivery: d,
                            })),
                        );
                        const acordados = contracts.reduce((s, c) => s + c.cantidadPropuestaKg, 0);
                        collected.push({
                            id: `${campana.campaniaId}-${rel.clienteNegocioCampanaId}`,
                            campaniaId: campana.campaniaId,
                            campaniaNombre: campana.nombre,
                            fruta: campana.fruta?.name ?? "Mango",
                            variedades: ["Kent"],
                            relationId: rel.clienteNegocioCampanaId,
                            clienteId: rel.clienteNegocioId,
                            clienteNombre: rel.clienteNegocio?.nombreEmpresa ?? "Cliente",
                            ruc: rel.clienteNegocio?.ruc ?? "—",
                            canal:
                                rel.clienteNegocio?.tipoCliente === "industria"
                                    ? "Industria"
                                    : "Exportador",
                            pais: "Perú",
                            cantidadRequeridaKg: acordados,
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
                if (active) setApiRows(collected);
            })
            .catch(() => {
                if (active) setApiRows([]);
            });
        return () => {
            active = false;
        };
    }, [contractRecords, deliveryRecords]);

    const rows = apiRows.length > 0 ? apiRows : DEMO_PARTICIPATIONS;

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
