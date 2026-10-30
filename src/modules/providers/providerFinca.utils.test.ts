import { describe, expect, it } from "vitest";
import { EMPTY_FINCA, fincaToFormValues, toFinca, validateFinca, validateFincaCultivo, type FincaFormValues } from "@/modules/providers/providerFinca.utils";

const values = (overrides: Partial<FincaFormValues> = {}): FincaFormValues => ({
    ...EMPTY_FINCA,
    nombre: "Fundo Tambogrande",
    departamento: "Piura",
    provincia: "Piura",
    distrito: "Tambogrande",
    haTotal: "20",
    haCultivo: "12.5",
    cultivos: [{ fruta: "Mango", variedades: ["Kent"] }],
    ...overrides,
});

describe("validateFinca", () => {
    it("exige ambas coordenadas para V1 y acepta valores válidos", () => {
        expect(validateFinca(values(), [], true)).toMatchObject({ latitud: "Ingresa la latitud.", longitud: "Ingresa la longitud." });
        expect(validateFinca(values({ latitud: "-5.2", longitud: "-80.6" }), [], true)).toEqual({});
    });
    it("acepta una finca completa sin coordenadas", () => {
        expect(validateFinca(values())).toEqual({});
    });

    it("exige nombre, ubicación y hectáreas", () => {
        const errors = validateFinca(EMPTY_FINCA);
        expect(Object.keys(errors).sort()).toEqual(["departamento", "distrito", "haCultivo", "haTotal", "nombre", "provincia"]);
    });

    it("los cultivos se validan aparte: al menos una fruta y variedades en cada una", () => {
        expect(validateFincaCultivo({ cultivos: [] }).cultivos).toBeDefined();
        expect(validateFincaCultivo({ cultivos: [{ fruta: "Mango", variedades: [] }] }).cultivos).toContain("Mango");
        expect(validateFincaCultivo({ cultivos: [{ fruta: "Mango", variedades: ["Kent"] }, { fruta: "Uva", variedades: [] }] }).cultivos).toContain("Uva");
        expect(validateFincaCultivo({ cultivos: [{ fruta: "Mango", variedades: ["Kent", "Edward"] }, { fruta: "Palta", variedades: ["Hass"] }] })).toEqual({});
    });

    it("los códigos y la edad del cultivo son opcionales, pero la edad debe ser un rango válido", () => {
        expect(validateFinca(values({ codigoSenasa: "", codigoCatastral: "", edadCultivo: "" }))).toEqual({});
        expect(validateFinca(values({ edadCultivo: "7.5" }))).toEqual({});
        expect(validateFinca(values({ edadCultivo: "-1" })).edadCultivo).toBeDefined();
        expect(validateFinca(values({ edadCultivo: "150" })).edadCultivo).toBeDefined();
        expect(validateFinca(values({ codigoSenasa: "x".repeat(51) })).codigoSenasa).toBeDefined();
    });

    it("no permite repetir el nombre de una finca del mismo proveedor", () => {
        expect(validateFinca(values({ nombre: "  fundo TAMBOGRANDE " }), ["Fundo Tambogrande"]).nombre).toBeDefined();
        expect(validateFinca(values({ nombre: "Fundo Sullana" }), ["Fundo Tambogrande"]).nombre).toBeUndefined();
    });

    it("valida el rango de las coordenadas solo cuando se escriben", () => {
        expect(validateFinca(values({ latitud: "-5.19", longitud: "-80.63" }))).toEqual({});
        const errors = validateFinca(values({ latitud: "91", longitud: "-181" }));
        expect(errors.latitud).toBeDefined();
        expect(errors.longitud).toBeDefined();
    });

    it("no permite más hectáreas de cultivo que hectáreas totales", () => {
        expect(validateFinca(values({ haTotal: "10", haCultivo: "10.5" })).haCultivo).toBeDefined();
        expect(validateFinca(values({ haTotal: "10", haCultivo: "10" })).haCultivo).toBeUndefined();
    });

    it("exige hectáreas totales mayores a cero", () => {
        expect(validateFinca(values({ haTotal: "0", haCultivo: "0" })).haTotal).toBeDefined();
    });
});

describe("fincaToFormValues", () => {
    it("es la inversa de toFinca", () => {
        const form = values({ nombre: "Fundo Norte", latitud: "-5.2", longitud: "-80.1", codigoSenasa: "10452", cultivos: [{ fruta: "Mango", variedades: ["Kent", "Edward"] }, { fruta: "Palta", variedades: ["Hass"] }], edadCultivo: "6" });
        expect(fincaToFormValues(toFinca(form))).toEqual(form);
    });

    it("una finca sin los campos nuevos (p. ej. de una entrevista) llena el formulario con vacíos", () => {
        const form = fincaToFormValues({ nombre: "Fundo A", departamento: "Piura", provincia: "Piura", distrito: "X", latitud: null, longitud: null, haTotal: 10, haCultivo: 8 });
        expect(form).toMatchObject({ codigoSenasa: "", cultivos: [], edadCultivo: "", latitud: "" });
    });
});

describe("toFinca", () => {
    it("recorta textos y convierte números, dejando en null las coordenadas vacías", () => {
        expect(toFinca(values({ nombre: "  Fundo Norte ", latitud: "-5.2", codigoSenasa: " 10452 ", edadCultivo: "6" }))).toEqual({
            nombre: "Fundo Norte",
            codigoSenasa: "10452",
            codigoCatastral: "",
            departamento: "Piura",
            provincia: "Piura",
            distrito: "Tambogrande",
            latitud: -5.2,
            longitud: null,
            haTotal: 20,
            haCultivo: 12.5,
            cultivos: [{ fruta: "Mango", variedades: ["Kent"] }],
            edadCultivo: 6,
        });
    });
});
