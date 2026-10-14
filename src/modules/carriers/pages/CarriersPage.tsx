import { useCallback, useEffect, useMemo, useState } from "react";
import { Truck, Send, Building2, AlertCircle } from "lucide-react";
import CarriersFilters from "@/modules/carriers/components/CarriersFilters";
import CarriersTable from "@/modules/carriers/components/CarriersTable";
import CarrierFormModal from "@/modules/carriers/components/CarrierFormModal";
import CarrierSendRequirementModal from "@/modules/carriers/components/CarrierSendRequirementModal";
import CarrierSuccessModal, { type CarrierSuccessMode } from "@/modules/carriers/components/CarrierSuccessModal";
import PageHeader from "@/shared/layout/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { createCarrier, deleteCarrier, getCarriers, updateCarrier, createVehicle, createDriver } from "@/modules/carriers/api/carrier.api";
import type { Carrier } from "@/modules/carriers/carriers.data";
import { removeCarrierExtras, setCarrierExtras, useCarrierExtras } from "@/modules/carriers/carrierExtras.store";
import { splitCarrierValues, toCarrierProfile, type CarrierFormValues } from "@/modules/carriers/carrierProfile.utils";

export default function CarriersPage() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRequirementModalOpen, setIsRequirementModalOpen] = useState(false);
    const [carriers, setCarriers] = useState<Carrier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<{ open: boolean; mode: CarrierSuccessMode }>({ open: false, mode: "carrier-created" });
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const extras = useCarrierExtras();
    // La API devuelve la empresa; el tipo, MTC, CGN y ubicación viven aparte hasta que el backend los modele
    const profiles = useMemo(() => carriers.map((carrier) => toCarrierProfile(carrier, extras[carrier.id])), [carriers, extras]);

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

    // Carga inicial desde la API: el estado se actualiza al resolverse la petición.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void loadCarriers(); }, [loadCarriers]);

    const hasActiveFilters = search !== "";

    const filteredData = useMemo(() => {
        const searchLower = search.trim().toLowerCase();
        return profiles.filter((item) => [item.nombre, item.ruc, item.mtc, item.documento].some((field) => field.toLowerCase().includes(searchLower)));
    }, [profiles, search]);

    const selectedCarriers = useMemo(() => profiles.filter((item) => selectedIds.has(item.id)), [profiles, selectedIds]);

    const showSuccess = (mode: CarrierSuccessMode) => setSuccess({ open: true, mode });

    const handleCreateCarrier = async (values: CarrierFormValues) => {
        // Si el backend rechaza el alta, el error llega al modal y se muestra bajo cada campo
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
            setSelectedIds((current) => { const next = new Set(current); next.delete(id); return next; });
        } catch {
            setError("El backend no pudo eliminar al transportista; puede tener vehículos o choferes asociados.");
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
                                <Badge variant="brand" className="ml-1">{selectedIds.size}</Badge>
                            )}
                        </Button>
                        <Button
                            size="xl"
                            onClick={() => setIsCreateModalOpen(true)}
                        >
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
                hasActiveFilters={hasActiveFilters}
                onClear={() => setSearch("")}
            />

            <CarriersTable
                data={filteredData}
                isLoading={isLoading}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={() => setSearch("")}
                selectedIds={selectedIds}
                onToggleRow={toggleRow}
                onToggleAll={toggleAll}
                onDelete={handleDeleteCarrier}
                onUpdateCarrier={handleUpdateCarrier}
                onCreateVehicle={async (carrierId, values) => { await createVehicle(carrierId, values); await loadCarriers(); }}
                onCreateDriver={async (carrierId, values) => { await createDriver(carrierId, values); await loadCarriers(); }}
            />

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
