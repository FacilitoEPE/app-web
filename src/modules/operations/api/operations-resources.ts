import type { OperationsContext } from '@/modules/operations/api/operations-context.api';

export type ResourceKey = Exclude<keyof OperationsContext, 'localDocuments'>;
interface Resource { key: ResourceKey; id: string; path: string; parent?: ResourceKey; foreignKey?: string }
export const operationResources: Resource[] = [
    { key: 'campaigns', id: 'campaniaId', path: '/campanas' },
    { key: 'fruits', id: 'frutaId', path: '/frutas' },
    { key: 'providers', id: 'proveedorId', path: '/proveedores' },
    { key: 'people', id: 'personaId', path: '/personas' },
    { key: 'clients', id: 'clienteNegocioId', path: '/clientes-negocio' },
    { key: 'carriers', id: 'idEmpresaTransporteExterno', path: '/transportistas' },
    { key: 'uit', id: 'parametroUitId', path: '/parametros-uit' },
    { key: 'standards', id: 'normaId', path: '/normas' },
    { key: 'varieties', id: 'frutaDerivadaId', path: '/frutas/{parentId}/variedades', parent: 'fruits', foreignKey: 'frutaId' },
    ...([
        ['farms', 'fincaId', 'fincas'], ['providerPeople', 'proveedorXPersonaId', 'personas'],
        ['providerFruits', 'pxfId', 'frutas'], ['providerVarieties', 'proveedorXFrutaDerivadaId', 'variedades'],
        ['providerCertificates', 'certificadoProveedorId', 'certificados'], ['exams', 'examenProveedorId', 'examenes'],
    ] as const).map(([key, id, path]) => ({ key, id, path: `/proveedores/{parentId}/${path}`, parent: 'providers' as const, foreignKey: 'proveedorId' })),
    ...([
        ['participations', 'cxpId', 'proveedores'], ['certificates', 'certificadoId', 'certificaciones'],
        ['requirements', 'clienteNegocioCampanaId', 'requerimientos'], ['agreements', 'acuerdoTransporteId', 'transportistas'],
        ['requests', 'solicitudTransporteId', 'solicitudes-transporte'],
    ] as const).map(([key, id, path]) => ({ key, id, path: `/campanas/{parentId}/${path}`, parent: 'campaigns' as const, foreignKey: 'campaniaId' })),
    { key: 'vehicles', id: 'idVehiculoExterno', path: '/transportistas/{parentId}/vehiculos', parent: 'carriers', foreignKey: 'idEmpresaTransporteExterno' },
    { key: 'drivers', id: 'idChoferTransporteExterno', path: '/transportistas/{parentId}/choferes', parent: 'carriers', foreignKey: 'idEmpresaTransporteExterno' },
    ...([
        ['coverage', 'certificadoCampanaXProveedorId', 'cobertura'], ['expansions', 'ampliacionCertificadoCampanaId', 'ampliaciones'],
        ['certificatePayments', 'pagoCertificadoCampanaId', 'pagos'],
    ] as const).map(([key, id, path]) => ({ key, id, path: `/certificaciones/{parentId}/${path}`, parent: 'certificates' as const, foreignKey: 'certificadoId' })),
    { key: 'interviews', id: 'entrevistaId', path: '/participaciones/{parentId}/entrevistas', parent: 'participations', foreignKey: 'camXProvId' },
    { key: 'analyses', id: 'analisisCalidadId', path: '/participaciones/{parentId}/analisis-calidad', parent: 'participations', foreignKey: 'cxpId' },
    { key: 'measurements', id: 'medicionMtdId', path: '/participaciones/{parentId}/mediciones-mtd', parent: 'participations', foreignKey: 'cxpId' },
    { key: 'contracts', id: 'contratoVentaId', path: '/requerimientos/{parentId}/contratos', parent: 'requirements', foreignKey: 'clienteNegocioCampanaId' },
    { key: 'requirementVarieties', id: 'clienteNegocioCampanaXFrutaDerivadaId', path: '/requerimientos/{parentId}/variedades', parent: 'requirements', foreignKey: 'clienteNegocioCampanaId' },
    { key: 'invitations', id: 'invitacionTransporteId', path: '/solicitudes-transporte/{parentId}/invitaciones', parent: 'requests', foreignKey: 'solicitudTransporteId' },
    { key: 'advances', id: 'adelantoTransporteId', path: '/acuerdos-transporte/{parentId}/adelantos', parent: 'agreements', foreignKey: 'acuerdoTransporteId' },
    { key: 'deliveries', id: 'entregaProgramadaId', path: '/contratos/{parentId}/entregas', parent: 'contracts', foreignKey: 'contratoVentaId' },
    { key: 'quotations', id: 'cotizacionTransporteId', path: '/invitaciones-transporte/{parentId}/cotizaciones', parent: 'invitations', foreignKey: 'invitacionTransporteId' },
    { key: 'coordinations', id: 'coordinacionEntregaId', path: '/entregas/{parentId}/coordinaciones', parent: 'deliveries', foreignKey: 'entregaProgramadaId' },
    { key: 'harvests', id: 'cosechaId', path: '/entregas/{parentId}/cosecha', parent: 'deliveries', foreignKey: 'entregaProgramadaId' },
    { key: 'deliveryVarieties', id: 'entregaXFrutaDerivadaId', path: '/entregas/{parentId}/variedades', parent: 'deliveries', foreignKey: 'entregaProgramadaId' },
    { key: 'loads', id: 'cargaId', path: '/coordinaciones/{parentId}/cargas', parent: 'coordinations', foreignKey: 'coordinacionEntregaId' },
    { key: 'histories', id: 'historialChoferId', path: '/coordinaciones/{parentId}/historial-chofer', parent: 'coordinations', foreignKey: 'coordinacionEntregaId' },
    { key: 'deliveryOrigins', id: 'origenEntregaId', path: '/coordinaciones/{parentId}/origenes', parent: 'coordinations', foreignKey: 'coordinacionEntregaId' },
    ...([
        ['loadProviders', 'proveedorCargaId', 'proveedores'], ['loadExpenses', 'gastoCargaId', 'gastos'], ['guides', 'guiaRemisionId', 'guias'],
        ['receipts', 'recepcionPlantaId', 'recepciones'], ['providerSettlements', 'liquidacionProveedorId', 'liquidaciones-proveedor'],
        ['transportSettlements', 'liquidacionTransporteId', 'liquidaciones-transporte'], ['transportExpenses', 'gastoTransporteId', 'gastos-transporte'],
        ['invoices', 'facturaVentaId', 'facturas'],
    ] as const).map(([key, id, path]) => ({ key, id, path: `/cargas/{parentId}/${path}`, parent: 'loads' as const, foreignKey: 'cargaId' })),
    { key: 'loadOrigins', id: 'origenCargaId', path: '/proveedores-carga/{parentId}/origenes', parent: 'loadProviders', foreignKey: 'proveedorCargaId' },
    { key: 'guideProviders', id: 'proveedorGuiaId', path: '/guias/{parentId}/proveedores', parent: 'guides', foreignKey: 'guiaRemisionId' },
    { key: 'guideStandards', id: 'guiaXNormaId', path: '/guias/{parentId}/normas', parent: 'guides', foreignKey: 'guiaRemisionId' },
    { key: 'providerPayments', id: 'pagoProveedorId', path: '/liquidaciones-proveedor/{parentId}/pagos', parent: 'providerSettlements', foreignKey: 'liquidacionProveedorId' },
    { key: 'transportPayments', id: 'pagoTransporteId', path: '/liquidaciones-transporte/{parentId}/pagos', parent: 'transportSettlements', foreignKey: 'liquidacionTransporteId' },
    { key: 'applications', id: 'aplicacionAdelantoId', path: '/liquidaciones-transporte/{parentId}/aplicaciones-adelanto', parent: 'transportSettlements', foreignKey: 'liquidacionTransporteId' },
    { key: 'collections', id: 'cobroVentaId', path: '/facturas/{parentId}/cobros', parent: 'invoices', foreignKey: 'facturaVentaId' },
];

export type Projection = 'billing' | 'settlement' | 'logistics';
export interface OperationsPlan {
    pathname: string;
    keys: Set<ResourceKey>;
    documents: boolean;
    projection?: Projection;
    campaignId?: number;
    providerId?: number;
    clientId?: number;
    carrierId?: number;
    participationId?: number;
    requirementId?: number;
    contractId?: number;
}
const catalog: ResourceKey[] = ['campaigns', 'fruits', 'varieties'];
const participants: ResourceKey[] = ['participations', 'providers', 'farms'];
const commercial: ResourceKey[] = ['requirements', 'clients', 'contracts', 'deliveries', 'deliveryVarieties'];
const transport: ResourceKey[] = ['agreements', 'carriers', 'vehicles', 'drivers', 'coordinations', 'deliveryOrigins'];
const loads: ResourceKey[] = [...catalog, ...participants, ...commercial, ...transport, 'loads', 'loadProviders', 'loadOrigins', 'harvests', 'loadExpenses'];
const certificates: ResourceKey[] = ['certificates', 'coverage', 'expansions', 'certificatePayments'];
const guides: ResourceKey[] = ['guides', 'guideProviders', 'guideStandards', 'standards'];
const finance: ResourceKey[] = ['receipts', 'providerSettlements', 'transportSettlements', 'transportExpenses', 'advances', 'applications', 'providerPayments', 'transportPayments'];
export function operationsPlan(pathname = '*'): OperationsPlan {
    const segments = pathname.split('/').filter(Boolean);
    const [area, second, section, identity] = segments;
    const plan: OperationsPlan = { pathname, keys: new Set(), documents: false };
    const add = (...keys: ResourceKey[]) => keys.forEach(key => plan.keys.add(key));
    if (area === 'campaigns') {
        add('campaigns', 'fruits');
        if (!second) return plan;
        plan.campaignId = Number(second);
        add('varieties');
        if (!section) { add(...participants, ...commercial, ...transport, 'loads', 'loadProviders', 'guides', ...certificates); plan.documents = true; }
        else if (section === 'providers') {
            add(...participants, 'interviews');
            if (identity) { plan.participationId = Number(identity); add('exams'); }
        } else if (section === 'clients') {
            add('requirements', 'clients', 'requirementVarieties');
            if (identity) { plan.requirementId = Number(identity); add(...commercial); plan.documents = true; }
            if (segments[5]) { plan.contractId = Number(segments[5]); add(...participants, ...transport); }
        } else if (section === 'certifications') { add(...participants, ...certificates); plan.documents = true; }
        else if (section === 'carriers') { add(...loads, ...finance); plan.documents = true; }
        else if (section === 'weekly-delivery-program') add(...commercial, 'agreements', 'carriers', 'vehicles', 'coordinations');
        else add(...loads);
    } else if (area === 'proveedores') {
        add('providers', 'fruits', 'varieties');
        plan.providerId = second ? Number(second) : undefined;
        if (section !== 'certificados') add('farms', 'providerFruits', 'providerVarieties');
        if (section !== 'fincas') add('providerCertificates');
        plan.documents = Boolean(second && section !== 'fincas');
        if (second && !section) add(...loads, 'interviews', 'measurements', 'receipts');
    } else if (area === 'planificacion-comercial') {
        add(...catalog, ...commercial);
        plan.clientId = second ? Number(second) : undefined;
        plan.documents = Boolean(second);
    } else if (area === 'transportistas') {
        add('carriers');
        if (second) {
            plan.carrierId = Number(second);
            if (section !== 'choferes') add('vehicles');
            if (section !== 'vehiculos') add('drivers');
        } else { add(...catalog, 'vehicles', 'drivers', 'requests', 'invitations'); }
    } else if (area === 'calidad') {
        add('campaigns', 'fruits');
        if (second) {
            plan.campaignId = Number(section);
            if (identity === 'analisis') {
                add(...catalog, ...participants, 'analyses', 'measurements'); plan.documents = true;
            } else {
                add(...loads);
                if (identity === 'guias') add(...guides, 'people');
            }
        }
    } else if (area === 'logistica-despacho') {
        plan.campaignId = second ? Number(second) : undefined;
        add(...loads, ...guides, 'receipts', 'histories', 'providerSettlements');
        plan.documents = true;
        plan.projection = 'logistics';
    } else if (area === 'facturacion-cobros') {
        plan.campaignId = second ? Number(second) : undefined;
        add(...catalog, ...commercial, ...transport, 'loads', 'loadProviders', 'invoices');
        if (second) { add('receipts', 'collections'); plan.documents = true; }
        plan.projection = 'billing';
    } else if (area === 'liquidacion-compra') {
        // Annual UIT and agreement balances cross loads/campaigns; V1 has no aggregate read for them.
        add(...loads, ...finance, 'people', 'providerPeople', 'uit');
        plan.documents = true;
        plan.projection = 'settlement';
    } else if (pathname === '*') {
        add(...operationResources.map(resource => resource.key));
        plan.documents = true;
    } else if (area !== 'modules') throw new Error('La vista no tiene un plan de datos definido.');
    for (const id of [plan.campaignId, plan.providerId, plan.clientId, plan.carrierId, plan.participationId, plan.requirementId, plan.contractId]) {
        if (id !== undefined && (!Number.isSafeInteger(id) || id <= 0)) throw new Error('El identificador de la vista no es válido.');
    }
    return plan;
}
