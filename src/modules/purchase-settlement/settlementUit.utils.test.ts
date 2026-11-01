import { describe, expect, it } from 'vitest';
import { importeParaUit } from '@/modules/purchase-settlement/settlementUit.utils';

describe('equivalente en soles para UIT', () => {
  it('conserva soles y convierte dólares con el tipo fijo', () => {
    expect(importeParaUit(100, 'PEN')).toBe(100);
    expect(importeParaUit(100, 'USD')).toBe(370);
    expect(() => importeParaUit(100, 'EUR')).toThrow();
  });
});
