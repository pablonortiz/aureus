import {create} from 'zustand';
import {getDatabase} from '../../../core/database';
import type {
  AccountPlatform,
  GmailAccountWithPlatforms,
  Platform,
  PlatformStatus,
  PlatformUsage,
} from '../../../core/types';
import {platformStatusRank} from '../utils/platformStatus';

type DatabaseRow = Record<string, any>;

interface GmailState {
  accounts: GmailAccountWithPlatforms[];
  platforms: Platform[];
  platformUsage: PlatformUsage[];
  loading: boolean;
  loadAccounts: () => Promise<void>;
  loadPlatforms: () => Promise<void>;
  loadPlatformUsage: () => Promise<void>;
  addAccount: (emailPrefix: string) => Promise<void>;
  deleteAccount: (id: number) => Promise<void>;
  addPlatformToAll: (name: string) => Promise<void>;
  addPlatformToAccount: (gmailId: number, name: string) => Promise<void>;
  setPlatformStatus: (
    gmailId: number,
    platformId: number,
    status: PlatformStatus,
  ) => Promise<void>;
  removePlatformFromAccount: (
    gmailId: number,
    platformId: number,
  ) => Promise<void>;
  deletePlatform: (platformId: number) => Promise<void>;
}

const ACCOUNT_PLATFORMS_QUERY = `
  SELECT gps.gmail_id, gps.platform_id, gps.status, p.name AS platform_name
  FROM gmail_platform_status gps
  JOIN platforms p ON p.id = gps.platform_id
  ORDER BY p.name`;

const PLATFORM_USAGE_QUERY = `
  SELECT p.id, p.name, p.created_at,
         COUNT(gps.id) AS account_count,
         SUM(CASE WHEN gps.status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
         SUM(CASE WHEN gps.status = 'created' THEN 1 ELSE 0 END) AS created_count,
         SUM(CASE WHEN gps.status = 'finished' THEN 1 ELSE 0 END) AS finished_count
  FROM platforms p
  LEFT JOIN gmail_platform_status gps ON gps.platform_id = p.id
  GROUP BY p.id
  ORDER BY p.name`;

function toAccountPlatform(row: DatabaseRow): AccountPlatform {
  return {
    platform_id: row.platform_id as number,
    platform_name: row.platform_name as string,
    status: (row.status as PlatformStatus) || 'pending',
  };
}

function groupPlatformsByAccount(
  rows: DatabaseRow[],
): Map<number, AccountPlatform[]> {
  const byAccount = new Map<number, AccountPlatform[]>();
  for (const row of rows) {
    const gmailId = row.gmail_id as number;
    const platforms = byAccount.get(gmailId);
    if (platforms) {
      platforms.push(toAccountPlatform(row));
    } else {
      byAccount.set(gmailId, [toAccountPlatform(row)]);
    }
  }
  return byAccount;
}

function countByStatus(platforms: AccountPlatform[]) {
  const counts: Record<PlatformStatus, number> = {
    pending: 0,
    created: 0,
    finished: 0,
  };
  for (const platform of platforms) {
    counts[platform.status]++;
  }
  return counts;
}

/** Pending first, finished last, alphabetical within each group. */
function sortByStatus(platforms: AccountPlatform[]): AccountPlatform[] {
  return [...platforms].sort(
    (platform, other) =>
      platformStatusRank(platform.status) - platformStatusRank(other.status),
  );
}

function buildAccount(
  row: DatabaseRow,
  platforms: AccountPlatform[],
): GmailAccountWithPlatforms {
  const counts = countByStatus(platforms);
  return {
    id: row.id as number,
    email_prefix: row.email_prefix as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    platforms: sortByStatus(platforms),
    pendingCount: counts.pending,
    createdCount: counts.created,
    finishedCount: counts.finished,
    totalCount: platforms.length,
    allFinished: platforms.length > 0 && counts.finished === platforms.length,
  };
}

function toPlatformUsage(row: DatabaseRow): PlatformUsage {
  return {
    id: row.id as number,
    name: row.name as string,
    created_at: row.created_at as string,
    accountCount: (row.account_count as number) || 0,
    pendingCount: (row.pending_count as number) || 0,
    createdCount: (row.created_count as number) || 0,
    finishedCount: (row.finished_count as number) || 0,
  };
}

/** Creates the platform in the global catalog if needed and returns its id. */
async function ensurePlatform(name: string): Promise<number> {
  const db = getDatabase();
  await db.execute('INSERT OR IGNORE INTO platforms (name) VALUES (?)', [name]);
  const result = await db.execute('SELECT id FROM platforms WHERE name = ?', [
    name,
  ]);
  return result.rows[0].id as number;
}

export const useGmailStore = create<GmailState>((set, get) => ({
  accounts: [],
  platforms: [],
  platformUsage: [],
  loading: false,

  loadAccounts: async () => {
    set({loading: true});
    const db = getDatabase();
    const accountRows = await db.execute(
      'SELECT * FROM gmail_accounts ORDER BY created_at DESC',
    );
    const statusRows = await db.execute(ACCOUNT_PLATFORMS_QUERY);
    const platformsByAccount = groupPlatformsByAccount(statusRows.rows);

    const accounts: GmailAccountWithPlatforms[] = [];
    for (const row of accountRows.rows) {
      accounts.push(
        buildAccount(row, platformsByAccount.get(row.id as number) || []),
      );
    }

    set({accounts, loading: false});
  },

  loadPlatforms: async () => {
    const db = getDatabase();
    const result = await db.execute('SELECT * FROM platforms ORDER BY name');
    const platforms: Platform[] = [];
    for (const row of result.rows) {
      platforms.push({
        id: row.id as number,
        name: row.name as string,
        created_at: row.created_at as string,
      });
    }
    set({platforms});
  },

  loadPlatformUsage: async () => {
    const db = getDatabase();
    const result = await db.execute(PLATFORM_USAGE_QUERY);
    const platformUsage: PlatformUsage[] = [];
    for (const row of result.rows) {
      platformUsage.push(toPlatformUsage(row));
    }
    set({platformUsage});
  },

  addAccount: async (emailPrefix: string) => {
    const db = getDatabase();
    const prefix = emailPrefix.toLowerCase().trim();
    await db.execute('INSERT INTO gmail_accounts (email_prefix) VALUES (?)', [
      prefix,
    ]);

    const newAccount = await db.execute(
      'SELECT id FROM gmail_accounts WHERE email_prefix = ?',
      [prefix],
    );
    const accountId = newAccount.rows[0].id;

    // A new account starts with the whole catalog pending
    const platforms = await db.execute('SELECT id FROM platforms');
    for (const row of platforms.rows) {
      await db.execute(
        "INSERT OR IGNORE INTO gmail_platform_status (gmail_id, platform_id, status) VALUES (?, ?, 'pending')",
        [accountId, row.id],
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
    const platformId = await ensurePlatform(name.trim());

    const accounts = await db.execute('SELECT id FROM gmail_accounts');
    for (const row of accounts.rows) {
      await db.execute(
        "INSERT OR IGNORE INTO gmail_platform_status (gmail_id, platform_id, status) VALUES (?, ?, 'pending')",
        [row.id, platformId],
      );
    }

    await get().loadPlatforms();
    await get().loadAccounts();
  },

  addPlatformToAccount: async (gmailId: number, name: string) => {
    const db = getDatabase();
    const platformId = await ensurePlatform(name.trim());
    await db.execute(
      "INSERT OR IGNORE INTO gmail_platform_status (gmail_id, platform_id, status) VALUES (?, ?, 'pending')",
      [gmailId, platformId],
    );

    await get().loadPlatforms();
    await get().loadAccounts();
  },

  setPlatformStatus: async (
    gmailId: number,
    platformId: number,
    status: PlatformStatus,
  ) => {
    const db = getDatabase();
    await db.execute(
      `UPDATE gmail_platform_status
       SET status = ?, updated_at = datetime('now')
       WHERE gmail_id = ? AND platform_id = ?`,
      [status, gmailId, platformId],
    );
    await get().loadAccounts();
  },

  removePlatformFromAccount: async (gmailId: number, platformId: number) => {
    const db = getDatabase();
    await db.execute(
      'DELETE FROM gmail_platform_status WHERE gmail_id = ? AND platform_id = ?',
      [gmailId, platformId],
    );
    await get().loadAccounts();
  },

  deletePlatform: async (platformId: number) => {
    const db = getDatabase();
    // Statuses of every account fall with it (ON DELETE CASCADE)
    await db.execute('DELETE FROM platforms WHERE id = ?', [platformId]);
    await get().loadPlatforms();
    await get().loadPlatformUsage();
    await get().loadAccounts();
  },
}));
