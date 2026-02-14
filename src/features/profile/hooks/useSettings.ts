import {useState, useCallback} from 'react';
import {getDatabase} from '../../../core/database';

export interface StorageStats {
  clipboardLinks: number;
  clipboardFolders: number;
  clipboardTags: number;
  gmailAccounts: number;
  platforms: number;
  focusTasks: number;
  focusSessions: number;
  financeTransactions: number;
  financeCategories: number;
  totalRecords: number;
}

export function useSettings() {
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [hasPin, setHasPin] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const db = getDatabase();

      // Check if PIN exists
      const pinResult = await db.execute(
        "SELECT value FROM app_settings WHERE key = 'clipboard_pin'",
      );
      setHasPin(pinResult.rows.length > 0);

      // Check notification setting
      const notifResult = await db.execute(
        "SELECT value FROM app_settings WHERE key = 'notifications_enabled'",
      );
      if (notifResult.rows.length > 0) {
        setNotificationsEnabled(notifResult.rows[0].value === '1');
      }

      // Storage stats
      const counts = await Promise.all([
        db.execute('SELECT COUNT(*) as count FROM clipboard_links'),
        db.execute('SELECT COUNT(*) as count FROM clipboard_folders'),
        db.execute('SELECT COUNT(*) as count FROM clipboard_tags'),
        db.execute('SELECT COUNT(*) as count FROM gmail_accounts'),
        db.execute('SELECT COUNT(*) as count FROM platforms'),
        db.execute('SELECT COUNT(*) as count FROM focus_tasks'),
        db.execute('SELECT COUNT(*) as count FROM focus_sessions'),
        db.execute('SELECT COUNT(*) as count FROM finance_transactions'),
        db.execute('SELECT COUNT(*) as count FROM finance_categories'),
      ]);

      const values = counts.map(r => (r.rows[0].count as number) || 0);
      const total = values.reduce((sum, v) => sum + v, 0);

      setStorageStats({
        clipboardLinks: values[0],
        clipboardFolders: values[1],
        clipboardTags: values[2],
        gmailAccounts: values[3],
        platforms: values[4],
        focusTasks: values[5],
        focusSessions: values[6],
        financeTransactions: values[7],
        financeCategories: values[8],
        totalRecords: total,
      });
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleNotifications = useCallback(async (enabled: boolean) => {
    try {
      const db = getDatabase();
      await db.execute(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('notifications_enabled', ?)",
        [enabled ? '1' : '0'],
      );
      setNotificationsEnabled(enabled);
    } catch {
      // Silently fail
    }
  }, []);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const db = getDatabase();
      const result = await db.execute(
        "SELECT value FROM app_settings WHERE key = 'clipboard_pin'",
      );
      if (result.rows.length === 0) {
        return true; // No PIN set, allow
      }
      return result.rows[0].value === pin;
    } catch {
      return false;
    }
  }, []);

  const changePin = useCallback(async (newPin: string) => {
    try {
      const db = getDatabase();
      await db.execute(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('clipboard_pin', ?)",
        [newPin],
      );
      setHasPin(true);
    } catch {
      // Silently fail
    }
  }, []);

  const removePin = useCallback(async () => {
    try {
      const db = getDatabase();
      await db.execute(
        "DELETE FROM app_settings WHERE key = 'clipboard_pin'",
      );
      setHasPin(false);
    } catch {
      // Silently fail
    }
  }, []);

  return {
    storageStats,
    hasPin,
    notificationsEnabled,
    loading,
    load,
    toggleNotifications,
    verifyPin,
    changePin,
    removePin,
  };
}
