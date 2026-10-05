import {
    creditCardFallbackColor,
    creditCardTheme,
    normalizeCardIdentity,
    themeKeyFor,
} from '../../src/modules/creditCards/creditCardVisuals';

const base = { id: 'card-1', name: '', bank: '', color: null };

describe('normalizeCardIdentity', () => {
    it('strips accents, networks and punctuation', () => {
        expect(normalizeCardIdentity('Banamex  Oro Mastercard!')).toBe('banamex oro');
        expect(normalizeCardIdentity('Crédito VISA')).toBe('credito');
    });
});

describe('themeKeyFor', () => {
    it('detects supported banks from bank or name', () => {
        expect(themeKeyFor({ ...base, bank: 'Banamex', name: 'Oro' })).toBe('banamex');
        expect(themeKeyFor({ ...base, bank: 'BBVA', name: 'Azul' })).toBe('bbva');
        expect(themeKeyFor({ ...base, bank: 'Rappi', name: 'RappiCard' })).toBe('rappi');
        expect(themeKeyFor({ ...base, bank: 'Nu', name: 'Rappicard' })).toBe('rappi');
        expect(themeKeyFor({ ...base, bank: 'Nu', name: 'Personal' })).toBe('default');
    });

    it('keeps demo cards on the default theme', () => {
        expect(themeKeyFor({ ...base, bank: 'Banamex', name: 'Budget Demo' })).toBe('default');
    });
});

describe('creditCardTheme', () => {
    it('uses bank palettes', () => {
        expect(creditCardTheme({ ...base, bank: 'Banamex' }).background).toBe('#BE123C');
        expect(creditCardTheme({ ...base, bank: 'BBVA' }).accent).toBe('#075985');
    });

    it('falls back to the stored color, then a deterministic color', () => {
        expect(creditCardTheme({ ...base, bank: 'Nu', color: '#123456' }).background).toBe('#123456');
        const first = creditCardFallbackColor({ id: 'abc', color: null });
        expect(creditCardFallbackColor({ id: 'abc', color: null })).toBe(first);
        expect(first).toMatch(/^#[0-9A-F]{6}$/);
    });
});
