import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commitRemote, registerDataRefresh } from '@/shared/api/data-contract';
import { clearActionError, getActionError } from '@/shared/api/action-errors';
import { recordRemoteMutation } from '@/shared/api/remote-mutations';

beforeEach(() => { clearActionError(); registerDataRefresh(async () => {}); });
describe('resultado confirmado de una escritura', () => {
    it('mantiene el éxito y avisa si falla la actualización posterior', async () => {
        const write = vi.fn().mockResolvedValue({ id: 17 });
        registerDataRefresh(async () => { throw new Error('No disponible'); });
        await expect(commitRemote(write)).resolves.toEqual({ id: 17 });
        expect(write).toHaveBeenCalledTimes(1);
        expect(getActionError()).toContain('se guardó');
    });
    it('no reconsulta ante rechazo confirmado o validación local sin escrituras', async () => {
        const refresh = vi.fn(); registerDataRefresh(refresh);
        await expect(commitRemote(async () => { throw { statusCode: 409 }; })).rejects.toMatchObject({ statusCode: 409 });
        await expect(commitRemote(async () => { throw new Error('Revisa el dato'); })).rejects.toThrow('Revisa el dato');
        expect(refresh).not.toHaveBeenCalled();
    });
    it('reconcilia un resultado de red incierto sin repetir la escritura', async () => {
        const refresh = vi.fn(); registerDataRefresh(refresh);
        const write = vi.fn().mockRejectedValue({ request: {}, message: 'timeout' });
        await expect(commitRemote(write)).rejects.toMatchObject({ message: 'timeout' });
        expect(write).toHaveBeenCalledTimes(1);
        expect(refresh).toHaveBeenCalledWith(true);
    });
    it('conserva el error del segundo paso aunque falle su reconciliación', async () => {
        const refresh = vi.fn().mockRejectedValue(new Error('lectura fallida')); registerDataRefresh(refresh);
        await expect(commitRemote(async () => {
            recordRemoteMutation('/campanas', { campaniaId: 1 });
            throw new Error('vínculo fallido');
        })).rejects.toThrow('vínculo fallido');
        expect(refresh).toHaveBeenCalledWith(true);
    });
});
