import type { CampaignClientContractLocal } from "@/modules/campaigns/campaignClientContract.utils";
import type { CampaignContractDeliveryLocal, DeliveryCoordination } from "@/modules/campaigns/campaignContractDelivery.utils";
import { demoDate, demoPdf } from "@/shared/utils/demoData";

/**
 * Contratos y entregas de demostración SOLO para desarrollo: llenan la gestión de contratos de los clientes
 * vinculados a las campañas de ejemplo (claves `campaña:vínculo` de la base de desarrollo) y la programación de
 * entregas de esos contratos, para revisar listas con varias filas, un contrato sin entregas y textos largos.
 * Se cargan únicamente con `import.meta.env.DEV` (ver los `.store.ts`); en producción y en pruebas los almacenes
 * arrancan vacíos.
 *
 * TODO(api): borrar este archivo cuando contratos y entregas vengan del backend.
 */

type ContractSeed = Omit<CampaignClientContractLocal, "archivo" | "fechaRegistro"> & { daysAgo: number };

const CONTRACTS: Record<string, ContractSeed[]> = {
    // Campaña Mango 2026 · Exportadora Andina SAC
    "1:1": [
        { id: 1, daysAgo: 4, precioKg: 1.85, moneda: "USD", cantidadPropuestaKg: 24000, condicionesPago: "50% al embarque, 50% a 30 días de recibida la carga.", condicionesEntrega: "FOB Paita, cajas de 4 kg calibres 8 a 10.", observaciones: "Prioridad a la variedad Kent." },
        { id: 2, daysAgo: 21, precioKg: 1.7, moneda: "USD", cantidadPropuestaKg: 12500, condicionesPago: "100% contra copia de documentos.", condicionesEntrega: "FOB Paita, palets de 240 cajas.", observaciones: "" },
        { id: 3, daysAgo: 48, precioKg: 6.4, moneda: "PEN", cantidadPropuestaKg: 8000, condicionesPago: "Crédito a 45 días.", condicionesEntrega: "Entrega en planta de Sullana, fruta para proceso.", observaciones: "Contrato de descarte para industria de pulpa; el cliente asume el flete desde la planta." },
    ],
    // Campaña Mango 2026 · Alimentos del Pacífico SAC
    "1:2": [
        { id: 4, daysAgo: 9, precioKg: 1.6, moneda: "EUR", cantidadPropuestaKg: 18000, condicionesPago: "30% adelanto, saldo a la llegada a destino.", condicionesEntrega: "CIF Rotterdam, contenedor refrigerado de 40 pies.", observaciones: "" },
    ],
    // Campaña Uva 2027 · Exportadora Andina SAC
    "2:3": [
        { id: 5, daysAgo: 2, precioKg: 2.35, moneda: "USD", cantidadPropuestaKg: 30000, condicionesPago: "50% al embarque, 50% a 15 días.", condicionesEntrega: "FOB Callao, cajas de 8.2 kg.", observaciones: "Red Globe calibre XL." },
        { id: 6, daysAgo: 15, precioKg: 2.1, moneda: "USD", cantidadPropuestaKg: 9000, condicionesPago: "100% contra documentos.", condicionesEntrega: "FOB Callao.", observaciones: "" },
    ],
};

type DeliverySeed = Omit<CampaignContractDeliveryLocal, "fecha" | "coordinacion"> & { inDays: number };

/**
 * Coordinación de algunas entregas de la campaña 1 (las demás quedan por completar). Los ids son los de los
 * transportistas de ejemplo de Gestión de Transporte y los de los proveedores de la campaña; las fincas, las que
 * trae `providerLocalData.demo.ts` para cada proveedor.
 */
type CoordinationSeed = Omit<DeliveryCoordination, "fechaInicio" | "fechaFin"> & { startIn: number; endIn: number };

const COORDINATIONS: Record<number, CoordinationSeed> = {
    1: { carrierId: 2, vehicleId: 2, driverId: 2, proveedores: [{ proveedorId: 1, fincas: ["Fundo La Esperanza de San Miguel del Faique"] }, { proveedorId: 2, fincas: ["Fundo San Pedro"] }], startIn: 4, endIn: 5, condicionesCarga: "Fruta protegida, bultos identificados y recojo coordinado.", observaciones: "" },
    2: { carrierId: 2, vehicleId: 3, driverId: 2, proveedores: [{ proveedorId: 1, fincas: ["Fundo San Pedro", "Fundo El Mirador"] }], startIn: 18, endIn: 19, condicionesCarga: "", observaciones: "Confirmar el horario de recojo un día antes." },
    4: { carrierId: 1, vehicleId: 1, driverId: 1, proveedores: [{ proveedorId: 2, fincas: ["Fundo San Pedro"] }], startIn: -4, endIn: -3, condicionesCarga: "Cajas de 4 kg en palets.", observaciones: "" },
    5: { carrierId: 3, vehicleId: 4, driverId: 3, proveedores: [{ proveedorId: 1, fincas: ["Fundo Santa Rosa"] }], startIn: 1, endIn: 2, condicionesCarga: "", observaciones: "" },
};

/** Entregas por contrato (`campaña:vínculo:contrato`). El contrato 6 queda sin entregas a propósito. */
const DELIVERIES: Record<string, DeliverySeed[]> = {
    "1:1:1": [
        { id: 1, inDays: 5, kilosProgramados: 8000, destino: "Países Bajos · Rotterdam", observaciones: "Primer embarque de la temporada." },
        { id: 2, inDays: 19, kilosProgramados: 8000, destino: "Países Bajos · Rotterdam", observaciones: "" },
        { id: 3, inDays: 33, kilosProgramados: 8000, destino: "España · Valencia", observaciones: "Cambio de destino solicitado por el cliente." },
    ],
    "1:1:2": [
        { id: 4, inDays: -3, kilosProgramados: 12500, destino: "Estados Unidos · Filadelfia", observaciones: "Entregado." },
    ],
    "1:1:3": [
        { id: 5, inDays: 2, kilosProgramados: 4000, destino: "Planta Sullana", observaciones: "" },
        { id: 6, inDays: 9, kilosProgramados: 4000, destino: "Planta Sullana", observaciones: "" },
    ],
    "1:2:4": [
        { id: 7, inDays: 12, kilosProgramados: 9000, destino: "Países Bajos · Rotterdam", observaciones: "" },
        { id: 8, inDays: 26, kilosProgramados: 9000, destino: "Reino Unido · Londres", observaciones: "Requiere certificado GlobalGAP vigente." },
    ],
    "2:3:5": [
        { id: 9, inDays: 40, kilosProgramados: 15000, destino: "China · Shanghái", observaciones: "" },
        { id: 10, inDays: 54, kilosProgramados: 15000, destino: "China · Shanghái", observaciones: "" },
    ],
};

export function createDemoContracts(): { records: Record<string, CampaignClientContractLocal[]>; nextId: number } {
    const records: Record<string, CampaignClientContractLocal[]> = {};
    let maxId = 0;
    for (const [key, seeds] of Object.entries(CONTRACTS)) {
        records[key] = seeds.map(({ daysAgo, ...contract }) => {
            maxId = Math.max(maxId, contract.id);
            return { ...contract, fechaRegistro: demoDate(-daysAgo), archivo: demoPdf(`contrato-${contract.id}`, `Contrato comercial ${contract.id}`) };
        });
    }
    return { records, nextId: maxId + 1 };
}

export function createDemoDeliveries(): { records: Record<string, CampaignContractDeliveryLocal[]>; nextId: number } {
    const records: Record<string, CampaignContractDeliveryLocal[]> = {};
    let maxId = 0;
    for (const [key, seeds] of Object.entries(DELIVERIES)) {
        records[key] = seeds.map(({ inDays, ...delivery }) => {
            maxId = Math.max(maxId, delivery.id);
            const seed = COORDINATIONS[delivery.id];
            const coordinacion = seed ? { carrierId: seed.carrierId, vehicleId: seed.vehicleId, driverId: seed.driverId, proveedores: seed.proveedores, fechaInicio: demoDate(seed.startIn), fechaFin: demoDate(seed.endIn), condicionesCarga: seed.condicionesCarga, observaciones: seed.observaciones } : null;
            return { ...delivery, fecha: demoDate(inDays), coordinacion };
        });
    }
    return { records, nextId: maxId + 1 };
}
