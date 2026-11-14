import { describe, expect, it } from 'vitest';
import { driverExitFile } from '@/modules/driver-portal/api/driver-screen-data';

describe('documento de salida del chofer', () => {
    const checklistFile = { url: '/v1/documentos/driver-file-id', name: 'salida-chofer.pdf', type: 'application/pdf', size: 1200 };
    const logisticsFile = { url: '/v1/documentos/logistics-file-id', name: 'salida-firmada.pdf', type: 'application/pdf', size: 1400 };

    it('usa el documento guardado en el checklist del chofer', () => {
        expect(driverExitFile({ archivo: checklistFile }, { guiaSalidaFirmada: logisticsFile })).toEqual(checklistFile);
    });

    it('recupera la guía firmada registrada en Documentos y cierre', () => {
        expect(driverExitFile({}, { guiaSalidaFirmada: logisticsFile })).toEqual(logisticsFile);
    });

    it('deja vacío el archivo cuando ninguno de los dos registros lo contiene', () => {
        expect(driverExitFile({}, {})).toBeNull();
    });
});
