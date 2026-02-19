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
  pendingRecurringTotal: number;
  pendingLookaheadDay: number;
  loading: boolean;

  loadTransactions: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadPendingLookaheadDay: () => Promise<void>;
  updatePendingLookaheadDay: (day: number) => Promise<void>;
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
    frequency?: 'monthly' | 'installment' | 'annual',
    totalInstallments?: number | null,
    startMonth?: number | null,
    startYear?: number | null,
    monthOfYear?: number | null,
  ) => Promise<void>;
  updateRecurring: (
    id: number,
    title: string,
    amount: number,
    currency: 'ARS' | 'USD',
    dayOfMonth: number,
    categoryIds: number[],
    frequency?: 'monthly' | 'installment' | 'annual',
    totalInstallments?: number | null,
    startMonth?: number | null,
    startYear?: number | null,
    monthOfYear?: number | null,
  ) => Promise<void>;
  updateTransaction: (
    id: number,
    title: string,
    amount: number,
    type: 'income' | 'expense',
    categoryIds: number[],
    currency?: 'ARS' | 'USD',
    notes?: string,
    date?: string,
  ) => Promise<void>;
  deleteRecurring: (id: number) => Promise<void>;
  toggleRecurringActive: (id: number) => Promise<void>;
  confirmPendingTransaction: (id: number, finalAmount: number) => Promise<void>;
  dismissPendingTransaction: (id: number) => Promise<void>;
  generatePendingTransactions: () => Promise<void>;
  loadPendingRecurringTotal: () => Promise<void>;
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
  pendingRecurringTotal: 0,
  pendingLookaheadDay: 5,
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

  loadPendingLookaheadDay: async () => {
    const db = getDatabase();
    const result = await db.execute(
      "SELECT value FROM app_settings WHERE key = 'pending_lookahead_day'",
    );
    if (result.rows.length > 0) {
      const day = parseInt(result.rows[0].value as string, 10);
      if (day >= 1 && day <= 28) {
        set({pendingLookaheadDay: day});
      }
    }
  },

  updatePendingLookaheadDay: async (day) => {
    const db = getDatabase();
    await db.execute(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('pending_lookahead_day', ?)",
      [String(day)],
    );
    set({pendingLookaheadDay: day});
    await get().loadPendingRecurringTotal();
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
        frequency: (row.frequency as string) || 'monthly',
        total_installments: (row.total_installments as number) ?? null,
        start_month: (row.start_month as number) ?? null,
        start_year: (row.start_year as number) ?? null,
        month_of_year: (row.month_of_year as number) ?? null,
        categories: catResult.rows as FinanceCategory[],
      } as FinanceRecurring);
    }

    set({recurring});
  },

  addRecurring: async (title, amount, currency, dayOfMonth, categoryIds, frequency = 'monthly', totalInstallments = null, startMonth = null, startYear = null, monthOfYear = null) => {
    const db = getDatabase();
    const result = await db.execute(
      'INSERT INTO finance_recurring (title, amount, currency, type, day_of_month, frequency, total_installments, start_month, start_year, month_of_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, amount, currency, 'expense', dayOfMonth, frequency, totalInstallments, startMonth, startYear, monthOfYear],
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

  updateRecurring: async (id, title, amount, currency, dayOfMonth, categoryIds, frequency = 'monthly', totalInstallments = null, startMonth = null, startYear = null, monthOfYear = null) => {
    const db = getDatabase();
    await db.execute(
      'UPDATE finance_recurring SET title = ?, amount = ?, currency = ?, day_of_month = ?, frequency = ?, total_installments = ?, start_month = ?, start_year = ?, month_of_year = ? WHERE id = ?',
      [title, amount, currency, dayOfMonth, frequency, totalInstallments, startMonth, startYear, monthOfYear, id],
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
    const currentMonth = now.getMonth(); // 0-indexed
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    const recResult = await db.execute(
      'SELECT * FROM finance_recurring WHERE is_active = 1',
    );

    for (const rec of recResult.rows) {
      const dayOfMonth = rec.day_of_month as number;
      const frequency = (rec.frequency as string) || 'monthly';
      const currency = rec.currency as string;

      if (dayOfMonth > daysInMonth) continue;
      if (today < dayOfMonth) continue;

      // Check if tx already exists this month for this recurring
      const existing = await db.execute(
        "SELECT COUNT(*) as count FROM finance_transactions WHERE recurring_id = ? AND date >= ? AND date < ?",
        [rec.id, `${monthPrefix}-01`, `${monthPrefix}-${String(daysInMonth).padStart(2, '0')} 23:59:59`],
      );
      if ((existing.rows[0].count as number) > 0) continue;

      // --- ANNUAL: only generate in the specified month ---
      if (frequency === 'annual') {
        const monthOfYear = rec.month_of_year as number; // 1-indexed
        if ((currentMonth + 1) !== monthOfYear) continue;
      }

      // --- INSTALLMENT: check if within range ---
      let installmentLabel = '';
      if (frequency === 'installment') {
        const startMonth = rec.start_month as number; // 1-indexed
        const startYear = rec.start_year as number;
        const totalInstallments = rec.total_installments as number;
        const installmentNum = (currentYear - startYear) * 12 + ((currentMonth + 1) - startMonth) + 1;
        if (installmentNum < 1 || installmentNum > totalInstallments) continue;
        installmentLabel = ` (${installmentNum}/${totalInstallments})`;
      }

      let amount = rec.amount as number;

      // For monthly ARS, use the last confirmed amount if available
      if (frequency === 'monthly' && currency === 'ARS') {
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

      const title = `${rec.title}${installmentLabel}`;
      // Installments insert as confirmed; monthly/annual as pending
      const status = frequency === 'installment' ? 'confirmed' : 'pending';

      const txResult = await db.execute(
        "INSERT INTO finance_transactions (title, amount, type, currency, status, recurring_id, exchange_rate, date) VALUES (?, ?, 'expense', ?, ?, ?, ?, ?)",
        [title, amount, currency, status, rec.id, exchangeRateValue, txDatetime],
      );

      if (txResult.insertId && categoryIds.length > 0) {
        for (const catId of categoryIds) {
          await db.execute(
            'INSERT INTO finance_transaction_categories (transaction_id, category_id) VALUES (?, ?)',
            [txResult.insertId, catId],
          );
        }
      }

      // Auto-delete installment recurring after last installment
      if (frequency === 'installment') {
        const startMonth = rec.start_month as number;
        const startYear = rec.start_year as number;
        const totalInstallments = rec.total_installments as number;
        const installmentNum = (currentYear - startYear) * 12 + ((currentMonth + 1) - startMonth) + 1;
        if (installmentNum >= totalInstallments) {
          await db.execute('DELETE FROM finance_recurring WHERE id = ?', [rec.id]);
        }
      }
    }

    await get().loadTransactions();
  },

  loadPendingRecurringTotal: async () => {
    const db = getDatabase();
    const rate = get().exchangeRate || 0;
    const lookaheadDay = get().pendingLookaheadDay;
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-indexed
    const currentYear = now.getFullYear();
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Next month (handles Dec → Jan year wrap)
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const nextMonthPrefix = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}`;
    const nextDaysInMonth = new Date(nextYear, nextMonth + 1, 0).getDate();

    const recResult = await db.execute(
      'SELECT * FROM finance_recurring WHERE is_active = 1',
    );

    let total = 0;

    for (const rec of recResult.rows) {
      const frequency = (rec.frequency as string) || 'monthly';
      const dayOfMonth = rec.day_of_month as number;
      const amount = rec.amount as number;
      const currency = rec.currency as string;
      const amountArs = currency === 'USD' ? amount * rate : amount;

      // --- Current month: pending if no confirmed tx yet ---
      const applicableThisMonth = (() => {
        if (frequency === 'annual') {
          return (currentMonth + 1) === (rec.month_of_year as number);
        }
        if (frequency === 'installment') {
          const sm = rec.start_month as number;
          const sy = rec.start_year as number;
          const ti = rec.total_installments as number;
          const num = (currentYear - sy) * 12 + ((currentMonth + 1) - sm) + 1;
          return num >= 1 && num <= ti;
        }
        return true; // monthly
      })();

      if (applicableThisMonth) {
        const confirmed = await db.execute(
          "SELECT COUNT(*) as count FROM finance_transactions WHERE recurring_id = ? AND status = 'confirmed' AND date >= ? AND date < ?",
          [rec.id, `${monthPrefix}-01`, `${monthPrefix}-${String(daysInMonth).padStart(2, '0')} 23:59:59`],
        );
        if ((confirmed.rows[0].count as number) === 0) {
          total += amountArs;
        }
      }

      // --- Next month lookahead: only if day_of_month <= lookaheadDay ---
      if (dayOfMonth > lookaheadDay) continue;

      const applicableNextMonth = (() => {
        if (frequency === 'annual') {
          return (nextMonth + 1) === (rec.month_of_year as number);
        }
        if (frequency === 'installment') {
          const sm = rec.start_month as number;
          const sy = rec.start_year as number;
          const ti = rec.total_installments as number;
          const num = (nextYear - sy) * 12 + ((nextMonth + 1) - sm) + 1;
          return num >= 1 && num <= ti;
        }
        return true; // monthly
      })();

      if (applicableNextMonth) {
        const confirmedNext = await db.execute(
          "SELECT COUNT(*) as count FROM finance_transactions WHERE recurring_id = ? AND status = 'confirmed' AND date >= ? AND date < ?",
          [rec.id, `${nextMonthPrefix}-01`, `${nextMonthPrefix}-${String(nextDaysInMonth).padStart(2, '0')} 23:59:59`],
        );
        if ((confirmedNext.rows[0].count as number) === 0) {
          total += amountArs;
        }
      }
    }

    set({pendingRecurringTotal: total});
  },

  updateTransaction: async (id, title, amount, type, categoryIds, currency = 'ARS', notes, date) => {
    const db = getDatabase();

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const dateForRate = date || todayStr;
    const txDatetime = date ? `${date} 12:00:00` : `${todayStr} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}:${String(today.getSeconds()).padStart(2, '0')}`;

    let exchangeRateValue: number | null = null;
    if (currency === 'USD') {
      exchangeRateValue = await getRateForDate(dateForRate);
    }

    await db.execute(
      'UPDATE finance_transactions SET title = ?, amount = ?, type = ?, currency = ?, exchange_rate = ?, notes = ?, date = ? WHERE id = ?',
      [title, amount, type, currency, exchangeRateValue, notes || null, txDatetime, id],
    );

    // Re-insert categories
    await db.execute(
      'DELETE FROM finance_transaction_categories WHERE transaction_id = ?',
      [id],
    );
    for (const catId of categoryIds) {
      await db.execute(
        'INSERT INTO finance_transaction_categories (transaction_id, category_id) VALUES (?, ?)',
        [id, catId],
      );
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
