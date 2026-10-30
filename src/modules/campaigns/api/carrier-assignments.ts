import { operationsContext, type OperationsContext } from "@/modules/operations/api/operations-context.api";
import { coordinationContext } from "@/modules/operations/api/operation-links";

export function campaignCarrierAssignments(campaignId: number, carrierId: number, g: OperationsContext = operationsContext()): string {
    const assignments = g.coordinations.filter(co => co.idEmpresaTransporteExterno === carrierId && coordinationContext(co.coordinacionEntregaId, g).campaign.campaniaId === campaignId);
    return [...new Set(assignments.map(co => {
        const vehicle = g.vehicles.find(v => v.idVehiculoExterno === co.idVehiculoExterno);
        const driver = g.drivers.find(d => d.idChoferTransporteExterno === co.idChoferTransporteExterno);
        return (vehicle?.placa ?? "Camión pendiente") + " · " + (driver?.nombre ?? "Chofer pendiente");
    }))].join("; ") || "Sin camión ni chofer asignados";
}
