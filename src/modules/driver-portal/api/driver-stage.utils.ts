export const DRIVER_STAGE_CODES = ['EN_CARGA', 'SALIDA', 'EN_CAMINO', 'LLEGADA', 'CIERRE'] as const;
export type DriverStageCode = typeof DRIVER_STAGE_CODES[number];

export function currentDriverStage(history: readonly { estado: string }[]): DriverStageCode {
    const index = history.reduce((highest, item) => {
        const stageIndex = DRIVER_STAGE_CODES.indexOf(item.estado as DriverStageCode);
        return Math.max(highest, stageIndex);
    }, 0);
    return DRIVER_STAGE_CODES[index];
}

export function nextDriverStage(history: readonly { estado: string }[]): DriverStageCode | undefined {
    const currentIndex = DRIVER_STAGE_CODES.indexOf(currentDriverStage(history));
    return DRIVER_STAGE_CODES[currentIndex + 1];
}

export function orderDriverHistory<T extends { estado: string; fechaHora: string }>(history: readonly T[]): T[] {
    return [...history].sort((left, right) => {
        const stageDifference = DRIVER_STAGE_CODES.indexOf(left.estado as DriverStageCode)
            - DRIVER_STAGE_CODES.indexOf(right.estado as DriverStageCode);
        return stageDifference || left.fechaHora.localeCompare(right.fechaHora);
    });
}
