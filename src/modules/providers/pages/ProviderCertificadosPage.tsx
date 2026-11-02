import { usesV1 } from '@/shared/api/data-contract';
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import PageHeader from "@/shared/layout/PageHeader";
import ProviderContextBanner from "@/modules/providers/components/ProviderContextBanner";
import ProviderCertificadosTable from "@/modules/providers/components/ProviderCertificadosTable";
import ProviderCertificadoModal from "@/modules/providers/components/ProviderCertificadoModal";
import ProviderSuccessModal, { type ProviderSuccessMode } from "@/modules/providers/components/ProviderSuccessModal";
import { getProveedor } from "@/modules/providers/api/proveedor.api";
import type { Proveedor } from "@/modules/providers/api/proveedor.mapper";
import { addCertificado, updateCertificado, useProviderLocalData } from "@/modules/providers/providerLocalData.store";
import type { CertificadoFormValues, CertificadoLocal } from "@/modules/providers/providerCertificado.utils";
import { PageError, PageLoading } from "@/shared/components/PageState";

const fullName = (provider: Proveedor) => `${provider.nombres} ${provider.apellido}`;

/**
 * Gestión de los certificados de un proveedor: su lista, el registro de nuevos y la edición de los existentes.
 * Los certificados viven en memoria (providerLocalData.store.ts) hasta que se conecte el servicio.
 */
export default function ProviderCertificadosPage() {
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

    return <ProviderCertificadosView provider={provider} />;
}

function ProviderCertificadosView({ provider }: { provider: Proveedor }) {
    const { certificados } = useProviderLocalData();
    const providerCertificates = certificados[provider.proveedorId] ?? [];
    // Se conserva el certificado al cerrar para que el modal no se vacíe durante su animación de salida
    const [form, setForm] = useState<{ open: boolean; certificate: CertificadoLocal | null }>({ open: false, certificate: null });
    const [success, setSuccess] = useState<{ open: boolean; mode: ProviderSuccessMode }>({ open: false, mode: "certificado" });

    const handleSave = async (values: CertificadoFormValues, file: File | null) => {
        const editing = form.certificate;
        if (editing) {
            await updateCertificado(provider.proveedorId, editing.certificadoId, values, file ?? undefined);
        } else if (file || usesV1()) {
            await addCertificado(provider.proveedorId, values, file);
        }
        setForm((current) => ({ ...current, open: false }));
        setSuccess({ open: true, mode: editing ? "certificado-edit" : "certificado" });
    };

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            <ProviderContextBanner
                provider={provider}
                caption="Certificados · documentos del proveedor"
                stats={[{ label: providerCertificates.length === 1 ? "certificado" : "certificados", value: String(providerCertificates.length) }]}
            />

            <PageHeader
                icon={<ShieldCheck size={24} strokeWidth={2.5} />}
                title="Gestión de Certificados"
                description={`Certificados de ${fullName(provider)}.`}
                action={
                    <Button size="xl" onClick={() => setForm({ open: true, certificate: null })}>
                        <Plus size={20} strokeWidth={2.5} /> Registrar certificado
                    </Button>
                }
            />

            <ProviderCertificadosTable
                certificates={providerCertificates}
                onRegister={() => setForm({ open: true, certificate: null })}
                onEdit={(certificate) => setForm({ open: true, certificate })}
            />

            <ProviderCertificadoModal
                open={form.open}
                onOpenChange={(open) => setForm((current) => ({ ...current, open }))}
                providerName={fullName(provider)}
                certificate={form.certificate}
                onSave={handleSave}
            />

            <ProviderSuccessModal open={success.open} onOpenChange={(open) => setSuccess((current) => ({ ...current, open }))} mode={success.mode} />
        </div>
    );
}
