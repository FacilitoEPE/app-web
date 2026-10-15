import { useState, type ReactNode } from "react";
import { Search, UserRound } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { TableEmptyState } from "@/shared/components/TableCard";

interface DirectoryRow {
    id: string | number;
    name: string;
    category: string;
    search: string;
    cells: ReactNode[];
}

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function CampaignDirectoryTable({ rows, columns, label }: { rows: DirectoryRow[]; columns: string[]; label: string }) {
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("");
    const [order, setOrder] = useState("");
    const filtered = rows.filter(row => (!category || row.category === category) && normalize(`${row.name} ${row.category} ${row.search}`).includes(normalize(query.trim())));
    if (order) filtered.sort((a, b) => order === "asc" ? a.name.localeCompare(b.name, "es") : b.name.localeCompare(a.name, "es"));
    const selectClass = "h-9 min-w-0 rounded-lg border border-border bg-card px-2 text-[11px] text-ink focus-visible:outline-2 focus-visible:outline-brand";
    return (
        <>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_165px_140px]">
                <div className="relative col-span-2 sm:col-span-1"><Search size={14} className="absolute left-3 top-2.5" aria-hidden="true" /><Input aria-label={`Buscar ${label}`} placeholder={`Buscar ${label}…`} value={query} onChange={event => setQuery(event.target.value)} className="h-9 pl-9 text-xs" /></div>
                <select aria-label="Filtrar por categoría" value={category} onChange={event => setCategory(event.target.value)} className={selectClass}><option value="">Todas las categorías</option>{[...new Set(rows.map(row => row.category))].map(value => <option key={value}>{value}</option>)}</select>
                <select aria-label="Ordenar listado" value={order} onChange={event => setOrder(event.target.value)} className={selectClass}><option value="">Orden original</option><option value="asc">Nombre: A–Z</option><option value="desc">Nombre: Z–A</option></select>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-155 text-left text-xs">
                    <caption className="sr-only">{label} vinculados a la campaña</caption>
                    <thead className="border-y border-border/60 bg-muted/50 text-[9px] uppercase"><tr>{columns.map(column => <th key={column} scope="col" className="px-2 py-3 font-semibold">{column}</th>)}</tr></thead>
                    <tbody>{filtered.map(row => <tr key={row.id} className="border-b border-border/60 transition-colors hover:bg-brand-surface/40 motion-reduce:transition-none">{row.cells.map((cell, index) => <td key={columns[index]} className="px-2 py-4 align-middle">{cell}</td>)}</tr>)}</tbody>
                </table>
            </div>
            {!filtered.length && (
                <TableEmptyState
                    icon={<Search size={28} strokeWidth={2} />}
                    title="Sin resultados"
                    description="No se encontraron resultados. Prueba otra búsqueda o categoría."
                />
            )}
            <p className="mt-5 text-[11px]" role="status">Mostrando {filtered.length} de {rows.length} {label}</p>
        </>
    );
}

export function DirectoryIdentity({ name, subtitle, index }: { name: string; subtitle: string; index: number }) {
    // Tonos que se alternan por fila, todos del tema (cambian solos en modo oscuro)
    const tones = ["bg-brand-surface text-brand", "bg-status-highlight-surface text-status-highlight", "bg-status-neutral-surface text-status-neutral", "bg-muted text-ink-body"];
    return <div className="flex items-center gap-3"><span aria-hidden="true" className={`flex size-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${tones[index % tones.length]}`}>{name.charAt(0)}</span><div><p className="font-bold text-ink">{name}</p><p className="mt-1 text-[11px]">{subtitle}</p></div></div>;
}

export function DirectoryContact({ name, value, href }: { name: string; value: string; href: string }) {
    return <div><p className="flex items-center gap-2 font-semibold text-ink"><UserRound size={13} aria-hidden="true" />{name}</p><a href={href} className="mt-1 block rounded text-[11px] underline-offset-4 hover:text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand">{value}</a></div>;
}
