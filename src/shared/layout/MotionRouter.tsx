import { useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { Router, NavigationType, createPath, type Location, type Navigator, type To } from 'react-router-dom';
import { transitionRoute, rememberNavigationTrigger } from '@/shared/utils/containerNavigation';

function readLocation(): Location {
    return { pathname: location.pathname, search: location.search, hash: location.hash,
        state: history.state?.usr ?? null, key: history.state?.key ?? 'default' };
}

/** One commit boundary for links, imperative navigation and native back/forward. */
export default function MotionRouter({ children }: { children: ReactNode }) {
    const [snapshot, setSnapshot] = useState(() => ({ location: readLocation(), action: NavigationType.Pop }));
    const navigator = useMemo<Navigator>(() => {
        const commit = (action: NavigationType) => {
            const next = readLocation();
            transitionRoute(next.pathname, () => setSnapshot({ location: next, action }));
        };
        const write = (to: To, state: unknown, replace: boolean) => {
            const href = typeof to === 'string' ? to : createPath(to);
            const next = { usr: state, key: crypto.randomUUID(), idx: (history.state?.idx ?? 0) + (replace ? 0 : 1) };
            history[replace ? 'replaceState' : 'pushState'](next, '', href);
            commit(replace ? NavigationType.Replace : NavigationType.Push);
        };
        return {
            createHref: to => typeof to === 'string' ? to : createPath(to),
            encodeLocation: to => { const url = new URL(typeof to === 'string' ? to : createPath(to), location.href); return { pathname: url.pathname, search: url.search, hash: url.hash }; },
            push: (to, state) => write(to, state, false),
            replace: (to, state) => write(to, state, true),
            go: delta => history.go(delta),
        };
    }, []);

    useLayoutEffect(() => {
        if (history.state?.idx == null) history.replaceState({ ...history.state, idx: 0 }, '');
        const pop = () => {
            const next = readLocation();
            transitionRoute(next.pathname, () => setSnapshot({ location: next, action: NavigationType.Pop }), true);
        };
        const capture = (event: Event) => {
            if (event instanceof KeyboardEvent && !['Enter', ' '].includes(event.key)) return;
            if (event.target instanceof Element) rememberNavigationTrigger(event.target.closest<HTMLElement>('button,a,[role="menuitem"]'));
        };
        window.addEventListener('popstate', pop);
        document.addEventListener('click', capture, true);
        document.addEventListener('keydown', capture, true);
        return () => {
            window.removeEventListener('popstate', pop);
            document.removeEventListener('click', capture, true);
            document.removeEventListener('keydown', capture, true);
        };
    }, []);
    return <Router location={snapshot.location} navigationType={snapshot.action} navigator={navigator}>{children}</Router>;
}
