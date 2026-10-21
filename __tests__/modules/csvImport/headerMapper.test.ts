import {
    autoMapHeaders,
    isMappingUsable,
    looksLikeHeader,
    withMapping,
} from '../../../src/modules/csvImport/headerMapper';

describe('autoMapHeaders', () => {
    it('maps english headers', () => {
        const m = autoMapHeaders(['Date', 'Description', 'Amount', 'Currency', 'Category', 'Note', 'Merchant']);
        expect(m).toEqual({ date: 0, title: 1, amount: 2, currency: 3, category: 4, note: 5, merchant: 6 });
    });

    it('maps spanish headers with accents and case', () => {
        const m = autoMapHeaders(['FECHA', 'Descripción', 'Importe', 'Moneda', 'Categoría', 'Nota', 'Comercio']);
        expect(m).toEqual({ date: 0, title: 1, amount: 2, currency: 3, category: 4, note: 5, merchant: 6 });
    });

    it('maps alternative spanish aliases', () => {
        const m = autoMapHeaders(['Concepto', 'Monto', 'Fecha de operación']);
        expect(m).toEqual({ title: 0, amount: 1, date: 2 });
    });

    it('tolerates a bom and whitespace', () => {
        const m = autoMapHeaders(['﻿ Date ', '  title']);
        expect(m).toEqual({ date: 0, title: 1 });
    });

    it('maps a column at most once', () => {
        const m = autoMapHeaders(['Date', 'Date', 'Amount']);
        expect(new Set(Object.values(m))).toEqual(new Set([0, 2]));
    });

    it('maps debit and credit columns', () => {
        const m = autoMapHeaders(['Fecha', 'Concepto', 'Cargo', 'Abono']);
        expect(m.debit).toBe(2);
        expect(m.credit).toBe(3);
        expect(m.amount).toBeUndefined();
    });

    it('turns a lone debit column into the amount', () => {
        const m = autoMapHeaders(['Fecha', 'Concepto', 'Cargo']);
        expect(m.amount).toBe(2);
        expect(m.debit).toBeUndefined();
    });

    it('keeps a lone credit column as credit', () => {
        const m = autoMapHeaders(['Fecha', 'Concepto', 'Abono']);
        expect(m.credit).toBe(2);
        expect(m.amount).toBeUndefined();
    });

    it('maps nothing for unknown headers', () => {
        expect(autoMapHeaders(['foo', 'bar'])).toEqual({});
    });
});

describe('looksLikeHeader', () => {
    it('needs two recognised columns', () => {
        expect(looksLikeHeader(['Date', 'Amount', 'x'])).toBe(true);
        expect(looksLikeHeader(['2024-01-02', 'Coffee', '3.50'])).toBe(false);
    });
});

describe('column mapping', () => {
    it('is usable with date and amount, or date and debit/credit', () => {
        expect(isMappingUsable({ date: 0, amount: 1 })).toBe(true);
        expect(isMappingUsable({ date: 0, debit: 1, credit: 2 })).toBe(true);
        expect(isMappingUsable({ date: 0 })).toBe(false);
        expect(isMappingUsable({ amount: 1 })).toBe(false);
    });

    it('replaces and clears a field and steals the column from another', () => {
        const m = { date: 0, title: 1 };
        expect(withMapping(m, 'amount', 1).amount).toBe(1);
        expect(withMapping(m, 'amount', 1).title).toBeUndefined();
        expect(withMapping(m, 'date', null).date).toBeUndefined();
        expect(m).toEqual({ date: 0, title: 1 });
    });
});
