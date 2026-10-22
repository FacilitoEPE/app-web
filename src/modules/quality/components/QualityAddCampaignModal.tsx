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
    onAdd: (input: AddQualityCampaignInput) => void;
}

const DEMO_ACTIVE_CAMPAIGNS: Campana[] = [
    {
        campaniaId: 101,
        nombre: "Mango 2026",
        frutaId: 1,
        fruta: { frutaId: 1, name: "Mango" },
        fechaInicio: new Date("2026-09-11"),
        fechaFin: new Date("2027-01-19"),
        estado: "en proceso",
        requerimientoComercial: 50000,
        createdAt: "",
        updatedAt: "",
    },
    {
        campaniaId: 102,
        nombre: "Mango 2025 · Cerrada",
        frutaId: 1,
        fruta: { frutaId: 1, name: "Mango" },
        fechaInicio: new Date("2025-09-16"),
        fechaFin: new Date("2025-12-25"),
        estado: "terminado",
        requerimientoComercial: 40000,
        createdAt: "",
        updatedAt: "",
    },
    {
        campaniaId: 103,
        nombre: "Arándano 2026",
        frutaId: 2,
        fruta: { frutaId: 2, name: "Arándano" },
        fechaInicio: new Date("2026-10-06"),
        fechaFin: new Date("2026-12-20"),
        estado: "en proceso",
        requerimientoComercial: 35000,
        createdAt: "",
        updatedAt: "",
    },
    {
        campaniaId: 104,
        nombre: "Uva Red Globe 2026",
        frutaId: 3,
        fruta: { frutaId: 3, name: "Uva Red Globe" },
        fechaInicio: new Date("2026-11-10"),
        fechaFin: new Date("2027-02-28"),
        estado: "en proceso",
        requerimientoComercial: 60000,
        createdAt: "",
        updatedAt: "",
    },
    {
        campaniaId: 105,
        nombre: "Palta Hass 2026",
        frutaId: 4,
        fruta: { frutaId: 4, name: "Palta Hass" },
        fechaInicio: new Date("2026-04-15"),
        fechaFin: new Date("2026-08-30"),
        estado: "en proceso",
        requerimientoComercial: 45000,
        createdAt: "",
        updatedAt: "",
    },
];

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
        setSelectedId("");
        setError(undefined);
    });

    useEffect(() => {
        if (!open) return;
        let active = true;
        setIsLoading(true);

        void getCampanas()
            .then((list) => {
                if (!active) return;
                if (list.length > 0) {
                    setCampaigns(list);
                } else if (import.meta.env.DEV) {
                    setCampaigns(DEMO_ACTIVE_CAMPAIGNS);
                }
            })
            .catch(() => {
                if (active && import.meta.env.DEV) {
                    setCampaigns(DEMO_ACTIVE_CAMPAIGNS);
                }
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

    const handleSave = () => {
        if (!selectedId) {
            setError("Selecciona una campaña en proceso.");
            return;
        }

        const found = campaigns.find((c) => String(c.campaniaId) === selectedId);
        if (!found) {
            setError("La campaña seleccionada no es válida.");
            return;
        }

        onAdd({
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
