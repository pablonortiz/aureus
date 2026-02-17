import {useState, useEffect, useCallback} from 'react';
import {getDatabase} from '../../../core/database';

export interface ActivityItem {
  id: string;
  title: string;
  module: string;
  icon: string;
  status: string;
  statusColor?: string;
  timestamp: string;
}

function timeAgo(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate.replace(' ', 'T')).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Ayer';
  if (diffD < 7) return `Hace ${diffD}d`;
  return `Hace ${Math.floor(diffD / 7)}sem`;
}

export function useRecentActivity(limit = 6) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const db = getDatabase();
      const items: ActivityItem[] = [];

      // Clipboard: recent links/notes
      const clipResult = await db.execute(
        `SELECT id, title, type, created_at FROM clipboard_links
         WHERE is_private = 0
         ORDER BY created_at DESC LIMIT ?`,
        [limit],
      );
      for (const row of clipResult.rows) {
        const isNote = row.type === 'note';
        items.push({
          id: `clip-${row.id}`,
          title: row.title as string,
          module: 'Clipboard',
          icon: isNote ? 'description' : 'content-paste',
          status: isNote ? 'Nota' : 'Link',
          timestamp: row.created_at as string,
        });
      }

      // Finance: recent transactions
      const finResult = await db.execute(
        `SELECT ft.id, ft.title, ft.type, ft.amount, ft.currency, ft.status, ft.created_at
         FROM finance_transactions ft
         ORDER BY ft.created_at DESC LIMIT ?`,
        [limit],
      );
      for (const row of finResult.rows) {
        const amount = row.amount as number;
        const currency = (row.currency as string) || 'ARS';
        const isExpense = row.type === 'expense';
        const sign = isExpense ? '-' : '+';
        const symbol = currency === 'USD' ? 'US$' : '$';
        items.push({
          id: `fin-${row.id}`,
          title: row.title as string,
          module: 'Finanzas',
          icon: isExpense ? 'trending-down' : 'trending-up',
          status: `${sign}${symbol}${Math.abs(amount).toLocaleString('es-AR')}`,
          statusColor: isExpense ? '#ef4444' : '#22c55e',
          timestamp: row.created_at as string,
        });
      }

      // Focus: completed sessions today
      const focusSessions = await db.execute(
        `SELECT id, duration_minutes, created_at FROM focus_sessions
         WHERE completed = 1
         ORDER BY created_at DESC LIMIT ?`,
        [limit],
      );
      for (const row of focusSessions.rows) {
        items.push({
          id: `focus-s-${row.id}`,
          title: `Sesión de ${row.duration_minutes}min completada`,
          module: 'Enfoque',
          icon: 'timer',
          status: 'Completada',
          statusColor: '#22c55e',
          timestamp: row.created_at as string,
        });
      }

      // Focus: tasks completed
      const focusTasks = await db.execute(
        `SELECT id, title, created_at FROM focus_tasks
         WHERE is_completed = 1
         ORDER BY created_at DESC LIMIT ?`,
        [limit],
      );
      for (const row of focusTasks.rows) {
        items.push({
          id: `focus-t-${row.id}`,
          title: row.title as string,
          module: 'Enfoque',
          icon: 'check-circle',
          status: 'Hecho',
          statusColor: '#22c55e',
          timestamp: row.created_at as string,
        });
      }

      // Source Finder: recent searches
      const sfResult = await db.execute(
        `SELECT id, tweet_author, tweet_text, image_count, created_at
         FROM source_finder_searches
         ORDER BY created_at DESC LIMIT ?`,
        [limit],
      );
      for (const row of sfResult.rows) {
        const author = row.tweet_author as string | null;
        const text = row.tweet_text as string | null;
        const title = author
          ? `@${author}${text ? `: ${text}` : ''}`
          : 'Búsqueda';
        items.push({
          id: `sf-${row.id}`,
          title,
          module: 'Buscador',
          icon: 'image-search',
          status: `${row.image_count} imgs`,
          timestamp: row.created_at as string,
        });
      }

      // Radar: recent searches
      const radarResult = await db.execute(
        `SELECT id, query, query_count, created_at FROM radar_searches
         ORDER BY created_at DESC LIMIT ?`,
        [limit],
      );
      for (const row of radarResult.rows) {
        items.push({
          id: `radar-${row.id}`,
          title: row.query as string,
          module: 'Radar',
          icon: 'radar',
          status: `${row.query_count} queries`,
          timestamp: row.created_at as string,
        });
      }

      // Gmail: recent accounts
      const gmailResult = await db.execute(
        `SELECT id, email_prefix, created_at FROM gmail_accounts
         ORDER BY created_at DESC LIMIT ?`,
        [limit],
      );
      for (const row of gmailResult.rows) {
        items.push({
          id: `gmail-${row.id}`,
          title: `${row.email_prefix}@gmail.com`,
          module: 'Gmail',
          icon: 'email',
          status: 'Agregada',
          timestamp: row.created_at as string,
        });
      }

      // Sort all by timestamp descending and take the top N
      items.sort(
        (a, b) =>
          new Date(b.timestamp.replace(' ', 'T')).getTime() -
          new Date(a.timestamp.replace(' ', 'T')).getTime(),
      );

      // Enrich with relative time in module subtitle
      const enriched = items.slice(0, limit).map(item => ({
        ...item,
        module: `${item.module} · ${timeAgo(item.timestamp)}`,
      }));

      setActivities(enriched);
    } catch {
      // Silently fail — dashboard stays functional
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  return {activities, loading, reload: load};
}
