import { useMemo, useState } from "react";
import {
    ArrowLeft,
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
import { InfoField, SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import MetricCards, { type Metric } from "@/shared/components/MetricCards";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
import SegmentedTabs, { type SegmentedTabItem } from "@/shared/components/SegmentedTabs";
import StatusBadge from "@/shared/components/StatusBadge";
import TableCard from "@/shared/components/TableCard";
import { TableCountPill, TableToolbar } from "@/shared/components/TableToolbar";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
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
import { getCampaignFruitIcon } from "@/modules/campaigns/campaignFruit";
import type { QualityCampaign, QualityScope } from "@/modules/quality/quality.utils";
import QualityDeliveryReviewModal from "@/modules/quality/components/QualityDeliveryReviewModal";
import QualityHarvestWizardModal from "@/modules/quality/components/QualityHarvestWizardModal";
import QualityLoadFormModal from "@/modules/quality/components/QualityLoadFormModal";
import QualityRemissionGuideModal from "@/modules/quality/components/QualityRemissionGuideModal";
import type {
    QualityDeliveryLoadItem,
    QualitySunatRemissionGuide,
} from "@/modules/quality/qualityOperations.demo";
import {
    createQualityExportLoad,
    saveQualityDeliveryReview,
    saveQualityHarvestWizard,
    saveQualityLoadRealData,
    saveQualityRemissionGuide,
    useQualityDeliveryLoads,
} from "@/modules/quality/qualityOperations.store";

export type QualityWorkspaceTab = "resumen" | "analisis" | "carga" | "guias";

interface QualityCampaignWorkspaceProps {
    campaign: QualityCampaign;
    scope: QualityScope;
    initialTab?: QualityWorkspaceTab;
    onBack: () => void;
}

export default function QualityCampaignWorkspace({
    campaign,
    scope,
    initialTab,
    onBack,
}: QualityCampaignWorkspaceProps) {
    const allLoads = useQualityDeliveryLoads();
    const defaultTab: QualityWorkspaceTab =
        initialTab ?? (scope === "exportador" ? "resumen" : "carga");
    const [activeTab, setActiveTab] = useState<QualityWorkspaceTab>(defaultTab);

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

    const campaignLoads = useMemo(
        () =>
            allLoads.filter(
                (item) =>
                    (item.campaniaId === campaign.campaniaId || item.fruta === campaign.fruta) &&
                    item.scope === scope,
            ),
        [allLoads, campaign.campaniaId, campaign.fruta, scope],
    );

    const tabs: readonly SegmentedTabItem[] =
        scope === "exportador"
            ? [
                  { id: "resumen", label: "Resumen de cosecha y calidad", icon: Layers },
                  {
                      id: "analisis",
                      label: "Análisis y revisión",
                      icon: FlaskConical,
                      count: campaignLoads.length,
                  },
                  {
                      id: "carga",
                      label: "Cargas por entrega",
                      icon: PackageCheck,
                      count: campaignLoads.length,
                  },
                  {
                      id: "guias",
                      label: "Guías de remisión",
                      icon: FileCheck2,
                      count: campaignLoads.reduce((s, l) => s + l.guiasRemision.length, 0),
                  },
              ]
            : [
                  {
                      id: "carga",
                      label: "Cargas por entrega — Industria",
                      icon: PackageCheck,
                      count: campaignLoads.length,
                  },
                  {
                      id: "guias",
                      label: "Guías de remisión",
                      icon: FileCheck2,
                      count: campaignLoads.reduce((s, l) => s + l.guiasRemision.length, 0),
                  },
              ];

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
                    codigoCarga: l.codigoCarga,
                })),
            ),
        [campaignLoads],
    );

    const handleCreateNewExportLoad = () => {
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
        createQualityExportLoad(created);
        setNewExportLoadOpen(false);
    };

    const getLoadActions = (load: QualityDeliveryLoadItem): { primary: RowAction[]; secondary: RowAction[] } => {
        if (scope === "industria") {
            return {
                primary: [
                    {
                        label: "Registrar / editar datos de carga",
                        icon: <Pencil size={18} strokeWidth={2.4} />,
                        onClick: () => setLoadFormModalItem(load),
                    },
                    {
                        label: "Preparar guía SUNAT",
                        icon: <FileCheck2 size={18} strokeWidth={2.4} />,
                        onClick: () =>
                            setGuideModal({
                                open: true,
                                load,
                                guide: load.guiasRemision[0] ?? null,
                            }),
                    },
                ],
                secondary: [],
            };
        }

        return {
            primary: [
                {
                    label: "Flujo de operación de cosecha (5 pasos)",
                    icon: <Sprout size={18} strokeWidth={2.4} />,
                    onClick: () => setHarvestModalLoad(load),
                },
                {
                    label: "Análisis y revisión MTD",
                    icon: <FlaskConical size={18} strokeWidth={2.4} />,
                    onClick: () => setReviewModalLoad(load),
                },
            ],
            secondary: [
                {
                    label: "Datos de carga (Anotador)",
                    icon: <PackageCheck size={16} strokeWidth={2.4} />,
                    onClick: () => setLoadFormModalItem(load),
                },
                {
                    label: "Preparar guía de remisión SUNAT",
                    icon: <FileCheck2 size={16} strokeWidth={2.4} />,
                    onClick: () =>
                        setGuideModal({
                            open: true,
                            load,
                            guide: load.guiasRemision[0] ?? null,
                        }),
                },
            ],
        };
    };

    return (
        <div className="px-4 py-5 sm:px-8 lg:px-14">
            <ContextBanner
                ariaLabel={`Campaña ${campaign.nombre}`}
                eyebrow={{
                    icon: (() => {
                        const FruitIcon = getCampaignFruitIcon(campaign.fruta);
                        return <FruitIcon size={14} strokeWidth={2.4} />;
                    })(),
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
            />

            <PageHeader
                icon={<ShieldCheck size={24} strokeWidth={2.5} />}
                title={`Operación de Cosecha y Calidad · ${campaign.nombre}`}
                description={
                    scope === "exportador"
                        ? "Gestiona el resumen de cosecha, revisión fitosanitaria MTD Ceratitis, flujo de 5 pasos de cosecha y guías SUNAT."
                        : "Gestiona las cargas industriales por entrega, validación de aptitud en acopio y guías de remisión."
                }
                action={
                    <div className="flex flex-wrap items-center gap-2.5">
                        <Button variant="outline" size="xl" onClick={onBack}>
                            <ArrowLeft size={18} strokeWidth={2.5} /> Volver al listado
                        </Button>
                        {scope === "exportador" && (
                            <Button size="xl" onClick={() => setNewExportLoadOpen(true)}>
                                <Plus size={18} strokeWidth={2.5} /> Nueva carga de Exportación
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="mb-6">
                <MetricCards label="Indicadores de cosecha y calidad" metrics={summaryMetrics} />
            </div>

            <SegmentedTabs
                tabs={tabs}
                value={activeTab}
                onChange={(v) => setActiveTab(v as QualityWorkspaceTab)}
                className="mb-6"
            />

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
                                <TableHead className="py-3.5 pl-3 pr-6 text-right font-bold text-ink">
                                    Acciones
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border/60">
                            {campaignLoads.map((load) => {
                                const cosechados = load.proveedoresCarga.reduce(
                                    (s, p) => s + p.kilosCargados,
                                    0,
                                );
                                const actions = getLoadActions(load);
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
                                    <TableRow key={m.id} className="transition-colors hover:bg-muted/30">
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
                                            {m.capturas} moscas / {m.trampas} trampas / {m.diasExposicion} d
                                        </TableCell>
                                        <TableCell className="px-3 py-3.5 text-right font-extrabold tabular-nums text-ink">
                                            {m.mtdCalculado.toFixed(4)}
                                        </TableCell>
                                        <TableCell className="py-3.5 pl-3 pr-6 text-center">
                                            <StatusBadge
                                                status={m.mtdCalculado > 0.5 ? "Observada" : "Apto"}
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
                <div className="flex flex-col gap-5">
                    {campaignLoads.map((load) => (
                        <Card key={load.id} className="border-border/90 py-0 shadow-xs">
                            <CardContent className="flex flex-col gap-4 p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-surface text-brand">
                                            <FileCheck2 size={20} strokeWidth={2.3} />
                                        </span>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-[15px] font-extrabold text-ink">
                                                    Carga {load.codigoCarga} · {load.cliente}
                                                </h3>
                                                <StatusBadge
                                                    status={`${load.guiasRemision.length} guía(s) SUNAT`}
                                                />
                                            </div>
                                            <p className="text-[12.5px] text-ink-muted">
                                                Unidad: {load.placa} ({load.chofer}) · Destino: {load.destino}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        size="lg"
                                        onClick={() =>
                                            setGuideModal({
                                                open: true,
                                                load,
                                                guide: null,
                                            })
                                        }
                                    >
                                        <Plus size={16} strokeWidth={2.5} /> Agregar guía de remisión SUNAT
                                    </Button>
                                </div>

                                {load.guiasRemision.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-border p-4 text-center text-[13px] text-ink-muted">
                                        Aún no se han emitido guías de remisión para esta carga. Pulsa{" "}
                                        <strong>+ Agregar guía de remisión SUNAT</strong> para configurarla.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {load.guiasRemision.map((guide) => (
                                            <div
                                                key={guide.id}
                                                className="flex flex-col gap-3 rounded-2xl border border-brand-border/60 bg-brand-surface/20 p-4"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[14.5px] font-extrabold text-brand">
                                                        Guía Remitente {guide.numeroGuia}
                                                    </span>
                                                    <StatusBadge status={guide.estado} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <InfoField
                                                        label="Peso bruto (KGM)"
                                                        value={`${formatKg(guide.pesoBrutoTotalKg)} kg (${guide.numeroBultos} bultos)`}
                                                    />
                                                    <InfoField
                                                        label="UBIGEO Partida → Llegada"
                                                        value={`${guide.ubigeoPartida} → ${guide.ubigeoLlegada}`}
                                                    />
                                                </div>
                                                <p className="text-[12px] text-ink-muted">
                                                    <strong>Bien:</strong> {guide.descripcionProducto}
                                                </p>
                                                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            setGuideModal({
                                                                open: true,
                                                                load,
                                                                guide,
                                                            })
                                                        }
                                                    >
                                                        <Pencil size={14} /> Configurar datos SUNAT
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => window.print()}
                                                    >
                                                        <Printer size={14} /> Vista previa / Imprimir
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
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
                onOpenRemissionGuides={(targetLoad) => {
                    setHarvestModalLoad(null);
                    setActiveTab("guias");
                    setGuideModal({
                        open: true,
                        load: targetLoad,
                        guide: targetLoad.guiasRemision[0] ?? null,
                    });
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
