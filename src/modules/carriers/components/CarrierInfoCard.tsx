import { BadgeCheck, Building2, FileText, IdCard, Mail, MapPin, Phone, Truck, UserRound } from "lucide-react";
import EntityOverviewCard, { type EntityOverviewDetail } from "@/shared/components/EntityOverviewCard";
import { CARRIER_TIPOS, carrierLocation, type CarrierProfile } from "@/modules/carriers/carrierProfile.utils";

const NOT_REGISTERED = "No registrado";

/** Los datos que se muestran dependen del tipo: el independiente tiene documento de identidad y CGN. */
function getDetails(carrier: CarrierProfile): EntityOverviewDetail[] {
    const isPrivado = carrier.tipo === "privado";
    return [
        ...(isPrivado ? [{ icon: <IdCard strokeWidth={2.2} />, label: "Documento de identidad", value: carrier.documento || NOT_REGISTERED }] : []),
        { icon: <FileText strokeWidth={2.2} />, label: isPrivado ? "RUC (opcional)" : "RUC", value: carrier.ruc || NOT_REGISTERED },
        { icon: <BadgeCheck strokeWidth={2.2} />, label: "MTC", value: carrier.mtc || NOT_REGISTERED },
        ...(isPrivado ? [{ icon: <BadgeCheck strokeWidth={2.2} />, label: "CGN", value: carrier.cgn || NOT_REGISTERED }] : []),
        { icon: <Phone strokeWidth={2.2} />, label: "Teléfono", value: carrier.numero || NOT_REGISTERED },
        {
            icon: <Mail strokeWidth={2.2} />,
            label: "Correo",
            value: carrier.correo ? <a href={`mailto:${carrier.correo}`} className="text-brand hover:underline">{carrier.correo}</a> : NOT_REGISTERED,
        },
    ];
}

/** Tarjeta principal del detalle del transportista: quién es, qué tipo es y sus datos de registro. */
export default function CarrierInfoCard({ carrier }: { carrier: CarrierProfile }) {
    const isPrivado = carrier.tipo === "privado";
    const location = carrierLocation(carrier);

    return (
        <EntityOverviewCard
            avatar={isPrivado ? <UserRound strokeWidth={2.2} /> : <Building2 strokeWidth={2.2} />}
            eyebrow={CARRIER_TIPOS[carrier.tipo].label}
            title={carrier.nombre}
            watermark={Truck}
            chips={[
                ...(carrier.ruc ? [{ icon: <FileText strokeWidth={2.5} />, label: `RUC ${carrier.ruc}` }] : []),
                ...(location ? [{ icon: <MapPin strokeWidth={2.5} />, label: location }] : []),
            ]}
            details={getDetails(carrier)}
        />
    );
}
