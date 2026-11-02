import { useState } from "react";
import { Check, X } from "lucide-react";
import ChipSelect from "@/shared/components/ChipSelect";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import type { FrutaCatalogo } from "@/modules/providers/providerCatalogo";
import type { CultivoFinca } from "@/modules/providers/providerFinca.utils";
import { updateFruitVarieties } from "@/modules/providers/fruitVarietyPicker.utils";

interface FruitVarietyPickerProps {
    fruits: FrutaCatalogo[];
    value: CultivoFinca[];
    onChange: (next: CultivoFinca[]) => void;
    disabled?: boolean;
    single?: boolean;
    invalid?: boolean;
    /** Ayuda bajo el título de variedades; cambia según quién las tiene (la finca, el proveedor) */
    varietiesHint?: string;
}

/**
 * Elige uno o varios cultivos y las variedades de cada uno, en dos columnas: las frutas del catálogo a la
 * izquierda (un clic muestra sus variedades; la X quita una fruta ya seleccionada) y, a la derecha, las variedades
 * de la fruta activa. Una fruta solo queda seleccionada mientras tenga al menos una variedad.
 */
export default function FruitVarietyPicker({ fruits, value, onChange, disabled, single, invalid, varietiesHint = "Marca las que tiene esta finca" }: FruitVarietyPickerProps) {
    const [activeName, setActiveName] = useState<string>("");

    // La fruta activa es la que se está explorando, aunque aún no tenga variedades seleccionadas.
    const active = fruits.find((fruit) => fruit.nombre === activeName)
        ?? fruits.find((fruit) => value.some((item) => item.fruta === fruit.nombre))
        ?? null;
    const activeValue = active ? value.find((item) => item.fruta === active.nombre) : undefined;
    const activeVarieties = activeValue?.variedades ?? [];
    const allSelected = active !== null && active.variedades.length > 0 && activeVarieties.length === active.variedades.length;

    const select = (fruit: FrutaCatalogo) => setActiveName(fruit.nombre);

    const remove = (name: string) => onChange(value.filter((item) => item.fruta !== name));

    const setVarieties = (name: string, varieties: string[]) =>
        onChange(updateFruitVarieties(value, name, varieties, Boolean(single)));

    return (
        <div
            className={cn(
                "grid min-h-44 grid-cols-1 overflow-hidden rounded-lg border bg-card sm:grid-cols-12",
                invalid ? "border-destructive" : "border-border/80",
            )}
        >
            <div role="group" aria-label="Cultivos del catálogo" className="flex flex-col gap-1.5 border-b border-border/70 bg-surface-page/30 p-2.5 sm:col-span-5 sm:border-b-0 sm:border-r">
                <span className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-ink-muted">Cultivos</span>
                {fruits.map((fruit) => {
                    const added = value.find((item) => item.fruta === fruit.nombre && item.variedades.length > 0);
                    const isActive = active?.nombre === fruit.nombre;
                    return (
                        <div
                            key={fruit.id}
                            className={cn(
                                "flex items-center gap-1 rounded-md border pr-1 transition-colors",
                                isActive ? added ? "border-brand/50 bg-card shadow-xs" : "border-border bg-card shadow-xs" : "border-transparent hover:border-border/60 hover:bg-card/70",
                            )}
                        >
                            <button
                                type="button"
                                aria-pressed={Boolean(added)}
                                disabled={disabled}
                                onClick={() => select(fruit)}
                                className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-50"
                            >
                                <span className={cn("truncate text-[13px]", added ? "font-bold text-ink" : "font-medium text-ink-body", isActive && added && "text-brand")}>
                                    {fruit.nombre}
                                </span>
                                {added ? (
                                    <Badge variant="brand" className="h-4.5 shrink-0 gap-1 px-1.5 text-[10.5px] font-semibold">
                                        <Check size={11} strokeWidth={3} aria-hidden="true" />
                                        {added.variedades.length} de {fruit.variedades.length}
                                    </Badge>
                                ) : (
                                    <span className="shrink-0 text-[11px] text-ink-muted">Elegir variedades</span>
                                )}
                            </button>
                            {added && (
                                <button
                                    type="button"
                                    aria-label={`Quitar ${fruit.nombre}`}
                                    disabled={disabled}
                                    onClick={() => remove(fruit.nombre)}
                                    className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-muted outline-none transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-destructive/40"
                                >
                                    <X size={14} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-col gap-3 p-4 sm:col-span-7">
                {active ? (
                    <>
                        <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-2">
                            <div>
                                <h4 className="text-[13.5px] font-bold text-ink">Variedades de {active.nombre}</h4>
                                <p className="text-[11.5px] text-ink-muted">{varietiesHint}</p>
                            </div>
                            {!single && <Button
                                type="button"
                                variant="link"
                                size="sm"
                                disabled={disabled}
                                onClick={() => setVarieties(active.nombre, allSelected ? [] : [...active.variedades])}
                                className="h-auto p-0 text-[11.5px] font-semibold text-brand hover:underline"
                            >
                                {allSelected ? "Quitar todas" : "Marcar todas"}
                            </Button>}
                        </div>
                        <ChipSelect
                            ariaLabel={`Variedades de ${active.nombre}`}
                            options={active.variedades.map((variedad) => ({ value: variedad, label: variedad }))}
                            value={activeVarieties}
                            onChange={(next) => setVarieties(active.nombre, next)}
                            disabled={disabled}
                            className="max-h-none border-0 p-0"
                        />
                    </>
                ) : (
                    <div className="flex h-full min-h-24 items-center justify-center text-center text-xs italic text-ink-muted">
                        Elige un cultivo de la lista para marcar sus variedades
                    </div>
                )}
            </div>
        </div>
    );
}
