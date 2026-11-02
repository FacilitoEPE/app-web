import { usesV1 } from '@/shared/api/data-contract';
import SuccessModal from "@/shared/components/SuccessModal";

export type CarrierSuccessMode =
    | "carrier-created" | "carrier-updated"
    | "vehicle-created" | "vehicle-updated"
    | "driver-created" | "driver-updated"
    | "requirement-sent";

interface CarrierSuccessModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: CarrierSuccessMode;
}

const COPY: Record<CarrierSuccessMode, { title: string; description: string }> = {
    "carrier-created": { title: "Transportista Registrado", description: "El transportista ya aparece en la lista." },
    "carrier-updated": { title: "Cambios Guardados", description: "Los datos del transportista se actualizaron correctamente." },
    "vehicle-created": { title: "Vehículo Registrado", description: "El vehículo se agregó correctamente a la empresa." },
    "vehicle-updated": { title: "Cambios Guardados", description: "Los datos del vehículo se actualizaron correctamente." },
    "driver-created": { title: "Chofer Registrado", description: "El chofer se agregó correctamente a la empresa." },
    "driver-updated": { title: "Cambios Guardados", description: "Los datos del chofer se actualizaron correctamente." },
    "requirement-sent": { title: "Requerimiento Enviado", description: "Las empresas seleccionadas recibirán la notificación para revisarlo." },
};

export default function CarrierSuccessModal({ open, onOpenChange, mode }: CarrierSuccessModalProps) {
    const { title, description } = usesV1() && mode === "requirement-sent"
        ? { title: "Solicitud enviada", description: "Se registraron la solicitud y las invitaciones, y se notificó por correo a los transportistas seleccionados." }
        : COPY[mode];
    return <SuccessModal open={open} onOpenChange={onOpenChange} title={title} description={description} />;
}
