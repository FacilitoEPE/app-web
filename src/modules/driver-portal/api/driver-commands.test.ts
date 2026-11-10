import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/shared/api/client';
import { driverCommands } from '@/modules/driver-portal/api/driver-commands.api';
vi.mock('@/modules/driver-portal/api/driver-screen-data', () => ({ projectDriverData: () => {
  const load = { id: '7', permiteEditarCarga: true, kilosProgramados: 100, proveedores: [{ proveedorId: '1' }] };
  return { loads: [load, { ...load, id: 'entrega-5', pendienteRegistro: true }] };
} }));
vi.mock('@/modules/operations/api/operations-context.api', () => ({ operationsContext: () => ({
  coordinations: [{ entregaProgramadaId: 5, coordinacionEntregaId: 6 }],
}) }));

describe('registro de carga del chofer', () => {
  const provider = { proveedorId: '1', proveedorNombre: 'Productor', tipo: 'Productor' as const, fincaNombre: 'Finca', variedad: 'Kent', kilosCargados: 50, jabasCargadas: 2, jabasVacias: 0, binesCargados: 0, binesVacios: 0, mallasCargadas: 0, mallasVacias: 0 };
  const value = { fechaCarga: '2035-01-01', anotador: 'Ana', viaticosMovilidad: 0, viaticosInsumos: 0, gastoCuadrilla: 0, gastoAnotadores: 0, observacionesCarga: '', proveedores: [provider] };
  it('envía los datos al endpoint restringido de la carga seleccionada', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { ok: true } });
    await driverCommands.load('7', value);
    expect(patch).toHaveBeenCalledWith('/v1/chofer/cargas/7/datos', value);
    patch.mockRestore();
  });
  it('envía la entrega sin carga al registro por coordinación', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { ok: true } });
    await driverCommands.load('entrega-5', value);
    expect(post).toHaveBeenCalledExactlyOnceWith('/v1/chofer/coordinaciones/6/carga', value);
    post.mockRestore();
  });
  it('rechaza proveedores ajenos, pesos inválidos y gastos negativos antes de escribir', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { ok: true } });
    await expect(driverCommands.load('7', { ...value, proveedores: [] })).rejects.toThrow(/proveedores/);
    await expect(driverCommands.load('7', { ...value, proveedores: [{ ...provider, proveedorId: '2' }] })).rejects.toThrow(/proveedores/);
    await expect(driverCommands.load('7', { ...value, proveedores: [{ ...provider, kilosCargados: -1 }] })).rejects.toThrow(/kilos/);
    await expect(driverCommands.load('7', { ...value, gastoCuadrilla: -1 })).rejects.toThrow(/gastos/);
    expect(patch).not.toHaveBeenCalled();
    patch.mockRestore();
  });
});
