import { createV1ReadResource } from '@/shared/api/future-client';
import type { CargaV1 } from '@/modules/quality/api/future.dto';
/** Backend derives the driver from identity. The mock uses a fixed driver (ID 1). */
export const cargasAsignadasV1 = createV1ReadResource<CargaV1>('/chofer/cargas');
