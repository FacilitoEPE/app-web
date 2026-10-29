import { beforeEach, describe, expect, it } from "vitest";
import {
    addCertificado,
    addFinca,
    removeFinca,
    updateFinca,
    getProviderLocalData,
    resetProviderLocalData,
    updateCertificado,
} from "@/modules/providers/providerLocalData.store";
import type { Finca } from "@/modules/providers/providerFinca.utils";

const finca = (nombre: string): Finca => ({
    nombre,
    departamento: "Piura",
    provincia: "Piura",
    distrito: "Tambogrande",
    latitud: null,
    longitud: null,
    haTotal: 10,
    haCultivo: 8,
});

describe("providerLocalData.store", () => {
    beforeEach(() => resetProviderLocalData());

    it("agrega fincas por proveedor, en el orden en que se registran", async () => {
        await addFinca(1, finca("Fundo A"));
        await addFinca(1, finca("Fundo B"));
        await addFinca(2, finca("Fundo C"));
        const { fincas } = getProviderLocalData();
        expect(fincas[1].map((item) => item.nombre)).toEqual(["Fundo A", "Fundo B"]);
        expect(fincas[2].map((item) => item.nombre)).toEqual(["Fundo C"]);
    });

    it("entrega un estado nuevo en cada cambio, para que los componentes se actualicen", async () => {
        const before = getProviderLocalData();
        await addFinca(5, finca("Fundo Z"));
        expect(getProviderLocalData()).not.toBe(before);
        expect(before.fincas[5]).toBeUndefined();
    });

    it("no mezcla datos entre proveedores", async () => {
        await addFinca(1, finca("Fundo 1"));
        expect(getProviderLocalData().fincas[2]).toBeUndefined();
    });

    it("edita y quita fincas por posición, sin tocar las demás ni otros proveedores", async () => {
        await addFinca(1, finca("Fundo A"));
        await addFinca(1, finca("Fundo B"));
        await addFinca(2, finca("Fundo C"));

        await updateFinca(1, 0, { ...finca("Fundo A2"), haTotal: 99 });
        expect(getProviderLocalData().fincas[1].map((item) => item.nombre)).toEqual(["Fundo A2", "Fundo B"]);
        expect(getProviderLocalData().fincas[1][0].haTotal).toBe(99);

        await removeFinca(1, 0);
        expect(getProviderLocalData().fincas[1].map((item) => item.nombre)).toEqual(["Fundo B"]);
        expect(getProviderLocalData().fincas[2]).toHaveLength(1);

        await removeFinca(1, 7);
        await updateFinca(1, -1, finca("Nada"));
        expect(getProviderLocalData().fincas[1]).toHaveLength(1);
    });

    it("registra certificados con el más reciente primero y conserva el documento al editar sin uno nuevo", async () => {
        await addCertificado(1, { nombre: "SENASA", fechaRevisionSenasa: "2025-04-18" }, new File(["a"], "a.pdf"));
        await addCertificado(1, { nombre: "GlobalGAP", fechaRevisionSenasa: "2025-05-01" }, new File(["b"], "b.pdf"));
        const [recent] = getProviderLocalData().certificados[1];
        expect(recent.nombre).toBe("GlobalGAP");

        await updateCertificado(1, recent.certificadoId, { nombre: " GlobalGAP 2 ", fechaRevisionSenasa: "2025-06-01" });
        const [edited, older] = getProviderLocalData().certificados[1];
        expect(edited).toMatchObject({ nombre: "GlobalGAP 2", fechaRevisionSenasa: "2025-06-01", documento: expect.objectContaining({ name: "b.pdf" }) });
        expect(older.documento?.name).toBe("a.pdf");
    });
});
