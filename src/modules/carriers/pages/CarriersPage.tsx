import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Building2, FileSpreadsheet, Send, Truck, UserRound } from "lucide-react";
import CarriersFilters from "@/modules/carriers/components/CarriersFilters";
import CarriersTable from "@/modules/carriers/components/CarriersTable";
import CarriersQuotationsSubView from "@/modules/carriers/components/CarriersQuotationsSubView";
import CarrierFormModal from "@/modules/carriers/components/CarrierFormModal";
import CarrierSendRequirementModal from "@/modules/carriers/components/CarrierSendRequirementModal";
import CarrierSuccessModal, {
    type CarrierSuccessMode,
} from "@/modules/carriers/components/CarrierSuccessModal";
import PageHeader from "@/shared/layout/PageHeader";
import SegmentedTabs from "@/shared/components/SegmentedTabs";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
    createCarrier,
    deleteCarrier,
    getCarriers,
    updateCarrier,
} from "@/modules/carriers/api/carrier.api";
import type { Carrier } from "@/modules/carriers/carriers.data";
import {
    removeCarrierExtras,
    useCarrierExtras,
} from "@/modules/carriers/carrierExtras.store";
import { useCarrierQuotations } from "@/modules/carriers/carrierQuotations.store";
import { loadCarrierQuotations } from '@/modules/carriers/api/quotation-commands.api';
import { usesV1 } from '@/shared/api/data-contract';
import {
    splitCarrierValues,
    toCarrierProfile,
    type CarrierFormValues,
} from "@/modules/carriers/carrierProfile.utils";

type CarriersSectionTab = "empresas" | "cotizaciones";

export default function CarriersPage() {
    const [activeTab, setActiveTab] = useState<CarriersSectionTab>("empresas");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [carriers, setCarriers] = useState<Carrier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<{ open: boolean; mode: CarrierSuccessMode }>({
        open: false,
        mode: "carrier-created",
    });
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const extras = useCarrierExtras();
    const quotations = useCarrierQuotations();
    useEffect(() => {
        if (activeTab !== 'cotizaciones' || !usesV1()) return;
        let active = true;
        void loadCarrierQuotations().catch(() => { if (active) setError('No se pudieron cargar las cotizaciones. Vuelve a abrir la pestaña para reintentarlo.'); });
        return () => { active = false; };
    }, [activeTab]);

    const profiles = useMemo(
        () => carriers.map((carrier) => toCarrierProfile(carrier, extras[carrier.id])),
        [carriers, extras],
    );

    const loadCarriers = useCallback(async () => {
        try {
            setError(null);
            setCarriers(await getCarriers());
        } catch {
            setError("No se pudieron cargar los transportistas desde la API del backend.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial remote loading uses the shared retry callback.
        void loadCarriers();
    }, [loadCarriers]);

    const hasActiveFilters = search !== "" || typeFilter !== "all";
    const clearFilters = () => {
        setSearch("");
        setTypeFilter("all");
    };

    const filteredData = useMemo(() => {
        const searchLower = search.trim().toLowerCase();
        return profiles.filter((item) => {
            if (typeFilter !== "all" && item.tipo !== typeFilter) return false;
            return [item.nombre, item.ruc, item.mtc, item.documento].some((field) =>
                field.toLowerCase().includes(searchLower),
            );
        });
    }, [profiles, search, typeFilter]);

    const selectedCarriers = useMemo(
        () => carriers.filter((carrier) => selectedIds.includes(carrier.id)),
        [carriers, selectedIds],
    );

    const toggleRow = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
        );
    };

    const toggleAll = (checked: boolean) => {
        if (!checked) {
            setSelectedIds([]);
            return;
        }
        setSelectedIds(filteredData.map((row) => row.id));
    };

    const showSuccess = (mode: CarrierSuccessMode) => setSuccess({ open: true, mode });

    const handleCreateCarrier = async (values: CarrierFormValues) => {
        const { input, extras: carrierExtras } = splitCarrierValues(values);
        await createCarrier(input, carrierExtras);
        await loadCarriers();
        setIsCreateModalOpen(false);
        showSuccess("carrier-created");
    };

    const handleUpdateCarrier = async (id: number, values: CarrierFormValues) => {
        const { input, extras: carrierExtras } = splitCarrierValues(values);
        await updateCarrier(id, input, carrierExtras);
        await loadCarriers();
    };

    const handleDeleteCarrier = async (id: number) => {
        try {
            await deleteCarrier(id);
            await removeCarrierExtras(id);
            setSelectedIds((prev) => prev.filter((item) => item !== id));
            await loadCarriers();
        } catch {
            setError(
                "El backend no pudo eliminar al transportista; puede tener vehículos o choferes asociados.",
            );
        }
    };

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            <PageHeader
                icon={<Truck size={24} strokeWidth={2.5} />}
                title="Gestión de Transporte"
                description="Administra transportistas, envía requerimientos por correo y gestiona sus cotizaciones."
                action={
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 [&>button]:w-full sm:[&>button]:w-auto">
                        <Button
                            variant="outline"
                            size="xl"
                            onClick={() => setIsSendModalOpen(true)}
                        >
                            <Send size={19} strokeWidth={2.4} /> Enviar requerimiento
                            {selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
                        </Button>
                        <Button size="xl" onClick={() => setIsCreateModalOpen(true)}>
                            <Building2 size={20} strokeWidth={2.5} /> Registrar transportista
                        </Button>
                    </div>
                }
            />

            <div className="mb-6">
                <SegmentedTabs
                    value={activeTab}
                    onChange={(val) => setActiveTab(val as CarriersSectionTab)}
                    showLabelsOnMobile
                    tabs={[
                        {
                            id: "empresas",
                            label: "Empresas",
                            icon: Building2,
                            count: profiles.length,
                        },
                        {
                            id: "cotizaciones",
                            label: "Solicitudes y cotizaciones",
                            icon: FileSpreadsheet,
                            count: quotations.length,
                        },
                    ]}
                />
            </div>

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {activeTab === "empresas" ? (
                <>
                    <SegmentedTabs
                        tabs={[
                            { id: "all", label: "Todos", icon: Truck, count: profiles.length },
                            { id: "publico", label: "Público", icon: Building2, count: profiles.filter((carrier) => carrier.tipo === "publico").length },
                            { id: "privado", label: "Privado", icon: UserRound, count: profiles.filter((carrier) => carrier.tipo === "privado").length },
                        ]}
                        value={typeFilter}
                        onChange={setTypeFilter}
                        showLabelsOnMobile
                        className="mt-4 mb-6"
                    />

                    <CarriersFilters
                        search={search}
                        onSearchChange={setSearch}
                        hasActiveFilters={hasActiveFilters}
                        onClear={clearFilters}
                    />

                    <CarriersTable
                        data={filteredData}
                        isLoading={isLoading}
                        hasActiveFilters={hasActiveFilters}
                        onClearFilters={clearFilters}
                        onDelete={handleDeleteCarrier}
                        onUpdateCarrier={handleUpdateCarrier}
                        selectedIds={selectedIds}
                        onToggleRow={toggleRow}
                        onToggleAll={toggleAll}
                    />
                </>
            ) : (
                <CarriersQuotationsSubView carriers={carriers} />
            )}

            <CarrierSendRequirementModal
                open={isSendModalOpen}
                onOpenChange={setIsSendModalOpen}
                selectedCarriers={selectedCarriers}
                onRemoveCarrier={(id) =>
                    setSelectedIds((prev) => prev.filter((item) => item !== id))
                }
                onSuccess={async () => {
                    setIsSendModalOpen(false);
                    setSelectedIds([]);
                    await loadCarriers();
                    showSuccess("requirement-sent");
                }}
            />

            <CarrierFormModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                onSuccess={handleCreateCarrier}
            />

            <CarrierSuccessModal
                open={success.open}
                onOpenChange={(open) => setSuccess((current) => ({ ...current, open }))}
                mode={success.mode}
            />
        </div>
    );
}
