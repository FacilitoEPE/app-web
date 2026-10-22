import { useMemo, useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import PageHeader from "@/shared/layout/PageHeader";
import { Button } from "@/shared/components/ui/button";
import QualityStatusTabs from "@/modules/quality/components/QualityStatusTabs";
import QualityFilters from "@/modules/quality/components/QualityFilters";
import QualityTable from "@/modules/quality/components/QualityTable";
import QualityAddCampaignModal from "@/modules/quality/components/QualityAddCampaignModal";
import {
    filterQualityCampaigns,
    type QualityCampaign,
    type QualityScope,
} from "@/modules/quality/quality.utils";
import { addQualityCampaign, useQualityCampaigns } from "@/modules/quality/quality.store";

export default function QualityPage() {
    const campaigns = useQualityCampaigns();
    const [scope, setScope] = useState<QualityScope>("exportador");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Filtros
    const [search, setSearch] = useState("");
    const [campaignFilter, setCampaignFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [feedback, setFeedback] = useState<string | null>(null);

    const hasActiveFilters = search.trim() !== "" || campaignFilter !== "" || statusFilter !== "";

    const clearFilters = () => {
        setSearch("");
        setCampaignFilter("");
        setStatusFilter("");
    };

    // Conteo por alcance
    const counts = useMemo(() => {
        return {
            exportador: campaigns.filter((c) => c.scope.includes("exportador")).length,
            industria: campaigns.filter((c) => c.scope.includes("industria")).length,
        };
    }, [campaigns]);

    // Opciones dinámicas para los selectores de filtro
    const campaignsInScope = useMemo(() => {
        return campaigns.filter((c) => c.scope.includes(scope));
    }, [campaigns, scope]);

    const campaignOptions = useMemo(() => {
        const unique = Array.from(new Set(campaignsInScope.map((c) => c.nombre)));
        return unique.map((name) => ({ value: name, label: name }));
    }, [campaignsInScope]);

    const statusOptions = useMemo(() => {
        const unique = Array.from(new Set(campaignsInScope.map((c) => c.estado)));
        return unique.map((status) => ({ value: status, label: status }));
    }, [campaignsInScope]);

    const filteredData = useMemo(() => {
        return filterQualityCampaigns(campaigns, scope, campaignFilter, statusFilter, search);
    }, [campaigns, scope, campaignFilter, statusFilter, search]);

    const existingCampaignIds = useMemo(() => {
        return campaignsInScope.map((c) => c.campaniaId);
    }, [campaignsInScope]);

    const handleViewDetails = (campaign: QualityCampaign) => {
        setFeedback(`Ver detalles de ${campaign.nombre} (módulo en preparación).`);
    };

    const handleSelectAction = (actionId: "analisis" | "carga" | "guias", campaign: QualityCampaign) => {
        const labelMap = {
            analisis: "Análisis y revisión",
            carga: "Carga",
            guias: "Guías de remisión",
        };
        setFeedback(`${labelMap[actionId]} de ${campaign.nombre} (próximamente disponible).`);
    };

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            <PageHeader
                icon={<ShieldCheck size={24} strokeWidth={2.5} />}
                title="Cosecha y control de calidad"
                description="Una campaña reúne sus análisis y todas las cargas de sus entregas"
                action={
                    <Button size="xl" onClick={() => setIsAddModalOpen(true)}>
                        <Plus size={20} strokeWidth={2.5} /> Agregar campaña
                    </Button>
                }
            />

            {feedback && (
                <div className="mb-4 flex items-center justify-between rounded-xl border border-brand-border bg-brand-surface/60 px-4 py-3 text-[13.5px] font-medium text-brand animate-in fade-in duration-200">
                    <span>{feedback}</span>
                    <button
                        type="button"
                        onClick={() => setFeedback(null)}
                        className="text-xs font-semibold hover:underline"
                    >
                        Entendido
                    </button>
                </div>
            )}

            <QualityStatusTabs
                value={scope}
                onChange={(nextScope) => {
                    setScope(nextScope);
                    clearFilters();
                    setFeedback(null);
                }}
                counts={counts}
                className="mt-4 mb-6"
            />

            <QualityFilters
                search={search}
                onSearchChange={setSearch}
                campaignFilter={campaignFilter}
                onCampaignChange={setCampaignFilter}
                campaignOptions={campaignOptions}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                statusOptions={statusOptions}
                hasActiveFilters={hasActiveFilters}
                onClear={clearFilters}
            />

            <QualityTable
                data={filteredData}
                scope={scope}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearFilters}
                onViewDetails={handleViewDetails}
                onSelectAction={handleSelectAction}
            />

            <QualityAddCampaignModal
                open={isAddModalOpen}
                onOpenChange={setIsAddModalOpen}
                scope={scope}
                existingCampaignIds={existingCampaignIds}
                onAdd={(input) => {
                    addQualityCampaign(input);
                    setFeedback(`Campaña ${input.nombre} agregada a ${scope === "exportador" ? "Exportador" : "Industria"}.`);
                }}
            />
        </div>
    );
}
