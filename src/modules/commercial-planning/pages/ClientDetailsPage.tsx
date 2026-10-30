import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CommercialContractsSubView from "@/modules/commercial-planning/components/CommercialContractsSubView";
import { Contact, Pencil } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import PageHeader from "@/shared/layout/PageHeader";
import ClientFormModal from "@/modules/commercial-planning/components/ClientFormModal";
import ClientOverviewCard from "@/modules/commercial-planning/components/ClientOverviewCard";
import ClientSuccessModal from "@/modules/commercial-planning/components/ClientSuccessModal";
import { getClientesNegocio } from "@/modules/clients/api/cliente-negocio.api";
import type { ClienteNegocio } from "@/modules/clients/api/cliente-negocio.mapper";
import { PageError, PageLoading } from "@/shared/components/PageState";

type LoadState =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; client: ClienteNegocio };

/** Detalle de un cliente: sus datos de registro y contacto. */
export default function ClientDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const clientId = Number(id);
    const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
    const [editing, setEditing] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);

    const load = useCallback(async (showLoading: boolean) => {
        if (!Number.isInteger(clientId) || clientId < 1) {
            setLoadState({ status: "error", message: "El cliente no es válido." });
            return;
        }
        if (showLoading) setLoadState({ status: "loading" });
        try {
            const client = (await getClientesNegocio()).find((item) => item.clienteNegocioId === clientId);
            setLoadState(client
                ? { status: "ready", client }
                : { status: "error", message: "No se encontró el cliente solicitado." });
        } catch {
            setLoadState({ status: "error", message: "No se pudo cargar el cliente. Verifica la conexión e inténtalo nuevamente." });
        }
    }, [clientId]);

    // Carga inicial desde la API: el estado se actualiza al resolverse la petición.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void load(true); }, [load]);

    if (loadState.status === "loading") return <PageLoading label="Cargando cliente..." />;

    if (loadState.status === "error") {
        return (
            <PageError
                title="Cliente no disponible"
                message={loadState.message}
                onRetry={() => void load(true)}
                back={{ to: "/planificacion-comercial", label: "Volver a clientes" }}
            />
        );
    }

    const { client } = loadState;

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            <PageHeader
                icon={<Contact size={24} strokeWidth={2.5} />}
                title="Detalle de Cliente"
                description="Datos de registro y contacto del cliente."
                action={
                    <Button variant="outline" size="xl" onClick={() => setEditing(true)}><Pencil size={19} strokeWidth={2.5} /> Editar cliente</Button>
                }
            />

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <ClientOverviewCard client={client} />
            </div>

            <section className="mt-8" aria-label="Contratos del cliente">
                <CommercialContractsSubView clientId={clientId} />
            </section>

            <ClientFormModal
                open={editing}
                onOpenChange={setEditing}
                mode="edit"
                clientId={client.clienteNegocioId}
                initialValues={client}
                onSuccess={() => {
                    setEditing(false);
                    setSuccessOpen(true);
                    void load(false);
                }}
            />

            <ClientSuccessModal open={successOpen} onOpenChange={setSuccessOpen} mode="edit" />
        </div>
    );
}
