import { useParams } from "react-router-dom";
import { PageError } from "@/shared/components/PageState";
import QualityCampaignWorkspace from "@/modules/quality/components/QualityCampaignWorkspace";
import { useQualityCampaigns } from "@/modules/quality/quality.store";
import { getQualityActionsForScope, type QualityScope, type QualitySection } from "@/modules/quality/quality.utils";

/** Ruta propia del resumen o de una gestión de calidad de una campaña y canal. */
export default function QualityCampaignPage() {
    const { scope: scopeParam, id, section: sectionParam } = useParams<{ scope: string; id: string; section?: string }>();
    const campaigns = useQualityCampaigns();
    const scope = scopeParam === "exportador" || scopeParam === "industria" ? scopeParam as QualityScope : null;
    const campaignId = Number(id);
    const section = (sectionParam ?? "resumen") as QualitySection;
    const allowed = scope && (section === "resumen" || getQualityActionsForScope(scope).some((action) => action.id === section));
    const campaign = campaigns.find((item) => item.campaniaId === campaignId && scope && item.scope.includes(scope));

    if (!scope || !Number.isSafeInteger(campaignId) || campaignId <= 0 || !allowed || !campaign) {
        return <PageError title="Vista de calidad no disponible" message="La campaña o la gestión solicitada no existe en este canal." back={{ to: "/calidad", label: "Volver a Cosecha y Calidad" }} />;
    }

    return <QualityCampaignWorkspace campaign={campaign} scope={scope} section={section} />;
}
