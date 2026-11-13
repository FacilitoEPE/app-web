import { createV1ReadResource, registerViewDetailReader, type ListQuery } from '@/shared/api/v1-client';
import { operationResources, operationsPlan, type ResourceKey } from '@/modules/operations/api/operations-resources';
import { registerRemoteMutation } from '@/shared/api/remote-mutations';
import { apiClient } from '@/shared/api/client';
import type * as Campaign from '@/modules/campaigns/api/v1.dto';
import type * as Provider from '@/modules/providers/api/v1.dto';
import type * as Commercial from '@/modules/commercial-planning/api/v1.dto';
import type * as Carrier from '@/modules/carriers/api/v1.dto';
import type * as Quality from '@/modules/quality/api/v1.dto';
import type * as Finance from '@/modules/purchase-settlement/api/v1.dto';
import type * as Billing from '@/modules/billing/api/v1.dto';
import type { ClienteNegocioV1 } from '@/modules/clients/api/v1.dto';
import type { RecepcionPlantaV1 } from '@/modules/logistics/api/v1.dto';
import type { HistorialChoferV1 } from '@/modules/driver-portal/api/v1.dto';
import { getLocalDocumentLinks, type LocalDocumentLink } from '@/shared/api/uploadDocument';
import { getAuthToken } from '@/shared/offline/session';
/** Remote operational context shared by the existing screens. No fixtures are imported here. */
export interface OperationsContext {
    localDocuments?: LocalDocumentLink[];
    campaigns: Campaign.CampanaV1[];
    fruits: Campaign.FrutaV1[];
    varieties: Campaign.FrutaDerivadaV1[];
    providers: Provider.ProveedorV1[];
    people: Provider.PersonaV1[];
    farms: Provider.FincaV1[];
    providerPeople: Provider.ProveedorXPersonaV1[];
    providerFruits: Provider.ProveedorXFrutaV1[];
    providerVarieties: Provider.ProveedorXFrutaDerivadaV1[];
    providerCertificates: Provider.CertificadoProveedorV1[];
    exams: Provider.ExamenProveedorV1[];
    clients: ClienteNegocioV1[];
    participations: Campaign.CampaniaXProveedoresV1[];
    interviews: Campaign.EntrevistaExtencionV1[];
    certificates: Campaign.CertificadoCampanaV1[];
    coverage: Campaign.CertificadoCampanaXProveedorV1[];
    expansions: Campaign.AmpliacionCertificadoCampanaV1[];
    certificatePayments: Campaign.PagoCertificadoCampanaV1[];
    requirements: Campaign.ClienteNegocioCampanaV1[];
    requirementVarieties: Campaign.ClienteNegocioCampanaXFrutaDerivadaV1[];
    contracts: Commercial.ContratoVentaV1[];
    deliveries: Commercial.EntregaProgramadaV1[];
    deliveryVarieties: Commercial.EntregaXFrutaDerivadaV1[];
    carriers: Carrier.EmpresaTransporteExternoV1[];
    vehicles: Carrier.VehiculoExternoV1[];
    drivers: Carrier.ChoferTransporteExternoV1[];
    requests: Carrier.SolicitudTransporteV1[];
    invitations: Carrier.InvitacionTransporteV1[];
    quotations: Carrier.CotizacionTransporteV1[];
    agreements: Carrier.AcuerdoTransporteV1[];
    coordinations: Campaign.CoordinacionEntregaV1[];
    deliveryOrigins: Campaign.OrigenEntregaV1[];
    harvests: Quality.CosechaV1[];
    analyses: Quality.AnalisisCalidadV1[];
    measurements: Quality.MedicionMtdV1[];
    loads: Quality.CargaV1[];
    loadProviders: Quality.ProveedorCargaV1[];
    loadOrigins: Quality.OrigenCargaV1[];
    loadExpenses: Quality.GastoCargaV1[];
    guides: Quality.GuiaRemisionV1[];
    guideProviders: Quality.ProveedorGuiaV1[];
    guideStandards: Quality.GuiaXNormaV1[];
    standards: Quality.NormaV1[];
    receipts: RecepcionPlantaV1[];
    histories: HistorialChoferV1[];
    providerSettlements: Finance.LiquidacionProveedorV1[];
    transportSettlements: Finance.LiquidacionTransporteV1[];
    transportExpenses: Finance.GastoTransporteV1[];
    advances: Finance.AdelantoTransporteV1[];
    applications: Finance.AplicacionAdelantoV1[];
    providerPayments: Finance.PagoProveedorV1[];
    transportPayments: Finance.PagoTransporteV1[];
    uit: Finance.ParametroUitV1[];
    invoices: Billing.FacturaVentaV1[];
    collections: Billing.CobroVentaV1[];
}
let current: OperationsContext | undefined;
let contextToken: string | undefined;
let contextRevision = 0;
const contextListeners = new Set<() => void>();
export const subscribeOperationsContext = (listener: () => void) => { contextListeners.add(listener); return () => { contextListeners.delete(listener); }; };
export const getOperationsRevision = () => contextRevision;
function changed() { contextRevision++; contextListeners.forEach(listener => listener()); }
let activePlan = operationsPlan();
let lists = new Map<string, { key: ResourceKey; parentId?: number; query: ListQuery }>();
const pendingReads = new Map<string, Promise<unknown[]>>();
const documentReads = new WeakMap<OperationsContext, Promise<LocalDocumentLink[]>>();
const completeDocuments = new WeakSet<OperationsContext>();
let documentRevision = 0;
let contextGeneration = 0;
export const getOperationsPlan = () => activePlan;
export function setOperationsContext(value: OperationsContext): void { current = value; contextToken = getAuthToken(); changed(); }
export function clearOperationsContext(): void { current = undefined; contextToken = undefined; activePlan = operationsPlan(); lists.clear(); pendingReads.clear(); contextGeneration++; changed(); }
export function operationsContext(): OperationsContext {
    if (!current)
        throw new Error('Los datos de operación todavía no se han cargado.');
    return current;
}
export async function ensureViewDocuments(): Promise<LocalDocumentLink[]> {
    const context = operationsContext();
    if (completeDocuments.has(context)) return context.localDocuments ?? [];
    let job = documentReads.get(context);
    if (!job) {
        job = (async () => {
            let revision: number, files: LocalDocumentLink[];
            do { revision = documentRevision; files = await getLocalDocumentLinks(); }
            while (revision !== documentRevision && current === context);
            if (current === context) { context.localDocuments = files; completeDocuments.add(context); }
            return files;
        })().finally(() => documentReads.delete(context));
        documentReads.set(context, job);
    }
    return job;
}
const queryKey = (path: string, query: ListQuery) => `${path}?${JSON.stringify(Object.entries(query).sort(([a], [b]) => a.localeCompare(b)))}`;
type Row = Record<string, unknown>;
function rowsFor(path: string, query: ListQuery): Row[] | undefined {
    const entry = lists.get(queryKey(path, query));
    if (!current || contextToken !== getAuthToken() || !entry) return;
    const resource = operationResources.find(item => item.key === entry.key)!;
    return (current[entry.key] as unknown as Row[]).filter(row =>
        (entry.parentId === undefined || row[resource.foreignKey!] === entry.parentId)
        && Object.entries(query).every(([key, value]) => value === undefined || row[key] === value));
}
export async function readAllV1<T>(path: string, query: ListQuery = {}, fresh = false): Promise<T[]> {
    const snapshot = !fresh && rowsFor(path, query);
    if (snapshot) return snapshot as T[];
    const key = `${contextGeneration}:${apiClient.defaults.baseURL}:${getAuthToken()}:${queryKey(path, query)}`;
    const pending = pendingReads.get(key);
    if (pending) return pending as Promise<T[]>;
    const token = getAuthToken(), generation = contextGeneration, view = activePlan;
    const job = fetchAllV1<T>(path, query).then(rows => {
        if (!fresh && current && view === activePlan && generation === contextGeneration && token === getAuthToken()) {
            const resource = operationResources.find(item => new RegExp(`^${item.path.replace('{parentId}', '\\d+')}$`).test(path));
            if (resource) {
                const parentId = resource.parent ? Number(path.split('/')[2]) : undefined;
                const old = current[resource.key] as unknown as Row[];
                const outside = old.filter(row => (parentId !== undefined && row[resource.foreignKey!] !== parentId)
                    || Object.entries(query).some(([key, value]) => value !== undefined && row[key] !== value));
                const ids = new Set((rows as Row[]).map(row => row[resource.id]));
                Object.assign(current, { [resource.key]: [...outside.filter(row => !ids.has(row[resource.id])), ...rows] });
                lists.set(queryKey(path, query), { key: resource.key, parentId, query });
            }
        }
        return rows;
    });
    pendingReads.set(key, job);
    try { return await job; }
    finally { if (pendingReads.get(key) === job) pendingReads.delete(key); }
}
async function fetchAllV1<T>(path: string, query: ListQuery, signal?: AbortSignal): Promise<T[]> {
    const resource = createV1ReadResource<T>(path);
    const first = await resource.list({ ...query, pageSize: 100 }, signal);
    const result = [...first.items];
    for (let page = 2; result.length < first.total; page++) {
        signal?.throwIfAborted();
        const next = await resource.list({ ...query, page, pageSize: 100 }, signal);
        if (!next.items.length)
            throw new Error('La API devolvió una página incompleta. Recarga los datos.');
        result.push(...next.items);
    }
    return result;
}
export async function loadOperationsContext(pathname = '*', isCurrent = () => true, signal?: AbortSignal): Promise<OperationsContext> {
    const token = getAuthToken();
    const generation = contextGeneration;
    const plan = operationsPlan(pathname);
    const data = Object.fromEntries(operationResources.map(({ key }) => [key, []])) as unknown as OperationsContext;
    const nextLists = new Map<string, { key: ResourceKey; parentId?: number; query: ListQuery }>();
    const jobs = new Map<ResourceKey, Promise<void>>();
    let failed = false;
    let running = 0;
    const queue: (() => void)[] = [];
    async function request<T>(job: () => Promise<T>): Promise<T> {
        if (running >= 6) await new Promise<void>(resolve => queue.push(resolve));
        else running++;
        try {
            if (failed || !isCurrent() || generation !== contextGeneration || token !== getAuthToken()) throw new Error('La vista cambió durante la carga.');
            return await job();
        } finally { const next = queue.shift(); if (next) next(); else running--; }
    }
    async function rootIds(key: ResourceKey): Promise<number[] | undefined> {
        if (key === 'campaigns' && plan.campaignId) return [plan.campaignId];
        if (key === 'providers') {
            if (plan.providerId) return [plan.providerId];
            if (plan.campaignId && plan.keys.has('participations')) { await load('participations'); return data.participations.map(row => row.proveedorId); }
        }
        if (key === 'clients') {
            if (plan.clientId) return [plan.clientId];
            if (plan.campaignId && plan.keys.has('requirements')) { await load('requirements'); return data.requirements.map(row => row.clienteNegocioId); }
        }
        if (key === 'carriers') {
            if (plan.carrierId) return [plan.carrierId];
            if (plan.campaignId && plan.keys.has('agreements')) { await load('agreements'); return data.agreements.map(row => row.idEmpresaTransporteExterno); }
        }
    }
    function load(key: ResourceKey): Promise<void> {
        const pending = jobs.get(key);
        if (pending) return pending;
        const job = (async () => {
            const resource = operationResources.find(item => item.key === key)!;
            let parents: number[] | undefined;
            if (resource.parent) {
                await load(resource.parent);
                const parent = operationResources.find(item => item.key === resource.parent)!;
                let rows = data[resource.parent] as unknown as Row[];
                if (resource.parent === 'requirements' && plan.requirementId) rows = rows.filter(row => row.clienteNegocioCampanaId === plan.requirementId);
                if (resource.parent === 'contracts' && plan.contractId) rows = rows.filter(row => row.contratoVentaId === plan.contractId);
                if (resource.parent === 'campaigns' && plan.providerId && key !== 'participations') {
                    await load('participations');
                    rows = rows.filter(row => data.participations.some(p => p.campaniaId === row.campaniaId));
                }
                parents = rows.map(row => Number(row[parent.id]));
            } else parents = await rootIds(key);
            const query: ListQuery = {};
            if (key === 'participations' && plan.providerId) query.proveedorId = plan.providerId;
            if (key === 'participations' && plan.participationId) query.cxpId = plan.participationId;
            if (key === 'requirements' && plan.clientId) query.clienteNegocioId = plan.clientId;
            if (key === 'requirements' && plan.requirementId) query.clienteNegocioCampanaId = plan.requirementId;
            const uniqueParents = parents === undefined ? [undefined] : [...new Set(parents)];
            const groups = await Promise.all(uniqueParents.map(parentId => request(async () => {
                const path = parentId === undefined || !resource.parent ? resource.path : resource.path.replace('{parentId}', String(parentId));
                if (!resource.parent && parentId !== undefined) return [await createV1ReadResource<Row>(path).get(parentId, true, signal)];
                const rows = await fetchAllV1<Row>(path, query, signal);
                nextLists.set(queryKey(path, query), { key, parentId: resource.parent ? parentId : undefined, query });
                return rows;
            })));
            let rows = groups.flat();
            if (plan.providerId && (key === 'loadProviders' || key === 'deliveryOrigins')) {
                await load('participations');
                rows = rows.filter(row => data.participations.some(p => p.cxpId === row.cxpId));
            }
            Object.assign(data, { [key]: rows });
        })();
        jobs.set(key, job);
        return job;
    }
    try { await Promise.all([...plan.keys].map(load)); }
    catch (error) { failed = true; await Promise.allSettled(jobs.values()); throw error; }
    if (plan.documents) { data.localDocuments = await request(() => getLocalDocumentLinks(signal)); completeDocuments.add(data); }
    if (getAuthToken() !== token) throw new Error('La sesión cambió durante la carga.');
    if (!isCurrent() || generation !== contextGeneration) throw new Error('La vista cambió durante la carga.');
    current = data; contextToken = token; activePlan = plan; lists = nextLists; changed();
    return data;
}

registerViewDetailReader((path, id) => {
    if (!current || contextToken !== getAuthToken()) return;
    const normalized = `/${path.replace(/^\/+/, '')}`;
    const resource = operationResources.find(item => new RegExp(`^${item.path.replace('{parentId}', '(\\d+)')}$`).test(normalized));
    if (!resource) return;
    const parent = resource.parent ? Number(normalized.split('/')[2]) : undefined;
    return (current[resource.key] as unknown as Row[]).find(row => row[resource.id] === id && (parent === undefined || row[resource.foreignKey!] === parent));
});
registerRemoteMutation(({ resource: path, data, removedId, token }) => {
    if (!current || token !== getAuthToken() || contextToken !== token) return;
    if (path === 'documentos/vinculos' && data) {
        documentRevision++;
        const file = data as LocalDocumentLink;
        current.localDocuments = [...(current.localDocuments ?? []).filter(item => item.tipo !== file.tipo || item.entidadId !== file.entidadId), file];
        changed();
        return;
    }
    if (path.startsWith('documentos/vinculos/')) {
        documentRevision++;
        const [, , tipo, id] = path.split('/');
        current.localDocuments = current.localDocuments?.filter(item => item.tipo !== tipo || item.entidadId !== Number(id));
        changed();
        return;
    }
    const actions: Record<string, ResourceKey> = { campanas: 'campaigns', guias: 'guides', facturas: 'invoices' };
    const resource = operationResources.find(item => new RegExp(`^${item.path.slice(1).replace('{parentId}', '\\d+')}$`).test(path))
        ?? operationResources.find(item => item.key === actions[path.split('/')[0]] && path.split('/').length === 3);
    if (!resource) return;
    const rows = current[resource.key] as unknown as Row[];
    const row = data as Row | undefined;
    const id = removedId ?? row?.[resource.id];
    if (id === undefined) return;
    if (row && resource.parent) {
        const parent = operationResources.find(item => item.key === resource.parent)!;
        if (!(current[resource.parent] as unknown as Row[]).some(item => item[parent.id] === row[resource.foreignKey!])) return;
    }
    const selected: Partial<Record<ResourceKey, number | undefined>> = { campaigns: activePlan.campaignId, providers: activePlan.providerId, clients: activePlan.clientId, carriers: activePlan.carrierId };
    if (selected[resource.key] !== undefined && selected[resource.key] !== id) return;
    Object.assign(current, { [resource.key]: [...rows.filter(item => item[resource.id] !== id), ...(row ? [row] : [])]
        .sort((a, b) => Number(a[resource.id]) - Number(b[resource.id])) });
    changed();
});
