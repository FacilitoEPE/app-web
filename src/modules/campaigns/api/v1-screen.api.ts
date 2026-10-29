import { campanaV1, campaniaXProveedoresV1, clienteNegocioCampanaV1 } from '@/modules/campaigns/api/future.api';
import type { CampanaV1, CampaniaXProveedoresV1, ClienteNegocioCampanaV1 } from '@/modules/campaigns/api/future.dto';
import { operationsContext, readAllV1 } from '@/modules/operations/api/operations-context.api';
import { commitRemote } from '@/shared/api/data-contract';
import { formatFecha, parseFecha } from '@/modules/campaigns/api/fecha.util';
import type { Campana, CampaignFormInput } from '@/modules/campaigns/api/campaign.mapper';
import type { CreateCampaniaProveedorDto, UpdateCampaniaProveedorDto } from '@/modules/campaigns/api/campania-proveedor.dto';
import type { CreateClienteNegocioCampanaDto, UpdateClienteNegocioCampanaDto } from '@/modules/campaigns/api/cliente-negocio-campana.dto';
import type { CampaniaProveedor } from '@/modules/campaigns/api/campania-proveedor.mapper';
import type { ClienteNegocioCampana } from '@/modules/campaigns/api/cliente-negocio-campana.mapper';
import { mapProviderV1 } from '@/modules/providers/api/v1-screen.api';
import { toClienteNegocio } from '@/modules/clients/api/cliente-negocio.mapper';
export const mapCampaignV1 = (row: CampanaV1): Campana => ({
    ...row, fruta: operationsContext().fruits.find(fruit => fruit.frutaId === row.frutaId), fechaInicio: parseFecha(row.fechaInicio), fechaFin: parseFecha(row.fechaFin),
});
export const mapParticipationV1 = (row: CampaniaXProveedoresV1): CampaniaProveedor => ({
    ...row, proveedor: operationsContext().providers.filter(provider => provider.proveedorId === row.proveedorId).map(mapProviderV1)[0],
});
export const mapRequirementV1 = (row: ClienteNegocioCampanaV1): ClienteNegocioCampana => ({
    ...row, documentoUrl: row.documentoUrl ?? '', fichaTecnicaUrl: row.fichaTecnicaUrl ?? '', fechaRegistro: parseFecha(row.fechaRegistro),
    clienteNegocio: operationsContext().clients.filter(client => client.clienteNegocioId === row.clienteNegocioId).map(client => toClienteNegocio({ ...client, correoCorporativo: client.correoCorporativo ?? '' }))[0],
});
function campaignInput(input: Partial<CampaignFormInput>) {
    if (input.estado === 'terminado')
        throw new Error('Usa Cerrar campaña para registrar el motivo y comprobar sus pendientes.');
    return {
        temporada: input.temporada, observaciones: input.observaciones, nombre: input.nombre, frutaId: input.frutaId, estado: input.estado,
        fechaInicio: input.fechaInicio ? formatFecha(input.fechaInicio) : undefined, fechaFin: input.fechaFin ? formatFecha(input.fechaFin) : undefined,
        requerimientoComercial: input.requerimientoComercial === undefined ? undefined : Number(input.requerimientoComercial),
    };
}
export const campaignScreenV1 = {
    fruits: async () => operationsContext().fruits,
    varieties: async (id: number) => operationsContext().varieties.filter(row => row.frutaId === id),
    list: async () => (await readAllV1<CampanaV1>('/campanas')).map(mapCampaignV1),
    get: async (id: number) => mapCampaignV1(await campanaV1.get(id)),
    create: async (input: CampaignFormInput) => mapCampaignV1(await commitRemote(() => campanaV1.create(campaignInput(input) as Parameters<typeof campanaV1.create>[0]))),
    update: async (id: number, input: Partial<CampaignFormInput>) => mapCampaignV1(await commitRemote(() => campanaV1.update(id, campaignInput(input)))),
    remove: (id: number) => commitRemote(() => campanaV1.remove(id)),
    providers: async (id: number) => (await readAllV1<CampaniaXProveedoresV1>(`/campanas/${id}/proveedores`)).map(mapParticipationV1),
    createProvider: async (input: CreateCampaniaProveedorDto) => mapParticipationV1(await commitRemote(() => campaniaXProveedoresV1(input.campaniaId).create({ proveedorId: input.proveedorId, cantidadProveedor: input.cantidadProveedor, tipoProveedor: input.tipoProveedor, precioCompraKg: input.precioCompraKg, moneda: input.moneda, observaciones: input.observaciones, frutaConvencionalEstimado: input.frutaConvencionalEstimado }))),
    updateProvider: async (id: number, input: UpdateCampaniaProveedorDto) => {
        const row = operationsContext().participations.find(item => item.cxpId === id);
        if (!row)
            throw new Error('No se encontró la participación del proveedor.');
        return mapParticipationV1(await commitRemote(() => campaniaXProveedoresV1(row.campaniaId).update(id, { cantidadProveedor: input.cantidadProveedor, tipoProveedor: input.tipoProveedor, precioCompraKg: input.precioCompraKg, moneda: input.moneda, observaciones: input.observaciones, frutaConvencionalEstimado: input.frutaConvencionalEstimado })));
    },
    deleteProvider: (id: number) => {
        const row = operationsContext().participations.find(item => item.cxpId === id);
        if (!row)
            throw new Error('No se encontró la participación del proveedor.');
        return commitRemote(() => campaniaXProveedoresV1(row.campaniaId).remove(id));
    },
    clients: async (id: number) => (await readAllV1<ClienteNegocioCampanaV1>(`/campanas/${id}/requerimientos`)).map(mapRequirementV1),
    createClient: async (id: number, input: CreateClienteNegocioCampanaDto) => mapRequirementV1(await commitRemote(() => clienteNegocioCampanaV1(id).create(input))),
    updateClient: async (parent: number, id: number, input: UpdateClienteNegocioCampanaDto) => mapRequirementV1(await commitRemote(() => clienteNegocioCampanaV1(parent).update(id, input))),
    deleteClient: (parent: number, id: number) => commitRemote(() => clienteNegocioCampanaV1(parent).remove(id)),
};
