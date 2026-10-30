import { useNavigate } from 'react-router-dom';
import { usesV1 } from '@/shared/api/data-contract';
import { useMemo, useState } from "react";
import {
    Building2,
    CheckCircle2,
    Eye,
    FileCheck2,
    FileSpreadsheet,
    Save,
    Truck,
    UserCheck,
    X,
} from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import FileDropzone from "@/shared/components/FileDropzone";
import FilterBar, { FilterSearch } from "@/shared/components/FilterBar";
import FormField from "@/shared/components/FormField";
import { InfoField, SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
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
import { Textarea } from "@/shared/components/ui/textarea";
import type { TableExport } from "@/shared/utils/exportTable";
import type { FileSource } from "@/shared/utils/fileSource";
import { formatDisplayDate, formatKg, formatMoney } from "@/shared/utils/format";
import { paginate } from "@/shared/utils/paginate";
import type { Carrier } from "@/modules/carriers/carriers.data";
import {
    assignQuotationUnit,
    registerQuotationResponse,
    useCarrierQuotations,
    type CarrierQuotationStatus,
    type CarrierRequirementQuotation,
} from "@/modules/carriers/carrierQuotations.store";

interface CarriersQuotationsSubViewProps {
    carriers: Carrier[];
}

export default function CarriersQuotationsSubView({ carriers }: CarriersQuotationsSubViewProps) {
    const navigate=useNavigate();
    const quotations = useCarrierQuotations();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [viewMode, setViewMode] = useState<TableViewMode>("table");
    const [page, setPage] = useState(1);

    const [detailModal, setDetailModal] = useState<{
        open: boolean;
        item: CarrierRequirementQuotation | null;
    }>({ open: false, item: null });

    const [responseModal, setResponseModal] = useState<{
        open: boolean;
        item: CarrierRequirementQuotation | null;
        estado: CarrierQuotationStatus;
        monto: string;
        archivo: FileSource | null;
        observaciones: string;
    }>({
        open: false,
        item: null,
        estado: "Recibida",
        monto: "",
        archivo: null,
        observaciones: "",
    });

    const [assignModal, setAssignModal] = useState<{
        open: boolean;
        item: CarrierRequirementQuotation | null;
        placa: string;
        chofer: string;
        licencia: string;
    }>({
        open: false,
        item: null,
        placa: "",
        chofer: "",
        licencia: "",
    });

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return quotations.filter((item) => {
            if (statusFilter !== "all" && item.estado !== statusFilter) return false;
            if (q) {
                const hay = `${item.codigo} ${item.transportistaNombre} ${item.campaniaNombre} ${item.descripcion}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [quotations, search, statusFilter]);

    const { pageCount, currentPage, visible } = paginate(filteredRows, page);

    const openResponseModalFor = (item: CarrierRequirementQuotation) => {
        setResponseModal({
            open: true,
            item,
            estado: "Recibida",
            monto: item.montoCotizadoPen != null ? String(item.montoCotizadoPen) : "",
            archivo: item.documentoCotizacion,
            observaciones: item.observaciones,
        });
    };

    const openAssignModalFor = (item: CarrierRequirementQuotation) => {
        if(usesV1()){navigate(`/campaigns/${item.campaniaId}/deliveries`);return;}
        const carrierObj = carriers.find((c) => c.id === item.carrierId) ?? carriers[0];
        const defaultPlate = item.vehiculoAsignadoPlaca || carrierObj?.vehiculos[0]?.placa || "B8T-914";
        const defaultDriver = item.choferAsignadoNombre || carrierObj?.choferes[0]?.nombre || "Carlos Alberto Mendoza Ríos";
        setAssignModal({
            open: true,
            item,
            placa: defaultPlate,
            chofer: defaultDriver,
            licencia: item.choferAsignadoLicencia || "Q43892104",
        });
    };

    const getRowActions = (item: CarrierRequirementQuotation): { primary: RowAction[]; secondary: RowAction[] } => ({
        primary: [
            {
                label: "Ver detalle",
                icon: <Eye size={18} strokeWidth={2.4} />,
                onClick: () => setDetailModal({ open: true, item }),
            },
            {
                label: "Registrar cotización",
                icon: <FileCheck2 size={18} strokeWidth={2.4} />,
                onClick: () => openResponseModalFor(item),
            },
        ],
        secondary: [
            {
                label: usesV1() ? "Coordinar entregas" : "Asignar camión y chofer",
                icon: <UserCheck size={16} strokeWidth={2.4} />,
                onClick: () => openAssignModalFor(item),
            },
        ],
    });

    const getExportData = (): TableExport => ({
        filename: "requerimientos_cotizaciones_transporte",
        title: "Requerimientos y Cotizaciones de Transporte",
        header: [
            "Código",
            "Transportista",
            "Campaña",
            "Cantidad est. (kg)",
            "Fecha límite",
            "Cotización (S/)",
            "Unidad / Chofer",
            "Estado",
        ],
        rows: filteredRows.map((r) => [
            r.codigo,
            r.transportistaNombre,
            r.campaniaNombre,
            String(r.cantidadEstimadaKg),
            formatDisplayDate(r.fechaLimiteCotizacion),
            r.montoCotizadoPen != null ? String(r.montoCotizadoPen) : "En espera",
            r.vehiculoAsignadoPlaca ? `${r.vehiculoAsignadoPlaca} · ${r.choferAsignadoNombre}` : "Sin asignar",
            r.estado,
        ]),
    });

    const hasActiveFilters = search !== "" || statusFilter !== "all";

    return (
        <div className="flex flex-col gap-6">
            <FilterBar
                canClear={hasActiveFilters}
                onClear={() => {
                    setSearch("");
                    setStatusFilter("all");
                }}
            >
                <FilterSearch
                    value={search}
                    onChange={setSearch}
                    placeholder="Buscar por código, transportista, campaña o descripción..."
                />
                <div className="w-full sm:w-60">
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
                        <SelectTrigger aria-label="Filtrar por estado de cotización">
                            <SelectValue>{statusFilter === "all" ? "Todos los estados" : statusFilter}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="En espera">En espera</SelectItem>
                            <SelectItem value="Recibida">Recibida</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </FilterBar>

            <TableCard
                icon={<FileSpreadsheet size={24} strokeWidth={2.2} />}
                title="Requerimientos y cotizaciones"
                description="Solicitudes de flete enviadas a transportistas, respuestas de cotización y asignación de unidades."
                headerRight={
                    <TableToolbar>
                        <TableCountPill
                            icon={<FileSpreadsheet size={16} strokeWidth={2.5} className="text-brand" />}
                            count={filteredRows.length}
                            singular="requerimiento"
                            plural="requerimientos"
                        />
                        <TableExportMenu getData={getExportData} />
                        <TableViewToggle value={viewMode} onChange={setViewMode} />
                    </TableToolbar>
                }
                isEmpty={filteredRows.length === 0}
                emptyTitle="No se encontraron requerimientos"
                emptyDescription="Prueba ajustando los filtros de búsqueda o estado."
                page={currentPage}
                pageCount={pageCount}
                onPageChange={setPage}
            >
                {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
                        {visible.map((item) => {
                            const actions = getRowActions(item);
                            return (
                                <TableGridCard
                                    key={item.id}
                                    accentColor={
                                        item.estado === "Recibida" ? "border-l-brand" : "border-l-status-warning"
                                    }
                                    icon={<FileSpreadsheet size={18} strokeWidth={2.2} />}
                                    title={item.transportistaNombre}
                                    subtitle={`${item.codigo} · ${item.campaniaNombre}`}
                                    badge={<StatusBadge status={item.estado} />}
                                    actions={<RowActions primary={actions.primary} secondary={actions.secondary} />}
                                >
                                    <TableGridCardFields>
                                        <TableGridCardField
                                            label="Cantidad estimada"
                                            value={`${formatKg(item.cantidadEstimadaKg)} kg`}
                                        />
                                        <TableGridCardField
                                            label="Fecha límite"
                                            value={formatDisplayDate(item.fechaLimiteCotizacion)}
                                        />
                                        <TableGridCardField
                                            label="Cotización"
                                            value={
                                                item.montoCotizadoPen != null
                                                    ? `S/ ${formatMoney(item.montoCotizadoPen)}`
                                                    : "Pendiente"
                                            }
                                        />
                                        <TableGridCardField
                                            label="Camión / Chofer"
                                            value={
                                                item.vehiculoAsignadoPlaca
                                                    ? `${item.vehiculoAsignadoPlaca} · ${item.choferAsignadoNombre}`
                                                    : "Sin asignar"
                                            }
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
                                <TableHead className="py-3.5 pl-6 pr-3 font-bold text-ink">Transportista</TableHead>
                                <TableHead className="px-3 py-3.5 font-bold text-ink">Campaña</TableHead>
                                <TableHead className="px-3 py-3.5 font-bold text-ink">Descripción</TableHead>
                                <TableHead className="px-3 py-3.5 text-right font-bold text-ink">
                                    Cantidad est.
                                </TableHead>
                                <TableHead className="px-3 py-3.5 font-bold text-ink">Fecha límite</TableHead>
                                <TableHead className="px-3 py-3.5 font-bold text-ink">Cotización</TableHead>
                                <TableHead className="px-3 py-3.5 text-center font-bold text-ink">Estado</TableHead>
                                <TableHead className="py-3.5 pl-3 pr-6 text-right font-bold text-ink">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border/60">
                            {visible.map((item) => {
                                const actions = getRowActions(item);
                                return (
                                    <TableRow key={item.id} className="transition-colors hover:bg-muted/30">
                                        <TableCell className="relative py-3.5 pl-6 pr-3">
                                            <TableRowAccent
                                                color={item.estado === "Recibida" ? "bg-brand" : "bg-status-warning"}
                                            />
                                            <TableRowLead
                                                icon={<Building2 size={18} strokeWidth={2.2} />}
                                                title={item.transportistaNombre}
                                                subtitle={item.codigo}
                                            />
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5">
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-bold text-ink">
                                                    {item.campaniaNombre}
                                                </span>
                                                <span className="text-[11.5px] text-ink-muted">{item.fruta}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-64 px-3 py-3.5">
                                            <p className="line-clamp-2 text-[12.5px] text-ink-muted">
                                                {item.descripcion}
                                            </p>
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-right font-bold tabular-nums text-ink">
                                            {formatKg(item.cantidadEstimadaKg)} kg
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-[13px] font-medium text-ink">
                                            {formatDisplayDate(item.fechaLimiteCotizacion)}
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5">
                                            {item.montoCotizadoPen != null ? (
                                                <div className="flex flex-col">
                                                    <span className="text-[13.5px] font-extrabold text-brand">
                                                        S/ {formatMoney(item.montoCotizadoPen)}
                                                    </span>
                                                    <span className="text-[11px] text-ink-muted">
                                                        {item.vehiculoAsignadoPlaca
                                                            ? `Unidad: ${item.vehiculoAsignadoPlaca}`
                                                            : "Sin unidad asignada"}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[12.5px] text-ink-muted">Sin respuesta</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-center">
                                            <StatusBadge status={item.estado} />
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

            {/* Modal 1: Detalle completo de requerimiento y cotización */}
            <AppModal
                open={detailModal.open}
                onOpenChange={(open) => setDetailModal((current) => ({ ...current, open }))}
                icon={<FileSpreadsheet size={22} />}
                title={`Detalle de requerimiento · ${detailModal.item?.codigo ?? ""}`}
                description={detailModal.item?.transportistaNombre}
                size="xl"
                footer={
                    <>
                        <Button
                            variant="outline"
                            size="xl"
                            onClick={() => setDetailModal({ open: false, item: null })}
                        >
                            <X size={18} /> Cerrar
                        </Button>
                        {detailModal.item && (
                            <>
                                <Button
                                    variant="outline"
                                    size="xl"
                                    onClick={() => {
                                        const current = detailModal.item!;
                                        setDetailModal({ open: false, item: null });
                                        openAssignModalFor(current);
                                    }}
                                >
                                    <UserCheck size={18} /> Asignar camión y chofer
                                </Button>
                                <Button
                                    size="xl"
                                    onClick={() => {
                                        const current = detailModal.item!;
                                        setDetailModal({ open: false, item: null });
                                        openResponseModalFor(current);
                                    }}
                                >
                                    <FileCheck2 size={18} /> Registrar respuesta de cotización
                                </Button>
                            </>
                        )}
                    </>
                }
            >
                {detailModal.item && (
                    <div className="flex flex-col gap-6">
                        <SummaryBar
                            items={[
                                {
                                    label: "Estado de solicitud",
                                    value: detailModal.item.estado,
                                    tone: detailModal.item.estado === "Recibida" ? "brand" : "highlight",
                                },
                                {
                                    label: "Cantidad estimada",
                                    value: `${formatKg(detailModal.item.cantidadEstimadaKg)} kg`,
                                },
                                {
                                    label: "Tarifa cotizada",
                                    value:
                                        detailModal.item.montoCotizadoPen != null
                                            ? `S/ ${formatMoney(detailModal.item.montoCotizadoPen)}`
                                            : "En espera",
                                    tone: "brand",
                                },
                                {
                                    label: "Camión y chofer",
                                    value: detailModal.item.vehiculoAsignadoPlaca
                                        ? `${detailModal.item.vehiculoAsignadoPlaca} · ${detailModal.item.choferAsignadoNombre}`
                                        : "Por asignar",
                                },
                            ]}
                        />

                        <ModalSection title="Información del requerimiento logístico">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <InfoField
                                    label="Transportista destinatario"
                                    value={`${detailModal.item.transportistaNombre} (RUC ${detailModal.item.transportistaRuc})`}
                                />
                                <InfoField
                                    label="Campaña y fruta"
                                    value={`${detailModal.item.campaniaNombre} · ${detailModal.item.fruta}`}
                                />
                                <InfoField
                                    label="Lugar de recojo (Origen)"
                                    value={detailModal.item.lugarRecojo}
                                />
                                <InfoField
                                    label="Destino de entrega"
                                    value={detailModal.item.destino}
                                />
                                <InfoField
                                    label="Fecha programada de recojo"
                                    value={formatDisplayDate(detailModal.item.fechaRecojo)}
                                />
                                <InfoField
                                    label="Fecha límite de cotización"
                                    value={formatDisplayDate(detailModal.item.fechaLimiteCotizacion)}
                                />
                            </div>
                            <InfoField
                                label="Descripción del servicio solicitado"
                                value={detailModal.item.descripcion}
                            />
                            <InfoField
                                label="Observaciones e instrucciones"
                                value={detailModal.item.observaciones || "Sin observaciones"}
                            />
                        </ModalSection>

                        <ModalSection title="Documentos de requerimiento y cotización recibida">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <FileDropzone
                                    label="Documento del requerimiento enviado"
                                    file={detailModal.item.documentoRequerimiento}
                                    onChange={() => {}}
                                    readOnly
                                />
                                <FileDropzone
                                    label="Cotización adjunta del transportista"
                                    file={detailModal.item.documentoCotizacion}
                                    onChange={() => {}}
                                    readOnly
                                />
                            </div>
                        </ModalSection>
                    </div>
                )}
            </AppModal>

            {/* Modal 2: Registrar respuesta de cotización */}
            <AppModal
                open={responseModal.open}
                onOpenChange={(open) => setResponseModal((current) => ({ ...current, open }))}
                icon={<FileCheck2 size={22} />}
                title="Registrar respuesta de cotización"
                description={`${responseModal.item?.codigo ?? ""} · ${responseModal.item?.transportistaNombre ?? ""}`}
                size="lg"
                footer={
                    <>
                        <Button
                            variant="outline"
                            size="xl"
                            onClick={() => setResponseModal((current) => ({ ...current, open: false }))}
                        >
                            <X size={18} /> Cancelar
                        </Button>
                        <Button
                            size="xl"
                            onClick={async () => {
                                if (!responseModal.item) return;
                                await registerQuotationResponse(responseModal.item.id, {
                                    estado: responseModal.estado,
                                    montoCotizadoPen:
                                        responseModal.estado === "Recibida"
                                            ? Number(responseModal.monto) || 0
                                            : null,
                                    documentoCotizacion: responseModal.archivo,
                                    observaciones: responseModal.observaciones,
                                });
                                setResponseModal((current) => ({ ...current, open: false }));
                            }}
                        >
                            <Save size={18} /> Guardar cotización
                        </Button>
                    </>
                }
            >
                <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField label="Estado de la cotización" required>
                            <Select
                                value={responseModal.estado}
                                onValueChange={(v) =>
                                    setResponseModal((current) => ({
                                        ...current,
                                        estado: (v ?? "Recibida") as CarrierQuotationStatus,
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="En espera">En espera</SelectItem>
                                    <SelectItem value="Recibida">Recibida</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormField>

                        <InputField
                            id="quot-tarifa"
                            label="Tarifa cotizada por viaje (S/)"
                            type="number"
                            value={responseModal.monto}
                            onChange={(v) => setResponseModal((current) => ({ ...current, monto: v }))}
                        />
                    </div>

                    <FileDropzone
                        label="Archivo PDF o imagen de la cotización recibida"
                        file={responseModal.archivo}
                        onChange={(file) => setResponseModal((current) => ({ ...current, archivo: file }))}
                    />

                    <FormField label="Observaciones de la propuesta comercial">
                        <Textarea
                            value={responseModal.observaciones}
                            onChange={(e) =>
                                setResponseModal((current) => ({
                                    ...current,
                                    observaciones: e.target.value,
                                }))
                            }
                            placeholder="Condiciones de pago, vigencia de tarifa o notas adicionales..."
                        />
                    </FormField>
                </div>
            </AppModal>

            {/* Modal 3: Asignar camión y chofer */}
            <AppModal
                open={assignModal.open}
                onOpenChange={(open) => setAssignModal((current) => ({ ...current, open }))}
                icon={<Truck size={22} />}
                title="Asignar camión y chofer al requerimiento"
                description={`${assignModal.item?.codigo ?? ""} · ${assignModal.item?.transportistaNombre ?? ""}`}
                size="md"
                footer={
                    <>
                        <Button
                            variant="outline"
                            size="xl"
                            onClick={() => setAssignModal((current) => ({ ...current, open: false }))}
                        >
                            <X size={18} /> Cancelar
                        </Button>
                        <Button
                            size="xl"
                            onClick={async () => {
                                if (!assignModal.item) return;
                                await assignQuotationUnit(assignModal.item.id, {
                                    vehiculoAsignadoPlaca: assignModal.placa,
                                    choferAsignadoNombre: assignModal.chofer,
                                    choferAsignadoLicencia: assignModal.licencia,
                                });
                                setAssignModal((current) => ({ ...current, open: false }));
                            }}
                        >
                            <CheckCircle2 size={18} /> Confirmar asignación
                        </Button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <InputField
                        id="quot-placa"
                        label="Camión asignado (Placa)"
                        required
                        value={assignModal.placa}
                        onChange={(v) => setAssignModal((current) => ({ ...current, placa: v.toUpperCase() }))}
                        placeholder="Ej. B8T-914"
                    />
                    <InputField
                        id="quot-chofer"
                        label="Chofer responsable"
                        required
                        value={assignModal.chofer}
                        onChange={(v) => setAssignModal((current) => ({ ...current, chofer: v }))}
                        placeholder="Nombre completo del conductor"
                    />
                    <InputField
                        id="quot-licencia"
                        label="Licencia de conducir MTC"
                        required
                        value={assignModal.licencia}
                        onChange={(v) => setAssignModal((current) => ({ ...current, licencia: v.toUpperCase() }))}
                        placeholder="Ej. Q43892104"
                    />
                </div>
            </AppModal>
        </div>
    );
}
