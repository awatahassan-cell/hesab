import { create } from 'zustand';
import { Account, Transaction, Category, Debt, Reminder, SavingsGoal } from '../db/schema';
import { getAllAccounts } from '../db/queries/accounts';
import { getTransactions, getTotalsForPeriod } from '../db/queries/transactions';
import { getAllCategories } from '../db/queries/categories';
import { getAllDebts, getDebtTotals } from '../db/queries/debts';
import { getBudgetProgressList, BudgetProgress } from '../db/queries/budgets';
import { getAllReminders } from '../db/queries/reminders';
import { getAllSavingsGoals } from '../db/queries/savingsGoals';
import { getPeriodRange } from '../utils/dates';
import { convertCurrency } from '../utils/currency';
import { useAppStore } from './useAppStore';

interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
  recentTransactions: Transaction[];
  categories: Category[];
  debts: Debt[];
  budgetProgressList: BudgetProgress[];
  reminders: Reminder[];
  savingsGoals: SavingsGoal[];
  
  totalBalancePrimary: number;
  monthIncome: number;
  monthExpense: number;
  debtLentTotal: number;
  debtBorrowedTotal: number;
  
  isLoading: boolean;
  
  refreshAll: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  accounts: [],
  transactions: [],
  recentTransactions: [],
  categories: [],
  debts: [],
  budgetProgressList: [],
  reminders: [],
  savingsGoals: [],

  totalBalancePrimary: 0,
  monthIncome: 0,
  monthExpense: 0,
  debtLentTotal: 0,
  debtBorrowedTotal: 0,

  isLoading: false,

  refreshAll: async () => {
    set({ isLoading: true });
    try {
      const { primaryCurrency, exchangeRates, monthStartDay } = useAppStore.getState();

      const [accounts, categories, debts, debtTotals, reminders, savingsGoals] = await Promise.all([
        getAllAccounts(),
        getAllCategories(),
        getAllDebts(),
        getDebtTotals(),
        getAllReminders(),
        getAllSavingsGoals()
      ]);

      // Calculate total balance converted to primary currency
      let totalConverted = 0;
      for (const acc of accounts) {
        totalConverted += convertCurrency(
          acc.current_balance,
          acc.currency,
          primaryCurrency,
          exchangeRates
        );
      }

      // Fetch this month's totals
      const { start, end } = getPeriodRange('month', new Date(), monthStartDay);
      const monthlyTotals = await getTotalsForPeriod(start.toISOString(), end.toISOString());

      // Fetch recent 10 transactions
      const recent = await getTransactions({ limit: 10 });
      // Fetch all transactions for transactions screen
      const allTx = await getTransactions({ limit: 200 });

      // Fetch budgets progress
      const budgetProgress = await getBudgetProgressList(monthStartDay);

      set({
        accounts,
        categories,
        debts,
        reminders,
        savingsGoals,
        debtLentTotal: debtTotals.lentPending,
        debtBorrowedTotal: debtTotals.borrowedPending,
        totalBalancePrimary: totalConverted,
        monthIncome: monthlyTotals.income,
        monthExpense: monthlyTotals.expense,
        recentTransactions: recent,
        transactions: allTx,
        budgetProgressList: budgetProgress,
        isLoading: false
      });
    } catch (e) {
      console.error('Error refreshing finance store', e);
      set({ isLoading: false });
    }
  },

  refreshTransactions: async () => {
    try {
      const allTx = await getTransactions({ limit: 200 });
      const recent = await getTransactions({ limit: 10 });
      set({ transactions: allTx, recentTransactions: recent });
    } catch (e) {
      console.error('Error refreshing transactions', e);
    }
  }
}));
