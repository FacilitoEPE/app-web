import { createV1ReadResource } from '@/shared/api/v1-client';
import type { CargaV1 } from '@/modules/quality/api/v1.dto';
/** Backend derives the driver from identity. The mock uses a fixed driver (ID 1). */
export const cargasAsignadasV1 = createV1ReadResource<CargaV1>('/chofer/cargas');
