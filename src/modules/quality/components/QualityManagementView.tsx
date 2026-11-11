import { useState } from "react";
import { ArrowRight, Eye, FlaskConical, PackageCheck, Pencil, Plus, X } from "lucide-react";
import type { QualityCampaign, QualityScope } from "@/modules/quality/quality.utils";
import { useQualityAnalysis } from "@/modules/quality/qualityAnalysis.store";
import { ANALYSIS_TYPE_OPTIONS, filterQualityAnalysisRecords, type QualityAnalysisRecord } from "@/modules/quality/qualityAnalysis.utils";
import { saveQualityLoadRealData, useQualityDeliveryLoads } from "@/modules/quality/qualityOperations.store";
import type { QualityDeliveryLoadItem } from "@/modules/quality/qualityOperations.models";
import QualityAnalysisModal from "@/modules/quality/components/QualityAnalysisModal";
import QualityCampaignContextBanner from "@/modules/quality/components/QualityCampaignContextBanner";
import QualityLoadFormModal from "@/modules/quality/components/QualityLoadFormModal";
import QualityLoadDetailModal from "@/modules/quality/components/QualityLoadDetailModal";
import PageHeader from "@/shared/layout/PageHeader";
import FilterBar, { FilterSearch, FilterSelectField } from "@/shared/components/FilterBar";
import TableCard from "@/shared/components/TableCard";
import { TableCountPill, TableExportMenu, TableToolbar } from "@/shared/components/TableToolbar";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import TableGridCard, { TableGridCardField, TableGridCardFields } from "@/shared/components/TableGridCard";
import RowActions from "@/shared/components/RowActions";
import AppModal from "@/shared/components/AppModal";
import FormField from "@/shared/components/FormField";
import { Button } from "@/shared/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/shared/components/ui/table";
import { formatDisplayDate, formatKg } from "@/shared/utils/format";

interface Props { campaign: QualityCampaign; scope: QualityScope; section: "analisis" | "carga" }
const titles = { analisis: "Análisis y revisión", carga: "Carga" };
const kilos = (load: QualityDeliveryLoadItem) => load.proveedoresCarga.reduce((sum, p) => sum + p.kilosCargados, 0);
type Row = { id: string; title: string; subtitle: string; date: string; type: string; result: string; document: string; analysis?: QualityAnalysisRecord; load?: QualityDeliveryLoadItem };

export default function QualityManagementView({ campaign, scope, section }: Props) {
    const analyses = useQualityAnalysis(campaign.campaniaId);
    const loads = useQualityDeliveryLoads().filter(l => l.campaniaId === campaign.campaniaId && l.scope === scope);
    const [search, setSearch] = useState("");
    const [type, setType] = useState("");
    const [result, setResult] = useState("");
    const [descending, setDescending] = useState(true);
    const [analysisModal, setAnalysisModal] = useState<{ record: QualityAnalysisRecord | null; readOnly: boolean } | null>(null);
    const [registerOpen, setRegisterOpen] = useState(false);
    const [deliveryId, setDeliveryId] = useState("");
    const [loadEdit, setLoadEdit] = useState<QualityDeliveryLoadItem | null>(null);
    const [detail, setDetail] = useState<Row | null>(null);
    const isAnalysis = section === "analisis";
    const Icon = isAnalysis ? FlaskConical : PackageCheck;
    const title = titles[section];
    const register = isAnalysis ? "Registrar análisis" : "Registrar carga";
    const pending = loads.filter(load => load.puedeRegistrarCarga)
        .sort((a, b) => a.fechaProgramada.localeCompare(b.fechaProgramada));
    const delivery = pending.find(load => load.id === deliveryId);
    const clear = () => { setSearch(""); setType(""); setResult(""); };
    const hasFilters = Boolean(search || type || result);
    const rows: Row[] = isAnalysis
        ? filterQualityAnalysisRecords(analyses, search, type, result).map(a => ({ id: String(a.id), title: a.productorNombre, subtitle: a.fincaNombre, date: a.fechaMuestreo, type: a.tipo, result: a.resultado || "Pendiente de laboratorio", document: a.documento?.name ?? "Pendiente", analysis: a }))
        : loads.filter(l => !l.id.startsWith("entrega-")).map(l => ({ id: l.id, title: l.codigoCarga, subtitle: `${l.cliente} · ${l.contratoRef}`, date: l.fechaCargaReal, type: l.placa, result: `${formatKg(kilos(l))} kg`, document: l.destino, load: l }));
    const filtered = rows.filter(r => isAnalysis || ((!type || r.type === type) && (!search.trim() || [r.title, r.subtitle, r.type, r.document, r.load?.transportista, r.load?.proveedoresCarga.map(p => `${p.proveedorNombre} ${p.fincaNombre}`).join(" ")].join(" ").toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")))))
        .sort((a, b) => (descending ? -1 : 1) * (a.date.localeCompare(b.date) || a.id.localeCompare(b.id)));
    const options = isAnalysis ? ANALYSIS_TYPE_OPTIONS : [...new Set(rows.map(r => r.type))].map(value => ({ value, label: value }));
    const openRegister = () => {
        if (isAnalysis) {
            setAnalysisModal({ record: null, readOnly: false });
        } else {
            setDeliveryId("");
            setRegisterOpen(true);
        }
    };
    const edit = (row: Row) => {
        if (row.analysis) setAnalysisModal({ record: row.analysis, readOnly: false });
        else if (row.load) setLoadEdit(row.load);
    };
    const actionsFor = (row: Row) => ({ primary: [
        { label: "Ver detalles", icon: <Eye size={18} />, onClick: () => row.analysis ? setAnalysisModal({ record: row.analysis, readOnly: true }) : setDetail(row) },
        { label: "Editar", icon: <Pencil size={18} />, onClick: () => edit(row) },
    ] });
    const headers = isAnalysis ? ["Proveedor / finca", "Muestreo", "Tipo", "Resultado", "Documento"] : ["Carga / cliente", "Fecha de carga", "Transporte", "Kilos cargados", "Destino"];
    return <div className="px-4 py-5 sm:px-8 lg:px-14">
        <QualityCampaignContextBanner campaign={campaign} scope={scope} caption={title} count={rows.length}
            singular={isAnalysis ? "análisis" : "carga"}
            plural={isAnalysis ? "análisis" : "cargas"} />
        <PageHeader icon={<Icon size={24} />} title={title}
            description={`${campaign.nombre} · ${scope === "exportador" ? "Exportador" : "Industria"}. ${isAnalysis ? "Registra muestras, MTD y resultados por proveedor y finca." : "Registra y consulta los kilos y envases de cada entrega coordinada."}`}
            action={<Button size="xl" onClick={openRegister}><Plus size={20} />{register}</Button>} />
        <FilterBar className="mb-8" onClear={clear} canClear={hasFilters}>
            <FilterSearch value={search} onChange={setSearch} placeholder={isAnalysis ? "Buscar proveedor, finca o análisis…" : "Buscar carga, cliente, proveedor o destino…"} />
            <FilterSelectField label={isAnalysis ? "Tipo de análisis" : "Placa"} allLabel="Todos" options={options} value={type} onChange={setType} />
            {isAnalysis && <FilterSelectField label="Resultado" allLabel="Todos" options={[{ value: "pendiente", label: "Pendiente" }, { value: "conforme", label: "Conforme" }, { value: "no_conforme", label: "No conforme" }]} value={result} onChange={setResult} />}
        </FilterBar>
        <TableCard icon={<Icon size={24} />} title={isAnalysis ? "Muestreo y análisis por proveedor y finca" : "Cargas registradas"} description={isAnalysis ? "Consulta cada muestra y completa sus resultados cuando lleguen del laboratorio." : "Consulta los registros y sus datos relacionados."}
            isEmpty={filtered.length === 0} emptyTitle={hasFilters ? "Sin resultados para estos filtros" : `Aún no hay ${isAnalysis ? "análisis" : "cargas"} registrados`}
            emptyDescription={hasFilters ? "Prueba otra búsqueda o limpia los filtros." : isAnalysis ? "Registra una muestra de un proveedor y finca de esta campaña." : "Las cargas registradas por el administrador o el chofer aparecerán aquí."}
            emptyAction={hasFilters ? { label: "Limpiar filtros", onClick: clear, tone: "secondary" } : isAnalysis || pending.length ? { label: register, onClick: openRegister } : undefined} page={1} pageCount={1} onPageChange={() => {}}
            headerRight={<TableToolbar><TableCountPill icon={<Icon size={16} />} count={filtered.length} singular="registro" plural="registros" /><TableExportMenu getData={() => ({ title: `${title} · ${campaign.nombre}`, filename: `calidad-${section}-${campaign.campaniaId}`, header: headers, rows: filtered.map(r => [r.title + " · " + r.subtitle, formatDisplayDate(r.date), r.type, r.result, r.document]) })} /></TableToolbar>}>
            <div className="flex flex-col gap-3 sm:hidden">
                {filtered.map(row => <TableGridCard key={row.id} accentColor="border-l-brand" icon={<Icon size={18} />} title={row.title} subtitle={row.subtitle}
                    actions={<RowActions className="justify-center" {...actionsFor(row)} />}>
                    <TableGridCardFields>
                        <TableGridCardField label={headers[1]} value={formatDisplayDate(row.date)} />
                        <TableGridCardField label={headers[2]} value={row.type} />
                        <TableGridCardField label={headers[3]} value={row.result} />
                        <TableGridCardField label={headers[4]} value={row.document} />
                    </TableGridCardFields>
                </TableGridCard>)}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
                <Table><TableHeader className={TABLE_HEAD_BG}><TableRow className="border-border hover:bg-transparent">{headers.map((h, index) => <TableHead key={h} className={index === 0 ? "h-14 px-6 font-semibold text-ink" : "font-semibold text-ink"}>{index === 1 ? <button className="cursor-pointer font-semibold" onClick={() => setDescending(v => !v)} aria-label="Cambiar orden por fecha">{h} {descending ? "↓" : "↑"}</button> : h}</TableHead>)}<TableHead className="w-36 px-6 text-center font-semibold text-ink">Acciones</TableHead></TableRow></TableHeader>
                    <TableBody>{filtered.map(row => <TableRow key={row.id} className="border-border">
                        <TableCell className="relative h-20 px-6"><TableRowAccent color="bg-brand" /><TableRowLead icon={<Icon size={18} />} title={row.title} subtitle={row.subtitle} /></TableCell>
                        <TableCell className="text-ink-body">{formatDisplayDate(row.date)}</TableCell><TableCell className="text-ink-body">{row.type}</TableCell>
                        <TableCell className="font-semibold text-ink">{row.result}</TableCell><TableCell className="max-w-64 whitespace-normal text-ink-body">{row.document}</TableCell>
                        <TableCell className="px-6"><RowActions className="justify-center" {...actionsFor(row)} /></TableCell>
                    </TableRow>)}</TableBody></Table>
            </div>
        </TableCard>
        {analysisModal && <QualityAnalysisModal open onOpenChange={open => { if (!open) setAnalysisModal(null); }} campaignId={campaign.campaniaId} record={analysisModal.record} readOnly={analysisModal.readOnly} />}
        {registerOpen && <AppModal
            open onOpenChange={setRegisterOpen} icon={<PackageCheck size={22} />} size="md"
            title="Registrar carga" description="Selecciona una entrega coordinada para completar los datos de carga."
            footer={<>
                <Button variant="outline" size="xl" onClick={() => setRegisterOpen(false)}><X size={18} /> Cancelar</Button>
                {pending.length > 0 && <Button size="xl" disabled={!delivery} onClick={() => {
                    if (!delivery) return;
                    setRegisterOpen(false);
                    setLoadEdit(delivery);
                }}>Continuar <ArrowRight size={18} /></Button>}
            </>}>
            {pending.length > 0 ? (
                <FormField label="Entrega coordinada" required id="quality-load-delivery">
                    <Select value={delivery?.id ?? null} onValueChange={value => setDeliveryId(value ?? "")}>
                        <SelectTrigger id="quality-load-delivery" aria-required="true" className="w-full">
                            <SelectValue placeholder="Seleccionar entrega" />
                        </SelectTrigger>
                        <SelectContent>
                            {pending.map(load => <SelectItem key={load.id} value={load.id}>
                                <span className="min-w-0 whitespace-normal break-words">
                                    {formatDisplayDate(load.fechaProgramada)} · {load.cliente} · {load.contratoRef} · {load.placa} · {formatKg(load.kilosProgramados)} kg
                                    {load.cargaIncompleta && " · Completar registro"}
                                </span>
                            </SelectItem>)}
                        </SelectContent>
                    </Select>
                </FormField>
            ) : <p className="text-sm text-ink-muted">No hay entregas coordinadas disponibles para registrar carga en este canal.</p>}
        </AppModal>}
        {loadEdit && <QualityLoadFormModal open onOpenChange={open => { if (!open) setLoadEdit(null); }} load={loadEdit} onSave={saveQualityLoadRealData} />}
        {detail?.load && <QualityLoadDetailModal load={detail.load} onClose={() => setDetail(null)} />}
    </div>;
}
