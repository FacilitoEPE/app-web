import { Box, Scale, Truck, UserRound } from "lucide-react";
import MetricCards, { type Metric } from "@/shared/components/MetricCards";
import { plural } from "@/shared/utils/plural";
import type { Vehicle } from "@/modules/carriers/carriers.data";
import { formatDecimal } from "@/shared/utils/format";

interface CarrierMetricCardsProps {
    vehicles: Vehicle[];
    drivers: number;
}

/** Cuatro cifras del transportista, en la misma grilla de 2×2 que los indicadores de proveedor y campaña. */
export default function CarrierMetricCards({ vehicles, drivers }: CarrierMetricCardsProps) {
    const netWeight = vehicles.reduce((sum, vehicle) => sum + vehicle.pesoNeto, 0);
    const volume = vehicles.reduce((sum, vehicle) => sum + vehicle.volumen, 0);

    const metrics: Metric[] = [
        { title: "Vehículos", value: String(vehicles.length), unit: plural(vehicles.length, "vehículo", "vehículos"), description: "Flota registrada de la empresa", icon: Truck },
        { title: "Choferes", value: String(drivers), unit: plural(drivers, "chofer", "choferes"), description: "Conductores asociados", icon: UserRound },
        { title: "Capacidad neta", value: formatDecimal(netWeight), unit: "t", description: "Suma del peso neto de la flota", icon: Scale },
        { title: "Volumen de carga", value: formatDecimal(volume), unit: "m³", description: vehicles.length > 0 ? "Suma del volumen de la flota" : "Aún sin vehículos registrados", icon: Box, warm: true },
    ];

    return <MetricCards metrics={metrics} label="Indicadores del transportista" />;
}
