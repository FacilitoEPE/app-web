import type { GuiaRemisionV1 } from "@/modules/quality/api/v1.dto";

/** Los campos visibles del formulario determinan si un borrador está listo. */
export function isQualityGuidePrepared(guide: GuiaRemisionV1, hasProviders: boolean): boolean {
    return Boolean(hasProviders
        && guide.numero.trim()
        && guide.fechaInicioTraslado
        && guide.pesoBrutoKg > 0
        && Number.isInteger(guide.numeroBultos) && guide.numeroBultos >= 0
        && guide.ubigeoPartidaSnapshot && guide.direccionPartidaSnapshot && guide.establecimientoPartidaSnapshot
        && guide.ubigeoLlegadaSnapshot && guide.direccionLlegadaSnapshot && guide.establecimientoLlegadaSnapshot
        && guide.transportistaDocumentoSnapshot && guide.placaSnapshot
        && guide.conductorDocumentoSnapshot && guide.conductorNombreSnapshot && guide.conductorLicenciaSnapshot
        && typeof guide.contenido.driverFirstNames === "string" && guide.contenido.driverFirstNames.trim()
        && typeof guide.contenido.driverLastNames === "string" && guide.contenido.driverLastNames.trim());
}
