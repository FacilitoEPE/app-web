import { postV1Action } from '@/shared/api/future-client';
import type { GuiaRemisionV1 } from '@/modules/quality/api/future.dto';
export function emitirGuiaV1(guiaId: number) {
    return postV1Action<GuiaRemisionV1, Record<string, never>>(`/guias/${guiaId}/emitir`, {});
}
