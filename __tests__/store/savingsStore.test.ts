jest.mock('../../src/api/resources/savings', () => ({
    addSavingsFunds: jest.fn(),
    createSavingsGoal: jest.fn(),
    deleteSavingsGoal: jest.fn(),
    getSavingsGoals: jest.fn(),
    getSavingsTransactions: jest.fn(),
    updateSavingsGoal: jest.fn(),
    withdrawSavingsFunds: jest.fn(),
}));

import {
    addSavingsFunds,
    createSavingsGoal,
    getSavingsGoals,
    getSavingsTransactions,
    withdrawSavingsFunds,
} from '../../src/api/resources/savings';
import { SavingsGoal, SavingsTransaction } from '../../src/types/index';
import { useSavingsStore } from '../../src/store/savingsStore';

const mockAddSavingsFunds = addSavingsFunds as jest.MockedFunction<typeof addSavingsFunds>;
const mockCreateSavingsGoal = createSavingsGoal as jest.MockedFunction<typeof createSavingsGoal>;
const mockGetSavingsGoals = getSavingsGoals as jest.MockedFunction<typeof getSavingsGoals>;
const mockGetSavingsTransactions = getSavingsTransactions as jest.MockedFunction<typeof getSavingsTransactions>;
const mockWithdrawSavingsFunds = withdrawSavingsFunds as jest.MockedFunction<typeof withdrawSavingsFunds>;

function goal(overrides: Partial<SavingsGoal> = {}): SavingsGoal {
    return {
        id: 'goal-1',
        title: 'Emergency fund',
        targetAmount: 1000,
        currentAmount: 100,
        targetDate: null,
        icon: null,
        color: null,
        userId: 'user-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        transactions: [],
        ...overrides,
    };
}

function transaction(overrides: Partial<SavingsTransaction> = {}): SavingsTransaction {
    return {
        id: 'transaction-1',
        amount: 50,
        type: 'DEPOSIT',
        goalId: 'goal-1',
        createdAt: '2026-08-01T00:00:00.000Z',
        ...overrides,
    };
}

describe('useSavingsStore', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetSavingsGoals.mockResolvedValue([]);
        mockGetSavingsTransactions.mockResolvedValue([]);
        useSavingsStore.getState().reset();
    });

    it('creates a goal and clears its loading state', async () => {
        const createdGoal = goal({ id: 'goal-2', title: 'Travel' });
        mockCreateSavingsGoal.mockResolvedValueOnce(createdGoal);

        await expect(useSavingsStore.getState().createGoal({
            title: 'Travel',
            targetAmount: 2500,
        })).resolves.toEqual(createdGoal);

        expect(useSavingsStore.getState().goals).toContainEqual(createdGoal);
        expect(useSavingsStore.getState().isCreatingGoal).toBe(false);
        expect(useSavingsStore.getState().errors.createGoal).toBeNull();
    });

    it('merges deposits into the goal and transaction state', async () => {
        const existingGoal = goal();
        const deposit = transaction();
        const updatedGoal = goal({ currentAmount: 150 });
        mockAddSavingsFunds.mockResolvedValueOnce({
            goal: updatedGoal,
            transaction: deposit,
        });
        mockGetSavingsTransactions.mockResolvedValueOnce([deposit]);

        useSavingsStore.setState({
            goals: [existingGoal],
            transactionsByGoal: { 'goal-1': [] },
        });

        await useSavingsStore.getState().addFunds('goal-1', { amount: 50 });

        expect(useSavingsStore.getState().goals[0]).toMatchObject({
            id: 'goal-1',
            currentAmount: 150,
        });
        expect(useSavingsStore.getState().transactionsByGoal['goal-1']).toContainEqual(deposit);
        expect(useSavingsStore.getState().isAddingFunds).toBe(false);
    });

    it('records errors and resets loading state when a withdrawal fails', async () => {
        const error = new Error('Insufficient saved balance');
        mockWithdrawSavingsFunds.mockRejectedValueOnce(error);

        await expect(useSavingsStore.getState().withdrawFunds('goal-1', { amount: 500 }))
            .rejects.toBe(error);

        expect(useSavingsStore.getState().errors.withdrawFunds).toBe(error.message);
        expect(useSavingsStore.getState().isWithdrawingFunds).toBe(false);
    });

    it('rejects concurrent deposits without replacing the active operation', async () => {
        let resolveDeposit: ((value: { goal: SavingsGoal; transaction: SavingsTransaction }) => void) | undefined;
        mockAddSavingsFunds.mockImplementationOnce(() => new Promise((resolve) => {
            resolveDeposit = resolve;
        }));

        const firstDeposit = useSavingsStore.getState().addFunds('goal-1', { amount: 50 });

        await expect(useSavingsStore.getState().addFunds('goal-1', { amount: 25 }))
            .rejects.toThrow('Savings deposit already in progress');

        resolveDeposit?.({ goal: goal({ currentAmount: 150 }), transaction: transaction() });
        await firstDeposit;
    });
});
