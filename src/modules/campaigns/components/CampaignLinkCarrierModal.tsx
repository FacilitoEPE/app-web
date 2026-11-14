import { useMemo, useState } from "react";
import { Link2, Truck, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { Button } from "@/shared/components/ui/button";
import { Combobox } from "@/shared/components/ui/combobox";
import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { useFormSubmit } from "@/shared/hooks/useFormSubmit";
import { CARRIER_TIPOS, type CarrierProfile } from "@/modules/carriers/carrierProfile.utils";

interface CampaignLinkCarrierModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Nombre de la campaña, para el subtítulo */
    campaignName: string;
    /** Transportistas de Gestión de Transporte que todavía no están vinculados a esta campaña */
    carriers: CarrierProfile[];
    isLoading: boolean;
    onSave: (carrierId: number, cotizacion: File | null) => void | Promise<void>;
}

/**
 * Vincula un transportista de Gestión de Transporte a la campaña.
 */
export default function CampaignLinkCarrierModal({ open, onOpenChange, campaignName, carriers, isLoading, onSave }: CampaignLinkCarrierModalProps) {
    const [carrierId, setCarrierId] = useState("");
    const [cotizacion, setCotizacion] = useState<File | null>(null);
    const { errors, saving, clearError, submit } = useFormSubmit({
        open,
        validate: (values: { carrierId: string; cotizacion: File | null }) => ({
            ...(!values.carrierId && { carrier: "Selecciona el transportista." }),
            ...(!values.cotizacion && { cotizacion: "Adjunta la cotización." }),
        }),
        onSubmit: ({ carrierId: selectedId, cotizacion: file }) => onSave(Number(selectedId), file),
        backendFields: {},
    });

    useResetOnToggle(open, () => {
        setCarrierId("");
        setCotizacion(null);
    });

    const options = useMemo(
        () => carriers.map((carrier) => ({ value: String(carrier.id), label: `${carrier.nombre} · ${CARRIER_TIPOS[carrier.tipo].short}` })),
        [carriers],
    );

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Truck size={22} strokeWidth={2} />}
            title="Vincular transportista"
            description={`${campaignName} · Elige un transportista de Gestión de Transporte. Después asigna el camión y chofer desde las entregas de la campaña.`}
            size="md"
            busy={saving}
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={() => void submit({ carrierId, cotizacion })} disabled={isLoading || saving}>
                        <Link2 size={20} strokeWidth={2.5} /> Vincular transportista
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <FormField label="Transportista" required error={errors.carrier}>
                    <Combobox
                        options={options}
                        value={carrierId}
                        onChange={(value) => {
                            setCarrierId(value);
                            clearError("carrier");
                        }}
                        placeholder={isLoading ? "Cargando transportistas..." : "Buscar transportista..."}
                        emptyMessage="No quedan transportistas por vincular"
                        disabled={isLoading}
                    />
                </FormField>
                <FormField error={errors.cotizacion}>
                    <FileDropzone
                        label="Cotización del transportista"
                        required
                        allowLocalSelection
                        file={cotizacion}
                        onChange={(file) => {
                            setCotizacion(file);
                            clearError("cotizacion");
                        }}
                    />
                </FormField>
                <FormField error={errors._form} />
            </div>
        </AppModal>
    );
}
