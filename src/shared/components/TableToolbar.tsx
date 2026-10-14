import type { ReactNode } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, LayoutGrid, List } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { plural } from "@/shared/utils/plural";
import { exportCsv, exportPdf, type TableExport } from "@/shared/utils/exportTable";

/**
 * Fila de controles a la derecha del título de una tabla (TableCard `headerRight`).
 * Cada tabla arma la suya combinando las piezas de este archivo que necesite: un contador,
 * a veces exportar, a veces el toggle de vista. Ninguna pieza es obligatoria.
 */
export function TableToolbar({ children }: { children: ReactNode }) {
    return <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">{children}</div>;
}

interface TableCountTextProps {
    visible: number;
    total: number;
    /** Sustantivo en plural, ej. "clientes", "proveedores" */
    label: string;
}

/** Contador de texto simple "Mostrando X de Y <label>": el que usa la mayoría de las tablas */
export function TableCountText({ visible, total, label }: TableCountTextProps) {
    return (
        <div className="text-[13px] text-muted-foreground font-medium">
            Mostrando <span className="font-bold">{visible}</span> de <span className="font-bold">{total}</span> {label}
        </div>
    );
}

interface TableCountPillProps {
    icon: ReactNode;
    count: number;
    /** Sustantivo en singular, ej. "campaña" */
    singular: string;
    /** Sustantivo en plural, ej. "campañas"; se usa con 0 y con más de 1 */
    plural: string;
}

/** Píldora de conteo con ícono; para tablas que quieren un contador más destacado que TableCountText */
export function TableCountPill({ icon, count, singular, plural: pluralLabel }: TableCountPillProps) {
    return (
        <div className="flex h-14 items-center gap-2 px-4 rounded-xl bg-brand-surface border border-brand-border">
            {icon}
            <span className="text-[13px] font-bold text-brand-dark">{count} {plural(count, singular, pluralLabel)}</span>
        </div>
    );
}

interface TableExportMenuProps {
    /** Arma lo que se exporta (las filas visibles con los filtros aplicados); se llama al elegir el formato */
    getData: () => TableExport;
}

/**
 * Botón "Exportar": Excel baja un CSV (Excel lo abre directo, con acentos) y PDF abre el diálogo de impresión
 * con la tabla formateada para "Guardar como PDF". Se omite del todo en tablas que no exportan nada.
 */
export function TableExportMenu({ getData }: TableExportMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <button className="inline-flex h-14 items-center gap-2 rounded-xl px-4 border border-border bg-card text-ink-body text-[13px] font-semibold hover:bg-muted hover:text-ink shadow-sm transition-colors active:scale-95" />
                }
            >
                <Download size={16} strokeWidth={2.5} className="text-ink-muted" />
                Exportar
                <ChevronDown size={14} strokeWidth={3} className="text-ink-muted/50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-44 rounded-xl shadow-xl border-border/50 bg-popover p-1.5">
                <DropdownMenuItem onClick={() => exportCsv(getData())} className="gap-2.5 px-3 py-2.5 text-[13px] font-medium text-ink-body rounded-lg cursor-pointer transition-colors">
                    <FileSpreadsheet size={16} className="text-brand" /> Excel (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportPdf(getData())} className="gap-2.5 px-3 py-2.5 text-[13px] font-medium text-ink-body rounded-lg cursor-pointer transition-colors">
                    <FileText size={16} className="text-brand" /> PDF (imprimir)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export type TableViewMode = "table" | "grid";

interface TableViewToggleProps {
    value: TableViewMode;
    onChange: (value: TableViewMode) => void;
}

/** Alterna entre vista de tabla y de tarjetas en grilla. Se omite en tablas que no ofrecen grilla. */
export function TableViewToggle({ value, onChange }: TableViewToggleProps) {
    return (
        <div className="hidden sm:flex h-14 items-center gap-1 rounded-xl border border-border bg-surface-page p-1.5">
            <button
                onClick={() => onChange("table")}
                aria-label="Vista de tabla"
                aria-pressed={value === "table"}
                className={cn("flex h-full w-11 items-center justify-center rounded-lg transition-colors", value === "table" ? "bg-card shadow-sm text-ink font-semibold dark:bg-brand-surface dark:text-brand" : "text-ink-muted hover:text-ink")}
            >
                <List size={18} strokeWidth={2.5} />
            </button>
            <button
                onClick={() => onChange("grid")}
                aria-label="Vista de grilla"
                aria-pressed={value === "grid"}
                className={cn("flex h-full w-11 items-center justify-center rounded-lg transition-colors", value === "grid" ? "bg-card shadow-sm text-ink font-semibold dark:bg-brand-surface dark:text-brand" : "text-ink-muted hover:text-ink")}
            >
                <LayoutGrid size={18} strokeWidth={2.5} />
            </button>
        </div>
    );
}
