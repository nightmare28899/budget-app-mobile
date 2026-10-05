import {
    buildReportCsv,
    buildReportCsvData,
    CSV_BOM,
    escapeCsvCell,
} from '../../../src/utils/domain/reportCsv';

const labels = {
    period: 'Period',
    currency: 'Currency',
    total: 'Total',
    operations: 'Operations',
    card: 'Card',
    last4: 'Last 4',
    expenses: 'Expenses',
    category: 'Category',
};

describe('escapeCsvCell', () => {
    it('quotes commas, quotes and newlines', () => {
        expect(escapeCsvCell('a,b')).toBe('"a,b"');
        expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
        expect(escapeCsvCell('l1\nl2')).toBe('"l1\nl2"');
        expect(escapeCsvCell('l1\r\nl2')).toBe('"l1\r\nl2"');
    });

    it('neutralises formula injection but keeps negative numbers', () => {
        expect(escapeCsvCell('=SUM(A1)')).toBe("'=SUM(A1)");
        expect(escapeCsvCell('@x')).toBe("'@x");
        expect(escapeCsvCell('-cmd')).toBe("'-cmd");
        expect(escapeCsvCell('-12.50')).toBe('-12.50');
        expect(escapeCsvCell(-12.5)).toBe('-12.5');
    });
});

describe('buildReportCsvData', () => {
    const expenses = [
        { cost: '10.10', currency: 'MXN', date: '2026-04-01T00:00:00.000Z', category: { name: 'Food' } },
        { cost: '0.20', currency: 'MXN', date: '2026-04-01T23:59:59.000Z', category: { name: 'Food' } },
        { cost: 5, currency: 'USD', date: '2026-04-02', category: null },
        { cost: 'abc', currency: 'MXN', date: '2026-04-02', category: { name: 'Food' } },
    ];

    it('groups by date-only string (no timezone shift) with cent-safe sums', () => {
        const { buckets, categories } = buildReportCsvData(expenses, 'Uncategorized');
        expect(buckets).toEqual([
            {
                label: '2026-04-01',
                totalsByCurrency: { MXN: 10.3 },
                countsByCurrency: { MXN: 2 },
            },
            {
                label: '2026-04-02',
                totalsByCurrency: { USD: 5, MXN: 0 },
                countsByCurrency: { USD: 1, MXN: 1 },
            },
        ]);
        expect(categories).toEqual([
            { name: 'Food', currency: 'MXN', total: 10.3, count: 3 },
            { name: 'Uncategorized', currency: 'USD', total: 5, count: 1 },
        ]);
    });
});

describe('buildReportCsv', () => {
    it('renders BOM, CRLF rows, primary currency zero rows, cards and categories', () => {
        const csv = buildReportCsv({
            labels,
            primaryCurrency: 'MXN',
            buckets: [
                { label: '2026-04-01', totalsByCurrency: { USD: 5 }, countsByCurrency: { USD: 1 } },
            ],
            cards: [
                {
                    name: 'Visa, Gold',
                    last4: '1234',
                    expenseCount: 2,
                    totalsByCurrency: [{ currency: 'MXN', total: 10.3 }],
                },
            ],
            categories: [{ name: 'Say "hi"', currency: 'MXN', total: 1, count: 1 }],
        });
        expect(csv.startsWith(CSV_BOM)).toBe(true);
        expect(csv.slice(1)).toBe(
            [
                'Period,Currency,Total,Operations',
                '2026-04-01,MXN,0.00,0',
                '2026-04-01,USD,5.00,1',
                '',
                'Card,Last 4,Currency,Total,Expenses',
                '"Visa, Gold",1234,MXN,10.30,2',
                '',
                'Category,Currency,Total,Operations',
                '"Say ""hi""",MXN,1.00,1',
                '',
            ].join('\r\n'),
        );
    });

    it('omits card and category sections when empty', () => {
        const csv = buildReportCsv({
            labels,
            primaryCurrency: null,
            buckets: [],
            cards: [],
            categories: [],
        });
        expect(csv).toBe(`${CSV_BOM}Period,Currency,Total,Operations\r\n`);
    });
});
