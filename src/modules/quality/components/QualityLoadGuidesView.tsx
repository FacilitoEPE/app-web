import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, FileCheck2, Pencil, Plus, Trash2 } from "lucide-react";
import type { QualityCampaign, QualityScope } from "@/modules/quality/quality.utils";
import { useQualityDeliveryLoads, removeQualityRemissionGuide, saveQualityRemissionGuide } from "@/modules/quality/qualityOperations.store";
import type { QualitySunatRemissionGuide } from "@/modules/quality/qualityOperations.models";
import QualityCampaignContextBanner from "@/modules/quality/components/QualityCampaignContextBanner";
import QualityRemissionGuideModal from "@/modules/quality/components/QualityRemissionGuideModal";
import ConfirmModal from "@/shared/components/ConfirmModal";
import FilterBar, { FilterSearch, FilterSelectField } from "@/shared/components/FilterBar";
import RowActions from "@/shared/components/RowActions";
import StatusBadge from "@/shared/components/StatusBadge";
import TableCard from "@/shared/components/TableCard";
import { TableCountPill } from "@/shared/components/TableToolbar";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import TableGridCard, { TableGridCardField, TableGridCardFields } from "@/shared/components/TableGridCard";
import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import PageHeader from "@/shared/layout/PageHeader";
import { formatDisplayDate, formatKg } from "@/shared/utils/format";

interface Props { campaign: QualityCampaign; scope: QualityScope; loadId: string }

function assignedKilos(guide: QualitySunatRemissionGuide) {
    const allocations = Object.values(guide.kilosPorProveedor ?? {});
    return allocations.length ? allocations.reduce((sum, value) => sum + value, 0)
        : guide.proveedoresIncluidos.length ? guide.pesoBrutoTotalKg : 0;
}

export default function QualityLoadGuidesView({ campaign, scope, loadId }: Props) {
    const navigate = useNavigate();
    const load = useQualityDeliveryLoads().find(item => item.id === loadId && item.campaniaId === campaign.campaniaId && item.scope === scope);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [editing, setEditing] = useState<QualitySunatRemissionGuide | "new" | null>(null);
    const [deleting, setDeleting] = useState<QualitySunatRemissionGuide | null>(null);
    const [error, setError] = useState("");
    if (!load) return null;
    const total = load.proveedoresCarga.reduce((sum, provider) => sum + provider.kilosCargados, 0);
    const assigned = load.guiasRemision.reduce((sum, guide) => sum + assignedKilos(guide), 0);
    const available = Math.max(0, total - assigned);
    const filtered = load.guiasRemision.filter(guide => (!status || guide.estado === status)
        && (!search.trim() || [guide.numeroGuia, guide.proveedoresIncluidos.map(id => load.proveedoresCarga.find(provider => provider.proveedorId === id)?.proveedorNombre).join(" "), guide.direccionLlegada]
            .join(" ").toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es"))));
    const clear = () => { setSearch(""); setStatus(""); };
    const actions = (guide: QualitySunatRemissionGuide) => <RowActions className="justify-end gap-1" primary={[
        { label: "Ver detalles", icon: <Eye size={18} />, onClick: () => navigate(`/calidad/${scope}/${campaign.campaniaId}/guias/${load.id}/${guide.id}`) },
        ...(guide.estado !== "Generada" ? [{ label: "Editar", icon: <Pencil size={18} />, onClick: () => setEditing(guide) }] : []),
        ...(guide.estado !== "Generada" ? [{ label: "Eliminar", icon: <Trash2 size={18} />, variant: "destructive" as const, onClick: () => setDeleting(guide) }] : []),
    ]} />;

    return <div className="px-4 py-5 sm:px-8 lg:px-14">
        <QualityCampaignContextBanner campaign={campaign} scope={scope} caption="Guías de la carga" count={load.guiasRemision.length} singular="guía" plural="guías" />
        <PageHeader icon={<FileCheck2 size={24} />} title="Guías de remisión de la carga"
            description={`${load.codigoCarga} · ${load.cliente} · ${load.transportista} (${load.placa}). ${formatKg(total)} kg cargados · ${formatKg(assigned)} kg asignados · ${formatKg(available)} kg disponibles.`}
            action={<Button size="xl" disabled={available <= 0} onClick={() => setEditing("new")}><Plus size={20} />Agregar guía</Button>} />
        <FilterBar className="mb-8" onClear={clear} canClear={Boolean(search || status)}>
            <FilterSearch value={search} onChange={setSearch} placeholder="Buscar número, proveedor o destino…" />
            <FilterSelectField label="Estado" allLabel="Todos" options={[{ value: "Pendiente de datos", label: "Pendiente de datos" }, { value: "Lista para generar", label: "Lista para generar" }, { value: "Generada", label: "Generada" }]} value={status} onChange={setStatus} />
        </FilterBar>
        {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
        <TableCard icon={<FileCheck2 size={24} />} title="Guías de esta carga" description="Consulta cada guía y edita o elimina las que aún no se emitieron."
            headerRight={<TableCountPill icon={<FileCheck2 size={16} />} count={filtered.length} singular="guía" plural="guías" />}
            isEmpty={filtered.length === 0} emptyTitle={search || status ? "Sin resultados para estos filtros" : "Aún no hay guías registradas"}
            emptyDescription={search || status ? "Prueba otra búsqueda o limpia los filtros." : "Registra la primera guía con los proveedores y kilos de esta carga."}
            emptyAction={search || status ? { label: "Limpiar filtros", onClick: clear, tone: "secondary" } : undefined}
            page={1} pageCount={1} onPageChange={() => {}}>
            <div className="flex flex-col gap-3 sm:hidden">{filtered.map(guide => <TableGridCard key={guide.id} accentColor="border-l-brand" icon={<FileCheck2 size={18} />}
                title={guide.numeroGuia || "Guía sin número"} subtitle={`${guide.proveedoresIncluidos.length} proveedores`}
                badge={<StatusBadge status={guide.estado} />} actions={actions(guide)}><TableGridCardFields>
                    <TableGridCardField label="Inicio de traslado" value={formatDisplayDate(guide.fechaInicioTraslado)} />
                    <TableGridCardField label="Peso bruto" value={`${formatKg(guide.pesoBrutoTotalKg)} kg`} />
                    <TableGridCardField label="Bultos" value={guide.numeroBultos} />
                    <TableGridCardField label="Llegada" value={guide.direccionLlegada} />
                </TableGridCardFields></TableGridCard>)}</div>
            <div className="hidden overflow-x-auto rounded-xl border border-border sm:block"><Table><TableHeader className={TABLE_HEAD_BG}><TableRow className="border-border hover:bg-transparent">
                {['Guía', 'Proveedores', 'Inicio de traslado', 'Peso / bultos', 'Estado', 'Acciones'].map(label => <TableHead key={label} className={`h-14 px-5 font-semibold text-ink ${label === "Acciones" ? "w-44 text-right" : ""}`}>{label}</TableHead>)}
            </TableRow></TableHeader><TableBody>{filtered.map(guide => <TableRow key={guide.id} className="border-border">
                <TableCell className="relative h-20 px-5"><TableRowAccent color="bg-brand" /><TableRowLead icon={<FileCheck2 size={18} />} title={guide.numeroGuia || "Guía sin número"} subtitle={guide.direccionLlegada} /></TableCell>
                <TableCell className="text-ink-body">{guide.proveedoresIncluidos.length} {guide.proveedoresIncluidos.length === 1 ? "proveedor" : "proveedores"}</TableCell>
                <TableCell className="text-ink-body">{formatDisplayDate(guide.fechaInicioTraslado)}</TableCell>
                <TableCell className="font-semibold text-ink">{formatKg(guide.pesoBrutoTotalKg)} kg<p className="text-xs font-normal text-ink-muted">{guide.numeroBultos} bultos</p></TableCell>
                <TableCell><StatusBadge status={guide.estado} /></TableCell><TableCell className="w-44 whitespace-nowrap px-5">{actions(guide)}</TableCell>
            </TableRow>)}</TableBody></Table></div>
        </TableCard>
        {editing && <QualityRemissionGuideModal open onOpenChange={open => { if (!open) setEditing(null); }} load={load} editingGuide={editing === "new" ? null : editing} onSave={saveQualityRemissionGuide} />}
        <ConfirmModal open={Boolean(deleting)} onOpenChange={open => { if (!open) setDeleting(null); }} title="¿Eliminar guía?"
            description={<>Se eliminará <strong>{deleting?.numeroGuia}</strong> de esta carga. Esta acción no se puede deshacer.</>}
            confirmLabel="Sí, eliminar" onConfirm={() => { if (!deleting) return; setError(""); void Promise.resolve(removeQualityRemissionGuide(load.id, deleting.id)).catch(cause => setError(cause instanceof Error ? cause.message : "No se pudo eliminar la guía.")); setDeleting(null); }} />
    </div>;
}
