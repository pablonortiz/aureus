import {open, type DB} from '@op-engineering/op-sqlite';

let db: DB | null = null;

export function getDatabase(): DB {
  if (db) {
    return db;
  }

  db = open({name: 'aureus.db'});

  runMigrations(db);
  return db;
}

function runMigrations(database: DB): void {
  database.executeSync('PRAGMA foreign_keys = ON;');

  // App settings
  database.executeSync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Gmail module
  database.executeSync(`
    CREATE TABLE IF NOT EXISTS gmail_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email_prefix TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  database.executeSync(`
    CREATE TABLE IF NOT EXISTS platforms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  database.executeSync(`
    CREATE TABLE IF NOT EXISTS gmail_platform_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gmail_id INTEGER NOT NULL REFERENCES gmail_accounts(id) ON DELETE CASCADE,
      platform_id INTEGER NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
      is_registered INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(gmail_id, platform_id)
    );
  `);

  // Clipboard module
  database.executeSync(`
    CREATE TABLE IF NOT EXISTS clipboard_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  database.executeSync(`
    CREATE TABLE IF NOT EXISTS clipboard_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      category_id INTEGER REFERENCES clipboard_categories(id),
      is_private INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  database.executeSync(`
    CREATE TABLE IF NOT EXISTS clipboard_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
  `);

  database.executeSync(`
    CREATE TABLE IF NOT EXISTS clipboard_link_tags (
      link_id INTEGER NOT NULL REFERENCES clipboard_links(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES clipboard_tags(id) ON DELETE CASCADE,
      PRIMARY KEY (link_id, tag_id)
    );
  `);

  // Add is_private to clipboard_tags (idempotent)
  try {
    database.executeSync(
      'ALTER TABLE clipboard_tags ADD COLUMN is_private INTEGER DEFAULT 0',
    );
  } catch (_e) {
    // Column already exists
  }
  // Allow same tag name in public and private (unique on name+is_private)
  try {
    database.executeSync(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_name_private ON clipboard_tags (name, is_private)',
    );
  } catch (_e) {
    // Index already exists
  }

  // Clipboard folders
  database.executeSync(`
    CREATE TABLE IF NOT EXISTS clipboard_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT,
      color TEXT,
      is_private INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Add new columns to clipboard_links (idempotent)
  const clipboardAlterColumns = [
    'ALTER TABLE clipboard_links ADD COLUMN folder_id INTEGER REFERENCES clipboard_folders(id)',
    "ALTER TABLE clipboard_links ADD COLUMN type TEXT DEFAULT 'link'",
    'ALTER TABLE clipboard_links ADD COLUMN content TEXT',
  ];
  for (const sql of clipboardAlterColumns) {
    try {
      database.executeSync(sql);
    } catch (_e) {
      // Column already exists — ignore
    }
  }

  // Migrate existing categories to folders
  database.executeSync(
    'INSERT OR IGNORE INTO clipboard_folders (name, icon) SELECT name, icon FROM clipboard_categories',
  );
  // Migrate category_id → folder_id for existing links
  database.executeSync(
    `UPDATE clipboard_links SET folder_id = (
      SELECT cf.id FROM clipboard_folders cf
      JOIN clipboard_categories cc ON cc.name = cf.name
      WHERE cc.id = clipboard_links.category_id
    ) WHERE folder_id IS NULL AND category_id IS NOT NULL`,
  );

  // Seed default folders if none exist
  const folderCount = database.executeSync(
    'SELECT COUNT(*) as count FROM clipboard_folders',
  );
  if (folderCount.rows[0].count === 0) {
    const defaultFolders = [
      ['General', 'folder', '#94a3b8'],
      ['Trabajo', 'work', '#3b82f6'],
      ['Personal', 'person', '#a855f7'],
    ];
    for (const [name, icon, color] of defaultFolders) {
      database.executeSync(
        'INSERT OR IGNORE INTO clipboard_folders (name, icon, color) VALUES (?, ?, ?)',
        [name, icon, color],
      );
    }
  }

  // Focus module
  database.executeSync(`
    CREATE TABLE IF NOT EXISTS focus_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0,
      date TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  database.executeSync(`
    CREATE TABLE IF NOT EXISTS focus_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      duration_minutes INTEGER NOT NULL DEFAULT 25,
      completed INTEGER DEFAULT 0,
      date TEXT DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Finance module
  database.executeSync(`
    CREATE TABLE IF NOT EXISTS finance_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT,
      color TEXT
    );
  `);

  database.executeSync(`
    CREATE TABLE IF NOT EXISTS finance_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      category_id INTEGER REFERENCES finance_categories(id),
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      date TEXT DEFAULT (datetime('now')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Junction table for multi-category transactions
  database.executeSync(`
    CREATE TABLE IF NOT EXISTS finance_transaction_categories (
      transaction_id INTEGER NOT NULL REFERENCES finance_transactions(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES finance_categories(id) ON DELETE CASCADE,
      PRIMARY KEY (transaction_id, category_id)
    );
  `);

  // Finance: add currency, status, recurring_id columns (idempotent)
  const alterColumns = [
    "ALTER TABLE finance_transactions ADD COLUMN currency TEXT DEFAULT 'ARS'",
    "ALTER TABLE finance_transactions ADD COLUMN status TEXT DEFAULT 'confirmed'",
    'ALTER TABLE finance_transactions ADD COLUMN recurring_id INTEGER',
    'ALTER TABLE finance_transactions ADD COLUMN exchange_rate REAL',
  ];
  for (const sql of alterColumns) {
    try {
      database.executeSync(sql);
    } catch (_e) {
      // Column already exists — ignore
    }
  }

  // Finance recurring table
  database.executeSync(`
    CREATE TABLE IF NOT EXISTS finance_recurring (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'ARS',
      type TEXT NOT NULL DEFAULT 'expense',
      day_of_month INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  database.executeSync(`
    CREATE TABLE IF NOT EXISTS finance_recurring_categories (
      recurring_id INTEGER NOT NULL REFERENCES finance_recurring(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES finance_categories(id) ON DELETE CASCADE,
      PRIMARY KEY (recurring_id, category_id)
    );
  `);

  // Finance recurring: add frequency columns (idempotent)
  const recurringAlterColumns = [
    "ALTER TABLE finance_recurring ADD COLUMN frequency TEXT DEFAULT 'monthly'",
    'ALTER TABLE finance_recurring ADD COLUMN total_installments INTEGER',
    'ALTER TABLE finance_recurring ADD COLUMN start_month INTEGER',
    'ALTER TABLE finance_recurring ADD COLUMN start_year INTEGER',
    'ALTER TABLE finance_recurring ADD COLUMN month_of_year INTEGER',
  ];
  for (const sql of recurringAlterColumns) {
    try {
      database.executeSync(sql);
    } catch (_e) {
      // Column already exists — ignore
    }
  }

  // Source Finder module
  database.executeSync(`
    CREATE TABLE IF NOT EXISTS source_finder_searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tweet_url TEXT NOT NULL,
      tweet_id TEXT NOT NULL,
      tweet_text TEXT,
      tweet_author TEXT,
      tweet_author_avatar TEXT,
      image_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  database.executeSync(`
    CREATE TABLE IF NOT EXISTS source_finder_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      search_id INTEGER NOT NULL REFERENCES source_finder_searches(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      source_name TEXT,
      source_title TEXT,
      similarity REAL,
      source_url TEXT,
      thumbnail_url TEXT,
      index_name TEXT,
      creators TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Gallery module
  database.executeSync(`
    CREATE TABLE IF NOT EXISTS gallery_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER REFERENCES gallery_folders(id) ON DELETE CASCADE,
      cover_media_id INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  database.executeSync(`
    CREATE TABLE IF NOT EXISTS gallery_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      icon TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  database.executeSync(`
    CREATE TABLE IF NOT EXISTS gallery_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      vault_path TEXT NOT NULL,
      media_type TEXT NOT NULL CHECK(media_type IN ('image', 'video')),
      file_size INTEGER DEFAULT 0,
      width INTEGER,
      height INTEGER,
      duration INTEGER,
      folder_id INTEGER REFERENCES gallery_folders(id) ON DELETE SET NULL,
      is_favorite INTEGER DEFAULT 0,
      notes TEXT,
      trashed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  database.executeSync(`
    CREATE TABLE IF NOT EXISTS gallery_media_categories (
      media_id INTEGER NOT NULL REFERENCES gallery_media(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES gallery_categories(id) ON DELETE CASCADE,
      PRIMARY KEY (media_id, category_id)
    );
  `);

  // Seed default gallery categories
  const galleryCatCount = database.executeSync(
    'SELECT COUNT(*) as count FROM gallery_categories',
  );
  if (galleryCatCount.rows[0].count === 0) {
    const defaultGalleryCategories = [
      ['General', '#94a3b8', 'folder'],
      ['Capturas', '#3b82f6', 'screenshot'],
      ['Personales', '#a855f7', 'person'],
      ['Memes', '#22c55e', 'mood'],
    ];
    for (const [name, color, icon] of defaultGalleryCategories) {
      database.executeSync(
        'INSERT OR IGNORE INTO gallery_categories (name, color, icon) VALUES (?, ?, ?)',
        [name, color, icon],
      );
    }
  }

  // Gallery: add notes_normalized column (idempotent)
  try {
    database.executeSync(
      'ALTER TABLE gallery_media ADD COLUMN notes_normalized TEXT',
    );
  } catch (_e) {
    // Column already exists
  }

  // Backfill notes_normalized for existing rows
  const notesRows = database.executeSync(
    'SELECT id, notes FROM gallery_media WHERE notes IS NOT NULL AND notes_normalized IS NULL',
  );
  for (const row of notesRows.rows) {
    const normalized = (row.notes as string)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    database.executeSync(
      'UPDATE gallery_media SET notes_normalized = ? WHERE id = ?',
      [normalized, row.id],
    );
  }

  // Seed default gallery secret code
  database.executeSync(
    "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('gallery_secret_code', '1234')",
  );

  // Radar module
  database.executeSync(`
    CREATE TABLE IF NOT EXISTS radar_searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      keywords TEXT,
      tip TEXT,
      is_saved INTEGER DEFAULT 0,
      notes TEXT,
      query_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  database.executeSync(`
    CREATE TABLE IF NOT EXISTS radar_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      search_id INTEGER NOT NULL REFERENCES radar_searches(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      query_text TEXT NOT NULL,
      description TEXT,
      launch_url TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrate clipboard_pin → app_pin (one-time)
  database.executeSync(
    "UPDATE app_settings SET key = 'app_pin' WHERE key = 'clipboard_pin'",
  );

  // Seed / migrate finance categories
  const hasNewCats = database.executeSync(
    "SELECT COUNT(*) as count FROM finance_categories WHERE name = 'Amors'",
  );
  if (hasNewCats.rows[0].count === 0) {
    // Clear old categories and re-seed
    database.executeSync('DELETE FROM finance_categories');
  }
  const result = database.executeSync(
    'SELECT COUNT(*) as count FROM finance_categories',
  );
  if (result.rows[0].count === 0) {
    const defaultCategories = [
      ['Comida', 'restaurant', '#FF6B6B'],
      ['Amors', 'favorite', '#FF69B4'],
      ['Suscripciones', 'subscriptions', '#9B59B6'],
      ['Prestamos', 'payments', '#E67E22'],
      ['Salud', 'local-hospital', '#DDA0DD'],
      ['Transporte', 'directions-car', '#96CEB4'],
      ['Supermercado', 'shopping-cart', '#45B7D1'],
      ['Partido', 'sports-soccer', '#2ECC71'],
      ['Otro', 'face', '#94a3b8'],
    ];
    for (const [name, icon, color] of defaultCategories) {
      database.executeSync(
        'INSERT OR IGNORE INTO finance_categories (name, icon, color) VALUES (?, ?, ?)',
        [name, icon, color],
      );
    }
  }

  // Ensure "Compras" category exists (for existing DBs)
  database.executeSync(
    "INSERT OR IGNORE INTO finance_categories (name, icon, color) VALUES ('Compras', 'shopping-bag', '#F59E0B')",
  );

  // Finance: default lookahead day for pending recurring chip
  database.executeSync(
    "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('pending_lookahead_day', '5')",
  );

  // Finance: "Sueldo" category + salary_amount setting
  database.executeSync(
    "INSERT OR IGNORE INTO finance_categories (name, icon, color) VALUES ('Sueldo', 'payments', '#22c55e')",
  );
  database.executeSync(
    "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('salary_amount', '0')",
  );
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
