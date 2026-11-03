import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, FileCheck2 } from "lucide-react";
import type { QualityCampaign, QualityScope } from "@/modules/quality/quality.utils";
import { qualityCampaignHref } from "@/modules/quality/quality.utils";
import { useQualityDeliveryLoads } from "@/modules/quality/qualityOperations.store";
import type { QualityDeliveryLoadItem } from "@/modules/quality/qualityOperations.models";
import QualityCampaignContextBanner from "@/modules/quality/components/QualityCampaignContextBanner";
import QualityLoadDetailModal from "@/modules/quality/components/QualityLoadDetailModal";
import FilterBar, { FilterSearch, FilterSelectField } from "@/shared/components/FilterBar";
import RowActions from "@/shared/components/RowActions";
import TableCard from "@/shared/components/TableCard";
import { TableCountPill } from "@/shared/components/TableToolbar";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import TableGridCard, { TableGridCardField, TableGridCardFields } from "@/shared/components/TableGridCard";
import StatusBadge from "@/shared/components/StatusBadge";
import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import PageHeader from "@/shared/layout/PageHeader";
import { formatDisplayDate, formatKg } from "@/shared/utils/format";

interface Props { campaign: QualityCampaign; scope: QualityScope }

function guideStatus(load: QualityDeliveryLoadItem) {
    const guides = load.guiasRemision;
    if (!guides.length) return "Lista para preparar guía";
    return guides.some(guide => guide.estado !== "Generada") ? "Guía en preparación" : "Guías generadas";
}

export default function QualityGuideLoadsView({ campaign, scope }: Props) {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [detail, setDetail] = useState<QualityDeliveryLoadItem | null>(null);
    const loads = useQualityDeliveryLoads().filter(load => load.campaniaId === campaign.campaniaId && load.scope === scope && !load.id.startsWith("entrega-"));
    const filtered = loads.filter(load => (!status || guideStatus(load) === status)
        && (!search.trim() || [load.transportista, load.cliente, load.placa, load.chofer, load.codigoCarga, load.contratoRef]
            .join(" ").toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es"))));
    const clear = () => { setSearch(""); setStatus(""); };
    const openGuides = (load: QualityDeliveryLoadItem) => navigate(`${qualityCampaignHref(scope, campaign.campaniaId, "guias")}/${load.id}`);
    const actions = (load: QualityDeliveryLoadItem) => <div className="flex items-center justify-end gap-1">
        <RowActions primary={[{ label: `Ver detalle de carga ${load.codigoCarga}`, icon: <Eye size={18} />, onClick: () => setDetail(load) }]} />
        <Button size="sm" variant={guideStatus(load) === "Guías generadas" ? "outline" : "default"} onClick={() => openGuides(load)}>
            {load.guiasRemision.length === 0 ? "Preparar guía" : guideStatus(load) === "Guías generadas" ? "Ver guías" : "Continuar guía"}
        </Button>
    </div>;

    return <div className="px-4 py-5 sm:px-8 lg:px-14">
        <QualityCampaignContextBanner campaign={campaign} scope={scope} caption="Guías de remisión" count={loads.length} singular="carga" plural="cargas" />
        <PageHeader icon={<FileCheck2 size={24} />} title="Guías de remisión" description="Cada fila es una carga. Abre sus guías para prepararlas, consultarlas o administrarlas." />
        <FilterBar className="mb-8" onClear={clear} canClear={Boolean(search || status)}>
            <FilterSearch value={search} onChange={setSearch} placeholder="Buscar transportista, cliente, carga o placa…" />
            <FilterSelectField label="Estado de guías" allLabel="Todos" options={[
                { value: "Lista para preparar guía", label: "Lista para preparar guía" },
                { value: "Guía en preparación", label: "Guía en preparación" },
                { value: "Guías generadas", label: "Guías generadas" },
            ]} value={status} onChange={setStatus} />
        </FilterBar>
        <TableCard icon={<FileCheck2 size={24} />} title="Cargas y guías" description="Una carga puede distribuirse en una o varias guías de remisión."
            headerRight={<TableCountPill icon={<FileCheck2 size={16} />} count={filtered.length} singular="carga" plural="cargas" />}
            isEmpty={filtered.length === 0} emptyTitle={search || status ? "Sin resultados para estos filtros" : "Aún no hay cargas registradas"}
            emptyDescription={search || status ? "Prueba otra búsqueda o limpia los filtros." : "Registra una carga antes de preparar sus guías."}
            emptyAction={search || status ? { label: "Limpiar filtros", onClick: clear, tone: "secondary" } : undefined}
            page={1} pageCount={1} onPageChange={() => {}}>
            <div className="flex flex-col gap-3 sm:hidden">
                {filtered.map(load => <TableGridCard key={load.id} accentColor="border-l-brand" icon={<FileCheck2 size={18} />}
                    title={load.transportista} subtitle={`${load.codigoCarga} · ${load.cliente}`}
                    badge={<StatusBadge status={guideStatus(load)} />} actions={actions(load)}>
                    <TableGridCardFields>
                        <TableGridCardField label="Entrega" value={formatDisplayDate(load.fechaProgramada)} />
                        <TableGridCardField label="Placa y chofer" value={`${load.placa} · ${load.chofer}`} />
                        <TableGridCardField label="Peso de carga" value={`${formatKg(load.proveedoresCarga.reduce((sum, p) => sum + p.kilosCargados, 0))} kg`} />
                        <TableGridCardField label="Guías" value={load.guiasRemision.length} />
                    </TableGridCardFields>
                </TableGridCard>)}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
                <Table><TableHeader className={TABLE_HEAD_BG}><TableRow className="border-border hover:bg-transparent">
                    {['Transportista / carga', 'Cliente', 'Placa y chofer', 'Peso de la carga', 'Estado / guías', 'Acciones'].map(label =>
                        <TableHead key={label} className={`h-14 px-5 font-semibold text-ink ${label === "Acciones" ? "w-48 text-right" : ""}`}>{label}</TableHead>)}
                </TableRow></TableHeader><TableBody>{filtered.map(load => <TableRow key={load.id} className="border-border">
                    <TableCell className="relative h-20 px-5"><TableRowAccent color="bg-brand" /><TableRowLead icon={<FileCheck2 size={18} />} title={load.transportista} subtitle={`${load.codigoCarga} · Entrega ${formatDisplayDate(load.fechaProgramada)}`} /></TableCell>
                    <TableCell className="text-ink-body">{load.cliente}</TableCell>
                    <TableCell className="text-ink-body">{load.placa}<p className="text-xs text-ink-muted">{load.chofer}</p></TableCell>
                    <TableCell className="font-semibold text-ink">{formatKg(load.proveedoresCarga.reduce((sum, p) => sum + p.kilosCargados, 0))} kg</TableCell>
                    <TableCell><StatusBadge status={guideStatus(load)} /><p className="mt-1 text-xs text-ink-muted">{load.guiasRemision.length} {load.guiasRemision.length === 1 ? "guía" : "guías"}</p></TableCell>
                    <TableCell className="w-48 whitespace-nowrap px-5">{actions(load)}</TableCell>
                </TableRow>)}</TableBody></Table>
            </div>
        </TableCard>
        {detail && <QualityLoadDetailModal load={detail} onClose={() => setDetail(null)} />}
    </div>;
}
