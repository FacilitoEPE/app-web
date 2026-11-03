import type { QualityDeliveryLoadItem, QualitySunatRemissionGuide } from '@/modules/quality/qualityOperations.models';

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
