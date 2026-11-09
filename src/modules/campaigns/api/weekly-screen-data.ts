import { operationsContext } from '@/modules/operations/api/operations-context.api';
export function weeklyCampaignItems(campaignId: number) {
    const g = operationsContext();
    return g.deliveries.flatMap(delivery => {
        const contract = g.contracts.find(c => c.contratoVentaId === delivery.contratoVentaId);
        const requirement = g.requirements.find(r => r.clienteNegocioCampanaId === contract?.clienteNegocioCampanaId);
        if (!contract || requirement?.campaniaId !== campaignId) return [];
        const client = g.clients.find(c => c.clienteNegocioId === requirement.clienteNegocioId);
        const coordination = g.coordinations.find(c => c.entregaProgramadaId === delivery.entregaProgramadaId);
        const varieties = delivery.variedades ?? g.deliveryVarieties
            .filter(v => v.entregaProgramadaId === delivery.entregaProgramadaId)
            .map(v => ({ frutaDerivadaId: v.frutaDerivadaId, kilos: v.kilosProgramados }));
        const rows = varieties.length ? varieties.map(v => ({ id: String(v.frutaDerivadaId), variedad: g.varieties.find(f => f.frutaDerivadaId === v.frutaDerivadaId)?.name ?? 'Variedad no disponible', kilos: v.kilos })) : [{ id: 'sin-variedad', variedad: 'Sin variedad asignada', kilos: delivery.kilosProgramados }];
        return rows.map(row => ({
            id: `${delivery.entregaProgramadaId}:${row.id}`, deliveryId: delivery.entregaProgramadaId, fecha: delivery.fecha, variedad: row.variedad,
            clienteId: requirement.clienteNegocioId, cliente: client?.nombreEmpresa ?? 'Cliente sin datos',
            canal: contract.canal === 'INDUSTRIA' ? 'Industria' as const : 'Exportador' as const,
            contratoRef: contract.numero, destino: delivery.destino, kilosVariedad: row.kilos,
            kilosTotalesEntrega: delivery.kilosProgramados, coordinada: Boolean(coordination),
            transportista: g.carriers.find(c => c.idEmpresaTransporteExterno === coordination?.idEmpresaTransporteExterno)?.nombreCompleto ?? 'Por asignar',
            placa: g.vehicles.find(v => v.idVehiculoExterno === coordination?.idVehiculoExterno)?.placa ?? '—',
            observaciones: delivery.observaciones ?? '',
        }));
    });
}
