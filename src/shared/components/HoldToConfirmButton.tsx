import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/**
 * Duración óptima estándar de la industria (1.5s / 1500ms) para acciones destructivas irreversibles.
 * Tiempo suficiente para evitar clics accidentales sin generar fatiga ni sensación de lentitud en el usuario.
 */
export const DEFAULT_HOLD_DURATION_MS = 1500;

export interface HoldToConfirmButtonProps {
    onConfirm: () => void;
    /** Duración requerida de pulsación en ms. Por defecto 1500ms */
    durationMs?: number;
    idleLabel?: ReactNode;
    holdingLabel?: ReactNode;
    completedLabel?: ReactNode;
    icon?: ReactNode;
    variant?: "danger" | "default" | "destructive";
    size?: "default" | "sm" | "lg" | "xl" | "2xl";
    className?: string;
    style?: React.CSSProperties;
    disabled?: boolean;
}

export default function HoldToConfirmButton({
    onConfirm,
    durationMs = DEFAULT_HOLD_DURATION_MS,
    idleLabel = "Sí, eliminar",
    holdingLabel = "Mantén presionado...",
    completedLabel = "¡Eliminado!",
    icon,
    variant = "danger",
    size = "xl",
    className,
    style,
    disabled = false,
}: HoldToConfirmButtonProps) {
    const [progress, setProgress] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    const rafIdRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const completedRef = useRef(false);

    const stopHolding = useCallback(() => {
        if (completedRef.current) return;
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        startTimeRef.current = null;
        setIsHolding(false);
        setProgress(0);
    }, []);

    const startHolding = useCallback(() => {
        if (disabled || completedRef.current) return;

        setIsHolding(true);
        startTimeRef.current = performance.now();

        const tick = (now: number) => {
            if (startTimeRef.current === null) return;
            const elapsed = now - startTimeRef.current;
            const pct = Math.min(100, (elapsed / durationMs) * 100);
            setProgress(pct);

            if (pct >= 100) {
                completedRef.current = true;
                setIsHolding(false);
                setIsCompleted(true);

                if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                    try {
                        navigator.vibrate(50);
                    } catch {
                        // ignore
                    }
                }

                onConfirm();
            } else {
                rafIdRef.current = requestAnimationFrame(tick);
            }
        };

        rafIdRef.current = requestAnimationFrame(tick);
    }, [disabled, durationMs, onConfirm]);

    useEffect(() => {
        return () => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, []);

    return (
        <Button
            type="button"
            variant={variant}
            size={size}
            disabled={disabled || isCompleted}
            style={style}
            aria-label={`${typeof idleLabel === "string" ? idleLabel : "Confirmar"}. Mantén presionado durante ${(durationMs / 1000).toFixed(1)} segundos para confirmar.`}
            className={cn(
                "relative overflow-hidden select-none touch-none transition-all duration-150",
                isHolding && "scale-[0.98] shadow-inner",
                className
            )}
            onPointerDown={(e) => {
                if (e.button !== 0) return;
                try {
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                } catch {
                    // ignore
                }
                startHolding();
            }}
            onPointerUp={(e) => {
                try {
                    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                        e.currentTarget.releasePointerCapture?.(e.pointerId);
                    }
                } catch {
                    // ignore
                }
                stopHolding();
            }}
            onPointerCancel={stopHolding}
            onPointerLeave={(e) => {
                try {
                    if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                        stopHolding();
                    }
                } catch {
                    stopHolding();
                }
            }}
            onKeyDown={(e) => {
                if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                    e.preventDefault();
                    startHolding();
                }
            }}
            onKeyUp={(e) => {
                if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    stopHolding();
                }
            }}
            onBlur={stopHolding}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
        >
            {/* Capa de progreso de llenado (animación de izquierda a derecha) */}
            <span
                aria-hidden="true"
                className={cn(
                    "absolute inset-0 pointer-events-none origin-left bg-black/25 dark:bg-black/40",
                    isHolding ? "transition-none" : "transition-transform duration-200 ease-out"
                )}
                style={{ transform: `scaleX(${progress / 100})` }}
            />

            {/* Borde brillante en la cresta del progreso */}
            {isHolding && progress > 2 && progress < 99 && (
                <span
                    aria-hidden="true"
                    className="absolute top-0 bottom-0 w-1 bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.85)] pointer-events-none -ml-0.5"
                    style={{ left: `${progress}%` }}
                />
            )}

            {/* Contenido del botón */}
            <span className="relative z-10 inline-flex items-center justify-center gap-2">
                {isCompleted ? (
                    <>
                        <Check size={18} strokeWidth={2.75} className="shrink-0 animate-in zoom-in-50 duration-200" />
                        <span>{completedLabel}</span>
                    </>
                ) : isHolding ? (
                    <>
                        <span className="inline-block size-2 shrink-0 rounded-full bg-white animate-ping" />
                        <span>{holdingLabel}</span>
                    </>
                ) : (
                    <>
                        {icon}
                        <span>{idleLabel}</span>
                    </>
                )}
            </span>
        </Button>
    );
}

