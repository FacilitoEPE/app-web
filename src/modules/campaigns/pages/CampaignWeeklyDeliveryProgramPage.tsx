import { harvestedWeeklyItems } from "@/modules/campaigns/weeklyHarvest.utils";
import { useQualityDeliveryLoads } from "@/modules/quality/qualityOperations.store";
import { PageError } from '@/shared/components/PageState';
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    AlertTriangle,
    Calendar,
    CalendarRange,
    Layers,
    PackageCheck,
    Sprout,
    Truck,
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
import { getFrutaDerivadas } from "@/modules/campaigns/api/campaign.api";
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

    const qualityLoads = useQualityDeliveryLoads();

    const [dataError, setDataError] = useState(false);
    const [retry, setRetry] = useState(0);
    const [varietiesFromApi, setVarietiesFromApi] = useState<string[]>([]);
    const [selectedWeekId, setSelectedWeekId] = useState<string>("");
    const [selectedVariety, setSelectedVariety] = useState<string>("all");
    const [slotModal, setSlotModal] = useState<{
        open: boolean;
        variedad: string;
        dayLabel: string;
        dateIso: string;
        items: WeeklySlotDeliveryItem[];
    }>({
        open: false,
        variedad: "",
        dayLabel: "",
        dateIso: "",
        items: [],
    });

    useEffect(() => {
        if (!campaign?.frutaId) return;
        let active = true;
        void getFrutaDerivadas(campaign.frutaId)
            .then((items) => {
                if (active) setVarietiesFromApi(items.map((item) => item.name));
            })
            .catch(() => {
                if (active) setDataError(true);
            });
        return () => {
            active = false;
        };
    }, [campaign?.frutaId, retry]);

    const weeklyItems = useMemo(() => harvestedWeeklyItems(qualityLoads, campaniaId), [qualityLoads, campaniaId]);

    const varieties = useMemo(() => [...new Set([...varietiesFromApi, ...weeklyItems.map(item => item.variedad)])], [varietiesFromApi, weeklyItems]);

    const weeks = useMemo<WeekDefinition[]>(() => {
        const mondaySet = new Set<string>();
        for (const item of weeklyItems) {
            mondaySet.add(getMondayIso(item.fecha));
        }
        const sortedMondays = [...mondaySet].sort();
        if (sortedMondays.length === 0) {
            sortedMondays.push(getMondayIso(campaign?.fechaInicio ? `${campaign.fechaInicio.getFullYear()}-${String(campaign.fechaInicio.getMonth()+1).padStart(2,"0")}-${String(campaign.fechaInicio.getDate()).padStart(2,"0")}` : new Date().toISOString().slice(0,10)));
        }
        return sortedMondays.map((mondayIso, idx) => buildWeekDefinition(mondayIso, idx));
    }, [weeklyItems, campaign]);

    const activeWeek = useMemo(
        () => weeks.find((w) => w.id === selectedWeekId) ?? weeks[0],
        [weeks, selectedWeekId],
    );

    const weekItems = useMemo(() => {
        const dayIsoSet = new Set(activeWeek.days.map((d) => d.iso));
        return weeklyItems.filter(
            (item) =>
                dayIsoSet.has(item.fecha) &&
                (selectedVariety === "all" || item.variedad === selectedVariety),
        );
    }, [weeklyItems, activeWeek, selectedVariety]);

    const visibleVarieties = useMemo(() => {
        const all = Array.from(new Set([...varieties, ...weeklyItems.map((i) => i.variedad)]));
        if (selectedVariety !== "all") return all.filter((v) => v === selectedVariety);
        return all;
    }, [varieties, weeklyItems, selectedVariety]);

    const multiVarietyCount = useMemo(
        () => weekItems.filter((item) => item.kilosVariedad < item.kilosTotalesEntrega).length,
        [weekItems],
    );

    const totalWeekKilos = useMemo(
        () => weekItems.reduce((sum, item) => sum + item.kilosVariedad, 0),
        [weekItems],
    );

    const activeDaysCount = useMemo(
        () => new Set(weekItems.map((item) => item.fecha)).size,
        [weekItems],
    );

    const metrics: Metric[] = [
        {
            title: "Cargas en la semana",
            value: String(new Set(weekItems.map(i => i.loadId)).size),
            unit: new Set(weekItems.map(i => i.loadId)).size === 1 ? "carga" : "cargas",
            description: activeWeek.label,
            icon: PackageCheck,
        },
        {
            title: "Volumen semanal cargado",
            value: formatKg(totalWeekKilos),
            unit: "kg",
            description: "Suma de variedades en la semana seleccionada",
            icon: Sprout,
        },
        {
            title: "Variedades en despacho",
            value: String(new Set(weekItems.map((i) => i.variedad)).size),
            unit: new Set(weekItems.map((i) => i.variedad)).size === 1 ? "variedad" : "variedades",
            description: `De ${varieties.length} ${varieties.length === 1 ? "variedad registrada" : "variedades registradas"} en campaña`,
            icon: Layers,
        },
        {
            title: "Días con actividad",
            value: `${activeDaysCount} de 7`,
            unit: "días",
            description: "Según las fechas reales de carga",
            icon: Calendar,
            warm: weekItems.some((i) => !i.coordinada),
        },
    ];

    const getCellItems = (variedad: string, dateIso: string) =>
        weekItems.filter((item) => item.variedad === variedad && item.fecha === dateIso);

    const getExportData = (): TableExport => ({
        filename: `programa_semanal_campana_${campaniaId}_${activeWeek.mondayIso}`,
        title: `Programa Semanal de Entregas · ${activeWeek.label}`,
        header: [
            "Variedad",
            ...activeWeek.days.map((d) => `${d.dayName} (${d.shortDate})`),
            "Total semanal (kg)",
        ],
        rows: visibleVarieties.map((variedad) => {
            const dayValues = activeWeek.days.map((d) => {
                const items = getCellItems(variedad, d.iso);
                const kg = items.reduce((s, i) => s + i.kilosVariedad, 0);
                return kg > 0 ? `${kg} kg (${items.length})` : "—";
            });
            const rowTotal = activeWeek.days.reduce((sum, d) => {
                const items = getCellItems(variedad, d.iso);
                return sum + items.reduce((s, i) => s + i.kilosVariedad, 0);
            }, 0);
            return [variedad, ...dayValues, String(rowTotal)];
        }),
    });

    const hasActiveFilters = selectedVariety !== "all" || (selectedWeekId !== "" && selectedWeekId !== weeks[0]?.id);

    if (dataError) return <PageError title="No se pudo cargar el programa semanal" message="Verifica la conexión e inténtalo nuevamente." onRetry={()=>{setDataError(false);setRetry(n=>n+1)}} />;

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            {campaign ? (
                <CampaignContextBanner
                    campaign={campaign}
                    caption="Cargas reales por día y variedad"
                    stats={[
                        { label: "cargas en semana", value: String(weekItems.length) },
                        { label: "cargados", value: `${formatKg(totalWeekKilos)} kg` },
                    ]}
                />
            ) : (
                <ContextBannerPlaceholder />
            )}

            <PageHeader
                icon={<CalendarRange size={24} strokeWidth={2.5} />}
                title="Programa semanal de entregas"
                description="Kilos realmente cargados por fecha de carga y variedad. Abre el total de cada día para consultar sus clientes."
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

            {multiVarietyCount > 0 && (
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-status-warning/40 bg-status-warning-bg/25 px-4 py-3 text-[13px] text-ink">
                    <span className="inline-flex items-center gap-2 font-medium">
                        <AlertTriangle size={17} className="shrink-0 text-status-warning" />
                        <span>
                            Esta semana incluye{" "}
                            <strong className="font-bold">{multiVarietyCount} registros compartidos</strong> en entregas
                            con más de una variedad. Haz clic en cualquier celda para ver el desglose por variedad vs.
                            el total del camión.
                        </span>
                    </span>
                </div>
            )}

            <FilterBar
                canClear={hasActiveFilters}
                onClear={() => {
                    setSelectedWeekId(weeks[0]?.id ?? "");
                    setSelectedVariety("all");
                }}
            >
                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="w-full sm:w-72">
                        <Select value={activeWeek.id} onValueChange={(v) => setSelectedWeekId(v ?? "")}>
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

                    <div className="w-full sm:w-64">
                        <Select value={selectedVariety} onValueChange={(v) => setSelectedVariety(v ?? "all")}>
                            <SelectTrigger aria-label="Filtrar por variedad">
                                <SelectValue>{selectedVariety === "all" ? "Todas las variedades" : selectedVariety}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las variedades</SelectItem>
                                {varieties.map((v) => (
                                    <SelectItem key={v} value={v}>
                                        Variedad {v}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </FilterBar>

            <TableCard
                icon={<CalendarRange size={24} strokeWidth={2.2} />}
                title={`Matriz semanal · ${activeWeek.label}`}
                description="Abre una celda por variedad o el total diario para consultar los clientes y kilos realmente cargados."
                headerRight={
                    <TableToolbar>
                        <TableCountPill
                            icon={<Sprout size={16} strokeWidth={2.5} className="text-brand" />}
                            count={visibleVarieties.length}
                            singular="variedad"
                            plural="variedades"
                        />
                        <TableExportMenu getData={getExportData} />
                    </TableToolbar>
                }
                isEmpty={visibleVarieties.length === 0}
                emptyTitle="No hay variedades para mostrar"
                emptyDescription="Limpia los filtros para visualizar la matriz semanal."
                page={1}
                pageCount={1}
                onPageChange={() => {}}
            >
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className={`${TABLE_HEAD_BG} hover:bg-brand-surface`}>
                                <TableHead className="min-w-44 py-3.5 pl-6 pr-3 font-bold text-ink">Variedad</TableHead>
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
                            {visibleVarieties.map((variedad) => {
                                const rowTotal = activeWeek.days.reduce((sum, day) => {
                                    const cellItems = getCellItems(variedad, day.iso);
                                    return sum + cellItems.reduce((s, i) => s + i.kilosVariedad, 0);
                                }, 0);
                                const rowCount = activeWeek.days.reduce((sum, day) => {
                                    return sum + getCellItems(variedad, day.iso).length;
                                }, 0);

                                return (
                                    <TableRow key={variedad} className="transition-colors hover:bg-muted/30">
                                        <TableCell className="relative py-3.5 pl-6 pr-3">
                                            <TableRowAccent color={rowTotal > 0 ? "bg-brand" : "bg-status-neutral"} />
                                            <TableRowLead
                                                icon={<Sprout size={18} strokeWidth={2.2} />}
                                                title={variedad}
                                                subtitle={
                                                    rowCount > 0
                                                        ? `${rowCount} ${rowCount === 1 ? "carga" : "cargas"}`
                                                        : "Sin cargas esta semana"
                                                }
                                            />
                                        </TableCell>

                                        {activeWeek.days.map((day) => {
                                            const cellItems = getCellItems(variedad, day.iso);
                                            const cellKilos = cellItems.reduce((s, i) => s + i.kilosVariedad, 0);
                                            const hasPending = cellItems.some((i) => !i.coordinada);

                                            return (
                                                <TableCell key={day.iso} className="p-2 text-center align-middle">
                                                    {cellItems.length > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSlotModal({
                                                                    open: true,
                                                                    variedad,
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
                                                                {cellItems.length}{" "}
                                                                {cellItems.length === 1 ? "carga" : "cargas"}
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
                                    const dayTotal = visibleVarieties.reduce((sum, variedad) => {
                                        const items = getCellItems(variedad, day.iso);
                                        return sum + items.reduce((s, i) => s + i.kilosVariedad, 0);
                                    }, 0);
                                    return (
                                        <TableCell
                                            key={day.iso}
                                            className="px-2.5 py-3.5 text-center text-[13px] font-extrabold tabular-nums text-ink"
                                        >
                                            {dayTotal > 0 ? <button type="button" className="cursor-pointer text-brand underline underline-offset-4" aria-label={"Ver clientes del " + day.shortDate} onClick={() => setSlotModal({ open: true, variedad: "Todas las variedades", dayLabel: day.dayName, dateIso: day.iso, items: weekItems.filter(item => item.fecha === day.iso) })}>{formatKg(dayTotal)} kg</button> : "—"}
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
                variedad={slotModal.variedad}
                dayLabel={slotModal.dayLabel}
                dateIso={slotModal.dateIso}
                items={slotModal.items}
            />
        </div>
    );
}
