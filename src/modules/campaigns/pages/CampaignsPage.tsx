import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Leaf, Sprout } from "lucide-react";
import CampaignStatsOverview from "@/modules/campaigns/components/CampaignStatsOverview";
import CampaignFilters from "@/modules/campaigns/components/CampaignFilters";
import CampaignTable from "@/modules/campaigns/components/CampaignTable";
import CampaignFormModal from "@/modules/campaigns/components/CampaignFormModal";
import CampaignSuccessModal from "@/modules/campaigns/components/CampaignSuccessModal";
import CampaignStatusTabs from "@/modules/campaigns/components/CampaignStatusTabs";
import PageHeader from "@/shared/layout/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { deleteCampana, getCampanas } from "@/modules/campaigns/api/campaign.api";
import { createInFlightGuard } from "@/shared/utils/inFlightGuard";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";
import { filterCampanas } from "@/modules/campaigns/campaignFilters.utils";

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campana[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const deleteGuard = useRef(createInFlightGuard());
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

    // Filtros: cadena vacía = sin filtrar por ese campo
    const [status, setStatus] = useState("planificacion");
    const [search, setSearch] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    /** Una sola carga alimenta las tarjetas de resumen y la tabla, así nunca muestran datos distintos */
    const loadCampaigns = useCallback(async () => {
        try {
            setCampaigns(await getCampanas());
            setLoadError(null);
        } catch {
            setLoadError("No se pudieron cargar las campañas. Verifica la conexión e inténtalo nuevamente.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Carga inicial desde la API: el estado se actualiza al resolverse la petición.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void loadCampaigns(); }, [loadCampaigns]);

    const retry = () => {
        setIsLoading(true);
        void loadCampaigns();
    };

    const hasActiveFilters = search.trim() !== "" || startDate !== "" || endDate !== "";
    const clearFilters = () => {
        setSearch("");
        setStartDate("");
        setEndDate("");
    };

    const filteredData = useMemo(
        () => filterCampanas(campaigns, search, startDate, endDate, status),
        [campaigns, search, startDate, endDate, status],
    );

    const handleDelete = async (campaign: Campana) => {
        if (!deleteGuard.current.acquire()) return;
        setDeleteError(null);
        try {
            await deleteCampana(campaign.campaniaId);
            setCampaigns((current) => current.filter((item) => item.campaniaId !== campaign.campaniaId));
        } catch {
            setDeleteError(`No se pudo eliminar ${campaign.nombre}. Puede tener proveedores o clientes vinculados, o haber ocurrido un error de conexión.`);
        } finally {
            deleteGuard.current.release();
        }
    };

    const handleCreateSuccess = () => {
        setIsCreateModalOpen(false);
        setIsSuccessModalOpen(true);
        void loadCampaigns();
    };

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            <PageHeader
                icon={<Leaf size={24} strokeWidth={2.5} />}
                title="Gestión de Campaña"
                description="Organiza y planifica tus campañas de exportación."
                action={
                    status === "planificacion" ? (
                        <Button size="xl" onClick={() => setIsCreateModalOpen(true)}>
                            <Sprout size={20} strokeWidth={2.5} /> Nueva Campaña
                        </Button>
                    ) : undefined
                }
            />

            <CampaignStatsOverview campaigns={campaigns} isLoading={isLoading} />

            <CampaignStatusTabs value={status} onChange={setStatus} className="mt-4 mb-6" />

            <CampaignFilters
                search={search}
                onSearchChange={setSearch}
                startDate={startDate}
                onStartDateChange={setStartDate}
                endDate={endDate}
                onEndDateChange={setEndDate}
                hasActiveFilters={hasActiveFilters}
                onClear={clearFilters}
            />

            {deleteError && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle />
                    <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
            )}

            <CampaignTable
                data={filteredData}
                isLoading={isLoading}
                loadError={loadError}
                onRetry={retry}
                onChanged={() => void loadCampaigns()}
                onDelete={handleDelete}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearFilters}
            />

            <CampaignFormModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                onSuccess={handleCreateSuccess}
            />

            <CampaignSuccessModal
                open={isSuccessModalOpen}
                onOpenChange={setIsSuccessModalOpen}
            />
        </div>
    );
}
