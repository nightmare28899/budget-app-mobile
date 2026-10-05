import {
    buildLinkExpensesPayload,
    diffExpenseLinks,
} from '../../../src/utils/domain/subscriptionLinks';

describe('buildLinkExpensesPayload', () => {
    it('dedupes, trims and keeps only expenseIds', () => {
        expect(buildLinkExpensesPayload([' a ', 'a', 'b'])).toEqual({
            expenseIds: ['a', 'b'],
        });
    });

    it('throws when empty (backend ArrayMinSize(1))', () => {
        expect(() => buildLinkExpensesPayload([])).toThrow();
        expect(() => buildLinkExpensesPayload(['  '])).toThrow();
    });
});

describe('diffExpenseLinks', () => {
    it('computes ids to link and unlink', () => {
        expect(diffExpenseLinks(['a', 'b'], ['b', 'c'])).toEqual({
            toLink: ['c'],
            toUnlink: ['a'],
        });
    });

    it('is empty when selection equals initial', () => {
        expect(diffExpenseLinks(['a'], ['a'])).toEqual({ toLink: [], toUnlink: [] });
    });
});
