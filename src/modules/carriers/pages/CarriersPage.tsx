import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Building2, Truck } from "lucide-react";
import CarriersFilters from "@/modules/carriers/components/CarriersFilters";
import CarriersTable from "@/modules/carriers/components/CarriersTable";
import CarrierFormModal from "@/modules/carriers/components/CarrierFormModal";
import CarrierSuccessModal, {
    type CarrierSuccessMode,
} from "@/modules/carriers/components/CarrierSuccessModal";
import PageHeader from "@/shared/layout/PageHeader";
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
    setCarrierExtras,
    useCarrierExtras,
} from "@/modules/carriers/carrierExtras.store";
import {
    splitCarrierValues,
    toCarrierProfile,
    type CarrierFormValues,
} from "@/modules/carriers/carrierProfile.utils";


export default function CarriersPage() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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

    const showSuccess = (mode: CarrierSuccessMode) => setSuccess({ open: true, mode });

    const handleCreateCarrier = async (values: CarrierFormValues) => {
        const { input, extras: carrierExtras } = splitCarrierValues(values);
        const created = await createCarrier(input, carrierExtras);
        await setCarrierExtras(created.id, carrierExtras);
        await loadCarriers();
        setIsCreateModalOpen(false);
        showSuccess("carrier-created");
    };

    const handleUpdateCarrier = async (id: number, values: CarrierFormValues) => {
        const { input, extras: carrierExtras } = splitCarrierValues(values);
        await updateCarrier(id, input, carrierExtras);
        await setCarrierExtras(id, carrierExtras);
        await loadCarriers();
    };

    const handleDeleteCarrier = async (id: number) => {
        try {
            await deleteCarrier(id);
            await removeCarrierExtras(id);
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
                description="Administra transportistas y consulta sus vehículos y choferes."
                action={
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 [&>button]:w-full sm:[&>button]:w-auto">
                        <Button size="xl" onClick={() => setIsCreateModalOpen(true)}>
                            <Building2 size={20} strokeWidth={2.5} /> Registrar transportista
                        </Button>
                    </div>
                }
            />

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

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
                        onDelete={handleDeleteCarrier}
                        onUpdateCarrier={handleUpdateCarrier}
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
