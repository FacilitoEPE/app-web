import type { CarrierExtras } from "@/modules/carriers/carrierProfile.utils";

/**
 * Datos nuevos de transportistas de demostración SOLO para desarrollo (ids de la base de desarrollo): llenan el
 * tipo, el MTC y la ubicación que el backend todavía no guarda, para revisar el detalle, la tabla y la vinculación a
 * campañas sin "No registrado". Cuatro empresas públicas y un independiente (privado), que usa campos distintos.
 * Se cargan únicamente con `import.meta.env.DEV` (ver `carrierExtras.store.ts`); en producción y en las pruebas el
 * almacén arranca vacío.
 *
 * TODO(api): borrar este archivo cuando el backend modele estos datos.
 */
export function createDemoCarrierExtras(): Record<number, CarrierExtras> {
    return {
        1: { tipo: "publico", mtc: "1542870-CNG", cgn: "", documento: "", departamento: "Piura", provincia: "Sullana", ciudad: "Sullana" },
        2: { tipo: "publico", mtc: "2087115-CNG", cgn: "", documento: "", departamento: "Lima", provincia: "Lima", ciudad: "Lima" },
        3: { tipo: "publico", mtc: "1963044-CNG", cgn: "", documento: "", departamento: "Callao", provincia: "Callao", ciudad: "Callao" },
        4: { tipo: "publico", mtc: "1879320-CNG", cgn: "", documento: "", departamento: "La Libertad", provincia: "Trujillo", ciudad: "Trujillo" },
        5: { tipo: "privado", mtc: "0987412-CNG", cgn: "CGN-20931", documento: "45678912", departamento: "Piura", provincia: "Piura", ciudad: "Piura" },
    };
}
