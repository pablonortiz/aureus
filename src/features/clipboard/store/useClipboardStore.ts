import {create} from 'zustand';
import {getDatabase} from '../../../core/database';
import type {
  ClipboardLink,
  ClipboardFolder,
  ClipboardTag,
} from '../../../core/types';

interface ClipboardState {
  links: ClipboardLink[];
  folders: ClipboardFolder[];
  tags: ClipboardTag[];
  activeFolder: number | null;
  activeTags: number[];
  isPrivateMode: boolean;
  isVaultUnlocked: boolean;
  loading: boolean;

  loadFolders: () => Promise<void>;
  loadTags: () => Promise<void>;
  loadLinks: () => Promise<void>;

  addItem: (params: {
    title: string;
    type: 'link' | 'note';
    url?: string;
    content?: string;
    folderId?: number | null;
    tagIds?: number[];
    isPrivate?: boolean;
  }) => Promise<void>;
  updateItem: (params: {
    id: number;
    title: string;
    type: 'link' | 'note';
    url?: string;
    content?: string;
    folderId?: number | null;
    tagIds?: number[];
  }) => Promise<void>;
  deleteLink: (id: number) => Promise<void>;

  addFolder: (
    name: string,
    icon?: string,
    color?: string,
    isPrivate?: boolean,
  ) => Promise<void>;
  updateFolder: (
    id: number,
    name: string,
    icon?: string,
    color?: string,
  ) => Promise<void>;
  deleteFolder: (id: number) => Promise<void>;

  addTag: (name: string) => Promise<ClipboardTag | null>;
  deleteTag: (id: number) => Promise<void>;

  setActiveFolder: (id: number | null) => void;
  setActiveTags: (ids: number[]) => void;
  toggleTag: (tagId: number) => void;

  setPrivateMode: (mode: boolean) => void;
  unlockVault: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  lockVault: () => void;
}

export const useClipboardStore = create<ClipboardState>((set, get) => ({
  links: [],
  folders: [],
  tags: [],
  activeFolder: null,
  activeTags: [],
  isPrivateMode: false,
  isVaultUnlocked: false,
  loading: false,

  loadFolders: async () => {
    const db = getDatabase();
    const {isPrivateMode} = get();
    const result = await db.execute(
      `SELECT cf.*, COUNT(cl.id) as item_count
       FROM clipboard_folders cf
       LEFT JOIN clipboard_links cl ON cl.folder_id = cf.id
       WHERE cf.is_private = ?
       GROUP BY cf.id
       ORDER BY cf.name`,
      [isPrivateMode ? 1 : 0],
    );
    const folders: ClipboardFolder[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i];
      folders.push({
        id: row.id as number,
        name: row.name as string,
        icon: (row.icon as string) || null,
        color: (row.color as string) || null,
        is_private: !!row.is_private,
        created_at: row.created_at as string,
        item_count: (row.item_count as number) || 0,
      });
    }
    set({folders});
  },

  loadTags: async () => {
    const db = getDatabase();
    const {isPrivateMode} = get();
    const result = await db.execute(
      'SELECT * FROM clipboard_tags WHERE is_private = ? ORDER BY name',
      [isPrivateMode ? 1 : 0],
    );
    const tags: ClipboardTag[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i];
      tags.push({
        id: row.id as number,
        name: row.name as string,
        is_private: !!(row.is_private as number),
      });
    }
    set({tags});
  },

  loadLinks: async () => {
    set({loading: true});
    const db = getDatabase();
    const {activeFolder, activeTags, isPrivateMode} = get();

    let query = `
      SELECT cl.*, cf.name as folder_name
      FROM clipboard_links cl
      LEFT JOIN clipboard_folders cf ON cf.id = cl.folder_id
      WHERE cl.is_private = ?
    `;
    const params: any[] = [isPrivateMode ? 1 : 0];

    if (activeFolder !== null) {
      query += ' AND cl.folder_id = ?';
      params.push(activeFolder);
    }

    if (activeTags.length > 0) {
      const placeholders = activeTags.map(() => '?').join(',');
      query += ` AND cl.id IN (SELECT link_id FROM clipboard_link_tags WHERE tag_id IN (${placeholders}))`;
      params.push(...activeTags);
    }

    query += ' ORDER BY cl.created_at DESC';

    const result = await db.execute(query, params);
    const links: ClipboardLink[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i];
      links.push({
        id: row.id as number,
        title: row.title as string,
        url: row.url as string,
        type: (row.type as 'link' | 'note') || 'link',
        content: (row.content as string) || null,
        folder_id: (row.folder_id as number) || null,
        category_id: (row.category_id as number) || null,
        is_private: !!row.is_private,
        notes: (row.notes as string) || null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        folder_name: (row.folder_name as string) || undefined,
        category_name: (row.category_name as string) || undefined,
      });
    }

    // Load tags for each link
    for (const link of links) {
      const tagResult = await db.execute(
        `SELECT ct.* FROM clipboard_tags ct
         JOIN clipboard_link_tags clt ON clt.tag_id = ct.id
         WHERE clt.link_id = ?`,
        [link.id],
      );
      link.tags = [];
      for (let i = 0; i < tagResult.rows.length; i++) {
        const tagRow = tagResult.rows[i];
        link.tags.push({
          id: tagRow.id as number,
          name: tagRow.name as string,
          is_private: !!(tagRow.is_private as number),
        });
      }
    }

    set({links, loading: false});
  },

  addItem: async ({title, type, url, content, folderId, tagIds, isPrivate}) => {
    const db = getDatabase();
    const result = await db.execute(
      `INSERT INTO clipboard_links (title, url, type, content, folder_id, is_private)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        title,
        type === 'link' ? url || '' : '',
        type,
        type === 'note' ? content || '' : null,
        folderId ?? null,
        isPrivate ? 1 : 0,
      ],
    );

    const linkId = result.insertId;
    if (linkId && tagIds && tagIds.length > 0) {
      for (const tagId of tagIds) {
        await db.execute(
          'INSERT OR IGNORE INTO clipboard_link_tags (link_id, tag_id) VALUES (?, ?)',
          [linkId, tagId],
        );
      }
    }

    await get().loadLinks();
    await get().loadFolders();
  },

  updateItem: async ({id, title, type, url, content, folderId, tagIds}) => {
    const db = getDatabase();
    await db.execute(
      `UPDATE clipboard_links
       SET title = ?, url = ?, type = ?, content = ?, folder_id = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        title,
        type === 'link' ? url || '' : '',
        type,
        type === 'note' ? content || '' : null,
        folderId ?? null,
        id,
      ],
    );

    // Replace tags: delete old, insert new
    await db.execute('DELETE FROM clipboard_link_tags WHERE link_id = ?', [id]);
    if (tagIds && tagIds.length > 0) {
      for (const tagId of tagIds) {
        await db.execute(
          'INSERT OR IGNORE INTO clipboard_link_tags (link_id, tag_id) VALUES (?, ?)',
          [id, tagId],
        );
      }
    }

    await get().loadLinks();
    await get().loadFolders();
  },

  deleteLink: async (id) => {
    const db = getDatabase();
    await db.execute('DELETE FROM clipboard_links WHERE id = ?', [id]);
    await get().loadLinks();
    await get().loadFolders();
  },

  addFolder: async (name, icon, color, isPrivate) => {
    const db = getDatabase();
    await db.execute(
      'INSERT OR IGNORE INTO clipboard_folders (name, icon, color, is_private) VALUES (?, ?, ?, ?)',
      [name, icon || null, color || null, isPrivate ? 1 : 0],
    );
    await get().loadFolders();
  },

  updateFolder: async (id, name, icon, color) => {
    const db = getDatabase();
    await db.execute(
      'UPDATE clipboard_folders SET name = ?, icon = ?, color = ? WHERE id = ?',
      [name, icon || null, color || null, id],
    );
    await get().loadFolders();
  },

  deleteFolder: async (id) => {
    const db = getDatabase();
    // Move items to unfiled before deleting
    await db.execute(
      'UPDATE clipboard_links SET folder_id = NULL WHERE folder_id = ?',
      [id],
    );
    await db.execute('DELETE FROM clipboard_folders WHERE id = ?', [id]);
    await get().loadFolders();
    await get().loadLinks();
  },

  addTag: async (name) => {
    const db = getDatabase();
    const {isPrivateMode} = get();
    const trimmed = name.trim();
    if (!trimmed) return null;
    await db.execute(
      'INSERT OR IGNORE INTO clipboard_tags (name, is_private) VALUES (?, ?)',
      [trimmed, isPrivateMode ? 1 : 0],
    );
    const result = await db.execute(
      'SELECT * FROM clipboard_tags WHERE name = ? AND is_private = ?',
      [trimmed, isPrivateMode ? 1 : 0],
    );
    if (result.rows.length > 0) {
      await get().loadTags();
      const row = result.rows[0];
      return {
        id: row.id as number,
        name: row.name as string,
        is_private: !!(row.is_private as number),
      };
    }
    return null;
  },

  deleteTag: async (id) => {
    const db = getDatabase();
    await db.execute('DELETE FROM clipboard_tags WHERE id = ?', [id]);
    await get().loadTags();
    await get().loadLinks();
  },

  setActiveFolder: (id) => {
    set({activeFolder: id, activeTags: []});
    get().loadLinks();
  },

  setActiveTags: (ids) => {
    set({activeTags: ids});
    get().loadLinks();
  },

  toggleTag: (tagId) => {
    const {activeTags} = get();
    const newTags = activeTags.includes(tagId)
      ? activeTags.filter(id => id !== tagId)
      : [...activeTags, tagId];
    set({activeTags: newTags});
    get().loadLinks();
  },

  setPrivateMode: (mode) => {
    set({isPrivateMode: mode, activeFolder: null, activeTags: []});
    if (!mode) {
      set({isVaultUnlocked: false});
    }
    get().loadLinks();
    get().loadFolders();
  },

  unlockVault: async (pin) => {
    const db = getDatabase();
    const result = await db.execute(
      "SELECT value FROM app_settings WHERE key = 'app_pin'",
    );
    if (result.rows.length === 0) {
      await db.execute(
        "INSERT INTO app_settings (key, value) VALUES ('app_pin', ?)",
        [pin],
      );
      set({isVaultUnlocked: true});
      return true;
    }
    const storedPin = result.rows[0].value;
    if (storedPin === pin) {
      set({isVaultUnlocked: true});
      return true;
    }
    return false;
  },

  setPin: async (pin) => {
    const db = getDatabase();
    await db.execute(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('app_pin', ?)",
      [pin],
    );
  },

  lockVault: () => {
    set({isVaultUnlocked: false, isPrivateMode: false});
  },
}));
