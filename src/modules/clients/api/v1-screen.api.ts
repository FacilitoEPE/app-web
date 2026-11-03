import { clienteNegocioV1 } from '@/modules/clients/api/v1.api';
import type { ClienteNegocioV1 } from '@/modules/clients/api/v1.dto';
import type { ClienteNegocioInput } from '@/modules/clients/api/cliente-negocio.dto';
import { toClienteNegocio } from '@/modules/clients/api/cliente-negocio.mapper';
import { commitRemote } from '@/shared/api/data-contract';
import { operationsContext, readAllV1 } from '@/modules/operations/api/operations-context.api';
const map = (row: ClienteNegocioV1) => toClienteNegocio({ ...row, correoCorporativo: row.correoCorporativo ?? '' });
export const clientScreenV1 = {
    list: async () => (await readAllV1<ClienteNegocioV1>('/clientes-negocio')).map(map),
    create: async (input: ClienteNegocioInput) => map(await commitRemote(() => clienteNegocioV1.create(input))),
    update: async (id: number, input: Partial<ClienteNegocioInput>) => map(await commitRemote(() => clienteNegocioV1.update(id, input))),
    remove: (id: number) => commitRemote(() => clienteNegocioV1.remove(id)),
    contracts: async (id: number) => {
        const g = operationsContext(), client = await clienteNegocioV1.get(id);
        return { clienteNegocio: { ...client, correoCorporativo: client.correoCorporativo ?? '' }, contratos: g.requirements.filter(row => row.clienteNegocioId === id).map(row => ({ clienteNegocioCampanaId: row.clienteNegocioCampanaId, documentoUrl: row.documentoUrl ?? '', fichaTecnicaUrl: row.fichaTecnicaUrl ?? '', kilosAcordados: row.kilosAcordados, campaniaId: row.campaniaId, nombreCampania: g.campaigns.find(c => c.campaniaId === row.campaniaId)?.nombre ?? '', fechaRegistro: row.fechaRegistro })) };
    },
};
