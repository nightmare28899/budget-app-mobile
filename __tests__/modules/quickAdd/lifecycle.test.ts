import { closeDecision } from '../../../src/modules/quickAdd/lifecycle';

describe('quick add dismissal policy', () => {
    it('blocks every close and tab switch while saving', () => {
        expect(closeDecision({ dirty: true, busy: true, saved: false })).toBe('blocked');
    });
    it('confirms only dirty unsaved forms', () => {
        expect(closeDecision({ dirty: true, busy: false, saved: false })).toBe('confirm');
        expect(closeDecision({ dirty: false, busy: false, saved: false })).toBe('allow');
    });
    it('successful save can dismiss even before pending state renders', () => {
        expect(closeDecision({ dirty: true, busy: true, saved: true })).toBe('allow');
    });
});
