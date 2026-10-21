export interface CampaignContractDeliveryValues {
    fecha: string;
    kilosProgramados: string;
    destino: string;
    observaciones: string;
}

export type CampaignContractDeliveryErrors = Partial<Record<keyof CampaignContractDeliveryValues, string>>;

/** Proveedor de donde se recoge la entrega y las fincas (por nombre) elegidas de él */
export interface DeliveryProviderSelection {
    proveedorId: number;
    fincas: string[];
}

/** Lo que se completa de una entrega programada para que salga a campo (ver `campaignDeliveryCoordination.utils.ts`) */
export interface DeliveryCoordination {
    carrierId: number;
    vehicleId: number;
    driverId: number;
    proveedores: DeliveryProviderSelection[];
    fechaInicio: string;
    fechaFin: string;
    condicionesCarga: string;
    observaciones: string;
}

export interface CampaignContractDeliveryLocal {
    id: number;
    fecha: string;
    kilosProgramados: number;
    destino: string;
    observaciones: string;
    /** `null` mientras la entrega no se haya coordinado */
    coordinacion: DeliveryCoordination | null;
}

export const EMPTY_CONTRACT_DELIVERY: CampaignContractDeliveryValues = {
    fecha: "",
    kilosProgramados: "",
    destino: "",
    observaciones: "",
};

export function validateContractDelivery(values: CampaignContractDeliveryValues): CampaignContractDeliveryErrors {
    const errors: CampaignContractDeliveryErrors = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.fecha)) errors.fecha = "Selecciona una fecha válida.";
    const kilos = Number(values.kilosProgramados);
    if (!values.kilosProgramados.trim() || !Number.isFinite(kilos) || kilos <= 0) errors.kilosProgramados = "Ingresa una cantidad mayor que cero.";
    if (!values.destino.trim()) errors.destino = "Ingresa el destino de la entrega.";
    return errors;
}

export function deliveryToValues(delivery: CampaignContractDeliveryLocal): CampaignContractDeliveryValues {
    return {
        fecha: delivery.fecha,
        kilosProgramados: String(delivery.kilosProgramados),
        destino: delivery.destino,
        observaciones: delivery.observaciones,
    };
}

