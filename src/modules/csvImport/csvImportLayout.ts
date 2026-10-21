const CSV_TWO_PANE_WIDTH = 840;

function effectiveWidth(width: number, fontScale: number): number {
    const scale = Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
    return Number.isFinite(width) && width > 0 ? width / scale : 0;
}

/** Mapping and preview side by side on folds and tablets; large text collapses it to one pane. */
export function csvImportTwoPane(width: number, fontScale: number): boolean {
    return effectiveWidth(width, fontScale) >= CSV_TWO_PANE_WIDTH;
}
