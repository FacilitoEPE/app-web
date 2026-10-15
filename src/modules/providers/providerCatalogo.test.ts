import { describe, expect, it } from "vitest";
import { toCultivos, toFrutasProveedor } from "@/modules/providers/providerCatalogo";

describe("toCultivos / toFrutasProveedor", () => {
    it("traduce del id del catálogo al nombre y de vuelta sin perder variedades", () => {
        const frutas = [{ frutaId: "mango", variedades: ["Kent", "Edward"] }, { frutaId: "palta", variedades: [] }];
        const cultivos = toCultivos(frutas);
        expect(cultivos).toEqual([{ fruta: "Mango", variedades: ["Kent", "Edward"] }, { fruta: "Palta", variedades: [] }]);
        expect(toFrutasProveedor(cultivos)).toEqual(frutas);
    });

    it("descarta las frutas que no están en el catálogo", () => {
        expect(toCultivos([{ frutaId: "kiwi", variedades: ["Hayward"] }])).toEqual([]);
        expect(toFrutasProveedor([{ fruta: "Kiwi", variedades: [] }])).toEqual([]);
    });
});
