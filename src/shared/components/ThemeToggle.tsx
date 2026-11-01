import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";
import Hint from "@/shared/components/Hint";
import { useTheme, type Theme } from "@/shared/hooks/useTheme";
import { BRAND_ACTIVE_SURFACE } from "@/shared/styles/brandGradients";
import { cn } from "@/lib/utils";

/**
 * Interruptor claro/oscuro del header: una píldora con sol y luna donde la perilla de marca se desliza
 * hacia el tema activo. Al cambiar, el tema nuevo se revela en un círculo que nace del propio botón
 * (View Transitions API); si el navegador no la soporta o se pidió menos movimiento, cambia directo.
 */
export default function ThemeToggle({ className }: { className?: string }) {
    const { theme, setTheme } = useTheme();
    const isDark = theme === "dark";
    const label = isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";

    const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
        const next: Theme = isDark ? "light" : "dark";
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!document.startViewTransition || reduceMotion) {
            setTheme(next);
            return;
        }

        // El círculo arranca en el centro del botón y crece hasta cubrir la esquina más lejana
        const rect = event.currentTarget.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        const root = document.documentElement.style;
        root.setProperty("--theme-x", `${x}px`);
        root.setProperty("--theme-y", `${y}px`);
        root.setProperty("--theme-r", `${radius}px`);

        document.documentElement.dataset.themeTransition = '';
        const transition = document.startViewTransition(() => flushSync(() => setTheme(next)));
        void transition.finished.catch(() => undefined).finally(() => {
            delete document.documentElement.dataset.themeTransition;
        });
    };

    return (
        <Hint label={label} side="bottom">
            <button
                type="button"
                role="switch"
                aria-checked={isDark}
                aria-label={label}
                onClick={toggle}
                className={cn(
                    "group relative inline-flex h-8 w-15 shrink-0 items-center rounded-full border border-border bg-muted p-0.5 transition-colors duration-300 outline-none hover:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand/40 active:scale-95",
                    className
                )}
            >
                {/* Íconos del riel: el del tema inactivo queda tenue del lado opuesto a la perilla */}
                <Sun size={14} strokeWidth={2.5} aria-hidden className={cn("absolute left-2 text-ink-muted transition-opacity duration-300", isDark ? "opacity-70" : "opacity-0")} />
                <Moon size={14} strokeWidth={2.5} aria-hidden className={cn("absolute right-2 text-ink-muted transition-opacity duration-300", isDark ? "opacity-0" : "opacity-70")} />

                {/* Perilla con el degradado de marca y el ícono del tema activo */}
                <span
                    aria-hidden
                    className={cn(
                        "relative flex size-6.5 items-center justify-center rounded-full border border-transparent text-white transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                        isDark ? "translate-x-7" : "translate-x-0"
                    )}
                    style={BRAND_ACTIVE_SURFACE}
                >
                    <Sun size={14} strokeWidth={2.5} className={cn("absolute transition-all duration-500", isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100")} />
                    <Moon size={14} strokeWidth={2.5} className={cn("absolute transition-all duration-500", isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0")} />
                </span>
            </button>
        </Hint>
    );
}
