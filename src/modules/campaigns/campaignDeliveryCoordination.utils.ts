import { usesV1 } from '@/shared/api/data-contract';
import type {
    CampaignContractDeliveryLocal,
    DeliveryCoordination,
} from "@/modules/campaigns/campaignContractDelivery.utils";

/**
 * Coordinación de una entrega programada: con qué transportista, camión y chofer sale, de qué proveedores y fincas
 * se recoge y en qué fechas. La entrega (fecha, kilos y destino) se programa en Gestión Comercial.
 */

/** Una entrega programada con el contrato y el cliente al que pertenece */
export interface CampaignDeliveryEntry {
    /** Clave única en la campaña: `vínculo:contrato:entrega` */
    key: string;
    relationId: number;
    contractId: number;
    delivery: CampaignContractDeliveryLocal;
}

export interface DeliveryCoordinationValues {
    carrierId: string;
    vehicleId: string;
    driverId: string;
    /** Proveedores elegidos y, de cada uno, los nombres de las fincas de donde se recoge */
    proveedores: Record<number, string[]>;
    fechaInicio: string;
    fechaFin: string;
    condicionesCarga: string;
    observaciones: string;
}

export type DeliveryCoordinationField = "carrierId" | "vehicleId" | "driverId" | "proveedores" | "fechaInicio" | "fechaFin";

export interface DeliveryCoordinationErrors extends Partial<Record<DeliveryCoordinationField, string>> {
    /** Proveedores elegidos sin ninguna finca */
    sinFinca?: number[];
}

export const EMPTY_COORDINATION: DeliveryCoordinationValues = {
    carrierId: "",
    vehicleId: "",
    driverId: "",
    proveedores: {},
    fechaInicio: "",
    fechaFin: "",
    condicionesCarga: "",
    observaciones: "",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const deliveryKey = (relationId: number, contractId: number, deliveryId: number) => `${relationId}:${contractId}:${deliveryId}`;

/** Las entregas de una campaña a partir del almacén (`campaña:vínculo:contrato` → entregas), ordenadas por fecha programada */
export function listCampaignDeliveries(records: Record<string, CampaignContractDeliveryLocal[]>, campaniaId: number): CampaignDeliveryEntry[] {
    const entries: CampaignDeliveryEntry[] = [];
    for (const [key, deliveries] of Object.entries(records)) {
        const [campaign, relation, contract] = key.split(":").map(Number);
        if (campaign !== campaniaId) continue;
        for (const delivery of deliveries) {
            entries.push({ key: deliveryKey(relation, contract, delivery.id), relationId: relation, contractId: contract, delivery });
        }
    }
    return entries.sort((a, b) => a.delivery.fecha.localeCompare(b.delivery.fecha) || a.delivery.id - b.delivery.id);
}

export function validateCoordination(values: DeliveryCoordinationValues): DeliveryCoordinationErrors {
    const errors: DeliveryCoordinationErrors = {};
    if (!values.carrierId) errors.carrierId = "Selecciona el transportista.";
    if (!values.vehicleId) errors.vehicleId = "Selecciona el camión.";
    if (!values.driverId) errors.driverId = "Selecciona el chofer.";

    const selected = Object.entries(values.proveedores);
    if (selected.length === 0) errors.proveedores = "Selecciona al menos un proveedor.";
    const sinFinca = selected.filter(([, fincas]) => fincas.length === 0).map(([id]) => Number(id));
    if (sinFinca.length > 0) errors.sinFinca = sinFinca;

    if (!(usesV1() ? Number.isFinite(Date.parse(values.fechaInicio)) : ISO_DATE.test(values.fechaInicio))) errors.fechaInicio = "Selecciona la fecha de inicio.";
    if (!(usesV1() ? Number.isFinite(Date.parse(values.fechaFin)) : ISO_DATE.test(values.fechaFin))) errors.fechaFin = "Selecciona la fecha de fin.";
    else if (!errors.fechaInicio && values.fechaFin < values.fechaInicio) errors.fechaFin = "La fecha de fin no puede ser anterior al inicio.";
    return errors;
}

export const hasCoordinationErrors = (errors: DeliveryCoordinationErrors) => Object.values(errors).some((error) => error !== undefined);

export function toCoordination(values: DeliveryCoordinationValues): DeliveryCoordination {
    return {
        carrierId: Number(values.carrierId),
        vehicleId: Number(values.vehicleId),
        driverId: Number(values.driverId),
        proveedores: Object.entries(values.proveedores).map(([id, fincas]) => ({ proveedorId: Number(id), fincas })),
        fechaInicio: values.fechaInicio,
        fechaFin: values.fechaFin,
        condicionesCarga: values.condicionesCarga.trim(),
        observaciones: values.observaciones.trim(),
    };
}

/** Valores del formulario para una entrega; los de una entrega ya coordinada, para editarla */
export function coordinationToValues(entry: CampaignDeliveryEntry): DeliveryCoordinationValues {
    const coordination = entry.delivery.coordinacion;
    if (!coordination) return { ...EMPTY_COORDINATION };
    return {
        carrierId: String(coordination.carrierId),
        vehicleId: String(coordination.vehicleId),
        driverId: String(coordination.driverId),
        proveedores: Object.fromEntries(coordination.proveedores.map((item) => [item.proveedorId, item.fincas])),
        fechaInicio: coordination.fechaInicio,
        fechaFin: coordination.fechaFin,
        condicionesCarga: coordination.condicionesCarga,
        observaciones: coordination.observaciones,
    };
}
