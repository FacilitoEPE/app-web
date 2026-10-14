import { LandPlot, Leaf, Ruler, ShieldCheck } from "lucide-react";
import MetricCards, { type Metric } from "@/shared/components/MetricCards";
import { formatDecimal } from "@/shared/utils/format";

interface ProviderMetricCardsProps {
    fincas: number;
    totalHectares: number;
    cultivatedHectares: number;
    certificates: number;
}

/** Cuatro cifras del proveedor, en la misma grilla de 2×2 que los indicadores de campaña. */
export default function ProviderMetricCards({ fincas, totalHectares, cultivatedHectares, certificates }: ProviderMetricCardsProps) {
    const cultivatedShare = totalHectares > 0 ? Math.round((cultivatedHectares / totalHectares) * 100) : 0;

    const metrics: Metric[] = [
        { title: "Fincas registradas", value: String(fincas), unit: fincas === 1 ? "finca" : "fincas", description: "Lugares de cultivo del proveedor", icon: LandPlot },
        { title: "Hectáreas totales", value: formatDecimal(totalHectares), unit: "ha", description: "Suma de todas sus fincas", icon: Ruler },
        { title: "Hectáreas de cultivo", value: formatDecimal(cultivatedHectares), unit: "ha", description: totalHectares > 0 ? `${cultivatedShare}% del total registrado` : "Aún sin fincas registradas", icon: Leaf },
        { title: "Certificados", value: String(certificates), unit: certificates === 1 ? "documento" : "documentos", description: "Certificados propios del proveedor", icon: ShieldCheck, warm: true },
    ];

    return <MetricCards metrics={metrics} label="Indicadores del proveedor" />;
}
