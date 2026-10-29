import { usesV1 } from '@/shared/api/data-contract';
import { campaignCommands } from '@/modules/campaigns/api/campaign-commands.api';
import { useSyncExternalStore } from "react";
import type {
    AmpliacionFormValues,
    CertificadoCampanaFormValues,
    CertificadoCampanaLocal,
    PagoFormValues,
    ProductorCubierto,
} from "@/modules/campaigns/campaignCertificate.utils";
import { parseNonNegative } from "@/modules/campaigns/campaignCertificate.utils";

/** V1: remote commands and server projections. Legacy: local compatibility state, initially empty. */

let byCampaign: Record<number, CertificadoCampanaLocal[]> = {};
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
    if (usesV1()) return campaignCommands.certificate(campaniaId, values, productores, archivos);
    const certificate: CertificadoCampanaLocal = { ...toLocal(nextId++, values, productores, archivos), ampliaciones: [], pagos: [] };
    update({ ...byCampaign, [campaniaId]: [certificate] });
}

/** Edita los datos de una certificación; sin archivo nuevo conserva el documento y la cotización actuales. */
export function updateCampaignCertificate(campaniaId: number, certificadoId: number, values: CertificadoCampanaFormValues, productores: ProductorCubierto[], archivos: CertificadoArchivos) {
    if (usesV1()) return campaignCommands.certificate(campaniaId, values, productores, archivos, certificadoId);
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
    if (usesV1()) return campaignCommands.expand(campaniaId, certificadoId, values);
    const expansion = { id: nextId++, kilos: Number(values.kilos.trim()), fecha: values.fecha, referencia: values.referencia.trim() };
    replaceCertificate(campaniaId, certificadoId, (item) => ({ ...item, ampliaciones: [expansion, ...item.ampliaciones] }));
}

/** Registra un pago de la certificación, con su evidencia opcional. */
export function addCertificatePayment(campaniaId: number, certificadoId: number, values: PagoFormValues, evidencia: File | null) {
    if (usesV1()) return campaignCommands.certificatePayment(campaniaId, certificadoId, values, evidencia);
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

export function hydrateCampaignCertificates(value: Record<number, CertificadoCampanaLocal[]>) { update(value); }
