import type { ExamEstado, ExamResult, LocalExam } from "@/modules/campaigns/campaignExam";
import { demoDate, demoPdf } from "@/shared/utils/demoData";

/**
 * Exámenes de demostración SOLO para desarrollo: llenan la gestión y el detalle de los proveedores de ejemplo
 * para revisar cómo se ven las tres etapas (pendiente de envío, enviado, con resultado), resultados positivos y
 * negativos y una lista con más filas de las que caben en la tarjeta del detalle. Se cargan únicamente con
 * `import.meta.env.DEV` (ver `campaignExams.store.ts`); en producción y en las pruebas el almacén arranca vacío.
 *
 * TODO(api): borrar este archivo cuando los exámenes vengan del backend.
 */

interface DemoExam {
    tipoExamen: string;
    estado: ExamEstado;
    /** Días atrás desde hoy en que se tomó la muestra */
    daysAgo: number;
    /** Días que tardó en enviarse desde la toma (solo desde la etapa "enviado") */
    shippedAfter?: number;
    resultado?: ExamResult;
    observacion?: string;
}

/** Proveedores de ejemplo (ids de la base de desarrollo) y los exámenes de cada uno, del más reciente al más antiguo */
const DEMO: Record<number, DemoExam[]> = {
    1: [
        { tipoExamen: "Residuos de Plaguicidas", estado: "pendiente", daysAgo: 1 },
        { tipoExamen: "CADMIO", estado: "enviado", daysAgo: 6, shippedAfter: 1, observacion: "Muestra de fruta de la parcela alta." },
        { tipoExamen: "Metales Pesados", estado: "resultado", daysAgo: 14, shippedAfter: 2, resultado: "negativo" },
        { tipoExamen: "Microbiológico", estado: "resultado", daysAgo: 28, shippedAfter: 1, resultado: "positivo", observacion: "Presencia detectada; se repite el muestreo." },
        { tipoExamen: "Análisis Nutricional", estado: "resultado", daysAgo: 45, shippedAfter: 3, resultado: "negativo" },
    ],
    2: [
        { tipoExamen: "Trazabilidad de Campo", estado: "enviado", daysAgo: 4, shippedAfter: 1 },
        { tipoExamen: "Residuos de Plaguicidas", estado: "resultado", daysAgo: 20, shippedAfter: 2, resultado: "negativo" },
    ],
    4: [
        { tipoExamen: "CADMIO", estado: "pendiente", daysAgo: 2, observacion: "A la espera del courier del laboratorio." },
        { tipoExamen: "Residuos de Plaguicidas", estado: "resultado", daysAgo: 12, shippedAfter: 1, resultado: "negativo" },
        { tipoExamen: "Microbiológico", estado: "resultado", daysAgo: 30, shippedAfter: 2, resultado: "positivo" },
    ],
};

export function createDemoExams(): { exams: Record<number, LocalExam[]>; nextId: number } {
    const exams: Record<number, LocalExam[]> = {};
    let id = 1;

    for (const [providerKey, items] of Object.entries(DEMO)) {
        const proveedorId = Number(providerKey);
        exams[proveedorId] = items.map((item, index) => {
            const sampleNumber = String(items.length - index).padStart(3, "0");
            const shipped = item.estado !== "pendiente";
            return {
                id: `local-${id++}`,
                proveedorId,
                tipoExamen: item.tipoExamen,
                fecha: demoDate(-item.daysAgo),
                identificacionMuestra: `MUESTRA-${proveedorId}${sampleNumber}`,
                estado: item.estado,
                fechaEnvioMuestra: shipped ? demoDate(-(item.daysAgo - (item.shippedAfter ?? 1))) : "",
                resultado: item.resultado ?? "",
                observacion: item.observacion ?? "",
                archivo: item.estado === "resultado" ? demoPdf(`informe-${proveedorId}${sampleNumber}`, "Informe de laboratorio de demostracion") : null,
            };
        });
    }

    return { exams, nextId: id };
}
