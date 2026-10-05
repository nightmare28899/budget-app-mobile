import {
    buildCategoryUpdatePayload,
    isCategoryInUseError,
} from '../../../src/utils/domain/categoryManagement';

const original = { name: 'Food', icon: 'fast-food-outline', color: '#FF6B6B' };

describe('buildCategoryUpdatePayload', () => {
    it('sends only changed allowed fields, trimmed', () => {
        expect(
            buildCategoryUpdatePayload(
                { name: '  Groceries ', icon: original.icon, color: '#4ECDC4' },
                original,
            ),
        ).toEqual({ name: 'Groceries', color: '#4ECDC4' });
    });

    it('returns empty object when nothing changed', () => {
        expect(buildCategoryUpdatePayload({ ...original }, original)).toEqual({});
    });

    it('never emits fields outside name/icon/color', () => {
        const payload = buildCategoryUpdatePayload(
            { name: 'X1', icon: 'a', color: '#fff', id: 'nope', userId: 'u' } as never,
            original,
        );
        expect(Object.keys(payload).sort()).toEqual(['color', 'icon', 'name']);
    });

    it('throws on blank name, long name, long icon or bad color', () => {
        expect(() => buildCategoryUpdatePayload({ name: '   ' }, original)).toThrow();
        expect(() => buildCategoryUpdatePayload({ name: 'a'.repeat(61) }, original)).toThrow();
        expect(() => buildCategoryUpdatePayload({ icon: 'i'.repeat(21) }, original)).toThrow();
        expect(() => buildCategoryUpdatePayload({ color: 'red' }, original)).toThrow();
        expect(() => buildCategoryUpdatePayload({ color: '#12345' }, original)).toThrow();
    });

    it('accepts 3-digit hex colors', () => {
        expect(buildCategoryUpdatePayload({ color: '#abc' }, original)).toEqual({
            color: '#abc',
        });
    });
});

describe('isCategoryInUseError', () => {
    it('matches backend CATEGORY_IN_USE code', () => {
        expect(
            isCategoryInUseError({
                response: {
                    status: 409,
                    data: { code: 'CATEGORY_IN_USE', message: 'categoryDeleteBlocked' },
                },
            }),
        ).toBe(true);
    });

    it('matches code-only and message-only conflicts', () => {
        expect(
            isCategoryInUseError({
                response: { status: 409, data: { message: 'categoryDeleteBlocked' } },
            }),
        ).toBe(true);
        expect(
            isCategoryInUseError({
                response: { status: 409, data: { code: 'CATEGORY_IN_USE' } },
            }),
        ).toBe(true);
    });

    it('does not match other conflicts or errors', () => {
        expect(
            isCategoryInUseError({
                response: { status: 409, data: { message: 'Category already exists' } },
            }),
        ).toBe(false);
        expect(isCategoryInUseError({ response: { status: 404, data: {} } })).toBe(false);
        expect(isCategoryInUseError(new Error('boom'))).toBe(false);
        expect(isCategoryInUseError(undefined)).toBe(false);
    });
});
