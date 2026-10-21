import { decodeUpcomingCharges } from '../../src/modules/subscriptions/upcomingDecoder';

describe('upcoming subscription wire format', () => {
    const row = { id: 10, subscriptionId: 'real-id', name: 'Cloud', amount: '12.50', currency: 'USD', daysRemaining: '2', paymentMethod: 'credit_card', creditCardId: 'card', chargeDate: '2026-10-23', hexColor: '#123456' };
    it.each([ [row], { upcoming: [row] }, { data: { upcoming: [row] } }, { data: [row] }, { items: [row] } ])('decodes supported envelope %#', envelope => {
        expect(decodeUpcomingCharges(envelope)).toEqual([expect.objectContaining({ id: '10', subscriptionId: 'real-id', amount: 12.5, daysRemaining: 2, creditCardId: 'card', chargeDate: '2026-10-23', hexColor: '#123456' })]);
    });
    it('handles malformed or null payloads safely', () => {
        expect(decodeUpcomingCharges(null)).toEqual([]);
        expect(decodeUpcomingCharges({ upcoming: 'invalid' })).toEqual([]);
        expect(decodeUpcomingCharges([null, 3, { name: 'Valid', amount: 1 }])).toHaveLength(1);
    });
});
