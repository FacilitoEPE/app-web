import type { CultivoFinca } from "@/modules/providers/providerFinca.utils";

/** Una fruta pertenece a la selección únicamente mientras tenga variedades elegidas. */
export function updateFruitVarieties(value: CultivoFinca[], fruit: string, varieties: string[], single: boolean): CultivoFinca[] {
    const previous = value.find((item) => item.fruta === fruit)?.variedades ?? [];
    const selected = single ? varieties.filter((item) => !previous.includes(item)).slice(-1) : varieties;
    if (single) return selected.length ? [{ fruta: fruit, variedades: selected }] : [];
    const withVarieties = value.filter((item) => item.variedades.length > 0);
    if (selected.length === 0) return withVarieties.filter((item) => item.fruta !== fruit);
    return withVarieties.some((item) => item.fruta === fruit)
        ? withVarieties.map((item) => item.fruta === fruit ? { ...item, variedades: selected } : item)
        : [...withVarieties, { fruta: fruit, variedades: selected }];
}
