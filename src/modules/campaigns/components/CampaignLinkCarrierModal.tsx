import { useMemo, useState } from "react";
import { Link2, Mail, MapPin, Phone, Truck, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Combobox } from "@/shared/components/ui/combobox";
import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { CARRIER_TIPOS, type CarrierProfile } from "@/modules/carriers/carrierProfile.utils";

interface CampaignLinkCarrierModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Nombre de la campaña, para el subtítulo */
    campaignName: string;
    /** Transportistas de Gestión de Transporte que todavía no están vinculados a esta campaña */
    carriers: CarrierProfile[];
    isLoading: boolean;
    onSave: (carrierId: number) => void;
}

/**
 * Vincula un transportista de Gestión de Transporte a la campaña. Se confirma su identidad; el
 * resto de sus datos ya está en su ficha. Al elegirlo, muestra su tipo, ubicación y datos de contacto para confirmar que es el correcto.
 */
export default function CampaignLinkCarrierModal({ open, onOpenChange, campaignName, carriers, isLoading, onSave }: CampaignLinkCarrierModalProps) {
    const [carrierId, setCarrierId] = useState("");
    const [errors, setErrors] = useState<{ carrier?: string }>({});

    useResetOnToggle(open, () => {
        setCarrierId("");
        setErrors({});
    });

    const options = useMemo(
        () => carriers.map((carrier) => ({ value: String(carrier.id), label: `${carrier.nombre} · ${CARRIER_TIPOS[carrier.tipo].short}` })),
        [carriers],
    );
    const selected = carriers.find((carrier) => String(carrier.id) === carrierId);

    const handleSave = async () => {
        const next = { carrier: selected ? undefined : "Selecciona el transportista." };
        if (next.carrier) {
            setErrors(next);
            return;
        }
        await onSave(selected!.id);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Truck size={22} strokeWidth={2} />}
            title="Vincular transportista"
            description={`${campaignName} · Elige un transportista de Gestión de Transporte. Después asigna el camión y chofer desde las entregas de la campaña.`}
            size="md"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleSave} disabled={isLoading}>
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
                            setErrors((current) => ({ ...current, carrier: undefined }));
                        }}
                        placeholder={isLoading ? "Cargando transportistas..." : "Buscar transportista..."}
                        emptyMessage="No quedan transportistas por vincular"
                        disabled={isLoading}
                    />
                </FormField>

                {selected && (
                    <div className="flex flex-col gap-2 rounded-xl border border-brand-border/60 bg-brand-surface/35 p-3 sm:px-4 text-[12.5px] transition-all animate-in fade-in-50 duration-200">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <MapPin size={14} className="shrink-0 text-brand" />
                                <span className="truncate font-medium text-ink">
                                    {[selected.departamento, selected.provincia, selected.ciudad].filter(Boolean).join(" · ") || "Ubicación no registrada"}
                                </span>
                            </div>
                            <Badge variant={selected.tipo === "privado" ? "outline" : "brand"} className="h-5 shrink-0 px-2 text-[11px] font-semibold border-brand-border/60">
                                {CARRIER_TIPOS[selected.tipo].short}
                            </Badge>
                        </div>

                        {selected.numero || selected.correo ? (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-muted">
                                {selected.numero && (
                                    <div className="flex items-center gap-1.5">
                                        <Phone size={13} className="shrink-0 text-brand" />
                                        <span className="font-medium text-ink-body">{selected.numero}</span>
                                    </div>
                                )}
                                {selected.numero && selected.correo && <span className="text-ink-muted/40">·</span>}
                                {selected.correo && (
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <Mail size={13} className="shrink-0 text-brand" />
                                        <a href={`mailto:${selected.correo}`} className="truncate font-medium text-brand hover:underline">
                                            {selected.correo}
                                        </a>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-[12px] text-ink-muted">Sin datos de contacto</div>
                        )}
                    </div>
                )}

            </div>
        </AppModal>
    );
}
