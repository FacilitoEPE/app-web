import { useNavigate } from 'react-router-dom';
import { usesV1 } from '@/shared/api/data-contract';
import { useMemo, useState } from "react";
import {
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
import RowActions from "@/shared/components/RowActions";
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
import { formatDisplayDate, formatMoney } from "@/shared/utils/format";
import { paginate } from "@/shared/utils/paginate";
import type { Carrier } from "@/modules/carriers/carriers.data";
import {
    assignQuotationUnit,
    registerQuotationResponse,
    type CarrierQuotationStatus,
    type CarrierRequirementQuotation,
} from "@/modules/carriers/carrierQuotations.store";
import type { CarrierQuotationGroup } from "@/modules/carriers/carrierQuotations.utils";

interface CarriersQuotationsSubViewProps {
    carriers: Carrier[];
    groups: CarrierQuotationGroup[];
}

const currencySymbol = (moneda?: "PEN" | "USD") => (moneda === "USD" ? "US$" : "S/");

export default function CarriersQuotationsSubView({ carriers, groups }: CarriersQuotationsSubViewProps) {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [viewMode, setViewMode] = useState<TableViewMode>("table");
    const [page, setPage] = useState(1);

    const [detailRequestId, setDetailRequestId] = useState<number | null>(null);
    const detailGroup = groups.find(({ request }) => request.requestId === detailRequestId);
    const detailRequest = detailGroup?.request;

    const [responseModal, setResponseModal] = useState<{
        open: boolean;
        item: CarrierRequirementQuotation | null;
        estado: CarrierQuotationStatus;
        monto: string;
        moneda: "PEN" | "USD";
        archivo: FileSource | null;
        observaciones: string;
    }>({
        open: false,
        item: null,
        estado: "Recibida",
        monto: "",
        moneda: "PEN",
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
        return groups.filter(({ request, recipients }) => {
            if (statusFilter !== "all" && !recipients.some((recipient) => recipient.estado === statusFilter)) return false;
            const searchFields = [request.codigo, request.campaniaNombre, request.descripcion, ...recipients.map((recipient) => recipient.transportistaNombre)];
            return !q || searchFields.some((field) => field.toLowerCase().includes(q));
        });
    }, [groups, search, statusFilter]);

    const { pageCount, currentPage, visible } = paginate(filteredRows, page);

    const openResponseModalFor = (item: CarrierRequirementQuotation) => {
        setResponseModal({
            open: true,
            item,
            estado: "Recibida",
            monto: item.montoCotizadoPen != null ? String(item.montoCotizadoPen) : "",
            moneda: item.moneda ?? "PEN",
            archivo: item.documentoCotizacion,
            observaciones: item.observaciones,
        });
    };

    const openAssignModalFor = (item: CarrierRequirementQuotation) => {
        if (usesV1()) {
            navigate(`/campaigns/${item.campaniaId}/deliveries`);
            return;
        }
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

    const requestDetailAction = (requestId: number) => (
        <RowActions primary={[{
            label: "Ver detalle",
            icon: <Eye size={18} strokeWidth={2.4} />,
            onClick: () => setDetailRequestId(requestId),
        }]} />
    );

    const getExportData = (): TableExport => ({
        filename: "requerimientos_cotizaciones_transporte",
        title: "Requerimientos y Cotizaciones de Transporte",
        header: [
            "Código",
            "Campaña",
            "Cantidad estimada",
            "Fecha límite",
            "Transportistas invitados",
            "Cotizaciones recibidas",
        ],
        rows: filteredRows.map(({ request, recipients, receivedCount }) => [
            request.codigo,
            request.campaniaNombre,
            request.cantidadEstimada || "—",
            formatDisplayDate(request.fechaLimiteCotizacion),
            String(recipients.length),
            String(receivedCount),
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
                            <SelectValue>{statusFilter === "all" ? "Todos los estados" : statusFilter === "Recibida" ? "Con cotizaciones recibidas" : "Con respuestas pendientes"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="En espera">Con respuestas pendientes</SelectItem>
                            <SelectItem value="Recibida">Con cotizaciones recibidas</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </FilterBar>

            <TableCard
                icon={<FileSpreadsheet size={24} strokeWidth={2.2} />}
                title="Requerimientos y cotizaciones"
                description="Cada fila reúne una solicitud de flete. Abre el detalle para consultar sus destinatarios y cotizaciones."
                headerRight={
                    <TableToolbar>
                        <TableCountPill
                            icon={<FileSpreadsheet size={16} strokeWidth={2.5} className="text-brand" />}
                            count={filteredRows.length}
                            singular="solicitud"
                            plural="solicitudes"
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
                <div className={viewMode === "grid"
                    ? "grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3"
                    : "flex flex-col gap-3 sm:hidden"}
                >
                    {visible.map(({ request, recipients, receivedCount }) => (
                        <TableGridCard
                            key={request.requestId}
                            accentColor={receivedCount > 0 ? "border-l-brand" : "border-l-status-warning"}
                            icon={<FileSpreadsheet size={18} />}
                            title={request.codigo}
                            subtitle={request.campaniaNombre}
                            actions={requestDetailAction(request.requestId)}
                        >
                            <TableGridCardFields>
                                <TableGridCardField label="Transportistas invitados" value={recipients.length} />
                                <TableGridCardField label="Cotizaciones recibidas" value={receivedCount} />
                                <TableGridCardField label="Cantidad estimada" value={request.cantidadEstimada || "—"} />
                                <TableGridCardField label="Fecha límite" value={formatDisplayDate(request.fechaLimiteCotizacion)} />
                            </TableGridCardFields>
                        </TableGridCard>
                    ))}
                </div>
                {viewMode === "table" && (
                    <div className="hidden sm:block">
                        <Table>
                            <TableHeader>
                                <TableRow className={TABLE_HEAD_BG}>
                                    <TableHead className="py-3.5 pl-6">Solicitud</TableHead>
                                    <TableHead>Campaña</TableHead>
                                    <TableHead>Cantidad estimada</TableHead>
                                    <TableHead>Fecha límite</TableHead>
                                    <TableHead>Transportistas invitados</TableHead>
                                    <TableHead>Cotizaciones recibidas</TableHead>
                                    <TableHead className="pr-6 text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-border/60">
                                {visible.map(({ request, recipients, receivedCount }) => (
                                    <TableRow key={request.requestId}>
                                        <TableCell className="relative py-3.5 pl-6">
                                            <TableRowAccent color={receivedCount > 0 ? "bg-brand" : "bg-status-warning"} />
                                            <TableRowLead
                                                icon={<FileSpreadsheet size={18} />}
                                                title={request.codigo}
                                                subtitle={request.descripcion}
                                            />
                                        </TableCell>
                                        <TableCell>{request.campaniaNombre}</TableCell>
                                        <TableCell>{request.cantidadEstimada || "—"}</TableCell>
                                        <TableCell>{formatDisplayDate(request.fechaLimiteCotizacion)}</TableCell>
                                        <TableCell className="tabular-nums">{recipients.length}</TableCell>
                                        <TableCell className="tabular-nums">{receivedCount}</TableCell>
                                        <TableCell className="pr-6">{requestDetailAction(request.requestId)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </TableCard>

            <AppModal
                open={Boolean(detailGroup) && !responseModal.open && !assignModal.open}
                onOpenChange={(open) => { if (!open) setDetailRequestId(null); }}
                icon={<FileSpreadsheet size={22} />}
                title={detailRequest ? "Detalle de solicitud · " + detailRequest.codigo : "Detalle de solicitud"}
                description={detailRequest?.campaniaNombre}
                size="xl"
                footer={
                    <>
                        <Button variant="outline" size="xl" onClick={() => setDetailRequestId(null)}>
                            <X size={18} /> Cerrar
                        </Button>
                        {detailRequest && usesV1() && (
                            <Button variant="outline" size="xl" onClick={() => openAssignModalFor(detailRequest)}>
                                <UserCheck size={18} /> Coordinar entregas
                            </Button>
                        )}
                    </>
                }
            >
                {detailGroup && detailRequest && (
                    <div className="flex flex-col gap-6">
                        <SummaryBar items={[
                            { label: "Transportistas invitados", value: detailGroup.recipients.length },
                            { label: "Cotizaciones recibidas", value: detailGroup.receivedCount, tone: "brand" },
                            { label: "Cantidad estimada", value: detailRequest.cantidadEstimada || "—" },
                        ]} />

                        <ModalSection title="Información de la solicitud">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <InfoField label="Campaña y fruta" value={detailRequest.campaniaNombre + " · " + detailRequest.fruta} />
                                <InfoField label="Fecha límite de cotización" value={formatDisplayDate(detailRequest.fechaLimiteCotizacion)} />
                                <InfoField label="Lugar de recojo" value={detailRequest.lugarRecojo} />
                                <InfoField label="Destino de entrega" value={detailRequest.destino} />
                                <InfoField label="Ventana de recojo" value={detailRequest.fechaRecojo || "—"} multiline />
                            </div>
                            <InfoField label="Descripción del servicio" value={detailRequest.descripcion || "—"} multiline />
                            <FileDropzone
                                label="Documento de la solicitud"
                                file={detailRequest.documentoRequerimiento}
                                onChange={() => {}}
                                readOnly
                                variant="horizontal"
                            />
                        </ModalSection>

                        <ModalSection title="Transportistas destinatarios">
                            <ul className="space-y-3">
                                {detailGroup.recipients.map((recipient) => (
                                    <li key={recipient.id} className="space-y-3 rounded-xl border border-border p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-ink">{recipient.transportistaNombre}</p>
                                                {recipient.transportistaRuc && (
                                                    <p className="text-xs text-ink-muted">{recipient.transportistaRuc}</p>
                                                )}
                                            </div>
                                            <StatusBadge status={recipient.estado} />
                                        </div>
                                        {recipient.montoCotizadoPen != null && (
                                            <InfoField
                                                label="Tarifa cotizada"
                                                value={currencySymbol(recipient.moneda) + " " + formatMoney(recipient.montoCotizadoPen)}
                                                variant="plain"
                                            />
                                        )}
                                        {recipient.observaciones && (
                                            <InfoField label="Observaciones de la cotización" value={recipient.observaciones} multiline />
                                        )}
                                        {recipient.documentoCotizacion && (
                                            <FileDropzone
                                                label="Cotización adjunta"
                                                file={recipient.documentoCotizacion}
                                                onChange={() => {}}
                                                readOnly
                                                variant="horizontal"
                                            />
                                        )}
                                        {!usesV1() && recipient.vehiculoAsignadoPlaca && (
                                            <InfoField
                                                label="Camión y chofer"
                                                value={recipient.vehiculoAsignadoPlaca + " · " + recipient.choferAsignadoNombre}
                                            />
                                        )}
                                        <div className="flex flex-wrap gap-2">
                                            <Button variant="outline" size="sm" onClick={() => openResponseModalFor(recipient)}>
                                                <FileCheck2 size={16} />
                                                {recipient.estado === "Recibida" ? "Editar cotización" : "Registrar cotización"}
                                            </Button>
                                            {!usesV1() && (
                                                <Button variant="outline" size="sm" onClick={() => openAssignModalFor(recipient)}>
                                                    <UserCheck size={16} /> Asignar camión y chofer
                                                </Button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
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
                                    moneda: responseModal.moneda,
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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

                        <FormField label="Moneda" required>
                            <Select
                                value={responseModal.moneda}
                                onValueChange={(v) =>
                                    setResponseModal((current) => ({
                                        ...current,
                                        moneda: (v === "USD" ? "USD" : "PEN"),
                                    }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PEN">PEN · Soles (S/)</SelectItem>
                                    <SelectItem value="USD">USD · Dólares (US$)</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormField>

                        <InputField
                            id="quot-tarifa"
                            label={`Tarifa cotizada por viaje (${currencySymbol(responseModal.moneda)})`}
                            type="number"
                            required
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
