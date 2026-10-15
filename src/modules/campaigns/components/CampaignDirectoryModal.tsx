import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarDays } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";
import { getCampaignFruitVisual } from "@/modules/campaigns/campaignFruit";
import { format, differenceInDays } from "date-fns";

interface CampaignDirectoryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    campaign: Campana | null;
    description: string;
    icon: LucideIcon;
    stats: { label: string; value: string | number; icon: LucideIcon; hint?: string }[];
    children: ReactNode;
    empty?: boolean;
}

/** Campaign content stays here; AppModal owns the title and close control. */
export default function CampaignDirectoryModal({ open, onOpenChange, title, campaign, description, icon: Icon, stats, children, empty }: CampaignDirectoryModalProps) {
    if (!campaign) return null;
    const visual = getCampaignFruitVisual(campaign.nombre, campaign.fruta?.name ?? "");
    const duration = differenceInDays(new Date(campaign.fechaFin), new Date(campaign.fechaInicio));
    return (
        <AppModal open={open} onOpenChange={onOpenChange} title={title} description={description} icon={<Icon size={22} strokeWidth={2} />} size="xl">
            <div className="relative mb-4 flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl bg-brand-surface/70 p-4 sm:gap-6 sm:pr-40">
                <img src={visual.image} alt="" className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-40 rounded-tl-[80px] object-cover sm:block" />
                <div className="relative flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Icon size={23} aria-hidden="true" /></span>
                    <div><p className="text-[10px]">Campaña</p><p className="mt-1 text-base font-bold text-brand-dark">{campaign.nombre}</p></div>
                </div>
                <div className="relative flex items-start gap-2 sm:border-l sm:border-brand-border sm:pl-5">
                    <CalendarDays size={23} className="text-brand" aria-hidden="true" />
                    <div><p className="text-[10px]">Periodo de campaña</p><p className="mt-1 text-[11px] font-semibold text-brand-dark">{format(campaign.fechaInicio, "dd/MM/yyyy")} – {format(campaign.fechaFin, "dd/MM/yyyy")}</p><p className="mt-1 text-[10px]">{duration} días</p></div>
                </div>
            </div>
            <dl className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
                {stats.map(({ label, value, icon: StatIcon, hint }) => (
                    <div key={label} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card px-2.5 py-3 sm:px-3">
                        <span className="hidden size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-surface sm:flex" style={{ color: "var(--brand-gradient-mid)" }}><StatIcon size={22} aria-hidden="true" /></span>
                        <div><dt className="text-[10px] font-medium">{label}</dt>
                        <dd className="mt-1 text-xl font-bold leading-tight tracking-tight text-ink tabular-nums sm:text-2xl">{value}</dd>
                        {hint && <p className="mt-0.5 text-[10px]">{hint}</p>}</div>
                    </div>
                ))}
            </dl>
            {empty ? <p className="py-8 text-center text-sm text-ink-body">Todavía no hay registros vinculados a esta campaña.</p> : children}
        </AppModal>
    );
}
