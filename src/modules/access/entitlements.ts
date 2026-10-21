export type Entitlements = {
    accountKnown: boolean;
    isPremium: boolean;
    isDisabled: boolean;
    deletedAt: string | null;
};

const record = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown> : {};
const boolean = (value: unknown) => value === true || value === 1 || value === 'true' || value === '1';

export function normalizeEntitlements(value: unknown): Entitlements {
    const envelope = record(value);
    const source = record(envelope.data ?? envelope);
    const account = record(source.account);
    return {
        accountKnown: source.account !== null && typeof source.account === 'object' && !Array.isArray(source.account),
        isPremium: boolean(account.isPremium),
        isDisabled: boolean(account.isDisabled),
        deletedAt: typeof account.deletedAt === 'string' ? account.deletedAt : null,
    };
}

export function applyEntitlements<T extends { isPremium?: boolean | null }>(user: T, remote: Entitlements | undefined): T {
    return remote?.accountKnown ? { ...user, isPremium: remote.isPremium && !remote.isDisabled } : user;
}

export type AccountSession = { userId: string | undefined; sessionRevision: number; isAuthenticated: boolean };
export function sameAccountSession(request: AccountSession, current: AccountSession): boolean {
    return request.isAuthenticated && current.isAuthenticated && Boolean(request.userId)
        && request.userId === current.userId && request.sessionRevision === current.sessionRevision;
}
