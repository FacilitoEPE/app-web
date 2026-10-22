import type { QualityCampaign } from "@/modules/quality/quality.utils";

/**
 * Datos de demostración SOLO para desarrollo (ver AGENTS.md, excepción de diseño).
 * Reflejan las campañas del flujo de cosecha y calidad para los alcances Exportador e Industria.
 */
export function createDemoQualityCampaigns(): { records: QualityCampaign[]; nextId: number } {
    return {
        nextId: 4,
        records: [
            {
                id: 1,
                campaniaId: 1,
                nombre: "Mango 2026",
                fruta: "Mango",
                fechaInicio: "2026-09-11",
                fechaFin: "2027-01-19",
                estado: "En Proceso",
                scope: ["exportador", "industria"],
            },
            {
                id: 2,
                campaniaId: 2,
                nombre: "Mango 2025 · Cerrada",
                fruta: "Mango",
                fechaInicio: "2025-09-16",
                fechaFin: "2025-12-25",
                estado: "Finalizado",
                scope: ["industria"],
            },
            {
                id: 3,
                campaniaId: 3,
                nombre: "Arándano 2026",
                fruta: "Arándano",
                fechaInicio: "2026-10-06",
                fechaFin: "2026-12-20",
                estado: "En Proceso",
                scope: ["exportador", "industria"],
            },
        ],
    };
}
