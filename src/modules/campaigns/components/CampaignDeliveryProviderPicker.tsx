import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { plural } from "@/shared/utils/plural";

export interface DeliveryProviderOption {
    id: number;
    nombre: string;
    /** "Acopiador" o "Productor" */
    tipo: string;
    /** Nombres de las fincas registradas del proveedor */
    fincas: string[];
}

interface CampaignDeliveryProviderPickerProps {
    providers: DeliveryProviderOption[];
    /** Proveedores elegidos y las fincas elegidas de cada uno */
    value: Record<number, string[]>;
    onChange: (value: Record<number, string[]>) => void;
    /** Error general: no se eligió ningún proveedor */
    error?: string;
    /** Proveedores elegidos a los que les falta elegir al menos una finca */
    missingFincas?: number[];
}

/**
 * Proveedores de la campaña de los que se recoge una entrega. Se pueden elegir varios, acopiadores o productores, y de
 * cada uno hay que elegir al menos una finca: por eso al marcar un proveedor se despliegan las suyas. Con una sola
 * finca se elige sola.
 */
export default function CampaignDeliveryProviderPicker({ providers, value, onChange, error, missingFincas = [] }: CampaignDeliveryProviderPickerProps) {
    const toggleProvider = (provider: DeliveryProviderOption, checked: boolean) => {
        if (!checked) {
            const rest = { ...value };
            delete rest[provider.id];
            onChange(rest);
            return;
        }
        onChange({ ...value, [provider.id]: provider.fincas.length === 1 ? provider.fincas : [] });
    };

    const toggleFinca = (providerId: number, finca: string, checked: boolean) => {
        const current = value[providerId] ?? [];
        onChange({ ...value, [providerId]: checked ? [...current, finca] : current.filter((item) => item !== finca) });
    };

    if (providers.length === 0) {
        return <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-[13px] text-ink-muted">La campaña todavía no tiene proveedores vinculados.</p>;
    }

    return (
        <div className="flex flex-col gap-3">
            <p className="text-[12.5px] text-ink-muted">Elige uno o varios proveedores y, de cada uno, al menos una finca.</p>
            {providers.map((provider) => {
                const fincas = value[provider.id];
                const checked = fincas !== undefined;
                const hasFincas = provider.fincas.length > 0;
                const missing = missingFincas.includes(provider.id);
                const inputId = `delivery-provider-${provider.id}`;
                return (
                    <div key={provider.id} className={cn("rounded-xl border bg-card px-4 py-3 transition-colors", missing ? "border-destructive/60" : checked ? "border-brand-border" : "border-border")}>
                        <label htmlFor={inputId} className={cn("flex items-center gap-3", hasFincas ? "cursor-pointer" : "cursor-not-allowed opacity-60")}>
                            <Checkbox id={inputId} checked={checked} disabled={!hasFincas} onCheckedChange={(next) => toggleProvider(provider, next === true)} />
                            <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{provider.nombre}</span>
                            <span className="shrink-0 text-[12px] font-medium text-ink-muted">{provider.tipo}</span>
                        </label>

                        {!hasFincas && <p className="mt-1 pl-7 text-[12px] text-ink-muted">Sin fincas registradas: agrégalas en la gestión de fincas del proveedor.</p>}

                        {checked && hasFincas && (
                            <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3 pl-7 animate-in fade-in-50 duration-200">
                                <span className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                                    {plural(provider.fincas.length, "Finca", "Fincas")} · {fincas.length} de {provider.fincas.length}
                                </span>
                                <div className="flex flex-wrap gap-x-5 gap-y-2">
                                    {provider.fincas.map((finca) => {
                                        const fincaId = `${inputId}-${finca}`;
                                        return (
                                            <label key={finca} htmlFor={fincaId} className="flex min-w-0 cursor-pointer items-center gap-2 text-[13px] text-ink-body">
                                                <Checkbox id={fincaId} checked={fincas.includes(finca)} onCheckedChange={(next) => toggleFinca(provider.id, finca, next === true)} />
                                                <span className="truncate">{finca}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                {missing && (
                                    <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-destructive">
                                        <AlertCircle size={14} className="shrink-0" /> Elige al menos una finca de este proveedor.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
            {error && (
                <p className="flex items-center gap-1.5 text-[13px] font-medium text-destructive">
                    <AlertCircle size={14} className="shrink-0" /> {error}
                </p>
            )}
        </div>
    );
}
