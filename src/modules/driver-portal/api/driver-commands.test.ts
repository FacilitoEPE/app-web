import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/shared/api/client';
import { driverCommands } from '@/modules/driver-portal/api/driver-commands.api';

describe('registro de carga del chofer', () => {
  it('envía los datos al endpoint restringido de la carga seleccionada', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { ok: true } });
    const value = { fechaCarga: '2035-01-01', anotador: 'Ana', viaticosMovilidad: 0, viaticosInsumos: 0, gastoCuadrilla: 0, gastoAnotadores: 0, observacionesCarga: '', proveedores: [] };
    await driverCommands.load('7', value);
    expect(patch).toHaveBeenCalledWith('/api/chofer/cargas/7/datos', value);
    patch.mockRestore();
  });
});
