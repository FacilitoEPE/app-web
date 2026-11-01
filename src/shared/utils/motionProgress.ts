/** Exact critically damped spring step: independent of frame rate, preserves velocity on reversal. */
export function advanceMotion(position: number, velocity: number, target: number, seconds: number) {
    // 20% shorter settling time, preserving the same damping and reversible velocity.
    const omega = 12.5;
    const displacement = position - target;
    const coefficient = velocity + omega * displacement;
    const decay = Math.exp(-omega * seconds);
    return {
        position: target + (displacement + coefficient * seconds) * decay,
        velocity: (velocity - omega * coefficient * seconds) * decay,
    };
}
export const revealMotion = (progress: number, start: number, end: number) => {
    const t = Math.max(0, Math.min(1, (progress - start) / (end - start)));
    return t * t * (3 - 2 * t);
};

/** Move only between the outgoing and incoming content fades. */
export const surfaceMotion = (progress: number) => revealMotion(progress, .12, .9);
export const contentMotion = (progress: number) => revealMotion(progress, .9, .995);
