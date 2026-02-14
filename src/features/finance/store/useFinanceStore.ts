import {create} from 'zustand';
import {getDatabase} from '../../../core/database';
import type {
  FinanceTransaction,
  FinanceCategory,
  FinanceRecurring,
} from '../../../core/types';
import {getRate, refresh as refreshRate, getRateForDate} from '../services/exchangeRateService';

interface FinanceState {
  transactions: FinanceTransaction[];
  categories: FinanceCategory[];
  totalBalance: number;
  monthlyExpenses: number;
  exchangeRate: number | null;
  recurring: FinanceRecurring[];
  loading: boolean;

  loadTransactions: () => Promise<void>;
  loadCategories: () => Promise<void>;
  addTransaction: (
    title: string,
    amount: number,
    type: 'income' | 'expense',
    categoryIds: number[],
    currency?: 'ARS' | 'USD',
    status?: 'confirmed' | 'pending',
    recurringId?: number | null,
    notes?: string,
    date?: string,
  ) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  calculateBalance: () => Promise<void>;
  loadExchangeRate: () => Promise<void>;
  refreshExchangeRate: () => Promise<void>;
  loadRecurring: () => Promise<void>;
  addRecurring: (
    title: string,
    amount: number,
    currency: 'ARS' | 'USD',
    dayOfMonth: number,
    categoryIds: number[],
  ) => Promise<void>;
  updateRecurring: (
    id: number,
    title: string,
    amount: number,
    currency: 'ARS' | 'USD',
    dayOfMonth: number,
    categoryIds: number[],
  ) => Promise<void>;
  deleteRecurring: (id: number) => Promise<void>;
  toggleRecurringActive: (id: number) => Promise<void>;
  confirmPendingTransaction: (id: number, finalAmount: number) => Promise<void>;
  dismissPendingTransaction: (id: number) => Promise<void>;
  generatePendingTransactions: () => Promise<void>;
  getMonthExpenses: (year: number, month: number) => Promise<{daily: number[]; total: number}>;
  getTransactionsForMonth: (year: number, month: number) => Promise<FinanceTransaction[]>;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactions: [],
  categories: [],
  totalBalance: 0,
  monthlyExpenses: 0,
  exchangeRate: null,
  recurring: [],
  loading: false,

  loadTransactions: async () => {
    set({loading: true});
    const db = getDatabase();
    const txResult = await db.execute(
      `SELECT * FROM finance_transactions
       ORDER BY
         CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
         date DESC
       LIMIT 50`,
    );

    const transactions: FinanceTransaction[] = [];
    for (const row of txResult.rows) {
      const catResult = await db.execute(
        `SELECT fc.* FROM finance_categories fc
         JOIN finance_transaction_categories ftc ON ftc.category_id = fc.id
         WHERE ftc.transaction_id = ?
         ORDER BY fc.name`,
        [row.id],
      );
      transactions.push({
        ...row,
        currency: (row.currency as string) || 'ARS',
        status: (row.status as string) || 'confirmed',
        recurring_id: (row.recurring_id as number) ?? null,
        exchange_rate: (row.exchange_rate as number) ?? null,
        categories: catResult.rows as FinanceCategory[],
      } as FinanceTransaction);
    }

    set({transactions, loading: false});
    await get().calculateBalance();
  },

  loadCategories: async () => {
    const db = getDatabase();
    const result = await db.execute(
      'SELECT * FROM finance_categories ORDER BY id',
    );
    set({categories: result.rows as FinanceCategory[]});
  },

  addTransaction: async (
    title,
    amount,
    type,
    categoryIds,
    currency = 'ARS',
    status = 'confirmed',
    recurringId = null,
    notes,
    date,
  ) => {
    const db = getDatabase();

    // Use provided date or today (YYYY-MM-DD for rate lookup)
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const dateForRate = date || todayStr;
    // Full datetime for storage (consistent with datetime('now') format)
    const txDatetime = date ? `${date} 12:00:00` : `${todayStr} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}:${String(today.getSeconds()).padStart(2, '0')}`;

    // For USD transactions, fetch the exchange rate for the transaction date
    let exchangeRateValue: number | null = null;
    if (currency === 'USD') {
      exchangeRateValue = await getRateForDate(dateForRate);
    }

    const txResult = await db.execute(
      'INSERT INTO finance_transactions (title, amount, type, currency, status, recurring_id, exchange_rate, notes, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, amount, type, currency, status, recurringId, exchangeRateValue, notes || null, txDatetime],
    );

    if (txResult.insertId && categoryIds.length > 0) {
      for (const catId of categoryIds) {
        await db.execute(
          'INSERT INTO finance_transaction_categories (transaction_id, category_id) VALUES (?, ?)',
          [txResult.insertId, catId],
        );
      }
    }

    await get().loadTransactions();
  },

  deleteTransaction: async (id) => {
    const db = getDatabase();
    await db.execute('DELETE FROM finance_transactions WHERE id = ?', [id]);
    await get().loadTransactions();
  },

  calculateBalance: async () => {
    const db = getDatabase();

    // ARS: simple sum
    const arsIncome = await db.execute(
      "SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE type = 'income' AND currency = 'ARS' AND status = 'confirmed'",
    );
    const arsExpense = await db.execute(
      "SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE type = 'expense' AND currency = 'ARS' AND status = 'confirmed'",
    );

    // USD: each tx converted to ARS using its stored exchange_rate
    const usdIncome = await db.execute(
      "SELECT COALESCE(SUM(amount * COALESCE(exchange_rate, 1)), 0) as total FROM finance_transactions WHERE type = 'income' AND currency = 'USD' AND status = 'confirmed'",
    );
    const usdExpense = await db.execute(
      "SELECT COALESCE(SUM(amount * COALESCE(exchange_rate, 1)), 0) as total FROM finance_transactions WHERE type = 'expense' AND currency = 'USD' AND status = 'confirmed'",
    );

    const totalArs = (arsIncome.rows[0].total as number) - (arsExpense.rows[0].total as number);
    const totalUsdInArs = (usdIncome.rows[0].total as number) - (usdExpense.rows[0].total as number);

    // Monthly expenses (combined in ARS)
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const monthArs = await db.execute(
      "SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE type = 'expense' AND currency = 'ARS' AND status = 'confirmed' AND date >= ?",
      [firstDay],
    );
    const monthUsd = await db.execute(
      "SELECT COALESCE(SUM(amount * COALESCE(exchange_rate, 1)), 0) as total FROM finance_transactions WHERE type = 'expense' AND currency = 'USD' AND status = 'confirmed' AND date >= ?",
      [firstDay],
    );

    set({
      totalBalance: totalArs + totalUsdInArs,
      monthlyExpenses: (monthArs.rows[0].total as number) + (monthUsd.rows[0].total as number),
    });
  },

  loadExchangeRate: async () => {
    const rate = await getRate();
    set({exchangeRate: rate});
  },

  refreshExchangeRate: async () => {
    const rate = await refreshRate();
    set({exchangeRate: rate});
  },

  loadRecurring: async () => {
    const db = getDatabase();
    const result = await db.execute(
      'SELECT * FROM finance_recurring ORDER BY day_of_month ASC',
    );

    const recurring: FinanceRecurring[] = [];
    for (const row of result.rows) {
      const catResult = await db.execute(
        `SELECT fc.* FROM finance_categories fc
         JOIN finance_recurring_categories frc ON frc.category_id = fc.id
         WHERE frc.recurring_id = ?
         ORDER BY fc.name`,
        [row.id],
      );
      recurring.push({
        ...row,
        is_active: Boolean(row.is_active),
        categories: catResult.rows as FinanceCategory[],
      } as FinanceRecurring);
    }

    set({recurring});
  },

  addRecurring: async (title, amount, currency, dayOfMonth, categoryIds) => {
    const db = getDatabase();
    const result = await db.execute(
      'INSERT INTO finance_recurring (title, amount, currency, type, day_of_month) VALUES (?, ?, ?, ?, ?)',
      [title, amount, currency, 'expense', dayOfMonth],
    );

    if (result.insertId && categoryIds.length > 0) {
      for (const catId of categoryIds) {
        await db.execute(
          'INSERT INTO finance_recurring_categories (recurring_id, category_id) VALUES (?, ?)',
          [result.insertId, catId],
        );
      }
    }

    await get().loadRecurring();
  },

  updateRecurring: async (id, title, amount, currency, dayOfMonth, categoryIds) => {
    const db = getDatabase();
    await db.execute(
      'UPDATE finance_recurring SET title = ?, amount = ?, currency = ?, day_of_month = ? WHERE id = ?',
      [title, amount, currency, dayOfMonth, id],
    );

    await db.execute(
      'DELETE FROM finance_recurring_categories WHERE recurring_id = ?',
      [id],
    );
    for (const catId of categoryIds) {
      await db.execute(
        'INSERT INTO finance_recurring_categories (recurring_id, category_id) VALUES (?, ?)',
        [id, catId],
      );
    }

    await get().loadRecurring();
  },

  deleteRecurring: async (id) => {
    const db = getDatabase();
    await db.execute('DELETE FROM finance_recurring WHERE id = ?', [id]);
    await get().loadRecurring();
  },

  toggleRecurringActive: async (id) => {
    const db = getDatabase();
    await db.execute(
      'UPDATE finance_recurring SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?',
      [id],
    );
    await get().loadRecurring();
  },

  confirmPendingTransaction: async (id, finalAmount) => {
    const db = getDatabase();
    await db.execute(
      "UPDATE finance_transactions SET status = 'confirmed', amount = ? WHERE id = ?",
      [finalAmount, id],
    );
    await get().loadTransactions();
  },

  dismissPendingTransaction: async (id) => {
    const db = getDatabase();
    await db.execute('DELETE FROM finance_transactions WHERE id = ?', [id]);
    await get().loadTransactions();
  },

  generatePendingTransactions: async () => {
    const db = getDatabase();
    const now = new Date();
    const today = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    const recResult = await db.execute(
      'SELECT * FROM finance_recurring WHERE is_active = 1',
    );

    for (const rec of recResult.rows) {
      const dayOfMonth = rec.day_of_month as number;

      if (dayOfMonth > daysInMonth) continue;
      if (today < dayOfMonth) continue;

      const existing = await db.execute(
        "SELECT COUNT(*) as count FROM finance_transactions WHERE recurring_id = ? AND date >= ? AND date < ?",
        [rec.id, `${monthPrefix}-01`, `${monthPrefix}-${String(daysInMonth).padStart(2, '0')} 23:59:59`],
      );

      if ((existing.rows[0].count as number) > 0) continue;

      let amount = rec.amount as number;
      const currency = rec.currency as string;

      if (currency === 'ARS') {
        const lastConfirmed = await db.execute(
          "SELECT amount FROM finance_transactions WHERE recurring_id = ? AND status = 'confirmed' AND currency = 'ARS' ORDER BY date DESC LIMIT 1",
          [rec.id],
        );
        if (lastConfirmed.rows.length > 0) {
          amount = lastConfirmed.rows[0].amount as number;
        }
      }

      // For USD recurring, fetch the exchange rate for the generation date
      let exchangeRateValue: number | null = null;
      const txDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
      const txDatetime = `${txDateStr} 12:00:00`;
      if (currency === 'USD') {
        exchangeRateValue = await getRateForDate(txDateStr);
      }

      const catResult = await db.execute(
        'SELECT category_id FROM finance_recurring_categories WHERE recurring_id = ?',
        [rec.id],
      );
      const categoryIds = catResult.rows.map(r => r.category_id as number);

      const txResult = await db.execute(
        "INSERT INTO finance_transactions (title, amount, type, currency, status, recurring_id, exchange_rate, date) VALUES (?, ?, 'expense', ?, 'pending', ?, ?, ?)",
        [rec.title, amount, currency, rec.id, exchangeRateValue, txDatetime],
      );

      if (txResult.insertId && categoryIds.length > 0) {
        for (const catId of categoryIds) {
          await db.execute(
            'INSERT INTO finance_transaction_categories (transaction_id, category_id) VALUES (?, ?)',
            [txResult.insertId, catId],
          );
        }
      }
    }

    await get().loadTransactions();
  },

  getMonthExpenses: async (year, month) => {
    const db = getDatabase();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month, 0).getDate();

    // ARS expenses by day
    const arsResult = await db.execute(
      `SELECT CAST(substr(date, 9, 2) AS INTEGER) as day, SUM(amount) as total
       FROM finance_transactions
       WHERE type = 'expense' AND status = 'confirmed' AND currency = 'ARS'
         AND date >= ? AND date <= ?
       GROUP BY day`,
      [`${prefix}-01`, `${prefix}-${String(daysInMonth).padStart(2, '0')} 23:59:59`],
    );

    // USD expenses by day (converted to ARS via stored exchange_rate)
    const usdResult = await db.execute(
      `SELECT CAST(substr(date, 9, 2) AS INTEGER) as day, SUM(amount * COALESCE(exchange_rate, 1)) as total
       FROM finance_transactions
       WHERE type = 'expense' AND status = 'confirmed' AND currency = 'USD'
         AND date >= ? AND date <= ?
       GROUP BY day`,
      [`${prefix}-01`, `${prefix}-${String(daysInMonth).padStart(2, '0')} 23:59:59`],
    );

    const daily = new Array(daysInMonth).fill(0);
    for (const row of arsResult.rows) {
      const dayIdx = (row.day as number) - 1;
      if (dayIdx >= 0 && dayIdx < daysInMonth) {
        daily[dayIdx] += row.total as number;
      }
    }
    for (const row of usdResult.rows) {
      const dayIdx = (row.day as number) - 1;
      if (dayIdx >= 0 && dayIdx < daysInMonth) {
        daily[dayIdx] += row.total as number;
      }
    }

    const total = daily.reduce((sum, v) => sum + v, 0);
    return {daily, total};
  },

  getTransactionsForMonth: async (year, month) => {
    const db = getDatabase();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month, 0).getDate();

    const txResult = await db.execute(
      `SELECT * FROM finance_transactions
       WHERE status = 'confirmed'
         AND date >= ? AND date <= ?
       ORDER BY date DESC`,
      [`${prefix}-01`, `${prefix}-${String(daysInMonth).padStart(2, '0')} 23:59:59`],
    );

    const transactions: FinanceTransaction[] = [];
    for (const row of txResult.rows) {
      const catResult = await db.execute(
        `SELECT fc.* FROM finance_categories fc
         JOIN finance_transaction_categories ftc ON ftc.category_id = fc.id
         WHERE ftc.transaction_id = ?
         ORDER BY fc.name`,
        [row.id],
      );
      transactions.push({
        ...row,
        currency: (row.currency as string) || 'ARS',
        status: (row.status as string) || 'confirmed',
        recurring_id: (row.recurring_id as number) ?? null,
        exchange_rate: (row.exchange_rate as number) ?? null,
        categories: catResult.rows as FinanceCategory[],
      } as FinanceTransaction);
    }

    return transactions;
  },
}));
