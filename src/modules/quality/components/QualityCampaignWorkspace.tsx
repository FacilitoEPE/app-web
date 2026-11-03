import { ClipboardCheck, Layers, PackageCheck, Scale, ShieldCheck, Sprout } from "lucide-react";
import MetricCards, { type Metric } from "@/shared/components/MetricCards";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import StatusBadge from "@/shared/components/StatusBadge";
import TableCard from "@/shared/components/TableCard";
import { TableCountPill, TableToolbar } from "@/shared/components/TableToolbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import PageHeader from "@/shared/layout/PageHeader";
import { formatDisplayDate, formatKg } from "@/shared/utils/format";
import type { QualityCampaign, QualityScope, QualitySection } from "@/modules/quality/quality.utils";
import { useQualityDeliveryLoads } from "@/modules/quality/qualityOperations.store";

export default function QualityCampaignWorkspace({ campaign, scope }: { campaign: QualityCampaign; scope: QualityScope; section: QualitySection }) {
    const campaignLoads = useQualityDeliveryLoads().filter(l => l.campaniaId === campaign.campaniaId && l.scope === scope);
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

    return <div className="px-4 py-5 sm:px-8 lg:px-14">
        <PageHeader icon={<ShieldCheck size={24} />} title={`Resumen de campaña · ${campaign.nombre}`} description={`Cosecha y calidad · ${scope === "exportador" ? "Exportador" : "Industria"}`} />
        <div className="mb-6"><MetricCards label="Indicadores de cosecha y calidad" metrics={summaryMetrics} /></div>
            {/* SECCIÓN 1: RESUMEN DE COSECHA Y CALIDAD (EXPORTACIÓN) */}
            {(
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

    </div>;
}
