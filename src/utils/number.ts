export const toNum = (value: unknown): number => {
    const parsed = typeof value === 'number' ? value : Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
};
