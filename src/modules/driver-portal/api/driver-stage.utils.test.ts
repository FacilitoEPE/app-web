import { describe, expect, it } from 'vitest';
import { currentDriverStage, nextDriverStage, orderDriverHistory } from '@/modules/driver-portal/api/driver-stage.utils';

describe('progresión de etapas del despacho', () => {
    const history = [
        { estado: 'EN_CARGA', fechaHora: '2026-11-17T13:00:00.000Z' },
        { estado: 'SALIDA', fechaHora: '2026-11-14T22:32:30.310Z' },
    ];

    it('usa la etapa más avanzada aunque su fecha sea anterior a la carga programada', () => {
        expect(currentDriverStage(history)).toBe('SALIDA');
        expect(nextDriverStage(history)).toBe('EN_CAMINO');
    });

    it('presenta el historial según el orden operativo de las etapas', () => {
        expect(orderDriverHistory(history).map(item => item.estado)).toEqual(['EN_CARGA', 'SALIDA']);
    });

    it('inicia en Salida cuando el historial aún no tiene eventos', () => {
        expect(nextDriverStage([])).toBe('SALIDA');
    });
});
