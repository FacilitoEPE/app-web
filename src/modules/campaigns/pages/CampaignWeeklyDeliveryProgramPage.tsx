import { weeklyCampaignItems } from "@/modules/campaigns/api/weekly-screen-data";
import { getOperationsRevision, subscribeOperationsContext } from "@/modules/operations/api/operations-context.api";
import { useState, useSyncExternalStore } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    Calendar,
    CalendarRange,
    Layers,
    PackageCheck,
    Sprout,
    Truck,
    Users,
} from "lucide-react";
import { ContextBannerPlaceholder } from "@/shared/components/ContextBanner";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import FilterBar from "@/shared/components/FilterBar";
import MetricCards, { type Metric } from "@/shared/components/MetricCards";
import TableCard from "@/shared/components/TableCard";
import { TableCountPill, TableExportMenu, TableToolbar } from "@/shared/components/TableToolbar";
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
import PageHeader from "@/shared/layout/PageHeader";
import type { TableExport } from "@/shared/utils/exportTable";
import { formatKg } from "@/shared/utils/format";
import CampaignContextBanner from "@/modules/campaigns/components/CampaignContextBanner";
import CampaignWeeklySlotModal, {
    type WeeklySlotDeliveryItem,
} from "@/modules/campaigns/components/CampaignWeeklySlotModal";
import { useCampaign } from "@/modules/campaigns/useCampaign";

interface WeekDefinition {
    id: string;
    label: string;
    mondayIso: string;
    days: {
        dayName: string;
        shortDate: string;
        iso: string;
    }[];
}

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

function addDaysIso(mondayIso: string, offset: number): { iso: string; shortDate: string } {
    const [y, m, d] = mondayIso.split("-").map(Number);
    const dt = new Date(y, m - 1, d + offset);
    const pad = (v: number) => String(v).padStart(2, "0");
    return {
        iso: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
        shortDate: `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}`,
    };
}

function getMondayIso(dateIso: string): string {
    const [y, m, d] = dateIso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const day = dt.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    dt.setDate(dt.getDate() + diff);
    const pad = (v: number) => String(v).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function buildWeekDefinition(mondayIso: string, index: number): WeekDefinition {
    const days = DAY_NAMES.map((dayName, idx) => {
        const { iso, shortDate } = addDaysIso(mondayIso, idx);
        return { dayName, shortDate, iso };
    });
    return {
        id: mondayIso,
        label: `Semana ${index + 1} · ${days[0].shortDate} al ${days[6].shortDate}`,
        mondayIso,
        days,
    };
}

export default function CampaignWeeklyDeliveryProgramPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const campaniaId = Number(id);
    const campaign = useCampaign(campaniaId);

    useSyncExternalStore(subscribeOperationsContext, getOperationsRevision);
    const [selectedWeekId, setSelectedWeekId] = useState("");
    const [selectedDate, setSelectedDate] = useState("all");
    const [selectedVariety, setSelectedVariety] = useState("all");
    const [selectedPlate, setSelectedPlate] = useState("all");
    const [slotModal, setSlotModal] = useState<{
        open: boolean;
        contextLabel: string;
        dayLabel: string;
        dateIso: string;
        items: WeeklySlotDeliveryItem[];
    }>({
        open: false,
        contextLabel: "",
        dayLabel: "",
        dateIso: "",
        items: [],
    });

    const weeklyItems = weeklyCampaignItems(campaniaId);
    const varieties = [...new Set(weeklyItems.map(item => item.variedad))].sort();
    const plates = [...new Set(weeklyItems.map(item => item.placa).filter(plate => plate !== "—"))].sort();

    const mondays = [...new Set(weeklyItems.map(item => getMondayIso(item.fecha)))].sort();
    if (!mondays.length) {
        const start = campaign?.fechaInicio ?? new Date();
        const date = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
        mondays.push(getMondayIso(date));
    }
    const weeks = mondays.map(buildWeekDefinition);
    const activeWeek = weeks.find(week => week.id === selectedWeekId) ?? weeks[0];
    const dates = new Set(activeWeek.days.map(day => day.iso));
    const weekItems = weeklyItems.filter(item =>
        dates.has(item.fecha) &&
        (selectedDate === "all" || item.fecha === selectedDate) &&
        (selectedVariety === "all" || item.variedad === selectedVariety) &&
        (selectedPlate === "all" || item.placa === selectedPlate),
    );

    const clients = [...new Map(weekItems.map(item => [item.clienteId, item.cliente])).entries()]
        .sort(([, a], [, b]) => a.localeCompare(b));
    const deliveryCount = new Set(weekItems.map(item => item.deliveryId)).size;

    const totalWeekKilos = weekItems.reduce((sum, item) => sum + item.kilosVariedad, 0);
    const activeDaysCount = new Set(weekItems.map(item => item.fecha)).size;

    const metrics: Metric[] = [
        {
            title: "Entregas en la semana",
            value: String(deliveryCount),
            unit: deliveryCount === 1 ? "entrega" : "entregas",
            description: activeWeek.label,
            icon: PackageCheck,
        },
        {
            title: "Volumen semanal programado",
            value: formatKg(totalWeekKilos),
            unit: "kg",
            description: "Suma de variedades en la semana seleccionada",
            icon: Sprout,
        },
        {
            title: "Variedades programadas",
            value: String(new Set(weekItems.map((i) => i.variedad)).size),
            unit: new Set(weekItems.map((i) => i.variedad)).size === 1 ? "variedad" : "variedades",
            description: `De ${varieties.length} ${varieties.length === 1 ? "variedad registrada" : "variedades registradas"} en campaña`,
            icon: Layers,
        },
        {
            title: "Días con actividad",
            value: `${activeDaysCount} de 7`,
            unit: "días",
            description: "Según las fechas programadas",
            icon: Calendar,
            warm: weekItems.some((i) => !i.coordinada),
        },
    ];

    const getCellItems = (clienteId: number, dateIso: string) =>
        weekItems.filter((item) => item.clienteId === clienteId && item.fecha === dateIso);

    const getExportData = (): TableExport => ({
        filename: `programa_semanal_campana_${campaniaId}_${activeWeek.mondayIso}`,
        title: `Programa Semanal de Entregas · ${activeWeek.label}`,
        header: [
            "Cliente",
            ...activeWeek.days.map((d) => `${d.dayName} (${d.shortDate})`),
            "Total semanal (kg)",
        ],
        rows: clients.map(([clienteId, cliente]) => {
            const dayValues = activeWeek.days.map((d) => {
                const items = getCellItems(clienteId, d.iso);
                const kg = items.reduce((s, i) => s + i.kilosVariedad, 0);
                return items.length ? `${kg} kg` : "—";
            });
            const rowTotal = activeWeek.days.reduce((sum, d) => {
                const items = getCellItems(clienteId, d.iso);
                return sum + items.reduce((s, i) => s + i.kilosVariedad, 0);
            }, 0);
            return [cliente, ...dayValues, String(rowTotal)];
        }),
    });

    const hasActiveFilters = selectedDate !== "all" || selectedVariety !== "all" || selectedPlate !== "all" || activeWeek.id !== weeks[0].id;

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            {campaign ? (
                <CampaignContextBanner
                    campaign={campaign}
                    caption="Entregas programadas por cliente y día"
                    stats={[
                        { label: "entregas en semana", value: String(deliveryCount) },
                        { label: "programados", value: `${formatKg(totalWeekKilos)} kg` },
                    ]}
                />
            ) : (
                <ContextBannerPlaceholder />
            )}

            <PageHeader
                icon={<CalendarRange size={24} strokeWidth={2.5} />}
                title="Programa semanal de entregas"
                description="Consulta los kilos programados por cliente y fecha."
                action={
                    <Button
                        variant="outline"
                        size="xl"
                        onClick={() => navigate(`/campaigns/${campaniaId}/deliveries`)}
                    >
                        <Truck size={18} strokeWidth={2.5} /> Gestionar entregas
                    </Button>
                }
            />

            <div className="mb-6">
                <MetricCards label="Indicadores del programa semanal" metrics={metrics} />
            </div>

            <FilterBar
                canClear={hasActiveFilters}
                onClear={() => {
                    setSelectedWeekId(weeks[0]?.id ?? "");
                    setSelectedDate("all");
                    setSelectedVariety("all");
                    setSelectedPlate("all");
                }}
            >
                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="w-full sm:w-72">
                        <Select value={activeWeek.id} onValueChange={(v) => { setSelectedWeekId(v ?? ""); setSelectedDate("all"); }}>
                            <SelectTrigger aria-label="Semana del programa">
                                <SelectValue>{activeWeek.label}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {weeks.map((wk) => (
                                    <SelectItem key={wk.id} value={wk.id}>
                                        {wk.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-full sm:w-48">
                        <Select value={selectedDate} onValueChange={(v) => setSelectedDate(v ?? "all")}>
                            <SelectTrigger aria-label="Filtrar por fecha">
                                <SelectValue>{selectedDate === "all" ? "Todas las fechas" : activeWeek.days.find(day => day.iso === selectedDate)?.shortDate}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las fechas</SelectItem>
                                {activeWeek.days.map(day => (
                                    <SelectItem key={day.iso} value={day.iso}>{day.dayName} {day.shortDate}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-full sm:w-64">
                        <Select value={selectedVariety} onValueChange={(v) => setSelectedVariety(v ?? "all")}>
                            <SelectTrigger aria-label="Filtrar por variedad">
                                <SelectValue>{selectedVariety === "all" ? "Todas las variedades" : selectedVariety}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las variedades</SelectItem>
                                {varieties.map((v) => (
                                    <SelectItem key={v} value={v}>
                                        {v}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-full sm:w-48">
                        <Select value={selectedPlate} onValueChange={(v) => setSelectedPlate(v ?? "all")}>
                            <SelectTrigger aria-label="Filtrar por placa"><SelectValue>{selectedPlate === "all" ? "Todas las placas" : selectedPlate}</SelectValue></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las placas</SelectItem>
                                {plates.map(plate => <SelectItem key={plate} value={plate}>{plate}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </FilterBar>

            <TableCard
                icon={<CalendarRange size={24} strokeWidth={2.2} />}
                title={`Matriz semanal · ${activeWeek.label}`}
                description="Abre una celda o el total diario para ver las variedades, cantidades y vehículos asignados."
                headerRight={
                    <TableToolbar>
                        <TableCountPill
                            icon={<Users size={16} strokeWidth={2.5} className="text-brand" />}
                            count={clients.length}
                            singular="cliente"
                            plural="clientes"
                        />
                        <TableExportMenu getData={getExportData} />
                    </TableToolbar>
                }
                isEmpty={clients.length === 0}
                emptyTitle="No hay entregas programadas para mostrar"
                emptyDescription="Limpia los filtros para visualizar la matriz semanal."
                page={1}
                pageCount={1}
                onPageChange={() => {}}
            >
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className={`${TABLE_HEAD_BG} hover:bg-brand-surface`}>
                                <TableHead className="min-w-44 py-3.5 pl-6 pr-3 font-bold text-ink">Cliente</TableHead>
                                {activeWeek.days.map((day) => (
                                    <TableHead key={day.iso} className="min-w-32 px-2.5 py-3 text-center font-bold text-ink">
                                        <div className="flex flex-col items-center leading-tight">
                                            <span>{day.dayName}</span>
                                            <span className="mt-0.5 text-[11px] font-semibold text-ink-muted">
                                                {day.shortDate}
                                            </span>
                                        </div>
                                    </TableHead>
                                ))}
                                <TableHead className="min-w-36 py-3.5 pl-3 pr-6 text-right font-bold text-ink">
                                    Total semanal
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border/60">
                            {clients.map(([clienteId, cliente]) => {
                                const rowItems = weekItems.filter(item => item.clienteId === clienteId);
                                const rowTotal = rowItems.reduce((sum, item) => sum + item.kilosVariedad, 0);
                                const rowCount = new Set(rowItems.map(item => item.deliveryId)).size;

                                return (
                                    <TableRow key={clienteId} className="transition-colors hover:bg-muted/30">
                                        <TableCell className="relative py-3.5 pl-6 pr-3">
                                            <TableRowAccent color={rowTotal > 0 ? "bg-brand" : "bg-status-neutral"} />
                                            <TableRowLead
                                                icon={<Users size={18} strokeWidth={2.2} />}
                                                title={cliente}
                                                subtitle={`${rowCount} ${rowCount === 1 ? "entrega" : "entregas"}`}
                                            />
                                        </TableCell>

                                        {activeWeek.days.map((day) => {
                                            const cellItems = getCellItems(clienteId, day.iso);
                                            const cellKilos = cellItems.reduce((s, i) => s + i.kilosVariedad, 0);
                                            const cellCount = new Set(cellItems.map(item => item.deliveryId)).size;
                                            const hasPending = cellItems.some((i) => !i.coordinada);

                                            return (
                                                <TableCell key={day.iso} className="p-2 text-center align-middle">
                                                    {cellItems.length > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSlotModal({
                                                                    open: true,
                                                                    contextLabel: cliente,
                                                                    dayLabel: day.dayName,
                                                                    dateIso: day.iso,
                                                                    items: cellItems,
                                                                })
                                                            }
                                                            className="group inline-flex w-full flex-col items-center justify-center rounded-xl border border-brand-border/80 bg-brand-surface/55 px-2.5 py-2 text-center transition-all hover:border-brand hover:bg-brand-surface hover:shadow-xs cursor-pointer"
                                                        >
                                                            <span className="text-[13px] font-extrabold tabular-nums text-brand">
                                                                {formatKg(cellKilos)} kg
                                                            </span>
                                                            <span className="mt-0.5 text-[11px] font-semibold text-ink-muted group-hover:text-ink">
                                                                {cellCount} {cellCount === 1 ? "entrega" : "entregas"}
                                                                {hasPending ? " · ⚠" : ""}
                                                            </span>
                                                        </button>
                                                    ) : (
                                                        <span className="text-[12.5px] font-medium text-ink-muted/50">
                                                            —
                                                        </span>
                                                    )}
                                                </TableCell>
                                            );
                                        })}

                                        <TableCell className="py-3.5 pl-3 pr-6 text-right">
                                            <span className="text-[14px] font-extrabold tabular-nums text-ink">
                                                {formatKg(rowTotal)} kg
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            {/* Fila de Total diario al pie */}
                            <TableRow className="bg-brand-surface/35 font-bold hover:bg-brand-surface/45">
                                <TableCell className="py-3.5 pl-6 pr-3 text-[13.5px] font-extrabold text-ink">
                                    Total diario
                                </TableCell>
                                {activeWeek.days.map((day) => {
                                    const dayItems = weekItems.filter(item => item.fecha === day.iso);
                                    const dayTotal = dayItems.reduce((sum, item) => sum + item.kilosVariedad, 0);
                                    return (
                                        <TableCell
                                            key={day.iso}
                                            className="px-2.5 py-3.5 text-center text-[13px] font-extrabold tabular-nums text-ink"
                                        >
                                            {dayItems.length > 0 ? <button type="button" className="cursor-pointer text-brand underline underline-offset-4" aria-label={"Ver clientes del " + day.shortDate} onClick={() => setSlotModal({ open: true, contextLabel: "Total diario", dayLabel: day.dayName, dateIso: day.iso, items: dayItems })}>{formatKg(dayTotal)} kg</button> : "—"}
                                        </TableCell>
                                    );
                                })}
                                <TableCell className="py-3.5 pl-3 pr-6 text-right text-[14.5px] font-extrabold tabular-nums text-brand">
                                    {formatKg(totalWeekKilos)} kg
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </TableCard>

            <CampaignWeeklySlotModal
                open={slotModal.open}
                onOpenChange={(open) => setSlotModal((current) => ({ ...current, open }))}
                campaniaId={campaniaId}
                contextLabel={slotModal.contextLabel}
                dayLabel={slotModal.dayLabel}
                dateIso={slotModal.dateIso}
                items={slotModal.items}
            />
        </div>
    );
}
