import { describe, expect, it, vi } from 'vitest';

const { create, update } = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));
vi.mock('@/modules/campaigns/api/v1.api', () => ({
  campanaV1: { create, update },
  campaniaXProveedoresV1: vi.fn(),
  clienteNegocioCampanaV1: vi.fn(),
}));
vi.mock('@/modules/operations/api/operations-context.api', () => ({
  operationsContext: () => ({ fruits: [] }),
  readAllV1: vi.fn(),
}));
vi.mock('@/shared/api/data-contract', () => ({ commitRemote: (operation: () => unknown) => operation() }));

import { campaignScreenV1 } from '@/modules/campaigns/api/v1-screen.api';

describe('responsable de campaña', () => {
  it('envía el responsable al crear y no lo modifica cuando no se incluye al editar', async () => {
    const row = { frutaId: 1, fechaInicio: '2026-01-01', fechaFin: '2026-12-31', responsableUsuarioId: 7 };
    create.mockResolvedValue(row);
    update.mockResolvedValue(row);
    await campaignScreenV1.create({ nombre: 'Campaña', frutaId: 1, fechaInicio: new Date(2026, 0, 1), fechaFin: new Date(2026, 11, 31), estado: 'planificacion', requerimientoComercial: '100', responsableUsuarioId: 7 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ responsableUsuarioId: 7 }));
    await campaignScreenV1.update(1, { nombre: 'Actualizada' });
    expect(update.mock.calls[0][1].responsableUsuarioId).toBeUndefined();
  });
});
