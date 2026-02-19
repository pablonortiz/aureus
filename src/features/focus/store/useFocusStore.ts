import {create} from 'zustand';
import {getDatabase} from '../../../core/database';
import type {FocusTask, FocusSession} from '../../../core/types';
import {updateTasksWidget} from '../../tasks/services/widgetBridge';

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

interface FocusState {
  tasks: FocusTask[];
  sessions: FocusSession[];
  currentSession: number;
  totalSessions: number;
  timerSeconds: number;
  isRunning: boolean;
  sessionDuration: number; // in minutes
  isBreak: boolean;
  breakSeconds: number;
  breakDuration: number;
  loading: boolean;
  loadTasks: () => Promise<void>;
  loadSessions: () => Promise<void>;
  addTask: (title: string) => Promise<void>;
  addTaskFromModule: (taskId: number, title: string) => Promise<void>;
  toggleTask: (id: number) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  completeSession: () => Promise<void>;
  completeBreak: () => void;
  setTimerSeconds: (seconds: number) => void;
  setIsRunning: (running: boolean) => void;
  resetTimer: () => void;
  skipSession: () => void;
  setSessionDuration: (minutes: number) => Promise<void>;
  loadSessionDuration: () => Promise<void>;
}

export const useFocusStore = create<FocusState>((set, get) => ({
  tasks: [],
  sessions: [],
  currentSession: 1,
  totalSessions: 4,
  timerSeconds: 25 * 60,
  isRunning: false,
  sessionDuration: 25,
  isBreak: false,
  breakSeconds: 0,
  breakDuration: 0,
  loading: false,

  loadTasks: async () => {
    set({loading: true});
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const result = await db.execute(
      'SELECT * FROM focus_tasks WHERE date = ? ORDER BY created_at DESC',
      [today],
    );
    const tasks: FocusTask[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i];
      tasks.push({
        id: row.id as number,
        title: row.title as string,
        is_completed: !!row.is_completed,
        date: row.date as string,
        created_at: row.created_at as string,
        task_id: (row.task_id as number) || null,
      });
    }
    set({tasks, loading: false});
  },

  loadSessions: async () => {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const result = await db.execute(
      'SELECT * FROM focus_sessions WHERE date = ? ORDER BY created_at',
      [today],
    );
    const sessions: FocusSession[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i];
      sessions.push({...row, completed: !!row.completed} as FocusSession);
    }
    const completedCount = sessions.filter(s => s.completed).length;
    set({sessions, currentSession: completedCount + 1});
  },

  addTask: async (title) => {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];

    // Create in tasks module with medium priority
    const taskResult = await db.execute(
      `INSERT INTO tasks (title, title_normalized, priority, date, created_at, updated_at)
       VALUES (?, ?, 'medium', ?, ?, ?)`,
      [title, normalizeText(title), today, now, now],
    );
    const taskId = taskResult.insertId as number;

    // Create in focus_tasks with reference
    await db.execute(
      'INSERT INTO focus_tasks (title, task_id) VALUES (?, ?)',
      [title, taskId],
    );

    await get().loadTasks();
    updateTasksWidget();
  },

  addTaskFromModule: async (taskId, title) => {
    const db = getDatabase();
    await db.execute(
      'INSERT INTO focus_tasks (title, task_id) VALUES (?, ?)',
      [title, taskId],
    );
    await get().loadTasks();
  },

  toggleTask: async (id) => {
    const db = getDatabase();
    // Toggle focus_task
    await db.execute(
      'UPDATE focus_tasks SET is_completed = CASE WHEN is_completed = 1 THEN 0 ELSE 1 END WHERE id = ?',
      [id],
    );

    // Sync with tasks module if linked
    const linkedResult = await db.execute(
      'SELECT task_id, is_completed FROM focus_tasks WHERE id = ?',
      [id],
    );
    if (linkedResult.rows.length > 0 && linkedResult.rows[0].task_id) {
      const isCompleted = linkedResult.rows[0].is_completed;
      const now = new Date().toISOString().replace('T', ' ').split('.')[0];
      await db.execute(
        'UPDATE tasks SET is_completed = ?, completed_at = ?, updated_at = ? WHERE id = ?',
        [isCompleted, isCompleted ? now : null, now, linkedResult.rows[0].task_id],
      );
      updateTasksWidget();
    }

    await get().loadTasks();
  },

  deleteTask: async (id) => {
    const db = getDatabase();
    await db.execute('DELETE FROM focus_tasks WHERE id = ?', [id]);
    await get().loadTasks();
  },

  completeSession: async () => {
    const db = getDatabase();
    const {sessionDuration, currentSession} = get();
    await db.execute(
      'INSERT INTO focus_sessions (duration_minutes, completed) VALUES (?, 1)',
      [sessionDuration],
    );
    await get().loadSessions();

    // Calculate break duration
    const isLongBreak = currentSession % 4 === 0;
    const breakMin = isLongBreak
      ? Math.min(Math.round(sessionDuration * 0.6), 30)
      : Math.round(sessionDuration / 5);

    set({
      isBreak: true,
      breakSeconds: breakMin * 60,
      breakDuration: breakMin,
      isRunning: true, // auto-start break
    });
  },

  completeBreak: () => {
    const {sessionDuration} = get();
    set({
      isBreak: false,
      breakSeconds: 0,
      breakDuration: 0,
      timerSeconds: sessionDuration * 60,
      isRunning: false,
    });
  },

  setTimerSeconds: (seconds) => set({timerSeconds: seconds}),
  setIsRunning: (running) => set({isRunning: running}),

  resetTimer: () => {
    const {sessionDuration, isBreak} = get();
    if (isBreak) {
      // Reset break → go back to work
      set({
        isBreak: false,
        breakSeconds: 0,
        breakDuration: 0,
        timerSeconds: sessionDuration * 60,
        isRunning: false,
      });
    } else {
      set({timerSeconds: sessionDuration * 60, isRunning: false});
    }
  },

  skipSession: () => {
    const {isBreak} = get();
    if (isBreak) {
      // Skip break
      get().completeBreak();
    } else {
      const {currentSession, totalSessions, sessionDuration} = get();
      if (currentSession < totalSessions) {
        set({
          currentSession: currentSession + 1,
          timerSeconds: sessionDuration * 60,
          isRunning: false,
        });
      }
    }
  },

  loadSessionDuration: async () => {
    const db = getDatabase();
    const result = await db.execute(
      "SELECT value FROM app_settings WHERE key = 'focus_duration'",
    );
    if (result.rows.length > 0) {
      const minutes = parseInt(result.rows[0].value as string, 10);
      if (!isNaN(minutes) && minutes > 0) {
        set({sessionDuration: minutes, timerSeconds: minutes * 60});
      }
    }
  },

  setSessionDuration: async (minutes: number) => {
    const db = getDatabase();
    await db.execute(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('focus_duration', ?)",
      [String(minutes)],
    );
    set({sessionDuration: minutes, timerSeconds: minutes * 60, isRunning: false});
  },
}));
