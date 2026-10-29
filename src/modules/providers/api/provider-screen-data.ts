import { operationsContext } from '@/modules/operations/api/operations-context.api';
import { jsonObject, jsonNumber } from '@/modules/quality/api/quality-screen-data';
import type { OperationsContext } from '@/modules/operations/api/operations-context.api';
import type { Finca } from '@/modules/providers/providerFinca.utils';
import type { CertificadoLocal } from '@/modules/providers/providerCertificado.utils';
import type { ProduccionProveedor } from '@/modules/providers/providerProduccion.utils';
export function projectProviderData(g: OperationsContext) {
    const fincas: Record<number, Finca[]> = {}, certificados: Record<number, CertificadoLocal[]> = {}, produccion: Record<number, ProduccionProveedor> = {};
    for (const provider of g.providers) {
        const id = provider.proveedorId;
        fincas[id] = g.farms.filter(row => row.proveedorId === id).map(row => {
            const variety = g.varieties.find(v => v.frutaDerivadaId === row.frutaDerivadaId), fruit = g.fruits.find(f => f.frutaId === variety?.frutaId);
            return { fincaId: row.fincaId, nombre: row.nombreFinca, codigoSenasa: row.codigoLugarProduccion ?? '', codigoCatastral: row.codigoCatastral ?? '', departamento: row.departamento, provincia: row.provincia, distrito: row.distrito, latitud: row.latitud, longitud: row.longitud, haTotal: row.haTotalFinca, haCultivo: row.haCultivo, edadCultivo: row.edadCultivoAnios, cultivos: fruit && variety ? [{ fruta: fruit.name, variedades: [variety.name] }] : [] };
        });
        certificados[id] = g.providerCertificates.filter(row => row.proveedorId === id).map(row => ({ certificadoId: row.certificadoProveedorId, nombre: row.nombre, fechaRevisionSenasa: row.fechaRevisionSenasa, documento: null }));
        produccion[id] = { estadoSanidad: provider.estadoExamenSanidadAgraria ?? '', frutas: g.providerFruits.filter(row => row.proveedorId === id).map(link => ({ nombre: g.fruits.find(f => f.frutaId === link.frutaId)?.name ?? '', variedades: g.providerVarieties.filter(row => row.proveedorId === id).flatMap(row => { const v = g.varieties.find(v => v.frutaDerivadaId === row.frutaDerivadaId && v.frutaId === link.frutaId); return v ? [v.name] : []; }) })) };
    }
    return { fincas, certificados, produccion };
}
export function providerOperationalSummary(providerId: number) {
    const g = operationsContext(), parties = g.participations.filter(p => p.proveedorId === providerId).map(p => p.cxpId);
    const latest = g.measurements.filter(m => parties.includes(m.cxpId)).sort((a, b) => a.medidoAt.localeCompare(b.medidoAt)).at(-1);
    const kilosRecibidos = g.receipts.flatMap(r => r.compras).map(jsonObject).filter(p => p.providerId === providerId).reduce((total, p) => total + jsonNumber(p.recognizedQuantity), 0);
    return { kilosRecibidos, mtd: latest?.valor };
}
