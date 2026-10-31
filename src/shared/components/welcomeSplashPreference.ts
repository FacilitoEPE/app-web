const SKIP_KEY = "epe:intro-skipped";
let skipForSession = false;

export function isSplashSkipped(): boolean {
    try {
        return localStorage.getItem(SKIP_KEY) === "1";
    } catch {
        return skipForSession;
    }
}

export function saveSplashSkipped(skipped: boolean) {
    skipForSession = skipped;
    try {
        localStorage.setItem(SKIP_KEY, skipped ? "1" : "0");
    } catch {
        // La preferencia se conserva durante la sesión si el almacenamiento no está disponible.
    }
}
