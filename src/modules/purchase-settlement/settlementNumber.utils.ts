/** The UI proposes a number because V1 requires one and has no sequence endpoint. */
export function suggestSettlementNumber(existingNumbers: string[], date: string, kind: 'LC' | 'LT'): string {
    const year = /^\d{4}/.exec(date)?.[0] ?? String(new Date().getFullYear());
    const prefix = `${kind}-${year}-`;
    const next = existingNumbers.reduce((max, number) => {
        if (!number.startsWith(prefix)) return max;
        const suffix = number.slice(prefix.length);
        return /^\d+$/.test(suffix) ? Math.max(max, Number(suffix)) : max;
    }, 0) + 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
}
