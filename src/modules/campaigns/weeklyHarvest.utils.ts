import type { QualityDeliveryLoadItem } from "@/modules/quality/qualityOperations.models";
import type { WeeklySlotDeliveryItem } from "@/modules/campaigns/components/CampaignWeeklySlotModal";

/** Real loaded kilos use the recorded load date, independently of the contract schedule. */
export function harvestedWeeklyItems(loads: QualityDeliveryLoadItem[], campaignId: number): WeeklySlotDeliveryItem[] {
    return loads.filter(load => load.campaniaId === campaignId && load.fechaCargaReal).flatMap(load => {
        const totals = new Map<string, number>();
        for (const provider of load.proveedoresCarga) totals.set(provider.variedad, (totals.get(provider.variedad) ?? 0) + provider.kilosCargados);
        const total = [...totals.values()].reduce((sum, kg) => sum + kg, 0);
        return [...totals.entries()].filter(([, kg]) => kg > 0).map(([variety, kilos]) => ({
            id: load.id + ":" + variety, loadId: load.id, fecha: load.fechaCargaReal.slice(0, 10), variedad: variety || "Sin variedad asignada",
            cliente: load.cliente, canal: load.scope === "industria" ? "Industria" : "Exportador", contratoRef: load.contratoRef,
            destino: load.destino, kilosVariedad: kilos, kilosTotalesEntrega: total, coordinada: true,
            transportista: load.transportista, placa: load.placa, observaciones: load.observacionesCarga,
        }));
    });
}
