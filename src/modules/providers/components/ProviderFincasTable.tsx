import { useState } from "react";
import { Eye, LandPlot, MapPin, Pencil, Plus, Sprout, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import TableCard from "@/shared/components/TableCard";
import RowActions, { type RowAction } from "@/shared/components/RowActions";
import { TABLE_HEAD_BG, TableRowAccent, TableRowLead } from "@/shared/components/DataTableRow";
import TableGridCard, { TableGridCardField, TableGridCardFields } from "@/shared/components/TableGridCard";
import { TableCountPill, TableToolbar } from "@/shared/components/TableToolbar";
import type { Finca } from "@/modules/providers/providerFinca.utils";
import { formatDecimal } from "@/shared/utils/format";
import { paginate } from "@/shared/utils/paginate";

/** Cuántas frutas o variedades se nombran en la fila; el resto se resume como "+N" y se ve en el detalle */
const VISIBLE_ITEMS = 2;

/** Qué parte de la finca está en cultivo, en porcentaje entero */
const cultivatedShare = (finca: Finca) => (finca.haTotal > 0 ? Math.round((finca.haCultivo / finca.haTotal) * 100) : 0);

const listWithRest = (items: string[]) =>
    `${items.slice(0, VISIBLE_ITEMS).join(", ")}${items.length > VISIBLE_ITEMS ? ` +${items.length - VISIBLE_ITEMS}` : ""}`;

/**
 * Resumen del cultivo para la fila. Con una sola fruta: la fruta y sus variedades. Con varias: las frutas y
 * cuántas variedades suman, porque nombrarlas todas no cabe (el detalle las muestra agrupadas por fruta).
 */
function cultivoSummary(finca: Finca): { title: string; detail: string } | null {
    const cultivos = finca.cultivos ?? [];
    if (cultivos.length === 0) return null;
    const edad = finca.edadCultivo === null || finca.edadCultivo === undefined ? "" : `${formatDecimal(finca.edadCultivo)} ${finca.edadCultivo === 1 ? "año" : "años"}`;
    const totalVarieties = cultivos.reduce((sum, cultivo) => sum + cultivo.variedades.length, 0);
    const variedadesText = cultivos.length === 1
        ? listWithRest(cultivos[0].variedades)
        : `${totalVarieties} ${totalVarieties === 1 ? "variedad" : "variedades"}`;
    return {
        title: listWithRest(cultivos.map((cultivo) => cultivo.fruta)),
        detail: [variedadesText, edad].filter(Boolean).join(" · ") || "Sin variedades",
    };
}

interface ProviderFincasTableProps {
    fincas: Finca[];
    /** Acción del estado vacío: abre el registro de la primera finca */
    onRegister: () => void;
    /** Las acciones reciben la finca y su posición en la lista completa del proveedor */
    onView: (finca: Finca, index: number) => void;
    onEdit: (finca: Finca, index: number) => void;
    onDelete: (finca: Finca, index: number) => void;
}

/**
 * Lista de fincas de un proveedor con la información de un vistazo: qué finca es, qué cultivo tiene, dónde está
 * y cuánta superficie trabaja. Los códigos, las coordenadas y todas las variedades quedan en Ver detalles.
 */
export default function ProviderFincasTable({ fincas, onRegister, onView, onEdit, onDelete }: ProviderFincasTableProps) {
    const [page, setPage] = useState(1);

    const { pageCount, currentPage, offset, visible: visibleData } = paginate(fincas, page);

    const getRowActions = (finca: Finca, index: number): RowAction[] => [
        { label: "Ver detalles", icon: <Eye size={18} strokeWidth={2.5} />, onClick: () => onView(finca, index) },
        { label: "Editar", icon: <Pencil size={18} strokeWidth={2.5} />, onClick: () => onEdit(finca, index) },
        { label: "Eliminar", icon: <Trash2 size={18} strokeWidth={2.5} />, variant: "destructive", onClick: () => onDelete(finca, index) },
    ];

    return (
        <TableCard
            icon={<LandPlot size={24} strokeWidth={2.5} />}
            title="Fincas Registradas"
            description="Fincas de cultivo registradas para este proveedor."
            headerRight={
                <TableToolbar>
                    <TableCountPill icon={<LandPlot size={16} strokeWidth={2.5} className="text-brand" />} count={fincas.length} singular="finca" plural="fincas" />
                </TableToolbar>
            }
            isEmpty={fincas.length === 0}
            emptyIcon={<LandPlot size={28} strokeWidth={2} />}
            emptyTitle="Aún no hay fincas"
            emptyDescription="Este proveedor todavía no tiene fincas registradas. Haz clic en 'Registrar finca' para comenzar."
            emptyAction={{ label: "Registrar finca", icon: <Plus size={18} strokeWidth={2.5} />, onClick: onRegister }}
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
        >
            {/* Móvil en tarjetas; desde sm, tabla */}
            <div className="flex flex-col gap-3 sm:hidden">
                {visibleData.map((finca, position) => {
                    const cultivo = cultivoSummary(finca);
                    return (
                        <TableGridCard
                            key={`${finca.nombre}-${offset + position}`}
                            accentColor="border-l-brand"
                            icon={<LandPlot size={18} strokeWidth={2} />}
                            title={finca.nombre}
                            subtitle={`${finca.distrito} · ${finca.departamento}`}
                            actions={<RowActions primary={getRowActions(finca, offset + position)} />}
                        >
                            <TableGridCardFields>
                                <TableGridCardField label="Cultivo" value={cultivo ? `${cultivo.title} · ${cultivo.detail}` : "—"} />
                                <TableGridCardField label="Superficie" value={`${formatDecimal(finca.haTotal)} ha · ${cultivatedShare(finca)}% en cultivo`} />
                            </TableGridCardFields>
                        </TableGridCard>
                    );
                })}
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
                <Table>
                    <TableHeader className={TABLE_HEAD_BG}>
                        <TableRow className="border-b border-border hover:bg-transparent">
                            <TableHead className="h-14 px-6 font-semibold text-ink">Finca</TableHead>
                            <TableHead className="h-14 font-semibold text-ink">Cultivo</TableHead>
                            <TableHead className="h-14 font-semibold text-ink">Ubicación</TableHead>
                            <TableHead className="h-14 font-semibold text-ink">Superficie</TableHead>
                            <TableHead className="h-14 w-40 px-4 text-center font-semibold text-ink">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visibleData.map((finca, position) => {
                            const index = offset + position;
                            const cultivo = cultivoSummary(finca);
                            return (
                                <TableRow key={`${finca.nombre}-${index}`} className="border-b border-border transition-colors hover:bg-surface-page/60">
                                    <TableCell className="relative h-20 px-6">
                                        <TableRowAccent color="bg-brand" />
                                        <TableRowLead
                                            icon={<LandPlot size={20} strokeWidth={2} />}
                                            title={finca.nombre}
                                            subtitle={finca.codigoSenasa ? `SENASA ${finca.codigoSenasa}` : "Sin código SENASA"}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {cultivo ? (
                                            <div className="flex items-start gap-2">
                                                <Sprout size={16} className="mt-0.5 shrink-0 text-brand" />
                                                <div className="flex flex-col">
                                                    <span className="text-[13.5px] font-bold leading-tight text-ink">{cultivo.title}</span>
                                                    <span className="mt-0.5 text-[12px] font-medium text-ink-muted">{cultivo.detail}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-ink-muted">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-start gap-2">
                                            <MapPin size={16} className="mt-0.5 shrink-0 text-ink-muted" />
                                            <div className="flex flex-col">
                                                <span className="text-[13.5px] font-semibold leading-tight text-ink-body">{finca.distrito}</span>
                                                <span className="mt-0.5 text-[12px] font-medium text-ink-muted">{finca.provincia} · {finca.departamento}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-[13.5px] font-bold leading-tight tabular-nums text-ink">{formatDecimal(finca.haTotal)} ha</span>
                                            <span className="mt-0.5 text-[12px] font-medium tabular-nums text-ink-muted">
                                                {formatDecimal(finca.haCultivo)} ha en cultivo · {cultivatedShare(finca)}%
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4">
                                        <RowActions primary={getRowActions(finca, index)} className="justify-center gap-1" />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </TableCard>
    );
}
