import { usesV1 } from '@/shared/api/data-contract';
import { providerCommands } from '@/modules/providers/api/provider-commands.api';
import { useSyncExternalStore } from "react";
import type { Finca } from "@/modules/providers/providerFinca.utils";
import type { CertificadoFormValues, CertificadoLocal } from "@/modules/providers/providerCertificado.utils";
import type { ProduccionProveedor } from "@/modules/providers/providerProduccion.utils";

/** V1: remote commands and server projections. Legacy: local compatibility state, initially empty. */
interface ProviderLocalData {
    fincas: Record<number, Finca[]>;
    certificados: Record<number, CertificadoLocal[]>;
    /** Estado de sanidad y frutas del proveedor: las edita el formulario de proveedor (ver ) */
    produccion: Record<number, ProduccionProveedor>;
}

/** V1: remote commands and server projections. Legacy: local compatibility state, initially empty. */

let data: ProviderLocalData = {
    fincas: {},
    certificados: {},
    produccion: {},
};
let nextCertificadoId = 1 + Math.max(0, ...Object.values(data.certificados).flat().map((item) => item.certificadoId));
const listeners = new Set<() => void>();

function update(next: ProviderLocalData) {
    data = next;
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/** Guarda el estado de sanidad y las frutas que el formulario de proveedor registró. */
export function saveProduccion(providerId: number, produccion: ProduccionProveedor) {
    if (usesV1()) return providerCommands.saveProduction(providerId, produccion);
    update({ ...data, produccion: { ...data.produccion, [providerId]: produccion } });
}

/** Agrega una finca al proveedor, al final de su lista. */
export function addFinca(providerId: number, finca: Finca) {
    if (usesV1()) return providerCommands.saveFarm(providerId, finca);
    update({ ...data, fincas: { ...data.fincas, [providerId]: [...(data.fincas[providerId] ?? []), finca] } });
}

/** Reemplaza la finca que ocupa esa posición de la lista del proveedor. */
export function updateFinca(providerId: number, index: number, finca: Finca) {
    if (usesV1()) return providerCommands.saveFarm(providerId, finca, index);
    const current = data.fincas[providerId] ?? [];
    if (index < 0 || index >= current.length) return;
    update({ ...data, fincas: { ...data.fincas, [providerId]: current.map((item, position) => (position === index ? finca : item)) } });
}

/** Quita la finca que ocupa esa posición de la lista del proveedor. */
export function removeFinca(providerId: number, index: number) {
    if (usesV1()) return providerCommands.removeFarm(providerId, index);
    const current = data.fincas[providerId] ?? [];
    if (index < 0 || index >= current.length) return;
    update({ ...data, fincas: { ...data.fincas, [providerId]: current.filter((_, position) => position !== index) } });
}

/** Registra un certificado al proveedor; el más reciente queda primero. */
export function addCertificado(providerId: number, values: CertificadoFormValues, documento: File | null) {
    if (usesV1()) return providerCommands.saveCertificate(providerId, values, documento);
    const certificado: CertificadoLocal = {
        certificadoId: nextCertificadoId++,
        nombre: values.nombre.trim(),
        fechaRevisionSenasa: values.fechaRevisionSenasa,
        documento,
    };
    update({ ...data, certificados: { ...data.certificados, [providerId]: [certificado, ...(data.certificados[providerId] ?? [])] } });
}

/** Actualiza un certificado del proveedor; sin `documento` conserva el que ya tenía. */
export function updateCertificado(providerId: number, certificadoId: number, values: CertificadoFormValues, documento?: File | null) {
    if (usesV1()) return providerCommands.saveCertificate(providerId, values, documento, certificadoId);
    const current = data.certificados[providerId] ?? [];
    const next = current.map((item) => item.certificadoId !== certificadoId ? item : {
        ...item,
        nombre: values.nombre.trim(),
        fechaRevisionSenasa: values.fechaRevisionSenasa,
        documento: documento ?? item.documento,
    });
    update({ ...data, certificados: { ...data.certificados, [providerId]: next } });
}

/** Deja el almacén vacío. Solo lo usan las pruebas. */
export function resetProviderLocalData() {
    nextCertificadoId = 1;
    update({ fincas: {}, certificados: {}, produccion: {} });
}

/** Lectura puntual del estado actual, fuera de un componente. */
export function getProviderLocalData(): ProviderLocalData {
    return data;
}

/** Fincas, datos agronómicos y certificados de todos los proveedores; el componente se vuelve a pintar cuando cambian. */
export function useProviderLocalData(): ProviderLocalData {
    return useSyncExternalStore(subscribe, getProviderLocalData);
}

export function hydrateProviderData(value: ProviderLocalData) { update(value); }
