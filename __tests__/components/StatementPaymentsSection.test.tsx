import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { TouchableOpacity, Text } from 'react-native';

const mockAdd = jest.fn(async () => ({ ok: true }));
const mockCorrect = jest.fn();
const mockVoid = jest.fn();
const mockReset = jest.fn();
const mockAlert = jest.fn();
jest.mock('../../src/hooks/statements/useStatementPayments', () => ({ useStatementPayments: () => ({ addPayment: mockAdd, correctPayment: mockCorrect, voidPayment: mockVoid, resetIntent: mockReset, isWorking: false }) }));
jest.mock('../../src/hooks/shared/useI18n', () => ({ useI18n: () => ({ t: (key: string) => key, language: 'en' }) }));
jest.mock('../../src/hooks/statements/useStatementErrorMessage', () => ({ useStatementErrorMessage: () => () => 'failure' }));
jest.mock('../../src/components/alerts/AlertProvider', () => ({ useAppAlert: () => ({ alert: mockAlert }) }));
jest.mock('../../src/theme/index', () => ({
    spacing: {}, typography: { fontSize: {} }, borderRadius: {}, useThemedStyles: () => ({}), useResponsive: () => ({ scaleFont: (n: number) => n }),
}));
jest.mock('../../src/components/statements/StatementPaymentModal', () => ({ StatementPaymentModal: () => null }));
jest.mock('../../src/components/statements/StatementReasonModal', () => ({ StatementReasonModal: () => null }));
jest.mock('../../src/components/ui/primitives/Button', () => ({ Button: () => null }));
import { StatementPaymentsSection } from '../../src/components/statements/StatementPaymentsSection';
import { StatementPaymentModal } from '../../src/components/statements/StatementPaymentModal';
import { Button } from '../../src/components/ui/primitives/Button';
import type { StatementImportDetail } from '../../src/types/statementImports';

const statement = {
    id: 's', paymentVersion: 1, currency: 'MXN',
    paymentSummary: { currency: 'MXN', paidTotal: 10, remainingStatement: 90, closingBalance: 100, isPaid: false, overpaid: 0 },
    paymentHistory: [
        { id: 'old', amount: 10, currency: 'USD', paidAt: '2026-10-20', voidedAt: null },
        { id: 'live', amount: 20, currency: 'USD', paidAt: '2026-10-21', supersedesId: 'old' },
        { id: 'void', amount: 10, currency: 'MXN', paidAt: '2026-10-20', voidedAt: '2026-10-21' },
    ],
} as unknown as StatementImportDetail;

describe('payment ledger UI branches', () => {
    let renderer: Renderer.ReactTestRenderer;
    beforeEach(async () => {
        jest.clearAllMocks();
        await act(async () => { renderer = Renderer.create(<StatementPaymentsSection statement={statement} />); });
    });
    afterEach(async () => { await act(async () => renderer.unmount()); });
    it('offers correction/void only for active entries and uses their original currency', async () => {
        const actions = renderer.root.findAllByType(TouchableOpacity);
        expect(actions).toHaveLength(2);
        expect(actions[0].findByType(Text).props.children).toBe('statements.payments.correct');
        await act(async () => actions[0].props.onPress());
        expect(renderer.root.findByType(StatementPaymentModal).props).toMatchObject({ correction: true, currency: 'USD', initialAmount: 20 });
    });
    it('requires confirmation for a detail-ledger overpayment and only writes after confirming', async () => {
        await act(async () => renderer.root.findByType(Button).props.onPress());
        const value = { amount: 95, currency: 'MXN', paidAt: '2026-10-21T12:00:00.000Z' };
        await act(async () => renderer.root.findByType(StatementPaymentModal).props.onSubmit(value));
        expect(mockAdd).not.toHaveBeenCalled();
        expect(mockAlert.mock.calls[0][0]).toBe('cardPayments.overpayTitle');
        await act(async () => mockAlert.mock.calls[0][2][1].onPress());
        expect(mockAdd).toHaveBeenCalledWith(value);
        expect(mockReset).toHaveBeenCalledTimes(1);
    });
});
