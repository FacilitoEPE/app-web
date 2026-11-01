import { advanceMotion, surfaceMotion } from '@/shared/utils/motionProgress';

/** Drive the browser's geometry and reveal animations with one reversible progress. */
export function driveRouteMotion(transition: ViewTransition, onReverse: () => void) {
    let frame = 0, previous = 0, position = 0, velocity = 0, target = 1;
    let animations: Animation[] = [];
    let tracks: { animation: Animation; duration: number; geometry: boolean }[] = [];
    let stopped = false;
    const tick = (now: number) => {
        if (stopped) return;
        const dt = previous ? Math.min((now - previous) / 1000, .04) : 0;
        previous = now;
        ({ position, velocity } = advanceMotion(position, velocity, target, dt));
        const p = Math.max(0, Math.min(1, position));
        const geometry = surfaceMotion(p);
        tracks.forEach(track => { track.animation.currentTime = (track.geometry ? geometry : p) * track.duration; });
        if (Math.abs(target - position) < .001 && Math.abs(velocity) < .02) {
            if (!target) { onReverse(); transition.skipTransition(); }
            else animations.forEach(animation => animation.finish());
            return;
        }
        frame = requestAnimationFrame(tick);
    };
    void transition.ready.then(() => {
        if (stopped) return;
        animations = document.getAnimations().filter(animation => {
            const pseudo = (animation.effect as KeyframeEffect | null)?.pseudoElement;
            return pseudo?.includes('view-transition') && pseudo.includes('route-');
        });
        animations.forEach(animation => { animation.pause(); animation.currentTime = 0; });
        tracks = animations.map(animation => ({
            animation,
            duration: Number(animation.effect?.getTiming().duration ?? 1000),
            geometry: Boolean((animation.effect as KeyframeEffect | null)?.pseudoElement?.includes('view-transition-group(')),
        }));
        frame = requestAnimationFrame(tick);
    }).catch(() => undefined);
    return {
        reverse() { target = 0; },
        resume() { target = 1; },
        stop() { stopped = true; cancelAnimationFrame(frame); },
    };
}
