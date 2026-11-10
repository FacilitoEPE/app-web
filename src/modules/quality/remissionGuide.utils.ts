import type { QualityDeliveryLoadItem, QualitySunatRemissionGuide } from '@/modules/quality/qualityOperations.models';

export function guideAllocationTotals(
    load: QualityDeliveryLoadItem,
    included: string[],
    allocations: Record<string, number>,
) {
    const kilos = included.reduce((sum, id) => sum + (allocations[id] ?? 0), 0);
    const providers = load.proveedoresCarga.filter(provider => included.includes(provider.proveedorId));
    const fullProviders = kilos > 0 && providers.length === included.length && providers.every(provider =>
        provider.kilosCargados > 0 && allocations[provider.proveedorId] === provider.kilosCargados);
    const bultos = fullProviders ? providers.reduce((sum, provider) =>
        sum + provider.jabasCargadas + provider.jabasVacias
        + provider.binesCargados + provider.binesVacios
        + provider.mallasCargadas + provider.mallasVacias, 0) : null;
    return { kilos, bultos };
}

/** Prefill only facts supplied by the load; missing legal snapshots stay editable and empty. */
export function createGuideDraft(load: QualityDeliveryLoadItem): QualitySunatRemissionGuide {
    return {
        id: '', numeroGuia: '', estado: 'Pendiente de datos',
        proveedoresIncluidos: [],
        rolOrigen: load.proveedoresCarga[0]?.rol ?? 'Productor',
        tipoFruta: load.proveedoresCarga[0]?.tipoFruta ?? 'Convencional',
        fechaInicioTraslado: load.fechaProgramada, fechaEntregaTransportista: '',
        pesoBrutoTotalKg: 0,
        numeroBultos: 0,
        unidadMedida: 'KGM', transportistaRuc: '', transportistaDenominacion: load.transportista,
        transportistaMtc: '', vehiculoPlaca: load.placa, conductorTipoDoc: 'DNI',
        conductorNumeroDoc: '', conductorNombres: '', conductorApellidos: '', conductorLicencia: load.licencia,
        ubigeoPartida: '', direccionPartida: '', codEstablecimientoPartida: '',
        ubigeoLlegada: '', direccionLlegada: load.destino, codEstablecimientoLlegada: '',
        normasSeleccionadas: [], observacionesSunat: '',
        ...load.guideDefaults,
    };
}
