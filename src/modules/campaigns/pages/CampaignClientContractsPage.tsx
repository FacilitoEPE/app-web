import { usesV1 } from '@/shared/api/data-contract';
import { contractVarietyContext } from '@/modules/campaigns/api/contract-variety-context';
import { matchingVarietyPreview, saveContractVarietyPreview, useVarietyPreviews } from '@/modules/campaigns/campaignVarietiesPreview.store';
import type { VarietyQuantity } from '@/modules/campaigns/campaignVarietyQuantities.utils';
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Eye, FileSignature, PackageCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import ConfirmModal from "@/shared/components/ConfirmModal";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
import TableCard from "@/shared/components/TableCard";
import TableGridCard, { TableGridCardField, TableGridCardFields } from "@/shared/components/TableGridCard";
import { TableCountPill, TableToolbar } from "@/shared/components/TableToolbar";
import PageHeader from "@/shared/layout/PageHeader";
import CampaignClientContextBanner from "@/modules/campaigns/components/CampaignClientContextBanner";
import CampaignClientContractModal from "@/modules/campaigns/components/CampaignClientContractModal";
import CampaignSuccessModal from "@/modules/campaigns/components/CampaignSuccessModal";
import { getCampana } from "@/modules/campaigns/api/campaign.api";
import { getCampaignRequirement } from "@/modules/campaigns/api/cliente-negocio-campana.api";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";
import type { ClienteNegocioCampana } from "@/modules/campaigns/api/cliente-negocio-campana.mapper";
import type { CampaignClientContractLocal, CampaignClientContractValues } from "@/modules/campaigns/campaignClientContract.utils";
import {
    addCampaignClientContract,
    deleteCampaignClientContract,
    updateCampaignClientContract,
    useCampaignClientContracts,
} from "@/modules/campaigns/campaignClientContracts.store";
import { PageError, PageLoading } from "@/shared/components/PageState";
import { formatKg } from "@/shared/utils/format";
import { paginate } from "@/shared/utils/paginate";

const money = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

type LoadState =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; campaign: Campana; relation: ClienteNegocioCampana };
type Panel = { open: "create" | "edit" | "view" | null; contract: CampaignClientContractLocal | null };

export default function CampaignClientContractsPage() {
    const { id, clientLinkId } = useParams<{ id: string; clientLinkId: string }>();
    const campaniaId = Number(id);
    const relationId = Number(clientLinkId);
    const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

    const load = useCallback(async () => {
        if (!Number.isInteger(campaniaId) || !Number.isInteger(relationId)) {
            setLoadState({ status: "error", message: "El vínculo solicitado no es válido." });
            return;
        }
        setLoadState({ status: "loading" });
        try {
            const [campaign, relation] = await Promise.all([getCampana(campaniaId), getCampaignRequirement(campaniaId, relationId)]);
            if (!relation) throw new Error("not-found");
            setLoadState({ status: "ready", campaign, relation });
        } catch {
            setLoadState({ status: "error", message: "No se pudo cargar el cliente vinculado a esta campaña." });
        }
    }, [campaniaId, relationId]);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void load(); }, [load]);

    if (loadState.status !== "ready")
        return loadState.status === "loading" ? (
            <PageLoading label="Cargando contratos..." />
        ) : (
            <PageError
                title="Contratos no disponibles"
                message={loadState.message}
                onRetry={() => void load()}
                back={{ to: `/campaigns/${campaniaId}/clients`, label: "Volver a clientes" }}
            />
        );

    return <ContractsView campaign={loadState.campaign} relation={loadState.relation} />;
}

function ContractsView({ campaign, relation }: { campaign: Campana; relation: ClienteNegocioCampana }) {
    const previews = useVarietyPreviews();
    const varietyContext = usesV1() ? contractVarietyContext(campaign.campaniaId, relation.clienteNegocioCampanaId) : { fruitName: campaign.fruta?.name ?? '', options: [] };
    const navigate = useNavigate();
    const contracts = useCampaignClientContracts(campaign.campaniaId, relation.clienteNegocioCampanaId);
    const [page, setPage] = useState(1);
    const [panel, setPanel] = useState<Panel>({ open: null, contract: null });
    const [deleting, setDeleting] = useState<CampaignClientContractLocal | null>(null);
    const [successOpen, setSuccessOpen] = useState(false);
    const { pageCount, currentPage, visible } = paginate(contracts, page);

    const actionsFor = (contract: CampaignClientContractLocal): { primary: RowAction[]; secondary: RowAction[] } => ({
        primary: [
            { label: "Ver detalles", icon: <Eye size={18} />, onClick: () => setPanel({ open: "view", contract }) },
            { label: "Editar", icon: <Pencil size={18} />, onClick: () => setPanel({ open: "edit", contract }) },
            { label: "Eliminar", icon: <Trash2 size={17} />, variant: "destructive", onClick: () => setDeleting(contract) },
        ],
        secondary: [
            {
                label: "Entregas",
                icon: <PackageCheck size={17} />,
                variant: "brand",
                onClick: () =>
                    navigate(
                        `/campaigns/${campaign.campaniaId}/clients/${relation.clienteNegocioCampanaId}/contracts/${contract.id}/deliveries`,
                    ),
            },
        ],
    });

    const save = async (values: CampaignClientContractValues, archivo: File | null, varieties: VarietyQuantity[]) => {
        let savedId: number | undefined;
        if (panel.open === "edit" && panel.contract) {
            await updateCampaignClientContract(campaign.campaniaId, relation.clienteNegocioCampanaId, panel.contract.id, values, archivo);
            savedId = panel.contract.id;
        } else if (archivo || usesV1()) {
            const saved = await addCampaignClientContract(campaign.campaniaId, relation.clienteNegocioCampanaId, values, archivo);
            if (saved) savedId = saved.contratoVentaId;
        }
        if (savedId !== undefined) saveContractVarietyPreview(savedId, Number(values.cantidadPropuestaKg), varieties);
        setPanel((current) => ({ ...current, open: null }));
        setSuccessOpen(true);
    };

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            <CampaignClientContextBanner
                campaign={campaign}
                relation={relation}
                caption="Contratos · acuerdos comerciales"
                stats={[
                    { label: contracts.length === 1 ? "contrato" : "contratos", value: String(contracts.length) },
                    { label: "kg propuestos", value: formatKg(contracts.reduce((sum, item) => sum + item.cantidadPropuestaKg, 0)) },
                ]}
            />
            <PageHeader
                icon={<FileSignature size={24} strokeWidth={2.5} />}
                title="Gestión de Contratos"
                description="Registra y consulta los acuerdos comerciales establecidos con este cliente."
                action={
                    <Button size="xl" onClick={() => setPanel({ open: "create", contract: null })}>
                        <Plus size={19} /> Registrar contrato
                    </Button>
                }
            />

            <TableCard
                icon={<FileSignature size={24} strokeWidth={2.5} />}
                title="Contratos del Cliente"
                description="Consulta las condiciones, cantidades y documentos de cada acuerdo."
                headerRight={
                    <TableToolbar>
                        <TableCountPill
                            icon={<FileSignature size={16} className="text-brand" />}
                            count={contracts.length}
                            singular="contrato"
                            plural="contratos"
                        />
                    </TableToolbar>
                }
                isEmpty={contracts.length === 0}
                emptyIcon={<FileSignature size={28} />}
                emptyTitle="Aún no hay contratos"
                emptyDescription="Este cliente todavía no tiene contratos registrados en la campaña."
                emptyAction={{
                    label: "Registrar contrato",
                    icon: <Plus size={18} />,
                    onClick: () => setPanel({ open: "create", contract: null }),
                }}
                page={currentPage}
                pageCount={pageCount}
                onPageChange={setPage}
            >
                <div className="flex flex-col gap-3 sm:hidden">
                    {visible.map((contract) => (
                        <TableGridCard
                            key={contract.id}
                            accentColor="border-l-brand"
                            icon={<FileSignature size={18} />}
                            title={`${contract.moneda} ${money.format(contract.precioKg)} / kg`}
                            subtitle={contract.condicionesPago}
                            actions={<RowActions {...actionsFor(contract)} />}
                        >
                            <TableGridCardFields>
                                <TableGridCardField label="Cantidad" value={`${formatKg(contract.cantidadPropuestaKg)} kg`} />
                                <TableGridCardField label="Entrega" value={contract.condicionesEntrega} />
                            </TableGridCardFields>
                        </TableGridCard>
                    ))}
                </div>
                <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
                    <Table>
                        <TableHeader className={TABLE_HEAD_BG}>
                            <TableRow className="border-border hover:bg-transparent">
                                <TableHead className="h-14 px-6 font-semibold text-ink">Contrato</TableHead>
                                <TableHead className="font-semibold text-ink">Precio por kg</TableHead>
                                <TableHead className="font-semibold text-ink">Cantidad propuesta</TableHead>
                                <TableHead className="font-semibold text-ink">Condiciones</TableHead>
                                <TableHead className="w-44 px-6 text-center font-semibold text-ink">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((contract) => (
                                <TableRow key={contract.id} className="border-border">
                                    <TableCell className="relative h-20 px-6">
                                        <TableRowAccent color="bg-brand" />
                                        <TableRowLead
                                            icon={<FileSignature size={19} />}
                                            title={`Contrato #${String(contract.id).padStart(2, "0")}`}
                                            subtitle={contract.fechaRegistro}
                                        />
                                    </TableCell>
                                    <TableCell className="font-bold text-ink">
                                        {contract.moneda} {money.format(contract.precioKg)}
                                    </TableCell>
                                    <TableCell className="text-ink-body">{formatKg(contract.cantidadPropuestaKg)} kg</TableCell>
                                    <TableCell>
                                        <p className="max-w-72 truncate font-medium text-ink-body">{contract.condicionesPago}</p>
                                        <p className="max-w-72 truncate text-xs text-ink-muted">{contract.condicionesEntrega}</p>
                                    </TableCell>
                                    <TableCell className="px-6">
                                        <RowActions {...actionsFor(contract)} className="justify-center" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </TableCard>

            <CampaignClientContractModal
                open={panel.open !== null}
                mode={panel.open ?? "create"}
                contract={panel.contract}
                fruitName={varietyContext.fruitName}
                varietyOptions={varietyContext.options}
                initialVarieties={panel.contract ? matchingVarietyPreview(previews.contracts[panel.contract.id], panel.contract.cantidadPropuestaKg) : []}
                onOpenChange={(open) => {
                    if (!open) setPanel((current) => ({ ...current, open: null }));
                }}
                onSave={save}
            />
            <ConfirmModal
                open={deleting !== null}
                onOpenChange={(open) => {
                    if (!open) setDeleting(null);
                }}
                icon={<Trash2 size={28} />}
                title="¿Eliminar contrato?"
                description="El contrato se quitará de esta participación comercial."
                confirmLabel="Sí, eliminar"
                onConfirm={async () => {
                    if (deleting) await deleteCampaignClientContract(campaign.campaniaId, relation.clienteNegocioCampanaId, deleting.id);
                    setDeleting(null);
                }}
            />
            <CampaignSuccessModal open={successOpen} onOpenChange={setSuccessOpen} mode="contract" />
        </div>
    );
}
