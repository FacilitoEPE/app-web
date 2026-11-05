import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createV1MockMiddleware } from './v1-mock';
import { apiClient } from '@/shared/api/client';
import { cancelFrontendDataLoad, getFrontendDataStatus, refreshFrontendData, resetFrontendData } from '@/frontend-data';
import { ensureViewDocuments, getOperationsPlan, operationsContext, readAllV1 } from '@/modules/operations/api/operations-context.api';
import { operationResources } from '@/modules/operations/api/operations-resources';
import { createCampana, getCampanas, updateCampana } from '@/modules/campaigns/api/campaign.api';
import { commitRemote, refreshRemoteData } from '@/shared/api/data-contract';
import { carrierScreenV1 } from '@/modules/carriers/api/v1-screen.api';
import { getCarriers, getCarriersForCampaign } from '@/modules/carriers/api/carrier.api';
import { EMPTY_CARRIER_EXTRAS } from '@/modules/carriers/carrierProfile.utils';
import { getLocalDocumentLinks, linkLocalDocument, unlinkLocalDocument, uploadLocalDocument } from '@/shared/api/uploadDocument';
import { projectBillingData } from '@/modules/billing/api/billing-screen-data';
import { projectSettlementData } from '@/modules/purchase-settlement/api/settlement-screen-data';
import { loadCarrierQuotations } from '@/modules/carriers/api/quotation-commands.api';

let server: Server, original: string | undefined;
const requests: { method: string; url: string }[] = [];
let rejectPatch = false;
beforeEach(async () => {
    vi.stubEnv('VITE_API_CONTRACT', 'v1');
    resetFrontendData(); requests.length = 0; rejectPatch = false;
    const middleware = createV1MockMiddleware(path.resolve(import.meta.dirname, '..'));
    server = createServer((req, res) => {
        requests.push({ method: req.method ?? '', url: req.url ?? '' });
        if (rejectPatch && req.method === 'PATCH') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ statusCode: 400, message: 'Rechazo confirmado' })); return;
        }
        middleware(req, res, () => { res.statusCode = 418; res.end(); });
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    original = apiClient.defaults.baseURL;
    apiClient.defaults.baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mock-api/`;
});
afterEach(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    apiClient.defaults.baseURL = original; resetFrontendData(); vi.unstubAllEnvs();
});
const app = readFileSync(path.resolve(import.meta.dirname, '../src/App.tsx'), 'utf8');
const adminRoutes = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map(match => match[1])
    .filter(route => !['/', '*', '/login', '/chofer', '/modules'].includes(route))
    .map(route => route.replace(':scope', 'exportador').replace(':section', route.startsWith('/calidad') ? 'guias' : 'proveedores').replace(/:[A-Za-z]+/g, '1'));

describe('lecturas acotadas a la vista con HTTP V1 real y datos aislados', () => {
    it.each(adminRoutes)('carga y proyecta un enlace directo: %s', async route => {
        await refreshFrontendData(route);
        expect(getFrontendDataStatus()).toMatchObject({ phase: 'ready', pathname: route, error: '' });
        expect(getOperationsPlan().pathname).toBe(route);
        expect(requests.every(req => req.url.startsWith('/mock-api/api/'))).toBe(true);
        if (!route.startsWith('/liquidacion-compra')) expect(requests.some(req => req.url.includes('/parametros-uit'))).toBe(false);
        if (!route.startsWith('/facturacion-cobros')) expect(requests.some(req => req.url.includes('/cobros'))).toBe(false);
    });

    it('deduplica el arranque y crea una campaña con un POST sin recargar otros módulos', async () => {
        await Promise.all([refreshFrontendData('/campaigns'), refreshFrontendData('/campaigns')]);
        expect(requests).toHaveLength(2);
        expect(requests.map(req => new URL(req.url, 'http://local').pathname).sort()).toEqual(['/mock-api/api/campanas', '/mock-api/api/frutas']);
        const g = operationsContext(), fruit = g.fruits.find(f => !g.campaigns.some(c => c.frutaId === f.frutaId && c.estado !== 'terminado'))!;
        requests.length = 0;
        const saved = await createCampana({ nombre: 'Campaña acotada', frutaId: fruit.frutaId, fechaInicio: new Date(2027, 0, 1), fechaFin: new Date(2027, 11, 31), estado: 'planificacion', requerimientoComercial: '100' });
        expect((await getCampanas()).some(c => c.campaniaId === saved.campaniaId)).toBe(true);
        expect(requests).toEqual([{ method: 'POST', url: '/mock-api/api/campanas' }]);
    });

    it('integra documento y desvinculación sin descargar el contexto', async () => {
        await refreshFrontendData('/campaigns'); requests.length = 0;
        const file = await uploadLocalDocument(new File(['PDF'], 'reglas.pdf', { type: 'application/pdf' }));
        await linkLocalDocument('campana', 1, file.id); await refreshRemoteData();
        expect(operationsContext().localDocuments?.find(item => item.tipo === 'campana' && item.entidadId === 1)?.name).toBe('reglas.pdf');
        await unlinkLocalDocument('campana', 1); await refreshRemoteData();
        expect(operationsContext().localDocuments?.some(item => item.tipo === 'campana' && item.entidadId === 1)).toBe(false);
        expect(requests.filter(req => req.method === 'GET')).toHaveLength(0);
    });
    it('un vínculo recién creado no hace pasar el índice parcial por un índice completo', async () => {
        await refreshFrontendData('/campaigns');
        const initial = await getLocalDocumentLinks();
        const file = await uploadLocalDocument(new File(['PDF'], 'nuevo.pdf', { type: 'application/pdf' }));
        await linkLocalDocument('campana', 1, file.id);
        requests.length = 0;
        const [first, second] = await Promise.all([ensureViewDocuments(), ensureViewDocuments()]);
        expect(first).toEqual(second);
        expect(first).toHaveLength(initial.filter(item => item.tipo !== 'campana' || item.entidadId !== 1).length + 1);
        expect(requests).toEqual([{ method: 'GET', url: '/mock-api/api/documentos/vinculos' }]);
    });

    it('un rechazo confirmado no recarga recursos y una escritura parcial reconcilia solo su vista', async () => {
        await refreshFrontendData('/campaigns'); requests.length = 0;
        rejectPatch = true;
        await expect(updateCampana(1, { observaciones: 'rechazada' })).rejects.toMatchObject({ statusCode: 400 });
        expect(requests).toHaveLength(1);
        rejectPatch = false; requests.length = 0;
        await expect(commitRemote(async () => {
            await updateCampana(1, { observaciones: 'guardada' });
            throw new Error('Falló el segundo paso');
        })).rejects.toThrow('Falló el segundo paso');
        expect(operationsContext().campaigns.find(c => c.campaniaId === 1)?.observaciones).toBe('guardada');
        expect(requests.filter(req => req.method === 'GET')).toHaveLength(2);
        expect(requests.every(req => /\/(campanas|frutas)(\?|\/|$)/.test(req.url))).toBe(true);
    });

    it('actualiza todos los datos del transportista con un solo PATCH', async () => {
        await refreshFrontendData('/transportistas/1');
        const carrier = operationsContext().carriers[0]; requests.length = 0;
        await carrierScreenV1.update(carrier.idEmpresaTransporteExterno, { nombre: carrier.nombreCompleto, numero: carrier.numero, ruc: carrier.ruc ?? '', correo: carrier.correo ?? '' }, { ...EMPTY_CARRIER_EXTRAS, mtc: 'MTC-NUEVO' });
        expect(requests).toEqual([{ method: 'PATCH', url: '/mock-api/api/transportistas/1' }]);
        expect(operationsContext().carriers[0].registroMtc).toBe('MTC-NUEVO');
    });

    it('reutiliza los transportistas de campaña y difiere el directorio completo', async () => {
        const rootCarrierReads = () => requests.filter(req => req.method === 'GET' && new URL(req.url, 'http://local').pathname === '/mock-api/api/transportistas');
        await refreshFrontendData('/campaigns/1/deliveries');
        requests.length = 0;
        expect(await getCarriersForCampaign(1)).not.toHaveLength(0);
        expect(rootCarrierReads()).toHaveLength(0);

        await refreshFrontendData('/campaigns/1/carriers');
        requests.length = 0;
        expect(await getCarriersForCampaign(1)).not.toHaveLength(0);
        expect(rootCarrierReads()).toHaveLength(0);
        expect(await getCarriers()).not.toHaveLength(0);
        expect(rootCarrierReads()).toHaveLength(1);
    });

    it('descarta la respuesta de una ruta abandonada', async () => {
        const previous = refreshFrontendData('/campaigns/1');
        const current = refreshFrontendData('/calidad');
        await Promise.all([previous, current]);
        expect(getFrontendDataStatus()).toMatchObject({ phase: 'ready', pathname: '/calidad' });
        expect(getOperationsPlan().pathname).toBe('/calidad');
    });
    it('no descarga análisis/cotizaciones ocultos y los obtiene al abrir su gestión', async () => {
        await refreshFrontendData('/calidad/exportador/1');
        expect(requests.some(req => /analisis-calidad|mediciones-mtd|documentos/.test(req.url))).toBe(false);
        requests.length = 0;
        await refreshFrontendData('/calidad/exportador/1/analisis');
        expect(requests.some(req => /analisis-calidad/.test(req.url))).toBe(true);
        expect(requests.some(req => /coordinaciones|\/cargas/.test(req.url))).toBe(false);
        requests.length = 0;
        await refreshFrontendData('/transportistas');
        expect(requests.some(req => /\/cotizaciones|documentos/.test(req.url))).toBe(false);
        requests.length = 0;
        await loadCarrierQuotations();
        expect(requests.some(req => /\/cotizaciones/.test(req.url))).toBe(true);
        expect(requests.some(req => /documentos\/vinculos/.test(req.url))).toBe(true);
    });
    it('rechaza IDs inválidos antes de descargar colecciones completas', async () => {
        await expect(refreshFrontendData('/campaigns/no-es-id')).rejects.toThrow('identificador');
        await expect(refreshFrontendData('/vista-sin-plan')).rejects.toThrow('plan de datos');
        expect(requests).toHaveLength(0);
    });
    it('el selector de módulos cancela la cola de lecturas de la vista abandonada', async () => {
        const previous = refreshFrontendData('/logistica-despacho');
        cancelFrontendDataLoad();
        await previous;
        expect(getFrontendDataStatus().phase).toBe('idle');
        expect(requests.length).toBeLessThanOrEqual(6);
    });

    it('conserva importes y saldos de facturación y liquidación al retirar otros dominios', async () => {
        await refreshFrontendData();
        const billing = projectBillingData(operationsContext());
        const settlement = projectSettlementData(operationsContext());
        await refreshFrontendData('/facturacion-cobros/1');
        expect(projectBillingData(operationsContext())).toEqual(billing.filter(row => row.campaniaId === 1));
        await refreshFrontendData('/liquidacion-compra/1');
        expect(projectSettlementData(operationsContext())).toEqual(settlement);
    });

    it('el catálogo de recursos coincide con las identidades y los padres del contrato', () => {
        const contract = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../docs/api/openapi.json'), 'utf8'));
        for (const resource of operationResources) {
            const meta = contract.paths[resource.path]['x-resource'];
            const table = contract['x-database'][meta.table];
            expect(resource.id, resource.path).toBe(table.id);
            if (resource.parent) expect(resource.foreignKey, resource.path).toBe(meta.scope);
        }
    });

    it('consume todas las páginas y conserva los filtros del contrato', async () => {
        await refreshFrontendData('/campaigns');
        const spy = vi.spyOn(apiClient, 'get');
        spy.mockResolvedValueOnce({ data: { items: [{ id: 1 }], total: 2 } });
        spy.mockResolvedValueOnce({ data: { items: [{ id: 2 }], total: 2 } });
        expect(await readAllV1('/campanas/99/requerimientos', { clienteNegocioId: 7 }, true)).toEqual([{ id: 1 }, { id: 2 }]);
        expect(spy.mock.calls.at(-1)?.[1]?.params).toMatchObject({ clienteNegocioId: 7, page: 2, pageSize: 100 });
        spy.mockRestore();
    });
});
