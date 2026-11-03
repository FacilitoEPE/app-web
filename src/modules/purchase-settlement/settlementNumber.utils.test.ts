import { describe, expect, it } from 'vitest';
import { suggestSettlementNumber } from '@/modules/purchase-settlement/settlementNumber.utils';

describe('propuesta editable de número de liquidación', () => {
    it('sigue el mayor consecutivo del año y tipo de liquidación', () => {
        expect(suggestSettlementNumber(['LC-2026-0002', 'LC-2026-0012', 'LC-2025-9999', 'LT-2026-0004'], '2026-11-02', 'LC'))
            .toBe('LC-2026-0013');
    });
});
