import { useMemo, useState } from "react";
import {
    ArrowLeft,
    Calendar,
    CheckCircle2,
    ClipboardCheck,
    Clock,
    Compass,
    FileCheck2,
    LogOut,
    MapPin,
    Navigation,
    PackageCheck,
    Sprout,
    Truck,
} from "lucide-react";
import DispatchStepProgress, { type DispatchStage } from "@/shared/components/DispatchStepProgress";
import FileDropzone from "@/shared/components/FileDropzone";
import FormField from "@/shared/components/FormField";
import { InfoField, SummaryBar } from "@/shared/components/InfoField";
import InputField from "@/shared/components/InputField";
import ModalSection from "@/shared/components/ModalSection";
import SegmentedTabs, { type SegmentedTabItem } from "@/shared/components/SegmentedTabs";
import StatusBadge from "@/shared/components/StatusBadge";
import SuccessModal from "@/shared/components/SuccessModal";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import PageHeader from "@/shared/layout/PageHeader";
import { BRAND_ACTIVE_SURFACE } from "@/shared/styles/brandGradients";
import { formatDisplayDate, formatKg } from "@/shared/utils/format";
import { getCampaignFruitIcon } from "@/modules/campaigns/campaignFruit";
import DriverLoadDataModal from "@/modules/driver-portal/components/DriverLoadDataModal";
import DriverRouteMapModal from "@/modules/driver-portal/components/DriverRouteMapModal";
import type { DriverLoad } from "@/modules/driver-portal/driverPortal.models";
import type { FileSource } from '@/shared/utils/fileSource';
import { getSession } from '@/shared/offline/session';
import { createInFlightGuard } from '@/shared/utils/inFlightGuard';
import {
    advanceDriverLoadStage,
    getRegisteredDrivers,
    saveDriverArrivalChecklist,
    saveDriverLoadFieldData,
    saveDriverVehicleExitGuide,
    useDriverPortalState,
} from "@/modules/driver-portal/driverPortal.store";

type DriverView = "campanias" | "cargas" | "despacho";

const TABS: readonly SegmentedTabItem[] = [
    { id: "campanias", label: "Campañas", icon: Sprout, tone: "brand" },
    { id: "cargas", label: "Cargas", icon: Truck, tone: "brand" },
    { id: "despacho", label: "Despacho", icon: Navigation, tone: "brand" },
];

const NEXT_STAGE_LABELS: Partial<Record<DispatchStage, string>> = {
    "En carga": "Confirmar salida de la finca",
    "Salida": "Confirmar que estoy en camino",
    "En camino": "Confirmar llegada al cliente",
    "Llegada": "Cerrar despacho",
};

interface DriverPortalPageProps {
    onLogout?: () => void;
}

export default function DriverPortalPage({ onLogout }: DriverPortalPageProps) {
    const { loads } = useDriverPortalState();
    const drivers = getRegisteredDrivers();
    const identity = getSession()?.user;
    const campaigns = useMemo(() => {
        const byId = new Map<
            number,
            {
                id: number;
                nombre: string;
                fruta: string;
                cargas: DriverLoad[];
            }
        >();
        for (const load of loads) {
            const existing = byId.get(load.campaniaId);
            if (existing) {
                existing.cargas.push(load);
            } else {
                byId.set(load.campaniaId, {
                    id: load.campaniaId,
                    nombre: load.campaniaNombre,
                    fruta: load.fruta,
                    cargas: [load],
                });
            }
        }
        return [...byId.values()];
    }, [loads]);

    const [view, setView] = useState<DriverView>("campanias");
    const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
    const [selectedLoadId, setSelectedLoadId] = useState<string | null>(loads[0]?.id ?? null);

    const [routeModalLoad, setRouteModalLoad] = useState<DriverLoad | null>(null);
    const [loadDataModalLoad, setLoadDataModalLoad] = useState<DriverLoad | null>(null);
    const [stageNote, setStageNote] = useState("");
    const [successInfo, setSuccessInfo] = useState<{ title: string; description: string } | null>(null);
    const [actionError, setActionError] = useState("");
    const [actionGuard] = useState(createInFlightGuard);
    const [actionBusy, setActionBusy] = useState(false);

    const activeLoad = useMemo(
        () => loads.find((l) => l.id === selectedLoadId) ?? loads[0] ?? null,
        [loads, selectedLoadId],
    );

    // Estado editable para Checklist de llegada y Guía de salida de la carga activa
    const [kilosEnPlanta, setKilosEnPlanta] = useState("");
    const [huboDescarte, setHuboDescarte] = useState(false);
    const [kilosDescarte, setKilosDescarte] = useState("");
    const [motivoDescarte, setMotivoDescarte] = useState("");
    const [observacionesEntrega, setObservacionesEntrega] = useState("");
    const [evidenciaDescarte, setEvidenciaDescarte] = useState<FileSource | null>(null);

    const [numeroGuiaSalida, setNumeroGuiaSalida] = useState("");
    const [motivoSalida, setMotivoSalida] = useState("");
    const [bultosVaciosRetorno, setBultosVaciosRetorno] = useState("");
    const [kilosDescarteRetorno, setKilosDescarteRetorno] = useState("");
    const [archivoGuiaSalida, setArchivoGuiaSalida] = useState(activeLoad?.guiaSalida.archivo ?? null);
    const [observacionesGuiaSalida, setObservacionesGuiaSalida] = useState("");

    const syncActiveLoadForms = (target: DriverLoad | null) => {
        if (!target) return;
        setKilosEnPlanta(target.checklistLlegada.kilosEnPlanta);
        setHuboDescarte(target.checklistLlegada.huboDescarte);
        setKilosDescarte(target.checklistLlegada.kilosDescarte);
        setMotivoDescarte(target.checklistLlegada.motivoDescarte);
        setObservacionesEntrega(target.checklistLlegada.observacionesEntrega);
        setEvidenciaDescarte(target.checklistLlegada.evidenciaDescarte ?? null);

        setNumeroGuiaSalida(target.guiaSalida.numeroGuia);
        setMotivoSalida(target.guiaSalida.motivoSalida);
        setBultosVaciosRetorno(target.guiaSalida.bultosVaciosRetorno);
        setKilosDescarteRetorno(target.guiaSalida.kilosDescarteRetorno);
        setArchivoGuiaSalida(target.guiaSalida.archivo);
        setObservacionesGuiaSalida(target.guiaSalida.observaciones);
    };

    const openDispatch = (load: DriverLoad) => {
        setActionError('');
        setStageNote('');
        setSelectedLoadId(load.id);
        syncActiveLoadForms(load);
        setView("despacho");
    };

    const filteredLoads = useMemo(() => {
        if (!selectedCampaignId) return loads;
        return loads.filter((l) => l.campaniaId === selectedCampaignId);
    }, [loads, selectedCampaignId]);


    const handleAdvanceStage = async () => {
        if (!activeLoad || !actionGuard.acquire()) return;
        setActionBusy(true);
        setActionError("");
        try {
            await advanceDriverLoadStage(activeLoad.id, stageNote);
            setStageNote("");
            setSuccessInfo({
                title: "Etapa de despacho actualizada",
                description: `Se registró el avance del despacho ${activeLoad.codigo} en el historial de ruta.`,
            });
        } catch (cause) {
            setActionError(cause instanceof Error ? cause.message : "No se pudo actualizar la etapa del despacho.");
        } finally { actionGuard.release(); setActionBusy(false); }
    };

    const handleSaveChecklist = async () => {
        if (!activeLoad || !actionGuard.acquire()) return;
        setActionBusy(true);
        setActionError("");
        try { await saveDriverArrivalChecklist(activeLoad.id, {
            evidenciaDescarte,
            kilosEnPlanta,
            huboDescarte,
            kilosDescarte: huboDescarte ? kilosDescarte : "0",
            motivoDescarte: huboDescarte ? motivoDescarte : "",
            observacionesEntrega,
            registrado: true,
        });
        setSuccessInfo({
            title: "Checklist de llegada guardado",
            description: "Los kilos en planta y el reporte de descarte quedaron registrados para Logística.",
        });
        } catch (cause) { setActionError(cause instanceof Error ? cause.message : "No se pudo guardar el checklist."); }
        finally { actionGuard.release(); setActionBusy(false); }
    };

    const handleSaveExitGuide = async () => {
        if (!activeLoad || !actionGuard.acquire()) return;
        setActionBusy(true);
        setActionError("");
        try { await saveDriverVehicleExitGuide(activeLoad.id, {
            requiereGuia: true,
            numeroGuia: numeroGuiaSalida,
            motivoSalida,
            bultosVaciosRetorno,
            kilosDescarteRetorno,
            archivo: archivoGuiaSalida,
            observaciones: observacionesGuiaSalida,
        });
        setSuccessInfo({
            title: "Guía de salida registrada",
            description: "El documento de salida del vehículo fue actualizado correctamente.",
        });
        } catch (cause) { setActionError(cause instanceof Error ? cause.message : "No se pudo guardar la guía de salida."); }
        finally { actionGuard.release(); setActionBusy(false); }
    };

    return (
        <div className="mx-auto w-full max-w-xl px-4 py-5 pb-24 sm:px-6">
            {/* Cabecera del Portal Móvil del Chofer */}
            <PageHeader
                icon={<Truck size={24} strokeWidth={2.5} />}
                title="Portal Móvil del Chofer"
                description="Consulta y gestiona las entregas coordinadas de todos los choferes."
                action={
                    <div className="flex flex-wrap items-center gap-2.5">
                        {onLogout && (
                            <Button variant="outline" size="lg" onClick={onLogout}>
                                <LogOut size={17} strokeWidth={2.3} /> Salir
                            </Button>
                        )}
                    </div>
                }
            />

            {/* Resumen del portal */}
            <Card className="mb-6 rounded-2xl border-brand-border bg-linear-to-r from-brand-surface/70 via-card to-card shadow-xs">
                <CardContent className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:px-6">
                    <div className="flex items-center gap-3.5">
                        <span
                            className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-white"
                            style={BRAND_ACTIVE_SURFACE}
                        >
                            <Truck size={22} strokeWidth={2.4} />
                        </span>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-[16px] font-bold text-ink">{identity?.usuario ?? "Cuenta de chofer"}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="rounded-xl border border-brand-border/70 bg-card px-3.5 py-1.5 text-[12px] font-bold text-ink">
                            {campaigns.length} campaña(s)
                        </span>
                        <span className="rounded-xl border border-brand-border/70 bg-card px-3.5 py-1.5 text-[12px] font-bold text-brand">
                            {loads.length} entrega(s)
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Navegación por pestañas del chofer */}
            <SegmentedTabs
                tabs={TABS.map((t) => ({
                    ...t,
                    count:
                        t.id === "campanias"
                            ? campaigns.length
                            : t.id === "cargas"
                                ? filteredLoads.length
                                : undefined,
                }))}
                value={view}
                onChange={(next) => {
                    if (next === "despacho") {
                        const target = activeLoad && !activeLoad.pendienteRegistro ? activeLoad : loads.find(load => !load.pendienteRegistro);
                        if (!target) return;
                        setSelectedLoadId(target.id);
                        syncActiveLoadForms(target);
                    }
                    setView(next as DriverView);
                }}
                showLabelsOnMobile
                className="mb-6 hidden sm:flex"
            />

            {/* VISTA 1: MIS CAMPAÑAS (CHOFER) */}
            {view === "campanias" && (
                <div className="grid grid-cols-1 gap-4 ">
                    {campaigns.length === 0 && <p role="status" className="rounded-2xl border border-dashed border-border p-6 text-sm text-ink-muted">Aún no hay entregas coordinadas.</p>}
                    {campaigns.map((camp) => {
                        const FruitIcon = getCampaignFruitIcon(camp.nombre, camp.fruta) || Sprout;
                        const totalKg = camp.cargas.reduce(
                            (sum, l) => sum + l.proveedores.reduce((acc, p) => acc + p.kilosCargados, 0),
                            0,
                        );
                        return (
                            <Card key={camp.id} className="rounded-2xl border-border shadow-card">
                                <CardContent className="flex flex-col gap-4 p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3.5">
                                            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-surface text-brand">
                                                <FruitIcon size={24} strokeWidth={2.2} />
                                            </span>
                                            <div>
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                                                    Campaña
                                                </span>
                                                <h3 className="text-[17px] font-bold text-ink">{camp.nombre}</h3>
                                                <p className="text-[12.5px] font-medium text-ink-muted">
                                                    Fruta: {camp.fruta}
                                                </p>
                                            </div>
                                        </div>
                                        <StatusBadge status={camp.cargas[0]?.estadoCampania ?? "Pendiente"} />
                                    </div>

                                    <SummaryBar
                                        items={[
                                            { label: "Cargas", value: `${camp.cargas.length} viaje(s)`, tone: "brand" },
                                            { label: "Kilos cargados", value: `${formatKg(totalKg)} kg` },
                                        ]}
                                    />

                                    <div className="flex flex-col gap-2">
                                        {camp.cargas.map((load) => (
                                            <div
                                                key={load.id}
                                                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-page/50 px-3.5 py-2.5 text-[12.5px]"
                                            >
                                                <div className="min-w-0">
                                                    <span className="font-bold text-ink">{load.codigo}</span>{" "}
                                                    <span className="text-ink-muted">· {load.cliente}</span>
                                                </div>
                                                <StatusBadge status={load.rechazada ? "Rechazada" : load.pendienteRegistro ? "Por completar" : load.etapa} />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-end pt-1">
                                        <Button
                                            size="lg"
                                            className="w-full sm:w-auto"
                                            onClick={() => {
                                                setSelectedCampaignId(camp.id);
                                                setView("cargas");
                                            }}
                                        >
                                            <Truck size={18} strokeWidth={2.4} /> Ver cargas ({camp.cargas.length})
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* VISTA 2: MIS CARGAS (POR CAMPAÑA) */}
            {view === "cargas" && (
                <div className="flex flex-col gap-4">
                    {selectedCampaignId !== null && (
                        <div className="flex items-center justify-between rounded-xl border border-brand-border bg-brand-surface/40 px-4 py-2.5">
                            <span className="text-[13px] font-semibold text-ink">
                                Filtrando por campaña seleccionada ({filteredLoads.length} cargas)
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedCampaignId(null)}>
                                Ver todas las campañas
                            </Button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 ">
                        {filteredLoads.map((load) => {
                            const totalLoadedKg = load.proveedores.reduce((sum, p) => sum + p.kilosCargados, 0);
                            const totalJabas = load.proveedores.reduce(
                                (sum, p) => sum + p.jabasCargadas + p.binesCargados + p.mallasCargadas,
                                0,
                            );

                            return (
                                <Card key={load.id} className="rounded-2xl border-border shadow-card">
                                    <CardContent className="flex flex-col gap-4 p-5">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[16px] font-extrabold text-ink">{load.codigo}</span>
                                                    <span className="rounded-full bg-brand-surface px-2.5 py-0.5 text-[11px] font-bold text-brand">
                                                        {load.canal}
                                                    </span>
                                                </div>
                                                <p className="text-[13px] font-semibold text-ink-body mt-0.5">
                                                    {load.cliente} · <span className="text-ink-muted">{load.campaniaNombre}</span>
                                                </p>
                                                <p className="text-[12.5px] text-ink-muted">
                                                    {drivers.find(driver => driver.id === load.driverId)?.nombre ?? "Chofer"} · {load.placa}
                                                </p>
                                            </div>
                                            <StatusBadge status={load.rechazada ? "Rechazada" : load.pendienteRegistro ? "Por completar" : load.etapa} />
                                        </div>

                                        {!load.pendienteRegistro && <DispatchStepProgress stage={load.etapa} variant="compact" />}

                                        <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface-page p-3.5 sm:grid-cols-2">
                                            <div className="flex items-start gap-2.5">
                                                <MapPin size={16} className="mt-0.5 shrink-0 text-brand" />
                                                <div className="min-w-0">
                                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                                                        Origen ({load.fincas.length} finca{load.fincas.length === 1 ? "" : "s"})
                                                    </span>
                                                    <span className="text-[12.5px] font-semibold text-ink">{load.origen}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2.5">
                                                <Navigation size={16} className="mt-0.5 shrink-0 text-status-highlight" />
                                                <div className="min-w-0">
                                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                                                        Destino de entrega
                                                    </span>
                                                    <span className="text-[12.5px] font-semibold text-ink">{load.destino}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <Calendar size={16} className="shrink-0 text-ink-muted" />
                                                <div>
                                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                                                        Fecha de carga
                                                    </span>
                                                    <span className="text-[12.5px] font-semibold text-ink">
                                                        {formatDisplayDate(load.fechaCarga)} · Placa {load.placa}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <PackageCheck size={16} className="shrink-0 text-brand" />
                                                <div>
                                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                                                        Carga registrada
                                                    </span>
                                                    <span className="text-[12.5px] font-bold text-ink">
                                                        {formatKg(totalLoadedKg)} kg · {totalJabas} bultos
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                                            <Button
                                                variant="outline"
                                                size="default"
                                                onClick={() => setRouteModalLoad(load)}
                                            >
                                                <Compass size={16} strokeWidth={2.3} /> Ubicación y ruta
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="default"
                                                disabled={!load.permiteEditarCarga} onClick={() => setLoadDataModalLoad(load)}
                                            >
                                                <PackageCheck size={16} strokeWidth={2.3} /> {load.cargaIncompleta ? 'Pendiente en Calidad' : load.pendienteRegistro ? 'Registrar carga' : 'Datos de carga'}
                                            </Button>
                                            <Button
                                                size="default"
                                                disabled={load.pendienteRegistro || load.rechazada}
                                                onClick={() => openDispatch(load)}
                                            >
                                                <Navigation size={16} strokeWidth={2.3} /> Ver mi despacho
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* VISTA 4, 5 Y 6: MI DESPACHO + CHECKLIST DE LLEGADA + GUÍA DE SALIDA */}
            {view === "despacho" && activeLoad && !activeLoad.pendienteRegistro && (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Button variant="outline" onClick={() => setView("cargas")}>
                            <ArrowLeft size={17} strokeWidth={2.4} /> Volver a cargas
                        </Button>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" onClick={() => setRouteModalLoad(activeLoad)}>
                                <Compass size={17} strokeWidth={2.3} /> Ver mapa de fincas y ruta
                            </Button>
                            <Button variant="outline" disabled={!activeLoad.permiteEditarCarga} onClick={() => setLoadDataModalLoad(activeLoad)}>
                                <PackageCheck size={17} strokeWidth={2.3} /> Editar datos de carga
                            </Button>
                        </div>
                    </div>

                    {/* Stepper de 5 etapas */}
                    <Card className="rounded-2xl border-border shadow-card">
                        <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                                        Seguimiento en tiempo real · {activeLoad.canal}
                                    </span>
                                    <h3 className="text-xl font-extrabold text-ink">
                                        {activeLoad.codigo} · {activeLoad.cliente}
                                    </h3>
                                    <p className="text-[13px] font-medium text-ink-muted">
                                        {activeLoad.origen} → {activeLoad.destino}
                                    </p>
                                </div>
                                <StatusBadge status={activeLoad.etapa} />
                            </div>

                            <DispatchStepProgress stage={activeLoad.etapa} variant="full" />
                            {actionError && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{actionError}</p>}

                            {/* Botón de avance de etapa */}
                            {NEXT_STAGE_LABELS[activeLoad.etapa] ? (
                                <div className="flex flex-col gap-3 rounded-2xl border border-brand-border bg-brand-surface/35 p-4 sm:flex-row sm:items-end">
                                    <div className="flex-1">
                                        <InputField
                                            id="dispatch-stage-note"
                                            label="Nota u observación de reporte en ruta"
                                            optional
                                            placeholder="Ej. Control SENASA superado, ingreso a rampa de descarga..."
                                            value={stageNote}
                                            onChange={setStageNote}
                                        />
                                    </div>
                                    <Button size="xl" onClick={handleAdvanceStage}
                                        disabled={actionBusy || activeLoad.etapa === "Llegada"
                                            && (!activeLoad.cierreFisicoConfirmado || !activeLoad.checklistLlegada.registrado)}
                                        className="shrink-0">
                                        <CheckCircle2 size={19} strokeWidth={2.5} /> {NEXT_STAGE_LABELS[activeLoad.etapa]}
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-surface/50 px-4 py-3 text-[13.5px] font-bold text-brand">
                                    <CheckCircle2 size={19} strokeWidth={2.5} /> Despacho cerrado y completado por el conductor.
                                </div>
                            )}
                            {activeLoad.etapa === "Llegada" && !activeLoad.cierreFisicoConfirmado &&
                                <p className="text-sm text-ink-muted">Logística debe registrar el cierre físico antes de que puedas cerrar tu despacho.</p>}
                            {activeLoad.etapa === "Llegada" && activeLoad.cierreFisicoConfirmado && !activeLoad.checklistLlegada.registrado &&
                                <p className="text-sm text-ink-muted">Guarda el checklist de llegada antes de cerrar tu despacho.</p>}

                            {/* Resumen de carga y desglose por proveedor */}
                            <SummaryBar
                                items={[
                                    {
                                        label: "Kilos cargados",
                                        value: `${formatKg(
                                            activeLoad.proveedores.reduce((s, p) => s + p.kilosCargados, 0),
                                        )} kg`,
                                        tone: "brand",
                                    },
                                    {
                                        label: "Bultos cargados",
                                        value: `${activeLoad.proveedores.reduce(
                                            (s, p) => s + p.jabasCargadas + p.binesCargados + p.mallasCargadas,
                                            0,
                                        )} und.`,
                                    },
                                    {
                                        label: "Viáticos asignados",
                                        value: `S/ ${(activeLoad.viaticosMovilidad + activeLoad.viaticosInsumos).toFixed(2)}`,
                                    },
                                ]}
                            />

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <InfoField label="Camión / Placa" value={`${activeLoad.placa} · ${activeLoad.transportista}`} />
                                <InfoField label="Anotador / Jefe de cuadrilla" value={activeLoad.anotador} />
                                <InfoField label="Fecha de carga" value={formatDisplayDate(activeLoad.fechaCarga)} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Grid de 2 columnas: Checklist de Llegada + Guía de Salida */}
                    <div className="grid grid-cols-1 gap-6 ">
                        {/* VISTA 5: CHECKLIST DE ENTREGA EN LLEGADA */}
                        <Card className="rounded-2xl border-border shadow-card">
                            <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
                                <ModalSection
                                    title="Checklist de llegada a planta"
                                    aside={
                                        activeLoad.checklistLlegada.registrado ? (
                                            <StatusBadge status="Registrado" />
                                        ) : (
                                            <StatusBadge status="Pendiente" />
                                        )
                                    }
                                >
                                    <fieldset disabled={actionBusy || activeLoad.etapa !== "Llegada" || activeLoad.estadoCampania !== "en proceso"} className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                                        <InputField
                                            id="chk-kilos-planta"
                                            label="Kilos recibidos en planta"
                                            required
                                            step="1"
                                            min={0}
                                            unit="kg"
                                            placeholder="Ej. 19520"
                                            value={kilosEnPlanta}
                                            onChange={setKilosEnPlanta}
                                        />
                                        <div className="flex flex-col justify-end">
                                            <div className="flex h-11 items-center justify-between rounded-xl border border-border bg-surface-page/50 px-3.5">
                                                <span className="text-[13px] font-bold text-ink">¿Hubo fruta de descarte?</span>
                                                <Switch checked={huboDescarte} onCheckedChange={setHuboDescarte} />
                                            </div>
                                        </div>

                                        {huboDescarte && (
                                            <>
                                                <InputField
                                                    id="chk-kilos-descarte"
                                                    label="Kilos de descarte"
                                                    required
                                                    step="1"
                                                    min={0}
                                                    unit="kg"
                                                    placeholder="Ej. 280"
                                                    value={kilosDescarte}
                                                    onChange={setKilosDescarte}
                                                />
                                                <InputField
                                                    id="chk-motivo-descarte"
                                                    label="Motivo del descarte"
                                                    required
                                                    placeholder="Ej. Daño mecánico, calibre..."
                                                    value={motivoDescarte}
                                                    onChange={setMotivoDescarte}
                                                />
                                                <div className="sm:col-span-2"><FileDropzone label="Evidencia del descarte" file={evidenciaDescarte} onChange={setEvidenciaDescarte} variant="horizontal" readOnly={activeLoad.etapa !== 'Llegada'} replaceable /></div>
                                            </>
                                        )}

                                        <FormField
                                            id="chk-obs-entrega"
                                            label="Observaciones de la entrega en planta"
                                            optional
                                            className="sm:col-span-2"
                                        >
                                            <Textarea
                                                id="chk-obs-entrega"
                                                rows={2}
                                                placeholder="Rampa de descarga, número de ticket de balanza, conformidad..."
                                                value={observacionesEntrega}
                                                onChange={(e) => setObservacionesEntrega(e.target.value)}
                                            />
                                        </FormField>
                                    </fieldset>
                                    <div className="flex justify-end">
                                        <Button size="lg" disabled={actionBusy || activeLoad.etapa !== 'Llegada' || activeLoad.estadoCampania !== 'en proceso'} onClick={handleSaveChecklist}>
                                            <ClipboardCheck size={18} strokeWidth={2.4} /> Guardar checklist de llegada
                                        </Button>
                                    </div>
                                </ModalSection>
                            </CardContent>
                        </Card>

                        {/* VISTA 6: GUÍA DE SALIDA DEL VEHÍCULO */}
                        <Card className="rounded-2xl border-border shadow-card">
                            <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
                                <ModalSection
                                    title="Guía de salida del vehículo"
                                    aside="Retorno de jabas vacías o descarte"
                                >
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="sm:col-span-2">
                                            <FileDropzone
                                                label="Documento de guía de salida firmada"
                                                file={archivoGuiaSalida}
                                                onChange={(f) => setArchivoGuiaSalida(f)}
                                                variant="horizontal"
                                                readOnly={actionBusy || !["Llegada", "Cierre"].includes(activeLoad.etapa) || activeLoad.estadoCampania !== 'en proceso'}
                                                replaceable
                                            />
                                        </div>
                                        <FormField
                                            id="exit-obs"
                                            label="Observaciones de salida en garita"
                                            optional
                                            className="sm:col-span-2"
                                        >
                                            <Textarea
                                                id="exit-obs"
                                                rows={2}
                                                disabled={actionBusy || !['Llegada', 'Cierre'].includes(activeLoad.etapa) || activeLoad.estadoCampania !== 'en proceso'}
                                                placeholder="Control patrimonial en garita, firma de almacén de envases..."
                                                value={observacionesGuiaSalida}
                                                onChange={(e) => setObservacionesGuiaSalida(e.target.value)}
                                            />
                                        </FormField>
                                    </div>
                                    <div className="flex justify-end">
                                        <Button size="lg" disabled={actionBusy || !['Llegada', 'Cierre'].includes(activeLoad.etapa) || activeLoad.estadoCampania !== 'en proceso'} onClick={handleSaveExitGuide}>
                                            <FileCheck2 size={18} strokeWidth={2.4} /> Guardar guía de salida
                                        </Button>
                                    </div>
                                </ModalSection>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Línea de tiempo / Historial del despacho */}
                    <Card className="rounded-2xl border-border shadow-card">
                        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
                            <ModalSection
                                title="Historial de etapas del despacho"
                                aside={`${activeLoad.historial.length} evento(s) registrado(s)`}
                            >
                                <div className="flex flex-col gap-3">
                                    {activeLoad.historial.map((item, idx) => (
                                        <div
                                            key={`${item.etapa}-${idx}`}
                                            className="flex items-start gap-3.5 rounded-xl border border-border bg-surface-page/50 p-3.5"
                                        >
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-surface text-brand">
                                                <Clock size={17} strokeWidth={2.4} />
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <span className="text-[13.5px] font-bold text-ink">
                                                        Etapa: {item.etapa}
                                                    </span>
                                                    <span className="text-[12px] font-semibold tabular-nums text-ink-muted">
                                                        {item.fechaHora}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-[13px] font-medium text-ink-body">{item.nota}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ModalSection>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Barra de navegación inferior móvil dedicada para el chofer */}
            <nav
                aria-label="Navegación móvil del chofer"
                className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-card/95 px-2 py-2 shadow-lg backdrop-blur-md sm:hidden"
            >
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = view === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            disabled={tab.id === 'despacho' && !loads.some(load => !load.pendienteRegistro)}
                            onClick={() => {
                                if (tab.id === "despacho") {
                                    const target = activeLoad && !activeLoad.pendienteRegistro ? activeLoad : loads.find(load => !load.pendienteRegistro);
                                    if (!target) return;
                                    setSelectedLoadId(target.id);
                                    syncActiveLoadForms(target);
                                }
                                setView(tab.id as DriverView);
                            }}
                            className={`flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-[11px] font-bold transition-colors ${
                                active ? "bg-brand-surface text-brand" : "text-ink-muted"
                            }`}
                        >
                            <Icon size={19} strokeWidth={2.4} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Modales del Chofer */}
            <DriverRouteMapModal
                open={routeModalLoad !== null}
                onOpenChange={(open) => !open && setRouteModalLoad(null)}
                load={routeModalLoad}
            />

            <DriverLoadDataModal
                open={loadDataModalLoad !== null}
                onOpenChange={(open) => !open && setLoadDataModalLoad(null)}
                load={loadDataModalLoad}
                onSave={async (loadId, payload) => {
                    await saveDriverLoadFieldData(loadId, payload);
                    setSuccessInfo({
                        title: payload.cumpleRequisitosIndustria === false ? 'Rechazo registrado' : 'Datos de carga actualizados',
                        description: payload.cumpleRequisitosIndustria === false ? 'La entrega quedó rechazada y no habilita un despacho.' : 'El desglose de kilos, bultos y viáticos del camión se guardó correctamente.',
                    });
                }}
            />

            <SuccessModal
                open={successInfo !== null}
                onOpenChange={(open) => !open && setSuccessInfo(null)}
                title={successInfo?.title ?? ""}
                description={successInfo?.description ?? ""}
                badgeLabel="Portal del Chofer"
            />
        </div>
    );
}
