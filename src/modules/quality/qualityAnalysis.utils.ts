export type QualityAnalysisType = "Residuos de Plaguicidas" | "Materia seca" | "Metales pesados" | "Microbiológico";

export type QualityAnalysisResultState = "conforme" | "no_conforme" | "pendiente";

export interface QualityAnalysisRecord {
    id: number;
    campaniaId: number;
    productorNombre: string;
    fincaNombre: string;
    fechaMuestreo: string; // YYYY-MM-DD
    tipo: QualityAnalysisType | string;
    mtd: number; // Moscas/trampa/día
    mtdTrampa?: string;
    resultado: string; // "Conforme", "No conforme", o valor numérico "22.4"
    unidad?: string; // "%", "mg/kg", etc.
    estadoResultado: QualityAnalysisResultState;
    documento?: File | null;
    documentoNombre?: string;
    observaciones?: string;
}

export interface QualityAnalysisFormValues {
    productorFinca: string;
    fechaMuestreo: string;
    mtd: string;
    mtdTrampa: string;
    tipo: string;
    resultado: string;
    unidad: string;
    observaciones: string;
}

export const ANALYSIS_TYPE_OPTIONS = [
    { value: "Residuos de Plaguicidas", label: "Residuos de Plaguicidas" },
    { value: "Materia seca", label: "Materia seca" },
    { value: "Metales pesados", label: "Metales pesados" },
    { value: "Microbiológico", label: "Microbiológico" },
];

export const DEMO_PRODUCER_FARMS = [
    { value: "Roberto Palacios · Parcela San José", productor: "Roberto Palacios", finca: "Parcela San José" },
    { value: "Roberto Palacios · Parcela San José · Sector Este", productor: "Roberto Palacios", finca: "Parcela San José · Sector Este" },
    { value: "Brayan Gay II · Finca El Sol", productor: "Brayan Gay II", finca: "Finca El Sol" },
    { value: "Brayan Gay II · Finca El Sol · Sector Sur", productor: "Brayan Gay II", finca: "Finca El Sol · Sector Sur" },
    { value: "Agroexportadora del Valle · Finca Santa Rosa", productor: "Agroexportadora del Valle", finca: "Finca Santa Rosa" },
];

export function determineResultState(resultado: string): QualityAnalysisResultState {
    const lower = resultado.trim().toLowerCase();
    if (!lower || lower.includes("pendiente")) return "pendiente";
    if (lower.includes("no conforme") || lower.includes("rechazado")) return "no_conforme";
    return "conforme";
}

export function filterQualityAnalysisRecords(
    records: QualityAnalysisRecord[],
    search: string,
    tipoFilter: string,
    estadoFilter: string,
): QualityAnalysisRecord[] {
    const query = search.trim().toLowerCase();

    return records.filter((item) => {
        if (tipoFilter && item.tipo !== tipoFilter) return false;
        if (estadoFilter && item.estadoResultado !== estadoFilter) return false;
        if (query) {
            const matchesText =
                item.productorNombre.toLowerCase().includes(query) ||
                item.fincaNombre.toLowerCase().includes(query) ||
                item.tipo.toLowerCase().includes(query) ||
                item.resultado.toLowerCase().includes(query);
            if (!matchesText) return false;
        }
        return true;
    });
}
