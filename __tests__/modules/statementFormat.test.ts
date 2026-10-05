import {
    formatFileSize,
    formatStatementPeriod,
} from '../../src/modules/statements/statementFormat';

describe('statementFormat', () => {
    it('formats a period from ISO timestamps', () => {
        const label = formatStatementPeriod(
            '2026-08-15T00:00:00.000Z',
            '2026-09-14T00:00:00.000Z',
            'en-US',
        );
        expect(label).toContain('2026');
        expect(label).toContain(' - ');
    });

    it('falls back when a side is missing', () => {
        expect(formatStatementPeriod(null, null, 'en-US')).toBeNull();
        expect(formatStatementPeriod(null, '2026-09-14', 'en-US')).toContain('2026');
        expect(formatStatementPeriod('2026-08-15', null, 'en-US')).toContain('2026');
    });

    it('formats file sizes', () => {
        expect(formatFileSize(null)).toBeNull();
        expect(formatFileSize(2048)).toBe('2 KB');
        expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
    });
});
