import { describe, expect, it } from "vitest";
import {
    EMPTY_DRIVER,
    EMPTY_VEHICLE,
    toDriverInput,
    toVehicleInput,
    validateDriver,
    validateVehicle,
    type VehicleFormValues,
} from "@/modules/carriers/carrierRecords.utils";

const vehicle: VehicleFormValues = {
    placa: "ABC-123",
    ancho: "2.4",
    altura: "2.6",
    profundidad: "12",
    volumen: "70",
    pesoNeto: "8",
    pesoBruto: "20",
};

describe("validateVehicle", () => {
    it("acepta un vehículo completo", () => {
        expect(validateVehicle(vehicle)).toEqual({});
    });

    it("marca como obligatorios la placa, las medidas, el volumen y los pesos", () => {
        expect(Object.keys(validateVehicle(EMPTY_VEHICLE)).sort()).toEqual(
            ["altura", "ancho", "pesoBruto", "pesoNeto", "placa", "profundidad", "volumen"],
        );
    });

    it("el volumen es un dato propio: no depende de las tres medidas", () => {
        // 2.4 × 2.6 × 12 ≈ 74.9, pero el volumen declarado es otro y es válido
        expect(validateVehicle({ ...vehicle, volumen: "60" })).toEqual({});
        expect(validateVehicle({ ...vehicle, volumen: "" }).volumen).toBeDefined();
    });

    it("rechaza ceros, negativos y textos no numéricos", () => {
        expect(validateVehicle({ ...vehicle, ancho: "0" }).ancho).toBeDefined();
        expect(validateVehicle({ ...vehicle, altura: "-1" }).altura).toBeDefined();
        expect(validateVehicle({ ...vehicle, volumen: "abc" }).volumen).toBeDefined();
    });

    it("el peso bruto no puede ser menor al neto", () => {
        expect(validateVehicle({ ...vehicle, pesoNeto: "10", pesoBruto: "8" }).pesoBruto).toBeDefined();
        expect(validateVehicle({ ...vehicle, pesoNeto: "8", pesoBruto: "8" })).toEqual({});
    });
});

describe("validateDriver", () => {
    it("exige nombre, documento, licencia, teléfono y correo", () => {
        expect(Object.keys(validateDriver(EMPTY_DRIVER)).sort()).toEqual([
            "correo",
            "nombre",
            "numeroDocumento",
            "numeroLicencia",
            "telefono",
        ]);
    });

    it("valida el formato del correo", () => {
        const base = {
            ...EMPTY_DRIVER,
            nombre: "Luis",
            numeroDocumento: "12345678",
            numeroLicencia: "Q12345678",
            telefono: "999",
        };
        expect(validateDriver({ ...base, correo: "luis" }).correo).toBeDefined();
        expect(validateDriver({ ...base, correo: "luis@mail.com" })).toEqual({});
    });
});

describe("toVehicleInput", () => {
    it("envía el volumen tal como se escribió, sin recalcularlo", () => {
        const input = toVehicleInput({ ...vehicle, volumen: "60" });
        expect(input.volumen).toBe(60);
        expect(input.ancho).toBe(2.4);
    });
});

describe("toDriverInput", () => {
    it("envía los datos del chofer con sus documentos y licencia", () => {
        const input = toDriverInput({
            nombre: "Luis Pérez",
            tipoDocumento: "DNI",
            numeroDocumento: "45871236",
            numeroLicencia: "Q45871236",
            telefono: "987654321",
            correo: "luis@example.com",
        });
        expect(input).toEqual({
            nombre: "Luis Pérez",
            tipoDocumento: "DNI",
            numeroDocumento: "45871236",
            numeroLicencia: "Q45871236",
            telefono: "987654321",
            correo: "luis@example.com",
        });
    });
});
