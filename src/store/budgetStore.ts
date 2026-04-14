import { create } from 'zustand';
import { TodaySummary } from '../types/index';

interface BudgetState {
    todaySummary: TodaySummary | null;
    isLoading: boolean;

    setTodaySummary: (summary: TodaySummary) => void;
    setLoading: (loading: boolean) => void;
    reset: () => void;
}

export const useBudgetStore = create<BudgetState>((set) => ({
    todaySummary: null,
    isLoading: false,

    setTodaySummary: (summary) => set({ todaySummary: summary, isLoading: false }),
    setLoading: (loading) => set({ isLoading: loading }),
    reset: () => set({ todaySummary: null, isLoading: false }),
}));
