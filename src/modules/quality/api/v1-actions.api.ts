import { postV1Action } from '@/shared/api/v1-client';
import type { GuiaRemisionV1 } from '@/modules/quality/api/v1.dto';
export function emitirGuiaV1(guiaId: number) {
    return postV1Action<GuiaRemisionV1, Record<string, never>>(`/guias/${guiaId}/emitir`, {});
}
