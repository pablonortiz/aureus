import {useState, useCallback} from 'react';
import {getDatabase} from '../../../core/database';

export interface ProfileStats {
  modules: number;
  links: number;
  accounts: number;
  monthExpenses: number;
  tasksCompletedToday: number;
  searches: number;
}

export interface UsageSummary {
  streakDays: number;
  monthExpenses: number;
  monthIncome: number;
  itemsThisWeek: number;
}

export function useProfileStats() {
  const [stats, setStats] = useState<ProfileStats>({
    modules: 5,
    links: 0,
    accounts: 0,
    monthExpenses: 0,
    tasksCompletedToday: 0,
    searches: 0,
  });
  const [usage, setUsage] = useState<UsageSummary>({
    streakDays: 0,
    monthExpenses: 0,
    monthIncome: 0,
    itemsThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const db = getDatabase();

      // --- Stats ---
      const linksResult = await db.execute(
        'SELECT COUNT(*) as count FROM clipboard_links',
      );
      const linksCount = (linksResult.rows[0].count as number) || 0;

      const accountsResult = await db.execute(
        'SELECT COUNT(*) as count FROM gmail_accounts',
      );
      const accountsCount = (accountsResult.rows[0].count as number) || 0;

      // Month expenses (ARS + USD converted)
      const now = new Date();
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      const monthArsExp = await db.execute(
        "SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE type = 'expense' AND currency = 'ARS' AND status = 'confirmed' AND date >= ?",
        [firstDay],
      );
      const monthUsdExp = await db.execute(
        "SELECT COALESCE(SUM(amount * COALESCE(exchange_rate, 1)), 0) as total FROM finance_transactions WHERE type = 'expense' AND currency = 'USD' AND status = 'confirmed' AND date >= ?",
        [firstDay],
      );
      const monthExpenses =
        ((monthArsExp.rows[0].total as number) || 0) +
        ((monthUsdExp.rows[0].total as number) || 0);

      // Tasks completed today
      const today = new Date().toISOString().split('T')[0];
      const tasksResult = await db.execute(
        'SELECT COUNT(*) as count FROM focus_tasks WHERE is_completed = 1 AND date = ?',
        [today],
      );
      const tasksToday = (tasksResult.rows[0].count as number) || 0;

      // Source finder searches
      const searchesResult = await db.execute(
        'SELECT COUNT(*) as count FROM source_finder_searches',
      );
      const searchesCount = (searchesResult.rows[0].count as number) || 0;

      setStats({
        modules: 5,
        links: linksCount,
        accounts: accountsCount,
        monthExpenses,
        tasksCompletedToday: tasksToday,
        searches: searchesCount,
      });

      // --- Usage Summary ---

      // Month income
      const monthArsInc = await db.execute(
        "SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE type = 'income' AND currency = 'ARS' AND status = 'confirmed' AND date >= ?",
        [firstDay],
      );
      const monthUsdInc = await db.execute(
        "SELECT COALESCE(SUM(amount * COALESCE(exchange_rate, 1)), 0) as total FROM finance_transactions WHERE type = 'income' AND currency = 'USD' AND status = 'confirmed' AND date >= ?",
        [firstDay],
      );
      const monthIncome =
        ((monthArsInc.rows[0].total as number) || 0) +
        ((monthUsdInc.rows[0].total as number) || 0);

      // Items created this week (Mon-Sun)
      const nowDate = new Date();
      const dayOfWeek = nowDate.getDay(); // 0=Sun
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(nowDate);
      monday.setDate(nowDate.getDate() - mondayOffset);
      const mondayStr = monday.toISOString().split('T')[0];

      const weekLinks = await db.execute(
        'SELECT COUNT(*) as count FROM clipboard_links WHERE created_at >= ?',
        [mondayStr],
      );
      const weekTx = await db.execute(
        'SELECT COUNT(*) as count FROM finance_transactions WHERE created_at >= ?',
        [mondayStr],
      );
      const weekSearches = await db.execute(
        'SELECT COUNT(*) as count FROM source_finder_searches WHERE created_at >= ?',
        [mondayStr],
      );
      const itemsThisWeek =
        ((weekLinks.rows[0].count as number) || 0) +
        ((weekTx.rows[0].count as number) || 0) +
        ((weekSearches.rows[0].count as number) || 0);

      // Streak: consecutive days with any activity (going backwards from today)
      let streak = 0;
      const checkDate = new Date();
      for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const nextDateStr = new Date(
          checkDate.getTime() + 86400000,
        ).toISOString().split('T')[0];

        const dayActivity = await db.execute(
          `SELECT
            (SELECT COUNT(*) FROM clipboard_links WHERE created_at >= ? AND created_at < ?) +
            (SELECT COUNT(*) FROM finance_transactions WHERE created_at >= ? AND created_at < ?) +
            (SELECT COUNT(*) FROM focus_sessions WHERE created_at >= ? AND created_at < ?) +
            (SELECT COUNT(*) FROM focus_tasks WHERE created_at >= ? AND created_at < ?) +
            (SELECT COUNT(*) FROM gmail_accounts WHERE created_at >= ? AND created_at < ?) +
            (SELECT COUNT(*) FROM source_finder_searches WHERE created_at >= ? AND created_at < ?)
            as total`,
          [
            dateStr, nextDateStr,
            dateStr, nextDateStr,
            dateStr, nextDateStr,
            dateStr, nextDateStr,
            dateStr, nextDateStr,
            dateStr, nextDateStr,
          ],
        );

        if ((dayActivity.rows[0].total as number) > 0) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      setUsage({
        streakDays: streak,
        monthExpenses,
        monthIncome,
        itemsThisWeek,
      });
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  return {stats, usage, loading, reload: load};
}
