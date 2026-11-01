import type { ReactNode } from "react";
import { TriangleAlert, CircleHelp, X, Timer } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { BRAND_ACTIVE_SURFACE } from "@/shared/styles/brandGradients";
import { cn } from "@/lib/utils";
import HoldToConfirmButton, { DEFAULT_HOLD_DURATION_MS } from "@/shared/components/HoldToConfirmButton";

type ConfirmTone = "danger" | "warning";

interface ConfirmModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    /** Puede llevar el nombre del elemento en negrita, ej. <strong>SUTRIMEX</strong> */
    description: ReactNode;
    /** "danger" para acciones destructivas (eliminar); "warning" para las que piden pensarlo dos veces */
    tone?: ConfirmTone;
    /** Ícono del círculo central; por defecto uno acorde al tono */
    icon?: ReactNode;
    /** Texto de la píldora sobre el título */
    badgeLabel?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /**
     * Si requiere mantener presionado el botón para confirmar.
     * Por defecto `true` para acciones destructivas (`tone === "danger"`).
     */
    requireHold?: boolean;
    /** Duración requerida de la pulsación en milisegundos (por defecto 1500 ms) */
    holdDurationMs?: number;
    onConfirm: () => void;
}

const TONES: Record<ConfirmTone, {
    wash: string;
    dash: string;
    ring: string;
    coreBorder: string;
    coreClass: string;
    pill: string;
    defaultIcon: ReactNode;
    defaultBadge: string;
    confirmVariant: "danger" | "default";
}> = {
    danger: {
        wash: "bg-destructive/12",
        dash: "bg-destructive",
        ring: "bg-destructive/20",
        coreBorder: "border-destructive/20 bg-card/90",
        coreClass: "bg-destructive",
        pill: "border-destructive/20 bg-destructive/10 text-destructive",
        defaultIcon: <TriangleAlert size={30} strokeWidth={2.5} />,
        defaultBadge: "Acción irreversible",
        confirmVariant: "danger",
    },
    // Advertencia en rojo, como el peligro: el naranja se leía como un estado, no como una alerta.
    // Se distingue de "danger" por el ícono, la píldora y el botón de confirmar (de marca, no rojo).
    warning: {
        wash: "bg-destructive/12",
        dash: "bg-destructive",
        ring: "bg-destructive/20",
        coreBorder: "border-destructive/20 bg-card/90",
        coreClass: "bg-destructive",
        pill: "border-destructive/20 bg-destructive/10 text-destructive",
        defaultIcon: <CircleHelp size={30} strokeWidth={2.5} />,
        defaultBadge: "Confirmación requerida",
        confirmVariant: "default",
    },
};

/** 8 rayitas alrededor del ícono, cada 45° (las mismas del SuccessModal) */
const DASH_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * Pregunta de seguridad antes de una acción que no se puede deshacer o que conviene confirmar.
 * Hermano visual de SuccessModal (banner de marca con ícono animado, píldora, título, descripción y botones),
 * pero teñido según el tono y armado sobre AlertDialog: no se cierra al tocar afuera, así una confirmación
 * nunca se descarta por accidente.
 */
export default function ConfirmModal({
    open,
    onOpenChange,
    title,
    description,
    tone = "danger",
    icon,
    badgeLabel,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    requireHold,
    holdDurationMs = DEFAULT_HOLD_DURATION_MS,
    onConfirm,
}: ConfirmModalProps) {
    const t = TONES[tone];
    const isHoldActive = requireHold ?? (tone === "danger");

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="flex flex-col gap-0 overflow-hidden rounded-2xl border-0 bg-card p-0 shadow-2xl ring-0 data-[size=default]:sm:max-w-115">
                {/* Banner de marca con el ícono animado, teñido con el color del tono */}
                <div
                    className="relative h-44 w-full shrink-0 bg-brand-surface bg-cover bg-center sm:h-48 dark:bg-blend-multiply"
                    style={{ backgroundImage: "url('/image/success_modal_background.webp')" }}
                >
                    <div aria-hidden className={cn("absolute inset-0", t.wash)} />

                    <div aria-hidden className="absolute left-6 top-6 hidden sm:block">
                        <p className="w-28 text-[8.5px] font-bold uppercase leading-relaxed tracking-[0.28em] text-ink/60">
                            Agricultura que conecta personas
                        </p>
                        <span className={cn("mt-2 block h-0.5 w-8 rounded-full", t.dash)} />
                    </div>

                    <AlertDialogCancel
                        variant="ghost"
                        aria-label="Cerrar"
                        className="absolute right-3 top-3 z-20 flex size-9 items-center justify-center rounded-full bg-card/80 p-0 text-ink shadow-sm backdrop-blur-sm transition-colors hover:bg-card active:scale-95"
                    >
                        <X size={18} strokeWidth={2.5} />
                    </AlertDialogCancel>

                    <div aria-hidden className="absolute inset-0 flex items-center justify-center">
                        <div className="relative flex h-40 w-40 items-center justify-center">
                            {DASH_ANGLES.map((angle, index) => (
                                <span key={angle} className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
                                    <span
                                        className={cn("absolute left-1/2 top-1 -ml-0.375 h-3.5 w-0.75 rounded-full", t.dash)}
                                        style={{ animation: `success-dash 0.35s ease-out ${280 + index * 35}ms both` }}
                                    />
                                </span>
                            ))}

                            <span className={cn("absolute h-26 w-26 rounded-full", t.ring)} style={{ animation: "success-ring 1.1s ease-out 0.15s both" }} />
                            <div
                                className={cn("relative flex h-26 w-26 items-center justify-center rounded-full border", t.coreBorder)}
                                style={{ animation: "success-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}
                            >
                                <div className={cn("flex h-16 w-16 items-center justify-center rounded-full border border-transparent text-white", t.coreClass)}>
                                    {icon ?? t.defaultIcon}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center px-6 pb-7 pt-3 text-center sm:px-10 sm:pb-9">
                    <span className={cn("mb-4 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold", t.pill)}>
                        <TriangleAlert size={14} strokeWidth={2.5} />
                        {badgeLabel ?? t.defaultBadge}
                    </span>

                    <AlertDialogTitle className="mb-2 text-[21px] font-bold leading-tight text-ink sm:text-[24px]">{title}</AlertDialogTitle>
                    <AlertDialogDescription className="mb-7 max-w-85 text-[13.5px] font-medium leading-relaxed text-ink-body sm:text-[14px]">
                        {description}
                    </AlertDialogDescription>

                    <div className="flex w-full flex-col-reverse gap-3 sm:flex-row">
                        <AlertDialogCancel size="xl" className="border-border text-ink-body hover:bg-muted hover:text-ink sm:flex-1">
                            {cancelLabel}
                        </AlertDialogCancel>

                        {isHoldActive ? (
                            <HoldToConfirmButton
                                variant={t.confirmVariant}
                                size="xl"
                                className="sm:flex-[1.4]"
                                durationMs={holdDurationMs}
                                idleLabel={confirmLabel}
                                onConfirm={() => {
                                    onConfirm();
                                    onOpenChange(false);
                                }}
                            />
                        ) : (
                            <AlertDialogAction
                                variant={t.confirmVariant}
                                size="xl"
                                className="sm:flex-[1.4]"
                                style={t.confirmVariant === "default" ? BRAND_ACTIVE_SURFACE : undefined}
                                onClick={() => {
                                    onConfirm();
                                    onOpenChange(false);
                                }}
                            >
                                {confirmLabel}
                            </AlertDialogAction>
                        )}
                    </div>

                    {isHoldActive && (
                        <p className="mt-3.5 flex items-center justify-center gap-1.5 text-[12px] font-medium text-ink-muted select-none">
                            <Timer size={13.5} className="text-destructive shrink-0" strokeWidth={2.25} />
                            <span>Mantén presionado durante {(holdDurationMs / 1000).toFixed(1).replace('.0', '')} s para confirmar</span>
                        </p>
                    )}
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}
