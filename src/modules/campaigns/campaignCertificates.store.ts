import { useSyncExternalStore } from "react";
import type {
    AmpliacionFormValues,
    CertificadoCampanaFormValues,
    CertificadoCampanaLocal,
    PagoFormValues,
    ProductorCubierto,
} from "@/modules/campaigns/campaignCertificate.utils";
import { parseNonNegative } from "@/modules/campaigns/campaignCertificate.utils";
import { createDemoCampaignCertificates } from "@/modules/campaigns/campaignCertificates.demo";

/**
 * Certificaciones de campaña (con sus ampliaciones y pagos), en memoria y por campaña.
 *
 * TODO(api): se pierden al recargar la página y viven acá, y no dentro de un componente, para que sobrevivan
 * al navegar entre la lista de campañas, su detalle y la gestión de certificaciones. Cuando exista el
 * servicio, este es el único archivo a reemplazar: las funciones de escritura pasan a llamar a la API y
 * `useCampaignCertificates` a leer lo que ella devuelva. Modelos y reglas: `campaignCertificate.utils.ts`.
 *
 * En desarrollo arranca con datos de demostración (`campaignCertificates.demo.ts`); en producción y en las
 * pruebas arranca vacío, sin simular respuestas del backend.
 */
const useDemoData = import.meta.env.DEV && import.meta.env.MODE !== "test";

let byCampaign: Record<number, CertificadoCampanaLocal[]> = useDemoData ? createDemoCampaignCertificates() : {};
let nextId = 1 + Math.max(0, ...Object.values(byCampaign).flat().flatMap((item) => [item.id, ...item.ampliaciones.map((a) => a.id), ...item.pagos.map((p) => p.id)]));
const listeners = new Set<() => void>();
const EMPTY: CertificadoCampanaLocal[] = [];

function update(next: Record<number, CertificadoCampanaLocal[]>) {
    byCampaign = next;
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function replaceCertificate(campaniaId: number, certificadoId: number, change: (item: CertificadoCampanaLocal) => CertificadoCampanaLocal) {
    const current = byCampaign[campaniaId] ?? EMPTY;
    update({ ...byCampaign, [campaniaId]: current.map((item) => (item.id === certificadoId ? change(item) : item)) });
}

/** Archivos elegidos en el formulario; al editar, `null` conserva el documento que ya tenía */
export interface CertificadoArchivos {
    documento: File | null;
    cotizacion: File | null;
}

function toLocal(id: number, values: CertificadoCampanaFormValues, productores: ProductorCubierto[], archivos: CertificadoArchivos) {
    return {
        id,
        tipo: values.tipo,
        nombre: values.nombre.trim(),
        organismoEmisor: values.organismoEmisor.trim(),
        validoDesde: values.validoDesde,
        validoHasta: values.validoHasta,
        estadoTramite: values.estadoTramite,
        moneda: values.moneda,
        costo: Number(values.costo.trim()),
        kilosIniciales: parseNonNegative(values.kilosIniciales, 3) ?? 0,
        productores,
        observaciones: values.observaciones.trim(),
        documento: archivos.documento,
        cotizacion: archivos.cotizacion,
    };
}

/** Registra la única certificación de la campaña. */
export function addCampaignCertificate(campaniaId: number, values: CertificadoCampanaFormValues, productores: ProductorCubierto[], archivos: CertificadoArchivos) {
    const certificate: CertificadoCampanaLocal = { ...toLocal(nextId++, values, productores, archivos), ampliaciones: [], pagos: [] };
    update({ ...byCampaign, [campaniaId]: [certificate] });
}

/** Edita los datos de una certificación; sin archivo nuevo conserva el documento y la cotización actuales. */
export function updateCampaignCertificate(campaniaId: number, certificadoId: number, values: CertificadoCampanaFormValues, productores: ProductorCubierto[], archivos: CertificadoArchivos) {
    replaceCertificate(campaniaId, certificadoId, (item) => ({
        ...item,
        ...toLocal(item.id, values, productores, {
            documento: archivos.documento ?? item.documento,
            cotizacion: archivos.cotizacion ?? item.cotizacion,
        }),
    }));
}

/** Suma una ampliación de kilos a la certificación. */
export function addCertificateExpansion(campaniaId: number, certificadoId: number, values: AmpliacionFormValues) {
    const expansion = { id: nextId++, kilos: Number(values.kilos.trim()), fecha: values.fecha, referencia: values.referencia.trim() };
    replaceCertificate(campaniaId, certificadoId, (item) => ({ ...item, ampliaciones: [expansion, ...item.ampliaciones] }));
}

/** Registra un pago de la certificación, con su evidencia opcional. */
export function addCertificatePayment(campaniaId: number, certificadoId: number, values: PagoFormValues, evidencia: File | null) {
    const payment = { id: nextId++, monto: Number(values.monto.trim()), fecha: values.fecha, referencia: values.referencia.trim(), evidencia };
    replaceCertificate(campaniaId, certificadoId, (item) => ({ ...item, pagos: [payment, ...item.pagos] }));
}

/** Lectura puntual, fuera de un componente. */
export function getCampaignCertificates(campaniaId: number): CertificadoCampanaLocal[] {
    return byCampaign[campaniaId] ?? EMPTY;
}

/** Deja el almacén vacío. Solo lo usan las pruebas. */
export function resetCampaignCertificates() {
    nextId = 1;
    update({});
}

/** Certificaciones de una campaña; el componente se vuelve a pintar cuando cambian. */
export function useCampaignCertificates(campaniaId: number): CertificadoCampanaLocal[] {
    return useSyncExternalStore(subscribe, () => byCampaign[campaniaId] ?? EMPTY);
}
