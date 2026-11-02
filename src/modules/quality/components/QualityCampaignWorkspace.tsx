import { usesV1 } from '@/shared/api/data-contract';
import { useMemo, useState } from "react";
import {
    Bug,
    ClipboardCheck,
    FileCheck2,
    FlaskConical,
    Layers,
    PackageCheck,
    Pencil,
    Plus,
    Printer,
    Scale,
    ShieldCheck,
    Sprout,
    Truck,
    X,
} from "lucide-react";
import QualityManagementImg from "@/assets/quality_management.webp";
import AppModal from "@/shared/components/AppModal";
import ContextBanner from "@/shared/components/ContextBanner";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import { SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import MetricCards, { type Metric } from "@/shared/components/MetricCards";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
import StatusBadge from "@/shared/components/StatusBadge";
import TableCard from "@/shared/components/TableCard";
import { TableCountPill, TableToolbar } from "@/shared/components/TableToolbar";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/shared/components/ui/table";
import PageHeader from "@/shared/layout/PageHeader";
import { formatDisplayDate, formatKg, formatMoney } from "@/shared/utils/format";
import type { QualityCampaign, QualityScope, QualitySection } from "@/modules/quality/quality.utils";
import QualityDeliveryReviewModal from "@/modules/quality/components/QualityDeliveryReviewModal";
import QualityHarvestWizardModal from "@/modules/quality/components/QualityHarvestWizardModal";
import QualityLoadFormModal from "@/modules/quality/components/QualityLoadFormModal";
import QualityRemissionGuideModal from "@/modules/quality/components/QualityRemissionGuideModal";
import type {
    QualityDeliveryLoadItem,
    QualitySunatRemissionGuide,
} from "@/modules/quality/qualityOperations.models";
import {
    createQualityExportLoad,
    saveQualityDeliveryReview,
    saveQualityHarvestWizard,
    saveQualityLoadRealData,
    saveQualityRemissionGuide,
    useQualityDeliveryLoads,
} from "@/modules/quality/qualityOperations.store";

interface QualityCampaignWorkspaceProps {
    campaign: QualityCampaign;
    scope: QualityScope;
    section: QualitySection;
}

export default function QualityCampaignWorkspace({
    campaign,
    scope,
    section,
}: QualityCampaignWorkspaceProps) {
    const allLoads = useQualityDeliveryLoads();
    const activeTab = section;

    const [reviewModalLoad, setReviewModalLoad] = useState<QualityDeliveryLoadItem | null>(null);
    const [harvestModalLoad, setHarvestModalLoad] = useState<QualityDeliveryLoadItem | null>(null);
    const [loadFormModalItem, setLoadFormModalItem] = useState<QualityDeliveryLoadItem | null>(null);
    const [guideModal, setGuideModal] = useState<{
        open: boolean;
        load: QualityDeliveryLoadItem | null;
        guide: QualitySunatRemissionGuide | null;
    }>({
        open: false,
        load: null,
        guide: null,
    });

    const [newExportLoadOpen, setNewExportLoadOpen] = useState(false);
    const [newLoadCliente, setNewLoadCliente] = useState("Nature's Pride B.V.");
    const [newLoadDestino, setNewLoadDestino] = useState("Planta Empacadora Paita · Zona Industrial II");
    const [newLoadKilos, setNewLoadKilos] = useState("20000");

    const openGuide = (
        load: QualityDeliveryLoadItem,
        guide: QualitySunatRemissionGuide | null = load.guiasRemision[0] ?? null,
    ) => {
        if (load.id.startsWith("entrega-")) {
            setLoadFormModalItem(load);
            return;
        }
        setGuideModal({ open: true, load, guide });
    };

    const campaignLoads = useMemo(
        () =>
            allLoads.filter(
                (item) =>
                    item.campaniaId === campaign.campaniaId &&
                    item.scope === scope,
            ),
        [allLoads, campaign.campaniaId, scope],
    );

    const totalKilosProgramados = campaignLoads.reduce((s, l) => s + l.kilosProgramados, 0);
    const totalKilosCosechados = campaignLoads.reduce(
        (s, l) =>
            s +
            l.proveedoresCarga.reduce((acc, p) => acc + p.kilosCargados, 0),
        0,
    );
    const avancePct =
        totalKilosProgramados > 0
            ? Math.min(100, Math.round((totalKilosCosechados / totalKilosProgramados) * 100))
            : 0;
    const totalProductores = new Set(
        campaignLoads.flatMap((l) => l.proveedoresCarga.map((p) => p.proveedorNombre)),
    ).size;

    const summaryMetrics: Metric[] = [
        {
            title: "Kilos programados",
            value: formatKg(totalKilosProgramados),
            unit: "kg",
            description: `${campaignLoads.length} entrega(s) en ${scope === "exportador" ? "Exportación" : "Industria"}`,
            icon: Scale,
        },
        {
            title: "Kilos cosechados / cargados",
            value: formatKg(totalKilosCosechados),
            unit: "kg",
            description: "Acumulado en campo y acopio",
            icon: Sprout,
        },
        {
            title: "Avance de cosecha",
            value: `${avancePct}%`,
            unit: "completado",
            description: "Frente a las entregas programadas",
            icon: ClipboardCheck,
        },
        {
            title: "Productores y fincas",
            value: String(totalProductores),
            unit: totalProductores === 1 ? "proveedor" : "proveedores",
            description: "Con trazabilidad activa en campaña",
            icon: Layers,
        },
    ];

    const allMtdRecords = useMemo(
        () =>
            campaignLoads.flatMap((l) =>
                l.mtdRegistros.map((m) => ({
                    ...m,
                    rowKey: l.id + ":" + m.id,
                    codigoCarga: l.codigoCarga,
                })),
            ),
        [campaignLoads],
    );

    const handleCreateNewExportLoad = async () => {
        const created: QualityDeliveryLoadItem = {
            id: `qload-${Date.now()}`,
            codigoCarga: `CAR-2026-00${allLoads.length + 4}`,
            campaniaId: campaign.campaniaId,
            campaniaNombre: campaign.nombre,
            fruta: campaign.fruta,
            scope,
            cliente: newLoadCliente,
            contratoRef: "CNT-EXP-2026-08",
            destino: newLoadDestino,
            fechaProgramada: "2026-10-30",
            fechaCargaReal: "2026-10-30",
            transportista: "Transportes Frigoríficos del Norte S.A.C.",
            placa: "B8T-914",
            chofer: "Carlos Alberto Mendoza Ríos",
            licencia: "Q43892104",
            anotador: "Ing. Roberto Valladolid",
            kilosProgramados: Number(newLoadKilos) || 20000,
            cumpleRequisitosIndustria: true,
            motivoRechazoIndustria: "",
            viaticosMovilidad: 320,
            viaticosInsumos: 120,
            gastoCuadrilla: 850,
            gastoAnotadores: 200,
            observacionesCarga: "",
            estadoRevision: "Pendiente de revisión",
            mtdRegistros: [
                {
                    id: `mtd-${Date.now()}`,
                    productor: "Segundo Teodoro Juárez Zeta",
                    finca: "Fundo San Isidro",
                    codigoSenasa: "002-01458-01",
                    capturas: 1,
                    trampas: 4,
                    diasExposicion: 7,
                    mtdCalculado: 0.0357,
                    evidenciaConteo: null,
                },
            ],
            analisisLaboratorio: [],
            organizacionCosecha: {
                jefeCuadrilla: "Ing. Roberto Valladolid",
                personalAsignado: 15,
                fechaProgramadaInicio: "2026-10-30",
                jabas: 950,
                tijeras: 18,
                bines: 0,
                mallas: 0,
                otrosMateriales: "",
                movilidadTraslado: "Minibús personal",
                observaciones: "",
                confirmada: false,
            },
            avancesCosecha: [],
            cierreCosecha: {
                fechaTermino: "",
                cosechaCompletada: false,
                informeFinalCosecha: null,
                solicitudPagoPersonal: null,
                solicitudPagoMovilidad: null,
                reciboPagoPersonal: null,
                reciboPagoMovilidad: null,
                registroCompraFruta: null,
            },
            proveedoresCarga: [
                {
                    proveedorId: "prov-1",
                    proveedorNombre: "Segundo Teodoro Juárez Zeta",
                    fincaNombre: "Fundo San Isidro",
                    rol: "Productor",
                    tipoFruta: "Orgánica",
                    variedad: "Kent",
                    kilosCargados: Number(newLoadKilos) || 20000,
                    jabasCargadas: 950,
                    jabasVacias: 15,
                    binesCargados: 0,
                    binesVacios: 0,
                    mallasCargadas: 0,
                    mallasVacias: 0,
                },
            ],
            guiasRemision: [],
        };
        await createQualityExportLoad(created);
        setNewExportLoadOpen(false);
    };

    const getLoadActions = (load: QualityDeliveryLoadItem): { primary: RowAction[]; secondary: RowAction[] } => ({
        primary: [{ label: "Editar carga", icon: <Pencil size={18} strokeWidth={2.4} />, onClick: () => setLoadFormModalItem(load) }],
        secondary: scope === "exportador"
            ? [{ label: "Flujo de operación de cosecha", icon: <Sprout size={16} strokeWidth={2.4} />, onClick: () => setHarvestModalLoad(load) }]
            : [],
    });

    const registrationTargets = activeTab === "analisis"
        ? campaignLoads
        : activeTab === "carga"
            ? campaignLoads.filter((load) => load.id.startsWith("entrega-"))
            : activeTab === "guias"
                ? campaignLoads.filter((load) => !load.id.startsWith("entrega-"))
                : [];
    const canCreateLegacyLoad = activeTab === "carga" && scope === "exportador" && !usesV1();
    const sectionTitle = activeTab === "analisis" ? "Análisis y revisión"
        : activeTab === "carga" ? "Carga"
            : activeTab === "guias" ? "Guías de remisión" : "Resumen de campaña";
    const registerLabel = activeTab === "analisis" ? "Registrar análisis y revisión"
        : activeTab === "carga" ? "Registrar carga" : "Registrar guía de remisión";
    const openRegistration = (load: QualityDeliveryLoadItem) => {
        if (activeTab === "analisis") setReviewModalLoad(load);
        else if (activeTab === "carga") setLoadFormModalItem(load);
        else if (activeTab === "guias") openGuide(load, null);
    };
    const guideRows = campaignLoads.flatMap((load) => load.guiasRemision.map((guide) => ({ load, guide })));

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            {activeTab !== "resumen" && <ContextBanner
                ariaLabel={`Campaña ${campaign.nombre}`}
                eyebrow={{
                    icon: <Sprout size={14} strokeWidth={2.4} />,
                    label: `Campaña · ${campaign.fruta}`,
                }}
                title={campaign.nombre}
                titleAddon={<StatusBadge status={campaign.estado} />}
                caption={`Cosecha y Control de Calidad · Canal ${scope === "exportador" ? "Exportación" : "Industria"}`}
                image={QualityManagementImg}
                stats={[
                    { label: "entregas", value: String(campaignLoads.length) },
                    { label: "cosechados", value: `${formatKg(totalKilosCosechados)} kg` },
                ]}
            />}

            <PageHeader
                icon={<ShieldCheck size={24} strokeWidth={2.5} />}
                title={`${sectionTitle} · ${campaign.nombre}`}
                description={activeTab === "resumen"
                    ? `Resumen de cosecha y calidad en ${scope === "exportador" ? "Exportador" : "Industria"}.`
                    : activeTab === "analisis"
                        ? "Registra y consulta el análisis MTD y la revisión de cada entrega."
                        : activeTab === "carga"
                            ? "Registra y consulta los datos reales de carga de las entregas."
                            : "Registra y consulta las guías de remisión de las cargas de la campaña."}
                action={activeTab !== "resumen" ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger render={<Button size="xl" disabled={registrationTargets.length === 0 && !canCreateLegacyLoad} />}>
                            <Plus size={18} strokeWidth={2.5} /> {registerLabel}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={8} className="max-h-72 w-80 overflow-y-auto rounded-xl border-border bg-popover p-1.5 shadow-xl">
                            {registrationTargets.map((load) => (
                                <DropdownMenuItem key={load.id} onClick={() => openRegistration(load)} className="cursor-pointer rounded-lg px-3 py-2.5 text-ink-body">
                                    <PackageCheck size={16} className="text-brand" />
                                    <span className="truncate">{load.codigoCarga || `Entrega ${formatDisplayDate(load.fechaProgramada)}`} · {load.cliente}</span>
                                </DropdownMenuItem>
                            ))}
                            {canCreateLegacyLoad && <DropdownMenuItem onClick={() => setNewExportLoadOpen(true)} className="cursor-pointer rounded-lg px-3 py-2.5 text-ink-body">
                                <Plus size={16} className="text-brand" /> Nueva carga de Exportación
                            </DropdownMenuItem>}
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : undefined}
            />

            {activeTab === "resumen" && <div className="mb-6">
                <MetricCards label="Indicadores de cosecha y calidad" metrics={summaryMetrics} />
            </div>}

            {/* SECCIÓN 1: RESUMEN DE COSECHA Y CALIDAD (EXPORTACIÓN) */}
            {activeTab === "resumen" && (
                <TableCard
                    icon={<ClipboardCheck size={24} strokeWidth={2.2} />}
                    title="Avance por entrega programada"
                    description="Estado integral de revisión fitosanitaria, organización de cuadrilla y kilos cosechados por entrega."
                    headerRight={
                        <TableToolbar>
                            <TableCountPill
                                icon={<PackageCheck size={16} strokeWidth={2.5} className="text-brand" />}
                                count={campaignLoads.length}
                                singular="entrega"
                                plural="entregas"
                            />
                        </TableToolbar>
                    }
                    isEmpty={campaignLoads.length === 0}
                    emptyTitle="No hay entregas programadas"
                    emptyDescription="Registra una nueva carga de exportación para esta campaña."
                    page={1}
                    pageCount={1}
                    onPageChange={() => {}}
                >
                    <Table>
                        <TableHeader>
                            <TableRow className={`${TABLE_HEAD_BG} hover:bg-brand-surface`}>
                                <TableHead className="py-3.5 pl-6 pr-3 font-bold text-ink">Entrega</TableHead>
                                <TableHead className="px-3 py-3.5 font-bold text-ink">
                                    Productores / Fincas
                                </TableHead>
                                <TableHead className="px-3 py-3.5 text-center font-bold text-ink">Revisión</TableHead>
                                <TableHead className="px-3 py-3.5 text-center font-bold text-ink">
                                    Organización
                                </TableHead>
                                <TableHead className="px-3 py-3.5 text-right font-bold text-ink">
                                    Kilos programados
                                </TableHead>
                                <TableHead className="px-3 py-3.5 text-right font-bold text-ink">
                                    Kilos cosechados
                                </TableHead>
                                <TableHead className="px-3 py-3.5 text-center font-bold text-ink">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border/60">
                            {campaignLoads.map((load) => {
                                const cosechados = load.proveedoresCarga.reduce(
                                    (s, p) => s + p.kilosCargados,
                                    0,
                                );
                                return (
                                    <TableRow key={load.id} className="transition-colors hover:bg-muted/30">
                                        <TableCell className="relative py-3.5 pl-6 pr-3">
                                            <TableRowAccent color="bg-brand" />
                                            <TableRowLead
                                                icon={<PackageCheck size={18} strokeWidth={2.2} />}
                                                title={`${load.codigoCarga} · ${load.cliente}`}
                                                subtitle={`${formatDisplayDate(load.fechaProgramada)} · ${load.destino}`}
                                            />
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5">
                                            <div className="flex flex-col text-[12.5px]">
                                                <span className="font-bold text-ink">
                                                    {load.proveedoresCarga.length} proveedor(es)
                                                </span>
                                                <span className="text-ink-muted">
                                                    {load.proveedoresCarga
                                                        .map((p) => p.fincaNombre)
                                                        .join(", ")}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-center">
                                            <StatusBadge status={load.estadoRevision} />
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-center">
                                            <StatusBadge
                                                status={
                                                    load.organizacionCosecha.confirmada
                                                        ? "Confirmada"
                                                        : "Por organizar"
                                                }
                                            />
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-right font-bold tabular-nums text-ink">
                                            {formatKg(load.kilosProgramados)} kg
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-right font-extrabold tabular-nums text-brand">
                                            {formatKg(cosechados)} kg
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-center">
                                            <StatusBadge
                                                status={
                                                    load.cierreCosecha.cosechaCompletada
                                                        ? "Cosecha cerrada"
                                                        : "En cosecha"
                                                }
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableCard>
            )}

            {/* SECCIÓN 2: ANÁLISIS Y REVISIÓN (EXPORTACIÓN) */}
            {activeTab === "analisis" && (
                <div className="flex flex-col gap-6">
                    <TableCard
                        icon={<Bug size={24} strokeWidth={2.2} />}
                        title="MTD actual por productor y finca"
                        description="Monitoreo de Mosca de la Fruta (Ceratitis capitata) en los lugares de producción SENASA vinculados."
                        isEmpty={allMtdRecords.length === 0}
                        emptyTitle="Sin registros MTD"
                        emptyDescription="No hay conteos MTD registrados aún."
                        page={1}
                        pageCount={1}
                        onPageChange={() => {}}
                    >
                        <Table>
                            <TableHeader>
                                <TableRow className={`${TABLE_HEAD_BG} hover:bg-brand-surface`}>
                                    <TableHead className="py-3.5 pl-6 pr-3 font-bold text-ink">Productor</TableHead>
                                    <TableHead className="px-3 py-3.5 font-bold text-ink">Finca</TableHead>
                                    <TableHead className="px-3 py-3.5 font-bold text-ink">Código SENASA</TableHead>
                                    <TableHead className="px-3 py-3.5 font-bold text-ink">Carga</TableHead>
                                    <TableHead className="px-3 py-3.5 text-right font-bold text-ink">
                                        Capturas / Trampas / Días
                                    </TableHead>
                                    <TableHead className="px-3 py-3.5 text-right font-bold text-ink">
                                        MTD Ceratitis
                                    </TableHead>
                                    <TableHead className="py-3.5 pl-3 pr-6 text-center font-bold text-ink">
                                        Estado
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-border/60">
                                {allMtdRecords.map((m) => (
                                    <TableRow key={m.rowKey} className="transition-colors hover:bg-muted/30">
                                        <TableCell className="relative py-3.5 pl-6 pr-3">
                                            <TableRowAccent
                                                color={m.mtdCalculado > 0.5 ? "bg-status-error" : "bg-brand"}
                                            />
                                            <TableRowLead
                                                icon={<Bug size={18} strokeWidth={2.2} />}
                                                title={m.productor}
                                                subtitle={m.finca}
                                            />
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 font-semibold text-ink">
                                            {m.finca}
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 font-mono text-[12.5px] text-ink-muted">
                                            {m.codigoSenasa}
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 font-bold text-brand">
                                            {m.codigoCarga}
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-right tabular-nums text-[13px] text-ink">
                                            {m.capturas == null || m.trampas == null || m.diasExposicion == null ? "Sin datos de conteo" : m.capturas + " moscas / " + m.trampas + " trampas / " + m.diasExposicion + " d"}
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-right font-extrabold tabular-nums text-ink">
                                            {m.capturas == null || m.trampas == null || m.diasExposicion == null ? "Pendiente" : m.mtdCalculado.toFixed(4)}
                                        </TableCell>
                                        <TableCell className="py-3.5 pl-3 pr-6 text-center">
                                            <StatusBadge
                                                status={m.capturas == null || m.trampas == null || m.diasExposicion == null ? "Pendiente" : m.mtdCalculado > 0.5 ? "Observada" : "Apto"}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableCard>

                    <TableCard
                        icon={<FlaskConical size={24} strokeWidth={2.2} />}
                        title="Entregas programadas de Exportación · Revisión de calidad"
                        description="Evalúa el MTD Ceratitis y los análisis de laboratorio de cada entrega para autorizar el corte."
                        isEmpty={campaignLoads.length === 0}
                        emptyTitle="No hay entregas para revisar"
                        emptyDescription="Agrega una carga de exportación para evaluar su calidad."
                        page={1}
                        pageCount={1}
                        onPageChange={() => {}}
                    >
                        <Table>
                            <TableHeader>
                                <TableRow className={`${TABLE_HEAD_BG} hover:bg-brand-surface`}>
                                    <TableHead className="py-3.5 pl-6 pr-3 font-bold text-ink">Entrega</TableHead>
                                    <TableHead className="px-3 py-3.5 font-bold text-ink">
                                        Análisis de laboratorio
                                    </TableHead>
                                    <TableHead className="px-3 py-3.5 text-center font-bold text-ink">
                                        Estado de revisión
                                    </TableHead>
                                    <TableHead className="py-3.5 pl-3 pr-6 text-right font-bold text-ink">
                                        Acciones
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-border/60">
                                {campaignLoads.map((load) => (
                                    <TableRow key={load.id} className="transition-colors hover:bg-muted/30">
                                        <TableCell className="relative py-3.5 pl-6 pr-3">
                                            <TableRowAccent color="bg-brand" />
                                            <TableRowLead
                                                icon={<FlaskConical size={18} strokeWidth={2.2} />}
                                                title={`${load.codigoCarga} · ${load.cliente}`}
                                                subtitle={`${formatDisplayDate(load.fechaProgramada)} · ${formatKg(load.kilosProgramados)} kg`}
                                            />
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-[13px] font-medium text-ink">
                                            {load.analisisLaboratorio.length > 0
                                                ? `${load.analisisLaboratorio.length} muestra(s) registradas`
                                                : "Sin muestras registradas"}
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-center">
                                            <StatusBadge status={load.estadoRevision} />
                                        </TableCell>
                                        <TableCell className="py-3.5 pl-3 pr-6 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setReviewModalLoad(load)}
                                            >
                                                <FlaskConical size={15} /> Revisar / Ver análisis
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableCard>
                </div>
            )}

            {/* SECCIÓN 3: CARGAS POR ENTREGA (EXPORTACIÓN E INDUSTRIA) */}
            {activeTab === "carga" && (
                <TableCard
                    icon={<PackageCheck size={24} strokeWidth={2.2} />}
                    title={`Cargas por entrega — ${scope === "exportador" ? "Exportación" : "Industria"}`}
                    description="Gestiona los datos reales de carga en campo, gastos de cuadrilla/viáticos y el flujo de cosecha."
                    isEmpty={campaignLoads.length === 0}
                    emptyTitle="No hay cargas registradas"
                    emptyDescription="No existen cargas asociadas a esta campaña."
                    page={1}
                    pageCount={1}
                    onPageChange={() => {}}
                >
                    <Table>
                        <TableHeader>
                            <TableRow className={`${TABLE_HEAD_BG} hover:bg-brand-surface`}>
                                <TableHead className="py-3.5 pl-6 pr-3 font-bold text-ink">
                                    Entrega / Cliente
                                </TableHead>
                                <TableHead className="px-3 py-3.5 font-bold text-ink">
                                    Viaje y Transporte
                                </TableHead>
                                <TableHead className="px-3 py-3.5 font-bold text-ink">
                                    Proveedores / Fincas
                                </TableHead>
                                <TableHead className="px-3 py-3.5 text-right font-bold text-ink">
                                    Kilos cargados
                                </TableHead>
                                <TableHead className="px-3 py-3.5 text-right font-bold text-ink">
                                    Gastos / Viáticos
                                </TableHead>
                                <TableHead className="px-3 py-3.5 text-center font-bold text-ink">Estado</TableHead>
                                <TableHead className="py-3.5 pl-3 pr-6 text-right font-bold text-ink">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border/60">
                            {campaignLoads.map((load) => {
                                const kilos = load.proveedoresCarga.reduce(
                                    (s, p) => s + p.kilosCargados,
                                    0,
                                );
                                const gastos =
                                    load.viaticosMovilidad +
                                    load.viaticosInsumos +
                                    load.gastoCuadrilla +
                                    load.gastoAnotadores;
                                const actions = getLoadActions(load);
                                return (
                                    <TableRow key={load.id} className="transition-colors hover:bg-muted/30">
                                        <TableCell className="relative py-3.5 pl-6 pr-3">
                                            <TableRowAccent color="bg-brand" />
                                            <TableRowLead
                                                icon={<PackageCheck size={18} strokeWidth={2.2} />}
                                                title={`${load.codigoCarga} · ${load.cliente}`}
                                                subtitle={load.destino}
                                            />
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5">
                                            <div className="flex flex-col text-[12.5px]">
                                                <span className="font-bold text-ink">
                                                    {load.transportista} ({load.placa})
                                                </span>
                                                <span className="text-ink-muted">
                                                    Chofer: {load.chofer} · {formatDisplayDate(load.fechaCargaReal)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-[12.5px] font-medium text-ink">
                                            {load.proveedoresCarga
                                                .map((p) => `${p.proveedorNombre} (${p.fincaNombre})`)
                                                .join(" · ")}
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-right font-extrabold tabular-nums text-brand">
                                            {formatKg(kilos)} kg
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-right font-bold tabular-nums text-ink">
                                            S/ {formatMoney(gastos)}
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-center">
                                            <StatusBadge
                                                status={
                                                    scope === "industria"
                                                        ? load.cumpleRequisitosIndustria
                                                            ? "Carga conforme"
                                                            : "Rechazada"
                                                        : load.cierreCosecha.cosechaCompletada
                                                          ? "Cosecha cerrada"
                                                          : "En cosecha"
                                                }
                                            />
                                        </TableCell>
                                        <TableCell className="py-3.5 pl-3 pr-6 text-right">
                                            <RowActions
                                                primary={actions.primary}
                                                secondary={actions.secondary}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableCard>
            )}

            {/* SECCIÓN 4: GUÍAS DE REMISIÓN SUNAT */}
            {activeTab === "guias" && (
                <TableCard
                    icon={<FileCheck2 size={24} strokeWidth={2.2} />}
                    title="Guías de remisión SUNAT"
                    description="Consulta y configura las guías registradas para las cargas de esta campaña."
                    headerRight={<TableToolbar><TableCountPill icon={<FileCheck2 size={16} className="text-brand" />} count={guideRows.length} singular="guía" plural="guías" /></TableToolbar>}
                    isEmpty={guideRows.length === 0}
                    emptyTitle="Aún no hay guías de remisión"
                    emptyDescription="Usa Registrar guía de remisión y elige una carga registrada."
                    page={1}
                    pageCount={1}
                    onPageChange={() => {}}
                >
                    <Table>
                        <TableHeader className={TABLE_HEAD_BG}>
                            <TableRow>
                                <TableHead className="h-14 px-6 font-semibold text-ink">Carga / cliente</TableHead>
                                <TableHead className="font-semibold text-ink">Guía</TableHead>
                                <TableHead className="font-semibold text-ink">Traslado</TableHead>
                                <TableHead className="font-semibold text-ink">Peso y bultos</TableHead>
                                <TableHead className="font-semibold text-ink">Estado</TableHead>
                                <TableHead className="px-6 text-right font-semibold text-ink">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {guideRows.map(({ load, guide }) => (
                                <TableRow key={`${load.id}:${guide.id}`} className="border-b border-border hover:bg-surface-page/60">
                                    <TableCell className="relative h-20 px-6"><TableRowAccent color="bg-brand" /><TableRowLead icon={<FileCheck2 size={18} />} title={load.codigoCarga || "Carga"} subtitle={load.cliente} /></TableCell>
                                    <TableCell className="font-semibold text-ink">{guide.numeroGuia}</TableCell>
                                    <TableCell className="text-ink-body">{formatDisplayDate(guide.fechaInicioTraslado)}</TableCell>
                                    <TableCell className="text-ink-body">{formatKg(guide.pesoBrutoTotalKg)} kg · {guide.numeroBultos} bultos</TableCell>
                                    <TableCell><StatusBadge status={guide.estado} /></TableCell>
                                    <TableCell className="px-6"><RowActions className="justify-end" primary={[{ label: "Editar guía", icon: <Pencil size={18} />, onClick: () => openGuide(load, guide) }, { label: "Imprimir guía", icon: <Printer size={18} />, onClick: () => window.print() }]} /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableCard>
            )}

            {/* Modal: Nueva carga de Exportación */}
            <AppModal
                open={newExportLoadOpen}
                onOpenChange={setNewExportLoadOpen}
                icon={<Truck size={22} />}
                title="Nueva carga de Exportación"
                description={`Programar nueva operación de cosecha y carga en ${campaign.nombre}`}
                size="md"
                footer={
                    <>
                        <Button variant="outline" size="xl" onClick={() => setNewExportLoadOpen(false)}>
                            <X size={18} /> Cancelar
                        </Button>
                        <Button size="xl" onClick={handleCreateNewExportLoad}>
                            <Plus size={18} /> Crear carga de exportación
                        </Button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <SummaryBar
                        items={[
                            { label: "Campaña", value: campaign.nombre, tone: "brand" },
                            { label: "Alcance", value: "Exportación" },
                        ]}
                    />
                    <InputField
                        id="new-exp-cliente"
                        label="Cliente destinatario"
                        required
                        value={newLoadCliente}
                        onChange={setNewLoadCliente}
                    />
                    <InputField
                        id="new-exp-destino"
                        label="Planta / Destino de entrega"
                        required
                        value={newLoadDestino}
                        onChange={setNewLoadDestino}
                    />
                    <InputField
                        id="new-exp-kilos"
                        label="Kilos programados"
                        type="number"
                        required
                        value={newLoadKilos}
                        onChange={setNewLoadKilos}
                    />
                </div>
            </AppModal>

            {/* 4 Modales operativos de Cosecha y Calidad */}
            <QualityDeliveryReviewModal
                open={Boolean(reviewModalLoad)}
                onOpenChange={(open) => {
                    if (!open) setReviewModalLoad(null);
                }}
                load={reviewModalLoad}
                onSave={saveQualityDeliveryReview}
            />

            <QualityHarvestWizardModal
                open={Boolean(harvestModalLoad)}
                onOpenChange={(open) => {
                    if (!open) setHarvestModalLoad(null);
                }}
                load={harvestModalLoad}
                onSave={saveQualityHarvestWizard}
                onOpenLoadForm={(targetLoad) => {
                    setHarvestModalLoad(null);
                    setLoadFormModalItem(targetLoad);
                }}
            />

            <QualityLoadFormModal
                open={Boolean(loadFormModalItem)}
                onOpenChange={(open) => {
                    if (!open) setLoadFormModalItem(null);
                }}
                load={loadFormModalItem}
                onSave={saveQualityLoadRealData}
            />

            <QualityRemissionGuideModal
                open={guideModal.open}
                onOpenChange={(open) => setGuideModal((current) => ({ ...current, open }))}
                load={guideModal.load}
                editingGuide={guideModal.guide}
                onSave={saveQualityRemissionGuide}
            />
        </div>
    );
}
