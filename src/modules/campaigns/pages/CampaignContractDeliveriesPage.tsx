import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PackageCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import ConfirmModal from "@/shared/components/ConfirmModal";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
import TableCard from "@/shared/components/TableCard";
import TableGridCard, { TableGridCardField, TableGridCardFields } from "@/shared/components/TableGridCard";
import { TableCountPill, TableToolbar } from "@/shared/components/TableToolbar";
import PageHeader from "@/shared/layout/PageHeader";
import CampaignContractContextBanner from "@/modules/campaigns/components/CampaignContractContextBanner";
import CampaignContractDeliveryModal from "@/modules/campaigns/components/CampaignContractDeliveryModal";
import CampaignSuccessModal from "@/modules/campaigns/components/CampaignSuccessModal";
import { getCampana } from "@/modules/campaigns/api/campaign.api";
import { getClientesNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.api";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";
import type { ClienteNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.mapper";
import type { CampaignClientContractLocal } from "@/modules/campaigns/campaignClientContract.utils";
import { useCampaignClientContracts } from "@/modules/campaigns/campaignClientContracts.store";
import type { CampaignContractDeliveryLocal, CampaignContractDeliveryValues } from "@/modules/campaigns/campaignContractDelivery.utils";
import {
    addCampaignContractDelivery,
    deleteCampaignContractDelivery,
    updateCampaignContractDelivery,
    useCampaignContractDeliveries,
} from "@/modules/campaigns/campaignContractDeliveries.store";
import { PageError, PageLoading } from "@/shared/components/PageState";
import { formatDisplayDate, formatKg } from "@/shared/utils/format";
import { paginate } from "@/shared/utils/paginate";

type LoadState =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; campaign: Campana; relation: ClienteNegocioCampana };

export default function CampaignContractDeliveriesPage() {
    const { id, clientLinkId, contractId } = useParams<{ id: string; clientLinkId: string; contractId: string }>();
    const campaniaId = Number(id);
    const relationId = Number(clientLinkId);
    const selectedContractId = Number(contractId);
    const contracts = useCampaignClientContracts(campaniaId, relationId);
    const contract = contracts.find((item) => item.id === selectedContractId) ?? null;
    const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

    const load = useCallback(async () => {
        if (![campaniaId, relationId, selectedContractId].every(Number.isInteger)) {
            setLoadState({ status: "error", message: "La ruta de entregas no es válida." });
            return;
        }
        try {
            const [campaign, relations] = await Promise.all([getCampana(campaniaId), getClientesNegocioCampana(campaniaId)]);
            const relation = relations.find((item) => item.clienteNegocioCampanaId === relationId);
            if (!relation) throw new Error("not-found");
            setLoadState({ status: "ready", campaign, relation });
        } catch {
            setLoadState({ status: "error", message: "No se pudo cargar el contexto de esta entrega." });
        }
    }, [campaniaId, relationId, selectedContractId]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void load(); }, [load]);

    if (loadState.status !== "ready" || !contract)
        return loadState.status === "loading" ? (
            <PageLoading label="Cargando entregas..." />
        ) : (
            <PageError
                title="Entregas no disponibles"
                message={loadState.status === "error" ? loadState.message : "El contrato no está disponible en esta sesión."}
                onRetry={() => void load()}
                back={{ to: `/campaigns/${campaniaId}/clients/${relationId}/contracts`, label: "Volver a contratos" }}
            />
        );

    return <DeliveriesView campaign={loadState.campaign} relation={loadState.relation} contract={contract} />;
}

function DeliveriesView({
    campaign,
    relation,
    contract,
}: {
    campaign: Campana;
    relation: ClienteNegocioCampana;
    contract: CampaignClientContractLocal;
}) {
    const deliveries = useCampaignContractDeliveries(campaign.campaniaId, relation.clienteNegocioCampanaId, contract.id);
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState<{ open: boolean; delivery: CampaignContractDeliveryLocal | null }>({
        open: false,
        delivery: null,
    });
    const [deleting, setDeleting] = useState<CampaignContractDeliveryLocal | null>(null);
    const [successOpen, setSuccessOpen] = useState(false);
    const { pageCount, currentPage, visible } = paginate(deliveries, page);
    const openCreate = () => setEditing({ open: true, delivery: null });
    const actionsFor = (delivery: CampaignContractDeliveryLocal): { primary: RowAction[] } => ({
        primary: [
            { label: "Editar", icon: <Pencil size={18} />, onClick: () => setEditing({ open: true, delivery }) },
            { label: "Eliminar", icon: <Trash2 size={17} />, variant: "destructive", onClick: () => setDeleting(delivery) },
        ],
    });

    const save = (values: CampaignContractDeliveryValues) => {
        if (editing.delivery)
            updateCampaignContractDelivery(campaign.campaniaId, relation.clienteNegocioCampanaId, contract.id, editing.delivery.id, values);
        else addCampaignContractDelivery(campaign.campaniaId, relation.clienteNegocioCampanaId, contract.id, values);
        setEditing((current) => ({ ...current, open: false }));
        setSuccessOpen(true);
    };

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            <CampaignContractContextBanner
                campaign={campaign}
                relation={relation}
                contract={contract}
                caption="Entregas · programación del contrato"
                stats={[
                    { label: `${contract.moneda} / kg`, value: contract.precioKg.toLocaleString("es-PE") },
                    { label: "kg propuestos", value: formatKg(contract.cantidadPropuestaKg) },
                    { label: deliveries.length === 1 ? "entrega" : "entregas", value: String(deliveries.length) },
                ]}
            />
            <PageHeader
                icon={<PackageCheck size={24} strokeWidth={2.5} />}
                title="Gestión de Entregas"
                description="Programa una o varias entregas asociadas a este contrato."
                action={
                    <Button size="xl" onClick={openCreate}>
                        <Plus size={19} /> Registrar entrega
                    </Button>
                }
            />
            <TableCard
                icon={<PackageCheck size={24} strokeWidth={2.5} />}
                title="Entregas del Contrato"
                description="Consulta la programación completa y corrige cualquier entrega cuando sea necesario."
                headerRight={
                    <TableToolbar>
                        <TableCountPill
                            icon={<PackageCheck size={16} className="text-brand" />}
                            count={deliveries.length}
                            singular="entrega"
                            plural="entregas"
                        />
                    </TableToolbar>
                }
                isEmpty={deliveries.length === 0}
                emptyIcon={<PackageCheck size={28} />}
                emptyTitle="Aún no hay entregas"
                emptyDescription="Este contrato todavía no tiene entregas programadas."
                emptyAction={{ label: "Registrar entrega", icon: <Plus size={18} />, onClick: openCreate }}
                page={currentPage}
                pageCount={pageCount}
                onPageChange={setPage}
            >
                <div className="flex flex-col gap-3 sm:hidden">
                    {visible.map((delivery) => (
                        <TableGridCard
                            key={delivery.id}
                            accentColor="border-l-brand"
                            icon={<PackageCheck size={18} />}
                            title={formatDisplayDate(delivery.fecha)}
                            subtitle={delivery.destino}
                            actions={<RowActions {...actionsFor(delivery)} />}
                        >
                            <TableGridCardFields>
                                <TableGridCardField label="Kilos" value={`${formatKg(delivery.kilosProgramados)} kg`} />
                                <TableGridCardField label="Observaciones" value={delivery.observaciones || "Sin observaciones"} />
                            </TableGridCardFields>
                        </TableGridCard>
                    ))}
                </div>
                <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
                    <Table>
                        <TableHeader className={TABLE_HEAD_BG}>
                            <TableRow className="border-border hover:bg-transparent">
                                <TableHead className="h-14 px-6 font-semibold text-ink">Fecha</TableHead>
                                <TableHead className="font-semibold text-ink">Kilos programados</TableHead>
                                <TableHead className="font-semibold text-ink">Destino</TableHead>
                                <TableHead className="font-semibold text-ink">Observaciones</TableHead>
                                <TableHead className="w-36 px-6 text-right font-semibold text-ink">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((delivery) => (
                                <TableRow key={delivery.id} className="border-border">
                                    <TableCell className="relative h-20 px-6">
                                        <TableRowAccent color="bg-brand" />
                                        <TableRowLead
                                            icon={<PackageCheck size={19} />}
                                            title={formatDisplayDate(delivery.fecha)}
                                            subtitle={`Entrega #${String(delivery.id).padStart(2, "0")}`}
                                        />
                                    </TableCell>
                                    <TableCell className="font-bold text-ink">{formatKg(delivery.kilosProgramados)} kg</TableCell>
                                    <TableCell className="font-medium text-ink-body">{delivery.destino}</TableCell>
                                    <TableCell className="max-w-80 text-ink-muted">
                                        <p className="truncate">{delivery.observaciones || "Sin observaciones"}</p>
                                    </TableCell>
                                    <TableCell className="px-6">
                                        <RowActions {...actionsFor(delivery)} className="justify-end" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </TableCard>
            <CampaignContractDeliveryModal
                open={editing.open}
                delivery={editing.delivery}
                onOpenChange={(open) => setEditing((current) => ({ ...current, open }))}
                onSave={save}
            />
            <ConfirmModal
                open={deleting !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleting(null);
                }}
                icon={<Trash2 size={28} />}
                title="¿Eliminar entrega?"
                description="La entrega programada se retirará de este contrato."
                confirmLabel="Sí, eliminar"
                onConfirm={() => {
                    if (deleting)
                        deleteCampaignContractDelivery(campaign.campaniaId, relation.clienteNegocioCampanaId, contract.id, deleting.id);
                    setDeleting(null);
                }}
            />
            <CampaignSuccessModal open={successOpen} onOpenChange={setSuccessOpen} mode="delivery" />
        </div>
    );
}
