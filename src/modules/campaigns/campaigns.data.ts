export interface Campaign {
    id: number;
    nombre: string;
    inicio: string;
    fin: string;
    kilos: string;
    estado: string;
    fruta?: string;
    variedades?: string[];
}

/** Datos de muestra mientras el módulo no consume el backend. */
export const campaigns: Campaign[] = [
    { id: 1, nombre: "Mango 2026", inicio: "01/06/2026", fin: "31/08/2026", kilos: "3000", estado: "Planificado", fruta: "Mango", variedades: ["Mango Kent", "Mango Edward"] },
    { id: 2, nombre: "Mango 2025", inicio: "27/07/2025", fin: "27/07/2025", kilos: "3100", estado: "Terminado" },
    { id: 3, nombre: "Palta Hass 2025", inicio: "15/03/2025", fin: "30/06/2025", kilos: "5200", estado: "Terminado" },
    { id: 4, nombre: "Uva Red Globe 2026", inicio: "10/11/2025", fin: "28/02/2026", kilos: "7400", estado: "En ejecución" },
    { id: 5, nombre: "Banano Orgánico 2026", inicio: "05/01/2026", fin: "20/05/2026", kilos: "2800", estado: "Planificado" },
];
