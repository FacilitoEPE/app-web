import { useMemo, useState } from "react";
import { Building2, Eye, Pencil, Plus, Trash2, UserRound, X } from "lucide-react";
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
import { paginate } from "@/shared/utils/paginate";
import type { Carrier, Driver } from "@/modules/carriers/carriers.data";
import { toDriverInput, type DriverFormValues } from "@/modules/carriers/carrierRecords.utils";
import CarrierDriverModal from "@/modules/carriers/components/CarrierDriverModal";

interface GlobalDriverRow {
    driver: Driver;
    carrier: Carrier;
    documento: string;
    licencia: string;
}

interface CarriersGlobalDriversSubViewProps {
    carriers: Carrier[];
    onCreateDriver: (carrierId: number, values: ReturnType<typeof toDriverInput>) => Promise<void>;
    onUpdateDriver: (driverId: number, values: ReturnType<typeof toDriverInput>) => Promise<void>;
    onDeleteDriver: (driverId: number) => Promise<void>;
}

function getDemoDriverDocAndLicense(driver: Driver) {
    const num = 41200000 + driver.id * 1843;
    const doc = String(num).slice(0, 8);
    return {
        documento: `DNI ${doc}`,
        licencia: `Q${doc}`,
    };
}

export default function CarriersGlobalDriversSubView({
    carriers,
    onCreateDriver,
    onUpdateDriver,
    onDeleteDriver,
}: CarriersGlobalDriversSubViewProps) {
    const [search, setSearch] = useState("");
    const [carrierFilter, setCarrierFilter] = useState("all");
    const [viewMode, setViewMode] = useState<TableViewMode>("table");
    const [page, setPage] = useState(1);

    const [selectedCarrierForCreate, setSelectedCarrierForCreate] = useState<string>("");
    const [createPickerOpen, setCreatePickerOpen] = useState(false);
    const [driverModal, setDriverModal] = useState<{
        open: boolean;
        mode: "create" | "edit";
        carrier: Carrier | null;
        driver: Driver | null;
    }>({
        open: false,
        mode: "create",
        carrier: null,
        driver: null,
    });

    const [detailModal, setDetailModal] = useState<{
        open: boolean;
        row: GlobalDriverRow | null;
    }>({
        open: false,
        row: null,
    });

    const allRows = useMemo<GlobalDriverRow[]>(() => {
        const list: GlobalDriverRow[] = [];
        for (const carrier of carriers) {
            for (const driver of carrier.choferes) {
                const { documento, licencia } = getDemoDriverDocAndLicense(driver);
                list.push({ driver, carrier, documento, licencia });
            }
        }
        return list;
    }, [carriers]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return allRows.filter((row) => {
            if (carrierFilter !== "all" && String(row.carrier.id) !== carrierFilter) return false;
            if (q) {
                const hay = `${row.driver.nombre} ${row.documento} ${row.licencia} ${row.driver.telefono} ${row.driver.correo} ${row.carrier.nombre}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [allRows, search, carrierFilter]);

    const { pageCount, currentPage, visible } = paginate(filteredRows, page);

    const getRowActions = (row: GlobalDriverRow): { primary: RowAction[]; secondary: RowAction[] } => ({
        primary: [
            {
                label: "Ver detalle",
                icon: <Eye size={18} strokeWidth={2.4} />,
                onClick: () => setDetailModal({ open: true, row }),
            },
            {
                label: "Editar chofer",
                icon: <Pencil size={18} strokeWidth={2.4} />,
                onClick: () =>
                    setDriverModal({
                        open: true,
                        mode: "edit",
                        carrier: row.carrier,
                        driver: row.driver,
                    }),
            },
        ],
        secondary: [
            {
                label: "Eliminar chofer",
                icon: <Trash2 size={16} strokeWidth={2.4} />,
                variant: "destructive",
                onClick: () => void onDeleteDriver(row.driver.id),
            },
        ],
    });

    const getExportData = (): TableExport => ({
        filename: "choferes_padron_global",
        title: "Padrón Global de Choferes",
        header: ["Nombre", "Documento", "Licencia", "Teléfono", "Correo", "Transportista"],
        rows: filteredRows.map((r) => [
            r.driver.nombre,
            r.documento,
            r.licencia,
            r.driver.telefono,
            r.driver.correo,
            r.carrier.nombre,
        ]),
    });

    const hasActiveFilters = search !== "" || carrierFilter !== "all";

    const handleStartCreate = () => {
        if (carriers.length === 1) {
            setDriverModal({
                open: true,
                mode: "create",
                carrier: carriers[0],
                driver: null,
            });
            return;
        }
        setSelectedCarrierForCreate(String(carriers[0]?.id ?? ""));
        setCreatePickerOpen(true);
    };

    const handleSaveDriver = async (values: DriverFormValues) => {
        if (!driverModal.carrier) return;
        const input = toDriverInput(values);
        if (driverModal.mode === "edit" && driverModal.driver) {
            await onUpdateDriver(driverModal.driver.id, input);
        } else {
            await onCreateDriver(driverModal.carrier.id, input);
        }
        setDriverModal({ open: false, mode: "create", carrier: null, driver: null });
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
                    placeholder="Buscar por nombre, documento, licencia o empresa..."
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
                    <Plus size={18} strokeWidth={2.5} /> Nuevo chofer
                </Button>
            </FilterBar>

            <TableCard
                icon={<UserRound size={24} strokeWidth={2.2} />}
                title="Padrón global de conductores"
                description="Choferes acreditados en las empresas de transporte para despacho de carga."
                headerRight={
                    <TableToolbar>
                        <TableCountPill
                            icon={<UserRound size={16} strokeWidth={2.5} className="text-brand" />}
                            count={filteredRows.length}
                            singular="chofer"
                            plural="choferes"
                        />
                        <TableExportMenu getData={getExportData} />
                        <TableViewToggle value={viewMode} onChange={setViewMode} />
                    </TableToolbar>
                }
                isEmpty={filteredRows.length === 0}
                emptyTitle="No se encontraron choferes"
                emptyDescription="Registra un conductor o limpia los filtros activos."
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
                                    key={`${row.carrier.id}-${row.driver.id}`}
                                    accentColor="border-l-brand"
                                    icon={<UserRound size={18} strokeWidth={2.2} />}
                                    title={row.driver.nombre}
                                    subtitle={row.carrier.nombre}
                                    actions={<RowActions primary={actions.primary} secondary={actions.secondary} />}
                                >
                                    <TableGridCardFields>
                                        <TableGridCardField label="Documento" value={row.documento} />
                                        <TableGridCardField label="Licencia MTC" value={row.licencia} />
                                        <TableGridCardField label="Teléfono" value={row.driver.telefono} />
                                        <TableGridCardField label="Correo" value={row.driver.correo} />
                                    </TableGridCardFields>
                                </TableGridCard>
                            );
                        })}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className={`${TABLE_HEAD_BG} hover:bg-brand-surface`}>
                                <TableHead className="py-3.5 pl-6 pr-3 font-bold text-ink">Nombre</TableHead>
                                <TableHead className="px-3 py-3.5 font-bold text-ink">Documento</TableHead>
                                <TableHead className="px-3 py-3.5 font-bold text-ink">Licencia</TableHead>
                                <TableHead className="px-3 py-3.5 font-bold text-ink">Teléfono</TableHead>
                                <TableHead className="px-3 py-3.5 font-bold text-ink">Correo</TableHead>
                                <TableHead className="px-3 py-3.5 font-bold text-ink">Transportista</TableHead>
                                <TableHead className="py-3.5 pl-3 pr-6 text-right font-bold text-ink">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border/60">
                            {visible.map((row) => {
                                const actions = getRowActions(row);
                                return (
                                    <TableRow
                                        key={`${row.carrier.id}-${row.driver.id}`}
                                        className="transition-colors hover:bg-muted/30"
                                    >
                                        <TableCell className="relative py-3.5 pl-6 pr-3">
                                            <TableRowAccent color="bg-brand" />
                                            <TableRowLead
                                                icon={<UserRound size={18} strokeWidth={2.2} />}
                                                title={row.driver.nombre}
                                                subtitle={`Conductor #${row.driver.id}`}
                                            />
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-[13px] font-semibold tabular-nums text-ink">
                                            {row.documento}
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-[13px] font-bold tabular-nums text-brand">
                                            {row.licencia}
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-[13px] font-medium text-ink">
                                            {row.driver.telefono}
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-[13px] text-ink-muted">
                                            {row.driver.correo}
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5">
                                            <span className="text-[13.5px] font-bold text-ink">
                                                {row.carrier.nombre}
                                            </span>
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

            {/* Selector de transportista previo a crear un chofer */}
            <AppModal
                open={createPickerOpen}
                onOpenChange={setCreatePickerOpen}
                icon={<Building2 size={22} />}
                title="Seleccionar empresa de transporte"
                description="Elige a qué transportista pertenecerá el nuevo conductor."
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
                                setDriverModal({
                                    open: true,
                                    mode: "create",
                                    carrier: target,
                                    driver: null,
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

            <CarrierDriverModal
                open={driverModal.open}
                onOpenChange={(open) => setDriverModal((current) => ({ ...current, open }))}
                carrier={driverModal.carrier}
                mode={driverModal.mode}
                initialValues={
                    driverModal.driver
                        ? {
                              nombre: driverModal.driver.nombre,
                              telefono: driverModal.driver.telefono,
                              correo: driverModal.driver.correo,
                              tipoDocumento: driverModal.driver.tipoDocumento ?? "DNI",
                              numeroDocumento: driverModal.driver.numeroDocumento ?? "",
                              numeroLicencia: driverModal.driver.numeroLicencia ?? "",
                          }
                        : undefined
                }
                onSuccess={handleSaveDriver}
            />

            {/* Modal de solo lectura: Detalle de chofer */}
            <AppModal
                open={detailModal.open}
                onOpenChange={(open) => setDetailModal((current) => ({ ...current, open }))}
                icon={<UserRound size={22} />}
                title={`Detalle de chofer · ${detailModal.row?.driver.nombre ?? ""}`}
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
                                    label: "Documento de identidad",
                                    value: detailModal.row.documento,
                                },
                                {
                                    label: "Licencia de conducir MTC",
                                    value: detailModal.row.licencia,
                                    tone: "brand",
                                },
                            ]}
                        />
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <InfoField
                                label="Empresa de transporte"
                                value={detailModal.row.carrier.nombre}
                            />
                            <InfoField
                                label="Nombre completo"
                                value={detailModal.row.driver.nombre}
                            />
                            <InfoField
                                label="Teléfono"
                                value={detailModal.row.driver.telefono}
                            />
                            <InfoField
                                label="Correo electrónico"
                                value={detailModal.row.driver.correo}
                            />
                            <InfoField
                                label="RUC Transportista"
                                value={detailModal.row.carrier.ruc}
                            />
                        </div>
                    </div>
                )}
            </AppModal>
        </div>
    );
}
