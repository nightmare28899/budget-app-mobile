const SPACE_TYPES = /^[\p{Zs}\p{Zl}\p{Zp}]$/u;
const DROPPED_TYPES = /^[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}]$/u;

function isExplicitSpace(codePoint: number): boolean {
    return (
        codePoint === 32
        || codePoint === 9
        || codePoint === 10
        || codePoint === 13
        || codePoint === 133
    );
}

/** Collapses whitespace, drops control/format characters and caps the result at `maxLength` code points. */
export function cleanCsvText(raw: string, maxLength: number): string {
    const kept: string[] = [];
    let lastSpace = true;
    for (const char of raw) {
        const codePoint = char.codePointAt(0) ?? 0;
        if (isExplicitSpace(codePoint) || SPACE_TYPES.test(char)) {
            if (!lastSpace) {
                kept.push(' ');
                lastSpace = true;
            }
        } else if (!DROPPED_TYPES.test(char)) {
            kept.push(char);
            lastSpace = false;
        }
    }
    const collapsed = kept.join('').trim();
    const points = Array.from(collapsed);
    const capped = points.length > maxLength ? points.slice(0, maxLength).join('') : collapsed;
    return capped.trim();
}

export function wasTruncated(raw: string, maxLength: number): boolean {
    return Array.from(cleanCsvText(raw, Number.MAX_SAFE_INTEGER)).length > maxLength;
}
