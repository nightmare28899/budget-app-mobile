import { applyEntitlements, normalizeEntitlements, sameAccountSession } from '../../../src/modules/access/entitlements';

describe('server entitlements', () => {
    it('known disabled accounts cannot retain premium', () => {
        const e = normalizeEntitlements({ account: { isPremium: true, isDisabled: true } });
        expect(applyEntitlements({ isPremium: true }, e).isPremium).toBe(false);
    });
    it('unknown account preserves cached premium', () => {
        expect(applyEntitlements({ isPremium: true }, normalizeEntitlements({ account: null })).isPremium).toBe(true);
    });
    it('server known free account overrides premium', () => {
        expect(applyEntitlements({ isPremium: true }, normalizeEntitlements({ account: { isPremium: false } })).isPremium).toBe(false);
    });
    it('normalizes tolerant booleans without treating false strings as true', () => {
        expect(normalizeEntitlements({ account: { isPremium: 'true', isDisabled: 'false' } })).toMatchObject({ accountKnown: true, isPremium: true, isDisabled: false });
    });
    it('rejects results after logout, account or session changes', () => {
        const request = { userId: 'a', sessionRevision: 1, isAuthenticated: true };
        expect(sameAccountSession(request, { ...request })).toBe(true);
        expect(sameAccountSession(request, { ...request, isAuthenticated: false })).toBe(false);
        expect(sameAccountSession(request, { ...request, userId: 'b' })).toBe(false);
        expect(sameAccountSession(request, { ...request, sessionRevision: 2 })).toBe(false);
    });
});
