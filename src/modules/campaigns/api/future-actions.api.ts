import { postV1Action } from '@/shared/api/future-client';
import type { CampanaV1 } from '@/modules/campaigns/api/future.dto';
export function cerrarCampanaV1(campaniaId: number, motivoCierre: string) {
    return postV1Action<CampanaV1, {
        motivoCierre: string;
    }>(`/campanas/${campaniaId}/cerrar`, { motivoCierre });
}
