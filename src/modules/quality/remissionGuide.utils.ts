import type { QualityDeliveryLoadItem, QualitySunatRemissionGuide } from '@/modules/quality/qualityOperations.models';

/** Prefill only facts supplied by the load; missing legal snapshots stay editable and empty. */
export function createGuideDraft(load: QualityDeliveryLoadItem): QualitySunatRemissionGuide {
    return {
        id: '', numeroGuia: '', estado: 'Pendiente de datos',
        proveedoresIncluidos: [...new Set(load.proveedoresCarga.map(p => p.proveedorId))],
        rolOrigen: load.proveedoresCarga[0]?.rol ?? 'Productor',
        tipoFruta: load.proveedoresCarga[0]?.tipoFruta ?? 'Convencional',
        fechaInicioTraslado: load.fechaCargaReal, fechaEntregaTransportista: load.fechaCargaReal,
        pesoBrutoTotalKg: load.proveedoresCarga.reduce((n, p) => n + p.kilosCargados, 0),
        numeroBultos: load.proveedoresCarga.reduce((n, p) => n + p.jabasCargadas + p.binesCargados + p.mallasCargadas, 0),
        unidadMedida: 'KGM', transportistaRuc: '', transportistaDenominacion: load.transportista,
        transportistaMtc: '', vehiculoPlaca: load.placa, conductorTipoDoc: 'DNI',
        conductorNumeroDoc: '', conductorNombres: load.chofer, conductorApellidos: '', conductorLicencia: load.licencia,
        ubigeoPartida: '', direccionPartida: '', codEstablecimientoPartida: '',
        ubigeoLlegada: '', direccionLlegada: load.destino, codEstablecimientoLlegada: '',
        codigoProducto: '', descripcionProducto: '', normasSeleccionadas: [], observacionesSunat: '',
        ...load.guideDefaults,
    };
}
