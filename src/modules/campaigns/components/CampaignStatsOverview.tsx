import { useMemo } from "react";
import StatCard from "@/modules/campaigns/components/StatCard";
import { CalendarDays, FileCheck, ClipboardList, CalendarClock } from "lucide-react";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";
import { getCampaignMonthlySeries, getCampaignTrend, type StatTrend } from "@/modules/campaigns/campaignStats.utils";

interface StatDefinition {
    title: string;
    icon: React.ReactNode;
    matches: (campaign: Campana) => boolean;
    /** Fecha que ubica a la campaña en un mes: las completadas cuentan cuando terminan, el resto cuando empiezan */
    referenceDate: (campaign: Campana) => Date;
    sparklineVariant: "green" | "grey" | "yellow";
}

const startDate = (campaign: Campana) => campaign.fechaInicio;
const endDate = (campaign: Campana) => campaign.fechaFin;

const STATS: readonly StatDefinition[] = [
    { title: "N° Campañas", icon: <CalendarDays size={28} strokeWidth={2} />, matches: () => true, referenceDate: startDate, sparklineVariant: "green" },
    { title: "Campañas Completadas", icon: <FileCheck size={28} strokeWidth={2} />, matches: (c) => c.estado === "terminado", referenceDate: endDate, sparklineVariant: "green" },
    { title: "Campañas en Ejecución", icon: <ClipboardList size={28} strokeWidth={2} />, matches: (c) => c.estado === "en proceso", referenceDate: startDate, sparklineVariant: "grey" },
    { title: "Campañas Programadas", icon: <CalendarClock size={28} strokeWidth={2} />, matches: (c) => c.estado === "planificacion", referenceDate: startDate, sparklineVariant: "yellow" },
];

interface CampaignStatsOverviewProps {
    /** Las mismas campañas que lista la página: así las tarjetas se actualizan junto con la tabla */
    campaigns: Campana[];
    isLoading: boolean;
}

export default function CampaignStatsOverview({ campaigns, isLoading }: CampaignStatsOverviewProps) {
    // La comparativa se calcula con el mes en curso, que no cambia mientras la página está abierta
    const now = useMemo(() => new Date(), []);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8">
            {STATS.map((stat) => {
                // Mientras carga se mantiene la forma de la tarjeta para que no salte al llegar los datos
                const trend: StatTrend = isLoading ? { value: "0%", direction: "neutral" } : getCampaignTrend(campaigns, now, stat.matches, stat.referenceDate);
                return (
                    <StatCard
                        key={stat.title}
                        title={stat.title}
                        value={isLoading ? 0 : campaigns.filter(stat.matches).length}
                        icon={stat.icon}
                        trend={trend}
                        sparklineVariant={stat.sparklineVariant}
                        series={isLoading ? undefined : getCampaignMonthlySeries(campaigns, now, stat.matches, stat.referenceDate)}
                    />
                );
            })}
        </div>
    );
}
