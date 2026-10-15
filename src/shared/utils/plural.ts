/** Sustantivo en singular o plural según la cantidad: `plural(1, "finca", "fincas")` → "finca". */
export function plural(count: number, one: string, other: string): string {
    return count === 1 ? one : other;
}
