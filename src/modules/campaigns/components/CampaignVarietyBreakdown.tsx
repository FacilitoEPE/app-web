import { InfoField } from "@/shared/components/InfoField";
import { formatKg } from "@/shared/utils/format";
import type { VarietyQuantity } from "@/modules/campaigns/campaignVarietyQuantities.utils";

interface Props {
    varieties?: VarietyQuantity[];
    varietyNames: ReadonlyMap<number, string>;
    pending?: boolean;
    legacyNames?: string;
}

export default function CampaignVarietyBreakdown({ varieties, varietyNames, pending, legacyNames }: Props) {
    return (
        <InfoField label="Variedades y cantidades" variant="plain" className="sm:col-span-2" value={
            !pending && varieties?.length ? (
                <dl className="divide-y divide-border rounded-lg border border-border">
                    {varieties.map(({ frutaDerivadaId, kilos }) => (
                        <div key={frutaDerivadaId} className="flex items-start justify-between gap-3 px-3 py-2.5">
                            <dt className="min-w-0 wrap-anywhere">{varietyNames.get(frutaDerivadaId) ?? `Variedad #${frutaDerivadaId}`}</dt>
                            <dd className="shrink-0 font-semibold tabular-nums">{formatKg(kilos)} kg</dd>
                        </div>
                    ))}
                </dl>
            ) : (
                <div className="rounded-lg border border-border px-3 py-2.5 text-ink-muted">
                    {legacyNames && <p className="wrap-anywhere">{legacyNames}</p>}
                    <p>{pending ? "Desglose por variedad pendiente" : "Sin cantidades registradas por variedad"}</p>
                </div>
            )
        } />
    );
}
