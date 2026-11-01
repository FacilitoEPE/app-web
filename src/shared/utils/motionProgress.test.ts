import { describe, expect, it } from 'vitest';
import { advanceMotion, contentMotion, surfaceMotion } from '@/shared/utils/motionProgress';

describe('continuous spatial motion', () => {
    it('never reveals form content while its surface is moving, in either direction', () => {
        for (let step = 0; step <= 1000; step++) {
            const progress = step / 1000;
            if (contentMotion(progress) > 0) expect(surfaceMotion(progress)).toBe(1);
            if (progress <= .12) expect(surfaceMotion(progress)).toBe(0);
        }
        expect(contentMotion(1)).toBe(1);
        expect(contentMotion(0)).toBe(0);
    });
    it('finishes the visible reveal within 600ms without snapping the spring', () => {
        const state = advanceMotion(0, 0, 1, .6);
        expect(contentMotion(state.position)).toBe(1);
        expect(state.position).toBeLessThan(1);
    });
    it('settles equally at 30 and 120 fps', () => {
        const simulate = (fps: number) => {
            let state = { position: 0, velocity: 0 };
            for (let i = 0; i < fps; i++) state = advanceMotion(state.position, state.velocity, 1, 1 / fps);
            return state.position;
        };
        expect(simulate(30)).toBeCloseTo(simulate(120), 10);
        expect(simulate(30)).toBeCloseTo(1, 3);
    });
    it('brakes continuously when closing during opening', () => {
        const opening = advanceMotion(0, 0, 1, .12);
        const reversing = advanceMotion(opening.position, opening.velocity, 0, .001);
        expect(Math.abs(reversing.position - opening.position)).toBeLessThan(.01);
        expect(reversing.velocity).toBeGreaterThan(0);
        const closed = advanceMotion(reversing.position, reversing.velocity, 0, 1);
        expect(closed.position).toBeCloseTo(0, 3);
    });
});
