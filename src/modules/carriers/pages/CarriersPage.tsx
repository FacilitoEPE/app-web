import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Building2, FileSpreadsheet, Send, Truck, UserRound } from "lucide-react";
import CarriersFilters from "@/modules/carriers/components/CarriersFilters";
import CarriersTable from "@/modules/carriers/components/CarriersTable";
import CarrierFormModal from "@/modules/carriers/components/CarrierFormModal";
import CarrierSendRequirementModal from "@/modules/carriers/components/CarrierSendRequirementModal";
import CarrierSuccessModal, {
    type CarrierSuccessMode,
} from "@/modules/carriers/components/CarrierSuccessModal";
import CarriersGlobalDriversSubView from "@/modules/carriers/components/CarriersGlobalDriversSubView";
import CarriersGlobalVehiclesSubView from "@/modules/carriers/components/CarriersGlobalVehiclesSubView";
import CarriersQuotationsSubView from "@/modules/carriers/components/CarriersQuotationsSubView";
import SegmentedTabs, { type SegmentedTabItem } from "@/shared/components/SegmentedTabs";
import PageHeader from "@/shared/layout/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import {
    createCarrier,
    createDriver,
    createVehicle,
    deleteCarrier,
    deleteDriver,
    deleteVehicle,
    getCarriers,
    updateCarrier,
    updateDriver,
    updateVehicle,
} from "@/modules/carriers/api/carrier.api";
import type { Carrier } from "@/modules/carriers/carriers.data";
import {
    removeCarrierExtras,
    setCarrierExtras,
    useCarrierExtras,
} from "@/modules/carriers/carrierExtras.store";
import {
    splitCarrierValues,
    toCarrierProfile,
    type CarrierFormValues,
} from "@/modules/carriers/carrierProfile.utils";

type CarrierSubView = "transportistas" | "vehiculos" | "choferes" | "cotizaciones";

export default function CarriersPage() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false);
    const [carriers, setCarriers] = useState<Carrier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<{ open: boolean; mode: CarrierSuccessMode }>({
        open: false,
        mode: "carrier-created",
    });
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [activeSubView, setActiveSubView] = useState<CarrierSubView>("transportistas");
    const extras = useCarrierExtras();

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

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => {
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
        () => profiles.filter((item) => selectedIds.has(item.id)),
        [profiles, selectedIds],
    );

    const showSuccess = (mode: CarrierSuccessMode) => setSuccess({ open: true, mode });

    const handleCreateCarrier = async (values: CarrierFormValues) => {
        const { input, extras: carrierExtras } = splitCarrierValues(values);
        const created = await createCarrier(input);
        setCarrierExtras(created.id, carrierExtras);
        await loadCarriers();
        setIsCreateModalOpen(false);
        showSuccess("carrier-created");
    };

    const handleUpdateCarrier = async (id: number, values: CarrierFormValues) => {
        const { input, extras: carrierExtras } = splitCarrierValues(values);
        await updateCarrier(id, input);
        setCarrierExtras(id, carrierExtras);
        await loadCarriers();
    };

    const handleDeleteCarrier = async (id: number) => {
        try {
            await deleteCarrier(id);
            removeCarrierExtras(id);
            await loadCarriers();
            setSelectedIds((current) => {
                const next = new Set(current);
                next.delete(id);
                return next;
            });
        } catch {
            setError(
                "El backend no pudo eliminar al transportista; puede tener vehículos o choferes asociados.",
            );
        }
    };

    const toggleRow = (id: number) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = (ids: number[]) => {
        setSelectedIds((current) => {
            const allSelected = ids.every((id) => current.has(id));
            const next = new Set(current);
            ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
            return next;
        });
    };

    const subViewTabs: readonly SegmentedTabItem[] = [
        {
            id: "transportistas",
            label: "Transportistas",
            icon: Building2,
            count: carriers.length,
        },
        {
            id: "vehiculos",
            label: "Vehículos",
            icon: Truck,
            count: carriers.reduce((s, c) => s + c.vehiculos.length, 0),
        },
        {
            id: "choferes",
            label: "Choferes",
            icon: UserRound,
            count: carriers.reduce((s, c) => s + c.choferes.length, 0),
        },
        {
            id: "cotizaciones",
            label: "Requerimientos y cotizaciones",
            icon: FileSpreadsheet,
        },
    ];

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            <PageHeader
                icon={<Truck size={24} strokeWidth={2.5} />}
                title="Gestión de Transporte"
                description="Coordina la flota y envía requerimientos a tus transportistas."
                action={
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 [&>button]:w-full sm:[&>button]:w-auto">
                        <Button
                            variant="outline"
                            size="xl"
                            disabled={selectedIds.size === 0}
                            onClick={() => setIsRequirementModalOpen(true)}
                        >
                            <Send size={20} strokeWidth={2.5} /> Enviar requerimiento
                            {selectedIds.size > 0 && (
                                <Badge variant="brand" className="ml-1">
                                    {selectedIds.size}
                                </Badge>
                            )}
                        </Button>
                        <Button size="xl" onClick={() => setIsCreateModalOpen(true)}>
                            <Building2 size={20} strokeWidth={2.5} /> Registrar transportista
                        </Button>
                    </div>
                }
            />

            <SegmentedTabs
                tabs={subViewTabs}
                value={activeSubView}
                onChange={(v) => setActiveSubView(v as CarrierSubView)}
                className="mb-6"
            />

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {activeSubView === "vehiculos" ? (
                <CarriersGlobalVehiclesSubView
                    carriers={carriers}
                    onCreateVehicle={async (carrierId, values) => {
                        await createVehicle(carrierId, values);
                        await loadCarriers();
                    }}
                    onUpdateVehicle={async (vehicleId, carrierId, values) => {
                        await updateVehicle(vehicleId, carrierId, values);
                        await loadCarriers();
                    }}
                    onDeleteVehicle={async (vehicleId) => {
                        await deleteVehicle(vehicleId);
                        await loadCarriers();
                    }}
                />
            ) : activeSubView === "choferes" ? (
                <CarriersGlobalDriversSubView
                    carriers={carriers}
                    onCreateDriver={async (carrierId, values) => {
                        await createDriver(carrierId, values);
                        await loadCarriers();
                    }}
                    onUpdateDriver={async (driverId, values) => {
                        await updateDriver(driverId, values);
                        await loadCarriers();
                    }}
                    onDeleteDriver={async (driverId) => {
                        await deleteDriver(driverId);
                        await loadCarriers();
                    }}
                />
            ) : activeSubView === "cotizaciones" ? (
                <CarriersQuotationsSubView carriers={carriers} />
            ) : (
                <>
                    <CarriersFilters
                        search={search}
                        onSearchChange={setSearch}
                        typeFilter={typeFilter}
                        onTypeFilterChange={setTypeFilter}
                        hasActiveFilters={hasActiveFilters}
                        onClear={clearFilters}
                    />

                    <CarriersTable
                        data={filteredData}
                        isLoading={isLoading}
                        hasActiveFilters={hasActiveFilters}
                        onClearFilters={clearFilters}
                        selectedIds={selectedIds}
                        onToggleRow={toggleRow}
                        onToggleAll={toggleAll}
                        onDelete={handleDeleteCarrier}
                        onUpdateCarrier={handleUpdateCarrier}
                        onCreateVehicle={async (carrierId, values) => {
                            await createVehicle(carrierId, values);
                            await loadCarriers();
                        }}
                        onCreateDriver={async (carrierId, values) => {
                            await createDriver(carrierId, values);
                            await loadCarriers();
                        }}
                    />
                </>
            )}

            <CarrierFormModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                onSuccess={handleCreateCarrier}
            />

            <CarrierSendRequirementModal
                open={isRequirementModalOpen}
                onOpenChange={setIsRequirementModalOpen}
                selectedCarriers={selectedCarriers}
                onRemoveCarrier={toggleRow}
                onSuccess={() => {
                    setIsRequirementModalOpen(false);
                    setSelectedIds(new Set());
                    showSuccess("requirement-sent");
                }}
            />

            <CarrierSuccessModal
                open={success.open}
                onOpenChange={(open) => setSuccess((current) => ({ ...current, open }))}
                mode={success.mode}
            />
        </div>
    );
}
