import { useEffect, useMemo, useState } from "react";
import { Plus, ShieldCheck, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import { Button } from "@/shared/components/ui/button";
import { Combobox, type ComboboxOption } from "@/shared/components/ui/combobox";
import { useResetOnToggle } from "@/shared/hooks/useModalForm";
import { getCampanas } from "@/modules/campaigns/api/campaign.api";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";
import { format } from "date-fns";
import type { QualityScope } from "@/modules/quality/quality.utils";
import type { AddQualityCampaignInput } from "@/modules/quality/quality.store";

interface QualityAddCampaignModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    scope: QualityScope;
    existingCampaignIds: number[];
    onAdd: (input: AddQualityCampaignInput) => void | Promise<void>;
}


export default function QualityAddCampaignModal({
    open,
    onOpenChange,
    scope,
    existingCampaignIds,
    onAdd,
}: QualityAddCampaignModalProps) {
    const [selectedId, setSelectedId] = useState("");
    const [campaigns, setCampaigns] = useState<Campana[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | undefined>();

    useResetOnToggle(open, () => {
        setIsLoading(open);
        setSelectedId("");
        setError(undefined);
    });

    useEffect(() => {
        if (!open) return;
        let active = true;


        void getCampanas()
            .then((list) => {
                if (!active) return;
                setCampaigns(list);
            })
            .catch(() => {
                if (active) { setCampaigns([]); setError("No se pudieron cargar las campañas. Cierra y vuelve a intentar."); }
            })
            .finally(() => {
                if (active) setIsLoading(false);
            });

        return () => {
            active = false;
        };
    }, [open]);

    // Opciones: campañas que estén en estado "en proceso" y no agregadas aún a este alcance
    const availableCampaigns = useMemo(() => {
        return campaigns.filter(
            (c) => c.estado === "en proceso" && !existingCampaignIds.includes(c.campaniaId),
        );
    }, [campaigns, existingCampaignIds]);

    const options: ComboboxOption[] = useMemo(() => {
        return availableCampaigns.map((c) => ({
            value: String(c.campaniaId),
            label: `${c.nombre}${c.fruta?.name ? ` · ${c.fruta.name}` : ""}`,
        }));
    }, [availableCampaigns]);

    const handleSave = async () => {
        if (!selectedId) {
            setError("Selecciona una campaña en proceso.");
            return;
        }

        const found = campaigns.find((c) => String(c.campaniaId) === selectedId);
        if (!found) {
            setError("La campaña seleccionada no es válida.");
            return;
        }

        await onAdd({
            campaniaId: found.campaniaId,
            nombre: found.nombre,
            fruta: found.fruta?.name ?? "Fruta",
            fechaInicio: format(found.fechaInicio, "yyyy-MM-dd"),
            fechaFin: format(found.fechaFin, "yyyy-MM-dd"),
            estado: "En Proceso",
            scope,
        });

        onOpenChange(false);
    };

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<ShieldCheck size={22} strokeWidth={2} />}
            title="Agregar campaña a cosecha y calidad"
            description={`Selecciona una campaña en proceso para incorporarla al seguimiento de ${scope === "exportador" ? "Exportador" : "Industria"}.`}
            size="md"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={20} strokeWidth={2.5} /> Cancelar
                    </Button>
                    <Button size="xl" onClick={handleSave} disabled={isLoading || availableCampaigns.length === 0}>
                        <Plus size={20} strokeWidth={2.5} /> Agregar campaña
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                <FormField label="Campaña en proceso" required error={error}>
                    <Combobox
                        options={options}
                        value={selectedId}
                        onChange={(val) => {
                            setSelectedId(val);
                            setError(undefined);
                        }}
                        placeholder={isLoading ? "Cargando campañas en proceso..." : "Seleccionar campaña existente"}
                        emptyMessage="No hay campañas en proceso pendientes por agregar"
                        disabled={isLoading}
                    />
                </FormField>
            </div>
        </AppModal>
    );
}
