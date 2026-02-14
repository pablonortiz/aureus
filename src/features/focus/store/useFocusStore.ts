import {create} from 'zustand';
import {getDatabase} from '../../../core/database';
import type {FocusTask, FocusSession} from '../../../core/types';

interface FocusState {
  tasks: FocusTask[];
  sessions: FocusSession[];
  currentSession: number;
  totalSessions: number;
  timerSeconds: number;
  isRunning: boolean;
  sessionDuration: number; // in minutes
  loading: boolean;
  loadTasks: () => Promise<void>;
  loadSessions: () => Promise<void>;
  addTask: (title: string) => Promise<void>;
  toggleTask: (id: number) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  completeSession: () => Promise<void>;
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
      tasks.push({...row, is_completed: !!row.is_completed});
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
      sessions.push({...row, completed: !!row.completed});
    }
    const completedCount = sessions.filter(s => s.completed).length;
    set({sessions, currentSession: completedCount + 1});
  },

  addTask: async (title) => {
    const db = getDatabase();
    await db.execute('INSERT INTO focus_tasks (title) VALUES (?)', [title]);
    await get().loadTasks();
  },

  toggleTask: async (id) => {
    const db = getDatabase();
    await db.execute(
      'UPDATE focus_tasks SET is_completed = CASE WHEN is_completed = 1 THEN 0 ELSE 1 END WHERE id = ?',
      [id],
    );
    await get().loadTasks();
  },

  deleteTask: async (id) => {
    const db = getDatabase();
    await db.execute('DELETE FROM focus_tasks WHERE id = ?', [id]);
    await get().loadTasks();
  },

  completeSession: async () => {
    const db = getDatabase();
    const {sessionDuration} = get();
    await db.execute(
      'INSERT INTO focus_sessions (duration_minutes, completed) VALUES (?, 1)',
      [sessionDuration],
    );
    await get().loadSessions();
    const {sessionDuration: dur} = get();
    set({timerSeconds: dur * 60, isRunning: false});
  },

  setTimerSeconds: (seconds) => set({timerSeconds: seconds}),
  setIsRunning: (running) => set({isRunning: running}),

  resetTimer: () => {
    const {sessionDuration} = get();
    set({timerSeconds: sessionDuration * 60, isRunning: false});
  },

  skipSession: () => {
    const {currentSession, totalSessions, sessionDuration} = get();
    if (currentSession < totalSessions) {
      set({
        currentSession: currentSession + 1,
        timerSeconds: sessionDuration * 60,
        isRunning: false,
      });
    }
  },

  loadSessionDuration: async () => {
    const db = getDatabase();
    const result = await db.execute(
      "SELECT value FROM app_settings WHERE key = 'focus_duration'",
    );
    if (result.rows.length > 0) {
      const minutes = parseInt(result.rows[0].value, 10);
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
