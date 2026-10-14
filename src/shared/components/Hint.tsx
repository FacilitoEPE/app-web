import type { ReactElement } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";

interface HintProps {
    label: string;
    side?: "top" | "bottom" | "left" | "right";
    children: ReactElement;
}

/** Muestra el nombre de un control de solo ícono al pasar el mouse. El hijo debe ser un único elemento interactivo. */
export default function Hint({ label, side = "top", children }: HintProps) {
    return (
        <Tooltip>
            <TooltipTrigger render={children} />
            {/* El primitivo vendorizado pinta la flecha con bg-foreground/fill-foreground;
                al sobreescribir --foreground con el tono intermedio del degradado de marca,
                logramos que la flecha empate visualmente con el fondo gradiente. */}
            <TooltipContent
                side={side}
                className="font-semibold text-white border-0 shadow-glow [background-image:var(--brand-gradient)] [--foreground:var(--brand-gradient-mid)]"
            >
                {label}
            </TooltipContent>
        </Tooltip>
    );
}
