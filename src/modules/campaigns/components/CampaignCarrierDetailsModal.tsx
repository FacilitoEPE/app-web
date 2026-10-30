import { Truck, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import { InfoField } from "@/shared/components/InfoField";
import ModalSection from "@/shared/components/ModalSection";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { formatDisplayDate } from "@/shared/utils/format";
import { plural } from "@/shared/utils/plural";
import { CARRIER_TIPOS, carrierLocation, type CarrierProfile } from "@/modules/carriers/carrierProfile.utils";
import { getAgreementStatus, type CampaignCarrierLink } from "@/modules/campaigns/campaignCarrier.utils";

const NOT_REGISTERED = "No registrado";

interface CampaignCarrierDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    carrier: CarrierProfile | null;
    link: CampaignCarrierLink | null;
    campaignName: string;
}

/**
 * Detalle de solo lectura de un transportista vinculado: los datos de su ficha de Gestión de Transporte y lo propio de
 * esta campaña (fecha de vínculo, estado del acuerdo y la cotización que adjuntó). Es donde vive lo que la tabla no
 * muestra: ubicación, MTC y flota.
 */
export default function CampaignCarrierDetailsModal({ open, onOpenChange, carrier, link, campaignName }: CampaignCarrierDetailsModalProps) {
    if (!carrier || !link) return null;

    const isPrivate = carrier.tipo === "privado";
    const fleet = `${carrier.vehiculos.length} ${plural(carrier.vehiculos.length, "vehículo", "vehículos")} · ${carrier.choferes.length} ${plural(carrier.choferes.length, "chofer", "choferes")}`;

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Truck size={22} strokeWidth={2} />}
            title="Datos del transportista"
            description={`${carrier.nombre} · ${campaignName}`}
            size="lg"
            footer={
                <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                    <X size={20} strokeWidth={2.5} /> Cerrar
                </Button>
            }
        >
            <div className="flex flex-col gap-6">
                <ModalSection title="Transportista">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InfoField label="Tipo" value={CARRIER_TIPOS[carrier.tipo].label} />
                        <InfoField label={isPrivate ? "Documento de identidad" : "RUC"} value={(isPrivate ? carrier.documento : carrier.ruc) || NOT_REGISTERED} />
                        <InfoField label="MTC" value={carrier.mtc || NOT_REGISTERED} />
                        {isPrivate ? <InfoField label="CGN" value={carrier.cgn || NOT_REGISTERED} /> : <InfoField label="Flota" value={fleet} />}
                        <InfoField label="Teléfono" value={carrier.numero || NOT_REGISTERED} />
                        <InfoField label="Correo" value={carrier.correo || NOT_REGISTERED} />
                        <InfoField label="Ubicación" value={carrierLocation(carrier) || NOT_REGISTERED} className={isPrivate ? undefined : "sm:col-span-2"} />
                        {isPrivate && <InfoField label="Flota" value={fleet} />}
                    </div>
                </ModalSection>

                <ModalSection title="En esta campaña">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InfoField label="Fecha de vinculación" value={formatDisplayDate(link.fechaVinculacion)} />
                        <InfoField label="Acuerdo de pago" variant="plain" value={<StatusBadge status={getAgreementStatus(link.acuerdo)} />} />
                    </div>
                </ModalSection>
            </div>
        </AppModal>
    );
}
