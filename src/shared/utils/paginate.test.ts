import { describe, expect, it } from "vitest";
import { paginate } from "@/shared/utils/paginate";

describe("paginate", () => {
    const items = Array.from({ length: 19 }, (_, index) => index + 1);

    it("entrega la página pedida y cuántas hay", () => {
        expect(paginate(items, 2)).toEqual({ pageCount: 3, currentPage: 2, offset: 8, visible: [9, 10, 11, 12, 13, 14, 15, 16] });
    });

    it("ajusta una página fuera de rango a la última que existe", () => {
        expect(paginate(items, 9).currentPage).toBe(3);
        expect(paginate([], 4)).toEqual({ pageCount: 1, currentPage: 1, offset: 0, visible: [] });
    });
});
