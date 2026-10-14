import type { ComponentType, ReactNode } from "react";
import { CalendarDays, Eraser, Search, SlidersHorizontal, X } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import Hint from "@/shared/components/Hint";
import { BRAND_ACTIVE_SURFACE } from "@/shared/styles/brandGradients";
import { cn } from "@/lib/utils";

interface FilterBarProps {
    /** Los campos del filtro: cada vista compone los que necesite (FilterSearch, FilterDateField, FilterSelectField...) */
    children: ReactNode;
    onClear?: () => void;
    /** Deshabilita "Limpiar" cuando no hay nada aplicado, sin ocultarlo para que la fila no salte */
    canClear?: boolean;
    className?: string;
}

/**
 * Marco fijo de los filtros: título, separador y "Limpiar". Los campos de adentro los decide cada vista.
 * En pantallas chicas el título y "Limpiar" comparten la primera línea y los campos bajan debajo.
 * Todos los controles miden h-14; el padding del card (p-3) compensa para que la barra siga en 80px.
 */
export default function FilterBar({ children, onClear, canClear = true, className }: FilterBarProps) {
    return (
        <Card className={cn("rounded-2xl border-border shadow-card", className)}>
            <CardContent className="flex flex-wrap items-center gap-3 p-3 lg:flex-nowrap">
                <div className="flex shrink-0 items-center gap-3">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-surface" style={{ color: "var(--brand-gradient-mid)" }}>
                        <SlidersHorizontal size={20} strokeWidth={2.5} />
                    </span>
                    <span className="text-[14.5px] font-bold text-ink">Filtros</span>
                    {/* Separa el título de los controles cuando todo va en una sola fila */}
                    <span aria-hidden className="hidden h-8 w-px bg-border lg:block" />
                </div>

                {/*
                    Flex con wrap (no grid): cada campo decide su ancho base y, si le queda espacio libre en su fila,
                    crece. Así un campo que queda solo en la última fila ocupa todo el ancho sin importar cuántos haya.
                */}
                <div className="order-last flex w-full flex-wrap gap-3 lg:order-0 lg:w-auto lg:min-w-0 lg:flex-1">
                    {children}
                </div>

                {onClear && (
                    <Button
                        variant="outline"
                        onClick={onClear}
                        disabled={!canClear}
                        // Con algo aplicado toma el mismo verde activo del selector segmentado, invitando a limpiar
                        style={canClear ? BRAND_ACTIVE_SURFACE : undefined}
                        className={cn(
                            "ml-auto h-14 gap-2 rounded-xl px-5 text-[14px] font-semibold shadow-none transition-[color,filter] active:scale-95 lg:ml-0",
                            canClear
                                ? "border-transparent text-white hover:bg-transparent hover:text-white hover:brightness-105"
                                : "border-border text-ink-muted"
                        )}
                    >
                        <Eraser size={17} strokeWidth={2.5} />
                        Limpiar
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

/** Recuadro común de los campos con etiqueta adentro (fecha, select): borde verde cuando tienen valor */
function fieldShellClass(hasValue: boolean) {
    return cn(
        "relative flex h-14 min-w-0 rounded-xl border bg-card transition-colors focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/30",
        // En móvil van de a dos por fila y crecen si quedan solos; desde sm vuelven a su ancho propio
        "grow basis-[calc(50%-0.375rem)] sm:grow-0 sm:basis-auto sm:shrink-0",
        hasValue ? "border-brand/60" : "border-border hover:border-brand-border"
    );
}

interface FilterSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

/** Buscador: toma el espacio libre de la fila; si no le alcanza (menos de 14rem), los demás campos bajan de línea */
export function FilterSearch({ value, onChange, placeholder = "Buscar..." }: FilterSearchProps) {
    return (
        <div className="relative min-w-0 basis-full sm:min-w-56 sm:flex-1 sm:basis-auto">
            <Search
                className={cn("pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 transition-colors", value ? "text-brand" : "text-muted-foreground")}
                size={19}
                strokeWidth={2}
            />
            <Input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className={cn(
                    "h-14 rounded-xl bg-card pl-11 pr-12 text-[14.5px] shadow-none transition-colors placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/30",
                    value ? "border-brand/60" : "border-border"
                )}
            />
            {value && (
                <Hint label="Borrar búsqueda">
                    <button
                        type="button"
                        onClick={() => onChange("")}
                        aria-label="Borrar búsqueda"
                        className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-brand transition-colors hover:bg-brand-surface active:scale-95"
                    >
                        <X size={17} strokeWidth={2.5} />
                    </button>
                </Hint>
            )}
        </div>
    );
}

interface FilterDateFieldProps {
    label: string;
    value?: string;
    onChange?: (value: string) => void;
}

/**
 * Fecha con la etiqueta dentro del recuadro (solo para barras de filtro; en formularios la etiqueta va afuera).
 * El DatePicker es el propio recuadro, así cualquier clic abre el calendario.
 */
export function FilterDateField({ label, value, onChange }: FilterDateFieldProps) {
    return (
        // min-w-38 = ancho de "dd/mm/aaaa": evita que el campo crezca al elegir fecha y empuje al buscador
        <div className={cn(fieldShellClass(Boolean(value)), "sm:min-w-38")}>
            <CalendarDays
                className={cn("pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 transition-colors", value ? "text-brand" : "text-ink-muted")}
                size={19}
                strokeWidth={2}
            />
            <span className="pointer-events-none absolute left-11 top-2.5 text-[11.5px] font-semibold leading-none text-ink-muted">{label}</span>
            <DatePicker
                value={value}
                onChange={onChange}
                placeholder="--/--/----"
                className="h-full w-full items-end rounded-xl border-0 bg-transparent pb-2.5 pl-11 pr-5 text-[14px] font-semibold text-ink-body hover:bg-transparent aria-expanded:bg-transparent focus-visible:border-0 focus-visible:ring-0 sm:w-auto [&>svg]:hidden"
            />
        </div>
    );
}

export interface FilterSelectOption {
    value: string;
    label: string;
}

interface FilterSelectFieldProps {
    label: string;
    options: readonly FilterSelectOption[];
    /** Cadena vacía = sin filtrar por este campo */
    value: string;
    onChange: (value: string) => void;
    /** Texto de la primera opción, la que quita el filtro de este campo */
    allLabel?: string;
    icon?: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

/**
 * Select con la etiqueta dentro del recuadro, con el mismo look que FilterDateField.
 * Siempre trae primero la opción "Todos", para quitar el filtro de este campo sin borrar los demás.
 * Ancho fijo desde sm para que no salte al elegir una opción más larga.
 */
export function FilterSelectField({ label, options, value, onChange, allLabel = "Todos", icon: Icon }: FilterSelectFieldProps) {
    const hasValue = value !== "";
    // base-ui trata `null` como "sin selección"; hacia afuera el componente habla solo con strings
    const items = [{ value: null, label: allLabel }, ...options];

    return (
        <div className={cn(fieldShellClass(hasValue), "sm:w-44")}>
            {Icon && (
                <Icon
                    className={cn("pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 transition-colors", hasValue ? "text-brand" : "text-ink-muted")}
                    size={19}
                    strokeWidth={2}
                />
            )}
            <span className={cn("pointer-events-none absolute top-2.5 text-[11.5px] font-semibold leading-none", Icon ? "left-11" : "left-4")}>
                {label}
            </span>
            {/* `items` hace que el recuadro muestre la etiqueta de la opción y no su valor crudo */}
            <Select items={items} value={hasValue ? value : null} onValueChange={(next) => onChange((next as string | null) ?? "")}>
                <SelectTrigger
                    // La etiqueta visible es decorativa (pointer-events-none), así que el nombre accesible va acá
                    aria-label={label}
                    className={cn(
                        "h-full w-full items-end rounded-xl border-0 bg-transparent pb-2.5 pr-3 text-[14px] font-semibold shadow-none data-[size=default]:h-full focus-visible:border-0 focus-visible:ring-0 [&>svg]:self-center",
                        hasValue ? "text-ink-body" : "",
                        Icon ? "pl-11" : "pl-4"
                    )}
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {items.map((option) => (
                        <SelectItem
                            key={option.value ?? "__all"}
                            value={option.value}
                            className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-body focus:bg-brand-surface focus:text-brand"
                        >
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
