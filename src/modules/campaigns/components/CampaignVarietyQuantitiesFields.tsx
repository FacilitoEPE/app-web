import { Plus, X } from 'lucide-react';
import FormField from '@/shared/components/FormField';
import { InfoField, SummaryBar } from '@/shared/components/InfoField';
import InputField from '@/shared/components/InputField';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { formatKg } from '@/shared/utils/format';
import type { FormFieldErrors } from '@/shared/validation/api-form-errors';
import { sumVarietyKilos, type ContractVarietyOption, type VarietyBalance, type VarietyQuantityRow } from '@/modules/campaigns/campaignVarietyQuantities.utils';

interface Props {
    id: string;
    fruitName: string;
    rows: VarietyQuantityRow[];
    options: ContractVarietyOption[];
    errors: FormFieldErrors;
    totalLabel: 'Total acordado' | 'Total de la entrega';
    varietyBalances?: VarietyBalance[];
    onChange: (rows: VarietyQuantityRow[]) => void;
    disabled?: boolean;
}

/** El mismo desglose comercial para los dos formularios, con los controles del aplicativo. */
export default function CampaignVarietyQuantitiesFields({ id, fruitName, rows, options, errors, totalLabel, varietyBalances, onChange, disabled }: Props) {
    const update = (index: number, field: keyof VarietyQuantityRow, value: string) => {
        onChange(rows.map((row, position) => position === index ? { ...row, [field]: value } : row));
    };

    return (
        <div className="flex min-w-0 flex-col gap-4 sm:col-span-2">
            <InfoField label="Fruta de la campaña" value={fruitName || 'Sin fruta registrada'} />
            {rows.map((row, index) => {
                const selected = options.find(option => option.value === row.frutaDerivadaId);
                const balance = varietyBalances?.find(item => String(item.frutaDerivadaId) === row.frutaDerivadaId);
                const balanceHint = balance ? `Acordado: ${formatKg(balance.kilos)} kg de ${selected?.label ?? 'esta variedad'}` : undefined;
                const quantityError = errors[`variedades.${index}.kilos`] ?? (balance && balance.remaining < 0 ? `Excede el saldo de ${selected?.label ?? 'esta variedad'} en ${formatKg(-balance.remaining)} kg.` : undefined);
                return (
                    <div key={index} className="grid min-w-0 grid-cols-[minmax(0,1fr)_2.75rem] items-start gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_2.75rem]">
                        <FormField id={`${id}-variety-${index}`} label="Variedad" required error={errors[`variedades.${index}.frutaDerivadaId`]} className="col-span-2 min-w-0 sm:col-span-1">
                            <Select items={options} value={row.frutaDerivadaId || null} disabled={disabled} onValueChange={value => update(index, 'frutaDerivadaId', value ?? '')}>
                                <SelectTrigger id={`${id}-variety-${index}`} className="w-full min-w-0" aria-invalid={Boolean(errors[`variedades.${index}.frutaDerivadaId`])}>
                                    <SelectValue placeholder="Seleccionar variedad" />
                                </SelectTrigger>
                                <SelectContent>
                                    {options.map(option => <SelectItem key={option.value} value={option.value} disabled={rows.some((other, position) => position !== index && other.frutaDerivadaId === option.value)}>{option.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </FormField>
                        <InputField id={`${id}-kilos-${index}`} label="Cantidad" required unit="kg" min={0} step="0.001" placeholder="0.00" disabled={disabled || !row.frutaDerivadaId} value={row.kilos} error={quantityError} hint={balanceHint} onChange={value => update(index, 'kilos', value)} className="min-w-0" />
                        <Button type="button" variant="outline" size="icon" disabled={disabled} onClick={() => onChange(rows.filter((_, position) => position !== index))} aria-label={`Quitar ${selected?.label ?? `variedad ${index + 1}`}`} className="mt-7 h-11 w-11 shrink-0"><X size={18} /></Button>
                        {balance && <div className="col-span-2 sm:col-span-3" role="status" aria-label={`Saldo de ${selected?.label ?? 'la variedad'}`} aria-live="polite" aria-atomic="true">
                            <SummaryBar items={[
                                { label: 'Disponible de la variedad', value: <span className="text-xs sm:text-[15px]">{formatKg(balance.available)} kg</span> },
                                { label: 'En esta entrega', value: <span className="text-xs sm:text-[15px]">{formatKg(balance.scheduled)} kg</span>, tone: 'brand' },
                                { label: 'Quedaría de la variedad', value: <span className="text-xs sm:text-[15px]">{formatKg(balance.remaining)} kg</span>, tone: balance.remaining < 0 ? 'highlight' : 'brand' },
                            ]} />
                        </div>}
                    </div>
                );
            })}
            {errors.variedades && <FormField error={errors.variedades} />}
            <Button type="button" variant="outline" disabled={disabled || rows.length >= options.length} onClick={() => onChange([...rows, { frutaDerivadaId: '', kilos: '' }])} className="self-start"><Plus size={17} /> Agregar variedad</Button>
            <SummaryBar items={[{ label: totalLabel, value: `${formatKg(sumVarietyKilos(rows))} kg`, tone: 'brand' }]} />
        </div>
    );
}
