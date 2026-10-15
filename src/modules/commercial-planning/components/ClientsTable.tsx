import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Eye, Contact, ListFilter, MapPin, Trash2, TriangleAlert, RotateCw, SearchX } from "lucide-react";
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
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<TableViewMode>("table");
    // Se conserva el cliente al cerrar para que los modales no se vacíen durante su animación de salida
    const [editing, setEditing] = useState<{ open: boolean; client: ClienteNegocio | null }>({ open: false, client: null });
    const [deleting, setDeleting] = useState<{ open: boolean; client: ClienteNegocio | null }>({ open: false, client: null });
    const [success, setSuccess] = useState({ open: false });

    /** Lo que exporta la tabla: las filas visibles con los filtros aplicados */
    const getExportData = (): TableExport => ({
        filename: "clientes",
        title: "Clientes",
        header: ["Empresa", "Contacto", "Teléfono", "Correo", "RUC", "Ubicación", "Tipo"],
        rows: data.map((row) => [row.nombreEmpresa, row.nombreContacto, row.telefono, row.correoCorporativo, row.ruc, row.ubicacion, TIPO_LABEL[row.tipoCliente] ?? row.tipoCliente]),
    });

    /** Ver detalles, editar y eliminar, en el mismo orden que todas las tablas */
    const getRowActions = (row: ClienteNegocio): { primary: RowAction[] } => ({
        primary: [
            { label: "Ver detalles", icon: <Eye size={18} strokeWidth={2.5} />, onClick: () => navigate(`/planificacion-comercial/${row.clienteNegocioId}`) },
            { label: "Editar", icon: <Pencil size={18} strokeWidth={2.5} />, onClick: () => setEditing({ open: true, client: row }) },
            { label: "Eliminar", icon: <Trash2 size={18} strokeWidth={2.5} />, variant: "destructive", onClick: () => setDeleting({ open: true, client: row }) },
        ],
    });

    const { pageCount, currentPage, visible: visibleData } = paginate(data, page);

    // El marco de la tabla se mantiene siempre; carga y error ocupan el lugar del estado vacío
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
                description="Consulta a tus clientes; el correo y demás datos están en Ver detalles."
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
                {/* Móvil siempre en tarjetas; en desktop, tarjetas en grilla solo si se elige esa vista */}
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
                                    <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider shrink-0">Teléfono</span>
                                    <span className="text-[13px] font-semibold text-ink truncate">{row.telefono}</span>
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
        </>
    );
}
