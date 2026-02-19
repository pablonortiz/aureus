import {create} from 'zustand';
import {getDatabase} from '../../../core/database';
import type {Task, TaskCategory, TaskRecurring} from '../../../core/types';
import {updateTasksWidget} from '../services/widgetBridge';

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

interface TasksState {
  tasks: Task[];
  completedTasks: Task[];
  categories: TaskCategory[];
  recurringRules: TaskRecurring[];
  searchQuery: string;
  loading: boolean;
  loadTasks: () => Promise<void>;
  loadCompletedTasks: () => Promise<void>;
  loadCategories: () => Promise<void>;
  loadRecurringRules: () => Promise<void>;
  addTask: (task: {
    title: string;
    priority?: 'high' | 'medium' | 'low';
    date?: string | null;
    time?: string | null;
    category_id?: number | null;
    notes?: string | null;
    reminder_minutes?: number | null;
  }) => Promise<number>;
  updateTask: (
    id: number,
    task: {
      title?: string;
      priority?: 'high' | 'medium' | 'low';
      date?: string | null;
      time?: string | null;
      category_id?: number | null;
      notes?: string | null;
      reminder_minutes?: number | null;
      notification_id?: string | null;
    },
  ) => Promise<void>;
  toggleTask: (id: number) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  markAllTodayDone: () => Promise<void>;
  addCategory: (name: string, color: string, icon?: string) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  addRecurring: (rule: {
    title: string;
    priority?: 'high' | 'medium' | 'low';
    category_id?: number | null;
    notes?: string | null;
    time?: string | null;
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval_days?: number | null;
    end_date?: string | null;
    reminder_minutes?: number | null;
  }) => Promise<void>;
  deleteRecurring: (id: number) => Promise<void>;
  generateRecurringTasks: () => Promise<void>;
  setSearchQuery: (query: string) => void;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  completedTasks: [],
  categories: [],
  recurringRules: [],
  searchQuery: '',
  loading: false,

  loadTasks: async () => {
    set({loading: true});
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const {searchQuery} = get();

    let sql = `
      SELECT t.*, tc.name as cat_name, tc.color as cat_color, tc.icon as cat_icon
      FROM tasks t
      LEFT JOIN task_categories tc ON t.category_id = tc.id
      WHERE t.is_completed = 0
        AND (t.date IS NULL OR t.date <= ?)
    `;
    const params: any[] = [today];

    if (searchQuery.trim()) {
      sql += ' AND t.title_normalized LIKE ?';
      params.push(`%${normalizeText(searchQuery)}%`);
    }

    sql += `
      ORDER BY
        CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 END,
        t.date ASC NULLS LAST,
        t.created_at DESC
    `;

    const result = await db.execute(sql, params);
    const tasks: Task[] = [];
    for (const row of result.rows) {
      tasks.push({
        id: row.id as number,
        title: row.title as string,
        title_normalized: (row.title_normalized as string) || null,
        priority: (row.priority as Task['priority']) || 'medium',
        date: (row.date as string) || null,
        time: (row.time as string) || null,
        category_id: (row.category_id as number) || null,
        notes: (row.notes as string) || null,
        is_completed: !!row.is_completed,
        completed_at: (row.completed_at as string) || null,
        recurring_id: (row.recurring_id as number) || null,
        reminder_minutes: (row.reminder_minutes as number) ?? null,
        notification_id: (row.notification_id as string) || null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        category: row.cat_name
          ? {
              id: row.category_id as number,
              name: row.cat_name as string,
              color: row.cat_color as string,
              icon: (row.cat_icon as string) || null,
              is_default: false,
              created_at: '',
            }
          : undefined,
      });
    }
    set({tasks, loading: false});
  },

  loadCompletedTasks: async () => {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];

    const result = await db.execute(
      `SELECT t.*, tc.name as cat_name, tc.color as cat_color, tc.icon as cat_icon
       FROM tasks t
       LEFT JOIN task_categories tc ON t.category_id = tc.id
       WHERE t.is_completed = 1 AND t.completed_at >= ?
       ORDER BY t.completed_at DESC`,
      [today],
    );
    const completedTasks: Task[] = [];
    for (const row of result.rows) {
      completedTasks.push({
        id: row.id as number,
        title: row.title as string,
        title_normalized: (row.title_normalized as string) || null,
        priority: (row.priority as Task['priority']) || 'medium',
        date: (row.date as string) || null,
        time: (row.time as string) || null,
        category_id: (row.category_id as number) || null,
        notes: (row.notes as string) || null,
        is_completed: true,
        completed_at: (row.completed_at as string) || null,
        recurring_id: (row.recurring_id as number) || null,
        reminder_minutes: (row.reminder_minutes as number) ?? null,
        notification_id: (row.notification_id as string) || null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        category: row.cat_name
          ? {
              id: row.category_id as number,
              name: row.cat_name as string,
              color: row.cat_color as string,
              icon: (row.cat_icon as string) || null,
              is_default: false,
              created_at: '',
            }
          : undefined,
      });
    }
    set({completedTasks});
  },

  loadCategories: async () => {
    const db = getDatabase();
    const result = await db.execute(
      'SELECT * FROM task_categories ORDER BY is_default DESC, name ASC',
    );
    const categories: TaskCategory[] = [];
    for (const row of result.rows) {
      categories.push({
        id: row.id as number,
        name: row.name as string,
        color: row.color as string,
        icon: (row.icon as string) || null,
        is_default: !!row.is_default,
        created_at: row.created_at as string,
      });
    }
    set({categories});
  },

  loadRecurringRules: async () => {
    const db = getDatabase();
    const result = await db.execute(
      `SELECT tr.*, tc.name as cat_name, tc.color as cat_color, tc.icon as cat_icon
       FROM task_recurring tr
       LEFT JOIN task_categories tc ON tr.category_id = tc.id
       WHERE tr.is_active = 1
       ORDER BY tr.created_at DESC`,
    );
    const recurringRules: TaskRecurring[] = [];
    for (const row of result.rows) {
      recurringRules.push({
        id: row.id as number,
        title: row.title as string,
        priority: (row.priority as TaskRecurring['priority']) || 'medium',
        category_id: (row.category_id as number) || null,
        notes: (row.notes as string) || null,
        time: (row.time as string) || null,
        frequency: row.frequency as TaskRecurring['frequency'],
        interval_days: (row.interval_days as number) || null,
        end_date: (row.end_date as string) || null,
        reminder_minutes: (row.reminder_minutes as number) ?? null,
        is_active: !!row.is_active,
        created_at: row.created_at as string,
        category: row.cat_name
          ? {
              id: row.category_id as number,
              name: row.cat_name as string,
              color: row.cat_color as string,
              icon: (row.cat_icon as string) || null,
              is_default: false,
              created_at: '',
            }
          : undefined,
      });
    }
    set({recurringRules});
  },

  addTask: async (task) => {
    const db = getDatabase();
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];
    const titleNormalized = normalizeText(task.title);
    const result = await db.execute(
      `INSERT INTO tasks (title, title_normalized, priority, date, time, category_id, notes, reminder_minutes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.title,
        titleNormalized,
        task.priority || 'medium',
        task.date || null,
        task.time || null,
        task.category_id || null,
        task.notes || null,
        task.reminder_minutes ?? null,
        now,
        now,
      ],
    );
    const taskId = result.insertId as number;
    await get().loadTasks();
    await get().loadCompletedTasks();
    updateTasksWidget();
    return taskId;
  },

  updateTask: async (id, task) => {
    const db = getDatabase();
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [now];

    if (task.title !== undefined) {
      sets.push('title = ?', 'title_normalized = ?');
      params.push(task.title, normalizeText(task.title));
    }
    if (task.priority !== undefined) {
      sets.push('priority = ?');
      params.push(task.priority);
    }
    if (task.date !== undefined) {
      sets.push('date = ?');
      params.push(task.date);
    }
    if (task.time !== undefined) {
      sets.push('time = ?');
      params.push(task.time);
    }
    if (task.category_id !== undefined) {
      sets.push('category_id = ?');
      params.push(task.category_id);
    }
    if (task.notes !== undefined) {
      sets.push('notes = ?');
      params.push(task.notes);
    }
    if (task.reminder_minutes !== undefined) {
      sets.push('reminder_minutes = ?');
      params.push(task.reminder_minutes);
    }
    if (task.notification_id !== undefined) {
      sets.push('notification_id = ?');
      params.push(task.notification_id);
    }

    params.push(id);
    await db.execute(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, params);
    await get().loadTasks();
    await get().loadCompletedTasks();
    updateTasksWidget();
  },

  toggleTask: async (id) => {
    const db = getDatabase();
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];

    const current = await db.execute(
      'SELECT is_completed FROM tasks WHERE id = ?',
      [id],
    );
    if (current.rows.length === 0) return;

    const wasCompleted = !!current.rows[0].is_completed;
    await db.execute(
      'UPDATE tasks SET is_completed = ?, completed_at = ?, updated_at = ? WHERE id = ?',
      [wasCompleted ? 0 : 1, wasCompleted ? null : now, now, id],
    );

    await get().loadTasks();
    await get().loadCompletedTasks();
    updateTasksWidget();
  },

  deleteTask: async (id) => {
    const db = getDatabase();
    await db.execute('DELETE FROM tasks WHERE id = ?', [id]);
    await get().loadTasks();
    await get().loadCompletedTasks();
    updateTasksWidget();
  },

  markAllTodayDone: async () => {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];

    await db.execute(
      `UPDATE tasks SET is_completed = 1, completed_at = ?, updated_at = ?
       WHERE is_completed = 0 AND (date IS NULL OR date <= ?)`,
      [now, now, today],
    );

    await get().loadTasks();
    await get().loadCompletedTasks();
    updateTasksWidget();
  },

  addCategory: async (name, color, icon) => {
    const db = getDatabase();
    await db.execute(
      'INSERT INTO task_categories (name, color, icon) VALUES (?, ?, ?)',
      [name, color, icon || null],
    );
    await get().loadCategories();
  },

  deleteCategory: async (id) => {
    const db = getDatabase();
    await db.execute('DELETE FROM task_categories WHERE id = ? AND is_default = 0', [id]);
    await get().loadCategories();
  },

  addRecurring: async (rule) => {
    const db = getDatabase();
    await db.execute(
      `INSERT INTO task_recurring (title, priority, category_id, notes, time, frequency, interval_days, end_date, reminder_minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rule.title,
        rule.priority || 'medium',
        rule.category_id || null,
        rule.notes || null,
        rule.time || null,
        rule.frequency,
        rule.interval_days || null,
        rule.end_date || null,
        rule.reminder_minutes ?? null,
      ],
    );
    await get().loadRecurringRules();
  },

  deleteRecurring: async (id) => {
    const db = getDatabase();
    await db.execute('UPDATE task_recurring SET is_active = 0 WHERE id = ?', [id]);
    await get().loadRecurringRules();
  },

  generateRecurringTasks: async () => {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];
    const todayDate = new Date(today);

    const rules = await db.execute(
      'SELECT * FROM task_recurring WHERE is_active = 1',
    );

    for (const rule of rules.rows) {
      const ruleId = rule.id as number;

      // Check if end_date has passed
      if (rule.end_date && (rule.end_date as string) < today) {
        await db.execute(
          'UPDATE task_recurring SET is_active = 0 WHERE id = ?',
          [ruleId],
        );
        continue;
      }

      // Find last generated task for this rule
      const lastTask = await db.execute(
        'SELECT date FROM tasks WHERE recurring_id = ? ORDER BY created_at DESC LIMIT 1',
        [ruleId],
      );

      let shouldGenerate = false;
      const frequency = rule.frequency as string;

      if (lastTask.rows.length === 0) {
        // Never generated — generate today
        shouldGenerate = true;
      } else {
        const lastDate = new Date((lastTask.rows[0].date as string) || today);

        if (frequency === 'daily') {
          shouldGenerate = lastDate.toISOString().split('T')[0] < today;
        } else if (frequency === 'weekly') {
          const diffDays = Math.floor(
            (todayDate.getTime() - lastDate.getTime()) / 86400000,
          );
          shouldGenerate = diffDays >= 7;
        } else if (frequency === 'monthly') {
          const ruleCreatedAt = new Date(
            (rule.created_at as string).replace(' ', 'T'),
          );
          const dayOfMonth = ruleCreatedAt.getDate();
          shouldGenerate =
            todayDate.getDate() === dayOfMonth &&
            (lastDate.getMonth() !== todayDate.getMonth() ||
              lastDate.getFullYear() !== todayDate.getFullYear());
        } else if (frequency === 'custom') {
          const intervalDays = (rule.interval_days as number) || 1;
          const diffDays = Math.floor(
            (todayDate.getTime() - lastDate.getTime()) / 86400000,
          );
          shouldGenerate = diffDays >= intervalDays;
        }
      }

      if (shouldGenerate) {
        const titleNormalized = normalizeText(rule.title as string);
        await db.execute(
          `INSERT INTO tasks (title, title_normalized, priority, date, time, category_id, notes, recurring_id, reminder_minutes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            rule.title,
            titleNormalized,
            rule.priority || 'medium',
            today,
            rule.time || null,
            rule.category_id || null,
            rule.notes || null,
            ruleId,
            rule.reminder_minutes ?? null,
            now,
            now,
          ],
        );
      }
    }

    updateTasksWidget();
  },

  setSearchQuery: (query) => {
    set({searchQuery: query});
    get().loadTasks();
  },
}));
