import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LayoutGrid } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import Hint from "@/shared/components/Hint";
import { navigationItems } from "@/shared/layout/navigationItems";
import ModuleLauncherIcon from "@/shared/layout/ModuleLauncherIcon";
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

/**
 * Selector de módulos integrado como Notch al Header.
 * Diseñado según el benchmarking de Dynamic Island / NotchNook de macOS:
 * - Crecimiento físico real desde el header (sin desvanecimientos transparentes en la carcasa).
 * - Curvatura continua Bézier G2 de 38px en las transiciones al header (orejas cóncavas).
 * - 100% centrado geométricamente bajo el botón disparador.
 * - Fusión física en una sola pieza con el navbar sin líneas ni separaciones internas.
 * - Telón de fondo con desenfoque suave tipo modal a partir del borde inferior del header (top: 72px).
 */
export default function ModuleLauncher() {
    const [open, setOpen] = useState(false);
    const [clampShift, setClampShift] = useState(0);
    const { pathname } = useLocation();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const prefersReducedMotion = useReducedMotion();

    const close = useCallback(() => setOpen(false), []);

    /* Cálculo reactivo de alineación para centrado estricto bajo el botón con protección de bordes */
    useEffect(() => {
        if (!open || !triggerRef.current) return;
        const updatePosition = () => {
            const trigger = triggerRef.current;
            if (!trigger) return;
            const rect = trigger.getBoundingClientRect();
            const buttonCenter = rect.left + rect.width / 2;
            const screenWidth = window.innerWidth;
            const panelWidth = Math.min(490, screenWidth - 32);
            const halfPanel = panelWidth / 2;
            const padding = 16;

            const minAllowedCenter = halfPanel + padding;
            const maxAllowedCenter = screenWidth - halfPanel - padding;

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

    /* Foco accesible al módulo activo o al primero al abrir */
    useEffect(() => {
        if (open) {
            requestAnimationFrame(() => {
                const activeLink = panelRef.current?.querySelector<HTMLElement>("a[data-module-option][aria-current='location']");
                const firstLink = panelRef.current?.querySelector<HTMLElement>("a[data-module-option]");
                (activeLink || firstLink)?.focus();
            });
        }
    }, [open]);

    const toggle = useCallback(() => {
        setOpen((prev) => !prev);
    }, []);

    const noMotion = prefersReducedMotion === true;

    return (
        <div className="relative flex h-full items-center justify-center">
            {/* Botón disparador: siempre presente e integrado en el header */}
            <Hint label="Módulos" side="bottom">
                <button
                    ref={triggerRef}
                    type="button"
                    aria-label={open ? "Cerrar selector de módulos" : "Abrir selector de módulos"}
                    aria-expanded={open}
                    onClick={toggle}
                    className={`flex size-10 cursor-pointer items-center justify-center rounded-xl outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand/40 motion-reduce:transition-none ${
                        open
                            ? "bg-brand-surface text-brand ring-2 ring-brand/30"
                            : "text-ink-muted hover:bg-brand-surface hover:text-brand"
                    }`}
                >
                    <LayoutGrid size={22} strokeWidth={2} />
                </button>
            </Hint>

            <AnimatePresence>
                {open && (
                    <>
                        {/* Telón de fondo con desenfoque, ubicado exclusivamente debajo de la barra de navegación */}
                        <motion.div
                            className="notch-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: noMotion ? 0 : BACKDROP_DURATION }}
                            onClick={close}
                            aria-hidden="true"
                        />

                        {/* Contenedor de anclaje geométrico: centrado milimétrico bajo el botón con x-translate inmune a Framer Motion */}
                        <div
                            className="absolute top-full left-1/2 z-50 flex justify-center pointer-events-none"
                            style={{
                                transform: clampShift
                                    ? `translateX(calc(-50% + ${clampShift}px))`
                                    : "translateX(-50%)",
                            }}
                        >
                            {/* Panel animado del Notch: nace desde el botón y se expande líquidamente (100% sólido) */}
                            <motion.div
                                ref={panelRef}
                                className="notch-panel pointer-events-auto w-[490px] max-w-[calc(100vw-32px)]"
                                role="dialog"
                                aria-label="Selector de módulos del sistema"
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

                                {/* Cuadrícula de 8 módulos con florecimiento limpio al expandir */}
                                <motion.nav
                                    aria-label="Módulos de la aplicación"
                                    className="grid grid-cols-2 gap-2.5 p-3.5 sm:grid-cols-4 sm:p-5"
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
                                    {navigationItems.map((item, index) => {
                                        const active =
                                            pathname === item.url ||
                                            pathname.startsWith(`${item.url}/`);
                                        return (
                                            <motion.div
                                                key={item.id}
                                                initial={noMotion ? {} : { opacity: 0, y: 6 }}
                                                animate={noMotion ? {} : { opacity: 1, y: 0 }}
                                                transition={
                                                    noMotion
                                                        ? { duration: 0 }
                                                        : {
                                                              duration: 0.18,
                                                              delay: 0.03 + index * 0.015,
                                                              ease: "easeOut",
                                                          }
                                                }
                                            >
                                                <Link
                                                    data-module-option
                                                    to={item.url}
                                                    aria-current={active ? "location" : undefined}
                                                    onClick={close}
                                                    className="notch-module group"
                                                >
                                                    <span
                                                        className="notch-bracket-tr"
                                                        aria-hidden="true"
                                                    />
                                                    <span
                                                        className="notch-bracket-bl"
                                                        aria-hidden="true"
                                                    />
                                                    <ModuleLauncherIcon
                                                        name={item.id}
                                                        className="size-10 shrink-0 transition-transform duration-200 ease-out group-hover:-translate-y-0.5 sm:size-11"
                                                    />
                                                    <span className="notch-module-label">
                                                        {item.title}
                                                    </span>
                                                </Link>
                                            </motion.div>
                                        );
                                    })}
                                </motion.nav>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
