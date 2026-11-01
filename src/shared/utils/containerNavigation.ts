import { flushSync } from 'react-dom';
import { driveRouteMotion } from '@/shared/utils/routeMotion';

const scrollPositions = new Map<string, number>();
const origins = new Map<string, { parent: string; selector: string; row?: string; label?: string }>();
let trigger: { element: HTMLElement; time: number } | null = null;
let active: ViewTransition | null = null;
let generation = 0;
let running: { from: string; to: string; reverseUpdate?: () => void; controller: ReturnType<typeof driveRouteMotion> } | null = null;
let loadingObserver: MutationObserver | null = null;
let contentReveal: Animation | null = null;

export function rememberNavigationTrigger(element: HTMLElement | null) {
    trigger = element ? { element, time: performance.now() } : null;
}

/** Compatibility for explicit row/card origins; the router owns the animation. */
export function containerNavigate(source: HTMLElement | null, update: () => void) {
    rememberNavigationTrigger(source);
    update();
}

function visible(selector: string): HTMLElement | undefined {
    return Array.from(document.querySelectorAll<HTMLElement>(selector)).find(el => el.getClientRects().length > 0);
}

function findOrigin(path: string) {
    const origin = origins.get(path);
    if (!origin) return;
    const exact = visible(origin.selector);
    if (exact) return exact;
    if (origin.row && origin.label) {
        return Array.from(document.querySelectorAll<HTMLElement>('button,a')).find(el =>
            el.getClientRects().length && el.getAttribute('aria-label') === origin.label &&
            el.closest('tr,[data-motion-row]')?.textContent === origin.row);
    }
}

export function transitionRoute(destination: string, update: () => void, historyNavigation = false) {
    // A late-data entrance belongs to its page, never to the next route's snapshot.
    contentReveal?.cancel();
    contentReveal = null;
    loadingObserver?.disconnect();
    loadingObserver = null;
    const shell = visible('[data-route-surface]');
    const from = shell?.dataset.routeSurface;
    const main = document.querySelector('main');
    if (running?.from === destination && active) {
        running.reverseUpdate = update;
        running.controller.reverse();
        return;
    }
    if (running?.to === destination && running.reverseUpdate && active) {
        running.reverseUpdate = undefined;
        running.controller.resume();
        flushSync(update);
        return;
    }
    running?.controller.stop();
    running = null;
    const token = ++generation;
    active?.skipTransition();
    active = null;
    document.querySelectorAll<HTMLElement>('[style*="view-transition-name: route-surface"]').forEach(el => el.style.viewTransitionName = '');
    document.querySelectorAll<HTMLElement>('[style*="view-transition-name: route-photo"]').forEach(el => el.style.viewTransitionName = '');
    document.querySelectorAll('.route-photo-destination').forEach(el => el.remove());
    delete document.documentElement.dataset.routeTransition;
    if (!from || from === destination || destination === '/login' || destination === '/chofer' || !document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        update();
        return;
    }
    scrollPositions.set(from, main?.scrollTop ?? 0);
    const returning = origins.get(from)?.parent === destination || destination === '/modules';
    const recent = !historyNavigation && trigger && performance.now() - trigger.time < 700 && trigger.element.isConnected ? trigger.element : null;
    let source = shell;
    if (!returning) {
        const module = from === '/modules' ? visible(`[data-module-path="${CSS.escape('/' + destination.split('/')[1])}"]`) : undefined;
        source = module ?? (historyNavigation ? findOrigin(destination) : undefined) ?? (recent && main?.contains(recent) ? recent : shell);
        if (source !== shell) {
            const key = source.dataset.motionKey ?? `origin-${crypto.randomUUID()}`;
            source.dataset.motionKey = key;
            // Prefer semantic attributes that survive list remounts.
            const selector = source.dataset.modulePath ? `[data-module-path="${CSS.escape(source.dataset.modulePath)}"]`
                : source.matches('a[href]') ? `a[href="${CSS.escape(source.getAttribute('href')!)}"]`
                : `[data-motion-key="${CSS.escape(key)}"]`;
            origins.set(destination, { parent: from, selector, row: source.closest('tr,[data-motion-row]')?.textContent ?? undefined, label: source.getAttribute('aria-label') ?? undefined });
        }
    }
    trigger = null;
    const root = document.documentElement;
    root.dataset.routeTransition = returning ? 'return' : 'enter';
    // Keep the photograph independent from text during the expansion.
    let photo = source.hasAttribute('data-module-path') ? source.querySelector<HTMLElement>('.module-card-photo') : null;
    const createPhotoSurface = () => {
        const layer = document.createElement('div');
        layer.className = 'route-photo-destination';
        const bounds = main!.getBoundingClientRect();
        Object.assign(layer.style, { left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px` });
        return layer;
    };
    if (returning && destination === '/modules') {
        photo = createPhotoSurface();
        photo.style.opacity = '0';
        main?.append(photo);
    }
    if (photo) photo.style.viewTransitionName = 'route-photo';
    source.style.viewTransitionName = 'route-surface';
    let target: HTMLElement | undefined;
    let photoTarget: HTMLElement | undefined;
    active = document.startViewTransition(async () => {
        if (token !== generation) return;
        source.style.viewTransitionName = '';
        if (photo) photo.style.viewTransitionName = '';
        if (photo?.classList.contains('route-photo-destination')) photo.remove();
        flushSync(update);
        // Data may arrive after the spatial opening. Reveal it without replaying navigation.
        if (main?.querySelector('[data-route-loading]')) {
            loadingObserver = new MutationObserver(() => {
                if (main.querySelector('[data-route-loading]')) return;
                loadingObserver?.disconnect();
                loadingObserver = null;
                void currentTransition.finished.catch(() => undefined).then(() => {
                    if (token !== generation || main.dataset.routeSurface !== destination) return;
                    contentReveal = main.querySelector<HTMLElement>('.route-surface')?.animate([
                        { opacity: .35, transform: 'translateY(8px)' },
                        { opacity: 1, transform: 'translateY(0)' },
                    ], { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' }) ?? null;
                });
            });
            loadingObserver.observe(main, { childList: true, subtree: true });
        }
        const deadline = performance.now() + 700;
        do {
            if (token !== generation) return;
            target = visible(`[data-route-surface="${CSS.escape(destination)}"]`);
            const awaitingOrigin = returning && destination !== '/modules' && origins.has(from) && !findOrigin(from);
            // Enter immediately into the committed route shell, even while its content loads.
            // Only a return to a specific row needs to wait for that row to exist.
            if (target && !awaitingOrigin) break;
            await new Promise(resolve => setTimeout(resolve, 16));
        } while (performance.now() < deadline);
        if (main) main.scrollTop = scrollPositions.get(destination) ?? 0;
        if (returning) {
            const module = destination === '/modules' ? visible(`[data-module-path="${CSS.escape('/' + from.split('/')[1])}"]`) : undefined;
            target = module ?? findOrigin(from) ?? target;
        }
        if (target) {
            if (!target.hasAttribute('data-route-surface')) target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
            target.style.viewTransitionName = 'route-surface';
            if (photo && !returning) {
                photoTarget = createPhotoSurface();
                photoTarget.style.viewTransitionName = 'route-photo';
                target.append(photoTarget);
            } else if (returning && destination === '/modules') {
                photoTarget = target.querySelector<HTMLElement>('.module-card-photo') ?? undefined;
                if (photoTarget) photoTarget.style.viewTransitionName = 'route-photo';
            }
        }
    });
    const currentTransition = active;
    const controller = driveRouteMotion(currentTransition, () => {
        if (running?.reverseUpdate) {
            flushSync(running.reverseUpdate);
            if (main) main.scrollTop = scrollPositions.get(from) ?? 0;
        }
    });
    running = { from, to: destination, controller };
    void active.finished.catch(() => undefined).finally(() => {
        if (token !== generation) return;
        source.style.viewTransitionName = '';
        if (target) target.style.viewTransitionName = '';
        if (photo) photo.style.viewTransitionName = '';
        if (photoTarget) {
            photoTarget.style.viewTransitionName = '';
            if (photoTarget.classList.contains('route-photo-destination')) photoTarget.remove();
        }
        running?.controller.stop();
        running = null;
        delete root.dataset.routeTransition;
        active = null;
        if (target?.isConnected && !document.querySelector('[role="dialog"],[role="alertdialog"]')) {
            const focus = target.matches('button,a') ? target : target.querySelector<HTMLElement>('h1');
            if (focus) {
                if (!focus.matches('button,a')) focus.tabIndex = -1;
                focus.focus({ preventScroll: true });
            }
        }
    });
}
