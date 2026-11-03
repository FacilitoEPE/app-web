import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, PackageCheck, Send } from "lucide-react";
import LogisticsPurchaseObservationModal from "@/modules/logistics/components/LogisticsPurchaseObservationModal";
import LogisticsCampaignContextBanner from "@/modules/logistics/components/LogisticsCampaignContextBanner";
import type { LogisticsPurchase } from "@/modules/logistics/logistics.models";
import { saveLogisticsPurchaseObservation, shareLogisticsPurchases, useLogisticsLoads } from "@/modules/logistics/logistics.store";
import FilterBar, { FilterSearch, FilterSelectField } from "@/shared/components/FilterBar";
import { PageError } from "@/shared/components/PageState";
import RowActions from "@/shared/components/RowActions";
import StatusBadge from "@/shared/components/StatusBadge";
import TableCard from "@/shared/components/TableCard";
import { TableCountPill } from "@/shared/components/TableToolbar";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import TableGridCard, { TableGridCardField, TableGridCardFields } from "@/shared/components/TableGridCard";
import { Button } from "@/shared/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import PageHeader from "@/shared/layout/PageHeader";
import { formatKg } from "@/shared/utils/format";

export default function LogisticsPurchasesPage() {
    const navigate = useNavigate();
    const { campaignId, loadId } = useParams<{ campaignId: string; loadId: string }>();
    const backHref = `/logistica-despacho/${campaignId}`;
    const load = useLogisticsLoads().find(item => item.id === loadId && item.campaniaId === Number(campaignId));
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [selected, setSelected] = useState<LogisticsPurchase | null>(null);
    const [error, setError] = useState("");
    const [sharing, setSharing] = useState(false);
    if (!load) return <PageError title="Carga no encontrada" message="No se encontró esta carga en la campaña." back={{ to: backHref, label: "Volver a cargas" }} />;
    const purchases = load.compras ?? [];
    const filtered = purchases.filter(row => (!status || row.estadoRevision === status) && (!search.trim()
        || `${row.referencia} ${row.proveedorId} ${load.proveedores.find(p => p.proveedorId === row.proveedorId)?.proveedorNombre ?? ""} ${row.guia}`
            .toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es"))));
    const statuses = [...new Set(purchases.map(row => row.estadoRevision))];
    const clear = () => { setSearch(""); setStatus(""); };
    const providerName = (row: LogisticsPurchase) => load.proveedores.find(provider => provider.proveedorId === row.proveedorId)?.proveedorNombre ?? "Proveedor no encontrado";
    const locked = load.comprasBloqueadas || load.documentosCierre.cierreAdministrativoConfirmado;
    const support = (row: LogisticsPurchase) => row.soporteArchivo && "url" in row.soporteArchivo
        ? <a href={row.soporteArchivo.url} target="_blank" rel="noreferrer" className="font-semibold text-brand underline">{row.soporteArchivo.name}</a>
        : row.soporte || "Sin documento";
    const actions = (row: LogisticsPurchase) => <RowActions className="justify-end gap-1" primary={[
        { label: row.observacion ? "Editar observación" : "Registrar observación", icon: <Pencil size={18} />, onClick: () => setSelected(row) },
    ]} />;
    const share = async () => {
        setSharing(true); setError("");
        try { await shareLogisticsPurchases(load.id); }
        catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo marcar la información como compartida."); }
        finally { setSharing(false); }
    };

    return <div className="px-4 py-5 sm:px-8 lg:px-14">
        <LogisticsCampaignContextBanner load={load} caption="Compras de la carga" />
        <PageHeader icon={<PackageCheck size={24} />} title="Compras de la carga"
            description={`${load.codigo} · ${load.cliente} · ${load.transportista} (${load.placa}). Revisa las compras que viajan en esta unidad.`}
            action={<Button size="xl" variant="outline" disabled={locked || !purchases.length || sharing || load.estadoContabilidad === "Compartido con Contabilidad"} onClick={() => void share()}><Send size={18} />{load.estadoContabilidad === "Compartido con Contabilidad" ? "Compartido con Contabilidad" : "Compartir con Contabilidad"}</Button>} />
        <FilterBar className="mb-8" onClear={clear} canClear={Boolean(search || status)}>
            <FilterSearch value={search} onChange={setSearch} placeholder="Buscar proveedor, referencia o guía…" />
            <FilterSelectField label="Estado de revisión" allLabel="Todos" options={statuses.map(value => ({ value, label: value }))} value={status} onChange={setStatus} />
        </FilterBar>
        {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
        {load.comprasBloqueadas && <p className="mb-4 rounded-xl border border-status-highlight-border bg-status-highlight-surface px-4 py-3 text-sm text-ink-body">Las compras de esta carga ya fueron aplicadas a liquidaciones. La revisión se muestra en modo de consulta.</p>}
        {load.documentosCierre.cierreAdministrativoConfirmado && <p className="mb-4 text-sm text-ink-muted">El cierre administrativo bloquea cambios en las compras de esta carga.</p>}
        <TableCard icon={<PackageCheck size={24} />} title="Compras que viajan en la unidad" description="Cada proveedor conserva su referencia, cantidad y estado de revisión."
            headerRight={<TableCountPill icon={<PackageCheck size={16} />} count={filtered.length} singular="compra" plural="compras" />}
            isEmpty={filtered.length === 0} emptyTitle={search || status ? "Sin resultados para estos filtros" : "Aún no hay compras registradas"}
            emptyDescription={search || status ? "Prueba otra búsqueda o limpia los filtros." : "Las compras aparecerán al registrar la recepción de esta carga."}
            emptyAction={search || status ? { label: "Limpiar filtros", onClick: clear, tone: "secondary" } : undefined}
            page={1} pageCount={1} onPageChange={() => {}}>
            <div className="flex flex-col gap-3 sm:hidden">{filtered.map(row => <TableGridCard key={row.proveedorId} accentColor="border-l-brand" icon={<PackageCheck size={18} />}
                title={providerName(row)} subtitle={row.referencia || "Sin referencia"} badge={<StatusBadge status={row.estadoRevision} />} actions={locked ? undefined : actions(row)}>
                <TableGridCardFields><TableGridCardField label="Fruta" value={row.fruta} /><TableGridCardField label="Cantidad" value={`${formatKg(row.cantidadKg)} kg`} />
                    <TableGridCardField label="Guía" value={row.guia || "Sin documento"} /><TableGridCardField label="Soporte" value={support(row)} /></TableGridCardFields>
                {row.observacion && <p className="px-4 pb-3 text-xs text-ink-muted">Observación: {row.observacion}</p>}
            </TableGridCard>)}</div>
            <div className="hidden overflow-x-auto rounded-xl border border-border sm:block"><Table><TableHeader className={TABLE_HEAD_BG}><TableRow className="border-border hover:bg-transparent">
                {["Proveedor", "Referencia", "Fruta", "Cantidad", "Guía", "Soporte", "Revisión", ...(!locked ? ["Acciones"] : [])].map(label => <TableHead key={label} className="h-14 px-4 font-semibold text-ink">{label}</TableHead>)}
            </TableRow></TableHeader><TableBody>{filtered.map(row => <TableRow key={row.proveedorId} className="border-border">
                <TableCell className="relative h-20 px-4"><TableRowAccent color="bg-brand" /><TableRowLead icon={<PackageCheck size={18} />} title={providerName(row)} subtitle={load.proveedores.find(p => p.proveedorId === row.proveedorId)?.fincaNombre} /></TableCell>
                <TableCell className="text-ink-body">{row.referencia || "—"}</TableCell><TableCell className="text-ink-body">{row.fruta}</TableCell>
                <TableCell className="font-semibold text-ink">{formatKg(row.cantidadKg)} kg</TableCell><TableCell className="text-ink-body">{row.guia || "—"}</TableCell>
                <TableCell className="text-ink-body">{support(row)}</TableCell><TableCell><StatusBadge status={row.estadoRevision} />{row.observacion && <p className="mt-1 max-w-48 truncate text-xs text-ink-muted" title={row.observacion}>{row.observacion}</p>}</TableCell>
                {!locked && <TableCell className="w-16 px-4">{actions(row)}</TableCell>}
            </TableRow>)}</TableBody></Table></div>
        </TableCard>
        <div className="mt-5 flex flex-wrap gap-2"><Button variant="outline" onClick={() => navigate(backHref)}>Volver a cargas</Button>
            <Button variant="ghost" onClick={() => navigate("/facturacion-cobros")}>Ver facturación relacionada</Button>
            <Button variant="ghost" onClick={() => navigate("/liquidacion-compra")}>Ver liquidaciones relacionadas</Button></div>
        <p className="mt-3 text-xs text-ink-muted">Marcar como compartido registra la revisión; no envía mensajes ni registra pagos o liquidaciones.</p>
        {selected && <LogisticsPurchaseObservationModal purchase={selected} providerName={providerName(selected)} onClose={() => setSelected(null)}
            onSave={async observation => { setError(""); await saveLogisticsPurchaseObservation(load.id, selected.proveedorId, observation); }} />}
    </div>;
}
