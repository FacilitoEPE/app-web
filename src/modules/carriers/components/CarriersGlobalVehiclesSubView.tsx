import { useMemo, useState } from "react";
import { Building2, Eye, Pencil, Plus, Trash2, Truck, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import FilterBar, { FilterSearch } from "@/shared/components/FilterBar";
import { InfoField, SummaryBar } from "@/shared/components/InfoField";
import ModalSection from "@/shared/components/ModalSection";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table";
import type { TableExport } from "@/shared/utils/exportTable";
import { formatDecimal } from "@/shared/utils/format";
import { paginate } from "@/shared/utils/paginate";
import type { Carrier, Vehicle } from "@/modules/carriers/carriers.data";
import { toVehicleInput, type VehicleFormValues } from "@/modules/carriers/carrierRecords.utils";
import CarrierVehicleModal from "@/modules/carriers/components/CarrierVehicleModal";

interface GlobalVehicleRow {
    vehicle: Vehicle;
    carrier: Carrier;
}

interface CarriersGlobalVehiclesSubViewProps {
    carriers: Carrier[];
    onCreateVehicle: (carrierId: number, values: ReturnType<typeof toVehicleInput>) => Promise<void>;
    onUpdateVehicle: (vehicleId: number, carrierId: number, values: ReturnType<typeof toVehicleInput>) => Promise<void>;
    onDeleteVehicle: (vehicleId: number) => Promise<void>;
}

export default function CarriersGlobalVehiclesSubView({
    carriers,
    onCreateVehicle,
    onUpdateVehicle,
    onDeleteVehicle,
}: CarriersGlobalVehiclesSubViewProps) {
    const [search, setSearch] = useState("");
    const [carrierFilter, setCarrierFilter] = useState("all");
    const [viewMode, setViewMode] = useState<TableViewMode>("table");
    const [page, setPage] = useState(1);

    const [selectedCarrierForCreate, setSelectedCarrierForCreate] = useState<string>("");
    const [createPickerOpen, setCreatePickerOpen] = useState(false);
    const [vehicleModal, setVehicleModal] = useState<{
        open: boolean;
        mode: "create" | "edit";
        carrier: Carrier | null;
        vehicle: Vehicle | null;
    }>({
        open: false,
        mode: "create",
        carrier: null,
        vehicle: null,
    });

    const [detailModal, setDetailModal] = useState<{
        open: boolean;
        row: GlobalVehicleRow | null;
    }>({
        open: false,
        row: null,
    });

    const allRows = useMemo<GlobalVehicleRow[]>(() => {
        const list: GlobalVehicleRow[] = [];
        for (const carrier of carriers) {
            for (const vehicle of carrier.vehiculos) {
                list.push({ vehicle, carrier });
            }
        }
        return list;
    }, [carriers]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return allRows.filter((row) => {
            if (carrierFilter !== "all" && String(row.carrier.id) !== carrierFilter) return false;
            if (q) {
                const hay = `${row.vehicle.placa} ${row.carrier.nombre} ${row.carrier.ruc}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [allRows, search, carrierFilter]);

    const { pageCount, currentPage, visible } = paginate(filteredRows, page);

    const getRowActions = (row: GlobalVehicleRow): { primary: RowAction[]; secondary: RowAction[] } => ({
        primary: [
            {
                label: "Ver detalle",
                icon: <Eye size={18} strokeWidth={2.4} />,
                onClick: () => setDetailModal({ open: true, row }),
            },
            {
                label: "Editar vehículo",
                icon: <Pencil size={18} strokeWidth={2.4} />,
                onClick: () =>
                    setVehicleModal({
                        open: true,
                        mode: "edit",
                        carrier: row.carrier,
                        vehicle: row.vehicle,
                    }),
            },
        ],
        secondary: [
            {
                label: "Eliminar vehículo",
                icon: <Trash2 size={16} strokeWidth={2.4} />,
                variant: "destructive",
                onClick: () => void onDeleteVehicle(row.vehicle.id),
            },
        ],
    });

    const getExportData = (): TableExport => ({
        filename: "vehiculos_flota_global",
        title: "Catálogo Global de Vehículos",
        header: [
            "Placa",
            "Dimensiones (m)",
            "Volumen (m³)",
            "Peso neto / bruto (t)",
            "Transportista",
            "RUC",
        ],
        rows: filteredRows.map(({ vehicle, carrier }) => [
            vehicle.placa,
            `${formatDecimal(vehicle.ancho)} × ${formatDecimal(vehicle.altura)} × ${formatDecimal(vehicle.profundidad)}`,
            formatDecimal(vehicle.volumen),
            `${formatDecimal(vehicle.pesoNeto)} / ${formatDecimal(vehicle.pesoBruto)}`,
            carrier.nombre,
            carrier.ruc,
        ]),
    });

    const hasActiveFilters = search !== "" || carrierFilter !== "all";

    const handleStartCreate = () => {
        if (carriers.length === 1) {
            setVehicleModal({
                open: true,
                mode: "create",
                carrier: carriers[0],
                vehicle: null,
            });
            return;
        }
        setSelectedCarrierForCreate(String(carriers[0]?.id ?? ""));
        setCreatePickerOpen(true);
    };

    const handleSaveVehicle = async (values: VehicleFormValues) => {
        if (!vehicleModal.carrier) return;
        const input = toVehicleInput(values);
        if (vehicleModal.mode === "edit" && vehicleModal.vehicle) {
            await onUpdateVehicle(vehicleModal.vehicle.id, vehicleModal.carrier.id, input);
        } else {
            await onCreateVehicle(vehicleModal.carrier.id, input);
        }
        setVehicleModal({ open: false, mode: "create", carrier: null, vehicle: null });
    };

    return (
        <div className="flex flex-col gap-6">
            <FilterBar
                canClear={hasActiveFilters}
                onClear={() => {
                    setSearch("");
                    setCarrierFilter("all");
                }}
            >
                <FilterSearch
                    value={search}
                    onChange={setSearch}
                    placeholder="Buscar por placa o empresa de transporte..."
                />
                <div className="w-full sm:w-72">
                    <Select value={carrierFilter} onValueChange={(v) => setCarrierFilter(v ?? "all")}>
                        <SelectTrigger aria-label="Filtrar por transportista">
                            <SelectValue>{carrierFilter === "all" ? "Todos los transportistas" : carriers.find(c => String(c.id) === carrierFilter)?.nombre ?? "Transportista no disponible"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los transportistas</SelectItem>
                            {carriers.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                    {c.nombre}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button size="lg" onClick={handleStartCreate} disabled={carriers.length === 0}>
                    <Plus size={18} strokeWidth={2.5} /> Nuevo vehículo
                </Button>
            </FilterBar>

            <TableCard
                icon={<Truck size={24} strokeWidth={2.2} />}
                title="Padrón global de vehículos"
                description="Unidades registradas en todas las empresas de transporte habilitadas."
                headerRight={
                    <TableToolbar>
                        <TableCountPill
                            icon={<Truck size={16} strokeWidth={2.5} className="text-brand" />}
                            count={filteredRows.length}
                            singular="vehículo"
                            plural="vehículos"
                        />
                        <TableExportMenu getData={getExportData} />
                        <TableViewToggle value={viewMode} onChange={setViewMode} />
                    </TableToolbar>
                }
                isEmpty={filteredRows.length === 0}
                emptyTitle="No se encontraron vehículos"
                emptyDescription="Registra una unidad o limpia los filtros activos."
                page={currentPage}
                pageCount={pageCount}
                onPageChange={setPage}
            >
                {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                        {visible.map((row) => {
                            const actions = getRowActions(row);
                            const v = row.vehicle;
                            return (
                                <TableGridCard
                                    key={`${row.carrier.id}-${v.id}`}
                                    accentColor="border-l-brand"
                                    icon={<Truck size={18} strokeWidth={2.2} />}
                                    title={v.placa}
                                    subtitle={row.carrier.nombre}
                                    actions={<RowActions primary={actions.primary} secondary={actions.secondary} />}
                                >
                                    <TableGridCardFields>
                                        <TableGridCardField
                                            label="Dimensiones (m)"
                                            value={`${formatDecimal(v.ancho)} × ${formatDecimal(v.altura)} × ${formatDecimal(v.profundidad)}`}
                                        />
                                        <TableGridCardField
                                            label="Volumen"
                                            value={`${formatDecimal(v.volumen)} m³`}
                                        />
                                        <TableGridCardField
                                            label="Peso neto / bruto"
                                            value={`${formatDecimal(v.pesoNeto)} t / ${formatDecimal(v.pesoBruto)} t`}
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
                                <TableHead className="py-3.5 pl-6 pr-3 font-bold text-ink">Placa</TableHead>
                                <TableHead className="px-3 py-3.5 font-bold text-ink">Dimensiones (m)</TableHead>
                                <TableHead className="px-3 py-3.5 text-right font-bold text-ink">Volumen</TableHead>
                                <TableHead className="px-3 py-3.5 text-right font-bold text-ink">
                                    Peso neto / bruto
                                </TableHead>
                                <TableHead className="px-3 py-3.5 font-bold text-ink">Transportista</TableHead>
                                <TableHead className="py-3.5 pl-3 pr-6 text-right font-bold text-ink">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border/60">
                            {visible.map((row) => {
                                const actions = getRowActions(row);
                                const v = row.vehicle;
                                return (
                                    <TableRow
                                        key={`${row.carrier.id}-${v.id}`}
                                        className="transition-colors hover:bg-muted/30"
                                    >
                                        <TableCell className="relative py-3.5 pl-6 pr-3">
                                            <TableRowAccent color="bg-brand" />
                                            <TableRowLead
                                                icon={<Truck size={18} strokeWidth={2.2} />}
                                                title={v.placa}
                                                subtitle={`ID #${v.id}`}
                                            />
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-[13px] font-semibold tabular-nums text-ink">
                                            {formatDecimal(v.ancho)} × {formatDecimal(v.altura)} ×{" "}
                                            {formatDecimal(v.profundidad)} m
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-right font-bold tabular-nums text-brand">
                                            {formatDecimal(v.volumen)} m³
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-right text-[13px] font-semibold tabular-nums text-ink">
                                            {formatDecimal(v.pesoNeto)} t / {formatDecimal(v.pesoBruto)} t
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5">
                                            <div className="flex flex-col">
                                                <span className="text-[13.5px] font-bold text-ink">
                                                    {row.carrier.nombre}
                                                </span>
                                                <span className="text-[12px] text-ink-muted">
                                                    RUC {row.carrier.ruc}
                                                </span>
                                            </div>
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

            {/* Selector de transportista previo a crear un vehículo */}
            <AppModal
                open={createPickerOpen}
                onOpenChange={setCreatePickerOpen}
                icon={<Building2 size={22} />}
                title="Seleccionar empresa de transporte"
                description="Elige a qué transportista pertenecerá el nuevo vehículo."
                size="md"
                footer={
                    <>
                        <Button variant="outline" size="xl" onClick={() => setCreatePickerOpen(false)}>
                            <X size={18} /> Cancelar
                        </Button>
                        <Button
                            size="xl"
                            onClick={() => {
                                const target = carriers.find((c) => String(c.id) === selectedCarrierForCreate);
                                if (!target) return;
                                setCreatePickerOpen(false);
                                setVehicleModal({
                                    open: true,
                                    mode: "create",
                                    carrier: target,
                                    vehicle: null,
                                });
                            }}
                        >
                            Continuar al registro
                        </Button>
                    </>
                }
            >
                <ModalSection title="Transportista titular">
                    <Select value={selectedCarrierForCreate} onValueChange={(v) => setSelectedCarrierForCreate(v ?? "")}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona un transportista" />
                        </SelectTrigger>
                        <SelectContent>
                            {carriers.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                    {c.nombre} (RUC {c.ruc})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </ModalSection>
            </AppModal>

            {/* Modal de creación / edición de vehículo */}
            <CarrierVehicleModal
                open={vehicleModal.open}
                onOpenChange={(open) => setVehicleModal((current) => ({ ...current, open }))}
                carrier={vehicleModal.carrier}
                mode={vehicleModal.mode}
                initialValues={
                    vehicleModal.vehicle
                        ? {
                              placa: vehicleModal.vehicle.placa,
                              ancho: String(vehicleModal.vehicle.ancho),
                              altura: String(vehicleModal.vehicle.altura),
                              profundidad: String(vehicleModal.vehicle.profundidad),
                              pesoNeto: String(vehicleModal.vehicle.pesoNeto),
                              pesoBruto: String(vehicleModal.vehicle.pesoBruto),
                          }
                        : undefined
                }
                onSuccess={handleSaveVehicle}
            />

            {/* Modal de solo lectura: Detalle de vehículo */}
            <AppModal
                open={detailModal.open}
                onOpenChange={(open) => setDetailModal((current) => ({ ...current, open }))}
                icon={<Truck size={22} />}
                title={`Detalle de vehículo · ${detailModal.row?.vehicle.placa ?? ""}`}
                description={detailModal.row?.carrier.nombre}
                size="md"
                footer={
                    <Button
                        variant="outline"
                        size="xl"
                        onClick={() => setDetailModal({ open: false, row: null })}
                    >
                        <X size={18} /> Cerrar
                    </Button>
                }
            >
                {detailModal.row && (
                    <div className="flex flex-col gap-5">
                        <SummaryBar
                            items={[
                                {
                                    label: "Placa de rodaje",
                                    value: detailModal.row.vehicle.placa,
                                    tone: "brand",
                                },
                                {
                                    label: "Volumen útil",
                                    value: `${formatDecimal(detailModal.row.vehicle.volumen)} m³`,
                                },
                                {
                                    label: "Capacidad bruta",
                                    value: `${formatDecimal(detailModal.row.vehicle.pesoBruto)} t`,
                                },
                            ]}
                        />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <InfoField
                                label="Empresa de transporte"
                                value={detailModal.row.carrier.nombre}
                            />
                            <InfoField
                                label="Dimensiones (Ancho × Alto × Prof.)"
                                value={`${formatDecimal(detailModal.row.vehicle.ancho)} × ${formatDecimal(detailModal.row.vehicle.altura)} × ${formatDecimal(detailModal.row.vehicle.profundidad)} m`}
                            />
                            <InfoField
                                label="Peso neto"
                                value={`${formatDecimal(detailModal.row.vehicle.pesoNeto)} t`}
                            />
                            <InfoField
                                label="Peso bruto"
                                value={`${formatDecimal(detailModal.row.vehicle.pesoBruto)} t`}
                            />
                        </div>
                    </div>
                )}
            </AppModal>
        </div>
    );
}
