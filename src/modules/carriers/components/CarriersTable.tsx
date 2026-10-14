import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Eye, Truck, UserRound, UserPlus2, Trash2, ListFilter, Building2, MapPin } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Spinner } from "@/shared/components/ui/spinner";
import { Badge } from "@/shared/components/ui/badge";
import TableCard from "@/shared/components/TableCard";
import { TABLE_HEAD_BG, TableRowLead } from "@/shared/components/DataTableRow";
import TableGridCard, { TableGridCardField, TableGridCardFields } from "@/shared/components/TableGridCard";
import { TableToolbar, TableCountPill, TableExportMenu, TableViewToggle, type TableViewMode } from "@/shared/components/TableToolbar";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
import ConfirmModal from "@/shared/components/ConfirmModal";
import CarrierSuccessModal, { type CarrierSuccessMode } from "./CarrierSuccessModal";
import CarrierFormModal from "./CarrierFormModal";
import CarrierVehicleModal from "./CarrierVehicleModal";
import CarrierDriverModal from "./CarrierDriverModal";
import { CARRIER_TIPOS, type CarrierFormValues, type CarrierProfile } from "@/modules/carriers/carrierProfile.utils";
import { toDriverInput, toVehicleInput } from "@/modules/carriers/carrierRecords.utils";
import type { DriverInput, VehicleInput } from "@/modules/carriers/api/carrier.api";
import type { DriverFormValues } from "./CarrierDriverModal";
import type { VehicleFormValues } from "./CarrierVehicleModal";
import type { TableExport } from "@/shared/utils/exportTable";
import { paginate } from "@/shared/utils/paginate";

/** Documento que identifica al transportista: el RUC de la empresa o el documento de identidad del independiente */
function identification(row: CarrierProfile): string {
    if (row.tipo === "privado") return row.documento ? `Documento ${row.documento}` : row.ruc ? `RUC ${row.ruc}` : "Sin documento";
    return row.ruc ? `RUC ${row.ruc}` : "Sin RUC";
}

/** Ciudad y departamento, para tarjetas y exportación */
const locationOf = (row: CarrierProfile) => [row.ciudad, row.departamento].filter(Boolean).join(", ");

interface CarriersTableProps {
    data: CarrierProfile[];
    /** Mientras carga, la tabla mantiene su marco y muestra el aviso en lugar de las filas */
    isLoading: boolean;
    hasActiveFilters: boolean;
    onClearFilters: () => void;
    selectedIds: Set<number>;
    onToggleRow: (id: number) => void;
    onToggleAll: (ids: number[]) => void;
    onDelete: (id: number) => void;
    onUpdateCarrier: (id: number, values: CarrierFormValues) => Promise<void>;
    onCreateVehicle: (carrierId: number, values: VehicleInput) => Promise<void>;
    onCreateDriver: (carrierId: number, values: DriverInput) => Promise<void>;
}

export default function CarriersTable({ data, isLoading, hasActiveFilters, onClearFilters, selectedIds, onToggleRow, onToggleAll, onDelete, onUpdateCarrier, onCreateVehicle, onCreateDriver }: CarriersTableProps) {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<TableViewMode>("table");

    /** Lo que exporta la tabla: las filas visibles con los filtros aplicados */
    const getExportData = (): TableExport => ({
        filename: "transportistas",
        title: "Transportistas",
        header: ["Transportista", "Tipo", "Identificación", "MTC", "Teléfono", "Correo", "Ubicación"],
        rows: data.map((row) => [row.nombre, CARRIER_TIPOS[row.tipo].label, identification(row), row.mtc, row.numero, row.correo, locationOf(row)]),
    });
    const [editingCarrierId, setEditingCarrierId] = useState<number | null>(null);
    const [vehicleCarrierId, setVehicleCarrierId] = useState<number | null>(null);
    const [driverCarrierId, setDriverCarrierId] = useState<number | null>(null);
    // La empresa a eliminar se guarda completa: al confirmar desaparece de `data` y el texto no debe vaciarse mientras el modal se cierra
    const [deleting, setDeleting] = useState<{ open: boolean; carrier: CarrierProfile | null }>({ open: false, carrier: null });
    const [success, setSuccess] = useState<{ open: boolean; mode: CarrierSuccessMode }>({ open: false, mode: "carrier-updated" });

    const showSuccess = (mode: CarrierSuccessMode) => setSuccess({ open: true, mode });

    /** Ver y editar quedan siempre visibles; registrar vehículo/chofer y eliminar se agrupan en "más opciones" */
    const getRowActions = (row: CarrierProfile): { primary: RowAction[]; secondary: RowAction[] } => {
        const primary: RowAction[] = [
            { label: "Ver detalles", icon: <Eye size={18} strokeWidth={2.5} />, onClick: () => navigate(`/transportistas/${row.id}`) },
            { label: "Editar", icon: <Pencil size={18} strokeWidth={2.5} />, onClick: () => setEditingCarrierId(row.id) },
            { label: "Eliminar", icon: <Trash2 size={18} strokeWidth={2.5} />, variant: "destructive", onClick: () => setDeleting({ open: true, carrier: row }) },
        ];
        const secondary: RowAction[] = [
            { label: "Registrar vehículo", icon: <Truck size={16} strokeWidth={2.5} />, variant: "brand", onClick: () => setVehicleCarrierId(row.id) },
            { label: "Registrar chofer", icon: <UserPlus2 size={16} strokeWidth={2.5} />, variant: "brand", onClick: () => setDriverCarrierId(row.id) },
        ];
        return { primary, secondary };
    };

    const editingCarrier = data.find((row) => row.id === editingCarrierId) ?? null;
    const vehicleCarrier = data.find((row) => row.id === vehicleCarrierId) ?? null;
    const driverCarrier = data.find((row) => row.id === driverCarrierId) ?? null;

    const { pageCount, currentPage, visible: visibleData } = paginate(data, page);
    const visibleIds = visibleData.map((row) => row.id);
    const selectedOnPage = visibleIds.filter((id) => selectedIds.has(id)).length;
    const allOnPageSelected = visibleData.length > 0 && selectedOnPage === visibleData.length;

    return (
        <>
            <TableCard
                icon={<Truck size={24} strokeWidth={2.5} />}
                title="Transportistas Registrados"
                description="Consulta a los transportistas y selecciónalos para enviarles un requerimiento."
                headerRight={
                    <TableToolbar>
                        <TableCountPill icon={<Truck size={16} strokeWidth={2.5} className="text-brand" />} count={data.length} singular="transportista" plural="transportistas" />
                        <TableExportMenu getData={getExportData} />
                        <TableViewToggle value={viewMode} onChange={setViewMode} />
                    </TableToolbar>
                }
                isEmpty={isLoading || visibleData.length === 0}
                emptyIcon={isLoading ? <Spinner className="size-7" /> : undefined}
                emptyTitle={isLoading ? "Cargando transportistas" : hasActiveFilters ? "Sin resultados" : "Aún no hay transportistas"}
                emptyDescription={
                    isLoading
                        ? "Consultando los transportistas registrados."
                        : hasActiveFilters
                            ? "No hay transportistas que coincidan con los filtros aplicados. Intenta con otros criterios de búsqueda."
                            : "Aún no hay transportistas registrados. Haz clic en 'Registrar transportista' para comenzar."
                }
                emptyAction={
                    !isLoading && hasActiveFilters
                        ? { label: "Limpiar filtros", icon: <ListFilter size={18} />, onClick: onClearFilters, tone: "secondary" }
                        : undefined
                }
                page={currentPage}
                pageCount={pageCount}
                onPageChange={setPage}
            >
                {/* Móvil siempre en tarjetas; en desktop, tarjetas en grilla solo si se elige esa vista */}
                <div className={`flex flex-col gap-3 ${viewMode === "grid" ? "sm:grid sm:grid-cols-2 lg:grid-cols-3" : "sm:hidden"}`}>
                    {visibleData.map((row) => (
                        <TableGridCard
                            key={row.id}
                            icon={row.tipo === "privado" ? <UserRound size={18} strokeWidth={2} /> : <Building2 size={18} strokeWidth={2} />}
                            title={
                                <span className="flex items-center gap-2">
                                    <Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => onToggleRow(row.id)} aria-label={`Seleccionar ${row.nombre}`} />
                                    {row.nombre}
                                </span>
                            }
                            subtitle={CARRIER_TIPOS[row.tipo].label}
                            actions={<RowActions {...getRowActions(row)} />}
                        >
                            <TableGridCardFields>
                                <TableGridCardField label="MTC" value={row.mtc || "—"} />
                                <TableGridCardField label="Teléfono" value={row.numero || "—"} />
                                <TableGridCardField label="Ubicación" value={locationOf(row) || "—"} />
                            </TableGridCardFields>
                        </TableGridCard>
                    ))}
                </div>

                {viewMode === "table" && (
                <div className="hidden sm:block rounded-xl overflow-hidden border border-border">
                    <Table>
                        <TableHeader className={TABLE_HEAD_BG}>
                            <TableRow className="border-b border-border hover:bg-transparent">
                                <TableHead className="w-12 px-6 h-14">
                                    <Checkbox
                                        checked={allOnPageSelected}
                                        indeterminate={selectedOnPage > 0 && !allOnPageSelected}
                                        onCheckedChange={() => onToggleAll(visibleIds)}
                                        aria-label="Seleccionar todos"
                                    />
                                </TableHead>
                                <TableHead className="text-ink font-semibold h-14">Transportista</TableHead>
                                <TableHead className="text-ink font-semibold h-14">Tipo</TableHead>
                                <TableHead className="text-ink font-semibold h-14">MTC</TableHead>
                                <TableHead className="text-ink font-semibold h-14">Contacto</TableHead>
                                <TableHead className="text-ink font-semibold h-14">Ubicación</TableHead>
                                <TableHead className="text-ink font-semibold h-14 text-center px-6 w-40">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleData.map((row) => (
                                <TableRow key={row.id} className="border-b border-border hover:bg-surface-page/60 transition-colors">
                                    <TableCell className="px-6">
                                        <Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => onToggleRow(row.id)} aria-label={`Seleccionar ${row.nombre}`} />
                                    </TableCell>
                                    <TableCell className="h-20">
                                        <TableRowLead
                                            icon={row.tipo === "privado" ? <UserRound size={20} strokeWidth={2} /> : <Building2 size={20} strokeWidth={2} />}
                                            title={row.nombre}
                                            subtitle={identification(row)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={row.tipo === "privado" ? "outline" : "brand"} className="h-6 px-2.5 text-[12px] font-semibold">
                                            {CARRIER_TIPOS[row.tipo].short}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-ink-body font-medium">{row.mtc || <span className="text-ink-muted">—</span>}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-[13.5px] font-semibold leading-tight text-ink-body">{row.numero || "—"}</span>
                                            {row.correo && (
                                                <a href={`mailto:${row.correo}`} className="mt-0.5 truncate text-[12px] font-medium text-brand hover:underline">{row.correo}</a>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {row.ciudad ? (
                                            <div className="flex items-start gap-2">
                                                <MapPin size={16} className="mt-0.5 shrink-0 text-ink-muted" />
                                                <div className="flex flex-col">
                                                    <span className="text-[13.5px] font-semibold leading-tight text-ink-body">{row.ciudad}</span>
                                                    <span className="mt-0.5 text-[12px] font-medium text-ink-muted">{row.provincia} · {row.departamento}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-ink-muted">—</span>
                                        )}
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

            <CarrierFormModal
                open={editingCarrierId !== null}
                onOpenChange={(open) => !open && setEditingCarrierId(null)}
                mode="edit"
                initialValues={editingCarrier ?? undefined}
                onSuccess={async (values: CarrierFormValues) => {
                    if (!editingCarrier) return;
                    await onUpdateCarrier(editingCarrier.id, values);
                    setEditingCarrierId(null);
                    showSuccess("carrier-updated");
                }}
            />
            <CarrierVehicleModal
                open={vehicleCarrierId !== null}
                onOpenChange={(open) => !open && setVehicleCarrierId(null)}
                carrier={vehicleCarrier}
                onSuccess={async (values: VehicleFormValues) => {
                    if (!vehicleCarrier) return;
                    await onCreateVehicle(vehicleCarrier.id, toVehicleInput(values));
                    setVehicleCarrierId(null);
                    showSuccess("vehicle-created");
                }}
            />
            <CarrierDriverModal
                open={driverCarrierId !== null}
                onOpenChange={(open) => !open && setDriverCarrierId(null)}
                carrier={driverCarrier}
                onSuccess={async (values: DriverFormValues) => {
                    if (!driverCarrier) return;
                    await onCreateDriver(driverCarrier.id, toDriverInput(values));
                    setDriverCarrierId(null);
                    showSuccess("driver-created");
                }}
            />
            <ConfirmModal
                open={deleting.open}
                onOpenChange={(open) => setDeleting((current) => ({ ...current, open }))}
                icon={<Trash2 size={28} strokeWidth={2.25} />}
                title="¿Eliminar transportista?"
                description={<>Se intentará eliminar <strong className="font-bold text-ink">{deleting.carrier?.nombre}</strong>. El backend rechazará la operación si aún tiene vehículos o choferes asociados.</>}
                confirmLabel="Sí, eliminar"
                onConfirm={() => {
                    if (!deleting.carrier) return;
                    onDelete(deleting.carrier.id);
                }}
            />
            <CarrierSuccessModal
                open={success.open}
                onOpenChange={(open) => setSuccess((current) => ({ ...current, open }))}
                mode={success.mode}
            />
        </>
    );
}
