import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { LandPlot, Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import PageHeader from "@/shared/layout/PageHeader";
import ProviderFincasTable from "@/modules/providers/components/ProviderFincasTable";
import ConfirmModal from "@/shared/components/ConfirmModal";
import ProviderContextBanner from "@/modules/providers/components/ProviderContextBanner";
import ProviderFincaModal from "@/modules/providers/components/ProviderFincaModal";
import ProviderFincaViewModal from "@/modules/providers/components/ProviderFincaViewModal";
import ProviderSuccessModal, { type ProviderSuccessMode } from "@/modules/providers/components/ProviderSuccessModal";
import { getProveedor } from "@/modules/providers/api/proveedor.api";
import type { Proveedor } from "@/modules/providers/api/proveedor.mapper";
import { addFinca, removeFinca, updateFinca, useProviderLocalData } from "@/modules/providers/providerLocalData.store";
import type { Finca } from "@/modules/providers/providerFinca.utils";
import { PageError, PageLoading } from "@/shared/components/PageState";
import { formatDecimal } from "@/shared/utils/format";

const fullName = (provider: Proveedor) => `${provider.nombres} ${provider.apellido}`;

/** Gestión de las fincas de un proveedor: su lista y el registro de nuevas fincas. */
export default function ProviderFincasPage() {
    const { id } = useParams<{ id: string }>();
    const providerId = Number(id);
    const [provider, setProvider] = useState<Proveedor | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadProvider = useCallback(async () => {
        if (!Number.isInteger(providerId) || providerId < 1) {
            setError("El proveedor no es válido.");
            setIsLoading(false);
            return;
        }
        try {
            setError(null);
            setProvider(await getProveedor(providerId));
        } catch {
            setError("No se pudo cargar el proveedor desde el backend.");
        } finally {
            setIsLoading(false);
        }
    }, [providerId]);

    // Carga inicial desde la API: el estado se actualiza al resolverse la petición.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void loadProvider(); }, [loadProvider]);

    if (isLoading) return <PageLoading label="Cargando proveedor..." />;

    if (!provider) {
        return (
            <PageError
                icon={<UserRound />}
                title="Proveedor no disponible"
                message={error ?? "No se pudo cargar el proveedor."}
                onRetry={() => { setIsLoading(true); void loadProvider(); }}
                back={{ to: "/proveedores", label: "Volver a proveedores" }}
            />
        );
    }

    return <ProviderFincasView provider={provider} />;
}

function ProviderFincasView({ provider }: { provider: Proveedor }) {
    const { fincas } = useProviderLocalData();
    const providerFincas = fincas[provider.proveedorId] ?? [];
    // Se conserva la posición al cerrar para que los modales no se vacíen durante su animación de salida
    const [form, setForm] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
    const [viewing, setViewing] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
    const [deleting, setDeleting] = useState<{ open: boolean; index: number | null }>({ open: false, index: null });
    const [success, setSuccess] = useState<{ open: boolean; mode: ProviderSuccessMode }>({ open: false, mode: "finca" });

    const at = (index: number | null) => (index === null ? null : providerFincas[index] ?? null);
    const editing = at(form.index);

    const handleSave = async (finca: Finca) => {
        if (form.index === null) await addFinca(provider.proveedorId, finca);
        else await updateFinca(provider.proveedorId, form.index, finca);
        setForm((current) => ({ ...current, open: false }));
        setSuccess({ open: true, mode: form.index === null ? "finca" : "finca-edit" });
    };

    const handleDelete = async () => {
        if (deleting.index !== null) await removeFinca(provider.proveedorId, deleting.index);
        setDeleting((current) => ({ ...current, open: false }));
    };

    // Al editar, el nombre de la propia finca no cuenta como repetido
    const otherFincas = providerFincas.filter((_, position) => position !== form.index);

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            <ProviderContextBanner
                provider={provider}
                caption="Fincas · cultivos y superficie"
                stats={[
                    { label: providerFincas.length === 1 ? "finca" : "fincas", value: String(providerFincas.length) },
                    { label: "ha totales", value: formatDecimal(providerFincas.reduce((sum, finca) => sum + finca.haTotal, 0)) },
                    { label: "ha en cultivo", value: formatDecimal(providerFincas.reduce((sum, finca) => sum + finca.haCultivo, 0)) },
                ]}
            />

            <PageHeader
                icon={<LandPlot size={24} strokeWidth={2.5} />}
                title="Gestión de Fincas"
                description={`Fincas registradas de ${fullName(provider)}.`}
                action={
                    <Button size="xl" onClick={() => setForm({ open: true, index: null })}>
                        <Plus size={20} strokeWidth={2.5} /> Registrar finca
                    </Button>
                }
            />

            <ProviderFincasTable
                fincas={providerFincas}
                onRegister={() => setForm({ open: true, index: null })}
                onView={(_, index) => setViewing({ open: true, index })}
                onEdit={(_, index) => setForm({ open: true, index })}
                onDelete={(_, index) => setDeleting({ open: true, index })}
            />

            <ProviderFincaModal
                open={form.open}
                onOpenChange={(open) => setForm((current) => ({ ...current, open }))}
                providerName={fullName(provider)}
                registeredFincas={otherFincas}
                finca={editing}
                onSave={handleSave}
            />

            <ProviderFincaViewModal
                open={viewing.open}
                onOpenChange={(open) => setViewing((current) => ({ ...current, open }))}
                providerName={fullName(provider)}
                finca={at(viewing.index)}
            />

            <ConfirmModal
                open={deleting.open}
                onOpenChange={(open) => setDeleting((current) => ({ ...current, open }))}
                icon={<Trash2 size={28} strokeWidth={2.25} />}
                title="¿Eliminar finca?"
                description={<>Se eliminará la finca <strong className="font-bold text-ink">{at(deleting.index)?.nombre ?? ""}</strong> de este proveedor. Esta acción no se puede deshacer.</>}
                confirmLabel="Sí, eliminar"
                onConfirm={handleDelete}
            />

            <ProviderSuccessModal open={success.open} onOpenChange={(open) => setSuccess((current) => ({ ...current, open }))} mode={success.mode} />
        </div>
    );
}
