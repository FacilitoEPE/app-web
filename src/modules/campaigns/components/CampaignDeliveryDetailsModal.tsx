import { PackageCheck, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import { InfoField } from "@/shared/components/InfoField";
import ModalSection from "@/shared/components/ModalSection";
import { Button } from "@/shared/components/ui/button";
import { formatDisplayDate, formatKg } from "@/shared/utils/format";
import type { Carrier } from "@/modules/carriers/carriers.data";
import type { DeliveryProviderOption } from "@/modules/campaigns/components/CampaignDeliveryProviderPicker";
import type { CampaignDeliveryEntry } from "@/modules/campaigns/campaignDeliveryCoordination.utils";

const NOT_REGISTERED = "No registrado";

interface CampaignDeliveryDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry: CampaignDeliveryEntry | null;
    campaignName: string;
    clientName: string;
    contractName: string;
    carriers: Carrier[];
    providers: DeliveryProviderOption[];
}

/** Detalle de solo lectura de una entrega: programación, transporte, proveedores y carga registrados. */
export default function CampaignDeliveryDetailsModal({ open, onOpenChange, entry, campaignName, clientName, contractName, carriers, providers }: CampaignDeliveryDetailsModalProps) {
    if (!entry) return null;

    const { delivery } = entry;
    const coordination = delivery.coordinacion;
    const carrier = coordination ? carriers.find((item) => item.id === coordination.carrierId) : undefined;
    const vehicle = carrier?.vehiculos.find((item) => item.id === coordination?.vehicleId);
    const driver = carrier?.choferes.find((item) => item.id === coordination?.driverId);

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<PackageCheck size={22} strokeWidth={2} />}
            title="Detalle de entrega"
            description={`${clientName} · ${campaignName}`}
            size="lg"
            footer={
                <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                    <X size={20} strokeWidth={2.5} /> Cerrar
                </Button>
            }
        >
            <div className="flex flex-col gap-6">
                <ModalSection title="Entrega programada">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InfoField label="Cliente" value={clientName} />
                        <InfoField label="Contrato" value={contractName} />
                        <InfoField label="Fecha programada" value={formatDisplayDate(delivery.fecha)} />
                        <InfoField label="Cantidad programada" value={`${formatKg(delivery.kilosProgramados)} kg`} />
                        <InfoField label="Destino" value={delivery.destino} />
                        {delivery.observaciones && <InfoField label="Notas de la programación" value={delivery.observaciones} multiline className="sm:col-span-2" />}
                    </div>
                </ModalSection>

                {coordination ? (
                    <>
                        <ModalSection title="Transporte">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <InfoField label="Transportista" value={carrier?.nombre ?? NOT_REGISTERED} className="sm:col-span-2" />
                                <InfoField label="Camión" value={vehicle?.placa ?? NOT_REGISTERED} />
                                <InfoField label="Chofer" value={driver?.nombre ?? NOT_REGISTERED} />
                                <InfoField label="Fecha de inicio" value={formatDisplayDate(coordination.fechaInicio)} />
                                <InfoField label="Fecha de fin" value={formatDisplayDate(coordination.fechaFin)} />
                            </div>
                        </ModalSection>

                        <ModalSection title="Proveedores y fincas">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {coordination.proveedores.map((selection) => {
                                    const provider = providers.find((item) => item.id === selection.proveedorId);
                                    return (
                                        <InfoField
                                            key={selection.proveedorId}
                                            label={provider ? `${provider.nombre} · ${provider.tipo}` : "Proveedor no disponible"}
                                            value={selection.fincas.join(", ")}
                                            multiline
                                        />
                                    );
                                })}
                            </div>
                        </ModalSection>

                        <ModalSection title="Carga">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <InfoField label="Condiciones de la carga" value={coordination.condicionesCarga || "Sin condiciones"} multiline />
                                <InfoField label="Observaciones" value={coordination.observaciones || "Sin observaciones"} multiline />
                            </div>
                        </ModalSection>
                    </>
                ) : (
                    <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-[13px] text-ink-muted">
                        No hay datos de transporte, proveedores ni fincas registrados para esta entrega. Puedes agregarlos desde Editar.
                    </p>
                )}
            </div>
        </AppModal>
    );
}
