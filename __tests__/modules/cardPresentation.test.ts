import {
    cardBrandMark,
    cardNumberMask,
    cardNumberShort,
    cardTitle,
    cardBankLine,
} from '../../src/modules/creditCards/cardNaming';
import {
    clampUtilization,
    formatCardPercent,
    utilizationToneOf,
} from '../../src/modules/creditCards/cardPercent';

describe('utilizationToneOf', () => {
    it('below 30 is healthy', () => {
        expect(utilizationToneOf(0)).toBe('HEALTHY');
        expect(utilizationToneOf(29.99)).toBe('HEALTHY');
    });

    it('30 up to 60 is caution', () => {
        expect(utilizationToneOf(30)).toBe('CAUTION');
        expect(utilizationToneOf(59.99)).toBe('CAUTION');
    });

    it('60 and up is high', () => {
        expect(utilizationToneOf(60)).toBe('HIGH');
        expect(utilizationToneOf(100)).toBe('HIGH');
        expect(utilizationToneOf(187.5)).toBe('HIGH');
    });

    it('negative, NaN and missing values clamp to healthy', () => {
        expect(utilizationToneOf(-5)).toBe('HEALTHY');
        expect(utilizationToneOf(NaN)).toBe('HEALTHY');
        expect(utilizationToneOf(null)).toBe('HEALTHY');
    });

    it('infinity clamps to high', () => {
        expect(utilizationToneOf(Infinity)).toBe('HIGH');
        expect(utilizationToneOf(-Infinity)).toBe('HEALTHY');
    });

    it('clamp keeps 0 to 100 and tolerates garbage', () => {
        expect(clampUtilization(-1)).toBe(0);
        expect(clampUtilization(NaN)).toBe(0);
        expect(clampUtilization(null)).toBe(0);
        expect(clampUtilization(42.5)).toBe(42.5);
        expect(clampUtilization(250)).toBe(100);
    });
});

describe('formatCardPercent', () => {
    it('whole numbers have no decimals', () => {
        expect(formatCardPercent(42)).toBe('42');
        expect(formatCardPercent(0)).toBe('0');
        expect(formatCardPercent(100)).toBe('100');
    });

    it('keeps one decimal, truncated so the label agrees with the tone', () => {
        expect(formatCardPercent(42.5)).toBe('42.5');
        expect(formatCardPercent(29.99)).toBe('29.9');
        expect(formatCardPercent(59.99)).toBe('59.9');
        expect(formatCardPercent(2.3)).toBe('2.3');
    });

    it('over the limit keeps the real value', () => {
        expect(formatCardPercent(187)).toBe('187');
    });

    it('garbage becomes a safe number', () => {
        expect(formatCardPercent(null)).toBe('0');
        expect(formatCardPercent(NaN)).toBe('0');
        expect(formatCardPercent(-12)).toBe('0');
        expect(formatCardPercent(Infinity)).toBe('100');
    });

    it('decimal separator is configurable', () => {
        expect(formatCardPercent(42.5, ',')).toBe('42,5');
    });
});

describe('cardNumberMask', () => {
    it('shows four groups with only the last 4 digits', () => {
        expect(cardNumberMask('0034')).toBe('•••• •••• •••• 0034');
    });

    it('blank or null shows no digits', () => {
        expect(cardNumberMask('')).toBe('•••• •••• •••• ••••');
        expect(cardNumberMask('   ')).toBe('•••• •••• •••• ••••');
        expect(cardNumberMask(null)).toBe('•••• •••• •••• ••••');
    });

    it('shorter input is padded on the left with bullets', () => {
        expect(cardNumberMask('34')).toBe('•••• •••• •••• ••34');
    });

    it('longer input never exposes more than the last 4 digits', () => {
        expect(cardNumberMask('1234 5678 9012 3456')).toBe('•••• •••• •••• 3456');
        expect(cardNumberMask('123456')).toBe('•••• •••• •••• 3456');
    });

    it('non digits are ignored', () => {
        expect(cardNumberMask('ab12-34')).toBe('•••• •••• •••• 1234');
        expect(cardNumberMask('abcd')).toBe('•••• •••• •••• ••••');
    });

    it('compact mask is a single group', () => {
        expect(cardNumberShort('0034')).toBe('•••• 0034');
        expect(cardNumberShort('')).toBe('•••• ••••');
    });
});

describe('card naming', () => {
    it('title hides a name that repeats the bank', () => {
        expect(cardTitle('Banamex', 'Banamex')).toBeNull();
        expect(cardTitle('  banamex ', 'BANAMEX')).toBeNull();
        expect(cardTitle('', 'BBVA')).toBeNull();
    });

    it('title strips a leading bank name', () => {
        expect(cardTitle('Banamex Oro', 'Banamex')).toBe('Oro');
        expect(cardTitle('Azul', 'BBVA')).toBe('Azul');
    });

    it('title keeps a distinct name when the bank is blank', () => {
        expect(cardTitle('Nu Personal', '')).toBe('Nu Personal');
    });

    it('bank line falls back to the name', () => {
        expect(cardBankLine('Oro', 'Banamex')).toBe('Banamex');
        expect(cardBankLine('Oro', ' ')).toBe('Oro');
    });

    it('brand mark text', () => {
        expect(cardBrandMark('visa')).toBe('VISA');
        expect(cardBrandMark('MASTERCARD')).toBe('mastercard');
        expect(cardBrandMark('Amex')).toBe('AMEX');
        expect(cardBrandMark('discover')).toBe('DISCOVER');
        expect(cardBrandMark('OTHER')).toBeNull();
        expect(cardBrandMark(' ')).toBeNull();
    });

    it('unknown brands show their own uppercase name', () => {
        expect(cardBrandMark('Carnet')).toBe('CARNET');
        expect(cardBrandMark('x')).not.toBeNull();
    });
});
