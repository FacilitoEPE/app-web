import { useLayoutEffect, useRef } from 'react';

/** Existing workspaces that switch sections without changing their URL. */
export function useSectionMotion(section: string) {
    const previous = useRef(section);
    const animation = useRef<Animation | null>(null);
    useLayoutEffect(() => {
        if (previous.current === section) return;
        previous.current = section;
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const surface = document.querySelector<HTMLElement>('main .route-surface');
        if (!surface) return;
        const style = getComputedStyle(surface);
        const continuing = animation.current?.playState === 'running';
        const from = continuing ? { opacity: style.opacity, transform: style.transform }
            : { opacity: .35, transform: 'translateY(8px)' };
        animation.current?.cancel();
        animation.current = surface.animate([from, { opacity: 1, transform: 'translateY(0)' }], {
            duration: 380, easing: 'cubic-bezier(.22,1,.36,1)',
        });
    }, [section]);
    useLayoutEffect(() => () => animation.current?.cancel(), []);
}
