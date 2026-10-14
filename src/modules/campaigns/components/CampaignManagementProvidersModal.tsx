import { useEffect, useState } from "react";
import { Truck, Tractor, Scale, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import CampaignDirectoryModal from "@/modules/campaigns/components/CampaignDirectoryModal";
import CampaignDirectoryTable, { DirectoryIdentity, DirectoryContact } from "@/modules/campaigns/components/CampaignDirectoryTable";
import { getCampaniaProveedoresByCampania } from "@/modules/campaigns/api/campania-proveedor.api";
import { getCampana } from "@/modules/campaigns/api/campaign.api";
import type { CampaniaProveedor } from "@/modules/campaigns/api/campania-proveedor.mapper";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";
import { formatCampaignNumber } from "@/modules/campaigns/campaignDetails.utils";

interface CampaignManagementProvidersModalProps {
    open: boolean;
    campaniaId?: number | null;
    onOpenChange: (open: boolean) => void;
}

const TIPO_LABEL: Record<string, string> = {
    productor: "Productor",
    acopio: "Acopiador",
};

const providerName = (relation: CampaniaProveedor) =>
    relation.proveedor ? `${relation.proveedor.nombres} ${relation.proveedor.apellido}` : "Proveedor";

/** Proveedores vinculados a la campaña, en modo consulta. */
export default function CampaignManagementProvidersModal({ open, campaniaId, onOpenChange }: CampaignManagementProvidersModalProps) {
    const [proveedores, setProveedores] = useState<CampaniaProveedor[]>([]);
    const [campaign, setCampaign] = useState<Campana | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !campaniaId) return;
        let active = true;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoading(true);
        setLoadError(null);
        Promise.all([getCampana(campaniaId), getCampaniaProveedoresByCampania(campaniaId)])
            .then(([campana, relations]) => {
                if (!active) return;
                setCampaign(campana);
                setProveedores(relations);
            })
            .catch(() => { if (active) setLoadError("No se pudieron cargar los proveedores de esta campaña."); })
            .finally(() => { if (active) setIsLoading(false); });
        return () => { active = false; };
    }, [open, campaniaId]);

    const totalKg = proveedores.reduce((sum, relation) => sum + (Number(relation.cantidadProveedor) || 0), 0);
    const producers = proveedores.filter((relation) => relation.tipoProveedor === "productor").length;

    return (
        <CampaignDirectoryModal
            open={open}
            onOpenChange={onOpenChange}
            title="Gestión de Proveedores"
            campaign={campaign}
            description="Productores y acopiadores vinculados a esta campaña."
            icon={Truck}
            empty={!isLoading && !loadError && proveedores.length === 0}
            stats={[
                { label: "Proveedores", value: proveedores.length, icon: Truck, hint: "vinculados" },
                { label: "Volumen estimado", value: `${formatCampaignNumber(totalKg)} kg`, icon: Scale, hint: "en total" },
                { label: "Productores", value: producers, icon: Tractor, hint: `${proveedores.length - producers} acopiadores` },
            ]}
        >
            {loadError ? (
                <Alert variant="destructive">
                    <AlertCircle />
                    <AlertDescription>{loadError}</AlertDescription>
                </Alert>
            ) : isLoading ? (
                <p role="status" className="py-8 text-center text-sm text-ink-muted">Cargando proveedores...</p>
            ) : (
                <CampaignDirectoryTable
                    label="proveedores"
                    columns={["Proveedor", "Volumen", "MTD Ceratitis", "Contacto"]}
                    rows={proveedores.map((relation, index) => ({
                        id: relation.cxpId,
                        name: providerName(relation),
                        category: TIPO_LABEL[relation.tipoProveedor] ?? relation.tipoProveedor,
                        search: `${relation.proveedor?.zona ?? ""} ${relation.proveedor?.telefono ?? ""}`,
                        cells: [
                            <DirectoryIdentity name={providerName(relation)} subtitle={`${TIPO_LABEL[relation.tipoProveedor] ?? relation.tipoProveedor} · ${relation.proveedor?.zona || "—"}`} index={index} />,
                            <strong className="whitespace-nowrap text-ink">{formatCampaignNumber(Number(relation.cantidadProveedor))} kg</strong>,
                            <span className="font-semibold text-ink-body">{formatCampaignNumber(Number(relation.mtdCeratitis))}</span>,
                            <DirectoryContact
                                name={relation.proveedor?.email || providerName(relation)}
                                value={relation.proveedor?.telefono ? String(relation.proveedor.telefono) : "—"}
                                href={`tel:${relation.proveedor?.telefono ?? ""}`}
                            />,
                        ],
                    }))}
                />
            )}
        </CampaignDirectoryModal>
    );
}
