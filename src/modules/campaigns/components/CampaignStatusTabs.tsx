import { CalendarDays, Check, Settings } from "lucide-react";
import SegmentedTabs, { type SegmentedTabItem } from "@/shared/components/SegmentedTabs";

/** Estados de campaña en el orden en que se muestran */
const CAMPAIGN_STATUS_TABS: SegmentedTabItem[] = [
    { id: "planificacion", label: "Planificado", icon: CalendarDays, tone: "neutral" },
    { id: "en proceso", label: "En ejecución", icon: Settings, tone: "neutral" },
    { id: "terminado", label: "Finalizado", icon: Check, tone: "brand" },
];

interface CampaignStatusTabsProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export default function CampaignStatusTabs({ value, onChange, className }: CampaignStatusTabsProps) {
    return <SegmentedTabs tabs={CAMPAIGN_STATUS_TABS} value={value} onChange={onChange} className={className} />;
}
