import { postV1Action } from '@/shared/api/v1-client';
import type { CampanaV1 } from '@/modules/campaigns/api/v1.dto';
export function cerrarCampanaV1(campaniaId: number, motivoCierre: string) {
    return postV1Action<CampanaV1, {
        motivoCierre: string;
    }>(`/campanas/${campaniaId}/cerrar`, { motivoCierre });
}
