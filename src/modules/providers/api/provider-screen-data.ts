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
            const ids = row.frutaDerivadaId ? [row.frutaDerivadaId] : [];
            const cultivos = g.fruits.map(fruit => ({ fruta: fruit.name, variedades: g.varieties.filter(v => v.frutaId === fruit.frutaId && ids.includes(v.frutaDerivadaId)).map(v => v.name) })).filter(c => c.variedades.length > 0);
            return { fincaId: row.fincaId, nombre: row.nombreFinca, codigoSenasa: row.codigoLugarProduccion ?? '', codigoCatastral: row.codigoCatastral ?? '', departamento: row.departamento, provincia: row.provincia, distrito: row.distrito, latitud: row.latitud, longitud: row.longitud, haTotal: row.haTotalFinca, haCultivo: row.haCultivo, edadCultivo: row.edadCultivoAnios, cultivos };
        });
        certificados[id] = g.providerCertificates.filter(row => row.proveedorId === id).map(row => { const file = g.localDocuments?.find(item => item.tipo === 'certificado_proveedor' && item.entidadId === row.certificadoProveedorId); return { certificadoId: row.certificadoProveedorId, nombre: row.nombre, fechaRevisionSenasa: row.fechaRevisionSenasa, documento: file ? { url: file.url, name: file.name, type: file.type, size: file.size } : null }; });
        produccion[id] = { estadoSanidad: provider.estadoExamenSanidadAgraria ?? '', frutas: g.providerFruits.filter(row => row.proveedorId === id).map(link => ({ nombre: g.fruits.find(f => f.frutaId === link.frutaId)?.name ?? '', variedades: g.providerVarieties.filter(row => row.proveedorId === id).flatMap(row => { const v = g.varieties.find(v => v.frutaDerivadaId === row.frutaDerivadaId && v.frutaId === link.frutaId); return v ? [v.name] : []; }) })) };
    }
    return { fincas, certificados, produccion };
}
export function providerOperationalSummary(providerId: number, g: OperationsContext = operationsContext()) {
    const participations = g.participations.filter(p => p.proveedorId === providerId);
    const parties = participations.map(p => p.cxpId);
    const latest = g.measurements.filter(m => parties.includes(m.cxpId)).sort((a, b) => a.medidoAt.localeCompare(b.medidoAt)).at(-1);
    const kilosRecibidos = g.receipts.flatMap(r => r.compras).map(jsonObject).filter(p => p.providerId === providerId).reduce((total, p) => total + jsonNumber(p.recognizedQuantity), 0);
    const campaignIds = new Set(participations.map(p => p.campaniaId));
    const campaigns = g.campaigns.filter(c => campaignIds.has(c.campaniaId) && c.estado !== 'terminado').map(c => ({ id: c.campaniaId, nombre: c.nombre, estado: c.estado, fincas: new Set(g.interviews.filter(i => parties.includes(i.camXProvId) && participations.some(p => p.cxpId === i.camXProvId && p.campaniaId === c.campaniaId)).map(i => i.fincaId)).size }));
    return { kilosRecibidos, mtd: latest?.valor, campaigns };
}
