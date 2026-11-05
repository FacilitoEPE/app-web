import { usesV1 } from '@/shared/api/data-contract';
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Eye, FlaskConical, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import TableCard from "@/shared/components/TableCard";
import TableGridCard, { TableGridCardField, TableGridCardFields } from "@/shared/components/TableGridCard";
import { TableCountPill, TableToolbar } from "@/shared/components/TableToolbar";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
import StatusBadge from "@/shared/components/StatusBadge";
import ConfirmModal from "@/shared/components/ConfirmModal";
import PageHeader from "@/shared/layout/PageHeader";
import type { StoredFile } from "@/shared/components/FileDropzone";
import CampaignProviderContextBanner from "@/modules/campaigns/components/CampaignProviderContextBanner";
import CampaignExamModal, { type ExamModalMode } from "@/modules/campaigns/components/CampaignExamModal";
import CampaignSuccessModal from "@/modules/campaigns/components/CampaignSuccessModal";
import { getCampana } from "@/modules/campaigns/api/campaign.api";
import { getCampaignParticipation } from "@/modules/campaigns/api/campania-proveedor.api";
import type { Campana } from "@/modules/campaigns/api/campaign.mapper";
import type { CampaniaProveedor } from "@/modules/campaigns/api/campania-proveedor.mapper";
import { examEstadoLabel, type ExamValues, type LocalExam } from "@/modules/campaigns/campaignExam";
import { addExam, removeExam, updateExam, useProviderExams } from "@/modules/campaigns/campaignExams.store";
import { getExamenesProveedor } from "@/modules/providers/api/provider-subresources.api";
import type { ExamenProveedorDto } from "@/modules/providers/api/provider-subresources.dto";
import { PageError, PageLoading } from "@/shared/components/PageState";
import { formatDisplayDate } from "@/shared/utils/format";
import { paginate } from "@/shared/utils/paginate";

type LoadState =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; campaign: Campana; relation: CampaniaProveedor };

/** Un examen de la lista; los que ya existen en el backend se pueden ver pero no modificar desde acá */
type ExamRow = LocalExam & { fromApi: boolean };

type ModalState = { open: boolean; mode: ExamModalMode; exam: ExamRow | null };
const CLOSED_MODAL: ModalState = { open: false, mode: "create", exam: null };

const providerName = (relation: CampaniaProveedor) => relation.proveedor
    ? `${relation.proveedor.nombres} ${relation.proveedor.apellido}`.trim()
    : "Proveedor";

/** Con resultado, lo que importa es el resultado mismo; antes, la etapa en la que va el examen */
const examStatus = (exam: LocalExam) =>
    exam.estado === "resultado" && exam.resultado
        ? (exam.resultado === "positivo" ? "Positivo" : "Negativo")
        : examEstadoLabel(exam.estado);

/** Los exámenes del backend ya tienen resultado, pero no guardan etapa, muestra ni fecha de envío */
const fromApi = (exam: ExamenProveedorDto): ExamRow => ({
    id: `api-${exam.examenProveedorId}`,
    proveedorId: exam.proveedorId,
    tipoExamen: exam.tipoExamen,
    fecha: exam.fecha,
    identificacionMuestra: "—",
    estado: "resultado",
    fechaEnvioMuestra: "",
    resultado: exam.resultado,
    observacion: exam.observacion || "",
    archivo: exam.documentoUrl ? ({ name: "Documento del examen", url: exam.documentoUrl, type: "application/pdf" } satisfies StoredFile) : null,
    fromApi: true,
});

/** Gestión de los exámenes de laboratorio de un proveedor vinculado a una campaña. */
export default function CampaignExamsPage() {
    const { id, cxpId: relationParam } = useParams<{ id: string; cxpId: string }>();
    const campaignId = Number(id);
    const cxpId = Number(relationParam);
    const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
    const [apiExams, setApiExams] = useState<ExamenProveedorDto[]>([]);
    const [modal, setModal] = useState<ModalState>(CLOSED_MODAL);
    const [deleting, setDeleting] = useState<{ open: boolean; exam: ExamRow | null }>({ open: false, exam: null });
    const [success, setSuccess] = useState<{ open: boolean; mode: "exam" | "edit" }>({ open: false, mode: "exam" });
    const [page, setPage] = useState(1);

    const load = useCallback(async () => {
        if (!Number.isInteger(campaignId) || campaignId < 1 || !Number.isInteger(cxpId) || cxpId < 1) {
            setLoadState({ status: "error", message: "La campaña o el proveedor no son válidos." });
            return;
        }
        setLoadState({ status: "loading" });
        try {
            const [campaign, relation] = await Promise.all([getCampana(campaignId), getCampaignParticipation(campaignId, cxpId)]);
            if (!relation) {
                setLoadState({ status: "error", message: "No se encontró este proveedor en la campaña." });
                return;
            }
            setLoadState({ status: "ready", campaign, relation });
            // Si el servicio de exámenes falla, la gestión sigue disponible con los exámenes registrados acá
            if (!usesV1()) getExamenesProveedor(relation.proveedorId).then(setApiExams).catch(() => setApiExams([]));
        } catch {
            setLoadState({ status: "error", message: "No se pudo cargar la campaña o el proveedor." });
        }
    }, [campaignId, cxpId]);

    // Carga inicial desde las APIs existentes; los exámenes nuevos siguen siendo locales hasta que exista su servicio.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { void load(); }, [load]);

    const proveedorId = loadState.status === "ready" ? loadState.relation.proveedorId : 0;
    const localExams = useProviderExams(proveedorId);

    const rows = useMemo<ExamRow[]>(
        () => [...localExams.map((exam) => ({ ...exam, fromApi: false })), ...apiExams.map(fromApi)],
        [localExams, apiExams],
    );

    if (loadState.status !== "ready") {
        return loadState.status === "loading"
            ? <PageLoading label="Cargando exámenes..." />
            : <PageError title="Exámenes no disponibles" message={loadState.message} onRetry={() => void load()} back={{ to: `/campaigns/${campaignId}/providers`, label: "Volver a proveedores" }} />;
    }

    const { campaign, relation } = loadState;
    const name = providerName(relation);

    const { pageCount, currentPage, visible: visibleRows } = paginate(rows, page);

    const openCreate = () => setModal({ open: true, mode: "create", exam: null });

    const handleSave = async (values: ExamValues) => {
        if (modal.mode === "edit" && modal.exam && !modal.exam.fromApi) {
            await updateExam(relation.proveedorId, modal.exam.id, values);
            setSuccess({ open: true, mode: "edit" });
        } else {
            await addExam(relation.proveedorId, values);
            setSuccess({ open: true, mode: "exam" });
        }
        setModal((current) => ({ ...current, open: false }));
    };

    const getRowActions = (exam: ExamRow): RowAction[] => [
        { label: "Ver detalles", icon: <Eye size={18} strokeWidth={2.5} />, onClick: () => setModal({ open: true, mode: "view", exam }) },
        ...(exam.fromApi
            ? []
            : [
                { label: "Editar", icon: <Pencil size={18} strokeWidth={2.5} />, onClick: () => setModal({ open: true, mode: "edit", exam }) },
                { label: "Eliminar", icon: <Trash2 size={18} strokeWidth={2.5} />, variant: "destructive" as const, onClick: () => setDeleting({ open: true, exam }) },
            ]),
    ];

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            <CampaignProviderContextBanner
                campaign={campaign}
                relation={relation}
                caption="Exámenes · muestras de laboratorio"
                stats={[{ label: rows.length === 1 ? "examen" : "exámenes", value: String(rows.length) }]}
            />

            <PageHeader
                icon={<FlaskConical size={24} strokeWidth={2.5} />}
                title={`Exámenes de ${name}`}
                description="Registra las muestras de laboratorio y da seguimiento a su envío y resultado."
                action={<Button size="xl" onClick={openCreate}><Plus size={20} strokeWidth={2.5} /> Registrar examen</Button>}
            />

            <TableCard
                icon={<FlaskConical size={24} strokeWidth={2.5} />}
                title="Exámenes Registrados"
                description="Análisis de laboratorio de este proveedor, del más reciente al más antiguo."
                headerRight={
                    <TableToolbar>
                        <TableCountPill icon={<FlaskConical size={16} strokeWidth={2.5} className="text-brand" />} count={rows.length} singular="examen" plural="exámenes" />
                    </TableToolbar>
                }
                isEmpty={rows.length === 0}
                emptyIcon={<FlaskConical size={28} strokeWidth={2} />}
                emptyTitle="Aún no hay exámenes"
                emptyDescription="Este proveedor todavía no tiene exámenes de laboratorio. Haz clic en 'Registrar examen' para comenzar."
                emptyAction={{ label: "Registrar examen", icon: <Plus size={18} strokeWidth={2.5} />, onClick: openCreate }}
                page={currentPage}
                pageCount={pageCount}
                onPageChange={setPage}
            >
                {/* Móvil en tarjetas; desde sm, tabla */}
                <div className="flex flex-col gap-3 sm:hidden">
                    {visibleRows.map((exam) => (
                        <TableGridCard
                            key={exam.id}
                            accentColor="border-l-brand"
                            icon={<FlaskConical size={18} strokeWidth={2} />}
                            title={exam.identificacionMuestra}
                            subtitle={exam.tipoExamen}
                            actions={<RowActions primary={getRowActions(exam)} />}
                        >
                            <TableGridCardFields>
                                <TableGridCardField label="Estado" value={examStatus(exam)} />
                                <TableGridCardField label="Fecha del examen" value={formatDisplayDate(exam.fecha)} />
                            </TableGridCardFields>
                        </TableGridCard>
                    ))}
                </div>

                <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
                    <Table>
                        <TableHeader className={TABLE_HEAD_BG}>
                            <TableRow className="border-b border-border hover:bg-transparent">
                                <TableHead className="h-14 px-6 font-semibold text-ink">Muestra</TableHead>
                                <TableHead className="h-14 font-semibold text-ink">Tipo de examen</TableHead>
                                <TableHead className="h-14 font-semibold text-ink">Fecha del examen</TableHead>
                                <TableHead className="h-14 font-semibold text-ink">Fecha de envío</TableHead>
                                <TableHead className="h-14 text-center font-semibold text-ink">Estado</TableHead>
                                <TableHead className="h-14 w-40 px-6 text-center font-semibold text-ink">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleRows.map((exam) => (
                                <TableRow key={exam.id} className="border-b border-border transition-colors hover:bg-surface-page/60">
                                    <TableCell className="relative h-20 px-6">
                                        <TableRowAccent color="bg-brand" />
                                        <TableRowLead icon={<FlaskConical size={20} strokeWidth={2} />} title={exam.identificacionMuestra} subtitle={exam.fromApi ? "Registrado en el sistema" : undefined} />
                                    </TableCell>
                                    <TableCell className="font-medium text-ink-body">{exam.tipoExamen}</TableCell>
                                    <TableCell className="font-medium text-ink-body">{formatDisplayDate(exam.fecha)}</TableCell>
                                    <TableCell className="font-medium text-ink-body">{formatDisplayDate(exam.fechaEnvioMuestra)}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-center"><StatusBadge status={examStatus(exam)} /></div>
                                    </TableCell>
                                    <TableCell className="px-6">
                                        <RowActions primary={getRowActions(exam)} className="justify-center" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </TableCard>

            <CampaignExamModal
                open={modal.open}
                onOpenChange={(open) => setModal((current) => ({ ...current, open }))}
                providerName={name}
                mode={modal.mode}
                initialValues={modal.mode === "create" ? undefined : modal.exam ?? undefined}
                onSave={handleSave}
            />

            <ConfirmModal
                open={deleting.open}
                onOpenChange={(open) => setDeleting((current) => ({ ...current, open }))}
                icon={<Trash2 size={28} strokeWidth={2.25} />}
                title="¿Eliminar examen?"
                description={<>Se eliminará el examen <strong className="font-bold text-ink">{deleting.exam?.identificacionMuestra}</strong> de {name}. Esta acción no se puede deshacer.</>}
                confirmLabel="Sí, eliminar"
                onConfirm={async () => {
                    if (deleting.exam) await removeExam(relation.proveedorId, deleting.exam.id);
                }}
            />

            <CampaignSuccessModal
                open={success.open}
                onOpenChange={(open) => setSuccess((current) => ({ ...current, open }))}
                mode={success.mode}
            />
        </div>
    );
}
