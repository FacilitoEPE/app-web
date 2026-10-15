/**
 * Piezas comunes de los datos de demostración (`*.demo.ts`), que solo se cargan en desarrollo mientras las
 * vistas no tienen servicio en el backend. Ningún código de producción debe depender de esto.
 */

/** Fecha `yyyy-MM-dd` (hora local) a `days` días de hoy: negativo hacia atrás, positivo hacia adelante */
export function demoDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * PDF mínimo válido de una página con un título, para que la vista previa de un documento de ejemplo muestre
 * algo. `fileName` se completa con `.pdf` si no lo trae.
 */
export function demoPdf(fileName: string, title = "Documento de demostracion"): File {
    // Los PDF básicos solo admiten ASCII sin escapes: se quitan tildes y paréntesis del título
    const safeTitle = title.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[()\\]/g, "");
    const stream = `BT /F1 16 Tf 24 100 Td (${safeTitle}) Tj ET`;
    const body = [
        "%PDF-1.4",
        "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
        "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
        "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 360 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj",
        `4 0 obj<</Length ${stream.length}>>stream\n${stream}\nendstream endobj`,
        "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj",
        "trailer<</Root 1 0 R/Size 6>>",
        "%%EOF",
    ].join("\n");
    return new File([body], fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`, { type: "application/pdf" });
}
