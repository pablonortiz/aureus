import {create} from 'zustand';
import {getDatabase} from '../../../core/database';
import type {GmailAccountWithPlatforms, Platform} from '../../../core/types';

interface GmailState {
  accounts: GmailAccountWithPlatforms[];
  platforms: Platform[];
  loading: boolean;
  loadAccounts: () => Promise<void>;
  loadPlatforms: () => Promise<void>;
  addAccount: (emailPrefix: string) => Promise<void>;
  deleteAccount: (id: number) => Promise<void>;
  addPlatformToAll: (name: string) => Promise<void>;
  togglePlatformStatus: (gmailId: number, platformId: number) => Promise<void>;
}

export const useGmailStore = create<GmailState>((set, get) => ({
  accounts: [],
  platforms: [],
  loading: false,

  loadAccounts: async () => {
    set({loading: true});
    const db = getDatabase();
    const accountsResult = await db.execute(
      'SELECT * FROM gmail_accounts ORDER BY created_at DESC',
    );

    const accounts: GmailAccountWithPlatforms[] = [];
    for (let i = 0; i < accountsResult.rows.length; i++) {
      const account = accountsResult.rows[i];
      const statusResult = await db.execute(
        `SELECT gps.*, p.name as platform_name
         FROM gmail_platform_status gps
         JOIN platforms p ON p.id = gps.platform_id
         WHERE gps.gmail_id = ?
         ORDER BY p.name`,
        [account.id],
      );

      const platforms = [];
      let pendingCount = 0;
      for (let j = 0; j < statusResult.rows.length; j++) {
        const status = statusResult.rows[j];
        platforms.push({
          ...status,
          is_registered: !!status.is_registered,
        });
        if (!status.is_registered) {
          pendingCount++;
        }
      }

      accounts.push({
        ...account,
        platforms,
        pendingCount,
        totalCount: platforms.length,
        allCompleted: platforms.length > 0 && pendingCount === 0,
      });
    }

    set({accounts, loading: false});
  },

  loadPlatforms: async () => {
    const db = getDatabase();
    const result = await db.execute(
      'SELECT * FROM platforms ORDER BY name',
    );
    const platforms: Platform[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      platforms.push(result.rows[i]);
    }
    set({platforms});
  },

  addAccount: async (emailPrefix: string) => {
    const db = getDatabase();
    await db.execute(
      'INSERT INTO gmail_accounts (email_prefix) VALUES (?)',
      [emailPrefix.toLowerCase().trim()],
    );

    // Add all existing platforms to the new account
    const newAccount = await db.execute(
      'SELECT id FROM gmail_accounts WHERE email_prefix = ?',
      [emailPrefix.toLowerCase().trim()],
    );
    const accountId = newAccount.rows[0].id;

    const platforms = await db.execute('SELECT id FROM platforms');
    for (let i = 0; i < platforms.rows.length; i++) {
      await db.execute(
        'INSERT OR IGNORE INTO gmail_platform_status (gmail_id, platform_id) VALUES (?, ?)',
        [accountId, platforms.rows[i].id],
      );
    }

    await get().loadAccounts();
  },

  deleteAccount: async (id: number) => {
    const db = getDatabase();
    await db.execute('DELETE FROM gmail_accounts WHERE id = ?', [id]);
    await get().loadAccounts();
  },

  addPlatformToAll: async (name: string) => {
    const db = getDatabase();
    await db.execute('INSERT OR IGNORE INTO platforms (name) VALUES (?)', [
      name.trim(),
    ]);

    const platform = await db.execute(
      'SELECT id FROM platforms WHERE name = ?',
      [name.trim()],
    );
    const platformId = platform.rows[0].id;

    const accounts = await db.execute('SELECT id FROM gmail_accounts');
    for (let i = 0; i < accounts.rows.length; i++) {
      await db.execute(
        'INSERT OR IGNORE INTO gmail_platform_status (gmail_id, platform_id) VALUES (?, ?)',
        [accounts.rows[i].id, platformId],
      );
    }

    await get().loadPlatforms();
    await get().loadAccounts();
  },

  togglePlatformStatus: async (gmailId: number, platformId: number) => {
    const db = getDatabase();
    await db.execute(
      `UPDATE gmail_platform_status
       SET is_registered = CASE WHEN is_registered = 1 THEN 0 ELSE 1 END,
           updated_at = datetime('now')
       WHERE gmail_id = ? AND platform_id = ?`,
      [gmailId, platformId],
    );
    await get().loadAccounts();
  },
}));
