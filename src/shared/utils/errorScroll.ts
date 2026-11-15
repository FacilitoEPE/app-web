const ERROR_ALERT = '[role="alert"]:not([data-error-scroll="off"]):not([data-slot="alert"]:not([data-variant="destructive"]))';
const DIALOG = '[role="dialog"][data-open], [role="alertdialog"][data-open]';
const FORM_SCOPE = `form, [data-error-scope], ${DIALOG}`;
const SCROLL_GAP = 12;

function isVisible(element: Element) {
    return element.isConnected && !element.closest('[inert], [aria-hidden="true"], [data-ending-style]') &&
        element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible';
}

function errorScroller(error: Element) {
    for (let parent = error.parentElement; parent && parent !== document.body && parent !== document.documentElement; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (/^(auto|scroll|overlay)$/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight) return parent;
        if (style.position === 'fixed') return null;
    }
    return document.scrollingElement;
}

function reveal(error: Element) {
    const scroller = errorScroller(error);
    if (!scroller) return;

    let top = 0;
    let bottom = document.documentElement.clientHeight;
    // A parent can clip part of this scroller. Use the visible area without moving the parent.
    for (let box: Element | null = scroller; box && box !== document.body && box !== document.documentElement; box = box.parentElement) {
        if (getComputedStyle(box).overflowY === 'visible') continue;
        const edge = box.getBoundingClientRect().top + box.clientTop;
        top = Math.max(top, edge);
        bottom = Math.min(bottom, edge + box.clientHeight);
    }
    const height = bottom - top;
    if (height <= 0) return;

    const message = error.getBoundingClientRect();
    const field = error.closest('[data-slot="field"]')?.getBoundingClientRect();
    const target = field && field.height + 2 * SCROLL_GAP <= height ? field : message;
    if (target.top >= top && target.bottom <= bottom) return;

    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    scroller.scrollTo({ top: scroller.scrollTop + target.top - top - SCROLL_GAP, behavior });
}

const changedErrors = new Set<Element>();
let retryScope: Element | null = null;
let frame = 0;

function scheduleReveal() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
        frame = 0;
        const fresh = [...changedErrors].filter(isVisible).sort((a, b) =>
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
        const scope = retryScope ?? fresh[0]?.closest(FORM_SCOPE);
        const first = scope && isVisible(scope)
            ? Array.from(scope.querySelectorAll(ERROR_ALERT)).find(error => {
                const owner = error.closest(FORM_SCOPE);
                return (!owner || owner === scope) && isVisible(error);
            })
            : undefined;
        changedErrors.clear();
        retryScope = null;
        const error = first ?? fresh[0];
        if (error) reveal(error);
    });
}

/** On retries, React can leave the same alert in the DOM without changing its text. */
export function revealFormErrors(scope?: Element | null) {
    retryScope = scope ?? Array.from(document.querySelectorAll(DIALOG)).findLast(isVisible)
        ?? document.querySelector('[data-route-surface]') ?? document.body;
    scheduleReveal();
}

/** Observe rendered alerts, including forms inside dialog portals. */
export function observeErrorScroll() {
    const observer = new MutationObserver(records => {
        for (const record of records) {
            const parent = record.target instanceof Element ? record.target : record.target.parentElement;
            const editedError = parent?.closest(ERROR_ALERT);
            if (editedError) changedErrors.add(editedError);
            for (const node of Array.from(record.addedNodes)) {
                if (!(node instanceof Element)) continue;
                if (node.matches(ERROR_ALERT)) changedErrors.add(node);
                for (const error of Array.from(node.querySelectorAll(ERROR_ALERT))) changedErrors.add(error);
            }
        }
        if (changedErrors.size) scheduleReveal();
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    return () => {
        observer.disconnect();
        cancelAnimationFrame(frame);
        frame = 0;
        changedErrors.clear();
        retryScope = null;
    };
}
