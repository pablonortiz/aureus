/**
 * Tests for useFinanceStore.ts
 *
 * Focus areas:
 * 1. calculateBalance - ARS + USD income/expense, monthly expenses
 * 2. generatePendingTransactions - monthly, installment, annual frequencies
 * 3. Store operations
 */

const mockExecute = jest.fn();

jest.mock('../../../../core/database', () => ({
  getDatabase: () => ({
    execute: mockExecute,
    executeSync: jest.fn(),
    close: jest.fn(),
  }),
}));

jest.mock('../../services/exchangeRateService', () => ({
  getRate: jest.fn().mockResolvedValue(1200),
  refresh: jest.fn().mockResolvedValue(1200),
  getRateForDate: jest.fn().mockResolvedValue(1200),
}));

import {useFinanceStore} from '../useFinanceStore';

function resetStore() {
  useFinanceStore.setState({
    transactions: [],
    categories: [],
    totalBalance: 0,
    monthlyExpenses: 0,
    exchangeRate: null,
    recurring: [],
    pendingRecurringTotal: 0,
    pendingLookaheadDay: 5,
    salaryAmount: 0,
    loading: false,
  });
}

// Helper: queue 6 mock responses for calculateBalance (all zeros)
function queueCalculateBalanceMocks() {
  for (let i = 0; i < 6; i++) {
    mockExecute.mockResolvedValueOnce({rows: [{total: 0}]});
  }
}

// Helper: queue loadTransactions (empty) + calculateBalance
function queueLoadTransactionsMocks() {
  mockExecute.mockResolvedValueOnce({rows: []}); // SELECT transactions
  queueCalculateBalanceMocks();
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
  mockExecute.mockResolvedValue({rows: [], insertId: 0});
});

describe('useFinanceStore', () => {
  describe('calculateBalance', () => {
    it('calculates correct balance with ARS-only income and expense', async () => {
      mockExecute
        .mockResolvedValueOnce({rows: [{total: 500000}]})  // ARS income
        .mockResolvedValueOnce({rows: [{total: 150000}]})  // ARS expense
        .mockResolvedValueOnce({rows: [{total: 0}]})       // USD income
        .mockResolvedValueOnce({rows: [{total: 0}]})       // USD expense
        .mockResolvedValueOnce({rows: [{total: 50000}]})   // Monthly ARS
        .mockResolvedValueOnce({rows: [{total: 0}]});      // Monthly USD

      await useFinanceStore.getState().calculateBalance();

      const state = useFinanceStore.getState();
      expect(state.totalBalance).toBe(350000);
      expect(state.monthlyExpenses).toBe(50000);
    });

    it('calculates balance with mixed ARS and USD transactions', async () => {
      mockExecute
        .mockResolvedValueOnce({rows: [{total: 300000}]})  // ARS income
        .mockResolvedValueOnce({rows: [{total: 100000}]})  // ARS expense
        .mockResolvedValueOnce({rows: [{total: 120000}]})  // USD income (converted)
        .mockResolvedValueOnce({rows: [{total: 60000}]})   // USD expense (converted)
        .mockResolvedValueOnce({rows: [{total: 100000}]})  // Monthly ARS
        .mockResolvedValueOnce({rows: [{total: 60000}]});  // Monthly USD

      await useFinanceStore.getState().calculateBalance();

      const state = useFinanceStore.getState();
      expect(state.totalBalance).toBe(260000);
      expect(state.monthlyExpenses).toBe(160000);
    });

    it('handles zero balances correctly', async () => {
      queueCalculateBalanceMocks();

      await useFinanceStore.getState().calculateBalance();

      expect(useFinanceStore.getState().totalBalance).toBe(0);
      expect(useFinanceStore.getState().monthlyExpenses).toBe(0);
    });

    it('handles negative balance (more expenses than income)', async () => {
      mockExecute
        .mockResolvedValueOnce({rows: [{total: 50000}]})   // ARS income
        .mockResolvedValueOnce({rows: [{total: 200000}]})  // ARS expense
        .mockResolvedValueOnce({rows: [{total: 0}]})       // USD income
        .mockResolvedValueOnce({rows: [{total: 0}]})       // USD expense
        .mockResolvedValueOnce({rows: [{total: 200000}]})  // Monthly ARS
        .mockResolvedValueOnce({rows: [{total: 0}]});      // Monthly USD

      await useFinanceStore.getState().calculateBalance();

      expect(useFinanceStore.getState().totalBalance).toBe(-150000);
    });
  });

  describe('generatePendingTransactions', () => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    it('generates pending transaction for monthly recurring on its day', async () => {
      const dayOfMonth = Math.min(currentDay, 28);

      mockExecute
        // SELECT active recurring
        .mockResolvedValueOnce({
          rows: [{
            id: 1, title: 'Netflix', amount: 5000, currency: 'ARS',
            type: 'expense', day_of_month: dayOfMonth, is_active: 1,
            frequency: 'monthly', total_installments: null,
            start_month: null, start_year: null, month_of_year: null,
          }],
        })
        // Check existing tx for this month (none)
        .mockResolvedValueOnce({rows: [{count: 0}]})
        // Last confirmed amount for monthly ARS
        .mockResolvedValueOnce({rows: []})
        // Get categories for this recurring
        .mockResolvedValueOnce({rows: [{category_id: 3}]})
        // INSERT the pending transaction
        .mockResolvedValueOnce({rows: [], insertId: 100})
        // INSERT category link
        .mockResolvedValueOnce({rows: []});

      // loadTransactions + calculateBalance
      queueLoadTransactionsMocks();

      await useFinanceStore.getState().generatePendingTransactions();

      const insertCalls = mockExecute.mock.calls.filter((c: any[]) =>
        c[0].includes('INSERT INTO finance_transactions'),
      );
      expect(insertCalls.length).toBe(1);
      expect(insertCalls[0][1]).toContain('pending');
    });

    it('skips recurring if transaction already exists this month', async () => {
      const dayOfMonth = Math.min(currentDay, 28);

      mockExecute
        .mockResolvedValueOnce({
          rows: [{
            id: 2, title: 'Spotify', amount: 3000, currency: 'ARS',
            day_of_month: dayOfMonth, is_active: 1, frequency: 'monthly',
            total_installments: null, start_month: null, start_year: null,
            month_of_year: null,
          }],
        })
        // existing: already has one
        .mockResolvedValueOnce({rows: [{count: 1}]});

      // loadTransactions + calculateBalance
      queueLoadTransactionsMocks();

      await useFinanceStore.getState().generatePendingTransactions();

      const insertCalls = mockExecute.mock.calls.filter((c: any[]) =>
        c[0].includes('INSERT INTO finance_transactions'),
      );
      expect(insertCalls.length).toBe(0);
    });

    it('skips recurring if day_of_month is in the future', async () => {
      const futureDay = 28;
      if (currentDay >= futureDay) {
        // If today is the 28th or later, test a different way
        mockExecute.mockResolvedValueOnce({rows: []});
        queueLoadTransactionsMocks();
        await useFinanceStore.getState().generatePendingTransactions();
        return;
      }

      mockExecute
        .mockResolvedValueOnce({
          rows: [{
            id: 3, title: 'Rent', amount: 200000, currency: 'ARS',
            day_of_month: futureDay, is_active: 1, frequency: 'monthly',
            total_installments: null, start_month: null, start_year: null,
            month_of_year: null,
          }],
        });

      queueLoadTransactionsMocks();

      await useFinanceStore.getState().generatePendingTransactions();

      const insertCalls = mockExecute.mock.calls.filter((c: any[]) =>
        c[0].includes('INSERT INTO finance_transactions'),
      );
      expect(insertCalls.length).toBe(0);
    });

    it('generates installment transaction with correct label', async () => {
      const dayOfMonth = Math.min(currentDay, 28);

      mockExecute
        .mockResolvedValueOnce({
          rows: [{
            id: 4, title: 'Laptop', amount: 50000, currency: 'ARS',
            day_of_month: dayOfMonth, is_active: 1,
            frequency: 'installment', total_installments: 12,
            start_month: currentMonth + 1, start_year: currentYear,
            month_of_year: null,
          }],
        })
        // Check existing: none
        .mockResolvedValueOnce({rows: [{count: 0}]})
        // Categories
        .mockResolvedValueOnce({rows: []})
        // INSERT transaction
        .mockResolvedValueOnce({rows: [], insertId: 101});

      // loadTransactions + calculateBalance
      queueLoadTransactionsMocks();

      await useFinanceStore.getState().generatePendingTransactions();

      const insertCalls = mockExecute.mock.calls.filter((c: any[]) =>
        c[0].includes('INSERT INTO finance_transactions'),
      );
      expect(insertCalls.length).toBe(1);
      expect(insertCalls[0][1][0]).toBe('Laptop (1/12)');
      expect(insertCalls[0][1]).toContain('confirmed');
    });

    it('skips annual recurring in non-matching month', async () => {
      const dayOfMonth = Math.min(currentDay, 28);
      // Pick a month that is NOT the current month (1-indexed)
      const wrongMonth = currentMonth === 0 ? 6 : currentMonth; // currentMonth is 0-indexed; currentMonth+1 is the real month

      mockExecute
        .mockResolvedValueOnce({
          rows: [{
            id: 5, title: 'Annual insurance', amount: 100000,
            currency: 'ARS', day_of_month: dayOfMonth, is_active: 1,
            frequency: 'annual', total_installments: null,
            start_month: null, start_year: null,
            month_of_year: wrongMonth,
          }],
        })
        // existing check
        .mockResolvedValueOnce({rows: [{count: 0}]});

      queueLoadTransactionsMocks();

      await useFinanceStore.getState().generatePendingTransactions();

      const insertCalls = mockExecute.mock.calls.filter((c: any[]) =>
        c[0].includes('INSERT INTO finance_transactions'),
      );
      expect(insertCalls.length).toBe(0);
    });

    it('generates annual recurring in the correct month', async () => {
      const dayOfMonth = Math.min(currentDay, 28);

      mockExecute
        .mockResolvedValueOnce({
          rows: [{
            id: 6, title: 'Annual subscription', amount: 80000,
            currency: 'ARS', day_of_month: dayOfMonth, is_active: 1,
            frequency: 'annual', total_installments: null,
            start_month: null, start_year: null,
            month_of_year: currentMonth + 1,
          }],
        })
        // existing check (none)
        .mockResolvedValueOnce({rows: [{count: 0}]})
        // categories
        .mockResolvedValueOnce({rows: []})
        // INSERT
        .mockResolvedValueOnce({rows: [], insertId: 102});

      queueLoadTransactionsMocks();

      await useFinanceStore.getState().generatePendingTransactions();

      const insertCalls = mockExecute.mock.calls.filter((c: any[]) =>
        c[0].includes('INSERT INTO finance_transactions'),
      );
      expect(insertCalls.length).toBe(1);
      expect(insertCalls[0][1]).toContain('pending');
    });
  });

  describe('addTransaction', () => {
    it('inserts ARS transaction without exchange rate', async () => {
      mockExecute
        .mockResolvedValueOnce({rows: [], insertId: 50})  // INSERT tx
        .mockResolvedValueOnce({rows: []});                // INSERT category link

      queueLoadTransactionsMocks();

      await useFinanceStore.getState().addTransaction(
        'Almuerzo', 5000, 'expense', [1], 'ARS',
      );

      const insertCall = mockExecute.mock.calls[0];
      expect(insertCall[0]).toContain('INSERT INTO finance_transactions');
      expect(insertCall[1][6]).toBeNull(); // exchange_rate null for ARS
    });

    it('inserts USD transaction with exchange rate', async () => {
      mockExecute
        .mockResolvedValueOnce({rows: [], insertId: 51})
        .mockResolvedValueOnce({rows: []});

      queueLoadTransactionsMocks();

      await useFinanceStore.getState().addTransaction(
        'Steam game', 20, 'expense', [2], 'USD',
      );

      const insertCall = mockExecute.mock.calls[0];
      expect(insertCall[1][6]).toBe(1200); // exchange_rate from mock
    });
  });

  describe('loadExchangeRate', () => {
    it('loads exchange rate from service and sets state', async () => {
      await useFinanceStore.getState().loadExchangeRate();
      expect(useFinanceStore.getState().exchangeRate).toBe(1200);
    });
  });

  describe('deleteTransaction', () => {
    it('calls DELETE and reloads transactions', async () => {
      mockExecute.mockResolvedValueOnce({rows: []}); // DELETE
      queueLoadTransactionsMocks();

      await useFinanceStore.getState().deleteTransaction(42);

      const deleteCall = mockExecute.mock.calls[0];
      expect(deleteCall[0]).toContain('DELETE FROM finance_transactions');
      expect(deleteCall[1]).toEqual([42]);
    });
  });

  describe('confirmPendingTransaction', () => {
    it('updates status to confirmed with final amount', async () => {
      mockExecute.mockResolvedValueOnce({rows: []}); // UPDATE
      queueLoadTransactionsMocks();

      await useFinanceStore.getState().confirmPendingTransaction(10, 5500);

      const updateCall = mockExecute.mock.calls[0];
      expect(updateCall[0]).toContain("status = 'confirmed'");
      expect(updateCall[1]).toEqual([5500, 10]);
    });
  });
});
