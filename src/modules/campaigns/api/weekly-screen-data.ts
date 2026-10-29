import { operationsContext } from '@/modules/operations/api/operations-context.api';
export function weeklyCampaignItems(campaignId: number) {
    const g = operationsContext();
    return g.deliveries.flatMap(delivery => {
        const contract = g.contracts.find(c => c.contratoVentaId === delivery.contratoVentaId)!;
        const requirement = g.requirements.find(r => r.clienteNegocioCampanaId === contract.clienteNegocioCampanaId)!;
        if (requirement.campaniaId !== campaignId)
            return [];
        const client = g.clients.find(c => c.clienteNegocioId === requirement.clienteNegocioId)!;
        const coordination = g.coordinations.find(c => c.entregaProgramadaId === delivery.entregaProgramadaId);
        const varieties = g.deliveryVarieties.filter(v => v.entregaProgramadaId === delivery.entregaProgramadaId);
        const rows = varieties.length ? varieties.map(v => ({ id: String(v.entregaXFrutaDerivadaId), variedad: g.varieties.find(f => f.frutaDerivadaId === v.frutaDerivadaId)?.name ?? 'Variedad no disponible', kilos: v.kilosProgramados })) : [{ id: 'sin-variedad', variedad: 'Sin variedad asignada', kilos: delivery.kilosProgramados }];
        return rows.map(row => ({
            id: `${delivery.entregaProgramadaId}:${row.id}`, fecha: delivery.fecha, variedad: row.variedad,
            cliente: client.nombreEmpresa, canal: contract.canal === 'INDUSTRIA' ? 'Industria' as const : 'Exportador' as const,
            contratoRef: contract.numero, destino: delivery.destino, kilosVariedad: row.kilos,
            kilosTotalesEntrega: delivery.kilosProgramados, coordinada: Boolean(coordination),
            transportista: g.carriers.find(c => c.idEmpresaTransporteExterno === coordination?.idEmpresaTransporteExterno)?.nombreCompleto ?? 'Por asignar',
            placa: g.vehicles.find(v => v.idVehiculoExterno === coordination?.idVehiculoExterno)?.placa ?? '—',
            observaciones: delivery.observaciones ?? '',
        }));
    });
}
