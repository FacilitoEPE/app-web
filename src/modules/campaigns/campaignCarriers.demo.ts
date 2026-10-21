import type { CampaignCarrierLink } from "@/modules/campaigns/campaignCarrier.utils";
import { demoDate, demoPdf } from "@/shared/utils/demoData";

/**
 * Transportistas vinculados de demostración SOLO para desarrollo: llenan la campaña 1 (la que está en ejecución en la
 * base de desarrollo) con los cuatro estados del acuerdo de pago —sin registrar, pago único, con adelanto y pagado—
 * y dejan a TRANSPACK libre para probar el vínculo. Los `carrierId` son los de los transportistas de ejemplo de
 * Gestión de Transporte. Se cargan únicamente con `import.meta.env.DEV` (ver `campaignCarriers.store.ts`).
 *
 * TODO(api): borrar este archivo cuando los transportistas por campaña vengan del backend.
 */
export function createDemoCampaignCarriers(): { records: Record<number, CampaignCarrierLink[]>; nextId: number } {
    const quote = (name: string) => demoPdf(`cotizacion-${name}`, `Cotizacion ${name}`);
    const receipt = (name: string) => demoPdf(`boleta-${name}`, `Boleta ${name}`);

    const records: Record<number, CampaignCarrierLink[]> = {
        1: [
            {
                id: 1, carrierId: 2, fechaVinculacion: demoDate(-18), cotizacion: quote("sutrimex"),
                acuerdo: { tipo: "adelanto", moneda: "PEN", total: 18500, adelanto: 6000, fechaAdelanto: demoDate(-10), fechaPago: demoDate(12), boleta: receipt("sutrimex"), saldoPagado: false },
            },
            {
                id: 2, carrierId: 5, fechaVinculacion: demoDate(-15), cotizacion: quote("jose-ramirez"),
                acuerdo: { tipo: "unico", moneda: "PEN", total: 7200, adelanto: null, fechaAdelanto: "", fechaPago: demoDate(20), boleta: null, saldoPagado: false },
            },
            {
                id: 3, carrierId: 1, fechaVinculacion: demoDate(-30), cotizacion: quote("transportes-del-norte"),
                acuerdo: { tipo: "adelanto", moneda: "USD", total: 5400, adelanto: 1800, fechaAdelanto: demoDate(-25), fechaPago: demoDate(-5), boleta: receipt("transportes-del-norte"), saldoPagado: true },
            },
            { id: 4, carrierId: 3, fechaVinculacion: demoDate(-2), cotizacion: quote("fixgrom"), acuerdo: null },
        ],
    };
    return { records, nextId: 5 };
}
