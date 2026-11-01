/**
 * Transportistas vinculados a una campaña y su acuerdo de pago.
 *
 * TODO(api): el backend todavía no tiene un servicio de transportistas por campaña. Mientras tanto el vínculo, su
 * cotización y el acuerdo viven en memoria (ver `campaignCarriers.store.ts`). Los datos del transportista no se
 * copian: se leen de Gestión de Transporte por `carrierId`, así siempre están al día.
 */

export type PaymentType = "unico" | "adelanto";

/** Palabras pensadas para quien registra: "único" y "con adelanto" se entienden sin explicación */
export const PAYMENT_TYPES: { value: PaymentType; label: string; hint: string }[] = [
    { value: "unico", label: "Pago único", hint: "Se paga todo de una sola vez." },
    { value: "adelanto", label: "Con adelanto", hint: "Se paga una parte ahora y el saldo después." },
];

/** Lo que se acordó con el transportista para esta campaña; el pago efectivo se registra en Liquidación de compra */
export interface CarrierPaymentAgreement {
    tipo: PaymentType;
    moneda: string;
    total: number;
    /** Solo en "Con adelanto" */
    adelanto: number | null;
    /** Solo en "Con adelanto": cuándo se entrega el adelanto (yyyy-MM-dd) */
    fechaAdelanto: string;
    /** Fecha de pago (final) (yyyy-MM-dd) */
    fechaPago: string;
    boleta: File | null;
    /** Solo en "Con adelanto": el saldo ya se pagó y el acuerdo quedó cerrado */
    saldoPagado: boolean;
}

export interface CampaignCarrierLink {
    id: number;
    carrierId: number;
    /** yyyy-MM-dd */
    fechaVinculacion: string;
    cotizacion: File | null;
    acuerdo: CarrierPaymentAgreement | null;
}

export interface AgreementFormValues {
    tipo: PaymentType;
    moneda: string;
    total: string;
    adelanto: string;
    fechaAdelanto: string;
    fechaPago: string;
}

export type AgreementErrors = Partial<Record<keyof AgreementFormValues, string>>;

export const EMPTY_AGREEMENT: AgreementFormValues = {
    tipo: "unico",
    moneda: "PEN",
    total: "",
    adelanto: "",
    fechaAdelanto: "",
    fechaPago: "",
};

export type AgreementStatus = "Sin registrar" | "Pago único" | "Con adelanto" | "Pagado";

/** Estado del acuerdo, el que se muestra en la tabla */
export function getAgreementStatus(agreement: CarrierPaymentAgreement | null): AgreementStatus {
    if (!agreement) return "Sin registrar";
    if (agreement.tipo === "unico") return "Pago único";
    return agreement.saldoPagado ? "Pagado" : "Con adelanto";
}

/** Una vez registrado el acuerdo de pago, ya no es editable: solo se consulta */
export const isAgreementClosed = (agreement: CarrierPaymentAgreement | null) =>
    agreement !== null;

/** Lo que falta por pagar: el total menos el adelanto, nunca negativo */
export function getAgreementBalance(total: number, adelanto: number | null): number {
    return Math.max(0, Math.round((total - (adelanto ?? 0)) * 100) / 100);
}

const toPositive = (value: string) => {
    const number = Number(value.trim());
    return value.trim() !== "" && Number.isFinite(number) && number > 0 ? number : null;
};

export function validateAgreement(values: AgreementFormValues): AgreementErrors {
    const errors: AgreementErrors = {};
    const total = toPositive(values.total);
    if (!values.moneda) errors.moneda = "Selecciona la moneda.";
    if (total === null) errors.total = "Ingresa una cantidad total mayor que 0.";

    if (values.tipo === "adelanto") {
        const adelanto = toPositive(values.adelanto);
        if (adelanto === null) errors.adelanto = "Ingresa el monto del adelanto.";
        else if (total !== null && adelanto >= total) errors.adelanto = "El adelanto debe ser menor que el total.";
        if (!values.fechaAdelanto) errors.fechaAdelanto = "Indica la fecha del adelanto.";
        if (!values.fechaPago) errors.fechaPago = "Indica la fecha de pago (final).";
        else if (values.fechaAdelanto && values.fechaPago < values.fechaAdelanto) errors.fechaPago = "Debe ser igual o posterior al adelanto.";
    } else if (!values.fechaPago) {
        errors.fechaPago = "Indica la fecha de pago (final).";
    }

    return errors;
}

/** Del formulario al acuerdo guardado. El comprobante solo aplica cuando se registra con adelanto. */
export function toAgreement(values: AgreementFormValues, boleta: File | null, saldoPagado = false): CarrierPaymentAgreement {
    const isAdvance = values.tipo === "adelanto";
    return {
        tipo: values.tipo,
        moneda: values.moneda,
        total: Number(values.total),
        adelanto: isAdvance ? Number(values.adelanto) : null,
        fechaAdelanto: isAdvance ? values.fechaAdelanto : "",
        fechaPago: values.fechaPago,
        boleta: isAdvance ? boleta : null,
        saldoPagado: isAdvance && saldoPagado,
    };
}

/** Del acuerdo guardado al formulario */
export function toAgreementValues(agreement: CarrierPaymentAgreement | null): AgreementFormValues {
    if (!agreement) return EMPTY_AGREEMENT;
    return {
        tipo: agreement.tipo,
        moneda: agreement.moneda,
        total: String(agreement.total),
        adelanto: agreement.adelanto === null ? "" : String(agreement.adelanto),
        fechaAdelanto: agreement.fechaAdelanto,
        fechaPago: agreement.fechaPago,
    };
}
