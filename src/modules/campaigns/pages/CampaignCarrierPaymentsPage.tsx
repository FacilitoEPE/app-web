import { plural } from "@/shared/utils/plural";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Wallet, Clock, TrendingUp, CheckCircle2, Banknote, Eye, Truck, ListFilter } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import PageHeader from "@/shared/layout/PageHeader";
import SegmentedTabs, { type SegmentedTabItem } from "@/shared/components/SegmentedTabs";
import FilterBar, { FilterDateField, FilterSearch } from "@/shared/components/FilterBar";
import StatusBadge from "@/shared/components/StatusBadge";
import RowActions from "@/shared/components/RowActions";
import TableCard from "@/shared/components/TableCard";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import TableGridCard, { TableGridCardFields, TableGridCardField } from "@/shared/components/TableGridCard";
import { TableToolbar, TableCountPill, TableExportMenu, TableViewToggle, type TableViewMode } from "@/shared/components/TableToolbar";
import { ContextBannerPlaceholder } from "@/shared/components/ContextBanner";
import CampaignContextBanner from "@/modules/campaigns/components/CampaignContextBanner";
import { useCampaign } from "@/modules/campaigns/useCampaign";
import CampaignRegisterPaymentModal from "@/modules/campaigns/components/CampaignRegisterPaymentModal";
import CampaignAttachReceiptModal from "@/modules/campaigns/components/CampaignAttachReceiptModal";
import CampaignCompleteAdvanceModal from "@/modules/campaigns/components/CampaignCompleteAdvanceModal";
import CampaignPaymentDetailsModal from "@/modules/campaigns/components/CampaignPaymentDetailsModal";
import CampaignSuccessModal from "@/modules/campaigns/components/CampaignSuccessModal";
import { carrierPayments, type CarrierPayment } from "@/modules/campaigns/carrierPayments.data";
import {
    completeAdvancePayment,
    confirmPendingPayment,
    createPayment,
    isWithinDateRange,
    type PaymentDraft,
} from "@/modules/campaigns/carrierPayments.utils";
import type { TableExport } from "@/shared/utils/exportTable";
import { paginate } from "@/shared/utils/paginate";

/** Estados del pago, en el orden en que se muestran en el selector */
const PAYMENT_STATUS_TABS: SegmentedTabItem[] = [
    { id: "Pendiente", label: "Pendiente", icon: Clock, tone: "neutral" },
    { id: "Adelanto", label: "Adelanto", icon: TrendingUp, tone: "neutral" },
    { id: "Realizados", label: "Realizados", icon: CheckCircle2, tone: "brand" },
];

/** Cuántos pagos hay en cada estado, para el contador de cada opción del selector */
function getStatusTabsWithCount(payments: CarrierPayment[]): SegmentedTabItem[] {
    return PAYMENT_STATUS_TABS.map((tab) => ({
        ...tab,
        count: payments.filter((payment) => payment.estado === tab.id).length,
    }));
}

/** Pago sobre el que está abierto un modal; se conserva al cerrar para no vaciar el modal durante su animación de salida */
type PaymentModal = { open: boolean; payment: CarrierPayment | null };
const CLOSED: PaymentModal = { open: false, payment: null };

/** Acento lateral de la tarjeta móvil, con los mismos tonos que el StatusBadge */
const STATUS_ACCENTS: Record<string, string> = {
    Pendiente: "border-l-status-highlight",
    Adelanto: "border-l-status-warning",
    Realizados: "border-l-brand",
};

/** Cómo se lee cada estado en las píldoras del banner, según la cantidad */
const STATUS_STAT_LABEL: Record<string, { one: string; other: string }> = {
    Pendiente: { one: "pendiente", other: "pendientes" },
    Adelanto: { one: "adelanto", other: "adelantos" },
    Realizados: { one: "realizado", other: "realizados" },
};

/** Mismo acento que STATUS_ACCENTS, como color de fondo para la barra de la tabla desktop */
const STATUS_ACCENT_BG: Record<string, string> = {
    Pendiente: "bg-status-highlight",
    Adelanto: "bg-status-warning",
    Realizados: "bg-brand",
};

export default function CampaignCarrierPaymentsPage() {
    const { id } = useParams<{ id: string }>();
    const campaign = useCampaign(Number(id));
    const [status, setStatus] = useState("Pendiente");
    const [search, setSearch] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<TableViewMode>("table");

    // TODO(api): los pagos se manejan en memoria (se pierden al recargar) hasta que exista el servicio de pagos
    const [payments, setPayments] = useState<CarrierPayment[]>(carrierPayments);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [attaching, setAttaching] = useState<PaymentModal>(CLOSED);
    const [completing, setCompleting] = useState<PaymentModal>(CLOSED);
    const [viewing, setViewing] = useState<PaymentModal>(CLOSED);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [successMode, setSuccessMode] = useState<"payment" | "receipt" | "advance">("payment");

    const hasActiveFilters = search !== "" || startDate !== "" || endDate !== "";
    const clearFilters = () => {
        setSearch("");
        setStartDate("");
        setEndDate("");
    };

    const filteredPayments = useMemo(() => {
        return payments.filter((payment) => {
            const matchesStatus = payment.estado === status;
            const matchesSearch = payment.transportista.toLowerCase().includes(search.trim().toLowerCase());
            return matchesStatus && matchesSearch && isWithinDateRange(payment.fecha, startDate, endDate);
        });
    }, [payments, search, startDate, endDate, status]);

    const statusTabs = useMemo(() => getStatusTabsWithCount(payments), [payments]);

    const showSuccess = (mode: "payment" | "receipt" | "advance") => {
        setSuccessMode(mode);
        setIsSuccessModalOpen(true);
    };

    const updatePayment = (id: number, change: (payment: CarrierPayment) => CarrierPayment) =>
        setPayments((current) => current.map((payment) => (payment.id === id ? change(payment) : payment)));

    const handleRegisterPayment = (draft: PaymentDraft) => {
        const nextId = payments.reduce((max, payment) => Math.max(max, payment.id), 0) + 1;
        const created = createPayment(draft, nextId);
        setPayments((current) => [created, ...current]);
        // Se muestra el pago recién registrado en su estado, para que el usuario lo vea aparecer
        setStatus(created.estado);
        setPage(1);
        setIsRegisterModalOpen(false);
        showSuccess("payment");
    };

    const handleAttachReceipt = (receipt: File) => {
        const target = attaching.payment;
        if (!target) return;
        updatePayment(target.id, (payment) => confirmPendingPayment(payment, receipt.name));
        setAttaching((current) => ({ ...current, open: false }));
        showSuccess("receipt");
    };

    const handleCompleteAdvance = (receipt: File) => {
        const target = completing.payment;
        if (!target) return;
        updatePayment(target.id, (payment) => completeAdvancePayment(payment, receipt.name));
        setCompleting((current) => ({ ...current, open: false }));
        showSuccess("advance");
    };

    /** Lo que exporta la tabla: las filas visibles con los filtros aplicados */
    const getExportData = (): TableExport => ({
        filename: "pagos_transportista",
        title: "Pagos a transportistas",
        header: ["Transportista", "Cantidad", "Boleta", "Estado"],
        rows: filteredPayments.map((payment) => [payment.transportista, payment.cantidad, payment.boleta ?? "Sin adjuntar", payment.estado]),
    });

    const { pageCount, currentPage, visible: visibleData } = paginate(filteredPayments, page);

    const getRowActions = (payment: CarrierPayment) => ({
        primary: [
            { label: "Ver detalles", icon: <Eye size={18} strokeWidth={2.5} />, onClick: () => setViewing({ open: true, payment }) },
            // El billete solo aparece mientras queda algo por registrar: confirmar el pendiente o cerrar el adelanto.
            // En Realizados ya no hay nada que hacer, así que solo se queda "Ver detalles".
            ...(payment.estado === "Pendiente"
                ? [{ label: "Registrar pago", icon: <Banknote size={18} strokeWidth={2.5} />, onClick: () => setAttaching({ open: true, payment }) }]
                : []),
            ...(payment.estado === "Adelanto"
                ? [{ label: "Registrar pago", icon: <Banknote size={18} strokeWidth={2.5} />, onClick: () => setCompleting({ open: true, payment }) }]
                : []),
        ],
    });

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            {campaign === undefined ? <ContextBannerPlaceholder /> : campaign && (
                <CampaignContextBanner
                    campaign={campaign}
                    caption="Transporte · pagos a transportistas"
                    stats={statusTabs.map((tab) => ({ label: plural(tab.count ?? 0, STATUS_STAT_LABEL[tab.id].one, STATUS_STAT_LABEL[tab.id].other), value: String(tab.count ?? 0) }))}
                />
            )}

            <PageHeader
                icon={<Wallet size={24} strokeWidth={2.5} />}
                title="Registro de pago al transportista"
                description="Controla los pagos pendientes, adelantos y pagos realizados a tus transportistas."
                action={
                    <Button size="xl" onClick={() => setIsRegisterModalOpen(true)}>
                        <Banknote size={20} strokeWidth={2.5} /> Registrar pago
                    </Button>
                }
            />

            <SegmentedTabs tabs={statusTabs} value={status} onChange={setStatus} className="mt-4 mb-6" />

            <FilterBar onClear={clearFilters} canClear={hasActiveFilters} className="mb-8">
                <FilterSearch value={search} onChange={setSearch} placeholder="Buscar transportista..." />
                <FilterDateField label="Fecha inicio" value={startDate} onChange={setStartDate} />
                <FilterDateField label="Fecha fin" value={endDate} onChange={setEndDate} />
            </FilterBar>

            <TableCard
                icon={<Wallet size={24} strokeWidth={2.5} />}
                title="Pagos a Transportistas"
                description="Gestiona y da seguimiento a los pagos de esta campaña."
                headerRight={
                    <TableToolbar>
                        <TableCountPill icon={<Wallet size={16} strokeWidth={2.5} className="text-brand" />} count={filteredPayments.length} singular="pago" plural="pagos" />
                        <TableExportMenu getData={getExportData} />
                        <TableViewToggle value={viewMode} onChange={setViewMode} />
                    </TableToolbar>
                }
                isEmpty={visibleData.length === 0}
                emptyTitle={hasActiveFilters ? "Sin resultados" : "Sin pagos en este estado"}
                emptyDescription={
                    hasActiveFilters
                        ? "Ningún pago coincide con los filtros aplicados. Prueba ajustándolos."
                        : "Cuando registres un pago en este estado aparecerá acá."
                }
                emptyAction={
                    hasActiveFilters
                        ? { label: "Limpiar filtros", icon: <ListFilter size={18} />, onClick: clearFilters, tone: "secondary" }
                        : undefined
                }
                page={currentPage}
                pageCount={pageCount}
                onPageChange={setPage}
            >
                {/* Móvil siempre en tarjetas; en desktop, tarjetas en grilla solo si se elige esa vista */}
                <div className={`flex flex-col gap-3 ${viewMode === "grid" ? "sm:grid sm:grid-cols-2 lg:grid-cols-3" : "sm:hidden"}`}>
                    {visibleData.map((payment) => (
                        <TableGridCard
                            key={payment.id}
                            accentColor={STATUS_ACCENTS[payment.estado] ?? "border-l-status-neutral"}
                            icon={<Truck size={18} strokeWidth={2} />}
                            title={payment.transportista}
                            badge={<StatusBadge status={payment.estado} />}
                            actions={<RowActions {...getRowActions(payment)} />}
                        >
                            <TableGridCardFields>
                                <TableGridCardField label="Cantidad" value={`S/ ${payment.cantidad.toLocaleString("es-PE")}`} />
                                <TableGridCardField label="Boleta" value={payment.boleta ?? "Sin adjuntar"} />
                            </TableGridCardFields>
                        </TableGridCard>
                    ))}
                </div>

                {viewMode === "table" && (
                <div className="hidden sm:block rounded-xl overflow-hidden border border-border">
                    <Table>
                        <TableHeader className={TABLE_HEAD_BG}>
                            <TableRow className="border-b border-border hover:bg-transparent">
                                <TableHead className="text-ink font-semibold h-14 px-6">Transportista</TableHead>
                                <TableHead className="text-ink font-semibold h-14">Cantidad</TableHead>
                                <TableHead className="text-ink font-semibold h-14">Boleta</TableHead>
                                <TableHead className="text-ink font-semibold h-14 text-center px-6 w-40">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleData.map((payment) => (
                                <TableRow key={payment.id} className="border-b border-border hover:bg-surface-page/60 transition-colors">
                                    <TableCell className="h-20 px-6 relative">
                                        <TableRowAccent color={STATUS_ACCENT_BG[payment.estado] ?? "bg-status-neutral"} />
                                        <TableRowLead icon={<Truck size={20} strokeWidth={2} />} title={payment.transportista} />
                                    </TableCell>
                                    <TableCell className="text-ink-body font-medium">S/ {payment.cantidad.toLocaleString("es-PE")}</TableCell>
                                    <TableCell className="text-ink-body font-medium">{payment.boleta ?? "Sin adjuntar"}</TableCell>
                                    <TableCell className="px-6">
                                        <RowActions {...getRowActions(payment)} className="justify-center" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                )}
            </TableCard>

            <CampaignRegisterPaymentModal
                open={isRegisterModalOpen}
                onOpenChange={setIsRegisterModalOpen}
                onSave={handleRegisterPayment}
            />

            <CampaignAttachReceiptModal
                open={attaching.open}
                onOpenChange={(open) => setAttaching((current) => ({ ...current, open }))}
                payment={attaching.payment}
                onSave={handleAttachReceipt}
            />

            <CampaignCompleteAdvanceModal
                open={completing.open}
                onOpenChange={(open) => setCompleting((current) => ({ ...current, open }))}
                payment={completing.payment}
                onSave={handleCompleteAdvance}
            />

            <CampaignPaymentDetailsModal
                open={viewing.open}
                onOpenChange={(open) => setViewing((current) => ({ ...current, open }))}
                payment={viewing.payment}
            />

            <CampaignSuccessModal
                open={isSuccessModalOpen}
                onOpenChange={setIsSuccessModalOpen}
                mode={successMode}
            />
        </div>
    );
}
