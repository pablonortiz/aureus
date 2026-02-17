import {create} from 'zustand';
import {getDatabase} from '../../../core/database';
import {vaultService} from '../services/vaultService';
import type {
  GalleryFolder,
  GalleryMedia,
  GalleryCategory,
} from '../../../core/types';
import type {Asset} from 'react-native-image-picker';

interface GalleryState {
  // Auth
  isUnlocked: boolean;
  hasPin: boolean;

  // Data
  folders: GalleryFolder[];
  media: GalleryMedia[];
  categories: GalleryCategory[];
  trashedMedia: GalleryMedia[];

  // UI state
  selectedIds: number[];
  selectionMode: boolean;
  currentFolderId: number | null;
  filterCategoryId: number | null;
  showFavoritesOnly: boolean;
  loading: boolean;

  // Actions - Auth
  checkPin: () => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;

  // Actions - Folders
  loadFolders: (parentId?: number | null) => Promise<void>;
  createFolder: (name: string, parentId?: number | null) => Promise<number>;
  renameFolder: (id: number, name: string) => Promise<void>;
  deleteFolder: (id: number) => Promise<void>;

  // Actions - Media
  loadMedia: (folderId?: number | null) => Promise<void>;
  importFromPicker: () => Promise<boolean>;
  importFromCamera: (assets: Asset[]) => Promise<void>;
  moveMedia: (mediaIds: number[], folderId: number | null) => Promise<void>;
  toggleFavorite: (id: number) => Promise<void>;
  updateNotes: (id: number, notes: string) => Promise<void>;
  trashMedia: (ids: number[]) => Promise<void>;
  restoreMedia: (ids: number[]) => Promise<void>;
  permanentDelete: (ids: number[]) => Promise<void>;
  exportMedia: (ids: number[]) => Promise<string[]>;

  // Actions - Categories
  loadCategories: () => Promise<void>;
  createCategory: (name: string, color: string, icon: string) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  assignCategories: (mediaId: number, categoryIds: number[]) => Promise<void>;

  // Actions - Selection
  toggleSelection: (id: number) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Actions - Trash
  loadTrash: () => Promise<void>;
  cleanupExpiredTrash: () => Promise<void>;
}

export const useGalleryStore = create<GalleryState>((set, get) => ({
  isUnlocked: false,
  hasPin: false,
  folders: [],
  media: [],
  categories: [],
  trashedMedia: [],
  selectedIds: [],
  selectionMode: false,
  currentFolderId: null,
  filterCategoryId: null,
  showFavoritesOnly: false,
  loading: false,

  checkPin: async () => {
    const db = getDatabase();
    const result = await db.execute(
      "SELECT value FROM app_settings WHERE key = 'app_pin'",
    );
    set({hasPin: result.rows.length > 0});
  },

  unlock: async (pin: string) => {
    const db = getDatabase();
    const result = await db.execute(
      "SELECT value FROM app_settings WHERE key = 'app_pin'",
    );
    if (result.rows.length === 0) {
      // No PIN set — save this as the new PIN
      await db.execute(
        "INSERT INTO app_settings (key, value) VALUES ('app_pin', ?)",
        [pin],
      );
      set({isUnlocked: true, hasPin: true});
      return true;
    }
    if (result.rows[0].value === pin) {
      set({isUnlocked: true});
      return true;
    }
    return false;
  },

  lock: () => {
    set({isUnlocked: false, selectedIds: [], selectionMode: false});
  },

  loadFolders: async (parentId) => {
    const db = getDatabase();
    const pid = parentId ?? null;
    let query: string;
    let params: any[];

    if (pid === null) {
      query = `
        SELECT gf.*, COUNT(gm.id) as media_count
        FROM gallery_folders gf
        LEFT JOIN gallery_media gm ON gm.folder_id = gf.id AND gm.trashed_at IS NULL
        WHERE gf.parent_id IS NULL
        GROUP BY gf.id
        ORDER BY gf.name
      `;
      params = [];
    } else {
      query = `
        SELECT gf.*, COUNT(gm.id) as media_count
        FROM gallery_folders gf
        LEFT JOIN gallery_media gm ON gm.folder_id = gf.id AND gm.trashed_at IS NULL
        WHERE gf.parent_id = ?
        GROUP BY gf.id
        ORDER BY gf.name
      `;
      params = [pid];
    }

    const result = await db.execute(query, params);
    const folders: GalleryFolder[] = [];
    for (const row of result.rows) {
      folders.push({
        id: row.id as number,
        name: row.name as string,
        parent_id: (row.parent_id as number) || null,
        cover_media_id: (row.cover_media_id as number) || null,
        created_at: row.created_at as string,
        media_count: (row.media_count as number) || 0,
      });
    }
    set({folders});
  },

  createFolder: async (name, parentId) => {
    const db = getDatabase();
    const result = await db.execute(
      'INSERT INTO gallery_folders (name, parent_id) VALUES (?, ?)',
      [name, parentId ?? null],
    );
    await get().loadFolders(parentId);
    return result.insertId as number;
  },

  renameFolder: async (id, name) => {
    const db = getDatabase();
    await db.execute('UPDATE gallery_folders SET name = ? WHERE id = ?', [
      name,
      id,
    ]);
    await get().loadFolders(get().currentFolderId);
  },

  deleteFolder: async (id) => {
    const db = getDatabase();
    // Move media to unfiled
    await db.execute(
      'UPDATE gallery_media SET folder_id = NULL WHERE folder_id = ?',
      [id],
    );
    await db.execute('DELETE FROM gallery_folders WHERE id = ?', [id]);
    await get().loadFolders(get().currentFolderId);
    await get().loadMedia(get().currentFolderId);
  },

  loadMedia: async (folderId) => {
    set({loading: true});
    const db = getDatabase();
    const {filterCategoryId, showFavoritesOnly} = get();
    const actualFolderId = folderId !== undefined ? folderId : get().currentFolderId;

    let query = `
      SELECT gm.* FROM gallery_media gm
      WHERE gm.trashed_at IS NULL
    `;
    const params: any[] = [];

    if (actualFolderId !== null && actualFolderId !== undefined) {
      query += ' AND gm.folder_id = ?';
      params.push(actualFolderId);
    }

    if (showFavoritesOnly) {
      query += ' AND gm.is_favorite = 1';
    }

    if (filterCategoryId !== null) {
      query +=
        ' AND gm.id IN (SELECT media_id FROM gallery_media_categories WHERE category_id = ?)';
      params.push(filterCategoryId);
    }

    query += ' ORDER BY gm.created_at DESC';

    const result = await db.execute(query, params);
    const media: GalleryMedia[] = [];
    for (const row of result.rows) {
      media.push({
        id: row.id as number,
        filename: row.filename as string,
        original_name: row.original_name as string,
        vault_path: row.vault_path as string,
        media_type: row.media_type as 'image' | 'video',
        file_size: (row.file_size as number) || 0,
        width: (row.width as number) || null,
        height: (row.height as number) || null,
        duration: (row.duration as number) || null,
        folder_id: (row.folder_id as number) || null,
        is_favorite: !!(row.is_favorite as number),
        notes: (row.notes as string) || null,
        trashed_at: null,
        created_at: row.created_at as string,
      });
    }
    set({media, loading: false, currentFolderId: actualFolderId ?? null});
  },

  importFromPicker: async () => {
    const db = getDatabase();
    const {currentFolderId} = get();

    // Native picker: opens file picker, copies to vault, deletes originals
    const files = await vaultService.pickAndImport();
    if (files.length === 0) return true;

    let allDeleted = true;
    for (const file of files) {
      if (!file.deleted) allDeleted = false;

      await db.execute(
        `INSERT INTO gallery_media
         (filename, original_name, vault_path, media_type, file_size, folder_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          file.filename,
          file.originalName,
          file.vaultPath,
          file.mediaType,
          file.fileSize,
          currentFolderId,
        ],
      );
    }

    await get().loadMedia();
    return allDeleted;
  },

  importFromCamera: async (assets) => {
    const db = getDatabase();
    const {currentFolderId} = get();

    for (const asset of assets) {
      if (!asset.uri) continue;

      const mediaType: 'image' | 'video' =
        asset.type?.startsWith('video') ? 'video' : 'image';
      const originalName =
        asset.fileName || `media_${Date.now()}.${mediaType === 'video' ? 'mp4' : 'jpg'}`;

      const {filename, vaultPath, fileSize} =
        await vaultService.importFromCamera(asset.uri, mediaType, originalName);

      await db.execute(
        `INSERT INTO gallery_media
         (filename, original_name, vault_path, media_type, file_size, width, height, duration, folder_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          filename,
          originalName,
          vaultPath,
          mediaType,
          fileSize,
          asset.width || null,
          asset.height || null,
          asset.duration ? Math.round(asset.duration) : null,
          currentFolderId,
        ],
      );
    }

    await get().loadMedia();
  },

  moveMedia: async (mediaIds, folderId) => {
    const db = getDatabase();
    const placeholders = mediaIds.map(() => '?').join(',');
    await db.execute(
      `UPDATE gallery_media SET folder_id = ? WHERE id IN (${placeholders})`,
      [folderId, ...mediaIds],
    );
    set({selectedIds: [], selectionMode: false});
    await get().loadMedia();
  },

  toggleFavorite: async (id) => {
    const db = getDatabase();
    await db.execute(
      'UPDATE gallery_media SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END WHERE id = ?',
      [id],
    );
    await get().loadMedia();
  },

  updateNotes: async (id, notes) => {
    const db = getDatabase();
    await db.execute('UPDATE gallery_media SET notes = ? WHERE id = ?', [
      notes,
      id,
    ]);
    await get().loadMedia();
  },

  trashMedia: async (ids) => {
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    await db.execute(
      `UPDATE gallery_media SET trashed_at = datetime('now') WHERE id IN (${placeholders})`,
      ids,
    );
    set({selectedIds: [], selectionMode: false});
    await get().loadMedia();
  },

  restoreMedia: async (ids) => {
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    await db.execute(
      `UPDATE gallery_media SET trashed_at = NULL WHERE id IN (${placeholders})`,
      ids,
    );
    await get().loadTrash();
  },

  permanentDelete: async (ids) => {
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    // Get vault paths to delete files
    const result = await db.execute(
      `SELECT vault_path FROM gallery_media WHERE id IN (${placeholders})`,
      ids,
    );
    const paths = result.rows.map(r => r.vault_path as string);
    await vaultService.cleanupFiles(paths);
    await db.execute(
      `DELETE FROM gallery_media WHERE id IN (${placeholders})`,
      ids,
    );
    await get().loadTrash();
  },

  exportMedia: async (ids) => {
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    const result = await db.execute(
      `SELECT vault_path, original_name FROM gallery_media WHERE id IN (${placeholders})`,
      ids,
    );
    const exportedPaths: string[] = [];
    for (const row of result.rows) {
      const path = await vaultService.exportFile(
        row.vault_path as string,
        row.original_name as string,
      );
      exportedPaths.push(path);
    }
    set({selectedIds: [], selectionMode: false});
    return exportedPaths;
  },

  loadCategories: async () => {
    const db = getDatabase();
    const result = await db.execute(
      'SELECT * FROM gallery_categories ORDER BY name',
    );
    const categories: GalleryCategory[] = [];
    for (const row of result.rows) {
      categories.push({
        id: row.id as number,
        name: row.name as string,
        color: (row.color as string) || null,
        icon: (row.icon as string) || null,
        created_at: row.created_at as string,
      });
    }
    set({categories});
  },

  createCategory: async (name, color, icon) => {
    const db = getDatabase();
    await db.execute(
      'INSERT OR IGNORE INTO gallery_categories (name, color, icon) VALUES (?, ?, ?)',
      [name, color, icon],
    );
    await get().loadCategories();
  },

  deleteCategory: async (id) => {
    const db = getDatabase();
    await db.execute('DELETE FROM gallery_categories WHERE id = ?', [id]);
    await get().loadCategories();
  },

  assignCategories: async (mediaId, categoryIds) => {
    const db = getDatabase();
    await db.execute(
      'DELETE FROM gallery_media_categories WHERE media_id = ?',
      [mediaId],
    );
    for (const catId of categoryIds) {
      await db.execute(
        'INSERT OR IGNORE INTO gallery_media_categories (media_id, category_id) VALUES (?, ?)',
        [mediaId, catId],
      );
    }
    await get().loadMedia();
  },

  toggleSelection: (id) => {
    const {selectedIds} = get();
    const newIds = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    set({selectedIds: newIds, selectionMode: newIds.length > 0});
  },

  selectAll: () => {
    const {media} = get();
    set({selectedIds: media.map(m => m.id), selectionMode: true});
  },

  clearSelection: () => {
    set({selectedIds: [], selectionMode: false});
  },

  loadTrash: async () => {
    const db = getDatabase();
    const result = await db.execute(
      'SELECT * FROM gallery_media WHERE trashed_at IS NOT NULL ORDER BY trashed_at DESC',
    );
    const trashedMedia: GalleryMedia[] = [];
    for (const row of result.rows) {
      trashedMedia.push({
        id: row.id as number,
        filename: row.filename as string,
        original_name: row.original_name as string,
        vault_path: row.vault_path as string,
        media_type: row.media_type as 'image' | 'video',
        file_size: (row.file_size as number) || 0,
        width: (row.width as number) || null,
        height: (row.height as number) || null,
        duration: (row.duration as number) || null,
        folder_id: (row.folder_id as number) || null,
        is_favorite: !!(row.is_favorite as number),
        notes: (row.notes as string) || null,
        trashed_at: row.trashed_at as string,
        created_at: row.created_at as string,
      });
    }
    set({trashedMedia});
  },

  cleanupExpiredTrash: async () => {
    const db = getDatabase();
    const expired = await db.execute(
      "SELECT id, vault_path FROM gallery_media WHERE trashed_at IS NOT NULL AND datetime(trashed_at, '+30 days') < datetime('now')",
    );
    if (expired.rows.length > 0) {
      const paths = expired.rows.map(r => r.vault_path as string);
      await vaultService.cleanupFiles(paths);
      await db.execute(
        "DELETE FROM gallery_media WHERE trashed_at IS NOT NULL AND datetime(trashed_at, '+30 days') < datetime('now')",
      );
    }
  },
}));
