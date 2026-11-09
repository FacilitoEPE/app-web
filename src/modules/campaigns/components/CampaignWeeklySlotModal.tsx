import { useNavigate } from "react-router-dom";
import { CalendarRange, CheckCircle2, Clock, ExternalLink, PackageCheck, Truck, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import { InfoField, SummaryBar } from "@/shared/components/InfoField";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { formatDisplayDate, formatKg } from "@/shared/utils/format";

export interface WeeklySlotDeliveryItem {
    id: string;
    loadId?: string;
    deliveryId?: number;
    fecha: string;
    variedad: string;
    cliente: string;
    canal: "Exportador" | "Industria";
    contratoRef: string;
    destino: string;
    kilosVariedad: number;
    kilosTotalesEntrega: number;
    coordinada: boolean;
    transportista: string;
    placa: string;
    observaciones: string;
}

interface CampaignWeeklySlotModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    campaniaId: number;
    contextLabel: string;
    dayLabel: string;
    dateIso: string;
    items: WeeklySlotDeliveryItem[];
}

export default function CampaignWeeklySlotModal({
    open,
    onOpenChange,
    campaniaId,
    contextLabel,
    dayLabel,
    dateIso,
    items,
}: CampaignWeeklySlotModalProps) {
    const navigate = useNavigate();

    const totalKilosVariedad = items.reduce((sum, item) => sum + item.kilosVariedad, 0);
    const deliveries = new Map(items.map(item => [item.deliveryId ?? item.id, item]));
    const totalKilosGeneral = [...deliveries.values()].reduce((sum, item) => sum + item.kilosTotalesEntrega, 0);
    const coordinadasCount = [...deliveries.values()].filter(item => item.coordinada).length;

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<CalendarRange size={22} strokeWidth={2.2} />}
            title={`Entregas del programa semanal · ${contextLabel}`}
            description={`${dayLabel} (${formatDisplayDate(dateIso)}) · ${deliveries.size} ${deliveries.size === 1 ? "entrega programada" : "entregas programadas"}`}
            size="lg"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} strokeWidth={2.5} /> Cerrar
                    </Button>
                    <Button
                        size="xl"
                        onClick={() => {
                            onOpenChange(false);
                            navigate(`/campaigns/${campaniaId}/deliveries`);
                        }}
                    >
                        <ExternalLink size={18} strokeWidth={2.5} /> Ir a entregas de la campaña
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <SummaryBar
                    items={[
                        {
                            label: "Kilos seleccionados",
                            value: `${formatKg(totalKilosVariedad)} kg`,
                            tone: "brand",
                        },
                        {
                            label: "Kilos totales de las entregas",
                            value: `${formatKg(totalKilosGeneral)} kg`,
                        },
                        {
                            label: "Coordinación logística",
                            value: `${coordinadasCount} de ${deliveries.size} completas`,
                            tone: coordinadasCount === deliveries.size ? "brand" : "highlight",
                        },
                    ]}
                />

                <div className="flex flex-col gap-3">
                    {items.map((item) => (
                        <Card key={item.id} className="border-border/90 py-0 shadow-xs">
                            <CardContent className="flex flex-col gap-3.5 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-surface text-brand">
                                            <PackageCheck size={18} strokeWidth={2.3} />
                                        </span>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="text-[14.5px] font-bold text-ink">{item.cliente}</h4>
                                                <StatusBadge status={item.canal} />
                                            </div>
                                            <p className="text-[12.5px] font-medium text-ink-muted">
                                                Contrato: <strong className="text-ink">{item.contratoRef}</strong>
                                            </p>
                                        </div>
                                    </div>
                                    <StatusBadge status={item.coordinada ? "Completa" : "Por completar"} />
                                </div>

                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                                    <InfoField
                                        label={`Cantidad (${item.variedad})`}
                                        value={`${formatKg(item.kilosVariedad)} kg`}
                                    />
                                    <InfoField
                                        label="Total de la entrega"
                                        value={`${formatKg(item.kilosTotalesEntrega)} kg`}
                                    />
                                    <InfoField
                                        label="Destino programado"
                                        value={item.destino}
                                    />
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/25 px-3.5 py-2.5 text-[12.5px]">
                                    <span className="inline-flex items-center gap-1.5 font-medium text-ink-muted">
                                        <Truck size={14} className="text-brand" />
                                        Transporte:{" "}
                                        <strong className="text-ink">
                                            {item.coordinada ? `${item.transportista} · ${item.placa}` : "Sin unidad asignada"}
                                        </strong>
                                    </span>
                                    <span className="inline-flex items-center gap-1 font-semibold text-ink-muted">
                                        {item.coordinada ? (
                                            <>
                                                <CheckCircle2 size={14} className="text-brand" /> Coordinada
                                            </>
                                        ) : (
                                            <>
                                                <Clock size={14} className="text-status-warning" /> Pendiente de coordinar
                                            </>
                                        )}
                                    </span>
                                </div>

                                {item.observaciones && (
                                    <p className="text-[12.5px] text-ink-muted">
                                        <strong className="font-semibold text-ink">Observaciones:</strong> {item.observaciones}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </AppModal>
    );
}
