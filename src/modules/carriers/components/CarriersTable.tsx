import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Eye, Truck, UserRound, Trash2, ListFilter, Building2, MapPin } from "lucide-react";
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
import { TABLE_HEAD_BG, TableRowLead } from "@/shared/components/DataTableRow";
import TableGridCard, { TableGridCardField, TableGridCardFields } from "@/shared/components/TableGridCard";
import { TableToolbar, TableCountPill, TableExportMenu, TableViewToggle, type TableViewMode } from "@/shared/components/TableToolbar";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
import ConfirmModal from "@/shared/components/ConfirmModal";
import CarrierSuccessModal, { type CarrierSuccessMode } from "./CarrierSuccessModal";
import CarrierFormModal from "./CarrierFormModal";
import { CARRIER_TIPOS, carrierIdentification, type CarrierFormValues, type CarrierProfile } from "@/modules/carriers/carrierProfile.utils";
import type { TableExport } from "@/shared/utils/exportTable";
import { paginate } from "@/shared/utils/paginate";

const locationOf = (row: CarrierProfile) => [row.ciudad, row.departamento].filter(Boolean).join(", ");

interface CarriersTableProps {
    data: CarrierProfile[];
    isLoading: boolean;
    hasActiveFilters: boolean;
    onClearFilters: () => void;
    onDelete: (id: number) => void;
    onUpdateCarrier: (id: number, values: CarrierFormValues) => Promise<void>;
}

export default function CarriersTable({ data, isLoading, hasActiveFilters, onClearFilters, onDelete, onUpdateCarrier }: CarriersTableProps) {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<TableViewMode>("table");

    const fleetSummary = (row: CarrierProfile) => {
        const vCount = row.vehiculos.length;
        const dCount = row.choferes.length;
        return {
            fleetLabel: `${vCount} ${vCount === 1 ? "vehículo" : "vehículos"} · ${dCount} ${dCount === 1 ? "chofer" : "choferes"}`,
        };
    };

    const getExportData = (): TableExport => ({
        filename: "transportistas",
        title: "Transportistas",
        header: ["Transportista", "Tipo", "Identificación", "MTC", "Flota y Choferes", "Teléfono", "Correo", "Ubicación"],
        rows: data.map((row) => [
            row.nombre,
            CARRIER_TIPOS[row.tipo].label,
            carrierIdentification(row),
            row.mtc,
            fleetSummary(row).fleetLabel,
            row.numero,
            row.correo,
            locationOf(row),
        ]),
    });
    const [editingCarrierId, setEditingCarrierId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState<{ open: boolean; carrier: CarrierProfile | null }>({ open: false, carrier: null });
    const [success, setSuccess] = useState<{ open: boolean; mode: CarrierSuccessMode }>({ open: false, mode: "carrier-updated" });

    const showSuccess = (mode: CarrierSuccessMode) => setSuccess({ open: true, mode });

    const getRowActions = (row: CarrierProfile): { primary: RowAction[]; secondary: RowAction[] } => {
        const primary: RowAction[] = [
            { label: "Ver detalles", icon: <Eye size={18} strokeWidth={2.5} />, onClick: () => navigate(`/transportistas/${row.id}`) },
            { label: "Editar", icon: <Pencil size={18} strokeWidth={2.5} />, onClick: () => setEditingCarrierId(row.id) },
            { label: "Eliminar", icon: <Trash2 size={18} strokeWidth={2.5} />, variant: "destructive", onClick: () => setDeleting({ open: true, carrier: row }) },
        ];
        const secondary: RowAction[] = [
            { label: "Vehículos", icon: <Truck size={16} strokeWidth={2.5} />, variant: "brand", onClick: () => navigate("/transportistas/" + row.id + "?tab=vehiculos") },
            { label: "Choferes", icon: <UserRound size={16} strokeWidth={2.5} />, variant: "brand", onClick: () => navigate("/transportistas/" + row.id + "?tab=choferes") },
        ];
        return { primary, secondary };
    };

    const editingCarrier = data.find((row) => row.id === editingCarrierId) ?? null;

    const { pageCount, currentPage, visible: visibleData } = paginate(data, page);

    return (
        <>
            <TableCard
                icon={<Truck size={24} strokeWidth={2.5} />}
                title="Transportistas Registrados"
                description="Consulta a los transportistas y accede a sus vehículos y choferes."
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
                <div className={`flex flex-col gap-3 ${viewMode === "grid" ? "sm:grid sm:grid-cols-2 lg:grid-cols-3" : "sm:hidden"}`}>
                    {visibleData.map((row) => {
                        const fInfo = fleetSummary(row);
                        return (
                            <TableGridCard
                                key={row.id}
                                icon={row.tipo === "privado" ? <UserRound size={18} strokeWidth={2} /> : <Building2 size={18} strokeWidth={2} />}
                                title={
                                    <span className="flex items-center gap-2">
                                        {row.nombre}
                                    </span>
                                }
                                subtitle={CARRIER_TIPOS[row.tipo].label}
                                actions={<RowActions {...getRowActions(row)} />}
                            >
                                <TableGridCardFields>
                                    <TableGridCardField label="MTC" value={row.mtc || "—"} />
                                    <TableGridCardField label="Flota" value={fInfo.fleetLabel} />
                                    <TableGridCardField label="Teléfono" value={row.numero || "—"} />
                                    <TableGridCardField label="Ubicación" value={locationOf(row) || "—"} />
                                </TableGridCardFields>
                            </TableGridCard>
                        );
                    })}
                </div>

                {viewMode === "table" && (
                <div className="hidden sm:block rounded-xl overflow-hidden border border-border">
                    <Table>
                        <TableHeader className={TABLE_HEAD_BG}>
                            <TableRow className="border-b border-border hover:bg-transparent">
                                <TableHead className="text-ink font-semibold h-14">Transportista</TableHead>
                                <TableHead className="text-ink font-semibold h-14">Tipo</TableHead>
                                <TableHead className="text-ink font-semibold h-14">MTC</TableHead>
                                <TableHead className="text-ink font-semibold h-14">Flota y Choferes</TableHead>
                                <TableHead className="text-ink font-semibold h-14">Contacto</TableHead>
                                <TableHead className="text-ink font-semibold h-14">Ubicación</TableHead>
                                <TableHead className="text-ink font-semibold h-14 text-center px-6 w-40">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleData.map((row) => {
                                const fInfo = fleetSummary(row);
                                return (
                                    <TableRow key={row.id} className="border-b border-border hover:bg-surface-page/60 transition-colors">
                                        <TableCell className="h-20">
                                            <TableRowLead
                                                icon={row.tipo === "privado" ? <UserRound size={20} strokeWidth={2} /> : <Building2 size={20} strokeWidth={2} />}
                                                title={row.nombre}
                                                subtitle={carrierIdentification(row)}
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
                                                <span className="text-[13px] font-semibold text-ink">{fInfo.fleetLabel}</span>
                                            </div>
                                        </TableCell>
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
                                );
                            })}
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
