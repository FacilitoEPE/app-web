import { describe, expect, it } from "vitest";
import type { CampaignContractDeliveryLocal } from "@/modules/campaigns/campaignContractDelivery.utils";
import {
    EMPTY_COORDINATION,
    coordinationToValues,
    hasCoordinationErrors,
    listCampaignDeliveries,
    toCoordination,
    validateCoordination,
    type DeliveryCoordinationValues,
} from "@/modules/campaigns/campaignDeliveryCoordination.utils";

const delivery = (id: number, fecha: string): CampaignContractDeliveryLocal => ({ id, fecha, kilosProgramados: 500, destino: "Callao", observaciones: "", coordinacion: null });

const valid: DeliveryCoordinationValues = {
    ...EMPTY_COORDINATION,
    carrierId: "2",
    vehicleId: "3",
    driverId: "4",
    proveedores: { 7: ["Fundo San Pedro"] },
    fechaInicio: "2026-10-20",
    fechaFin: "2026-10-21",
    condicionesCarga: "  Cajas de 4 kg ",
};

describe("listCampaignDeliveries", () => {
    it("reúne las entregas de todos los contratos de la campaña, por fecha, y deja fuera otras campañas", () => {
        const entries = listCampaignDeliveries({ "1:1:1": [delivery(1, "2026-10-25")], "1:2:3": [delivery(2, "2026-10-12")], "2:1:1": [delivery(3, "2026-10-01")] }, 1);
        expect(entries.map((entry) => entry.key)).toEqual(["2:3:2", "1:1:1"]);
    });
});

describe("validateCoordination", () => {
    it("acepta una coordinación completa", () => {
        expect(hasCoordinationErrors(validateCoordination(valid))).toBe(false);
    });

    it("pide transporte, proveedor y fechas", () => {
        const errors = validateCoordination(EMPTY_COORDINATION);
        expect(Object.keys(errors).sort()).toEqual(["carrierId", "driverId", "fechaFin", "fechaInicio", "proveedores", "vehicleId"]);
    });

    it("exige al menos una finca por cada proveedor elegido", () => {
        expect(validateCoordination({ ...valid, proveedores: { 7: ["Fundo San Pedro"], 9: [] } }).sinFinca).toEqual([9]);
    });

    it("no admite un fin anterior al inicio", () => {
        expect(validateCoordination({ ...valid, fechaFin: "2026-10-19" }).fechaFin).toBeDefined();
    });
});

describe("toCoordination y coordinationToValues", () => {
    it("convierte los valores del formulario y vuelven a los mismos valores", () => {
        const coordination = toCoordination(valid);
        expect(coordination).toMatchObject({ carrierId: 2, vehicleId: 3, driverId: 4, condicionesCarga: "Cajas de 4 kg", proveedores: [{ proveedorId: 7, fincas: ["Fundo San Pedro"] }] });
        const entry = { key: "1:1:1", relationId: 1, contractId: 1, delivery: { ...delivery(1, "2026-10-25"), coordinacion: coordination } };
        expect(coordinationToValues(entry)).toEqual({ ...valid, condicionesCarga: "Cajas de 4 kg" });
    });

    it("una entrega sin datos de transporte abre el formulario vacío", () => {
        const entry = { key: "1:1:1", relationId: 1, contractId: 1, delivery: delivery(1, "2026-10-25") };
        expect(coordinationToValues(entry)).toEqual(EMPTY_COORDINATION);
    });
});
