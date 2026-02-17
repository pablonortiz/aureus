import {useState, useCallback} from 'react';
import {getDatabase} from '../database';

const PIN_KEY = 'app_pin';

export function useAppPin() {
  const [hasPin, setHasPin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPin = useCallback(async () => {
    setLoading(true);
    try {
      const db = getDatabase();
      const result = await db.execute(
        `SELECT value FROM app_settings WHERE key = '${PIN_KEY}'`,
      );
      setHasPin(result.rows.length > 0);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const db = getDatabase();
      const result = await db.execute(
        `SELECT value FROM app_settings WHERE key = '${PIN_KEY}'`,
      );
      if (result.rows.length === 0) {
        return true; // No PIN set
      }
      return result.rows[0].value === pin;
    } catch {
      return false;
    }
  }, []);

  const savePin = useCallback(async (pin: string) => {
    try {
      const db = getDatabase();
      await db.execute(
        `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('${PIN_KEY}', ?)`,
        [pin],
      );
      setHasPin(true);
    } catch {
      // Silently fail
    }
  }, []);

  const resetPin = useCallback(async () => {
    try {
      const db = getDatabase();
      await db.execute(
        `DELETE FROM app_settings WHERE key = '${PIN_KEY}'`,
      );
      setHasPin(false);
    } catch {
      // Silently fail
    }
  }, []);

  return {hasPin, loading, loadPin, verifyPin, savePin, resetPin};
}
