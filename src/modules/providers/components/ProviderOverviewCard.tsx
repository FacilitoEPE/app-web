import { ExternalLink, Fingerprint, Mail, MapPin, Phone, Sprout, Tag } from "lucide-react";
import EntityOverviewCard from "@/shared/components/EntityOverviewCard";
import type { Proveedor } from "@/modules/providers/api/proveedor.mapper";

interface ProviderOverviewCardProps {
    provider: Proveedor;
    /** Etiqueta sobre el nombre; por defecto "Proveedor agrícola" (en campaña: Productor o Acopiador) */
    eyebrow?: string;
}

/** Solo se enlaza a documentos http(s): cualquier otro esquema (javascript:, data:) se descarta */
function safeUrl(value: string) {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
    } catch {
        return null;
    }
}

/** Tarjeta principal del detalle: quién es el proveedor y los datos con los que se registró. */
export default function ProviderOverviewCard({ provider, eyebrow = "Proveedor agrícola" }: ProviderOverviewCardProps) {
    const documentUrl = safeUrl(provider.identidadDocUrl);

    return (
        <EntityOverviewCard
            avatar={`${provider.nombres[0] ?? ""}${provider.apellido[0] ?? ""}`.toUpperCase()}
            eyebrow={eyebrow}
            title={`${provider.nombres} ${provider.apellido}`}
            watermark={Sprout}
            chips={[
                { icon: <Fingerprint strokeWidth={2.5} />, label: `${provider.tipoDocumento} ${provider.nmrDocumento}` },
                ...(provider.zona ? [{ icon: <MapPin strokeWidth={2.5} />, label: provider.zona }] : []),
            ]}
            details={[
                { icon: <Phone strokeWidth={2.2} />, label: "Teléfono", value: provider.telefono ? String(provider.telefono) : "—" },
                { icon: <Mail strokeWidth={2.2} />, label: "Correo", value: provider.email || "—" },
                { icon: <Tag strokeWidth={2.2} />, label: "Código lugar de producción", value: provider.codigoLugarProduccion ? String(provider.codigoLugarProduccion) : "—" },
                {
                    icon: <Fingerprint strokeWidth={2.2} />,
                    label: "Documento de identidad",
                    value: documentUrl ? (
                        <a href={documentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand hover:underline">
                            Abrir documento <ExternalLink size={12} aria-hidden="true" />
                        </a>
                    ) : (
                        <span className="text-ink-muted">No disponible</span>
                    ),
                },
            ]}
        />
    );
}
