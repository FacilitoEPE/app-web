import { useParams } from "react-router-dom";
import { PageError } from "@/shared/components/PageState";
import QualityCampaignWorkspace from "@/modules/quality/components/QualityCampaignWorkspace";
import QualityManagementView from "@/modules/quality/components/QualityManagementView";
import QualityGuideLoadsView from "@/modules/quality/components/QualityGuideLoadsView";
import QualityLoadGuidesView from "@/modules/quality/components/QualityLoadGuidesView";
import QualityGuideDetailView from "@/modules/quality/components/QualityGuideDetailView";
import { useQualityCampaigns } from "@/modules/quality/quality.store";
import { useQualityDeliveryLoads } from "@/modules/quality/qualityOperations.store";
import { getQualityActionsForScope, type QualityScope, type QualitySection } from "@/modules/quality/quality.utils";

/** Ruta propia del resumen o de una gestión de calidad de una campaña y canal. */
export default function QualityCampaignPage() {
    const { scope: scopeParam, id, section: sectionParam, loadId, guideId } = useParams<{ scope: string; id: string; section?: string; loadId?: string; guideId?: string }>();
    const campaigns = useQualityCampaigns();
    const loads = useQualityDeliveryLoads();
    const scope = scopeParam === "exportador" || scopeParam === "industria" ? scopeParam as QualityScope : null;
    const campaignId = Number(id);
    const section = (sectionParam ?? "resumen") as QualitySection;
    const allowed = scope && (section === "resumen" || getQualityActionsForScope(scope).some((action) => action.id === section));
    const campaign = campaigns.find((item) => item.campaniaId === campaignId && scope && item.scope.includes(scope));

    const guideLoad = loads.find(load => load.id === loadId && load.campaniaId === campaignId && load.scope === scope && !load.id.startsWith("entrega-"));
    const guide = guideLoad?.guiasRemision.find(item => item.id === guideId);
    if (!scope || !Number.isSafeInteger(campaignId) || campaignId <= 0 || !allowed || !campaign || (loadId && (section !== "guias" || !guideLoad)) || (guideId && !guide)) {
        const back = scope && section === "guias" && loadId && campaign
            ? { to: guideId ? `/calidad/${scope}/${campaignId}/guias/${loadId}` : `/calidad/${scope}/${campaignId}/guias`, label: guideId ? "Volver a guías de la carga" : "Volver a guías de remisión" }
            : { to: "/calidad", label: "Volver a Cosecha y Calidad" };
        return <PageError title="Vista de calidad no disponible" message="La campaña o la gestión solicitada no existe en este canal." back={back} />;
    }

    if (section === "guias" && loadId && guideId && guideLoad && guide) return <QualityGuideDetailView load={guideLoad} guide={guide} backHref={`/calidad/${scope}/${campaignId}/guias/${loadId}`} />;
    if (section === "guias" && loadId) return <QualityLoadGuidesView campaign={campaign} scope={scope} loadId={loadId} />;
    if (section === "guias") return <QualityGuideLoadsView campaign={campaign} scope={scope} />;
    return section === "resumen"
        ? <QualityCampaignWorkspace campaign={campaign} scope={scope} section={section} />
        : <QualityManagementView key={`${scope}:${campaignId}:${section}`} campaign={campaign} scope={scope} section={section} />;
}
