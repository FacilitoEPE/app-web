import { usesV1 } from "@/shared/api/data-contract";
import { campaignCarrierAssignments } from "@/modules/campaigns/api/carrier-assignments";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Eye, Link2, Link2Off, ListFilter, RotateCw, SearchX, Truck, TriangleAlert, Wallet } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Spinner } from "@/shared/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import ConfirmModal from "@/shared/components/ConfirmModal";
import { ContextBannerPlaceholder } from "@/shared/components/ContextBanner";
import FilterBar, { FilterSearch } from "@/shared/components/FilterBar";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
import StatusBadge from "@/shared/components/StatusBadge";
import TableCard from "@/shared/components/TableCard";
import TableGridCard, { TableGridCardField, TableGridCardFields } from "@/shared/components/TableGridCard";
import { TableCountPill, TableExportMenu, TableToolbar, TableViewToggle, type TableViewMode } from "@/shared/components/TableToolbar";
import PageHeader from "@/shared/layout/PageHeader";
import { formatDisplayDate, formatMoney } from "@/shared/utils/format";
import { paginate } from "@/shared/utils/paginate";
import { plural } from "@/shared/utils/plural";
import type { TableExport } from "@/shared/utils/exportTable";
import { getCarriers } from "@/modules/carriers/api/carrier.api";
import { useCarrierExtras } from "@/modules/carriers/carrierExtras.store";
import { useCarrierQuotations } from "@/modules/carriers/carrierQuotations.store";
import { CARRIER_TIPOS, carrierIdentification, toCarrierProfile, type CarrierProfile } from "@/modules/carriers/carrierProfile.utils";
import type { Carrier } from "@/modules/carriers/carriers.data";
import CampaignCarrierAgreementModal, { type AgreementModalMode } from "@/modules/campaigns/components/CampaignCarrierAgreementModal";
import CampaignCarrierDetailsModal from "@/modules/campaigns/components/CampaignCarrierDetailsModal";
import CampaignContextBanner from "@/modules/campaigns/components/CampaignContextBanner";
import CampaignLinkCarrierModal from "@/modules/campaigns/components/CampaignLinkCarrierModal";
import CampaignSuccessModal from "@/modules/campaigns/components/CampaignSuccessModal";
import { getMonedaSymbol } from "@/modules/campaigns/campaignCertificate.utils";
import {
    getAgreementBalance,
    getAgreementStatus,
    isAgreementClosed,
    type AgreementFormValues,
    type CampaignCarrierLink,
} from "@/modules/campaigns/campaignCarrier.utils";
import {
    linkCampaignCarrier,
    saveCampaignCarrierAgreement,
    unlinkCampaignCarrier,
    useCampaignCarriers,
} from "@/modules/campaigns/campaignCarriers.store";
import { useCampaign } from "@/modules/campaigns/useCampaign";

type SuccessMode = "carrier" | "carrierAgreement";
interface Row {
    link: CampaignCarrierLink;
    /** Ficha de Gestión de Transporte; `null` si el transportista ya no existe allí */
    carrier: CarrierProfile | null;
}
type AgreementState = { open: boolean; mode: AgreementModalMode; row: Row | null };

const rowName = (row: Row) => row.carrier?.nombre ?? "Transportista no disponible";

function agreementCaption(link: CampaignCarrierLink): string | null {
    const agreement = link.acuerdo;
    if (!agreement) return null;
    const symbol = getMonedaSymbol(agreement.moneda);
    if (agreement.tipo === "adelanto" && !agreement.saldoPagado) {
        return `Saldo pendiente: ${symbol} ${formatMoney(getAgreementBalance(agreement.total, agreement.adelanto))}`;
    }
    return `Total: ${symbol} ${formatMoney(agreement.total)}`;
}

/** Transportistas vinculados a una campaña en ejecución, con su cotización y su acuerdo de pago. */
export default function CampaignCarriersPage() {
    const { id } = useParams<{ id: string }>();
    const campaniaId = Number(id);
    const isValidCampaign = Number.isInteger(campaniaId) && campaniaId > 0;
    const campaign = useCampaign(campaniaId);
    const links = useCampaignCarriers(campaniaId);
    const extras = useCarrierExtras();
    const quotations = useCarrierQuotations();

    const [carriers, setCarriers] = useState<Carrier[]>([]);
    const [isLoading, setIsLoading] = useState(isValidCampaign);
    const [loadError, setLoadError] = useState<string | null>(isValidCampaign ? null : "La campaña no es válida.");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<TableViewMode>("table");

    const [linkOpen, setLinkOpen] = useState(false);
    const [details, setDetails] = useState<{ open: boolean; row: Row | null }>({ open: false, row: null });
    const [agreement, setAgreement] = useState<AgreementState>({ open: false, mode: "create", row: null });
    const [unlinking, setUnlinking] = useState<{ open: boolean; row: Row | null }>({ open: false, row: null });
    const [success, setSuccess] = useState<{ open: boolean; mode: SuccessMode }>({ open: false, mode: "carrier" });
    const showSuccess = (mode: SuccessMode) => setSuccess({ open: true, mode });

    const load = useCallback(async () => {
        if (!isValidCampaign) return;
        try {
            setCarriers(await getCarriers());
            setLoadError(null);
        } catch {
            setLoadError("No se pudieron cargar los transportistas. Verifica la conexión e inténtalo nuevamente.");
        } finally {
            setIsLoading(false);
        }
    }, [isValidCampaign]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void load(); }, [load]);

    const retry = () => {
        setIsLoading(true);
        void load();
    };

    const profiles = useMemo(() => carriers.map((carrier) => toCarrierProfile(carrier, extras[carrier.id])), [carriers, extras]);
    const rows = useMemo<Row[]>(
        () => links.map((link) => ({ link, carrier: profiles.find((profile) => profile.id === link.carrierId) ?? null })),
        [links, profiles],
    );
    const available = useMemo(() => profiles.filter((profile) => !links.some((link) => link.carrierId === profile.id)), [profiles, links]);

    const hasActiveFilters = search !== "";
    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return rows.filter((row) => `${rowName(row)} ${row.carrier ? carrierIdentification(row.carrier) : ""}`.toLowerCase().includes(query));
    }, [rows, search]);
    const { pageCount, currentPage, visible } = paginate(filtered, page);

    const withoutAgreement = rows.filter((row) => row.link.acuerdo === null).length;

    const quotationInfoFor = (row: Row) => {
        if (usesV1()) return { unitAndDriver: campaignCarrierAssignments(campaniaId, row.link.carrierId) };
        const match = quotations.find((q) => q.carrierId === row.link.carrierId && q.campaniaId === campaniaId)
            ?? quotations.find((q) => q.carrierId === row.link.carrierId);
        if (match) {
            return {
                unitAndDriver: `${match.vehiculoAsignadoPlaca || "Por asignar"} · ${match.choferAsignadoNombre || "Chofer pendiente"}`,
            };
        }
        return { unitAndDriver: "Por asignar · Chofer pendiente" };
    };

    const getExportData = (): TableExport => ({
        filename: `transportistas_campania_${campaniaId}`,
        title: "Transportistas de la campaña",
        header: ["Transportista", "Tipo", "Documento", "Teléfono", "Unidad / Chofer", "Fecha de vinculación", "Acuerdo de pago"],
        rows: filtered.map((row) => [
            rowName(row),
            row.carrier ? CARRIER_TIPOS[row.carrier.tipo].short : "",
            row.carrier ? carrierIdentification(row.carrier) : "",
            row.carrier?.numero ?? "",
            quotationInfoFor(row).unitAndDriver,
            formatDisplayDate(row.link.fechaVinculacion),
            getAgreementStatus(row.link.acuerdo),
        ]),
    });

    const getRowActions = (row: Row): { primary: RowAction[]; secondary: RowAction[] } => {
        const { acuerdo } = row.link;
        const secondary: RowAction[] = [];
        if (!acuerdo) {
            secondary.push({ label: "Registrar acuerdo de pago", icon: <Wallet size={16} strokeWidth={2.5} />, variant: "brand", onClick: () => setAgreement({ open: true, mode: "create", row }) });
        } else {
            secondary.push({ label: "Ver acuerdo de pago", icon: <Wallet size={16} strokeWidth={2.5} />, variant: "brand", onClick: () => setAgreement({ open: true, mode: "view", row }) });
        }
        const hasLockedAgreement = Boolean(acuerdo && isAgreementClosed(acuerdo));
        return {
            primary: [
                { label: "Ver detalles", icon: <Eye size={18} strokeWidth={2.5} />, onClick: () => setDetails({ open: true, row }) },
                ...(!hasLockedAgreement
                    ? [
                          {
                              label: "Desvincular",
                              icon: <Link2Off size={18} strokeWidth={2.5} />,
                              variant: "destructive" as const,
                              onClick: () => setUnlinking({ open: true, row }),
                          },
                      ]
                    : []),
            ],
            secondary,
        };
    };

    const emptyState = isLoading
        ? { icon: <Spinner className="size-7" />, title: "Cargando transportistas", description: "Consultando los transportistas de la campaña.", action: undefined }
        : loadError
            ? {
                icon: <TriangleAlert size={28} strokeWidth={2} />,
                title: "No se pudieron cargar los transportistas",
                description: loadError,
                action: isValidCampaign ? { label: "Reintentar", icon: <RotateCw size={18} strokeWidth={2.5} />, onClick: retry, tone: "secondary" as const } : undefined,
            }
            : {
                icon: <SearchX size={28} strokeWidth={2} />,
                title: hasActiveFilters ? "Sin resultados" : "Aún no hay transportistas vinculados",
                description: hasActiveFilters
                    ? "Ningún transportista coincide con la búsqueda. Prueba con otro nombre o documento."
                    : "Vincula al primer transportista de esta campaña para registrar su acuerdo de pago.",
                action: hasActiveFilters
                    ? { label: "Limpiar filtros", icon: <ListFilter size={18} strokeWidth={2.5} />, onClick: () => setSearch(""), tone: "secondary" as const }
                    : { label: "Vincular transportista", icon: <Link2 size={18} strokeWidth={2.5} />, onClick: () => setLinkOpen(true) },
            };

    const tipoBadge = (row: Row) =>
        row.carrier ? (
            <Badge variant={row.carrier.tipo === "publico" ? "brand" : "outline"} className="h-6 px-2.5 text-[12px] font-semibold">
                {CARRIER_TIPOS[row.carrier.tipo].short}
            </Badge>
        ) : (
            <span className="text-ink-muted">—</span>
        );

    const agreementCell = (row: Row) => {
        const caption = agreementCaption(row.link);
        return (
            <div className="flex flex-col items-start gap-1">
                <StatusBadge status={getAgreementStatus(row.link.acuerdo)} />
                {caption && <span className="text-[11.5px] font-medium tabular-nums text-ink-muted">{caption}</span>}
            </div>
        );
    };

    const selectedAgreementRow = agreement.row;

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            {campaign === undefined ? <ContextBannerPlaceholder /> : campaign && (
                <CampaignContextBanner
                    campaign={campaign}
                    caption="Transporte · transportistas y acuerdos de pago"
                    stats={[
                        { label: plural(rows.length, "transportista vinculado", "transportistas vinculados"), value: String(rows.length) },
                        { label: plural(withoutAgreement, "acuerdo por registrar", "acuerdos por registrar"), value: String(withoutAgreement) },
                    ]}
                />
            )}

            <PageHeader
                icon={<Truck size={24} strokeWidth={2.5} />}
                title="Transportistas de la Campaña"
                description="Vincula transportistas, asigna sus unidades y registra el acuerdo de pago de cada uno."
                action={
                    <Button size="xl" onClick={() => setLinkOpen(true)} disabled={!isValidCampaign}>
                        <Link2 size={20} strokeWidth={2.5} /> Vincular transportista
                    </Button>
                }
            />

            <FilterBar onClear={() => setSearch("")} canClear={hasActiveFilters} className="mb-8">
                <FilterSearch value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Buscar por transportista o documento..." />
            </FilterBar>

            <TableCard
                icon={<Truck size={24} strokeWidth={2.5} />}
                title="Transportistas Vinculados"
                description="Consulta los vínculos, unidades asignadas y acuerdos; los datos completos están en Ver detalles."
                headerRight={
                    <TableToolbar>
                        <TableCountPill icon={<Truck size={16} strokeWidth={2.5} className="text-brand" />} count={filtered.length} singular="transportista" plural="transportistas" />
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
                    {visible.map((row) => {
                        const qInfo = quotationInfoFor(row);
                        return (
                            <TableGridCard
                                key={row.link.id}
                                accentColor="border-l-brand"
                                icon={<Truck size={18} strokeWidth={2} />}
                                title={rowName(row)}
                                subtitle={row.carrier ? carrierIdentification(row.carrier) : "—"}
                                actions={<RowActions {...getRowActions(row)} />}
                            >
                                <TableGridCardFields>
                                    <TableGridCardField label="Tipo" value={row.carrier ? CARRIER_TIPOS[row.carrier.tipo].short : "—"} />
                                    <TableGridCardField label="Unidad / Chofer" value={qInfo.unitAndDriver} />
                                    <TableGridCardField label="Vinculado" value={formatDisplayDate(row.link.fechaVinculacion)} />
                                    <TableGridCardField label="Acuerdo de pago" value={agreementCell(row)} />
                                </TableGridCardFields>
                            </TableGridCard>
                        );
                    })}
                </div>

                {viewMode === "table" && (
                    <div className="hidden sm:block rounded-xl overflow-hidden border border-border">
                        <Table className="table-fixed w-full">
                            <TableHeader className={TABLE_HEAD_BG}>
                                <TableRow className="border-b border-border hover:bg-transparent">
                                    <TableHead className="h-14 font-semibold text-ink px-6">Transportista</TableHead>
                                    <TableHead className="h-14 font-semibold text-ink w-32">Tipo</TableHead>
                                    <TableHead className="h-14 font-semibold text-ink w-48">Documento</TableHead>
                                    <TableHead className="h-14 font-semibold text-ink w-64">Unidad / Chofer</TableHead>
                                    <TableHead className="h-14 font-semibold text-ink w-40">Vinculado</TableHead>
                                    <TableHead className="h-14 font-semibold text-ink">Acuerdo de pago</TableHead>
                                    <TableHead className="h-14 font-semibold text-ink w-56 text-center px-6">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visible.map((row) => {
                                    const qInfo = quotationInfoFor(row);
                                    return (
                                        <TableRow key={row.link.id} className="border-b border-border hover:bg-surface-page/60 transition-colors">
                                            <TableCell className="h-20 px-6 relative">
                                                <TableRowAccent color="bg-brand" />
                                                <TableRowLead icon={<Truck size={20} strokeWidth={2} className="text-brand" />} title={rowName(row)} subtitle={row.carrier ? carrierIdentification(row.carrier) : undefined} />
                                            </TableCell>
                                            <TableCell>{tipoBadge(row)}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-[13.5px] text-ink-body leading-tight">{row.carrier ? carrierIdentification(row.carrier) : "—"}</span>
                                                    {row.carrier?.numero && <span className="text-[12.5px] font-medium text-ink-muted mt-0.5">{row.carrier.numero}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-semibold text-[13.5px] text-ink-body leading-tight">{qInfo.unitAndDriver}</span>
                                            </TableCell>
                                            <TableCell className="font-medium text-[13.5px] text-ink-body tabular-nums">{formatDisplayDate(row.link.fechaVinculacion)}</TableCell>
                                            <TableCell>{agreementCell(row)}</TableCell>
                                            <TableCell className="px-6 text-center"><RowActions {...getRowActions(row)} /></TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </TableCard>

            <CampaignLinkCarrierModal
                open={linkOpen}
                onOpenChange={setLinkOpen}
                campaignName={campaign?.nombre ?? "Campaña"}
                carriers={available}
                isLoading={isLoading}
                onSave={async (carrierId, cotizacion) => {
                    await linkCampaignCarrier(campaniaId, carrierId, usesV1() ? null : cotizacion);
                    setLinkOpen(false);
                    showSuccess("carrier");
                }}
            />

            <CampaignCarrierDetailsModal
                open={details.open}
                onOpenChange={(open) => setDetails((current) => ({ ...current, open }))}
                carrier={details.row?.carrier ?? null}
                link={details.row?.link ?? null}
                campaignName={campaign?.nombre ?? "Campaña"}
            />

            <CampaignCarrierAgreementModal
                open={agreement.open}
                onOpenChange={(open) => setAgreement((current) => ({ ...current, open }))}
                mode={agreement.mode}
                carrierName={selectedAgreementRow ? rowName(selectedAgreementRow) : ""}
                campaignName={campaign?.nombre ?? "Campaña"}
                agreement={selectedAgreementRow?.link.acuerdo ?? null}
                onSave={async (values: AgreementFormValues, boleta) => {
                    if (!selectedAgreementRow) return;
                    await saveCampaignCarrierAgreement(campaniaId, selectedAgreementRow.link.id, values, boleta);
                    setAgreement((current) => ({ ...current, open: false }));
                    showSuccess("carrierAgreement");
                }}
            />

            <ConfirmModal
                open={unlinking.open}
                onOpenChange={(open) => setUnlinking((current) => ({ ...current, open }))}
                icon={<Link2Off size={28} strokeWidth={2.25} />}
                title="¿Desvincular transportista?"
                description={<>Se quitará a <strong className="font-bold text-ink">{unlinking.row ? rowName(unlinking.row) : ""}</strong> de esta campaña junto con su cotización y su acuerdo de pago. Su ficha seguirá en Gestión de Transporte.</>}
                confirmLabel="Sí, desvincular"
                onConfirm={async () => { if (unlinking.row) await unlinkCampaignCarrier(campaniaId, unlinking.row.link.id); }}
            />

            <CampaignSuccessModal open={success.open} onOpenChange={(open) => setSuccess((current) => ({ ...current, open }))} mode={success.mode} />
        </div>
    );
}
