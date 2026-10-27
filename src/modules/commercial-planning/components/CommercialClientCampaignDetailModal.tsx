import { useNavigate } from "react-router-dom";
import {
    ExternalLink,
    FileSpreadsheet,
    FileText,
    PackageCheck,
    X,
} from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import FileDropzone from "@/shared/components/FileDropzone";
import { InfoField, SummaryBar } from "@/shared/components/InfoField";
import ModalSection from "@/shared/components/ModalSection";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table";
import { formatDisplayDate, formatKg, formatMoney } from "@/shared/utils/format";
import type { CampaignClientContractLocal } from "@/modules/campaigns/campaignClientContract.utils";
import type { CampaignContractDeliveryLocal } from "@/modules/campaigns/campaignContractDelivery.utils";

export interface CommercialParticipationRow {
    id: string;
    campaniaId: number;
    campaniaNombre: string;
    fruta: string;
    variedades: string[];
    relationId: number;
    clienteId: number;
    clienteNombre: string;
    ruc: string;
    canal: "Exportador" | "Industria";
    pais: string;
    cantidadRequeridaKg: number;
    kilosAcordados: number;
    fechaRegistro: string;
    observaciones: string;
    contracts: CampaignClientContractLocal[];
    deliveries: {
        contractId: number;
        contractName: string;
        delivery: CampaignContractDeliveryLocal;
    }[];
}

interface CommercialClientCampaignDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    participation: CommercialParticipationRow | null;
}

export default function CommercialClientCampaignDetailModal({
    open,
    onOpenChange,
    participation,
}: CommercialClientCampaignDetailModalProps) {
    const navigate = useNavigate();

    if (!participation) return null;

    const totalProgramadoEntregas = participation.deliveries.reduce(
        (sum, d) => sum + d.delivery.kilosProgramados,
        0,
    );

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<FileSpreadsheet size={22} strokeWidth={2.2} />}
            title={`Consulta cliente–campaña · ${participation.clienteNombre}`}
            description={`${participation.campaniaNombre} · ${participation.canal}`}
            size="xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} strokeWidth={2.5} /> Cerrar
                    </Button>
                    <Button
                        size="xl"
                        onClick={() => {
                            onOpenChange(false);
                            navigate(
                                `/campaigns/${participation.campaniaId}/clients/${participation.relationId}/contracts`,
                            );
                        }}
                    >
                        <ExternalLink size={18} strokeWidth={2.5} /> Gestionar contratos y entregas
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <SummaryBar
                    items={[
                        {
                            label: "Cantidad requerida",
                            value: `${formatKg(participation.cantidadRequeridaKg)} kg`,
                        },
                        {
                            label: "Kilos acordados (Contratos)",
                            value: `${formatKg(participation.kilosAcordados)} kg`,
                            tone: "brand",
                        },
                        {
                            label: "Contratos registrados",
                            value: `${participation.contracts.length}`,
                        },
                        {
                            label: "Entregas programadas",
                            value: `${participation.deliveries.length} (${formatKg(totalProgramadoEntregas)} kg)`,
                            tone: participation.deliveries.length > 0 ? "brand" : "highlight",
                        },
                    ]}
                />

                <ModalSection
                    title="Resumen de participación comercial"
                    aside="Datos registrados en la vinculación"
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <InfoField
                            label="Cliente / RUC"
                            value={`${participation.clienteNombre} · ${participation.ruc}`}
                        />
                        <InfoField
                            label="Campaña y fruta"
                            value={`${participation.campaniaNombre} (${participation.fruta})`}
                        />
                        <InfoField
                            label="Canal / País"
                            value={`${participation.canal} · ${participation.pais}`}
                        />
                        <InfoField
                            label="Variedades requeridas"
                            value={participation.variedades.join(", ") || "Kent"}
                        />
                        <InfoField
                            label="Fecha de registro"
                            value={formatDisplayDate(participation.fechaRegistro)}
                        />
                        <InfoField
                            label="Observaciones"
                            value={participation.observaciones || "Sin observaciones adicionales"}
                        />
                    </div>
                </ModalSection>

                <ModalSection
                    title={`Contratos registrados (${participation.contracts.length})`}
                    aside="Acuerdos comerciales y respaldos PDF"
                >
                    {participation.contracts.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border p-4 text-center text-[13px] text-ink-muted">
                            Aún no se han registrado contratos para esta participación cliente–campaña.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {participation.contracts.map((contract, idx) => (
                                <div
                                    key={contract.id}
                                    className="flex flex-col gap-3 rounded-2xl border border-border/90 bg-card p-4"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <FileText size={17} className="text-brand" />
                                            <span className="text-[14px] font-bold text-ink">
                                                Contrato #{idx + 1} · {formatDisplayDate(contract.fechaRegistro)}
                                            </span>
                                        </div>
                                        <span className="text-[13.5px] font-extrabold text-brand">
                                            {formatKg(contract.cantidadPropuestaKg)} kg ·{" "}
                                            {contract.moneda === "USD" ? "US$" : "S/"} {formatMoney(contract.precioKg)}
                                            /kg
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                        <InfoField label="Condiciones de pago" value={contract.condicionesPago} />
                                        <InfoField label="Condiciones de entrega" value={contract.condicionesEntrega} />
                                    </div>
                                    <FileDropzone
                                        label="Documento del contrato"
                                        file={contract.archivo}
                                        onChange={() => {}}
                                        readOnly
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </ModalSection>

                <ModalSection
                    title={`Entregas programadas (${participation.deliveries.length})`}
                    aside="Cronograma de despachos comprometidos"
                >
                    {participation.deliveries.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border p-4 text-center text-[13px] text-ink-muted">
                            No hay entregas programadas todavía para los contratos de este cliente.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-brand-surface/60">
                                        <TableHead className="font-bold text-ink">Fecha</TableHead>
                                        <TableHead className="font-bold text-ink">Contrato</TableHead>
                                        <TableHead className="font-bold text-ink">Destino</TableHead>
                                        <TableHead className="text-right font-bold text-ink">Kilos</TableHead>
                                        <TableHead className="text-center font-bold text-ink">Coordinación</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {participation.deliveries.map((item) => (
                                        <TableRow key={`${item.contractId}-${item.delivery.id}`}>
                                            <TableCell className="font-semibold text-ink">
                                                {formatDisplayDate(item.delivery.fecha)}
                                            </TableCell>
                                            <TableCell className="text-[13px] text-ink-muted">
                                                {item.contractName}
                                            </TableCell>
                                            <TableCell className="text-[13px] text-ink">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <PackageCheck size={14} className="text-brand" />
                                                    {item.delivery.destino}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-extrabold tabular-nums text-ink">
                                                {formatKg(item.delivery.kilosProgramados)} kg
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <StatusBadge
                                                    status={
                                                        item.delivery.coordinacion ? "Completa" : "Por completar"
                                                    }
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </ModalSection>
            </div>
        </AppModal>
    );
}
