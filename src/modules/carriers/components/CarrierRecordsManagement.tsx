import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Building2, Plus, Truck, UserRound } from "lucide-react";
import TransportImage from "@/assets/transport_management.webp";
import PageHeader from "@/shared/layout/PageHeader";
import ContextBanner, { ContextBannerPlaceholder } from "@/shared/components/ContextBanner";
import FilterBar, { FilterSearch } from "@/shared/components/FilterBar";
import { Button } from "@/shared/components/ui/button";
import CarrierVehiclesTable from "@/modules/carriers/components/CarrierVehiclesTable";
import CarrierDriversTable from "@/modules/carriers/components/CarrierDriversTable";
import CarrierVehicleModal from "@/modules/carriers/components/CarrierVehicleModal";
import CarrierDriverModal from "@/modules/carriers/components/CarrierDriverModal";
import CarrierSuccessModal, { type CarrierSuccessMode } from "@/modules/carriers/components/CarrierSuccessModal";
import { createDriver, createVehicle, deleteDriver, deleteVehicle, getCarrier, updateDriver, updateVehicle } from "@/modules/carriers/api/carrier.api";
import type { Carrier, Driver, Vehicle } from "@/modules/carriers/carriers.data";
import { toDriverInput, toVehicleInput, type DriverFormValues, type VehicleFormValues } from "@/modules/carriers/carrierRecords.utils";

/** Shared orchestration for the two independent transport management routes. */
export default function CarrierRecordsManagement({ kind }: { kind: "vehicles" | "drivers" }) {
    const { id } = useParams<{ id: string }>();
    const carrierId = Number(id);
    const isVehicles = kind === "vehicles";
    const [carrier, setCarrier] = useState<Carrier | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [vehicleForm, setVehicleForm] = useState<{ open: boolean; editing: Vehicle | null }>({ open: false, editing: null });
    const [driverForm, setDriverForm] = useState<{ open: boolean; editing: Driver | null }>({ open: false, editing: null });
    const [success, setSuccess] = useState<{ open: boolean; mode: CarrierSuccessMode }>({ open: false, mode: "vehicle-created" });
    const sequence = useRef(0);
    const mounted = useRef(true);
    const deletions = useRef(new Set<number>());

    const load = useCallback(async () => {
        const revision = ++sequence.current;
        if (!Number.isSafeInteger(carrierId) || carrierId <= 0) {
            setCarrier(null);
            setError("El transportista no es válido.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const next = await getCarrier(carrierId);
            if (mounted.current && revision === sequence.current) setCarrier(next);
        } catch {
            if (mounted.current && revision === sequence.current) setError("No se pudo cargar el transportista. Revisa la conexión e inténtalo nuevamente.");
        } finally {
            if (mounted.current && revision === sequence.current) setLoading(false);
        }
    }, [carrierId]);

    useEffect(() => {
        mounted.current = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial API loading shares the explicit retry handler.
        void load();
        return () => { mounted.current = false; };
    }, [load]);

    const add = () => {
        if (isVehicles) setVehicleForm({ open: true, editing: null });
        else setDriverForm({ open: true, editing: null });
    };
    const saveVehicle = async (values: VehicleFormValues) => {
        const input = toVehicleInput(values);
        if (vehicleForm.editing) await updateVehicle(vehicleForm.editing.id, carrierId, input);
        else await createVehicle(carrierId, input);
        await load();
        setVehicleForm(current => ({ ...current, open: false }));
        setSuccess({ open: true, mode: vehicleForm.editing ? "vehicle-updated" : "vehicle-created" });
    };
    const saveDriver = async (values: DriverFormValues) => {
        const input = toDriverInput(values);
        if (driverForm.editing) await updateDriver(driverForm.editing.id, input);
        else await createDriver(carrierId, input);
        await load();
        setDriverForm(current => ({ ...current, open: false }));
        setSuccess({ open: true, mode: driverForm.editing ? "driver-updated" : "driver-created" });
    };
    const remove = async (recordId: number) => {
        if (deletions.current.has(recordId)) return;
        deletions.current.add(recordId);
        try {
            if (isVehicles) await deleteVehicle(recordId);
            else await deleteDriver(recordId);
            await load();
        } catch {
            setError("No se pudo eliminar el registro. Puede tener asignaciones de transporte asociadas.");
        } finally { deletions.current.delete(recordId); }
    };
    const query = search.trim().toLocaleLowerCase("es-PE");
    const currentCarrier = carrier?.id === carrierId ? carrier : null;
    const vehicles = (currentCarrier?.vehiculos ?? []).filter(row => row.placa.toLocaleLowerCase("es-PE").includes(query));
    const drivers = (currentCarrier?.choferes ?? []).filter(row => `${row.nombre} ${row.telefono} ${row.correo}`.toLocaleLowerCase("es-PE").includes(query));
    const clearFilters = () => setSearch("");

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            {currentCarrier ? <ContextBanner ariaLabel={`Transportista ${currentCarrier.nombre}`}
                eyebrow={{ icon: <Building2 size={16} />, label: "Transportista" }} title={currentCarrier.nombre}
                caption={isVehicles ? "Vehículos del transportista" : "Choferes del transportista"} image={TransportImage} />
                : loading ? <ContextBannerPlaceholder /> : null}
            <PageHeader icon={isVehicles ? <Truck /> : <UserRound />}
                title={isVehicles ? "Gestión de Vehículos" : "Gestión de Choferes"}
                description={isVehicles ? "Administra los vehículos registrados para este transportista." : "Administra los choferes registrados para este transportista."}
                action={<Button size="xl" onClick={add} disabled={!currentCarrier || loading}>
                    <Plus size={20} strokeWidth={2.5} /> {isVehicles ? "Agregar vehículo" : "Agregar chofer"}
                </Button>} />
            <FilterBar canClear={search !== ""} onClear={clearFilters} className="mb-6">
                <FilterSearch value={search} onChange={setSearch} placeholder={isVehicles ? "Buscar por placa..." : "Buscar por nombre, teléfono o correo..."} />
            </FilterBar>
            {isVehicles ? <CarrierVehiclesTable data={vehicles} hasActiveFilters={search !== ""} onClearFilters={clearFilters}
                isLoading={loading} error={error} onRetry={load} onAdd={add}
                onEdit={editing => setVehicleForm({ open: true, editing })} onDelete={recordId => void remove(recordId)} />
                : <CarrierDriversTable data={drivers} hasActiveFilters={search !== ""} onClearFilters={clearFilters}
                    isLoading={loading} error={error} onRetry={load} onAdd={add}
                    onEdit={editing => setDriverForm({ open: true, editing })} onDelete={recordId => void remove(recordId)} />}
            <CarrierVehicleModal carrier={currentCarrier} open={vehicleForm.open}
                onOpenChange={open => setVehicleForm(current => ({ ...current, open }))}
                mode={vehicleForm.editing ? "edit" : "create"}
                initialValues={vehicleForm.editing ? {
                    placa: vehicleForm.editing.placa, volumen: String(vehicleForm.editing.volumen),
                    ancho: String(vehicleForm.editing.ancho), altura: String(vehicleForm.editing.altura),
                    profundidad: String(vehicleForm.editing.profundidad), pesoNeto: String(vehicleForm.editing.pesoNeto), pesoBruto: String(vehicleForm.editing.pesoBruto),
                } : undefined} onSuccess={saveVehicle} />
            <CarrierDriverModal carrier={currentCarrier} open={driverForm.open}
                onOpenChange={open => setDriverForm(current => ({ ...current, open }))}
                mode={driverForm.editing ? "edit" : "create"} initialValues={driverForm.editing ?? undefined} onSuccess={saveDriver} />
            <CarrierSuccessModal open={success.open} mode={success.mode} onOpenChange={open => setSuccess(current => ({ ...current, open }))} />
        </div>
    );
}
