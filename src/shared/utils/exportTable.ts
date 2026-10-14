import { format } from "date-fns";
import { downloadCsv } from "@/shared/utils/downloadCsv";

type Cell = string | number | null | undefined;

/** Lo que exporta una tabla: se arma una vez y el menú lo baja como CSV o lo imprime como PDF. */
export interface TableExport {
    /** Nombre del archivo, sin extensión */
    filename: string;
    /** Título del documento impreso, p. ej. "Clientes" */
    title: string;
    header: string[];
    rows: Cell[][];
}

export function exportCsv({ filename, header, rows }: TableExport) {
    downloadCsv(filename, header, rows);
}

const escapeHtml = (value: Cell) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

/**
 * Abre el diálogo de impresión del navegador con la tabla ya formateada, para "Guardar como PDF". Se imprime desde
 * un iframe oculto (no una ventana nueva) para que ningún bloqueador de ventanas emergentes lo frene. Los colores
 * van fijos a propósito: el documento impreso siempre sale en claro, sin importar el tema de la app.
 */
export function exportPdf({ title, header, rows }: TableExport) {
    const generatedAt = format(new Date(), "dd/MM/yyyy HH:mm");
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 landscape; margin: 14mm; }
  body { font-family: "Plus Jakarta Sans", system-ui, sans-serif; color: #1f2a1c; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #4f9a2c; padding-bottom: 8px; margin-bottom: 14px; }
  h1 { font-size: 18px; margin: 0; }
  header p { font-size: 10px; color: #6b7468; margin: 0; }
  .brand { font-size: 10px; font-weight: 700; letter-spacing: .16em; color: #4f9a2c; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  th { background: #eef5e8; text-align: left; padding: 7px 8px; font-weight: 700; }
  td { padding: 6px 8px; border-bottom: 1px solid #e3e8df; vertical-align: top; }
  tr:nth-child(even) td { background: #fafcf8; }
  footer { margin-top: 10px; font-size: 9px; color: #6b7468; }
</style></head><body>
<header><div><p class="brand">AGRO EXPORTACIONES</p><h1>${escapeHtml(title)}</h1></div><p>Generado el ${generatedAt}</p></header>
<table><thead><tr>${header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead>
<tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>
<footer>${rows.length} ${rows.length === 1 ? "registro" : "registros"}</footer>
</body></html>`;

    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc || !frame.contentWindow) {
        frame.remove();
        return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    frame.contentWindow.addEventListener("afterprint", () => frame.remove(), { once: true });
    // Da un respiro para que el iframe pinte antes de abrir el diálogo
    setTimeout(() => frame.contentWindow?.print(), 50);
}
