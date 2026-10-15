import type { CarrierExtras } from "@/modules/carriers/carrierProfile.utils";

/**
 * Datos nuevos de transportistas de demostración SOLO para desarrollo (ids de la base de desarrollo): llenan el
 * MTC y la ubicación que el backend todavía no guarda, para revisar el detalle y la tabla sin "No registrado".
 * Uno público y uno independiente (privado), que usan campos distintos. Se cargan únicamente con
 * `import.meta.env.DEV` (ver `carrierExtras.store.ts`); en producción y en las pruebas el almacén arranca vacío.
 *
 * TODO(api): borrar este archivo cuando el backend modele estos datos.
 */
export function createDemoCarrierExtras(): Record<number, CarrierExtras> {
    return {
        1: { tipo: "publico", mtc: "1542870-CNG", cgn: "", documento: "", departamento: "Piura", provincia: "Sullana", ciudad: "Sullana" },
        2: { tipo: "privado", mtc: "0987412-CNG", cgn: "CGN-20931", documento: "45871236", departamento: "Lambayeque", provincia: "Chiclayo", ciudad: "Chiclayo" },
    };
}
