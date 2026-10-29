import { beforeEach, describe, expect, it } from "vitest";
import {
    addCampaignCertificate,
    addCertificateExpansion,
    addCertificatePayment,
    getCampaignCertificates,
    resetCampaignCertificates,
    updateCampaignCertificate,
} from "@/modules/campaigns/campaignCertificates.store";
import {
    EMPTY_CERTIFICADO_CAMPANA,
    getEstadoPago,
    getKilosTotales,
    getSaldoPendiente,
    validateAmpliacion,
    validatePago,
    type CertificadoCampanaFormValues,
} from "@/modules/campaigns/campaignCertificate.utils";

const values = (overrides: Partial<CertificadoCampanaFormValues> = {}): CertificadoCampanaFormValues => ({
    ...EMPTY_CERTIFICADO_CAMPANA,
    tipo: "Global GAP",
    nombre: " GlobalGAP Mango ",
    organismoEmisor: "SGS Perú",
    costo: "1000",
    kilosIniciales: "500",
    ...overrides,
});

const noFiles = { documento: null, cotizacion: null };

describe("campaignCertificates.store", () => {
    beforeEach(() => resetCampaignCertificates());

    it("registra una única certificación por campaña con los textos recortados", async () => {
        await addCampaignCertificate(1, values({ nombre: "Primera" }), [], noFiles);
        await addCampaignCertificate(1, values({ nombre: " Segunda ", kilosIniciales: "3500" }), [{ id: "9", nombre: "María", kilos: 3500 }], noFiles);
        await addCampaignCertificate(2, values({ nombre: "Otra campaña" }), [], noFiles);

        const campaign1 = getCampaignCertificates(1);
        expect(campaign1.map((item) => item.nombre)).toEqual(["Segunda"]);
        expect(campaign1[0].productores).toEqual([{ id: "9", nombre: "María", kilos: 3500 }]);
        expect(campaign1[0]).toMatchObject({ costo: 1000, kilosIniciales: 3500, ampliaciones: [], pagos: [] });
        expect(getCampaignCertificates(2)).toHaveLength(1);
    });

    it("al editar conserva los documentos si no se eligen nuevos", async () => {
        const document = new File(["a"], "a.pdf");
        await addCampaignCertificate(1, values(), [], { documento: document, cotizacion: null });
        const [created] = getCampaignCertificates(1);

        await updateCampaignCertificate(1, created.id, values({ nombre: "Renombrada", costo: "1200" }), [], noFiles);
        const [edited] = getCampaignCertificates(1);
        expect(edited).toMatchObject({ nombre: "Renombrada", costo: 1200 });
        expect(edited.documento).toBe(document);

        const replacement = new File(["b"], "b.pdf");
        await updateCampaignCertificate(1, created.id, values(), [], { documento: replacement, cotizacion: null });
        expect(getCampaignCertificates(1)[0].documento).toBe(replacement);
    });

    it("suma ampliaciones a los kilos y acumula pagos hasta saldar", async () => {
        await addCampaignCertificate(1, values(), [], noFiles);
        const id = getCampaignCertificates(1)[0].id;

        await addCertificateExpansion(1, id, { kilos: "250.5", fecha: "2026-06-01", referencia: "" });
        await addCertificatePayment(1, id, { monto: "400", fecha: "2026-06-02", referencia: "OP-1" }, null);

        let certificate = getCampaignCertificates(1)[0];
        expect(getKilosTotales(certificate)).toBe(750.5);
        expect(getSaldoPendiente(certificate)).toBe(600);
        expect(getEstadoPago(certificate)).toBe("Parcial");

        await addCertificatePayment(1, id, { monto: "600", fecha: "2026-06-03", referencia: "" }, null);
        certificate = getCampaignCertificates(1)[0];
        expect(getEstadoPago(certificate)).toBe("Pagado");
        expect(certificate.pagos).toHaveLength(2);
    });
});

describe("validaciones de ampliación y pago", () => {
    it("la ampliación pide kilos mayores a 0 y fecha", () => {
        expect(Object.keys(validateAmpliacion({ kilos: "", fecha: "", referencia: "" })).sort()).toEqual(["fecha", "kilos"]);
        expect(validateAmpliacion({ kilos: "0", fecha: "2026-06-01", referencia: "" }).kilos).toBeDefined();
        expect(validateAmpliacion({ kilos: "120.5", fecha: "2026-06-01", referencia: "" })).toEqual({});
    });

    it("el pago no puede superar el saldo pendiente", () => {
        expect(validatePago({ monto: "300", fecha: "2026-06-01", referencia: "" }, 250).monto).toBeDefined();
        expect(validatePago({ monto: "250", fecha: "2026-06-01", referencia: "" }, 250)).toEqual({});
        expect(validatePago({ monto: "10", fecha: "2026-06-01", referencia: "" }, 0).monto).toBeDefined();
    });

    it("sin costo no hay estado de pago que seguir", () => {
        expect(getEstadoPago({ costo: 0, pagos: [] })).toBe("Sin costo");
        expect(getEstadoPago({ costo: 100, pagos: [] })).toBe("Pendiente");
    });
});
