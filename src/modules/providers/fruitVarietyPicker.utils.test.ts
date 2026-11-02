import { describe, expect, it } from "vitest";
import { updateFruitVarieties } from "@/modules/providers/fruitVarietyPicker.utils";

describe("updateFruitVarieties", () => {
    it("agrega la fruta al seleccionar su primera variedad y la quita al desmarcar la última", () => {
        const selected = updateFruitVarieties([], "Mango", ["Kent"], false);
        expect(selected).toEqual([{ fruta: "Mango", variedades: ["Kent"] }]);
        expect(updateFruitVarieties(selected, "Mango", [], false)).toEqual([]);
    });

    it("mantiene otras frutas y actualiza solo las variedades de la fruta activa", () => {
        const value = [{ fruta: "Mango", variedades: ["Kent"] }, { fruta: "Uva", variedades: ["Red Globe"] }];
        expect(updateFruitVarieties(value, "Mango", ["Kent", "Edward"], false)).toEqual([
            { fruta: "Mango", variedades: ["Kent", "Edward"] },
            value[1],
        ]);
    });

    it("descarta selecciones antiguas sin variedades al cambiar otra fruta", () => {
        const value = [{ fruta: "Mango", variedades: [] }, { fruta: "Uva", variedades: ["Red Globe"] }];
        expect(updateFruitVarieties(value, "Uva", ["Red Globe", "Crimson"], false)).toEqual([
            { fruta: "Uva", variedades: ["Red Globe", "Crimson"] },
        ]);
    });

    it("en modo de cultivo único reemplaza la fruta solo al elegir una variedad", () => {
        const mango = [{ fruta: "Mango", variedades: ["Kent"] }];
        expect(updateFruitVarieties(mango, "Uva", ["Red Globe"], true)).toEqual([{ fruta: "Uva", variedades: ["Red Globe"] }]);
        expect(updateFruitVarieties(mango, "Mango", ["Kent", "Edward"], true)).toEqual([{ fruta: "Mango", variedades: ["Edward"] }]);
    });
});
