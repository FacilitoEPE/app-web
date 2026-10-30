import { operationsContext, type OperationsContext } from '@/modules/operations/api/operations-context.api';

export function clientOperationalSummary(clientId: number, g: OperationsContext = operationsContext()) {
    const requirements = g.requirements.filter(r => r.clienteNegocioId === clientId);
    const campaignIds = new Set(requirements.map(r => r.campaniaId));
    const requirementIds = new Set(requirements.map(r => r.clienteNegocioCampanaId));
    return {
        activeCampaigns: g.campaigns.filter(c => campaignIds.has(c.campaniaId) && c.estado !== 'terminado').length,
        contracts: g.contracts.filter(c => requirementIds.has(c.clienteNegocioCampanaId)).length,
    };
}
