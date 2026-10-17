import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { ClipboardList, Eye, LandPlot, MapPin, Link2, Pencil, UserRoundCheck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import TableCard from "@/shared/components/TableCard";
import TableGridCard, { TableGridCardField, TableGridCardFields } from "@/shared/components/TableGridCard";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
import { TableCountPill, TableToolbar } from "@/shared/components/TableToolbar";
import PageHeader from "@/shared/layout/PageHeader";
import CampaignProviderContextBanner from "@/modules/campaigns/components/CampaignProviderContextBanner";
import CampaignSuccessModal from "@/modules/campaigns/components/CampaignSuccessModal";
import CampaignInterviewModal, { type InterviewSubmission } from "@/modules/campaigns/components/CampaignInterviewModal";
import { getCampana, getFrutas } from "@/modules/campaigns/api/campaign.api";
import { getCampaniaProveedoresByCampania } from "@/modules/campaigns/api/campania-proveedor.api";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";
import type { CampaniaProveedor } from "@/modules/campaigns/api/campania-proveedor.mapper";
import { getCampaignInterviews, getNextCampaignFincaCode, saveCampaignInterview, type CampaignInterviewRecord } from "@/modules/campaigns/campaignInterview.utils";
import { addFinca, useProviderLocalData } from "@/modules/providers/providerLocalData.store";
import { PageError, PageLoading } from "@/shared/components/PageState";
import { paginate } from "@/shared/utils/paginate";

type LoadState =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; campaign: Campana; relation: CampaniaProveedor; fruitName: string };

type ModalState = { open: boolean; mode: "create" | "edit" | "view"; record: CampaignInterviewRecord | null };
const CLOSED_MODAL: ModalState = { open: false, mode: "create", record: null };
const locationOf = (record: CampaignInterviewRecord) =>
    [record.values.distrito, record.values.provincia, record.values.departamento].filter(Boolean).join(", ") || "—";

const providerName = (relation: CampaniaProveedor) => relation.proveedor
    ? `${relation.proveedor.nombres} ${relation.proveedor.apellido}`.trim()
    : "Productor";

/** Gestión de las entrevistas de un productor vinculado a una campaña. */
export default function CampaignInterviewsPage() {
    const { id, cxpId: relationParam } = useParams<{ id: string; cxpId: string }>();
    const campaignId = Number(id);
    const cxpId = Number(relationParam);
    const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
    const [records, setRecords] = useState<CampaignInterviewRecord[]>(() => getCampaignInterviews(cxpId));
    const [modal, setModal] = useState<ModalState>(CLOSED_MODAL);
    const [success, setSuccess] = useState<{ open: boolean; mode: "interview" | "edit" }>({ open: false, mode: "interview" });
    const [page, setPage] = useState(1);
    const { fincas } = useProviderLocalData();

    const load = useCallback(async () => {
        if (!Number.isInteger(campaignId) || campaignId < 1 || !Number.isInteger(cxpId) || cxpId < 1) {
            setLoadState({ status: "error", message: "La campaña o el proveedor no son válidos." });
            return;
        }
        setLoadState({ status: "loading" });
        try {
            const [campaign, relations] = await Promise.all([
                getCampana(campaignId),
                getCampaniaProveedoresByCampania(campaignId),
            ]);
            const relation = relations.find((item) => item.cxpId === cxpId);
            if (!relation || relation.tipoProveedor !== "productor") {
                setLoadState({ status: "error", message: "No se encontró este productor en la campaña." });
                return;
            }
            const fruitName = campaign.fruta?.name ?? (await getFrutas()).find((fruit) => fruit.frutaId === campaign.frutaId)?.name;
            if (!fruitName) {
                setLoadState({ status: "error", message: "No se pudo identificar la fruta de esta campaña para generar el código FYV." });
                return;
            }
            setLoadState({ status: "ready", campaign, relation, fruitName });
        } catch {
            setLoadState({ status: "error", message: "No se pudo cargar la campaña o el proveedor." });
        }
    }, [campaignId, cxpId]);

    // Carga inicial desde las APIs existentes; las entrevistas siguen siendo locales hasta que exista su servicio.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void load(); }, [load]);
    // Al navegar entre productores sin desmontar la ruta, se muestra el almacén del vínculo nuevo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { setRecords(getCampaignInterviews(cxpId)); }, [cxpId]);

    const handleSave = ({ values, newFinca }: InterviewSubmission) => {
        if (loadState.status !== "ready") return;
        const nextRecords = saveCampaignInterview(campaignId, cxpId, loadState.fruitName, values, modal.mode === "edit" ? modal.record?.id : undefined);
        if (newFinca) addFinca(loadState.relation.proveedorId, newFinca);
        setRecords(nextRecords);
        setModal((current) => ({ ...current, open: false }));
        setSuccess({ open: true, mode: modal.mode === "edit" ? "edit" : "interview" });
    };

    if (loadState.status !== "ready") {
        return loadState.status === "loading"
            ? <PageLoading label="Cargando entrevistas..." />
            : <PageError title="Entrevistas no disponibles" message={loadState.message} onRetry={() => void load()} back={{ to: `/campaigns/${campaignId}/providers/${cxpId}`, label: "Volver al proveedor" }} />;
    }

    const { campaign, relation, fruitName } = loadState;
    const name = providerName(relation);
    const { pageCount, currentPage, visible } = paginate(records, page);
    const actionsFor = (record: CampaignInterviewRecord): RowAction[] => [
        { label: "Ver detalles", icon: <Eye size={18} strokeWidth={2.5} />, onClick: () => setModal({ open: true, mode: "view", record }) },
        { label: "Editar", icon: <Pencil size={18} strokeWidth={2.5} />, onClick: () => setModal({ open: true, mode: "edit", record }) },
    ];
    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            <CampaignProviderContextBanner
                campaign={campaign}
                relation={relation}
                caption="Entrevistas · fincas y datos agronómicos"
                stats={[{ label: records.length === 1 ? "entrevista" : "entrevistas", value: String(records.length) }]}
            />

            <PageHeader
                icon={<UserRoundCheck size={24} />}
                title={`Entrevistas de ${name}`}
                description="Registra y consulta los datos de las fincas entrevistadas en esta campaña."
                action={<Button size="xl" onClick={() => setModal({ open: true, mode: "create", record: null })}><Link2 size={19} strokeWidth={2.5} /> Vincular finca</Button>}
            />

            <TableCard
                icon={<LandPlot size={24} strokeWidth={2.2} />}
                title="Fincas entrevistadas"
                description="Registros ordenados por fecha y hora de incorporación."
                headerRight={<TableToolbar><TableCountPill icon={<UserRoundCheck size={16} strokeWidth={2.5} className="text-brand" />} count={records.length} singular="entrevista" plural="entrevistas" /></TableToolbar>}
                isEmpty={records.length === 0}
                emptyIcon={<ClipboardList size={28} />}
                emptyTitle="Aún no hay entrevistas"
                emptyDescription="Registra la primera entrevista para consultar aquí sus datos agronómicos."
                emptyAction={{ label: "Vincular finca", icon: <Link2 size={18} strokeWidth={2.5} />, onClick: () => setModal({ open: true, mode: "create", record: null }) }}
                page={currentPage}
                pageCount={pageCount}
                onPageChange={setPage}
            >
                {/* Móvil en tarjetas; desde md, tabla */}
                <div className="flex flex-col gap-3 md:hidden">
                    {visible.map((record) => (
                        <TableGridCard
                            key={record.id}
                            accentColor="border-l-brand"
                            icon={<LandPlot size={18} strokeWidth={2} />}
                            title={record.values.fincaNombre}
                            subtitle={record.codigoFyv}
                            actions={<RowActions primary={actionsFor(record)} />}
                        >
                            <TableGridCardFields>
                                <TableGridCardField label="Registro" value={format(new Date(record.createdAt), "dd/MM/yyyy · HH:mm")} />
                                <TableGridCardField label="Ubicación" value={locationOf(record)} />
                                <TableGridCardField label="Cultivo" value={`${record.values.haCultivo} ha`} />
                            </TableGridCardFields>
                        </TableGridCard>
                    ))}
                </div>
                <div className="hidden overflow-hidden rounded-xl border border-border md:block">
                    <Table>
                        <TableHeader className={TABLE_HEAD_BG}>
                            <TableRow className="border-b border-border hover:bg-transparent">
                                <TableHead className="h-14 px-6 font-semibold text-ink">Finca</TableHead>
                                <TableHead className="h-14 font-semibold text-ink">Registro</TableHead>
                                <TableHead className="h-14 font-semibold text-ink">Ubicación</TableHead>
                                <TableHead className="h-14 font-semibold text-ink">Cultivo</TableHead>
                                <TableHead className="h-14 w-32 px-6 text-center font-semibold text-ink">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((record) => (
                                <TableRow key={record.id} className="border-b border-border transition-colors hover:bg-surface-page/60">
                                    <TableCell className="relative h-20 px-6">
                                        <TableRowAccent color="bg-brand" />
                                        <TableRowLead icon={<LandPlot size={18} />} title={record.values.fincaNombre} subtitle={record.codigoFyv} />
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap font-medium text-ink-body">{format(new Date(record.createdAt), "dd/MM/yyyy · HH:mm")}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 font-medium text-ink-body">
                                            <MapPin size={16} className="shrink-0 text-ink-muted" />
                                            <span>{locationOf(record)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-bold tabular-nums text-ink">{record.values.haCultivo} ha</span>
                                            <span className="mt-0.5 text-[12px] font-medium text-ink-muted">{record.values.densidadPlantacion} plantas/ha · {record.values.frecuenciaRiego} riegos/día</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6">
                                        <RowActions primary={actionsFor(record)} className="justify-center text-ink-muted" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </TableCard>

            <CampaignInterviewModal
                open={modal.open}
                onOpenChange={(open) => setModal((current) => ({ ...current, open }))}
                providerName={name}
                fincas={fincas[relation.proveedorId] ?? []}
                interviewedFincaNames={records.map((record) => record.values.fincaNombre ?? "")}
                previewCode={getNextCampaignFincaCode(campaignId, fruitName)}
                initialRecord={modal.record}
                isViewOnly={modal.mode === "view"}
                onSave={handleSave}
            />

            <CampaignSuccessModal open={success.open} onOpenChange={(open) => setSuccess((current) => ({ ...current, open }))} mode={success.mode} />
        </div>
    );
}
