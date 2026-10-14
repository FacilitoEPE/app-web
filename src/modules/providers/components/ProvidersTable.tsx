import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Eye, Trash2, Truck, LandPlot, ShieldCheck, UserRound, ListFilter, MapPin, Phone, TriangleAlert, RotateCw, SearchX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Spinner } from "@/shared/components/ui/spinner";
import TableCard from "@/shared/components/TableCard";
import ConfirmModal from "@/shared/components/ConfirmModal";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import TableGridCard, { TableGridCardFields, TableGridCardField } from "@/shared/components/TableGridCard";
import { TableToolbar, TableCountPill, TableExportMenu, TableViewToggle, type TableViewMode } from "@/shared/components/TableToolbar";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
import ProviderFormModal from "@/modules/providers/components/ProviderFormModal";
import type { ProveedorInput } from "@/modules/providers/api/proveedor.dto";
import type { Proveedor } from "@/modules/providers/api/proveedor.mapper";
import type { createInFlightGuard } from "@/shared/utils/inFlightGuard";
import type { TableExport } from "@/shared/utils/exportTable";
import { paginate } from "@/shared/utils/paginate";

const fullName = (provider: Proveedor) => `${provider.nombres} ${provider.apellido}`;
const documentLabel = (provider: Proveedor) => `${provider.tipoDocumento} ${provider.nmrDocumento}`;

interface ProvidersTableProps {
    data: Proveedor[];
    isLoading: boolean;
    loadError: string | null;
    onRetry: () => void;
    hasActiveFilters: boolean;
    onClearFilters: () => void;
    mutationGuard: ReturnType<typeof createInFlightGuard>;
    onSave: (providerId: number | null, input: ProveedorInput) => Promise<Proveedor>;
    onDelete: (provider: Proveedor) => Promise<void>;
}

export default function ProvidersTable({ data, isLoading, loadError, onRetry, hasActiveFilters, onClearFilters, mutationGuard, onSave, onDelete }: ProvidersTableProps) {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<TableViewMode>("table");
    // Se conserva el proveedor al cerrar para que los modales no se vacíen durante su animación de salida
    const [editing, setEditing] = useState<{ open: boolean; provider: Proveedor | null }>({ open: false, provider: null });
    const [deleting, setDeleting] = useState<{ open: boolean; provider: Proveedor | null }>({ open: false, provider: null });
    /** Lo que exporta la tabla: las filas visibles con los filtros aplicados */
    const getExportData = (): TableExport => ({
        filename: "proveedores",
        title: "Proveedores",
        header: ["Nombre", "Documento", "Zona", "Teléfono", "Correo", "Código lugar de producción"],
        rows: data.map((row) => [fullName(row), documentLabel(row), row.zona, String(row.telefono), row.email, String(row.codigoLugarProduccion)]),
    });

    /** Ver, editar y eliminar quedan siempre visibles: es el CRUD del proveedor; el resto va en el menú de 3 puntos */
    const getRowActions = (row: Proveedor): { primary: RowAction[]; secondary: RowAction[] } => ({
        primary: [
            { label: "Ver detalles", icon: <Eye size={18} strokeWidth={2.5} />, onClick: () => navigate(`/proveedores/${row.proveedorId}`) },
            { label: "Editar", icon: <Pencil size={18} strokeWidth={2.5} />, onClick: () => setEditing({ open: true, provider: row }) },
            { label: "Eliminar", icon: <Trash2 size={18} strokeWidth={2.5} />, variant: "destructive", onClick: () => setDeleting({ open: true, provider: row }) },
        ],
        secondary: [
            { label: "Gestión de fincas", icon: <LandPlot size={18} strokeWidth={2.5} />, onClick: () => navigate(`/proveedores/${row.proveedorId}/fincas`) },
            { label: "Gestión de certificados", icon: <ShieldCheck size={18} strokeWidth={2.5} />, onClick: () => navigate(`/proveedores/${row.proveedorId}/certificados`) },
        ],
    });

    const { pageCount, currentPage, visible: visibleData } = paginate(data, page);

    // El marco de la tabla se mantiene siempre; carga y error ocupan el lugar del estado vacío
    const emptyState = isLoading
        ? { icon: <Spinner className="size-7" />, title: "Cargando proveedores", description: "Consultando los proveedores registrados.", action: undefined }
        : loadError
            ? {
                icon: <TriangleAlert size={28} strokeWidth={2} />,
                title: "No se pudieron cargar los proveedores",
                description: loadError,
                action: { label: "Reintentar", icon: <RotateCw size={18} strokeWidth={2.5} />, onClick: onRetry, tone: "secondary" as const },
            }
            : {
                icon: <SearchX size={28} strokeWidth={2} />,
                title: hasActiveFilters ? "Sin resultados" : "Aún no hay proveedores",
                description: hasActiveFilters
                    ? "No hay proveedores que coincidan con los filtros aplicados. Intenta con otros criterios de búsqueda."
                    : "Aún no hay proveedores registrados. Haz clic en 'Nuevo Proveedor' para comenzar.",
                action: hasActiveFilters
                    ? { label: "Limpiar filtros", icon: <ListFilter size={18} strokeWidth={2.5} />, onClick: onClearFilters, tone: "secondary" as const }
                    : undefined,
            };

    return (
        <>
            <TableCard
                icon={<Truck size={24} strokeWidth={2.5} />}
                title="Proveedores Registrados"
                description="Gestiona, consulta y da seguimiento a todos tus proveedores registrados."
                headerRight={
                    <TableToolbar>
                        <TableCountPill icon={<Truck size={16} strokeWidth={2.5} className="text-brand" />} count={data.length} singular="proveedor" plural="proveedores" />
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
                            key={row.proveedorId}
                            accentColor="border-l-brand"
                            icon={<UserRound size={18} strokeWidth={2} />}
                            title={fullName(row)}
                            subtitle={documentLabel(row)}
                            actions={<RowActions {...getRowActions(row)} />}
                        >
                            <TableGridCardFields>
                                <TableGridCardField label="Zona" value={row.zona || "—"} />
                                <TableGridCardField label="Teléfono" value={row.telefono ? String(row.telefono) : "—"} />
                            </TableGridCardFields>
                        </TableGridCard>
                    ))}
                </div>

                {viewMode === "table" && (
                    <div className="hidden sm:block rounded-xl overflow-hidden border border-border">
                        <Table>
                            <TableHeader className={TABLE_HEAD_BG}>
                                <TableRow className="border-b border-border hover:bg-transparent">
                                    <TableHead className="text-ink font-semibold h-14 px-6">Proveedor</TableHead>
                                    <TableHead className="text-ink font-semibold h-14">Documento</TableHead>
                                    <TableHead className="text-ink font-semibold h-14">Zona</TableHead>
                                    <TableHead className="text-ink font-semibold h-14">Teléfono</TableHead>
                                    <TableHead className="text-ink font-semibold h-14 text-center px-6 w-56">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visibleData.map((row) => (
                                    <TableRow key={row.proveedorId} className="border-b border-border hover:bg-surface-page/60 transition-colors">
                                        <TableCell className="h-20 px-6 relative">
                                            <TableRowAccent color="bg-brand" />
                                            <TableRowLead icon={<UserRound size={20} strokeWidth={2} />} title={fullName(row)} subtitle={row.email} />
                                        </TableCell>
                                        <TableCell className="text-ink-body font-medium">{documentLabel(row)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-ink-body font-medium"><MapPin size={16} className="text-ink-muted" />{row.zona || "—"}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-ink-body font-medium"><Phone size={16} className="text-ink-muted" />{row.telefono || "—"}</div>
                                        </TableCell>
                                        <TableCell className="px-6">
                                            <RowActions {...getRowActions(row)} className="justify-center" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </TableCard>

            <ProviderFormModal
                open={editing.open}
                onOpenChange={(open) => setEditing((current) => ({ ...current, open }))}
                mode="edit"
                provider={editing.provider}
                mutationGuard={mutationGuard}
                onSave={onSave}
            />

            <ConfirmModal
                open={deleting.open}
                onOpenChange={(open) => setDeleting((current) => ({ ...current, open }))}
                icon={<Trash2 size={28} strokeWidth={2.25} />}
                title="¿Eliminar proveedor?"
                description={<>Se eliminará a <strong className="font-bold text-ink">{deleting.provider ? fullName(deleting.provider) : ""}</strong> junto con sus registros. Esta acción no se puede deshacer.</>}
                confirmLabel="Sí, eliminar"
                onConfirm={() => { if (deleting.provider) void onDelete(deleting.provider); }}
            />
        </>
    );
}
