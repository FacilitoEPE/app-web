import { format, parseISO } from "date-fns";
import AppModal from "@/shared/components/AppModal";
import { X, Receipt } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { InfoField } from "@/shared/components/InfoField";
import StatusBadge from "@/shared/components/StatusBadge";
import type { CarrierPayment } from "@/modules/campaigns/carrierPayments.data";

interface CampaignPaymentDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    payment: CarrierPayment | null;
}

export default function CampaignPaymentDetailsModal({ open, onOpenChange, payment }: CampaignPaymentDetailsModalProps) {
    if (!payment) return null;

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Receipt size={22} strokeWidth={2} />}
            title="Detalles del Pago"
            description="Visualizando la información registrada del pago."
            size="sm"
            footer={
                <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={20} strokeWidth={2.5} /> Cerrar
                    </Button>
            }
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                <InfoField label="Transportista" value={payment.transportista} className="sm:col-span-2" />

                <InfoField label="Código" value={payment.codigo} />
                <InfoField label="Fecha" value={payment.fecha ? format(parseISO(payment.fecha), "dd/MM/yyyy") : "—"} />

                <InfoField
                    label={payment.estado === "Adelanto" ? "Adelantado" : "Cantidad"}
                    value={`S/ ${payment.cantidad.toLocaleString("es-PE")}`}
                />

                <InfoField label="Estado" value={<StatusBadge status={payment.estado} />} />

                {payment.estado === "Adelanto" && (
                    <InfoField
                        label="Pendiente por pagar"
                        value={`S/ ${(payment.cantidadPendiente ?? 0).toLocaleString("es-PE")}`}
                        className="sm:col-span-2"
                    />
                )}

                <InfoField label="Boleta" value={payment.boleta ?? "Sin boleta adjunta"} className="sm:col-span-2" />
            </div>
        </AppModal>
    );
}
