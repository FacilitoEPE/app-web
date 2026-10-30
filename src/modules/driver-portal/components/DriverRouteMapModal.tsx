import { useState } from "react";
import { Compass, ExternalLink, LandPlot, MapPin, Navigation, Route, X } from "lucide-react";
import AppModal from "@/shared/components/AppModal";
import { InfoField, SummaryBar } from "@/shared/components/InfoField";
import ModalSection from "@/shared/components/ModalSection";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { formatKg } from "@/shared/utils/format";
import type { DriverLoad } from "@/modules/driver-portal/driverPortal.models";

interface DriverRouteMapModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    load: DriverLoad | null;
}

/**
 * Modal de ubicación de fincas de acopio y ruta al destino.
 * Incluye un visor cartográfico interactivo (OpenStreetMap) que centra el mapa al tocar cada finca o la planta de destino,
 * además del enlace directo para abrir la navegación paso a paso en Google Maps.
 */
export default function DriverRouteMapModal({ open, onOpenChange, load }: DriverRouteMapModalProps) {
    const [selectedPoint, setSelectedPoint] = useState<"destino" | string>("finca-0");

    if (!load) return null;

    const activeFarm =
        selectedPoint === "destino"
            ? null
            : load.fincas.find((f) => f.id === selectedPoint) ?? load.fincas[0] ?? null;

    const focusLat = activeFarm ? activeFarm.latitud : load.destinoLatitud;
    const focusLng = activeFarm ? activeFarm.longitud : load.destinoLongitud;
    const focusTitle = activeFarm
        ? `${activeFarm.nombre} (${activeFarm.distrito}, ${activeFarm.provincia})`
        : load.destino;

    const bboxDelta = 0.045;
    const osmEmbedUrl = focusLat === null || focusLng === null ? undefined : `https://www.openstreetmap.org/export/embed.html?bbox=${focusLng - bboxDelta}%2C${focusLat - bboxDelta}%2C${focusLng + bboxDelta}%2C${focusLat + bboxDelta}&layer=mapnik&marker=${focusLat}%2C${focusLng}`;

    const waypoints = load.fincas.map((f) => `${f.latitud},${f.longitud}`).join("|");
    const googleMapsRouteUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
        load.fincas[0] ? `${load.fincas[0].latitud},${load.fincas[0].longitud}` : load.origen,
    )}&destination=${encodeURIComponent(load.destinoLatitud === null || load.destinoLongitud === null ? load.destino : `${load.destinoLatitud},${load.destinoLongitud}`)}${
        waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""
    }&travelmode=driving`;

    const totalKilosFincas = load.fincas.every(f => f.kilosEstimados !== null) ? load.fincas.reduce((sum, f) => sum + (f.kilosEstimados ?? 0), 0) : null;

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            icon={<Route size={22} strokeWidth={2.2} />}
            title="Ubicación de fincas y ruta al destino"
            description={`${load.codigo} · ${load.cliente} · Placa ${load.placa}`}
            size="2xl"
            footer={
                <>
                    <Button variant="outline" size="xl" onClick={() => onOpenChange(false)}>
                        <X size={18} strokeWidth={2.5} /> Cerrar
                    </Button>
                    <Button
                        size="xl"
                        onClick={() => window.open(googleMapsRouteUrl, "_blank", "noopener,noreferrer")}
                    >
                        <ExternalLink size={18} strokeWidth={2.5} /> Abrir ruta en Google Maps
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-6">
                <SummaryBar
                    items={[
                        { label: "Fincas de recojo", value: `${load.fincas.length} punto(s)` },
                        { label: "Carga por fincas", value: totalKilosFincas === null ? "Sin desglose por finca" : formatKg(totalKilosFincas) + " kg", tone: "brand" },
                        { label: "Unidad asignada", value: load.placa },
                    ]}
                />

                <ModalSection
                    title="Mapa interactivo de acopio y destino"
                    aside={`Vista enfocada en: ${focusTitle}`}
                >
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                        {/* Selector lateral de puntos de la ruta */}
                        <div className="flex flex-col gap-2.5 lg:col-span-5">
                            {load.fincas.map((finca, index) => {
                                const isSelected = activeFarm?.id === finca.id;
                                return (
                                    <button
                                        key={finca.id}
                                        type="button"
                                        onClick={() => setSelectedPoint(finca.id)}
                                        className={cn(
                                            "flex flex-col gap-1.5 rounded-xl border p-3.5 text-left transition-all",
                                            isSelected
                                                ? "border-brand bg-brand-surface/50 shadow-xs ring-1 ring-brand/30"
                                                : "border-border bg-card hover:border-brand-border",
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="inline-flex items-center gap-2 text-[13.5px] font-bold text-ink">
                                                <span className="flex size-6 items-center justify-center rounded-full bg-brand text-[11px] font-extrabold text-white">
                                                    {index + 1}
                                                </span>
                                                {finca.nombre}
                                            </span>
                                            <span className="rounded-full bg-brand-surface px-2.5 py-0.5 text-[11px] font-bold text-brand">
                                                {finca.kilosEstimados === null ? "Sin desglose" : formatKg(finca.kilosEstimados) + " kg"}
                                            </span>
                                        </div>
                                        <p className="text-[12px] font-medium text-ink-body">{finca.productor}</p>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
                                            <span className="inline-flex items-center gap-1">
                                                <LandPlot size={12} className="text-brand" /> {finca.distrito}, {finca.provincia}
                                            </span>
                                            <span className="tabular-nums">
                                                {finca.latitud.toFixed(4)}, {finca.longitud.toFixed(4)}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}

                            {/* Punto final: Planta de destino */}
                            <button
                                type="button"
                                onClick={() => setSelectedPoint("destino")}
                                className={cn(
                                    "flex flex-col gap-1.5 rounded-xl border p-3.5 text-left transition-all",
                                    selectedPoint === "destino"
                                        ? "border-brand bg-brand-surface/50 shadow-xs ring-1 ring-brand/30"
                                        : "border-border bg-card hover:border-brand-border",
                                )}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="inline-flex items-center gap-2 text-[13.5px] font-bold text-ink">
                                        <span className="flex size-6 items-center justify-center rounded-full bg-status-highlight text-white">
                                            <Navigation size={13} strokeWidth={2.5} />
                                        </span>
                                        Destino de entrega
                                    </span>
                                    <span className="rounded-full bg-status-highlight-surface px-2.5 py-0.5 text-[11px] font-bold text-status-highlight">
                                        Planta / Cliente
                                    </span>
                                </div>
                                <p className="text-[12px] font-medium text-ink-body">{load.destino}</p>
                                <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted tabular-nums">
                                    <Compass size={12} className="text-status-highlight" />{" "}
                                    {load.destinoLatitud === null || load.destinoLongitud === null ? "Ubicación por dirección" : `${load.destinoLatitud.toFixed(4)}, ${load.destinoLongitud.toFixed(4)}`}
                                </span>
                            </button>
                        </div>

                        {/* Visor cartográfico */}
                        <div className="flex flex-col gap-3 lg:col-span-7">
                            <div className="relative h-72 sm:h-80 w-full overflow-hidden rounded-2xl border border-brand-border/60 bg-surface-page">
                                {osmEmbedUrl ? <iframe
                                    title={`Mapa de ${focusTitle}`}
                                    src={osmEmbedUrl}
                                    className="h-full w-full border-0"
                                    loading="lazy"
                                /> : <p className="p-6 text-ink-muted">Abre la ruta en Google Maps para localizar la dirección de destino.</p>}
                                <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 rounded-xl border border-border/80 bg-card/95 px-3.5 py-2 shadow-sm backdrop-blur-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <MapPin size={16} className="shrink-0 text-brand" />
                                        <span className="truncate text-[12.5px] font-bold text-ink">{focusTitle}</span>
                                    </div>
                                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-ink-muted">
                                        {focusLat?.toFixed(4)} {focusLng?.toFixed(4)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalSection>

                <ModalSection title="Resumen de tramo logístico">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InfoField label="Punto de partida general" value={load.origen} />
                        <InfoField label="Punto de llegada (Planta / Cliente)" value={load.destino} />
                    </div>
                </ModalSection>
            </div>
        </AppModal>
    );
}
