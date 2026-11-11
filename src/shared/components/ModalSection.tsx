import RequiredMark from "@/shared/components/RequiredMark";
import type { ReactNode } from "react";

interface ModalSectionProps {
    title: string;
    required?: boolean;
    /** Extra al final de la línea: un contador, "Opcional", los formatos permitidos o una acción chica */
    aside?: ReactNode;
    children: ReactNode;
}

/**
 * Subtítulo de sección dentro del cuerpo de un modal: texto en mayúsculas + línea verde que se apaga
 * hacia la derecha y remata en tres trazos cada vez más cortos, como si se deshiciera. Es el único
 * subtítulo de los modales: el ícono y el peso fuerte quedan solo en la cabecera de AppModal.
 */
export default function ModalSection({ title, required, aside, children }: ModalSectionProps) {
    return (
        <section className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <h3 className="shrink-0 text-[11.5px] font-bold uppercase tracking-[0.12em] text-brand">{title}{required && <> <RequiredMark /></>}</h3>
                <div aria-hidden className="flex min-w-6 flex-1 items-center gap-1.5">
                    {/* Bordes y no fondos: el navegador ajusta los bordes al píxel, así todas las líneas se ven del mismo grosor aunque caigan en posiciones fraccionarias */}
                    <div className="flex-1 border-t-2 [border-image:linear-gradient(to_right,color-mix(in_oklab,var(--brand)_70%,transparent),color-mix(in_oklab,var(--brand)_15%,transparent))_1]" />
                    <div className="flex items-center gap-1">
                        <div className="w-3 border-t-2 border-brand/15" />
                        <div className="w-2 border-t-2 border-brand/15" />
                        <div className="w-1 border-t-2 border-brand/15" />
                    </div>
                </div>
                {aside && <div className="shrink-0 text-[12px] font-medium text-ink-muted">{aside}</div>}
            </div>
            {children}
        </section>
    );
}
