import { fincaV1, proveedorV1, proveedorXFrutaV1, proveedorXFrutaDerivadaV1, certificadoProveedorV1 } from '@/modules/providers/api/v1.api';
import { operationsContext } from '@/modules/operations/api/operations-context.api';
import { commitRemote } from '@/shared/api/data-contract';
import type { Finca } from '@/modules/providers/providerFinca.utils';
import type { ProduccionProveedor } from '@/modules/providers/providerProduccion.utils';
import type { CertificadoFormValues } from '@/modules/providers/providerCertificado.utils';
import { linkLocalDocument, uploadLocalDocument } from '@/shared/api/uploadDocument';
export function farmVarietyIds(finca: Finca): number[] {
    const g = operationsContext();
    return (finca.cultivos ?? []).flatMap(cultivo => cultivo.variedades.map(name => {
        const fruit = g.fruits.find(f => f.name === cultivo.fruta);
        const variety = g.varieties.find(v => v.frutaId === fruit?.frutaId && (v.name === name || v.name === `${fruit?.name} ${name}`));
        if (!variety) throw new Error('La variedad seleccionada no está en el catálogo de esta fruta.');
        return variety.frutaDerivadaId;
    }));
}
export const providerCommands = {
    saveProduction: (providerId: number, value: ProduccionProveedor) => commitRemote(async () => {
        const g = operationsContext(), fruitIds = value.frutas.map(f => { const row = g.fruits.find(row => row.name === f.nombre); if (!row)
            throw new Error('Fruta no disponible en el catálogo.'); return row.frutaId; });
        const varietyIds = value.frutas.flatMap(f => f.variedades.map(name => { const fruit = g.fruits.find(row => row.name === f.nombre)!, row = g.varieties.find(v => v.frutaId === fruit.frutaId && (v.name === name || v.name === `${fruit.name} ${name}`)); if (!row)
            throw new Error('Variedad no disponible en el catálogo.'); return row.frutaDerivadaId; }));
        await proveedorV1.update(providerId, { estadoExamenSanidadAgraria: value.estadoSanidad || null });
        for (const row of g.providerFruits.filter(r => r.proveedorId === providerId && !fruitIds.includes(r.frutaId)))
            await proveedorXFrutaV1(providerId).remove(row.pxfId);
        for (const id of fruitIds)
            if (!g.providerFruits.some(r => r.proveedorId === providerId && r.frutaId === id))
                await proveedorXFrutaV1(providerId).create({ frutaId: id });
        for (const row of g.providerVarieties.filter(r => r.proveedorId === providerId && !varietyIds.includes(r.frutaDerivadaId)))
            await proveedorXFrutaDerivadaV1(providerId).remove(row.proveedorXFrutaDerivadaId);
        for (const id of varietyIds)
            if (!g.providerVarieties.some(r => r.proveedorId === providerId && r.frutaDerivadaId === id))
                await proveedorXFrutaDerivadaV1(providerId).create({ frutaDerivadaId: id });
    }),
    saveFarm: (providerId: number, value: Finca, index?: number) => commitRemote(async () => {
        if (value.latitud === null || value.longitud === null)
            throw new Error('Completa las coordenadas de la finca antes de guardar.');
        const ids = farmVarietyIds(value);
        const body = { nombreFinca: value.nombre, departamento: value.departamento, provincia: value.provincia, distrito: value.distrito, latitud: value.latitud, longitud: value.longitud, haTotalFinca: value.haTotal, haCultivo: value.haCultivo, codigoLugarProduccion: value.codigoSenasa || null, codigoCatastral: value.codigoCatastral || null, edadCultivoAnios: value.edadCultivo ?? null, frutaDerivadaId: ids[0] ?? null };
        const current = index === undefined ? undefined : operationsContext().farms.filter(r => r.proveedorId === providerId)[index];
        return current ? fincaV1(providerId).update(current.fincaId, body) : fincaV1(providerId).create(body);
    }),
    removeFarm: (providerId: number, index: number) => commitRemote(async () => { const row = operationsContext().farms.filter(r => r.proveedorId === providerId)[index]; if (!row)
        throw new Error('Finca no encontrada.'); await fincaV1(providerId).remove(row.fincaId); }),
    saveCertificate: (providerId: number, values: CertificadoFormValues, documento: File | null | undefined, id?: number) => commitRemote(async () => {
        const uploaded = documento ? await uploadLocalDocument(documento, 'proveedores/certificados') : undefined;
        const body = { nombre: values.nombre, fechaRevisionSenasa: values.fechaRevisionSenasa };
        const saved = await (id ? certificadoProveedorV1(providerId).update(id, body) : certificadoProveedorV1(providerId).create(body));
        if (uploaded) await linkLocalDocument('certificado_proveedor', saved.certificadoProveedorId, uploaded.id);
        return saved;
    }),
};
