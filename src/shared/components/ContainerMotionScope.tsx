import { useEffect, useRef, type ReactNode } from 'react';
import { ContainerMotionContext, type Origin } from '@/shared/hooks/container-motion';

/** Portals share the opener across the authenticated workspace. */
export function ContainerMotionScope({ children }: { children: ReactNode }) {
    const origin = useRef<Origin | null>(null);
    useEffect(() => {
        const capture = (event: Event) => {
            if (!(event.target instanceof Element)) return;
            if (event instanceof KeyboardEvent && !['Enter', ' '].includes(event.key)) return;
            const element = event.target.closest<HTMLElement>('button, a, [role="menuitem"]');
            // Menu items unmount immediately: return to the persistent menu launcher.
            if (element?.getAttribute('role') === 'menuitem' && origin.current?.element.isConnected) return;
            if (element) origin.current = { element, rect: element.getBoundingClientRect() };
        };
        document.addEventListener('pointerdown', capture, true);
        document.addEventListener('keydown', capture, true);
        return () => {
            document.removeEventListener('pointerdown', capture, true);
            document.removeEventListener('keydown', capture, true);
        };
    }, []);
    return <ContainerMotionContext value={origin}>{children}</ContainerMotionContext>;
}

