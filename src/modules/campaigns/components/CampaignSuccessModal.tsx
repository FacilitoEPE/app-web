import SuccessModal from "@/shared/components/SuccessModal";

type CampaignSuccessMode =
    | "create"
    | "edit"
    | "provider"
    | "exam"
    | "interview"
    | "client"
    | "contract"
    | "delivery"
    | "certification"
    | "expansion"
    | "certificationPayment"
    | "carrier"
    | "carrierAgreement"
    | "carrierSettled"
    | "deliveryCoordination";

interface CampaignSuccessModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode?: CampaignSuccessMode;
    /** Solo cuando el resultado se ve en otra pantalla, ej. los clientes vinculados viven en el detalle */
    primaryAction?: { label: string; onClick: () => void };
}

/** Título y descripción por escenario: la campaña es el único flujo con tantos modos distintos de éxito */
const COPY: Record<CampaignSuccessMode, { title: string; description: string }> = {
    create: { title: "Campaña Registrada", description: "Se podrá ver las campañas registradas en el inicio" },
    edit: { title: "Cambios Guardados", description: "Se actualizó correctamente" },
    provider: { title: "Proveedor Añadido a Campaña", description: "Se ha añadido el proveedor exitosamente a la campaña" },
    exam: { title: "Examen Registrado", description: "El examen de laboratorio del proveedor se registró correctamente." },
    interview: { title: "Entrevista Registrada", description: "La finca entrevistada ya aparece en la lista del productor." },
    client: { title: "Cliente vinculado", description: "El cliente ya aparece en la gestión de clientes de esta campaña." },
    contract: { title: "Contrato guardado", description: "El acuerdo comercial ya aparece en la gestión de contratos del cliente." },
    delivery: { title: "Entrega guardada", description: "La programación ya aparece en la gestión de entregas del contrato." },
    certification: { title: "Certificación guardada", description: "Los cambios de la certificación de campaña se guardaron correctamente." },
    expansion: { title: "Ampliación Registrada", description: "Los kilos adicionales se sumaron correctamente a la certificación." },
    certificationPayment: { title: "Pago Registrado", description: "El pago de la certificación se registró correctamente." },
    carrier: { title: "Transportista vinculado", description: "El transportista ya aparece en la gestión de transportistas de esta campaña." },
    carrierAgreement: { title: "Acuerdo guardado", description: "El acuerdo de pago con el transportista se guardó correctamente." },
    carrierSettled: { title: "Saldo pagado", description: "El acuerdo quedó cerrado: ahora solo se puede consultar." },
    deliveryCoordination: { title: "Entrega actualizada", description: "Los datos de la entrega se guardaron correctamente." },
};

export default function CampaignSuccessModal({ open, onOpenChange, mode = "create", primaryAction }: CampaignSuccessModalProps) {
    const { title, description } = COPY[mode];
    return (
        <SuccessModal
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            description={description}
            primaryAction={primaryAction}
        />
    );
}
