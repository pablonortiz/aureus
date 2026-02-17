import {create} from 'zustand';
import {getDatabase} from '../../../core/database';
import type {SourceSearch, SourceResult} from '../../../core/types';
import {fetchTweet} from '../services/fxTwitterService';
import {searchImage} from '../services/sauceNaoService';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface SourceFinderState {
  searches: SourceSearch[];
  currentResults: SourceResult[];
  loading: boolean;
  searching: boolean;
  searchProgress: string;
  apiKey: string;

  loadSearches: () => Promise<void>;
  loadApiKey: () => Promise<void>;
  saveApiKey: (key: string) => Promise<void>;
  searchTweet: (url: string) => Promise<number>;
  loadResults: (searchId: number) => Promise<void>;
  deleteSearch: (id: number) => Promise<void>;
}

export const useSourceFinderStore = create<SourceFinderState>((set, get) => ({
  searches: [],
  currentResults: [],
  loading: false,
  searching: false,
  searchProgress: '',
  apiKey: '',

  loadApiKey: async () => {
    try {
      const db = getDatabase();
      const result = await db.execute(
        "SELECT value FROM app_settings WHERE key = 'saucenao_api_key'",
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
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('saucenao_api_key', ?)",
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
        'SELECT * FROM source_finder_searches ORDER BY created_at DESC',
      );
      const searches: SourceSearch[] = result.rows.map(row => ({
        id: row.id as number,
        tweet_url: row.tweet_url as string,
        tweet_id: row.tweet_id as string,
        tweet_text: row.tweet_text as string | null,
        tweet_author: row.tweet_author as string | null,
        tweet_author_avatar: row.tweet_author_avatar as string | null,
        image_count: row.image_count as number,
        created_at: row.created_at as string,
      }));
      set({searches, loading: false});
    } catch {
      set({loading: false});
    }
  },

  searchTweet: async (url: string) => {
    const {apiKey} = get();
    if (!apiKey) {
      throw new Error(
        'Configurá tu API key de SauceNAO primero (tocá el ícono ⚙️).',
      );
    }

    set({searching: true, searchProgress: 'Obteniendo tweet...'});

    try {
      const tweetData = await fetchTweet(url);
      const db = getDatabase();

      const insertResult = await db.execute(
        `INSERT INTO source_finder_searches (tweet_url, tweet_id, tweet_text, tweet_author, tweet_author_avatar, image_count)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          url,
          tweetData.tweetId,
          tweetData.text,
          tweetData.authorName,
          tweetData.authorAvatar,
          tweetData.photos.length,
        ],
      );

      const searchId = insertResult.insertId!;

      for (let i = 0; i < tweetData.photos.length; i++) {
        const photo = tweetData.photos[i];
        set({
          searchProgress: `Analizando imagen ${i + 1} de ${tweetData.photos.length}...`,
        });

        try {
          const results = await searchImage(photo.url, apiKey);

          for (const r of results) {
            await db.execute(
              `INSERT INTO source_finder_results (search_id, image_url, source_name, source_title, similarity, source_url, thumbnail_url, index_name, creators)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                searchId,
                photo.url,
                r.sourceName,
                r.sourceTitle,
                r.similarity,
                r.sourceUrl,
                r.thumbnailUrl,
                r.indexName,
                r.creators,
              ],
            );
          }
        } catch {
          // Skip this image's results on error
        }

        if (i < tweetData.photos.length - 1) {
          await delay(5000);
        }
      }

      set({searching: false, searchProgress: ''});
      await get().loadSearches();
      return searchId;
    } catch (error) {
      set({searching: false, searchProgress: ''});
      throw error;
    }
  },

  loadResults: async (searchId: number) => {
    try {
      const db = getDatabase();
      const result = await db.execute(
        'SELECT * FROM source_finder_results WHERE search_id = ? ORDER BY similarity DESC',
        [searchId],
      );
      const results: SourceResult[] = result.rows.map(row => ({
        id: row.id as number,
        search_id: row.search_id as number,
        image_url: row.image_url as string,
        source_name: row.source_name as string | null,
        source_title: row.source_title as string | null,
        similarity: row.similarity as number,
        source_url: row.source_url as string | null,
        thumbnail_url: row.thumbnail_url as string | null,
        index_name: row.index_name as string | null,
        creators: row.creators as string | null,
        created_at: row.created_at as string,
      }));
      set({currentResults: results});
    } catch {
      set({currentResults: []});
    }
  },

  deleteSearch: async (id: number) => {
    try {
      const db = getDatabase();
      await db.execute('DELETE FROM source_finder_searches WHERE id = ?', [id]);
      await get().loadSearches();
    } catch {
      // Silently fail
    }
  },
}));
