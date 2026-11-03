import { postV1Action } from '@/shared/api/v1-client';
import type { FacturaVentaV1 } from '@/modules/billing/api/v1.dto';
export function emitirFacturaV1(facturaId: number, input: {
    numeroFactura: string;
    fechaEmision: string;
    fechaVencimiento?: string | null;
}) {
    return postV1Action<FacturaVentaV1, typeof input>(`/facturas/${facturaId}/emitir`, input);
}
