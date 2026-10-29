import { operationsContext, type OperationsContext } from '@/modules/operations/api/operations-context.api';
export function coordinationContext(id: number, g: OperationsContext = operationsContext()) {
    const coordination = g.coordinations.find(row => row.coordinacionEntregaId === id);
    const delivery = g.deliveries.find(row => row.entregaProgramadaId === coordination?.entregaProgramadaId);
    const contract = g.contracts.find(row => row.contratoVentaId === delivery?.contratoVentaId);
    const requirement = g.requirements.find(row => row.clienteNegocioCampanaId === contract?.clienteNegocioCampanaId);
    const campaign = g.campaigns.find(row => row.campaniaId === requirement?.campaniaId);
    if (!coordination || !delivery || !contract || !requirement || !campaign)
        throw new Error('La entrega no tiene un contexto comercial completo. Revisa sus relaciones.');
    return { coordination, delivery, contract, requirement, campaign,
        fruit: g.fruits.find(row => row.frutaId === campaign.frutaId)?.name ?? '',
        client: g.clients.find(row => row.clienteNegocioId === requirement.clienteNegocioId),
        carrier: g.carriers.find(row => row.idEmpresaTransporteExterno === coordination.idEmpresaTransporteExterno),
        vehicle: g.vehicles.find(row => row.idVehiculoExterno === coordination.idVehiculoExterno),
        driver: g.drivers.find(row => row.idChoferTransporteExterno === coordination.idChoferTransporteExterno),
        load: g.loads.find(row => row.coordinacionEntregaId === id),
        harvest: g.harvests.find(row => row.entregaProgramadaId === delivery.entregaProgramadaId),
    };
}
export function loadContext(id: string | number, g: OperationsContext = operationsContext()) {
    const load = g.loads.find(row => row.cargaId === Number(id));
    if (!load)
        throw new Error('No se encontró la carga. Actualiza la pantalla.');
    return { ...coordinationContext(load.coordinacionEntregaId, g), load };
}
export function providerName(id: number, g: OperationsContext = operationsContext()) {
    const provider = g.providers.find(row => row.proveedorId === id);
    return provider ? `${provider.nombres} ${provider.apellido}`.trim() : '';
}
export function farmNames(providerId: number, loadId: number, g: OperationsContext = operationsContext()) {
    const ids = new Set(g.loadOrigins.filter(origin => g.loadProviders.some(row => row.proveedorCargaId === origin.proveedorCargaId && row.cargaId === loadId && g.participations.some(p => p.cxpId === row.cxpId && p.proveedorId === providerId))).map(row => row.fincaId));
    return g.farms.filter(row => ids.has(row.fincaId)).map(row => row.nombreFinca).join(', ');
}
