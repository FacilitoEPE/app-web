import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChipSelectOption {
    value: string;
    label: string;
    badge?: React.ReactNode;
}

interface ChipSelectProps {
    options: ChipSelectOption[];
    /** Valores seleccionados */
    value: string[];
    onChange: (next: string[]) => void;
    /** Nombre accesible del grupo; el campo suele tener además su etiqueta visible con `FormField` */
    ariaLabel: string;
    /** Mensaje cuando no hay opciones que elegir */
    emptyMessage?: string;
    disabled?: boolean;
    className?: string;
}

/**
 * Selección múltiple con todas las opciones a la vista como píldoras: un clic las marca o las desmarca, sin
 * lista desplegable ni "agregar y listar abajo". Las etiquetas largas se recortan (el nombre completo va en
 * el tooltip) para que una opción no ocupe todo el ancho. Con muchas opciones el grupo hace scroll.
 */
export default function ChipSelect({ options, value, onChange, ariaLabel, emptyMessage = "No hay opciones disponibles.", disabled, className }: ChipSelectProps) {
    if (options.length === 0) {
        return <p className="rounded-lg border border-dashed border-border px-3.5 py-3 text-[13px] text-ink-muted">{emptyMessage}</p>;
    }

    const toggle = (optionValue: string) =>
        onChange(value.includes(optionValue) ? value.filter((item) => item !== optionValue) : [...value, optionValue]);

    return (
        <div role="group" aria-label={ariaLabel} className={cn("flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-lg border border-border p-2.5", className)}>
            {options.map((option) => {
                const selected = value.includes(option.value);
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        disabled={disabled}
                        title={option.label}
                        onClick={() => toggle(option.value)}
                        className={cn(
                            "inline-flex max-w-72 cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold outline-none transition-all focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-50",
                            selected
                                ? "border-brand-border bg-brand-surface text-brand"
                                : "border-border bg-card text-ink-body hover:border-brand/40 hover:bg-brand-surface/40",
                        )}
                    >
                        {selected && <Check size={14} strokeWidth={3} className="shrink-0 text-brand" aria-hidden="true" />}
                        <span className="truncate">{option.label}</span>
                        {option.badge && (
                            <span
                                className={cn(
                                    "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-bold tracking-tight transition-colors",
                                    selected
                                        ? "bg-brand text-white shadow-xs"
                                        : "bg-brand/15 text-brand border border-brand/25 dark:bg-brand/25",
                                )}
                            >
                                {option.badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
