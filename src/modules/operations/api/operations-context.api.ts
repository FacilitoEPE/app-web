import { createV1ReadResource } from '@/shared/api/future-client';
import type * as Campaign from '@/modules/campaigns/api/future.dto';
import type * as Provider from '@/modules/providers/api/future.dto';
import type * as Commercial from '@/modules/commercial-planning/api/future.dto';
import type * as Carrier from '@/modules/carriers/api/future.dto';
import type * as Quality from '@/modules/quality/api/future.dto';
import type * as Finance from '@/modules/purchase-settlement/api/future.dto';
import type * as Billing from '@/modules/billing/api/future.dto';
import type { ClienteNegocioV1 } from '@/modules/clients/api/future.dto';
import type { RecepcionPlantaV1 } from '@/modules/logistics/api/future.dto';
import type { HistorialChoferV1 } from '@/modules/driver-portal/api/future.dto';
/** Remote operational context shared by the existing screens. No fixtures are imported here. */
export interface OperationsContext {
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
export function operationsContext(): OperationsContext {
    if (!current)
        throw new Error('Los datos de operación todavía no se han cargado.');
    return current;
}
export async function readAllV1<T>(path: string): Promise<T[]> {
    const resource = createV1ReadResource<T>(path);
    const first = await resource.list({ pageSize: 100 });
    const result = [...first.items];
    for (let page = 2; result.length < first.total; page++) {
        const next = await resource.list({ page, pageSize: 100 });
        if (!next.items.length)
            throw new Error('La API devolvió una página incompleta. Recarga los datos.');
        result.push(...next.items);
    }
    return result;
}
export async function loadOperationsContext(): Promise<OperationsContext> {
    const data = {} as OperationsContext;
    async function load<K extends keyof OperationsContext>(key: K, paths: string[]) {
        const rows = (await Promise.all(paths.map(path => readAllV1<OperationsContext[K][number]>(path)))).flat();
        Object.assign(data, { [key]: rows });
    }
    const children = async <K extends keyof OperationsContext>(key: K, parents: number[], path: (id: number) => string) => load(key, parents.map(path));
    await Promise.all([
        load('campaigns', ['/campanas']), load('fruits', ['/frutas']), load('providers', ['/proveedores']), load('people', ['/personas']),
        load('clients', ['/clientes-negocio']), load('carriers', ['/transportistas']), load('uit', ['/parametros-uit']), load('standards', ['/normas']),
    ]);
    const providerIds = data.providers.map(row => row.proveedorId), campaignIds = data.campaigns.map(row => row.campaniaId), carrierIds = data.carriers.map(row => row.idEmpresaTransporteExterno);
    await Promise.all([
        children('varieties', data.fruits.map(row => row.frutaId), id => `/frutas/${id}/variedades`),
        ...(['farms', 'providerPeople', 'providerFruits', 'providerVarieties', 'providerCertificates', 'exams'] as const).map((key, index) => children(key, providerIds, id => `/proveedores/${id}/${['fincas', 'personas', 'frutas', 'variedades', 'certificados', 'examenes'][index]}`)),
        ...(['participations', 'certificates', 'requirements', 'agreements', 'requests'] as const).map((key, index) => children(key, campaignIds, id => `/campanas/${id}/${['proveedores', 'certificaciones', 'requerimientos', 'transportistas', 'solicitudes-transporte'][index]}`)),
        children('vehicles', carrierIds, id => `/transportistas/${id}/vehiculos`), children('drivers', carrierIds, id => `/transportistas/${id}/choferes`),
    ]);
    await Promise.all([
        ...(['coverage', 'expansions', 'certificatePayments'] as const).map((key, index) => children(key, data.certificates.map(row => row.certificadoId), id => `/certificaciones/${id}/${['cobertura', 'ampliaciones', 'pagos'][index]}`)),
        ...(['interviews', 'analyses', 'measurements'] as const).map((key, index) => children(key, data.participations.map(row => row.cxpId), id => `/participaciones/${id}/${['entrevistas', 'analisis-calidad', 'mediciones-mtd'][index]}`)),
        children('contracts', data.requirements.map(row => row.clienteNegocioCampanaId), id => `/requerimientos/${id}/contratos`),
        children('requirementVarieties', data.requirements.map(row => row.clienteNegocioCampanaId), id => `/requerimientos/${id}/variedades`),
        children('invitations', data.requests.map(row => row.solicitudTransporteId), id => `/solicitudes-transporte/${id}/invitaciones`),
        children('advances', data.agreements.map(row => row.acuerdoTransporteId), id => `/acuerdos-transporte/${id}/adelantos`),
    ]);
    await Promise.all([
        children('deliveries', data.contracts.map(row => row.contratoVentaId), id => `/contratos/${id}/entregas`),
        children('quotations', data.invitations.map(row => row.invitacionTransporteId), id => `/invitaciones-transporte/${id}/cotizaciones`),
    ]);
    const deliveryIds = data.deliveries.map(row => row.entregaProgramadaId);
    await Promise.all([
        children('coordinations', deliveryIds, id => `/entregas/${id}/coordinaciones`), children('harvests', deliveryIds, id => `/entregas/${id}/cosecha`),
        children('deliveryVarieties', deliveryIds, id => `/entregas/${id}/variedades`),
    ]);
    const coordinationIds = data.coordinations.map(row => row.coordinacionEntregaId);
    await Promise.all([
        children('loads', coordinationIds, id => `/coordinaciones/${id}/cargas`), children('histories', coordinationIds, id => `/coordinaciones/${id}/historial-chofer`),
        children('deliveryOrigins', coordinationIds, id => `/coordinaciones/${id}/origenes`),
    ]);
    const loadIds = data.loads.map(row => row.cargaId);
    await Promise.all((['loadProviders', 'loadExpenses', 'guides', 'receipts', 'providerSettlements', 'transportSettlements', 'transportExpenses', 'invoices'] as const).map((key, index) => children(key, loadIds, id => `/cargas/${id}/${['proveedores', 'gastos', 'guias', 'recepciones', 'liquidaciones-proveedor', 'liquidaciones-transporte', 'gastos-transporte', 'facturas'][index]}`)));
    await Promise.all([
        children('loadOrigins', data.loadProviders.map(row => row.proveedorCargaId), id => `/proveedores-carga/${id}/origenes`),
        children('guideProviders', data.guides.map(row => row.guiaRemisionId), id => `/guias/${id}/proveedores`), children('guideStandards', data.guides.map(row => row.guiaRemisionId), id => `/guias/${id}/normas`),
        children('providerPayments', data.providerSettlements.map(row => row.liquidacionProveedorId), id => `/liquidaciones-proveedor/${id}/pagos`),
        children('transportPayments', data.transportSettlements.map(row => row.liquidacionTransporteId), id => `/liquidaciones-transporte/${id}/pagos`),
        children('applications', data.transportSettlements.map(row => row.liquidacionTransporteId), id => `/liquidaciones-transporte/${id}/aplicaciones-adelanto`),
        children('collections', data.invoices.map(row => row.facturaVentaId), id => `/facturas/${id}/cobros`),
    ]);
    current = data;
    return data;
}
