import {create} from 'zustand';
import {getDatabase} from '../../../core/database';
import type {RadarSearch, RadarQuery} from '../../../core/types';
import {generateRadarQueries, buildLaunchUrl} from '../services/groqService';

interface RadarState {
  searches: RadarSearch[];
  savedSearches: RadarSearch[];
  currentQueries: RadarQuery[];
  loading: boolean;
  searching: boolean;
  searchProgress: string;
  apiKey: string;

  loadApiKey: () => Promise<void>;
  saveApiKey: (key: string) => Promise<void>;
  loadSearches: () => Promise<void>;
  loadSavedSearches: () => Promise<void>;
  search: (query: string) => Promise<number>;
  loadQueries: (searchId: number) => Promise<void>;
  saveSearch: (searchId: number) => Promise<void>;
  unsaveSearch: (searchId: number) => Promise<void>;
  updateNotes: (searchId: number, notes: string) => Promise<void>;
  deleteSearch: (searchId: number) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useRadarStore = create<RadarState>((set, get) => ({
  searches: [],
  savedSearches: [],
  currentQueries: [],
  loading: false,
  searching: false,
  searchProgress: '',
  apiKey: '',

  loadApiKey: async () => {
    try {
      const db = getDatabase();
      const result = await db.execute(
        "SELECT value FROM app_settings WHERE key = 'groq_api_key'",
      );
      if (result.rows.length > 0) {
        set({apiKey: result.rows[0].value as string});
      }
    } catch {
      // Silently fail
    }
  },

  saveApiKey: async (key: string) => {
    try {
      const db = getDatabase();
      await db.execute(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('groq_api_key', ?)",
        [key],
      );
      set({apiKey: key});
    } catch {
      // Silently fail
    }
  },

  loadSearches: async () => {
    set({loading: true});
    try {
      const db = getDatabase();
      const result = await db.execute(
        'SELECT * FROM radar_searches ORDER BY created_at DESC',
      );
      const searches: RadarSearch[] = result.rows.map(row => ({
        id: row.id as number,
        query: row.query as string,
        keywords: row.keywords as string | null,
        tip: row.tip as string | null,
        is_saved: (row.is_saved as number) === 1,
        notes: row.notes as string | null,
        query_count: row.query_count as number,
        created_at: row.created_at as string,
      }));
      set({searches});
    } catch {
      // Silently fail
    } finally {
      set({loading: false});
    }
  },

  loadSavedSearches: async () => {
    try {
      const db = getDatabase();
      const result = await db.execute(
        'SELECT * FROM radar_searches WHERE is_saved = 1 ORDER BY created_at DESC',
      );
      const savedSearches: RadarSearch[] = result.rows.map(row => ({
        id: row.id as number,
        query: row.query as string,
        keywords: row.keywords as string | null,
        tip: row.tip as string | null,
        is_saved: true,
        notes: row.notes as string | null,
        query_count: row.query_count as number,
        created_at: row.created_at as string,
      }));
      set({savedSearches});
    } catch {
      // Silently fail
    }
  },

  search: async (query: string) => {
    const {apiKey} = get();
    if (!apiKey) {
      throw new Error('API key no configurada');
    }

    set({searching: true, searchProgress: 'Generando queries...'});

    try {
      const groqResult = await generateRadarQueries(query, apiKey);

      set({searchProgress: 'Guardando resultados...'});

      const db = getDatabase();

      // Insert search
      const searchResult = await db.execute(
        'INSERT INTO radar_searches (query, keywords, tip, query_count) VALUES (?, ?, ?, ?)',
        [
          query,
          JSON.stringify(groqResult.keywords),
          groqResult.tip,
          groqResult.queries.length,
        ],
      );
      const searchId = searchResult.insertId as number;

      // Insert queries
      for (const q of groqResult.queries) {
        const launchUrl = buildLaunchUrl(q.platform, q.query_text);
        await db.execute(
          'INSERT INTO radar_queries (search_id, platform, query_text, description, launch_url) VALUES (?, ?, ?, ?, ?)',
          [searchId, q.platform, q.query_text, q.description, launchUrl],
        );
      }

      // Reload searches
      await get().loadSearches();

      return searchId;
    } finally {
      set({searching: false, searchProgress: ''});
    }
  },

  loadQueries: async (searchId: number) => {
    try {
      const db = getDatabase();
      const result = await db.execute(
        'SELECT * FROM radar_queries WHERE search_id = ? ORDER BY id ASC',
        [searchId],
      );
      const queries: RadarQuery[] = result.rows.map(row => ({
        id: row.id as number,
        search_id: row.search_id as number,
        platform: row.platform as string,
        query_text: row.query_text as string,
        description: row.description as string | null,
        launch_url: row.launch_url as string,
        created_at: row.created_at as string,
      }));
      set({currentQueries: queries});
    } catch {
      // Silently fail
    }
  },

  saveSearch: async (searchId: number) => {
    try {
      const db = getDatabase();
      await db.execute(
        'UPDATE radar_searches SET is_saved = 1 WHERE id = ?',
        [searchId],
      );
      await get().loadSearches();
    } catch {
      // Silently fail
    }
  },

  unsaveSearch: async (searchId: number) => {
    try {
      const db = getDatabase();
      await db.execute(
        'UPDATE radar_searches SET is_saved = 0 WHERE id = ?',
        [searchId],
      );
      await get().loadSearches();
    } catch {
      // Silently fail
    }
  },

  updateNotes: async (searchId: number, notes: string) => {
    try {
      const db = getDatabase();
      await db.execute(
        'UPDATE radar_searches SET notes = ? WHERE id = ?',
        [notes, searchId],
      );
    } catch {
      // Silently fail
    }
  },

  deleteSearch: async (searchId: number) => {
    try {
      const db = getDatabase();
      await db.execute('DELETE FROM radar_searches WHERE id = ?', [searchId]);
      await get().loadSearches();
    } catch {
      // Silently fail
    }
  },

  clearHistory: async () => {
    try {
      const db = getDatabase();
      await db.execute('DELETE FROM radar_searches WHERE is_saved = 0');
      await get().loadSearches();
    } catch {
      // Silently fail
    }
  },
}));
