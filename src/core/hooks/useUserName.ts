import {useState, useCallback} from 'react';
import {getDatabase} from '../database';

const USER_NAME_KEY = 'user_name';
const DEFAULT_NAME = 'Pablo';

export function useUserName() {
  const [userName, setUserNameState] = useState(DEFAULT_NAME);

  const loadUserName = useCallback(async () => {
    try {
      const db = getDatabase();
      const result = await db.execute(
        `SELECT value FROM app_settings WHERE key = '${USER_NAME_KEY}'`,
      );
      if (result.rows.length > 0) {
        setUserNameState(String(result.rows[0].value));
      } else {
        setUserNameState(DEFAULT_NAME);
      }
    } catch {
      // Silently fail, keep default
    }
  }, []);

  const setUserName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    try {
      const db = getDatabase();
      await db.execute(
        `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('${USER_NAME_KEY}', ?)`,
        [trimmed],
      );
      setUserNameState(trimmed);
    } catch {
      // Silently fail
    }
  }, []);

  return {userName, setUserName, loadUserName};
}
