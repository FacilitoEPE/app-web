import { usesV1 } from '@/shared/api/data-contract';
export const CONTRACT_CURRENCIES = [
    { value: "USD", label: "USD · Dólar", symbol: "$" },
    { value: "PEN", label: "PEN · Sol", symbol: "S/" },
    { value: "EUR", label: "EUR · Euro", symbol: "€" },
];

export interface CampaignClientContractValues {
    precioKg: string;
    moneda: string;
    cantidadPropuestaKg: string;
    condicionesPago: string;
    condicionesEntrega: string;
    observaciones: string;
}

export type CampaignClientContractErrors = Partial<Record<keyof CampaignClientContractValues | "archivo", string>>;

export interface CampaignClientContractLocal {
    id: number;
    fechaRegistro: string;
    precioKg: number;
    moneda: string;
    cantidadPropuestaKg: number;
    condicionesPago: string;
    condicionesEntrega: string;
    observaciones: string;
    archivo: File | null;
}

export const EMPTY_CAMPAIGN_CLIENT_CONTRACT: CampaignClientContractValues = {
    precioKg: "",
    moneda: "USD",
    cantidadPropuestaKg: "",
    condicionesPago: "",
    condicionesEntrega: "",
    observaciones: "",
};

function positiveNumber(value: string, decimals: number) {
    const text = value.trim();
    if (!new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`).test(text)) return null;
    const number = Number(text);
    return number > 0 ? number : null;
}

export function validateCampaignClientContract(values: CampaignClientContractValues, archivo: File | null, hasExistingFile = false): CampaignClientContractErrors {
    const errors: CampaignClientContractErrors = {};
    if (positiveNumber(values.precioKg, 4) === null) errors.precioKg = "Ingresa un precio mayor que cero.";
    if (!CONTRACT_CURRENCIES.some((item) => item.value === values.moneda)) errors.moneda = "Selecciona una moneda.";
    if (positiveNumber(values.cantidadPropuestaKg, 3) === null) errors.cantidadPropuestaKg = "Ingresa una cantidad mayor que cero.";
    if (!values.condicionesPago.trim()) errors.condicionesPago = "Ingresa las condiciones de pago.";
    if (!values.condicionesEntrega.trim()) errors.condicionesEntrega = "Ingresa las condiciones de entrega.";
    if (!usesV1() && !archivo && !hasExistingFile) errors.archivo = "Adjunta el contrato.";
    return errors;
}

export function contractToValues(contract: CampaignClientContractLocal): CampaignClientContractValues {
    return {
        precioKg: String(contract.precioKg),
        moneda: contract.moneda,
        cantidadPropuestaKg: String(contract.cantidadPropuestaKg),
        condicionesPago: contract.condicionesPago,
        condicionesEntrega: contract.condicionesEntrega,
        observaciones: contract.observaciones,
    };
}

