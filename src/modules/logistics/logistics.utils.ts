import { format } from "date-fns";
import type { LogisticsLoad } from "@/modules/logistics/logistics.models";

export function formatLogisticsDateTime(value: string | null | undefined): string {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : format(date, "dd/MM/yyyy HH:mm");
}

export const logisticsStageLabel = (stage: LogisticsLoad["etapaDespacho"]) => stage === "Salida" ? "Salida de finca" : stage;

export function logisticsLoadKg(load: LogisticsLoad): number {
    return load.proveedores.reduce((sum, provider) => sum + provider.kilosCargados, 0);
}

export function logisticsCrateBalance(load: LogisticsLoad): number | null {
    const crates = load.devolucionJabas;
    return crates?.jabasIniciales == null || crates.jabasDevueltas == null ? null
        : crates.jabasIniciales - crates.jabasDevueltas;
}
