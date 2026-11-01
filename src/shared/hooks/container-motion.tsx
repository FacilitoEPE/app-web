import { createContext, useCallback, useContext } from 'react';
import { advanceMotion, revealMotion, surfaceMotion, contentMotion } from '@/shared/utils/motionProgress';

export type Origin = { element: HTMLElement; rect: DOMRect };
export const ContainerMotionContext = createContext<{ current: Origin | null } | null>(null);
export const DialogMotionLifecycle = createContext<(() => void) | null>(null);
const liveDialogs = new Map<HTMLElement, { relinquish: () => DOMRect; trigger?: HTMLElement; opacity: string }>();
export function useContainerMotionEnabled() { return useContext(ContainerMotionContext) !== null; }
export function useContainerMotionRef() {
    const origin = useContext(ContainerMotionContext);
    const complete = useContext(DialogMotionLifecycle);
    return useCallback((popup: HTMLDivElement | null) => {
        if (!popup || !origin) return;
        return animateDialog(popup, origin.current, complete);
    }, [origin, complete]);
}

/** One spring owns all visual layers. The dialog keeps its real size and accessible controls. */
function animateDialog(popup: HTMLDivElement, source: Origin | null, complete: (() => void) | null) {
    popup.dataset.containerMotion = '';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const outgoing = Array.from(liveDialogs).find(([el]) => el.hasAttribute('data-ending-style'))?.[1];
    const handoff = outgoing?.relinquish();
    const trigger = outgoing?.trigger ?? source?.element;
    const savedOpacity = outgoing?.opacity ?? trigger?.style.opacity ?? '';
    const savedStyle = { background: popup.style.background, boxShadow: popup.style.boxShadow, borderColor: popup.style.borderColor };
    const children = Array.from(popup.children) as HTMLElement[];
    const childStyles = children.map(el => ({ opacity: el.style.opacity }));
    const backdrop = popup.parentElement?.querySelector<HTMLElement>('[data-container-motion-backdrop]');
    const surface = document.createElement('div');
    surface.className = 'motion-dialog-surface';
    surface.setAttribute('aria-hidden', 'true');
    const style = getComputedStyle(popup);
    const destinationColor = style.backgroundColor;
    const triggerStyle = trigger ? getComputedStyle(trigger) : null;
    const originColor = triggerStyle?.backgroundImage && triggerStyle.backgroundImage !== 'none'
        ? 'var(--brand)' : triggerStyle?.backgroundColor;
    const sourceColor = handoff || !originColor || originColor === 'rgba(0, 0, 0, 0)' ? destinationColor : originColor;
    Object.assign(surface.style, { background: style.backgroundColor, boxShadow: style.boxShadow, transformOrigin: '0 0' });
    popup.parentElement!.insertBefore(surface, popup);
    let position = 0, velocity = 0, target = 1, previous = 0, frame = 0;
    let rect = popup.getBoundingClientRect();
    const sizeSurface = () => Object.assign(surface.style, {
        left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px`,
    });
    sizeSurface();
    const radius = parseFloat(style.borderTopLeftRadius) || 24;
    const getOrigin = () => {
        const r = trigger?.isConnected ? trigger.getBoundingClientRect() : null;
        return r && r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight ? r : null;
    };
    let origin = handoff ?? getOrigin();
    const restore = () => {
        Object.assign(popup.style, savedStyle);
        children.forEach((el, i) => Object.assign(el.style, childStyles[i]));
        if (trigger) trigger.style.opacity = savedOpacity;
        if (backdrop) backdrop.style.opacity = '';
        surface.style.visibility = 'hidden';
        popup.dataset.motionPhase = 'open';
    };
    const paint = () => {
        const p = Math.max(0, Math.min(1, position));
        const geometry = surfaceMotion(p);
        popup.dataset.motionPhase = target ? 'opening' : 'closing';
        const from = origin ?? new DOMRect(rect.x, rect.y + 8, rect.width, rect.height);
        const x = from.x + (rect.x - from.x) * geometry;
        const y = from.y + (rect.y - from.y) * geometry;
        const sx = (from.width + (rect.width - from.width) * geometry) / rect.width;
        const sy = (from.height + (rect.height - from.height) * geometry) / rect.height;
        Object.assign(surface.style, { visibility: 'visible', transform: `translate(${x - rect.x}px, ${y - rect.y}px) scale(${sx},${sy})`, borderRadius: `${radius / sx}px / ${radius / sy}px`, opacity: String(origin ? revealMotion(p, 0, .09) : p) });
        surface.style.background = `color-mix(in oklab, ${sourceColor} ${(1 - revealMotion(p, 0, .55)) * 100}%, ${destinationColor})`;
        Object.assign(popup.style, { background: 'transparent', boxShadow: 'none', borderColor: 'transparent' });
        // Fields stay in their final layout. Never reveal a partially sized/cropped form.
        const contentOpacity = String(contentMotion(p));
        children.forEach(el => { el.style.opacity = contentOpacity; });
        if (backdrop) backdrop.style.opacity = String(handoff && target ? 1 : revealMotion(p, 0, .85));
        // Hand the label back before the spring's quiet settling tail.
        if (trigger && !(handoff && target)) trigger.style.opacity = String(1 - revealMotion(p, .08, .35));
        if (origin) surface.style.opacity = String(handoff && target ? 1 : revealMotion(p, .08, .35));
    };
    const tick = (now: number) => {
        const dt = previous ? Math.min((now - previous) / 1000, .04) : 0;
        previous = now;
        ({ position, velocity } = advanceMotion(position, velocity, target, dt));
        paint();
        if (Math.abs(target - position) < .001 && Math.abs(velocity) < .02) {
            position = target; velocity = 0; frame = 0; paint();
            if (target) restore(); else { if (trigger) trigger.style.opacity = savedOpacity; complete?.(); }
            return;
        }
        frame = requestAnimationFrame(tick);
    };
    const start = () => { if (!frame) { previous = 0; frame = requestAnimationFrame(tick); } };
    const observer = new MutationObserver(() => {
        const next = popup.hasAttribute('data-ending-style') ? 0 : 1;
        if (next === target) return;
        target = next;
        rect = popup.getBoundingClientRect();
        sizeSurface();
        origin = getOrigin();
        paint(); start();
    });
    observer.observe(popup, { attributes: true, attributeFilter: ['data-ending-style'] });
    const resize = new ResizeObserver(() => {
        const next = popup.getBoundingClientRect();
        // Preserve the currently painted surface when a field/error changes the target size.
        // Rebase the origin, keeping progress and velocity instead of restarting the opening.
        const geometry = surfaceMotion(position);
        if (frame && geometry < .99 && (next.width !== rect.width || next.height !== rect.height)) {
            const current = surface.getBoundingClientRect();
            const p = geometry, remaining = 1 - p;
            origin = new DOMRect((current.x - next.x * p) / remaining, (current.y - next.y * p) / remaining,
                (current.width - next.width * p) / remaining, (current.height - next.height * p) / remaining);
        }
        rect = next;
        sizeSurface();
        if (frame) paint();
    });
    resize.observe(popup);
    liveDialogs.set(popup, { trigger, opacity: savedOpacity, relinquish: () => {
        const current = surface.style.visibility !== 'hidden' ? surface.getBoundingClientRect() : popup.getBoundingClientRect();
        cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect();
        popup.style.visibility = 'hidden'; surface.style.visibility = 'hidden';
        if (backdrop) backdrop.style.opacity = '0';
        queueMicrotask(() => complete?.());
        return current;
    } });
    paint(); start();
    return () => {
        cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect(); restore(); surface.remove();
        liveDialogs.delete(popup);
        popup.style.visibility = '';
        delete popup.dataset.motionPhase;
    };
}
