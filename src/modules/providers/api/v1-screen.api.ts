import { proveedorV1 } from '@/modules/providers/api/v1.api';
import type { CreateProveedorV1, ProveedorV1 } from '@/modules/providers/api/v1.dto';
import type { ProveedorDto, ProveedorInput } from '@/modules/providers/api/proveedor.dto';
import { operationsContext, readAllV1 } from '@/modules/operations/api/operations-context.api';
import { commitRemote } from '@/shared/api/data-contract';
export const mapProviderV1 = (row: ProveedorV1): ProveedorDto => ({
    proveedorId: row.proveedorId, nombres: row.nombres, apellido: row.apellido, tipoDocumento: row.tipoDocumento, nmrDocumento: row.nmrDocumento,
    identidadDocUrl: row.identidadDocUrl ?? '', zona: row.zona, telefono: row.telefono, email: row.email ?? '', codigoLugarProduccion: row.codigoLugarProduccion ?? '', estadoSanidadAgraria: row.estadoExamenSanidadAgraria ?? '',
});
function inputV1(input: ProveedorInput): CreateProveedorV1 {
    return { nombres: input.nombres.trim(), apellido: input.apellido.trim(), tipoDocumento: input.tipoDocumento, nmrDocumento: String(input.nmrDocumento), zona: input.zona.trim(), telefono: String(input.telefono), email: input.email.trim() || null, codigoLugarProduccion: String(input.codigoLugarProduccion) || null, estadoExamenSanidadAgraria: input.estadoSanidadAgraria || null };
}
export const providerScreenV1 = {
    list: async () => (await readAllV1<ProveedorV1>('/proveedores')).map(mapProviderV1),
    get: async (id: number) => mapProviderV1(await proveedorV1.get(id)),
    create: async (input: ProveedorInput) => mapProviderV1(await commitRemote(() => proveedorV1.create(inputV1(input)))),
    update: async (id: number, input: ProveedorInput) => mapProviderV1(await commitRemote(() => proveedorV1.update(id, inputV1(input)))),
    remove: (id: number) => commitRemote(() => proveedorV1.remove(id)),
    exams: async (id: number) => operationsContext().exams.filter(row => row.proveedorId === id && row.resultado !== null).map(row => ({ ...row, resultado: row.resultado!, origen: row.origen ?? '', observacion: row.observacion ?? '', documentoUrl: row.documentoUrl ?? '' })),
};
