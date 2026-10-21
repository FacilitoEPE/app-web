import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusTone = "brand" | "highlight" | "warning" | "danger" | "neutral";

const STATUS_TONES: Record<string, StatusTone> = {
    planificado: "brand",
    aprobado: "brand",
    activo: "brand",
    registrado: "brand",
    // Certificaciones de campaña: trámite y pago
    "en trámite": "warning",
    observado: "highlight",
    certificado: "brand",
    parcial: "warning",
    pagado: "brand",
    vigente: "brand",
    "por aprobar": "highlight",
    "por vencer": "highlight",
    "en espera": "highlight",
    pendiente: "highlight",
    "en proceso": "warning",
    "en ejecución": "warning",
    // Etapas de un examen de laboratorio
    "pendiente de envío": "highlight",
    "enviado al laboratorio": "warning",
    "con resultado": "brand",
    // Coordinación de una entrega
    "por completar": "highlight",
    completa: "brand",
    // Acuerdo de pago con un transportista
    "pago único": "brand",
    "con adelanto": "warning",
    // Resultado de examen de laboratorio: negativo es el resultado esperado (sin residuos)
    negativo: "brand",
    positivo: "danger",
    vencida: "danger",
    rechazado: "danger",
    terminado: "neutral",
    inactivo: "neutral",
};

const TONE_STYLES: Record<StatusTone, { badge: string; dot: string }> = {
    brand: { badge: "bg-brand-surface text-brand", dot: "bg-brand" },
    highlight: { badge: "bg-status-highlight-surface text-status-highlight", dot: "bg-status-highlight" },
    warning: { badge: "bg-status-warning/10 text-status-warning", dot: "bg-status-warning" },
    danger: { badge: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
    neutral: { badge: "bg-status-neutral-surface text-status-neutral", dot: "bg-status-neutral" },
};

interface StatusBadgeProps {
    status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    const tone = TONE_STYLES[STATUS_TONES[status.toLowerCase()] ?? "neutral"];

    return (
        <Badge
            variant="outline"
            className={cn("rounded-full px-3.5 py-1.5 font-semibold text-[13px] border-0 gap-2", tone.badge)}
        >
            <div className={cn("w-1.5 h-1.5 rounded-full", tone.dot)} />
            {status}
        </Badge>
    );
}
