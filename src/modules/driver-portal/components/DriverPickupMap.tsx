import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";

type Point = [latitude: number, longitude: number];
type RouteEstimate = { distance: number; duration: number; path: Point[] };
const routeService = import.meta.env.VITE_PICKUP_ROUTE_URL?.trim()
    || (import.meta.env.DEV ? "https://routing.openstreetmap.de/routed-car/route/v1/driving" : "");
const manualOrigin = "Puedes marcar la salida en el mapa.";
const directLineNotice = "Se muestra una línea recta de referencia. Abre Google Maps para ver la ruta por carretera.";

export default function DriverPickupMap({ latitude, longitude }: { latitude: number; longitude: number }) {
    const frame = useRef<HTMLIFrameElement>(null);
    const routeRequest = useRef<AbortController | null>(null);
    const [origin, setOrigin] = useState<Point | null>(null);
    const [picking, setPicking] = useState(false);
    const [locating, setLocating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [route, setRoute] = useState<RouteEstimate | null>(null);
    const [showDirectLine, setShowDirectLine] = useState(false);
    const [message, setMessage] = useState("");

    const sendMapState = useCallback(() => {
        frame.current?.contentWindow?.postMessage({
            type: "pickup-map", origin, picking, path: route?.path, showDirectLine,
        }, window.location.origin);
    }, [origin, picking, route, showDirectLine]);

    useEffect(sendMapState, [sendMapState]);
    useEffect(() => () => routeRequest.current?.abort(), []);

    const selectOrigin = useCallback((point: Point) => {
        routeRequest.current?.abort();
        setLoading(false);
        setOrigin(point);
        setPicking(false);
        setRoute(null);
        setShowDirectLine(false);
        setMessage("");
    }, []);

    useEffect(() => {
        if (!picking) return;
        const handleClick = ({ source, origin, data }: MessageEvent) => {
            if (source !== frame.current?.contentWindow || origin !== window.location.origin || data?.type !== "pickup-origin") return;
            const point = data.point;
            if (Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)) {
                selectOrigin([point[0], point[1]]);
            }
        };
        window.addEventListener("message", handleClick);
        return () => window.removeEventListener("message", handleClick);
    }, [picking, selectOrigin]);

    const locate = () => {
        if (!window.isSecureContext) {
            setMessage(`La ubicación requiere abrir el portal por HTTPS. ${manualOrigin}`);
            return;
        }
        if (!navigator.geolocation) {
            setMessage(`La ubicación actual no está disponible en este navegador. ${manualOrigin}`);
            return;
        }
        setPicking(false);
        setLocating(true);
        setMessage("");
        navigator.geolocation.getCurrentPosition(({ coords }) => {
            selectOrigin([coords.latitude, coords.longitude]);
            setLocating(false);
        }, (error) => {
            const reason = error.code === error.PERMISSION_DENIED
                ? "Permite el acceso a tu ubicación en los ajustes del navegador y del dispositivo."
                : error.code === error.TIMEOUT
                    ? "El dispositivo tardó demasiado en obtener la ubicación. Intenta de nuevo."
                    : "Activa la ubicación del dispositivo y vuelve a intentarlo.";
            setMessage(`${reason} ${manualOrigin}`);
            setLocating(false);
        }, { timeout: 20000, maximumAge: 15000 });
    };

    const googleRoute = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving${origin ? `&origin=${origin.join(",")}` : ""}`;

    const showRoute = async () => {
        if (!origin || loading) return;
        if (!routeService) {
            setShowDirectLine(true);
            setMessage("");
            return;
        }
        const request = new AbortController();
        routeRequest.current = request;
        setLoading(true);
        setMessage("");
        setRoute(null);
        setShowDirectLine(false);
        try {
            const coordinates = `${origin[1]},${origin[0]};${longitude},${latitude}`;
            const response = await fetch(`${routeService.replace(/\/$/, "")}/${coordinates}?geometries=geojson&overview=full`, {
                signal: AbortSignal.any([request.signal, AbortSignal.timeout(10000)]),
            });
            if (!response.ok) throw new Error("Ruta no disponible");
            const result = (await response.json()).routes?.[0];
            const points = result?.geometry?.coordinates;
            if (!Number.isFinite(result?.distance) || !Number.isFinite(result?.duration)
                || !Array.isArray(points) || points.length < 2
                || !points.every(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite))) {
                throw new Error("Ruta no disponible");
            }
            if (!request.signal.aborted) setRoute({
                distance: result.distance,
                duration: result.duration,
                path: points.map(([lng, lat]): Point => [lat, lng]),
            });
        } catch {
            if (!request.signal.aborted) {
                setShowDirectLine(true);
                setMessage("No pudimos calcular la ruta por carretera.");
            }
        } finally {
            if (!request.signal.aborted) setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <iframe
                ref={frame}
                className="h-72 w-full rounded-xl border sm:h-80"
                title="Mapa de recojo"
                src={`${import.meta.env.BASE_URL}driver-pickup-map.html#${latitude},${longitude}`}
                onLoad={sendMapState}
            />
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={locate} disabled={locating}>
                    {locating ? "Buscando ubicación…" : "Usar mi ubicación"}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setMessage(""); setPicking(value => !value); }} disabled={locating} aria-pressed={picking}>
                    {picking ? "Cancelar selección" : "Marcar salida en el mapa"}
                </Button>
                <Button type="button" onClick={showRoute} disabled={!origin || loading || locating || picking}>
                    {loading ? "Calculando…" : "Ver ruta"}
                </Button>
            </div>
            <p className="text-sm text-ink-muted" role="status">
                {picking ? "Toca un punto del mapa para marcar la salida." : message || (origin ? `Salida: ${origin.map(value => value.toFixed(5)).join(", ")}` : "Elige un punto de salida para ver la ruta a la finca.")}
            </p>
            {showDirectLine && <p className="text-sm text-ink-muted" role="status">{directLineNotice}</p>}
            {route && (
                <p className="rounded-lg bg-brand-surface p-3 text-sm text-ink" role="status">
                    <strong>{(route.distance / 1000).toFixed(1)} km · aprox. {Math.round(route.duration / 60)} min</strong>
                    <br />Ruta orientativa por carretera. Los tiempos pueden variar.
                </p>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
                <a className="text-brand underline" href={googleRoute} target="_blank" rel="noreferrer">Abrir ruta de recojo en Google Maps</a>
                {route && (
                    <>
                        <a className="text-brand underline" href="https://project-osrm.org/" target="_blank" rel="noreferrer">Ruta calculada con OSRM</a>
                        <a className="text-brand underline" href={`https://www.openstreetmap.org/edit#map=15/${latitude}/${longitude}`} target="_blank" rel="noreferrer">Corregir mapa</a>
                    </>
                )}
            </div>
        </div>
    );
}
