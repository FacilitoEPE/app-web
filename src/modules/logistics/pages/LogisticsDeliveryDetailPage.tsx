import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, CalendarDays, Check, ClipboardCheck, FileCheck2, Layers, Package, PackageCheck, Scale, Truck, Users } from "lucide-react";
import { useLogisticsLoads } from "@/modules/logistics/logistics.store";
import { formatLogisticsDateTime, logisticsLoadKg, logisticsStageLabel } from "@/modules/logistics/logistics.utils";
import EntityOverviewCard from "@/shared/components/EntityOverviewCard";
import FileDropzone from "@/shared/components/FileDropzone";
import { InfoField } from "@/shared/components/InfoField";
import MetricCards from "@/shared/components/MetricCards";
import { PageError } from "@/shared/components/PageState";
import { Card } from "@/shared/components/ui/card";
import PageHeader from "@/shared/layout/PageHeader";
import { formatDecimal, formatDisplayDate, formatKg, formatMoney } from "@/shared/utils/format";

const stageOrder = ["En carga", "Salida", "En camino", "Llegada", "Cierre"] as const;
const fallback = (value: string) => value || "—";

export default function LogisticsDeliveryDetailPage() {
    const { campaignId, loadId } = useParams<{ campaignId: string; loadId: string }>();
    const navigate = useNavigate();
    const backHref = `/logistica-despacho/${campaignId}`;
    const load = useLogisticsLoads().find(item => item.id === loadId && item.campaniaId === Number(campaignId));
    if (!load) return <PageError title="Entrega no encontrada" message="No se encontró esta carga en la campaña." back={{ to: backHref, label: "Volver a cargas" }} />;
    const kg = logisticsLoadKg(load);
    const reception = load.recepcion;
    const arrival = load.llegada;
    const crates = load.devolucionJabas;
    const docs = load.documentosCierre;
    const docName = (file: { name: string } | null | undefined) => file?.name ?? "Sin documento";
    const stageIndex = stageOrder.indexOf(load.etapaDespacho);
    const varieties = [...new Set(load.proveedores.flatMap(provider => provider.variedad.split(", ").filter(Boolean)))];
    const bultos = load.proveedores.reduce((sum, provider) => ({
        jabas: sum.jabas + provider.jabasCargadas, jabasVacias: sum.jabasVacias + provider.jabasVacias,
        bines: sum.bines + provider.binesCargados, binesVacios: sum.binesVacios + provider.binesVacios,
        mallas: sum.mallas + provider.mallasCargadas, mallasVacias: sum.mallasVacias + provider.mallasVacias,
    }), { jabas: 0, jabasVacias: 0, bines: 0, binesVacios: 0, mallas: 0, mallasVacias: 0 });
    const management = [
        { label: "Compras de la carga", detail: `${load.compras?.length ?? 0} compras`, icon: PackageCheck, route: "compras" },
        { label: "Recepción y calidad", detail: reception.pesoRecibidoPlanta ? `${formatKg(reception.pesoRecibidoPlanta)} kg en planta` : "Recepción pendiente", icon: ClipboardCheck, route: "recepcion" },
        { label: "Jabas y salida", detail: crates?.jabasIniciales == null ? "Sin conciliación" : `${crates.jabasDevueltas ?? 0} de ${crates.jabasIniciales} devueltas`, icon: Layers, route: "jabas" },
        { label: "Documentos y cierre", detail: docs.cierreAdministrativoConfirmado ? "Cierre completado" : "Expediente en curso", icon: FileCheck2, route: "documentos" },
    ];

    return <div className="px-4 py-5 sm:px-8 lg:px-14">
        <PageHeader icon={<Truck size={24} />} title="Detalle de la entrega"
            description={`${load.campaniaNombre} · ${load.cliente} · ${load.codigo}`} />
        <div className="mb-6 grid gap-4 lg:grid-cols-[1.95fr_1fr]">
            <EntityOverviewCard avatar={<Truck />} eyebrow="Carga y despacho" title={load.codigo} watermark={Truck}
                chips={[{ icon: <Package />, label: load.canal }, { icon: <Truck />, label: logisticsStageLabel(load.etapaDespacho) }]}
                details={[
                    { icon: <Users />, label: "Cliente", value: fallback(load.cliente) },
                    { icon: <CalendarDays />, label: "Fecha de carga", value: formatDisplayDate(load.fechaCarga) },
                    { icon: <Truck />, label: "Transportista", value: fallback(load.transportista) },
                    { icon: <Package />, label: "Destino", value: fallback(load.destino) },
                ]} />
            <MetricCards label="Resumen de la entrega" metrics={[
                { title: "Kilos cargados", value: formatKg(kg), unit: "kg", description: "Peso en origen", icon: Scale },
                { title: "Peso en planta", value: reception.pesoRecibidoPlanta ? formatKg(reception.pesoRecibidoPlanta) : "—", unit: reception.pesoRecibidoPlanta ? "kg" : "", description: "Recepción registrada", icon: Package },
                { title: "Proveedores", value: String(load.proveedores.length), unit: "", description: "En esta carga", icon: Users },
                { title: "Estado", value: logisticsStageLabel(load.etapaDespacho), unit: "", description: "Estado logístico", icon: ClipboardCheck },
            ]} />
        </div>
        <section className="mb-6" aria-label="Gestiones de la carga">
            <div className="mb-3"><h2 className="text-lg font-bold text-ink">Gestionar esta carga</h2><p className="text-sm text-ink-muted">Abre la etapa que necesitas consultar o actualizar.</p></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{management.map(item => <button key={item.route} type="button"
                onClick={() => navigate(`${backHref}/cargas/${load.id}/${item.route}`)}
                className="group flex min-h-24 items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-card transition-colors hover:border-brand-border hover:bg-brand-surface focus-visible:outline-2 focus-visible:outline-brand">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-surface text-brand"><item.icon size={21} /></span>
                <span className="min-w-0 flex-1"><strong className="block text-sm text-ink">{item.label}</strong><span className="mt-1 block text-xs text-ink-muted">{item.detail}</span></span>
                <ArrowRight size={17} className="shrink-0 text-brand transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </button>)}</div>
        </section>
        <div className="grid gap-4">
            <Card className="gap-4 p-5 sm:p-6"><h2 className="text-lg font-bold text-ink">Historial del chofer</h2>
                <p className="text-sm text-ink-muted">Estados del despacho y hora de cada reporte.</p>
                <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    {stageOrder.map((stage, index) => {
                        const event = load.historialChofer?.find(item => item.etapa === stage);
                        return <li key={stage} className={`rounded-xl border p-4 ${index === stageIndex ? "border-brand-border bg-brand-surface" : "border-border"}`}>
                            <div className="mb-3 flex items-center justify-between"><span className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${event ? "bg-brand text-white" : "bg-muted text-ink-muted"}`}>{event ? <Check size={17} /> : index + 1}</span>{index === stageIndex && <span className="text-xs font-semibold text-brand">Actual</span>}</div>
                            <p className="font-semibold text-ink">{logisticsStageLabel(stage)}</p>
                            <p className="mt-2 text-xs text-ink-muted">{event ? formatLogisticsDateTime(event.fechaHora) : "Pendiente"}</p>
                            {event?.observacion && <p className="mt-1 text-xs text-ink-body">{event.observacion}</p>}
                        </li>;
                    })}
                </ol>
            </Card>
            <Card className="gap-4 p-5 sm:p-6"><h2 className="text-lg font-bold text-ink">Viaje y llegada</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    <InfoField label="Transportista" value={fallback(load.transportista)} />
                    <InfoField label="Camión" value={fallback(load.placa)} />
                    <InfoField label="Chofer" value={fallback(load.chofer)} />
                    <InfoField label="Licencia" value={fallback(load.licencia)} />
                    <InfoField label="Origen" value={fallback(load.origen)} multiline />
                    <InfoField label="Destino" value={fallback(load.destino)} multiline />
                    <InfoField label="Kilos de carga" value={`${formatKg(kg)} kg`} />
                    <InfoField label="Llegada estimada" value={formatLogisticsDateTime(arrival?.llegadaEstimada)} />
                    <InfoField label="Llegada real" value={formatLogisticsDateTime(arrival?.llegadaReal)} />
                    <InfoField label="Ventana de atención" value={`${formatLogisticsDateTime(arrival?.ventanaInicio)} → ${formatLogisticsDateTime(arrival?.ventanaFin)}`} multiline className="sm:col-span-2" />
                </div>
            </Card>
            <Card className="gap-4 p-5 sm:p-6"><h2 className="text-lg font-bold text-ink">Datos de carga</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    <InfoField label="Fecha de carga" value={formatDisplayDate(load.fechaCarga)} />
                    <InfoField label="Responsable" value={fallback(load.anotador)} />
                    <InfoField label="Variedad" value={varieties.join(", ") || "Sin registro"} />
                    <InfoField label="Bultos" value={`Jabas: ${bultos.jabas} cargadas / ${bultos.jabasVacias} vacías · Bines: ${bultos.bines} / ${bultos.binesVacios} · Mallas: ${bultos.mallas} / ${bultos.mallasVacias}`} multiline />
                    <InfoField label="Movilidad" value={`S/ ${formatMoney(load.viaticosMovilidad)}`} />
                    <InfoField label="Insumos del personal" value={`S/ ${formatMoney(load.viaticosInsumos)}`} />
                    <InfoField label="Cuadrilla" value={`S/ ${formatMoney(load.gastoCuadrilla)}`} />
                    <InfoField label="Anotadores" value={`S/ ${formatMoney(load.gastoAnotadores)}`} />
                    <InfoField label="Observaciones" value={fallback(load.observacionesCarga)} multiline className="sm:col-span-2" />
                </div>
            </Card>
            <Card className="gap-4 p-5 sm:p-6"><h2 className="text-lg font-bold text-ink">Proveedores de la carga</h2>
                {load.proveedores.length ? load.proveedores.map(provider => <div key={provider.proveedorId} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold text-ink">{provider.proveedorNombre}</p><p className="text-xs text-ink-muted">{provider.fincaNombre} · {provider.variedad} · {provider.tipo}</p></div><strong className="text-brand">{formatKg(provider.kilosCargados)} kg</strong></div>
                    <p className="mt-2 text-xs text-ink-body">Jabas: {provider.jabasCargadas} cargadas / {provider.jabasVacias} vacías · Bines: {provider.binesCargados} / {provider.binesVacios} · Mallas: {provider.mallasCargadas} / {provider.mallasVacias}</p>
                </div>) : <p className="text-sm text-ink-muted">Sin proveedores registrados.</p>}
            </Card>
            <Card className="gap-4 p-5 sm:p-6"><h2 className="text-lg font-bold text-ink">Descarga, recepción y calidad</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    <InfoField label="Inicio de descarga" value={formatLogisticsDateTime(reception.inicioDescarga)} />
                    <InfoField label="Término de descarga" value={formatLogisticsDateTime(reception.terminoDescarga)} />
                    <InfoField label="Responsable de recepción" value={fallback(reception.responsableRecepcion)} multiline />
                    <FileDropzone label="Evidencia de descarga" file={reception.evidenciaDescarga ?? null} readOnly variant="horizontal" onChange={() => {}} />
                    <InfoField label="Observaciones de descarga" value={fallback(reception.observacionesDescarga)} multiline className="sm:col-span-2" />
                    <InfoField label="Peso en origen" value={`${formatKg(kg)} kg`} />
                    <InfoField label="Peso en planta" value={reception.pesoRecibidoPlanta ? `${formatKg(reception.pesoRecibidoPlanta)} kg` : "—"} />
                    <InfoField label="Resultado" value={reception.pesoRecibidoPlanta ? reception.resultadoRecepcion : "—"} />
                    <InfoField label="Descarte" value={reception.huboDescarte ? `${formatKg(reception.kilosDescarte)} kg` : "Sin descarte registrado"} />
                    <InfoField label="Porcentaje de descarte" value={reception.huboDescarte && kg ? `${formatDecimal((reception.kilosDescarte / kg) * 100)} %` : "Sin registro"} />
                    <InfoField label="Motivo del descarte en recepción" value={fallback(reception.motivoDescarte)} multiline />
                    <InfoField label="Informe de recepción" value={docName(reception.reporteRecepcionArchivo)} />
                    <InfoField label="Evidencia de descarte" value={docName(reception.actaDescarteArchivo)} />
                </div>
            </Card>
            <Card className="gap-4 p-5 sm:p-6"><h2 className="text-lg font-bold text-ink">Jabas y documentos</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    <InfoField label="Jabas que llegaron" value={crates?.jabasIniciales ?? "—"} />
                    <InfoField label="Jabas devueltas" value={crates?.jabasDevueltas ?? "—"} />
                    <InfoField label="Salida del vehículo" value={formatLogisticsDateTime(crates?.salidaVehiculo)} />
                    <InfoField label="Copia al transportista" value={crates?.copiaTransportista ? "Entregada" : "Pendiente"} />
                    <InfoField label="Guía de remisión de fruta" value={docName(docs.guiaRemisionFruta)} />
                    <InfoField label="Detalle de compras" value={docName(docs.detalleCompras)} />
                    <InfoField label="Informe de recepción" value={docName(docs.reporteRecepcionPlanta)} />
                    <InfoField label="Evidencia de descarte" value={docName(docs.actaDescarte)} />
                    <InfoField label="Constancia de devolución de jabas" value={docName(docs.constanciaDevolucionJabas)} />
                    <InfoField label="Guía de salida firmada" value={docName(docs.guiaSalidaFirmada)} />
                    <InfoField label="Cierre físico" value={docs.cierreFisicoConfirmado ? formatLogisticsDateTime(docs.fechaCierreFisico) : "Pendiente"} />
                    <InfoField label="Cierre administrativo" value={docs.cierreAdministrativoConfirmado ? formatLogisticsDateTime(docs.fechaCierreAdministrativo) : "Pendiente"} />
                </div>
            </Card>
            <Card className="gap-4 p-5 sm:p-6"><h2 className="text-lg font-bold text-ink">Checklist reportado por el chofer</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <InfoField label="Formulario de llegada" value={load.checklistChofer?.llegadaRegistrada ? "Reportado" : "Pendiente"} />
                    <InfoField label="Kilos informados en planta" value={load.checklistChofer?.kilosEnPlanta ? `${load.checklistChofer.kilosEnPlanta} kg` : "—"} />
                    <InfoField label="Descarte informado" value={load.checklistChofer?.llegadaRegistrada ? (load.checklistChofer.huboDescarte ? `${load.checklistChofer.kilosDescarte} kg` : "Sin descarte") : "Pendiente"} />
                    <InfoField label="Guía de salida" value={load.checklistChofer?.guiaSalidaNumero || "Pendiente"} />
                    <InfoField label="Motivo del descarte informado por el chofer" value={load.checklistChofer?.motivoDescarte || "—"} multiline />
                    <InfoField label="Observaciones de entrega" value={load.checklistChofer?.observacionesEntrega || "—"} multiline />
                    <InfoField label="Documento de salida" value={docName(load.checklistChofer?.guiaSalidaArchivo ?? null)} />
                </div>
            </Card>
        </div>
    </div>;
}
