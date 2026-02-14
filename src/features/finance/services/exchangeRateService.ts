import {getDatabase} from '../../../core/database';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const FETCH_TIMEOUT_MS = 5000;
const FALLBACK_RATE = 1200;
const DB_KEY = 'exchange_rate_usd_blue';
const DB_KEY_TS = 'exchange_rate_usd_blue_ts';

let memoryRate: number | null = null;
let memoryTimestamp: number = 0;

function isFresh(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL_MS;
}

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {signal: controller.signal});
    if (!res.ok) return null;
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCurrentFromApi(): Promise<number | null> {
  const res = await fetchWithTimeout('https://dolarapi.com/v1/dolares/blue');
  if (!res) return null;
  try {
    const data = await res.json();
    const rate = data?.venta;
    if (typeof rate === 'number' && rate > 0) return rate;
  } catch {}
  return null;
}

function saveToDb(rate: number): void {
  try {
    const db = getDatabase();
    db.executeSync(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
      [DB_KEY, String(rate)],
    );
    db.executeSync(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
      [DB_KEY_TS, String(Date.now())],
    );
  } catch {}
}

function loadFromDb(): {rate: number; timestamp: number} | null {
  try {
    const db = getDatabase();
    const rateResult = db.executeSync(
      "SELECT value FROM app_settings WHERE key = ?",
      [DB_KEY],
    );
    const tsResult = db.executeSync(
      "SELECT value FROM app_settings WHERE key = ?",
      [DB_KEY_TS],
    );
    if (rateResult.rows.length > 0 && tsResult.rows.length > 0) {
      const rate = parseFloat(rateResult.rows[0].value as string);
      const timestamp = parseInt(tsResult.rows[0].value as string, 10);
      if (rate > 0 && timestamp > 0) return {rate, timestamp};
    }
  } catch {}
  return null;
}

/** Get current blue rate (with 3-tier cache) */
export async function getRate(): Promise<number> {
  if (memoryRate !== null && isFresh(memoryTimestamp)) return memoryRate;

  const dbCache = loadFromDb();
  if (dbCache && isFresh(dbCache.timestamp)) {
    memoryRate = dbCache.rate;
    memoryTimestamp = dbCache.timestamp;
    return dbCache.rate;
  }

  const apiRate = await fetchCurrentFromApi();
  if (apiRate !== null) {
    memoryRate = apiRate;
    memoryTimestamp = Date.now();
    saveToDb(apiRate);
    return apiRate;
  }

  if (dbCache) {
    memoryRate = dbCache.rate;
    memoryTimestamp = dbCache.timestamp;
    return dbCache.rate;
  }

  if (memoryRate !== null) return memoryRate;

  return FALLBACK_RATE;
}

/** Force-refresh current rate from API */
export async function refresh(): Promise<number> {
  const apiRate = await fetchCurrentFromApi();
  if (apiRate !== null) {
    memoryRate = apiRate;
    memoryTimestamp = Date.now();
    saveToDb(apiRate);
    return apiRate;
  }
  return getRate();
}

/**
 * Get blue rate for a specific date (YYYY-MM-DD).
 * Uses ArgentinaDatos historical API, with fallback to current rate.
 */
export async function getRateForDate(dateStr: string): Promise<number> {
  // Parse YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length < 3) return getRate();
  const [year, month, day] = parts;

  // Try ArgentinaDatos historical API
  const url = `https://api.argentinadatos.com/v1/cotizaciones/dolares/blue/${year}/${month}/${day}`;
  const res = await fetchWithTimeout(url);
  if (res) {
    try {
      const data = await res.json();
      const rate = data?.venta;
      if (typeof rate === 'number' && rate > 0) return rate;
    } catch {}
  }

  // Fallback: try Bluelytics historical API
  const url2 = `https://api.bluelytics.com.ar/v2/historical?day=${dateStr}`;
  const res2 = await fetchWithTimeout(url2);
  if (res2) {
    try {
      const data = await res2.json();
      const rate = data?.blue?.value_sell;
      if (typeof rate === 'number' && rate > 0) return rate;
    } catch {}
  }

  // Last fallback: current rate
  return getRate();
}
