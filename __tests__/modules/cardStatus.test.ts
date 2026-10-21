import {
    cardBadgeOf,
    cardUrgencyOf,
    dueLabelOf,
    overviewCardStatus,
    paidCovers,
    resolveCardStatus,
} from '../../src/modules/creditCards/cardStatus';

describe('cardUrgencyOf', () => {
    it('overdue only below zero', () => {
        expect(cardUrgencyOf(-1)).toBe('OVERDUE');
        expect(cardUrgencyOf(-30)).toBe('OVERDUE');
        expect(cardUrgencyOf(0)).toBe('DUE_SOON');
    });

    it('due soon from today through 5 days', () => {
        expect(cardUrgencyOf(1)).toBe('DUE_SOON');
        expect(cardUrgencyOf(5)).toBe('DUE_SOON');
        expect(cardUrgencyOf(6)).toBe('NONE');
        expect(cardUrgencyOf(40)).toBe('NONE');
    });

    it('unknown days have no urgency', () => {
        expect(cardUrgencyOf(null)).toBe('NONE');
        expect(cardUrgencyOf(undefined)).toBe('NONE');
    });

    it('a paid statement is calm unless overdue', () => {
        expect(cardUrgencyOf(1, true)).toBe('NONE');
        expect(cardUrgencyOf(-2, true)).toBe('OVERDUE');
    });
});

describe('dueLabelOf', () => {
    it('follows the day count', () => {
        expect(dueLabelOf(-3)).toEqual({ kind: 'overdue', days: 3 });
        expect(dueLabelOf(0)).toEqual({ kind: 'today' });
        expect(dueLabelOf(1)).toEqual({ kind: 'tomorrow' });
        expect(dueLabelOf(4)).toEqual({ kind: 'inDays', days: 4 });
        expect(dueLabelOf(null)).toBeNull();
    });
});

describe('cardBadgeOf', () => {
    const badge = (
        paid: boolean,
        partial: boolean,
        hasStatement: boolean,
        daysUntilDue: number | null,
        statementDaysUntilDue: number | null = null,
    ) => cardBadgeOf({ paid, partial, hasStatement, daysUntilDue, statementDaysUntilDue });

    it('due tomorrow and paid is calm and says paid', () => {
        expect(badge(true, false, true, 1)).toBe('PAID');
    });

    it('due tomorrow and pending is due soon', () => {
        expect(badge(false, false, true, 1)).toBe('DUE_SOON');
    });

    it('a paid statement is never overdue even when late', () => {
        expect(badge(true, false, true, -2)).toBe('PAID');
        expect(badge(true, false, true, 20, -9)).toBe('PAID');
    });

    it('unpaid or partial past its own due date is overdue despite a rolled schedule', () => {
        expect(badge(false, false, true, 20, -1)).toBe('OVERDUE');
        expect(badge(false, true, true, null, -30)).toBe('OVERDUE');
    });

    it('a statement due today is not overdue yet', () => {
        expect(badge(false, false, true, 0, 0)).toBe('DUE_SOON');
        expect(badge(false, false, true, 20, 0)).toBe('PENDING');
    });

    it('overdue and pending is overdue', () => {
        expect(badge(false, false, true, -2)).toBe('OVERDUE');
    });

    it('paid without a due date says paid', () => {
        expect(badge(true, false, true, null)).toBe('PAID');
    });

    it('partial payment close to the due date is still due soon', () => {
        expect(badge(false, true, true, 3)).toBe('DUE_SOON');
        expect(badge(false, true, true, null)).toBe('PARTIAL');
    });

    it('overdue beats due soon', () => {
        expect(badge(false, false, true, -1)).toBe('OVERDUE');
        expect(badge(false, false, true, 5)).toBe('DUE_SOON');
    });

    it('without urgency a statement shows its payment state', () => {
        expect(badge(false, true, true, 20)).toBe('PARTIAL');
        expect(badge(false, false, true, 20)).toBe('PENDING');
    });

    it('no statement and no urgency shows nothing', () => {
        expect(badge(false, false, false, 20)).toBe('NONE');
        expect(badge(false, false, false, null)).toBe('NONE');
    });

    it('no statement can still be due soon', () => {
        expect(badge(false, false, false, 2)).toBe('DUE_SOON');
    });
});

describe('paidCovers', () => {
    it('a paid statement with the same due date covers the next payment', () => {
        expect(paidCovers(true, '2026-10-12', '2026-10-12')).toBe(true);
    });

    it('a paid statement whose due date already passed covers the rolled next payment', () => {
        expect(paidCovers(true, '2026-09-12', '2026-10-12')).toBe(true);
        expect(paidCovers(true, '2026-09-12T12:00:00.000Z', '2026-10-12')).toBe(true);
    });

    it('a paid statement due after the next payment date is a newer cycle', () => {
        expect(paidCovers(true, '2026-11-12', '2026-10-12')).toBe(false);
    });

    it('unparseable dates trust the paid state', () => {
        expect(paidCovers(true, 'garbage', '2026-10-12')).toBe(true);
        expect(paidCovers(true, '2026-10-12', '')).toBe(true);
    });

    it('unknown dates cannot contradict a paid statement', () => {
        expect(paidCovers(true, null, '2026-10-12')).toBe(true);
        expect(paidCovers(true, '2026-10-12', null)).toBe(true);
    });

    it('an unpaid statement never covers', () => {
        expect(paidCovers(false, '2026-10-12', '2026-10-12')).toBe(false);
    });
});

describe('resolveCardStatus', () => {
    const today = new Date(2026, 9, 12, 12);
    const DAY = 86_400_000;

    const dayDiff = (iso: string) => {
        const [y, m, dd] = iso.split('-').map(Number);
        return Math.round((Date.UTC(y, m - 1, dd) - Date.UTC(2026, 9, 12)) / DAY);
    };

    const resolve = (
        paid: boolean,
        partial: boolean,
        statementDueDate: string | null,
        nextDueDate: string | null,
        hasStatement = true,
    ) =>
        resolveCardStatus({
            statementPaid: paid,
            partial,
            hasStatement,
            statementDueDate,
            nextDueDate,
            daysUntilNextDue: nextDueDate ? dayDiff(nextDueDate) : null,
            today,
        });

    it('paid late statement with rolled next due date shows paid', () => {
        const s = resolve(true, false, '2026-10-05', '2026-11-05');
        expect(s.paid).toBe(true);
        expect(s.badge).toBe('PAID');
        expect(s.overdueDays).toBeNull();
    });

    it('unpaid statement past due is overdue with day count', () => {
        const s = resolve(false, false, '2026-10-05', '2026-11-05');
        expect(s.badge).toBe('OVERDUE');
        expect(s.overdueDays).toBe(7);
        expect(s.paid).toBe(false);
    });

    it('partial statement past due is overdue', () => {
        expect(resolve(false, true, '2026-10-11', '2026-11-11').badge).toBe('OVERDUE');
    });

    it('statement due today is due soon not overdue', () => {
        const s = resolve(false, false, '2026-10-12', '2026-10-12');
        expect(s.badge).toBe('DUE_SOON');
        expect(s.overdueDays).toBeNull();
    });

    it('no statement keeps schedule urgency', () => {
        expect(resolve(false, false, null, '2026-10-14', false).badge).toBe('DUE_SOON');
        expect(resolve(false, false, null, '2026-11-14', false).badge).toBe('NONE');
    });

    it('badge and tile stay consistent across the matrix', () => {
        const iso = (date: Date) =>
            `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const plusDays = (base: Date, n: number) => {
            const next = new Date(base);
            next.setDate(next.getDate() + n);
            return next;
        };
        const plusMonth = (base: Date) => new Date(base.getFullYear(), base.getMonth() + 1, base.getDate(), 12);
        for (const state of ['paid', 'partial', 'unpaid']) {
            for (const off of [-10, 0, 3, 10, null]) {
                for (const nextKind of ['rolled', 'same', null]) {
                    const stmt = off == null ? null : plusDays(today, off);
                    let next: string | null = null;
                    if (nextKind === 'rolled') {
                        next = iso(plusMonth(stmt ?? plusDays(today, 20)));
                    } else if (nextKind === 'same') {
                        next = stmt ? iso(stmt) : null;
                    }
                    const paid = state === 'paid';
                    const s = resolve(paid, state === 'partial', stmt ? iso(stmt) : null, next);
                    const ctx = `${state} stmt=${off} next=${nextKind}`;
                    expect([ctx, s.paid]).toEqual([ctx, paid]);
                    expect([ctx, s.badge === 'PAID']).toEqual([ctx, paid]);
                    if (paid) {
                        expect([ctx, s.overdueDays]).toEqual([ctx, null]);
                    }
                    const overdue = !paid && off != null && off < 0;
                    expect([ctx, s.badge === 'OVERDUE']).toEqual([ctx, overdue]);
                    expect([ctx, s.overdueDays]).toEqual([ctx, overdue ? -(off as number) : null]);
                }
            }
        }
    });
});

describe('overviewCardStatus', () => {
    const today = new Date(2026, 9, 12, 12);
    const card = (overrides: Record<string, unknown>) =>
        ({
            statementSummary: null,
            schedule: { nextPaymentDueDate: null, daysUntilPaymentDue: null },
            ...overrides,
        }) as unknown as Parameters<typeof overviewCardStatus>[0];

    it('ignores a summary without a statement import', () => {
        const status = overviewCardStatus(
            card({ statementSummary: { statementImportId: null, paymentStatus: 'PAID', dueDate: null } }),
            today,
        );
        expect(status).toEqual({ paid: false, badge: 'NONE', overdueDays: null });
    });

    it('reads the payment status and dates from the overview', () => {
        const status = overviewCardStatus(
            card({
                statementSummary: { statementImportId: 's1', paymentStatus: 'PARTIAL', dueDate: '2026-10-05' },
                schedule: { nextPaymentDueDate: '2026-11-05', daysUntilPaymentDue: 24 },
            }),
            today,
        );
        expect(status).toEqual({ paid: false, badge: 'OVERDUE', overdueDays: 7 });
    });
});
