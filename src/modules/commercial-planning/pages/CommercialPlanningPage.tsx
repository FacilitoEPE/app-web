import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Building2, Contact, FileSpreadsheet, UserPlus } from "lucide-react";
import ClientsFilters from "@/modules/commercial-planning/components/ClientsFilters";
import ClientsTable from "@/modules/commercial-planning/components/ClientsTable";
import ClientFormModal from "@/modules/commercial-planning/components/ClientFormModal";
import ClientSuccessModal from "@/modules/commercial-planning/components/ClientSuccessModal";
import CommercialContractsSubView from "@/modules/commercial-planning/components/CommercialContractsSubView";
import SegmentedTabs, { type SegmentedTabItem } from "@/shared/components/SegmentedTabs";
import PageHeader from "@/shared/layout/PageHeader";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { deleteClienteNegocio, getClientesNegocio } from "@/modules/clients/api/cliente-negocio.api";
import type { ClienteNegocio } from "@/modules/clients/api/cliente-negocio.mapper";
import { createInFlightGuard } from "@/shared/utils/inFlightGuard";

export default function CommercialPlanningPage() {
    const [clients, setClients] = useState<ClienteNegocio[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [type, setType] = useState("");
    const [activeSection, setActiveSection] = useState<"clientes" | "contratos">("clientes");
    const deleteGuard = useRef(createInFlightGuard());
    const loadSequence = useRef(0);

    /** Solo la última carga pedida actualiza la lista; recargar no desmonta la tabla */
    const loadClients = useCallback(async () => {
        const request = ++loadSequence.current;
        try {
            const items = await getClientesNegocio();
            if (request !== loadSequence.current) return;
            setClients(items);
            setLoadError(null);
        } catch {
            if (request === loadSequence.current) {
                setLoadError(
                    "No se pudieron cargar los clientes. Verifica la conexión e inténtalo nuevamente.",
                );
            }
        } finally {
            if (request === loadSequence.current) setIsLoading(false);
        }
    }, []);

    // Carga inicial desde la API: el estado se actualiza al resolverse la petición.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Initial remote loading uses the shared retry callback.
        void loadClients();
    }, [loadClients]);

    const retry = () => {
        setIsLoading(true);
        void loadClients();
    };

    const clearFilters = () => {
        setSearch("");
        setType("");
    };
    const hasActiveFilters = search !== "" || type !== "";
    const filteredData = useMemo(() => {
        const searchLower = search.trim().toLowerCase();
        return clients.filter(
            (client) =>
                (client.nombreEmpresa.toLowerCase().includes(searchLower) ||
                    client.nombreContacto.toLowerCase().includes(searchLower)) &&
                (!type || client.tipoCliente === type),
        );
    }, [clients, search, type]);

    const handleCreated = () => {
        setIsCreateModalOpen(false);
        setIsSuccessModalOpen(true);
        void loadClients();
    };

    const handleDelete = async (client: ClienteNegocio) => {
        if (!deleteGuard.current.acquire()) return;
        setDeleteError(null);
        try {
            await deleteClienteNegocio(client.clienteNegocioId);
            setClients((current) =>
                current.filter((item) => item.clienteNegocioId !== client.clienteNegocioId),
            );
        } catch {
            setDeleteError(
                `No se pudo eliminar ${client.nombreEmpresa}. Puede tener información vinculada o haber ocurrido un error de conexión.`,
            );
        } finally {
            deleteGuard.current.release();
        }
    };

    const sectionTabs: readonly SegmentedTabItem[] = [
        { id: "clientes", label: "Clientes", icon: Building2, count: clients.length },
        { id: "contratos", label: "Contratos", icon: FileSpreadsheet },
    ];

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            <PageHeader
                icon={<Contact size={24} strokeWidth={2.5} />}
                title="Gestión Comercial"
                description="Administra los clientes y planifica la gestión comercial."
                action={
                    activeSection === "clientes" ? (
                        <Button size="xl" onClick={() => setIsCreateModalOpen(true)}>
                            <UserPlus size={20} strokeWidth={2.5} /> Nuevo Cliente
                        </Button>
                    ) : null
                }
            />

            <SegmentedTabs
                tabs={sectionTabs}
                value={activeSection}
                onChange={(v) => setActiveSection(v as "clientes" | "contratos")}
                className="mb-6"
            />

            {activeSection === "contratos" ? (
                <CommercialContractsSubView />
            ) : (
                <>
                    <ClientsFilters
                        search={search}
                        onSearchChange={setSearch}
                        type={type}
                        onTypeChange={setType}
                        hasActiveFilters={hasActiveFilters}
                        onClear={clearFilters}
                    />

                    {deleteError && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertCircle />
                            <AlertDescription>{deleteError}</AlertDescription>
                        </Alert>
                    )}

                    <ClientsTable
                        data={filteredData}
                        isLoading={isLoading}
                        loadError={loadError}
                        onRetry={retry}
                        hasActiveFilters={hasActiveFilters}
                        onClearFilters={clearFilters}
                        onChanged={() => void loadClients()}
                        onDelete={handleDelete}
                    />
                </>
            )}

            <ClientFormModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                onSuccess={handleCreated}
            />
            <ClientSuccessModal open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen} />
        </div>
    );
}
