import { formatDrawerBadge } from '../../../src/utils/domain/drawerBadge';

describe('formatDrawerBadge', () => {
    it('hides the badge for null, undefined, zero and negative counts', () => {
        expect(formatDrawerBadge(null)).toBeNull();
        expect(formatDrawerBadge(undefined)).toBeNull();
        expect(formatDrawerBadge(0)).toBeNull();
        expect(formatDrawerBadge(-3)).toBeNull();
    });

    it('shows the exact count up to 99', () => {
        expect(formatDrawerBadge(1)).toBe('1');
        expect(formatDrawerBadge(99)).toBe('99');
    });

    it('caps larger counts at 99+', () => {
        expect(formatDrawerBadge(100)).toBe('99+');
        expect(formatDrawerBadge(1000)).toBe('99+');
    });
});
