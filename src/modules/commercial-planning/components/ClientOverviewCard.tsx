import { Building2, Fingerprint, Mail, MapPin, Phone, UserRound } from "lucide-react";
import EntityOverviewCard from "@/shared/components/EntityOverviewCard";
import type { ClienteNegocio } from "@/modules/clients/api/cliente-negocio.mapper";

const CLIENT_TYPE_LABEL: Record<string, string> = { exportador: "Exportador", industria: "Industria" };

/** Tarjeta principal del detalle: quién es el cliente y cómo contactarlo. */
export default function ClientOverviewCard({ client }: { client: ClienteNegocio }) {
    return (
        <EntityOverviewCard
            avatar={client.nombreEmpresa.trim().charAt(0).toUpperCase() || "C"}
            eyebrow={`Cliente · ${CLIENT_TYPE_LABEL[client.tipoCliente] ?? client.tipoCliente}`}
            title={client.nombreEmpresa}
            watermark={Building2}
            chips={[
                { icon: <Fingerprint strokeWidth={2.5} />, label: `RUC ${client.ruc}` },
                ...(client.ubicacion ? [{ icon: <MapPin strokeWidth={2.5} />, label: client.ubicacion }] : []),
            ]}
            details={[
                { icon: <UserRound strokeWidth={2.2} />, label: "Nombre de contacto", value: client.nombreContacto || "—" },
                { icon: <Phone strokeWidth={2.2} />, label: "Teléfono", value: client.telefono || "—" },
                {
                    icon: <Mail strokeWidth={2.2} />,
                    label: "Correo corporativo",
                    value: client.correoCorporativo
                        ? <a href={`mailto:${client.correoCorporativo}`} className="text-brand hover:underline">{client.correoCorporativo}</a>
                        : "—",
                },
                { icon: <MapPin strokeWidth={2.2} />, label: "Ubicación", value: client.ubicacion || "—" },
            ]}
        />
    );
}
