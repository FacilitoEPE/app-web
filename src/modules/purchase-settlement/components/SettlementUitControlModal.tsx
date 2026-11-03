import { useMemo, useState } from 'react';
import { Scale, X } from 'lucide-react';
import AppModal from '@/shared/components/AppModal';
import InputField from '@/shared/components/InputField';
import ModalSection from '@/shared/components/ModalSection';
import StatusBadge from '@/shared/components/StatusBadge';
import { SummaryBar } from '@/shared/components/InfoField';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { formatMoney } from '@/shared/utils/format';
import { USD_A_SOLES_UIT } from '@/modules/purchase-settlement/settlementUit.utils';
import { getUitParameters, getUitYears, type SettlementLoad } from '@/modules/purchase-settlement/purchaseSettlement.models';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    loads: SettlementLoad[];
}

const soles = (amount: number) => `S/ ${formatMoney(amount)}`;

export default function SettlementUitControlModal({ open, onOpenChange, loads }: Props) {
    const years = getUitYears();
    const [requestedYear, setYear] = useState(() => years.includes(new Date().getFullYear()) ? new Date().getFullYear() : years[0] ?? new Date().getFullYear());
    const [search, setSearch] = useState('');
    const year = years.includes(requestedYear) ? requestedYear : years[0] ?? requestedYear;
    const parameters = getUitParameters(year);
    const limit = (parameters?.value ?? 0) * (parameters?.limit ?? 0);
    const rows = useMemo(() => {
        const persons = new Map<string, { id: string; name: string; document: string; provider: string; vinculo: string; accumulated: number }>();
        for (const load of loads) for (const provider of load.proveedores) for (const person of provider.personasVinculadas) {
            const key = `${person.tipoDocumento}:${person.numeroDocumento}`;
            const accumulated = person.acumuladosPorAnio?.[String(year)] ?? 0;
            const existing = persons.get(key);
            if (existing) existing.accumulated = Math.max(existing.accumulated, accumulated);
            else persons.set(key, {
                id: key, name: `${person.nombres} ${person.apellidos}`,
                document: `${person.tipoDocumento} ${person.numeroDocumento}`,
                provider: provider.proveedorNombre, vinculo: person.vinculo, accumulated,
            });
        }
        const query = search.trim().toLocaleLowerCase('es-PE');
        return [...persons.values()].filter(row => `${row.name} ${row.document} ${row.provider}`.toLocaleLowerCase('es-PE').includes(query));
    }, [loads, search, year]);

    return <AppModal open={open} onOpenChange={onOpenChange} icon={<Scale size={22} />} title="Control UIT por persona" description="Consulta el acumulado anual de las liquidaciones registradas en este sistema." size="2xl" footer={<Button variant="outline" size="xl" onClick={() => onOpenChange(false)}><X size={18} /> Cerrar</Button>}>
        <div className="space-y-6">
            <SummaryBar items={[
                { label: `Valor UIT ${year}`, value: parameters ? soles(parameters.value) : 'Sin configurar' },
                { label: 'Límite anual', value: parameters ? `${parameters.limit} UIT · ${soles(limit)}` : 'Sin configurar', tone: 'brand' },
                { label: 'Cambio referencial V1', value: `S/ ${USD_A_SOLES_UIT.toFixed(2)} / USD`, tone: 'highlight' },
            ]} />
            <ModalSection title="Consulta de personas y año calendario">
                <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
                    <div><p className="mb-2 text-sm font-semibold text-ink">Año calendario</p><Select items={years.map(value => ({ value: String(value), label: String(value) }))} value={String(year)} onValueChange={value => value && setYear(Number(value))}><SelectTrigger aria-label="Año calendario" className="h-11 rounded-lg bg-card"><SelectValue /></SelectTrigger><SelectContent>{years.map(value => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}</SelectContent></Select></div>
                    <InputField id="uit-search" label="Buscar proveedor o persona" placeholder="Nombre o documento…" value={search} onChange={setSearch} />
                </div>
            </ModalSection>
            <ModalSection title="Acumulado anual por persona" aside={`${rows.length} persona(s)`}>
                {!parameters && <p role="status" className="text-sm text-ink-muted">No hay un valor UIT configurado para {year}.</p>}
                <div className="space-y-3">
                    {rows.map(row => {
                        const percentage = limit > 0 ? row.accumulated / limit * 100 : 0;
                        const status = limit <= 0 ? 'Sin parámetro' : percentage >= 100 ? 'Límite alcanzado' : percentage >= 90 ? 'Cerca del límite' : 'Dentro del límite';
                        return <div key={row.id} className="rounded-2xl border border-border bg-surface-page/50 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold text-ink">{row.name}</p><p className="text-xs text-ink-muted">{row.document} · {row.provider} · {row.vinculo}</p></div><StatusBadge status={status} /></div>
                            <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs font-semibold"><span>Acumulado: {soles(row.accumulated)}</span><span>Disponible: {parameters ? soles(Math.max(0, limit - row.accumulated)) : '—'}</span></div>
                            {parameters && <Progress value={Math.min(100, percentage)} className="mt-2 h-2.5" />}
                        </div>;
                    })}
                    {!rows.length && <p className="text-sm text-ink-muted">No hay personas que coincidan con la búsqueda.</p>}
                </div>
            </ModalSection>
            <p className="text-xs text-ink-muted">El control considera las compras registradas en este sistema. No consulta las operaciones del proveedor con terceros ni sustituye la verificación tributaria.</p>
        </div>
    </AppModal>;
}
