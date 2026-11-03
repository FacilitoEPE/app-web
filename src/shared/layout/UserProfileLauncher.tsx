import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, ChevronRight, LogOut, Settings, ShieldCheck, User } from "lucide-react";
import type { AuthUser } from "@/shared/offline/session";
import { BRAND_ACTIVE_SURFACE } from "@/shared/styles/brandGradients";
import "@/shared/layout/ModuleLauncher.css";

/* ── Animaciones Dynamic Island: Apertura elástica líquida + Cierre fluido ── */
const NOTCH_ENTER_SPRING = {
    type: "spring" as const,
    stiffness: 340,
    damping: 24,
    mass: 0.6,
};

const NOTCH_EXIT_TRANSITION = {
    duration: 0.2,
    ease: [0.32, 0, 0.67, 0] as const,
};

const BACKDROP_DURATION = 0.18;

interface UserProfileLauncherProps {
    user: AuthUser;
    onOpenSettings: () => void;
    onOpenLogout: () => void;
}

/**
 * Menú de perfil de usuario integrado como Notch dinámico al Header.
 * Diseñado con la misma geometría de curvatura continua G2 de 38px y física
 * elástica de expansión de Dynamic Island que el selector de módulos.
 */
export default function UserProfileLauncher({
    user,
    onOpenSettings,
    onOpenLogout,
}: UserProfileLauncherProps) {
    const [open, setOpen] = useState(false);
    const [clampShift, setClampShift] = useState(0);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const prefersReducedMotion = useReducedMotion();

    const displayName = [user.nombres, user.apellidos].filter(Boolean).join(" ") || user.usuario;

    const close = useCallback(() => setOpen(false), []);

    /* Cálculo reactivo de alineación para centrado bajo el disparador con reserva para las orejas */
    useEffect(() => {
        if (!open || !triggerRef.current) return;
        const updatePosition = () => {
            const trigger = triggerRef.current;
            if (!trigger) return;
            const rect = trigger.getBoundingClientRect();
            const buttonCenter = rect.left + rect.width / 2;
            const screenWidth = window.innerWidth;
            const panelWidth = Math.min(340, screenWidth - 32);
            const halfPanel = panelWidth / 2;
            const paddingRight = screenWidth >= 440 ? 48 : 16;
            const paddingLeft = screenWidth >= 440 ? 48 : 16;

            const minAllowedCenter = halfPanel + paddingLeft;
            const maxAllowedCenter = screenWidth - halfPanel - paddingRight;

            if (buttonCenter > maxAllowedCenter) {
                setClampShift(maxAllowedCenter - buttonCenter);
            } else if (buttonCenter < minAllowedCenter) {
                setClampShift(minAllowedCenter - buttonCenter);
            } else {
                setClampShift(0);
            }
        };

        updatePosition();
        window.addEventListener("resize", updatePosition);
        return () => window.removeEventListener("resize", updatePosition);
    }, [open]);

    /* Cerrar con tecla Escape */
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open, close]);

    /* Cerrar al hacer clic fuera del panel y del disparador */
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            const panel = panelRef.current;
            const trigger = triggerRef.current;
            const target = e.target as Node;
            if (panel && !panel.contains(target) && trigger && !trigger.contains(target)) {
                close();
            }
        };
        const timer = setTimeout(() => {
            document.addEventListener("mousedown", handler);
        }, 0);
        return () => {
            clearTimeout(timer);
            document.removeEventListener("mousedown", handler);
        };
    }, [open, close]);

    /* Foco accesible al primer botón interactivo al abrir */
    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => {
                const firstButton = panelRef.current?.querySelector<HTMLElement>("button[data-profile-action]");
                firstButton?.focus();
            });
        }
    }, [open]);

    const toggle = useCallback(() => {
        setOpen((prev) => !prev);
    }, []);

    const handleSettingsClick = useCallback(() => {
        close();
        onOpenSettings();
    }, [close, onOpenSettings]);

    const handleLogoutClick = useCallback(() => {
        close();
        onOpenLogout();
    }, [close, onOpenLogout]);

    const noMotion = prefersReducedMotion === true;

    return (
        <div className="relative flex h-full items-center justify-center">
            {/* Botón disparador: avatar + datos con chevron interactivo */}
            <button
                ref={triggerRef}
                type="button"
                aria-label={open ? "Cerrar menú de usuario" : "Abrir menú de usuario"}
                aria-expanded={open}
                onClick={toggle}
                className={`flex items-center gap-3 p-1 sm:p-1.5 sm:pl-2 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand/40 active:scale-95 ${
                    open
                        ? "bg-brand-surface ring-2 ring-brand/30"
                        : "hover:bg-muted"
                }`}
            >
                <div className="relative shrink-0">
                    <span
                        className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border border-transparent text-white"
                        style={BRAND_ACTIVE_SURFACE}
                    >
                        <User size={20} strokeWidth={2} />
                    </span>
                    {/* Indicador sutil de sesión activa */}
                    <span
                        className="absolute bottom-0 right-0 size-2.5 rounded-full bg-brand ring-2 ring-card"
                        title="Sesión activa"
                    />
                </div>

                {/* Nombre y rol (ocultos en móvil para dar prioridad al avatar) */}
                <span className="hidden md:flex flex-col items-start text-left">
                    <span className="text-sm font-bold text-ink leading-tight">{displayName}</span>
                    <span className="text-xs text-ink-muted font-medium">{user.rol.nombre}</span>
                </span>

                <ChevronDown
                    size={16}
                    className={`hidden md:block text-ink-muted ml-1 transition-transform duration-200 ${
                        open ? "rotate-180 text-brand" : ""
                    }`}
                />
            </button>

            <AnimatePresence>
                {open && (
                    <>
                        {/* Telón de fondo con desenfoque suave tipo modal */}
                        <motion.div
                            className="notch-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1, transition: { duration: noMotion ? 0 : BACKDROP_DURATION } }}
                            exit={{ opacity: 0, transition: { duration: noMotion ? 0 : 0.15 } }}
                            onClick={close}
                            aria-hidden="true"
                        />

                        {/* Contenedor de anclaje geométrico: centrado con x-translate inmune a Framer Motion */}
                        <div
                            className="absolute top-full left-1/2 z-50 flex justify-center pointer-events-none"
                            style={{
                                transform: clampShift
                                    ? `translateX(calc(-50% + ${clampShift}px))`
                                    : "translateX(-50%)",
                            }}
                        >
                            {/* Panel animado del Notch: nace físicamente desde el header (100% sólido, sin desvanecer) */}
                            <motion.div
                                ref={panelRef}
                                className="notch-panel pointer-events-auto w-[340px] max-w-[calc(100vw-32px)]"
                                role="dialog"
                                aria-label="Perfil y opciones de cuenta"
                                initial={
                                    noMotion
                                        ? { opacity: 0 }
                                        : { scaleY: 0, scaleX: 0.25 }
                                }
                                animate={
                                    noMotion
                                        ? { opacity: 1 }
                                        : {
                                              scaleY: 1,
                                              scaleX: 1,
                                              transition: NOTCH_ENTER_SPRING,
                                          }
                                }
                                exit={
                                    noMotion
                                        ? { opacity: 0 }
                                        : {
                                              scaleY: 0,
                                              scaleX: 0.25,
                                              transition: NOTCH_EXIT_TRANSITION,
                                          }
                                }
                                style={{ transformOrigin: "top center" }}
                            >
                                {/* Oreja cóncava izquierda (Alineada exactamente al píxel del header) */}
                                <svg
                                    className="notch-ear notch-ear-left"
                                    viewBox="0 0 39 38"
                                    width="39"
                                    height="38"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M 0 0 C 24 0 38 14 38 38 L 39 38 L 39 0 Z"
                                        fill="var(--card)"
                                    />
                                    <path
                                        d="M 0 0.5 C 24 0.5 38 14 38 38"
                                        fill="none"
                                        stroke="var(--notch-border)"
                                        strokeWidth="1"
                                        strokeLinecap="round"
                                    />
                                </svg>

                                {/* Oreja cóncava derecha (Alineada exactamente al píxel del header) */}
                                <svg
                                    className="notch-ear notch-ear-right"
                                    viewBox="0 0 39 38"
                                    width="39"
                                    height="38"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M 1 38 C 1 14 15 0 39 0 L 0 0 L 0 38 Z"
                                        fill="var(--card)"
                                    />
                                    <path
                                        d="M 1 38 C 1 14 15 0.5 39 0.5"
                                        fill="none"
                                        stroke="var(--notch-border)"
                                        strokeWidth="1"
                                        strokeLinecap="round"
                                    />
                                </svg>

                                {/* Contenido rediseñado con florecimiento suave */}
                                <motion.div
                                    className="flex flex-col p-4 sm:p-5"
                                    initial={noMotion ? {} : { opacity: 0, scale: 0.92 }}
                                    animate={
                                        noMotion
                                            ? {}
                                            : {
                                                  opacity: 1,
                                                  scale: 1,
                                                  transition: { duration: 0.18, delay: 0.06, ease: "easeOut" },
                                              }
                                    }
                                    exit={
                                        noMotion
                                            ? {}
                                            : {
                                                  opacity: 0,
                                                  scale: 0.92,
                                                  transition: { duration: 0.08, ease: "easeIn" },
                                              }
                                    }
                                >
                                    {/* Cabecera de Identidad de Usuario */}
                                    <div className="flex items-center gap-3.5 pb-3">
                                        <div className="relative shrink-0">
                                            <span
                                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-transparent text-white shadow-sm"
                                                style={BRAND_ACTIVE_SURFACE}
                                            >
                                                <User size={24} strokeWidth={2.2} />
                                            </span>
                                            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-brand ring-2 ring-card" />
                                        </div>

                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[15px] font-bold text-ink truncate leading-tight">
                                                {displayName}
                                            </span>
                                            <span className="text-xs text-ink-muted truncate font-mono mt-0.5">
                                                @{user.usuario}
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-surface text-brand ring-1 ring-brand-border">
                                                    <ShieldCheck size={12} strokeWidth={2.2} />
                                                    {user.rol.nombre}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ficha operativa contextual */}
                                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/50 border border-border/60 my-1">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                                                Sistema
                                            </span>
                                            <span className="text-xs font-semibold text-ink truncate">
                                                Agro Exportaciones
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">
                                                Estado
                                            </span>
                                            <span className="flex items-center gap-1.5 text-xs font-semibold text-brand">
                                                <span className="size-1.5 rounded-full bg-brand animate-pulse" />
                                                En línea
                                            </span>
                                        </div>
                                    </div>

                                    {/* Divisor estético sutil */}
                                    <div className="h-px w-full bg-border/80 my-2" />

                                    {/* Acciones principales */}
                                    <div className="flex flex-col gap-1">
                                        <button
                                            data-profile-action
                                            type="button"
                                            onClick={handleSettingsClick}
                                            className="user-notch-action group"
                                        >
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-ink group-hover:bg-brand-surface group-hover:text-brand transition-colors">
                                                <Settings size={18} strokeWidth={2} />
                                            </span>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-sm font-semibold text-ink leading-snug">
                                                    Configuración
                                                </span>
                                                <span className="text-[11px] text-ink-muted leading-tight">
                                                    Preferencias y apariencia
                                                </span>
                                            </div>
                                            <ChevronRight
                                                size={16}
                                                className="text-ink-muted/70 group-hover:text-brand group-hover:translate-x-0.5 transition-all"
                                            />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleLogoutClick}
                                            className="user-notch-action user-notch-action-danger group"
                                        >
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive group-hover:bg-destructive/20 transition-colors">
                                                <LogOut size={18} strokeWidth={2} />
                                            </span>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-sm font-semibold text-destructive leading-snug">
                                                    Cerrar sesión
                                                </span>
                                                <span className="text-[11px] text-destructive/70 leading-tight">
                                                    Salir de este equipo
                                                </span>
                                            </div>
                                            <ChevronRight
                                                size={16}
                                                className="text-destructive/50 group-hover:text-destructive group-hover:translate-x-0.5 transition-all"
                                            />
                                        </button>
                                    </div>

                                    {/* Pie del Notch */}
                                    <div className="mt-3 pt-2.5 border-t border-border/60 text-center">
                                        <span className="text-[10.5px] font-medium text-ink-muted">
                                            Cultivando Confianza · Sistema Web
                                        </span>
                                    </div>
                                </motion.div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

