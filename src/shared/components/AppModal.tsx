import { useLayoutEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { brandShade } from "@/shared/styles/brandGradients";
import { ModalActionContext, useModalActionController } from '@/shared/hooks/modal-action';
import FormField from '@/shared/components/FormField';

/**
 * Anchos de modal en escritorio. Se elige por cuánto contenido lleva, no a ojo por modal:
 * - `sm` (520px): una acción puntual con 1–3 campos (adjuntar recibo, registrar un pago, ampliar kilos).
 * - `md` (640px): un registro corto a 2 columnas (cliente, chofer, certificado del proveedor).
 * - `lg` (720px): un registro a 3 columnas (transportista, vehículo, examen, entrega).
 * - `xl` (800px): un registro largo o con relaciones (campaña, proveedor, finca, certificación, contrato).
 * - `2xl` (900px): formularios con bloques independientes lado a lado (entrevista, vínculo de cliente).
 */
export type AppModalSize = "sm" | "md" | "lg" | "xl" | "2xl";

const SIZE_CLASS: Record<AppModalSize, string> = {
    sm: "sm:max-w-130",
    md: "sm:max-w-160",
    lg: "sm:max-w-180",
    xl: "sm:max-w-200",
    "2xl": "sm:max-w-225",
};

interface AppModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOpenChangeComplete?: (open: boolean) => void;
    title: string;
    description?: string;
    /** Ícono en un círculo a la izquierda del título. Todos los modales llevan uno: identifica qué se está gestionando. */
    icon: ReactNode;
    children: ReactNode;
    /** Botones de acción, siempre abajo a la derecha (a la izquierda en móvil, apilados). Omitir si el modal no tiene acciones. */
    footer?: ReactNode;
    /** Ancho en escritorio; ver `AppModalSize` */
    size?: AppModalSize;
    /**
     * Mientras guarda: el modal no se cierra (ni con la X, ni con Escape, ni tocando afuera), así no se pierde
     * de vista una petición en curso ni su posible error.
     */
    busy?: boolean;
    className?: string;
}

function AnimatedModalBody({ children, ready = true }: { children: ReactNode; ready?: boolean }) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        const content = contentRef.current;
        if (!viewport || !content || typeof ResizeObserver === "undefined") return;

        let animationFrame = 0;
        let initialized = false;

        const updateHeight = () => {
            cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(() => {
                const nextHeight = content.scrollHeight;

                if (!initialized) {
                    viewport.style.height = `${nextHeight}px`;
                    
                    if (ready) {
                        initialized = true;
                        
                        // Permitir que el navegador pinte el tamaño inicial y luego agregar las clases de transición.
                        // Esto evita el bug donde el modal aparece pequeño y crece lentamente al abrirse.
                        requestAnimationFrame(() => {
                            viewport.classList.add("transition-[height]", "duration-300", "ease-out");
                        });
                    }
                    return;
                }

                // Start from the currently rendered height so interrupted transitions stay fluid.
                const currentHeight = viewport.getBoundingClientRect().height;

                if (Math.abs(currentHeight - nextHeight) < 0.5) {
                    viewport.style.height = `${nextHeight}px`;
                    return;
                }

                if (getComputedStyle(viewport).transitionDuration === "0s") {
                    viewport.style.height = `${nextHeight}px`;
                    return;
                }

                viewport.style.height = `${currentHeight}px`;
                viewport.getBoundingClientRect();

                animationFrame = requestAnimationFrame(() => {
                    viewport.style.height = `${nextHeight}px`;
                });
            });
        };

        const observer = new ResizeObserver(updateHeight);
        observer.observe(content);
        updateHeight();

        return () => {
            observer.disconnect();
            cancelAnimationFrame(animationFrame);
        };
    }, [ready]);

    return (
        <div
            ref={viewportRef}
            className="min-h-0 flex-initial overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden will-change-[height] motion-reduce:transition-none motion-reduce:will-change-auto"
        >
            <div ref={contentRef} className="px-5 pb-6 sm:px-6">
                {children}
            </div>
        </div>
    );
}

/** Shared shell only: each module owns its content; the footer (if any) always sits bottom-right, pinned outside the scroll area. */
export default function AppModal({ open, onOpenChange, onOpenChangeComplete, title, description, icon, children, footer, size = "md", busy = false, className, ready = true }: AppModalProps & { ready?: boolean }) {
    const action = useModalActionController(open);
    busy = busy || action.pending;
    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen && busy) return;
        onOpenChange(nextOpen);
    };

    return (
        <ModalActionContext value={{pending:busy,run:action.run}}>
        <Dialog open={open} onOpenChange={handleOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
            <DialogContent
                showCloseButton={false}
                aria-busy={busy || undefined}
                className={cn("flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-3xl border border-brand-border/50 bg-card p-0 motion-reduce:animate-none", SIZE_CLASS[size], className)}
                style={{ 
                    boxShadow: `0 20px 40px -10px ${brandShade("+ 0.08", "1.3", "0.15")}, 0 0 30px -5px ${brandShade("+ 0.1", "1.3", "0.1")}`
                }}
            >
                <DialogHeader className="relative shrink-0 gap-1 px-5 pb-4 pt-6 pr-14 sm:px-6 sm:pr-16">
                    <div className="flex min-w-0 items-center gap-4">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-brand-border bg-brand-surface" style={{ color: "var(--brand-gradient-mid)" }}>
                            {icon}
                        </span>
                        <div className="flex min-w-0 flex-col gap-1">
                            <DialogTitle className="relative w-fit bg-clip-text text-xl font-bold leading-snug tracking-tight text-transparent forced-colors:text-ink" style={{ backgroundImage: "var(--brand-gradient)" }}>{title}</DialogTitle>
                            {description && <DialogDescription className="relative text-xs leading-relaxed text-ink-body">{description}</DialogDescription>}
                        </div>
                    </div>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        <DialogClose render={<Button variant="ghost" size="icon" disabled={busy} />} className="rounded-full hover:bg-brand-surface hover:text-brand active:translate-y-0" aria-label="Cerrar">
                            <X size={18} className="transition-transform duration-200 ease-out group-hover/button:rotate-90 group-hover/button:scale-110 group-active/button:scale-90 motion-reduce:transition-none motion-reduce:transform-none" />
                        </DialogClose>
                    </span>
                </DialogHeader>
                <AnimatedModalBody ready={ready}>{children}{action.error && <FormField error={action.error} className="mt-4" />}</AnimatedModalBody>
                {footer && (
                    <div className="flex shrink-0 flex-col-reverse gap-3 px-5 py-4 sm:flex-row sm:justify-end sm:px-6 [&>button]:w-full sm:[&>button]:w-auto">
                        {footer}
                    </div>
                )}
            </DialogContent>
        </Dialog>
        </ModalActionContext>
    );
}
