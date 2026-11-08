import { CalendarDays, Clock3, ExternalLink, FileText, User } from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import StatusBadge from "@/shared/components/StatusBadge";
import type { Campaign } from "@/modules/campaigns/campaigns.data";
import { getCampaignFruitVisual } from "@/modules/campaigns/campaignFruit";
import { formatCampaignNumber } from "@/modules/campaigns/campaignDetails.utils";

interface CampaignOverviewCardProps {
    campaign: Campaign;
    duration: number | null;
}

export default function CampaignOverviewCard({ campaign, duration }: CampaignOverviewCardProps) {
    const fruit = getCampaignFruitVisual(campaign.nombre, campaign.fruta);
    const dates = [
        { label: "Fecha de inicio", value: campaign.inicio, icon: CalendarDays },
        { label: "Fecha de fin", value: campaign.fin, icon: CalendarDays },
        { label: "Duración", value: `${formatCampaignNumber(duration)} días`, icon: Clock3 },
    ];

    return (
        <Card className="campaign-panel campaign-overview">
            <div className="campaign-overview-copy">
                <p className="campaign-eyebrow">
                    {campaign.estado === "Terminado" ? "Campaña finalizada" : "Campaña agrícola"}
                    {campaign.temporada ? ` · Temporada ${campaign.temporada}` : ""}
                </p>
                <div className="campaign-title-row">
                    <h2>{campaign.nombre}</h2>
                    <StatusBadge status={campaign.estado} />
                </div>

                <div className="campaign-meta-row">
                    <span className="campaign-meta-item min-w-0">
                        <User size={13} className="text-brand shrink-0" aria-hidden="true" />
                        <span className="campaign-meta-label">Responsable:</span>
                        <span className="campaign-meta-value min-w-0 wrap-anywhere">{campaign.responsable || "Sin asignar"}</span>
                    </span>
                    {campaign.lineamientos ? (
                        <a
                            href={campaign.lineamientos.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="campaign-meta-item campaign-meta-link"
                            title={`Abrir lineamientos: ${campaign.lineamientos.name}`}
                        >
                            <FileText size={13} className="text-brand shrink-0" aria-hidden="true" />
                            <span className="campaign-meta-label">Lineamientos:</span>
                            <span className="campaign-meta-value truncate max-w-[170px] underline decoration-dotted underline-offset-2">
                                {campaign.lineamientos.name}
                            </span>
                            <ExternalLink size={11} className="opacity-70 shrink-0" aria-hidden="true" />
                        </a>
                    ) : null}
                </div>

                {campaign.observaciones ? (
                    <div className="campaign-observations-box">
                        <div className="campaign-observations-header">
                            <FileText size={12} className="text-brand shrink-0" aria-hidden="true" />
                            <span>Observaciones</span>
                        </div>
                        <p className="campaign-observations-text">{campaign.observaciones}</p>
                    </div>
                ) : (
                    <p className="campaign-description">
                        Gestión integral de la producción, comercialización y exportación {fruit.description} de la más alta calidad.
                    </p>
                )}

                <dl className="campaign-dates">
                    {dates.map(({ label, value, icon: Icon }) => (
                        <div key={label}>
                            <Icon size={17} aria-hidden="true" />
                            <div><dt>{label}</dt><dd>{value}</dd></div>
                        </div>
                    ))}
                </dl>
                <div className="campaign-varieties">
                    <p>Variedades de {fruit.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                        {campaign.variedades?.length ? campaign.variedades.map((variety) => (
                            <span key={variety} className="campaign-chip"><span aria-hidden="true" />{variety}</span>
                        )) : <span className="campaign-muted text-xs">Sin variedades registradas</span>}
                    </div>
                </div>
            </div>
            <div className="campaign-fruit-photo">
                <img key={fruit.image} src={fruit.image} alt={fruit.alt} width={960} height={640} fetchPriority="high" />
                <div className="campaign-photo-shade" />
                <p className="campaign-photo-quote">{fruit.quote}<span /></p>
            </div>
        </Card>
    );
}
