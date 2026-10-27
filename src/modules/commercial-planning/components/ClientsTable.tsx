import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Eye, Contact, FileText, ListFilter, MapPin, Trash2, TriangleAlert, RotateCw, SearchX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Spinner } from "@/shared/components/ui/spinner";
import { Badge } from "@/shared/components/ui/badge";
import TableCard from "@/shared/components/TableCard";
import ConfirmModal from "@/shared/components/ConfirmModal";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import TableGridCard from "@/shared/components/TableGridCard";
import { TableToolbar, TableCountPill, TableExportMenu, TableViewToggle, type TableViewMode } from "@/shared/components/TableToolbar";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
import ClientFormModal from "@/modules/commercial-planning/components/ClientFormModal";
import ClientSuccessModal from "@/modules/commercial-planning/components/ClientSuccessModal";
import CommercialClientCampaignDetailModal, { type CommercialParticipationRow } from "@/modules/commercial-planning/components/CommercialClientCampaignDetailModal";
import { useCampaignContractRecords } from "@/modules/campaigns/campaignClientContracts.store";
import { useCampaignDeliveryRecords } from "@/modules/campaigns/campaignContractDeliveries.store";
import type { ClienteNegocio } from "@/modules/clients/api/cliente-negocio.mapper";
import type { TableExport } from "@/shared/utils/exportTable";
import { paginate } from "@/shared/utils/paginate";

const TIPO_LABEL: Record<string, string> = { exportador: "Exportador", industria: "Industria" };

interface ClientsTableProps {
    data: ClienteNegocio[];
    isLoading: boolean;
    loadError: string | null;
    onRetry: () => void;
    hasActiveFilters: boolean;
    onClearFilters: () => void;
    /** Recarga la lista sin desmontar la tabla, así no se pierden los modales de éxito */
    onChanged: () => void;
    onDelete: (client: ClienteNegocio) => Promise<void>;
}

export default function ClientsTable({ data, isLoading, loadError, onRetry, hasActiveFilters, onClearFilters, onChanged, onDelete }: ClientsTableProps) {
    const navigate = useNavigate();
    const contractRecords = useCampaignContractRecords();
    const deliveryRecords = useCampaignDeliveryRecords();
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<TableViewMode>("table");
    const [editing, setEditing] = useState<{ open: boolean; client: ClienteNegocio | null }>({ open: false, client: null });
    const [deleting, setDeleting] = useState<{ open: boolean; client: ClienteNegocio | null }>({ open: false, client: null });
    const [campaignInquiry, setCampaignInquiry] = useState<{ open: boolean; participation: CommercialParticipationRow | null }>({ open: false, participation: null });
    const [success, setSuccess] = useState({ open: false });

    const totalContractsCount = Object.values(contractRecords).reduce((sum, list) => sum + list.length, 0);

    const clientCampaignSummary = (row: ClienteNegocio) => {
        const activeCount = (row.clienteNegocioId % 2) + 1;
        return `${activeCount} ${activeCount === 1 ? "campaña activa" : "campañas activas"} · ${Math.max(1, totalContractsCount)} contratos`;
    };

    const buildParticipationFor = (row: ClienteNegocio): CommercialParticipationRow => {
        const relationId = row.clienteNegocioId;
        const contracts = contractRecords[`1:${relationId}`] ?? Object.values(contractRecords)[0] ?? [];
        const deliveries = contracts.flatMap((contract) =>
            (deliveryRecords[`1:${relationId}:${contract.id}`] ?? []).map((delivery) => ({
                contractId: contract.id,
                contractName: contract.archivo.name,
                delivery,
            })),
        );
        const kilosAcordados = contracts.reduce((sum, c) => sum + c.cantidadPropuestaKg, 0) || 48000;
        return {
            id: `part-${row.clienteNegocioId}`,
            campaniaId: 1,
            campaniaNombre: "Campaña Mango Kent Exportación 2026",
            fruta: "Mango",
            variedades: ["Kent", "Edward"],
            relationId,
            clienteId: row.clienteNegocioId,
            clienteNombre: row.nombreEmpresa,
            ruc: row.ruc,
            canal: row.tipoCliente === "industria" ? "Industria" : "Exportador",
            pais: row.ubicacion || "Perú / Exportación",
            cantidadRequeridaKg: 50000,
            kilosAcordados,
            fechaRegistro: "2026-09-15",
            observaciones: "Cliente vinculado con programación semanal activa y control de calidad habilitado.",
            contracts,
            deliveries,
        };
    };

    const getExportData = (): TableExport => ({
        filename: "clientes",
        title: "Clientes",
        header: ["Empresa", "Contacto", "Teléfono", "Correo", "RUC", "Ubicación", "Tipo", "Participación"],
        rows: data.map((row) => [
            row.nombreEmpresa,
            row.nombreContacto,
            row.telefono,
            row.correoCorporativo,
            row.ruc,
            row.ubicacion,
            TIPO_LABEL[row.tipoCliente] ?? row.tipoCliente,
            clientCampaignSummary(row),
        ]),
    });

    const getRowActions = (row: ClienteNegocio): { primary: RowAction[]; secondary: RowAction[] } => ({
        primary: [
            { label: "Ver detalles", icon: <Eye size={18} strokeWidth={2.5} />, onClick: () => navigate(`/planificacion-comercial/${row.clienteNegocioId}`) },
            { label: "Editar", icon: <Pencil size={18} strokeWidth={2.5} />, onClick: () => setEditing({ open: true, client: row }) },
            { label: "Eliminar", icon: <Trash2 size={18} strokeWidth={2.5} />, variant: "destructive", onClick: () => setDeleting({ open: true, client: row }) },
        ],
        secondary: [
            {
                label: "Consulta cliente–campaña",
                icon: <FileText size={16} strokeWidth={2.5} />,
                variant: "brand",
                onClick: () => setCampaignInquiry({ open: true, participation: buildParticipationFor(row) }),
            },
        ],
    });

    const { pageCount, currentPage, visible: visibleData } = paginate(data, page);

    const emptyState = isLoading
        ? { icon: <Spinner className="size-7" />, title: "Cargando clientes", description: "Consultando los clientes registrados.", action: undefined }
        : loadError
            ? {
                icon: <TriangleAlert size={28} strokeWidth={2} />,
                title: "No se pudieron cargar los clientes",
                description: loadError,
                action: { label: "Reintentar", icon: <RotateCw size={18} strokeWidth={2.5} />, onClick: onRetry, tone: "secondary" as const },
            }
            : {
                icon: <SearchX size={28} strokeWidth={2} />,
                title: hasActiveFilters ? "Sin resultados" : "Aún no hay clientes",
                description: hasActiveFilters
                    ? "Ningún cliente coincide con los filtros aplicados. Prueba ajustándolos."
                    : "Cuando registres tu primer cliente aparecerá acá.",
                action: hasActiveFilters
                    ? { label: "Limpiar filtros", icon: <ListFilter size={18} strokeWidth={2.5} />, onClick: onClearFilters, tone: "secondary" as const }
                    : undefined,
            };

    return (
        <>
            <TableCard
                icon={<Contact size={24} strokeWidth={2.5} />}
                title="Clientes Generales"
                description="Consulta a tus clientes, sus contratos activos y su participación por campaña."
                headerRight={
                    <TableToolbar>
                        <TableCountPill icon={<Contact size={16} strokeWidth={2.5} className="text-brand" />} count={data.length} singular="cliente" plural="clientes" />
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
                    {visibleData.map((row) => (
                        <TableGridCard
                            key={row.clienteNegocioId}
                            accentColor="border-l-brand"
                            icon={row.nombreEmpresa.charAt(0)}
                            title={row.nombreEmpresa}
                            subtitle={row.nombreContacto}
                            actions={<RowActions {...getRowActions(row)} />}
                        >
                            <div className="mx-4 flex flex-col gap-2.5 rounded-lg bg-surface-page border border-border p-3">
                                <div className="flex justify-between gap-3">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted shrink-0">Tipo</span>
                                    <span className="text-[13px] font-semibold text-ink truncate">{TIPO_LABEL[row.tipoCliente] ?? row.tipoCliente}</span>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider shrink-0">Campañas</span>
                                    <span className="text-[13px] font-semibold text-ink truncate">{clientCampaignSummary(row)}</span>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider shrink-0">Ubicación</span>
                                    <span className="text-[13px] font-semibold text-ink truncate">{row.ubicacion || "—"}</span>
                                </div>
                            </div>
                        </TableGridCard>
                    ))}
                </div>

                {viewMode === "table" && (
                    <div className="hidden sm:block rounded-xl overflow-hidden border border-border">
                        <Table>
                            <TableHeader className={TABLE_HEAD_BG}>
                                <TableRow className="border-b border-border hover:bg-transparent">
                                    <TableHead className="text-ink font-semibold h-14 px-6">Cliente</TableHead>
                                    <TableHead className="text-ink font-semibold h-14">Tipo</TableHead>
                                    <TableHead className="text-ink font-semibold h-14">Contacto</TableHead>
                                    <TableHead className="text-ink font-semibold h-14">Contratos / Campañas</TableHead>
                                    <TableHead className="text-ink font-semibold h-14">Ubicación</TableHead>
                                    <TableHead className="text-ink font-semibold h-14 text-center px-6 w-48">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visibleData.map((row) => (
                                    <TableRow key={row.clienteNegocioId} className="border-b border-border hover:bg-surface-page/60 transition-colors">
                                        <TableCell className="h-20 px-6 relative">
                                            <TableRowAccent color="bg-brand" />
                                            <TableRowLead
                                                icon={row.nombreEmpresa.charAt(0)}
                                                title={row.nombreEmpresa}
                                                subtitle={`RUC ${row.ruc}`}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={row.tipoCliente === "exportador" ? "brand" : "outline"} className="h-6 px-2.5 text-[12px] font-semibold">
                                                {TIPO_LABEL[row.tipoCliente] ?? row.tipoCliente}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-[13.5px] font-semibold leading-tight text-ink-body">{row.nombreContacto}</span>
                                                <span className="mt-0.5 text-[12px] font-medium tabular-nums text-ink-muted">{row.telefono}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <button
                                                type="button"
                                                onClick={() => setCampaignInquiry({ open: true, participation: buildParticipationFor(row) })}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-page/60 px-2.5 py-1 text-[12px] font-semibold text-ink hover:border-brand hover:text-brand transition-colors"
                                            >
                                                <FileText size={13} className="text-brand" />
                                                {clientCampaignSummary(row)}
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-ink-body font-medium">
                                                <MapPin size={16} className="shrink-0 text-ink-muted" />
                                                <span className="truncate">{row.ubicacion || "—"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6">
                                            <RowActions {...getRowActions(row)} className="justify-center text-ink-muted" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </TableCard>

            <ClientFormModal
                open={editing.open}
                onOpenChange={(open) => setEditing((current) => ({ ...current, open }))}
                mode="edit"
                clientId={editing.client?.clienteNegocioId}
                initialValues={editing.client ?? undefined}
                onSuccess={() => {
                    setEditing((current) => ({ ...current, open: false }));
                    setSuccess({ open: true });
                    onChanged();
                }}
            />

            <ConfirmModal
                open={deleting.open}
                onOpenChange={(open) => setDeleting((current) => ({ ...current, open }))}
                icon={<Trash2 size={28} strokeWidth={2.25} />}
                title="¿Eliminar cliente?"
                description={<>Se eliminará <strong className="font-bold text-ink">{deleting.client?.nombreEmpresa}</strong> de Gestión Comercial. Esta acción no se puede deshacer.</>}
                confirmLabel="Sí, eliminar"
                onConfirm={() => { if (deleting.client) void onDelete(deleting.client); }}
            />

            <ClientSuccessModal
                open={success.open}
                onOpenChange={(open) => setSuccess({ open })}
                mode="edit"
            />

            <CommercialClientCampaignDetailModal
                open={campaignInquiry.open}
                onOpenChange={(open) => setCampaignInquiry((current) => ({ ...current, open }))}
                participation={campaignInquiry.participation}
            />
        </>
    );
}
