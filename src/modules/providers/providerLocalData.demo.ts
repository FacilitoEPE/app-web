import type { Finca } from "@/modules/providers/providerFinca.utils";
import type { CertificadoLocal } from "@/modules/providers/providerCertificado.utils";
import type { ProduccionProveedor } from "@/modules/providers/providerProduccion.utils";
import { demoPdf } from "@/shared/utils/demoData";

/**
 * Datos de demostración SOLO para desarrollo: llenan las vistas de fincas y certificados de los primeros
 * proveedores para revisar cómo se ven con información real (listas largas, nombres extensos, estados
 * vacíos) antes de que exista la API. Se cargan únicamente con `import.meta.env.DEV` (ver
 * `providerLocalData.store.ts`); en producción y en las pruebas el almacén arranca vacío.
 *
 * TODO(api): borrar este archivo cuando fincas y certificados vengan del backend.
 */

/** Cuántos proveedores (ids 1..N) reciben datos de demostración */
const DEMO_PROVIDERS = 24;

const FINCAS: Finca[] = [
    { nombre: "Fundo Tambogrande", codigoSenasa: "10452", codigoCatastral: "000123-45", departamento: "Piura", provincia: "Piura", distrito: "Tambogrande", latitud: -4.9299, longitud: -80.3423, haTotal: 25.5, haCultivo: 20, cultivos: [{ fruta: "Mango", variedades: ["Kent", "Edward", "Tommy Atkins"] }, { fruta: "Palta", variedades: ["Hass", "Fuerte"] }], edadCultivo: 8 },
    { nombre: "Fundo La Esperanza de San Miguel del Faique", codigoSenasa: "10877", departamento: "Piura", provincia: "Huancabamba", distrito: "San Miguel de El Faique", latitud: -5.2231, longitud: -79.4407, haTotal: 12, haCultivo: 9.5, cultivos: [{ fruta: "Palta", variedades: ["Hass"] }], edadCultivo: 4.5 },
    { nombre: "Fundo San Pedro", departamento: "Piura", provincia: "Sullana", distrito: "Lancones", latitud: null, longitud: null, haTotal: 8.25, haCultivo: 6, cultivos: [{ fruta: "Uva", variedades: ["Red Globe", "Crimson", "Autumn Royal", "Sweet Celebration"] }], edadCultivo: 3 },
    { nombre: "Fundo El Mirador", codigoSenasa: "11230", codigoCatastral: "002210-08", departamento: "Piura", provincia: "Sullana", distrito: "Querecotillo", latitud: -4.8337, longitud: -80.6409, haTotal: 30, haCultivo: 22.75, cultivos: [{ fruta: "Arándano", variedades: ["Biloxi", "Ventura"] }, { fruta: "Uva", variedades: ["Red Globe"] }, { fruta: "Mango", variedades: ["Kent"] }], edadCultivo: null },
    { nombre: "Fundo Santa Rosa", departamento: "Piura", provincia: "Morropón", distrito: "Chulucanas", latitud: -5.0945, longitud: -80.1618, haTotal: 5, haCultivo: 4 },
    { nombre: "Hacienda Los Mangos", codigoSenasa: "20418", codigoCatastral: "004501-77", departamento: "Lambayeque", provincia: "Lambayeque", distrito: "Mochumí", latitud: -6.5427, longitud: -79.8801, haTotal: 41.8, haCultivo: 35, cultivos: [{ fruta: "Mango", variedades: ["Kent", "Haden"] }], edadCultivo: 12 },
];

const CERTIFICADOS = [
    { nombre: "Certificado SENASA", fecha: "2026-04-18" },
    { nombre: "GlobalGAP", fecha: "2026-08-02" },
    { nombre: "Certificado de Producción Orgánica (SENASA)", fecha: "2025-11-30" },
    { nombre: "Registro Sanitario del Lugar de Producción", fecha: "2026-02-09" },
];

const PRODUCCION: ProduccionProveedor[] = [
    { estadoSanidad: "Registrado", frutas: [{ nombre: "Mango", variedades: ["Kent", "Edward", "Tommy Atkins"] }, { nombre: "Palta", variedades: ["Hass", "Fuerte"] }] },
    { estadoSanidad: "En proceso", frutas: [{ nombre: "Arándano", variedades: ["Biloxi", "Ventura", "Emerald", "Rocío"] }] },
    { estadoSanidad: "Sin registrar", frutas: [] },
    { estadoSanidad: "Registrado", frutas: [{ nombre: "Uva", variedades: ["Red Globe", "Crimson", "Autumn Royal", "Sweet Celebration"] }, { nombre: "Mango", variedades: ["Kent"] }, { nombre: "Palta", variedades: ["Hass"] }] },
];

/** Cantidad de fincas por proveedor: cubre vacío, una sola, pocas y más de las que caben en la tarjeta */
const FINCAS_PER_PROVIDER = [4, 1, 0, 2, 6, 3, 5];
/** Idem para certificados */
const CERTIFICADOS_PER_PROVIDER = [2, 0, 1, 4, 3, 1, 0];

export function createDemoProviderData(): {
    fincas: Record<number, Finca[]>;
    certificados: Record<number, CertificadoLocal[]>;
    produccion: Record<number, ProduccionProveedor>;
} {
    const fincas: Record<number, Finca[]> = {};
    const certificados: Record<number, CertificadoLocal[]> = {};
    const produccion: Record<number, ProduccionProveedor> = {};
    let certificadoId = 1;

    for (let providerId = 1; providerId <= DEMO_PROVIDERS; providerId++) {
        const slot = (providerId - 1) % FINCAS_PER_PROVIDER.length;
        produccion[providerId] = PRODUCCION[(providerId - 1) % PRODUCCION.length];
        fincas[providerId] = Array.from({ length: FINCAS_PER_PROVIDER[slot] }, (_, index) => FINCAS[(providerId + index) % FINCAS.length]);
        certificados[providerId] = Array.from({ length: CERTIFICADOS_PER_PROVIDER[slot] }, (_, index) => {
            const base = CERTIFICADOS[(providerId + index) % CERTIFICADOS.length];
            return {
                certificadoId: certificadoId++,
                nombre: base.nombre,
                fechaRevisionSenasa: base.fecha,
                documento: demoPdf(`${base.nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${providerId}`),
            };
        });
    }

    return { fincas, certificados, produccion };
}
