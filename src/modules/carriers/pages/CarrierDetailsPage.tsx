import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Truck, UserRound, Building2, AlertCircle, Pencil, PackageCheck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import PageHeader from "@/shared/layout/PageHeader";
import FilterBar, { FilterSearch } from "@/shared/components/FilterBar";
import SegmentedTabs, { type SegmentedTabItem } from "@/shared/components/SegmentedTabs";
import LinkedCard, { LinkedRow } from "@/shared/components/LinkedCard";
import CarrierInfoCard from "@/modules/carriers/components/CarrierInfoCard";
import CarrierMetricCards from "@/modules/carriers/components/CarrierMetricCards";
import CarrierFormModal from "@/modules/carriers/components/CarrierFormModal";
import CarrierVehiclesTable from "@/modules/carriers/components/CarrierVehiclesTable";
import CarrierDriversTable from "@/modules/carriers/components/CarrierDriversTable";
import CarrierVehicleModal from "@/modules/carriers/components/CarrierVehicleModal";
import CarrierDriverModal from "@/modules/carriers/components/CarrierDriverModal";
import CarrierSuccessModal, { type CarrierSuccessMode } from "@/modules/carriers/components/CarrierSuccessModal";
import { createDriver, createVehicle, deleteDriver, deleteVehicle, getCarrier, updateCarrier, updateDriver, updateVehicle } from "@/modules/carriers/api/carrier.api";
import type { Carrier, Driver, Vehicle } from "@/modules/carriers/carriers.data";
import { setCarrierExtras, useCarrierExtras } from "@/modules/carriers/carrierExtras.store";
import { splitCarrierValues, toCarrierProfile, type CarrierFormValues } from "@/modules/carriers/carrierProfile.utils";
import { toDriverInput, toVehicleInput, type DriverFormValues, type VehicleFormValues } from "@/modules/carriers/carrierRecords.utils";
import { PageError, PageLoading } from "@/shared/components/PageState";

type DetailTab = "vehiculos" | "choferes";
const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function CarrierDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const carrierId = Number(id);
    const [carrier, setCarrier] = useState<Carrier | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadCarrier = useCallback(async () => {
        if (!Number.isInteger(carrierId) || carrierId < 1) {
            setError("La empresa de transporte no es válida.");
            setIsLoading(false);
            return;
        }
        try {
            setError(null);
            setCarrier(await getCarrier(carrierId));
        } catch {
            setError("No se pudo cargar la empresa de transporte desde el backend.");
        } finally {
            setIsLoading(false);
        }
    }, [carrierId]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void loadCarrier(); }, [loadCarrier]);

    if (isLoading) return <PageLoading label="Cargando empresa de transporte..." />;
    if (!carrier) {
        return (
            <PageError
                icon={<Building2 />}
                title="Empresa no disponible"
                message={error ?? "No se pudo cargar la empresa de transporte."}
                onRetry={() => { setIsLoading(true); void loadCarrier(); }}
                back={{ to: "/transportistas", label: "Volver a transporte" }}
            />
        );
    }
    return <CarrierDetailsView carrier={carrier} onRefresh={loadCarrier} />;
}

function CarrierDetailsView({ carrier, onRefresh }: { carrier: Carrier; onRefresh: () => Promise<void> }) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab: DetailTab = searchParams.get("tab") === "choferes" ? "choferes" : "vehiculos";
    const [search, setSearch] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [vehicleModal, setVehicleModal] = useState<{ open: boolean; editing: Vehicle | null }>({ open: false, editing: null });
    const [driverModal, setDriverModal] = useState<{ open: boolean; editing: Driver | null }>({ open: false, editing: null });
    const [editingCarrier, setEditingCarrier] = useState(false);
    const [success, setSuccess] = useState<{ open: boolean; mode: CarrierSuccessMode }>({ open: false, mode: "vehicle-created" });
    const extras = useCarrierExtras();
    const profile = useMemo(() => toCarrierProfile(carrier, extras[carrier.id]), [carrier, extras]);
    const carrierVehicles = carrier.vehiculos;
    const carrierDrivers = carrier.choferes;
    const showSuccess = (mode: CarrierSuccessMode) => setSuccess({ open: true, mode });

    const filteredVehicles = useMemo(() => {
        const query = normalize(search.trim());
        return carrierVehicles.filter((row) => normalize(row.placa).includes(query));
    }, [carrierVehicles, search]);
    const filteredDrivers = useMemo(() => {
        const query = normalize(search.trim());
        return carrierDrivers.filter((row) => normalize(`${row.nombre} ${row.correo} ${row.telefono}`).includes(query));
    }, [carrierDrivers, search]);

    const tabs: readonly SegmentedTabItem[] = [
        { id: "vehiculos", label: "Vehículos", icon: Truck, count: carrierVehicles.length },
        { id: "choferes", label: "Choferes", icon: UserRound, count: carrierDrivers.length },
    ];
    const isVehicles = activeTab === "vehiculos";
    const hasActiveFilters = search !== "";
    const clearFilters = () => setSearch("");
    const changeTab = (value: string) => { setSearchParams({ tab: value }); clearFilters(); };

    async function saveVehicle(values: VehicleFormValues) {
        const input = toVehicleInput(values);
        if (vehicleModal.editing) await updateVehicle(vehicleModal.editing.id, carrier.id, input);
        else await createVehicle(carrier.id, input);
        await onRefresh();
        setVehicleModal({ open: false, editing: null });
        showSuccess(vehicleModal.editing ? "vehicle-updated" : "vehicle-created");
    }

    async function saveDriver(values: DriverFormValues) {
        const input = toDriverInput(values);
        if (driverModal.editing) await updateDriver(driverModal.editing.id, input);
        else await createDriver(carrier.id, input);
        await onRefresh();
        setDriverModal({ open: false, editing: null });
        showSuccess(driverModal.editing ? "driver-updated" : "driver-created");
    }

    async function saveCarrier(values: CarrierFormValues) {
        const { input, extras: carrierExtras } = splitCarrierValues(values);
        await updateCarrier(carrier.id, input, carrierExtras);
        await setCarrierExtras(carrier.id, carrierExtras);
        await onRefresh();
        setEditingCarrier(false);
        showSuccess("carrier-updated");
    }

    async function removeVehicle(id: number) {
        try { await deleteVehicle(id); await onRefresh(); }
        catch { setError("No se puede eliminar el vehículo si el backend aún tiene asignaciones de transporte."); }
    }
    async function removeDriver(id: number) {
        try { await deleteDriver(id); await onRefresh(); }
        catch { setError("No se puede eliminar el chofer si el backend aún tiene asignaciones de transporte."); }
    }

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            <PageHeader
                icon={<Building2 size={24} strokeWidth={2.5} />}
                title="Detalle de Transporte"
                description="Datos del transportista, sus vehículos y sus choferes."
                action={(
                    <>
                        <Button variant="outline" size="xl" onClick={() => setEditingCarrier(true)}><Pencil size={19} strokeWidth={2.5} /> Editar transportista</Button>
                        {isVehicles ? (
                            <Button size="xl" onClick={() => setVehicleModal({ open: true, editing: null })}><Truck size={20} strokeWidth={2.5} /> Registrar vehículo</Button>
                        ) : (
                            <Button size="xl" onClick={() => setDriverModal({ open: true, editing: null })}><UserRound size={20} strokeWidth={2.5} /> Registrar chofer</Button>
                        )}
                    </>
                )}
            />
            {error && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 lg:grid-cols-[1.95fr_1fr]">
                <CarrierInfoCard carrier={profile} />
                <CarrierMetricCards vehicles={carrierVehicles} drivers={carrierDrivers.length} />
            </div>

            <div className="mt-6">
                <LinkedCard
                    icon={<PackageCheck size={22} strokeWidth={2.2} />}
                    title="Monitoreo de despachos"
                    description="Consulta el estado de los viajes informado por los choferes."
                    manageLabel="Ver en Logística y Despacho"
                    onManage={() => navigate("/logistica-despacho")}
                    stats={[
                        { label: "Unidades activas", value: carrierVehicles.length },
                    ]}
                    isEmpty={false}
                    emptyMessage=""
                    emptyActionLabel=""
                >
                    <LinkedRow
                        icon={<PackageCheck size={16} strokeWidth={2.2} />}
                        title="Monitoreo de Viajes y Despachos"
                        subtitle="Seguimiento de las etapas informadas por el chofer"
                        trailing={
                            <Button variant="outline" size="sm" onClick={() => navigate("/logistica-despacho")}>
                                Ver despachos
                            </Button>
                        }
                    />
                </LinkedCard>
            </div>

            <SegmentedTabs tabs={tabs} value={activeTab} onChange={changeTab} className="mt-8 mb-8" />
            <FilterBar onClear={clearFilters} canClear={hasActiveFilters} className="mb-8">
                <FilterSearch value={search} onChange={setSearch} placeholder={isVehicles ? "Buscar placa..." : "Buscar chofer, correo o teléfono..."} />
            </FilterBar>
            {isVehicles ? (
                <CarrierVehiclesTable data={filteredVehicles} hasActiveFilters={hasActiveFilters} onClearFilters={clearFilters}
                    onEdit={(vehicle) => setVehicleModal({ open: true, editing: vehicle })} onAdd={() => setVehicleModal({ open: true, editing: null })} onDelete={removeVehicle} />
            ) : (
                <CarrierDriversTable data={filteredDrivers} hasActiveFilters={hasActiveFilters} onClearFilters={clearFilters}
                    onEdit={(driver) => setDriverModal({ open: true, editing: driver })} onAdd={() => setDriverModal({ open: true, editing: null })} onDelete={removeDriver} />
            )}
            <CarrierVehicleModal open={vehicleModal.open} onOpenChange={(open) => setVehicleModal((current) => ({ ...current, open }))} carrier={carrier}
                onSuccess={saveVehicle} mode={vehicleModal.editing ? "edit" : "create"}
                initialValues={vehicleModal.editing ? {
                    placa: vehicleModal.editing.placa, ancho: String(vehicleModal.editing.ancho), altura: String(vehicleModal.editing.altura),
                    profundidad: String(vehicleModal.editing.profundidad), volumen: String(vehicleModal.editing.volumen),
                    pesoNeto: String(vehicleModal.editing.pesoNeto), pesoBruto: String(vehicleModal.editing.pesoBruto),
                } : undefined} />
            <CarrierDriverModal open={driverModal.open} onOpenChange={(open) => setDriverModal((current) => ({ ...current, open }))} carrier={carrier}
                onSuccess={saveDriver} mode={driverModal.editing ? "edit" : "create"}
                initialValues={driverModal.editing ? { nombre: driverModal.editing.nombre, telefono: driverModal.editing.telefono, correo: driverModal.editing.correo } : undefined} />
            <CarrierFormModal open={editingCarrier} onOpenChange={setEditingCarrier} mode="edit" initialValues={profile} onSuccess={saveCarrier} />
            <CarrierSuccessModal open={success.open} onOpenChange={(open) => setSuccess((current) => ({ ...current, open }))} mode={success.mode} />
        </div>
    );
}
