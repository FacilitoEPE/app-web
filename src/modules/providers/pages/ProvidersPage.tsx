import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Truck, UserPlus, AlertCircle, LandPlot, ShieldCheck, Sprout, Users } from "lucide-react";
import ProvidersTable from "@/modules/providers/components/ProvidersTable";
import ProviderFormModal from "@/modules/providers/components/ProviderFormModal";
import ProviderSuccessModal from "@/modules/providers/components/ProviderSuccessModal";
import PageHeader from "@/shared/layout/PageHeader";
import MetricCards, { type Metric } from "@/shared/components/MetricCards";
import ProvidersFilters from "@/modules/providers/components/ProvidersFilters";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { createProveedor, deleteProveedor, getProveedores, updateProveedor } from "@/modules/providers/api/proveedor.api";
import type { ProveedorInput } from "@/modules/providers/api/proveedor.dto";
import type { Proveedor } from "@/modules/providers/api/proveedor.mapper";
import { useProviderLocalData } from "@/modules/providers/providerLocalData.store";
import { formatDecimal } from "@/shared/utils/format";
import { createInFlightGuard } from "@/shared/utils/inFlightGuard";

const byId = (left: Proveedor, right: Proveedor) => left.proveedorId - right.proveedorId;

export default function ProvidersPage() {
    const [providers, setProviders] = useState<Proveedor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [mutationError, setMutationError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [success, setSuccess] = useState<{ open: boolean; mode: "create" | "edit" }>({ open: false, mode: "create" });
    const [search, setSearch] = useState("");
    const [zoneFilter, setZoneFilter] = useState("all");
    const [mutationGuard] = useState(createInFlightGuard);
    const loadSequence = useRef(0);
    const { fincas, certificados } = useProviderLocalData();

    const loadProviders = useCallback(async () => {
        const request = ++loadSequence.current;
        try {
            const data = await getProveedores();
            if (request !== loadSequence.current) return;
            setProviders(data);
            setLoadError(null);
        } catch {
            if (request === loadSequence.current) setLoadError("No se pudieron cargar los proveedores.");
        } finally {
            if (request === loadSequence.current) setIsLoading(false);
        }
    }, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void loadProviders(); }, [loadProviders]);

    const retry = () => {
        setIsLoading(true);
        void loadProviders();
    };

    const zoneOptions = useMemo(() => {
        const unique = Array.from(new Set(providers.map((item) => item.zona).filter(Boolean)));
        return unique.sort((a, b) => a.localeCompare(b, "es")).map((zone) => ({ value: zone, label: zone }));
    }, [providers]);

    const hasActiveFilters = search !== "" || zoneFilter !== "all";
    const clearFilters = () => {
        setSearch("");
        setZoneFilter("all");
    };

    const filteredProviders = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        return providers.filter((provider) => {
            if (zoneFilter !== "all" && provider.zona !== zoneFilter) return false;
            if (!query) return true;
            return `${provider.nombres} ${provider.apellido} ${provider.tipoDocumento} ${provider.nmrDocumento} ${provider.email} ${provider.zona}`
                .toLocaleLowerCase()
                .includes(query);
        });
    }, [providers, search, zoneFilter]);

    const summaryMetrics = useMemo<Metric[]>(() => {
        const allFincas = Object.values(fincas).flat();
        const totalHaCultivo = allFincas.reduce((sum, item) => sum + item.haCultivo, 0);
        const totalCerts = Object.values(certificados).flat().length;
        return [
            {
                title: "Proveedores",
                value: String(providers.length),
                unit: providers.length === 1 ? "registrado" : "registrados",
                description: "Padrón activo de productores y acopiadores",
                icon: Users,
            },
            {
                title: "Fincas",
                value: String(allFincas.length),
                unit: allFincas.length === 1 ? "parcela" : "parcelas",
                description: "Parcelas y fundos empadronados",
                icon: LandPlot,
            },
            {
                title: "Superficie cultivo",
                value: formatDecimal(totalHaCultivo),
                unit: "ha",
                description: "Hectáreas productivas declaradas",
                icon: Sprout,
                warm: true,
            },
            {
                title: "Certificados",
                value: String(totalCerts),
                unit: totalCerts === 1 ? "documento" : "documentos",
                description: "SENASA, GlobalG.A.P. y orgánicos",
                icon: ShieldCheck,
            },
        ];
    }, [providers.length, fincas, certificados]);

    const saveProvider = async (providerId: number | null, input: ProveedorInput) => {
        setMutationError(null);
        const saved = providerId === null ? await createProveedor(input) : await updateProveedor(providerId, input);
        setProviders((current) => (providerId === null
            ? [...current, saved].sort(byId)
            : current.map((provider) => (provider.proveedorId === providerId ? saved : provider))));
        setSuccess({ open: true, mode: providerId === null ? "create" : "edit" });
        return saved;
    };

    const removeProvider = async (provider: Proveedor) => {
        if (!mutationGuard.acquire()) return;
        setMutationError(null);
        try {
            await deleteProveedor(provider.proveedorId);
            setProviders((current) => current.filter((item) => item.proveedorId !== provider.proveedorId));
        } catch {
            setMutationError(`No se pudo eliminar a ${provider.nombres} ${provider.apellido}. Puede tener registros asociados.`);
        } finally {
            mutationGuard.release();
        }
    };

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            <PageHeader
                icon={<Truck size={24} strokeWidth={2.5} />}
                title="Gestión de Proveedores"
                description="Administra los proveedores y sus parcelas registrados en el sistema."
                action={
                    <Button size="xl" onClick={() => setIsCreateModalOpen(true)}>
                        <UserPlus size={20} strokeWidth={2.5} /> Nuevo Proveedor
                    </Button>
                }
            />

            <div className="mb-8">
                <MetricCards metrics={summaryMetrics} label="Resumen del padrón de proveedores" />
            </div>

            <ProvidersFilters
                search={search}
                onSearchChange={setSearch}
                zoneFilter={zoneFilter}
                onZoneFilterChange={setZoneFilter}
                zoneOptions={zoneOptions}
                hasActiveFilters={hasActiveFilters}
                onClear={clearFilters}
            />

            {mutationError && (
                <Alert variant="destructive" className="mb-6">
                    <AlertCircle />
                    <AlertDescription>{mutationError}</AlertDescription>
                </Alert>
            )}

            <ProvidersTable
                data={filteredProviders}
                isLoading={isLoading}
                loadError={loadError}
                onRetry={retry}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearFilters}
                mutationGuard={mutationGuard}
                onSave={saveProvider}
                onDelete={removeProvider}
            />

            <ProviderFormModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                mode="create"
                mutationGuard={mutationGuard}
                onSave={saveProvider}
            />

            <ProviderSuccessModal
                open={success.open}
                onOpenChange={(open) => setSuccess((current) => ({ ...current, open }))}
                mode={success.mode}
            />
        </div>
    );
}
