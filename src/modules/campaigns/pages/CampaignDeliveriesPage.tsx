import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Eye, ListFilter, PackageCheck, Pencil, RotateCw, SearchX, Sprout, TriangleAlert } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Spinner } from "@/shared/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import { ContextBannerPlaceholder } from "@/shared/components/ContextBanner";
import FilterBar, { FilterSearch } from "@/shared/components/FilterBar";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
import TableCard from "@/shared/components/TableCard";
import TableGridCard, { TableGridCardField, TableGridCardFields } from "@/shared/components/TableGridCard";
import { TableCountPill, TableExportMenu, TableToolbar, TableViewToggle, type TableViewMode } from "@/shared/components/TableToolbar";
import PageHeader from "@/shared/layout/PageHeader";
import { formatDisplayDate, formatKg } from "@/shared/utils/format";
import { paginate } from "@/shared/utils/paginate";
import { plural } from "@/shared/utils/plural";
import type { TableExport } from "@/shared/utils/exportTable";
import { getCarriers } from "@/modules/carriers/api/carrier.api";
import type { Carrier } from "@/modules/carriers/carriers.data";
import { getCampaniaProveedoresByCampania } from "@/modules/campaigns/api/campania-proveedor.api";
import type { CampaniaProveedor } from "@/modules/campaigns/api/campania-proveedor.mapper";
import { getClientesNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.api";
import type { ClienteNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.mapper";
import { useProviderLocalData } from "@/modules/providers/providerLocalData.store";
import CampaignContextBanner from "@/modules/campaigns/components/CampaignContextBanner";
import CampaignDeliveryCoordinationModal from "@/modules/campaigns/components/CampaignDeliveryCoordinationModal";
import CampaignDeliveryDetailsModal from "@/modules/campaigns/components/CampaignDeliveryDetailsModal";
import type { DeliveryProviderOption } from "@/modules/campaigns/components/CampaignDeliveryProviderPicker";
import CampaignSuccessModal from "@/modules/campaigns/components/CampaignSuccessModal";
import { useCampaignContractRecords } from "@/modules/campaigns/campaignClientContracts.store";
import { saveCampaignDeliveryCoordination, useCampaignDeliveryRecords } from "@/modules/campaigns/campaignContractDeliveries.store";
import { useCampaignCarriers } from "@/modules/campaigns/campaignCarriers.store";
import {
    listCampaignDeliveries,
    toCoordination,
    type CampaignDeliveryEntry,
    type DeliveryCoordinationValues,
} from "@/modules/campaigns/campaignDeliveryCoordination.utils";
import { useCampaign } from "@/modules/campaigns/useCampaign";

interface LoadedData {
    relations: ClienteNegocioCampana[];
    campaignProviders: CampaniaProveedor[];
    carriers: Carrier[];
}

const PROVIDER_TYPES: Record<CampaniaProveedor["tipoProveedor"], string> = { acopio: "Acopiador", productor: "Productor" };

/** Entregas programadas de una campaña en ejecución: de dónde salen, con quién y cuándo. */
export default function CampaignDeliveriesPage() {
    const { id } = useParams<{ id: string }>();
    const campaniaId = Number(id);
    const isValidCampaign = Number.isInteger(campaniaId) && campaniaId > 0;
    const campaign = useCampaign(campaniaId);
    const deliveryRecords = useCampaignDeliveryRecords();
    const contractRecords = useCampaignContractRecords();
    const links = useCampaignCarriers(campaniaId);
    const { fincas } = useProviderLocalData();

    const [data, setData] = useState<LoadedData>({ relations: [], campaignProviders: [], carriers: [] });
    const [isLoading, setIsLoading] = useState(isValidCampaign);
    const [loadError, setLoadError] = useState<string | null>(isValidCampaign ? null : "La campaña no es válida.");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<TableViewMode>("table");

    const [coordination, setCoordination] = useState<{ open: boolean; entry: CampaignDeliveryEntry | null }>({ open: false, entry: null });
    const [details, setDetails] = useState<{ open: boolean; entry: CampaignDeliveryEntry | null }>({ open: false, entry: null });
    const [successOpen, setSuccessOpen] = useState(false);

    const load = useCallback(async () => {
        if (!isValidCampaign) return;
        try {
            const [relations, campaignProviders, carriers] = await Promise.all([
                getClientesNegocioCampana(campaniaId),
                getCampaniaProveedoresByCampania(campaniaId),
                getCarriers(),
            ]);
            setData({ relations, campaignProviders, carriers });
            setLoadError(null);
        } catch {
            setLoadError("No se pudieron cargar las entregas. Verifica la conexión e inténtalo nuevamente.");
        } finally {
            setIsLoading(false);
        }
    }, [campaniaId, isValidCampaign]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void load(); }, [load]);

    const retry = () => {
        setIsLoading(true);
        void load();
    };

    const entries = useMemo(() => listCampaignDeliveries(deliveryRecords, campaniaId), [deliveryRecords, campaniaId]);
    const clientNames = useMemo(
        () => Object.fromEntries(data.relations.map((relation) => [relation.clienteNegocioCampanaId, relation.clienteNegocio?.nombreEmpresa ?? "Cliente no disponible"])),
        [data.relations],
    );
    const contractNames = useMemo(() => {
        const names: Record<string, string> = {};
        for (const entry of entries) {
            const contract = contractRecords[`${campaniaId}:${entry.relationId}`]?.find((item) => item.id === entry.contractId);
            names[entry.key] = contract?.archivo?.name ?? `Contrato ${entry.contractId}`;
        }
        return names;
    }, [entries, contractRecords, campaniaId]);

    const linkedCarriers = useMemo(
        () => links.flatMap((link) => data.carriers.find((carrier) => carrier.id === link.carrierId) ?? []),
        [links, data.carriers],
    );
    const providers = useMemo<DeliveryProviderOption[]>(() => {
        const byId = new Map<number, DeliveryProviderOption>();
        for (const item of data.campaignProviders) {
            if (byId.has(item.proveedorId)) continue;
            byId.set(item.proveedorId, {
                id: item.proveedorId,
                nombre: item.proveedor ? `${item.proveedor.nombres} ${item.proveedor.apellido}`.trim() : `Proveedor ${item.proveedorId}`,
                tipo: PROVIDER_TYPES[item.tipoProveedor],
                fincas: (fincas[item.proveedorId] ?? []).map((finca) => finca.nombre),
            });
        }
        return [...byId.values()];
    }, [data.campaignProviders, fincas]);

    const entryClient = (entry: CampaignDeliveryEntry) => clientNames[entry.relationId] ?? "Cliente no disponible";
    const entryContract = (entry: CampaignDeliveryEntry) => contractNames[entry.key] ?? "";
    const entryVariety = (entry: CampaignDeliveryEntry) => entry.delivery.variedad ?? "Kent";
    const hasActiveFilters = search !== "";
    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return entries.filter((entry) => `${clientNames[entry.relationId] ?? ""} ${contractNames[entry.key] ?? ""} ${entry.delivery.destino} ${entryVariety(entry)}`.toLowerCase().includes(query));
    }, [entries, search, clientNames, contractNames]);
    const { pageCount, currentPage, visible } = paginate(filtered, page);
    const pendingCount = entries.filter((entry) => !entry.delivery.coordinacion).length;

    const getExportData = (): TableExport => ({
        filename: "entregas_campana",
        title: "Entregas de la campaña",
        header: ["Cliente", "Contrato", "Variedad", "Fecha programada", "Kilos", "Destino"],
        rows: filtered.map((entry) => [
            entryClient(entry),
            entryContract(entry),
            entryVariety(entry),
            formatDisplayDate(entry.delivery.fecha),
            formatKg(entry.delivery.kilosProgramados),
            entry.delivery.destino,
        ]),
    });

    const getRowActions = (entry: CampaignDeliveryEntry): { primary: RowAction[] } => ({
        primary: [
            { label: "Ver detalles", icon: <Eye size={18} strokeWidth={2.5} />, onClick: () => setDetails({ open: true, entry }) },
            { label: "Editar", icon: <Pencil size={18} strokeWidth={2.5} />, onClick: () => setCoordination({ open: true, entry }) },
        ],
    });

    const emptyState = isLoading
        ? { icon: <Spinner className="size-7" />, title: "Cargando entregas", description: "Consultando las entregas de la campaña.", action: undefined }
        : loadError
            ? {
                icon: <TriangleAlert size={28} strokeWidth={2} />,
                title: "No se pudieron cargar las entregas",
                description: loadError,
                action: isValidCampaign ? { label: "Reintentar", icon: <RotateCw size={18} strokeWidth={2.5} />, onClick: retry, tone: "secondary" as const } : undefined,
            }
            : {
                icon: <SearchX size={28} strokeWidth={2} />,
                title: hasActiveFilters ? "Sin resultados" : "Aún no hay entregas programadas",
                description: hasActiveFilters
                    ? "Ninguna entrega coincide con la búsqueda. Prueba con otro cliente, contrato o destino."
                    : "Las entregas se programan en los contratos de los clientes de la campaña (Gestión Comercial).",
                action: hasActiveFilters
                    ? { label: "Limpiar filtros", icon: <ListFilter size={18} strokeWidth={2.5} />, onClick: () => setSearch(""), tone: "secondary" as const }
                    : undefined,
            };

    const saveCoordination = async (entry: CampaignDeliveryEntry, values: DeliveryCoordinationValues) => {
        await saveCampaignDeliveryCoordination(campaniaId, entry.relationId, entry.contractId, entry.delivery.id, toCoordination(values));
        setCoordination((current) => ({ ...current, open: false }));
        setSuccessOpen(true);
    };

    const campaignName = campaign?.nombre ?? "Campaña";

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            {campaign === undefined ? <ContextBannerPlaceholder /> : campaign && (
                <CampaignContextBanner
                    campaign={campaign}
                    caption="Entregas programadas de la campaña"
                    stats={[
                        { label: plural(entries.length, "entrega programada", "entregas programadas"), value: String(entries.length) },
                    ]}
                />
            )}

            <PageHeader
                icon={<PackageCheck size={24} strokeWidth={2.5} />}
                title="Entregas de la Campaña"
                description="Consulta y edita el transporte, los proveedores y las fincas de cada entrega programada en Gestión Comercial."
                action={
                    <Button size="xl" onClick={() => setCoordination({ open: true, entry: null })} disabled={!isValidCampaign || isLoading || pendingCount === 0}>
                        <PackageCheck size={20} strokeWidth={2.5} /> Completar datos de entrega
                    </Button>
                }
            />

            <FilterBar onClear={() => setSearch("")} canClear={hasActiveFilters} className="mb-8">
                <FilterSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Buscar por cliente, contrato, variedad o destino..." />
            </FilterBar>

            <TableCard
                icon={<PackageCheck size={24} strokeWidth={2.5} />}
                title="Entregas Programadas"
                description="Consulta cada entrega; el transporte y las fincas están en Ver detalles."
                headerRight={
                    <TableToolbar>
                        <TableCountPill icon={<PackageCheck size={16} strokeWidth={2.5} className="text-brand" />} count={filtered.length} singular="entrega" plural="entregas" />
                        <TableExportMenu getData={getExportData} />
                        <TableViewToggle value={viewMode} onChange={setViewMode} />
                    </TableToolbar>
                }
                isEmpty={isLoading || loadError !== null || visible.length === 0}
                emptyIcon={emptyState.icon}
                emptyTitle={emptyState.title}
                emptyDescription={emptyState.description}
                emptyAction={emptyState.action}
                page={currentPage}
                pageCount={pageCount}
                onPageChange={setPage}
            >
                <div className={`flex flex-col gap-3 ${viewMode === "grid" ? "sm:grid sm:grid-cols-2 lg:grid-cols-3" : "sm:hidden"}`}>
                    {visible.map((entry) => (
                        <TableGridCard
                            key={entry.key}
                            accentColor="border-l-brand"
                            icon={<PackageCheck size={18} strokeWidth={2} />}
                            title={entryClient(entry)}
                            subtitle={entryContract(entry)}
                            actions={<RowActions {...getRowActions(entry)} />}
                        >
                            <TableGridCardFields>
                                <TableGridCardField label="Variedad" value={entryVariety(entry)} />
                                <TableGridCardField label="Fecha programada" value={formatDisplayDate(entry.delivery.fecha)} />
                                <TableGridCardField label="Kilos" value={`${formatKg(entry.delivery.kilosProgramados)} kg`} />
                                <TableGridCardField label="Destino" value={entry.delivery.destino} />
                            </TableGridCardFields>
                        </TableGridCard>
                    ))}
                </div>

                {viewMode === "table" && (
                    <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
                        <Table>
                            <TableHeader className={TABLE_HEAD_BG}>
                                <TableRow className="border-b border-border hover:bg-transparent">
                                    <TableHead className="h-14 px-6 font-semibold text-ink">Cliente / contrato</TableHead>
                                    <TableHead className="h-14 font-semibold text-ink">Variedad</TableHead>
                                    <TableHead className="h-14 font-semibold text-ink">Fecha programada</TableHead>
                                    <TableHead className="h-14 font-semibold text-ink">Kilos</TableHead>
                                    <TableHead className="h-14 font-semibold text-ink">Destino</TableHead>
                                    <TableHead className="h-14 w-36 px-6 text-center font-semibold text-ink">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visible.map((entry) => (
                                    <TableRow key={entry.key} className="border-b border-border transition-colors hover:bg-surface-page/60">
                                        <TableCell className="relative h-20 px-6">
                                            <TableRowAccent color="bg-brand" />
                                            <TableRowLead icon={<PackageCheck size={18} />} title={entryClient(entry)} subtitle={entryContract(entry)} />
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center gap-1.5 rounded-md bg-brand/10 px-2.5 py-1 text-[12px] font-semibold text-brand">
                                                <Sprout size={13} strokeWidth={2.2} />
                                                {entryVariety(entry)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap font-medium text-ink-body">{formatDisplayDate(entry.delivery.fecha)}</TableCell>
                                        <TableCell className="whitespace-nowrap font-medium tabular-nums text-ink-body">{formatKg(entry.delivery.kilosProgramados)} kg</TableCell>
                                        <TableCell className="font-medium text-ink-body">{entry.delivery.destino}</TableCell>
                                        <TableCell className="px-6">
                                            <RowActions {...getRowActions(entry)} className="justify-center text-ink-muted" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </TableCard>

            <CampaignDeliveryCoordinationModal
                open={coordination.open}
                onOpenChange={(open) => setCoordination((current) => ({ ...current, open }))}
                campaignName={campaignName}
                entries={entries}
                entry={coordination.entry}
                clientNames={clientNames}
                contractNames={contractNames}
                carriers={linkedCarriers}
                providers={providers}
                onSave={saveCoordination}
            />

            <CampaignDeliveryDetailsModal
                open={details.open}
                onOpenChange={(open) => setDetails((current) => ({ ...current, open }))}
                entry={details.entry}
                campaignName={campaignName}
                clientName={details.entry ? entryClient(details.entry) : ""}
                contractName={details.entry ? entryContract(details.entry) : ""}
                carriers={data.carriers}
                providers={providers}
            />

            <CampaignSuccessModal open={successOpen} onOpenChange={setSuccessOpen} mode="deliveryCoordination" />
        </div>
    );
}

