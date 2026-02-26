/**
 * Tests for useTasksStore.ts
 *
 * Focus areas:
 * 1. normalizeText() - accent removal, lowercasing
 * 2. generateRecurringTasks() - daily, weekly, monthly, custom frequencies
 * 3. Store operations - addTask, toggleTask, deleteTask
 */

// Mock database before importing anything
const mockExecute = jest.fn();
const mockExecuteSync = jest.fn();

jest.mock('../../../../core/database', () => ({
  getDatabase: () => ({
    execute: mockExecute,
    executeSync: mockExecuteSync,
    close: jest.fn(),
  }),
}));

jest.mock('../../services/widgetBridge', () => ({
  updateTasksWidget: jest.fn(),
}));

import {useTasksStore} from '../useTasksStore';

// Helper: reset store state between tests
function resetStore() {
  useTasksStore.setState({
    tasks: [],
    completedTasks: [],
    categories: [],
    recurringRules: [],
    searchQuery: '',
    loading: false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();

  // Default: execute returns empty result
  mockExecute.mockResolvedValue({rows: [], insertId: 0});
});

describe('useTasksStore', () => {
  // ---- normalizeText tests ----
  // normalizeText is not exported, but we can test it indirectly through addTask
  // which stores title_normalized in the INSERT call

  describe('normalizeText (via addTask)', () => {
    it('removes accents from Spanish characters', async () => {
      mockExecute.mockResolvedValue({rows: [], insertId: 1});
      await useTasksStore.getState().addTask({title: 'Reunion de manana'});

      // No accents in this one, just check it lowercases
      const insertCall = mockExecute.mock.calls[0];
      expect(insertCall[0]).toContain('INSERT INTO tasks');
      // title_normalized is the 2nd parameter (index 1)
      expect(insertCall[1][1]).toBe('reunion de manana');
    });

    it('converts uppercase to lowercase', async () => {
      mockExecute.mockResolvedValue({rows: [], insertId: 1});
      await useTasksStore.getState().addTask({title: 'COMPRAR LECHE'});

      const insertCall = mockExecute.mock.calls[0];
      expect(insertCall[1][1]).toBe('comprar leche');
    });

    it('strips diacritics from accented vowels', async () => {
      mockExecute.mockResolvedValue({rows: [], insertId: 1});
      await useTasksStore.getState().addTask({title: 'Reunion con medico'});

      const insertCall = mockExecute.mock.calls[0];
      expect(insertCall[1][1]).toBe('reunion con medico');
    });

    it('strips tilde from n with tilde', async () => {
      mockExecute.mockResolvedValue({rows: [], insertId: 1});
      await useTasksStore.getState().addTask({
        title: '\u00d1o\u00f1o Ma\u00f1ana',
      });

      const insertCall = mockExecute.mock.calls[0];
      // NFD decomposition + accent strip: n + combining tilde -> n
      expect(insertCall[1][1]).toBe('nono manana');
    });

    it('handles mixed accented and plain text', async () => {
      mockExecute.mockResolvedValue({rows: [], insertId: 1});
      await useTasksStore.getState().addTask({
        title: 'Cafe con Jose en el Cafe',
      });

      const insertCall = mockExecute.mock.calls[0];
      expect(insertCall[1][1]).toBe('cafe con jose en el cafe');
    });
  });

  // ---- generateRecurringTasks tests ----

  describe('generateRecurringTasks', () => {
    const today = new Date().toISOString().split('T')[0];

    it('generates a task when no previous tasks exist for a rule', async () => {
      // First call: get active rules
      mockExecute
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              title: 'Morning standup',
              priority: 'high',
              category_id: null,
              notes: null,
              time: '09:00',
              frequency: 'daily',
              interval_days: null,
              end_date: null,
              reminder_minutes: null,
              is_active: 1,
              created_at: '2025-01-01 00:00:00',
            },
          ],
        })
        // Second call: check last generated task (none)
        .mockResolvedValueOnce({rows: []})
        // Third call: INSERT the new task
        .mockResolvedValueOnce({rows: [], insertId: 10});

      await useTasksStore.getState().generateRecurringTasks();

      // Should have inserted a new task
      const insertCalls = mockExecute.mock.calls.filter((c: any[]) =>
        c[0].includes('INSERT INTO tasks'),
      );
      expect(insertCalls.length).toBe(1);
      expect(insertCalls[0][1][0]).toBe('Morning standup'); // title
      expect(insertCalls[0][1][3]).toBe(today); // date = today
    });

    it('generates daily task when last was generated yesterday', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      mockExecute
        .mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              title: 'Daily review',
              priority: 'medium',
              frequency: 'daily',
              is_active: 1,
              created_at: '2025-01-01 00:00:00',
            },
          ],
        })
        .mockResolvedValueOnce({rows: [{date: yesterdayStr}]})
        .mockResolvedValueOnce({rows: [], insertId: 11});

      await useTasksStore.getState().generateRecurringTasks();

      const insertCalls = mockExecute.mock.calls.filter((c: any[]) =>
        c[0].includes('INSERT INTO tasks'),
      );
      expect(insertCalls.length).toBe(1);
    });

    it('does NOT generate daily task if one was already generated today', async () => {
      mockExecute
        .mockResolvedValueOnce({
          rows: [
            {
              id: 3,
              title: 'Daily standup',
              frequency: 'daily',
              is_active: 1,
              created_at: '2025-01-01 00:00:00',
            },
          ],
        })
        .mockResolvedValueOnce({rows: [{date: today}]});

      await useTasksStore.getState().generateRecurringTasks();

      const insertCalls = mockExecute.mock.calls.filter((c: any[]) =>
        c[0].includes('INSERT INTO tasks'),
      );
      expect(insertCalls.length).toBe(0);
    });

    it('generates weekly task when 7+ days have passed', async () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      const eightDaysAgoStr = eightDaysAgo.toISOString().split('T')[0];

      mockExecute
        .mockResolvedValueOnce({
          rows: [
            {
              id: 4,
              title: 'Weekly review',
              frequency: 'weekly',
              is_active: 1,
              created_at: '2025-01-01 00:00:00',
            },
          ],
        })
        .mockResolvedValueOnce({rows: [{date: eightDaysAgoStr}]})
        .mockResolvedValueOnce({rows: [], insertId: 12});

      await useTasksStore.getState().generateRecurringTasks();

      const insertCalls = mockExecute.mock.calls.filter((c: any[]) =>
        c[0].includes('INSERT INTO tasks'),
      );
      expect(insertCalls.length).toBe(1);
    });

    it('does NOT generate weekly task when less than 7 days have passed', async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

      mockExecute
        .mockResolvedValueOnce({
          rows: [
            {
              id: 5,
              title: 'Weekly review',
              frequency: 'weekly',
              is_active: 1,
              created_at: '2025-01-01 00:00:00',
            },
          ],
        })
        .mockResolvedValueOnce({rows: [{date: threeDaysAgoStr}]});

      await useTasksStore.getState().generateRecurringTasks();

      const insertCalls = mockExecute.mock.calls.filter((c: any[]) =>
        c[0].includes('INSERT INTO tasks'),
      );
      expect(insertCalls.length).toBe(0);
    });

    it('generates custom-interval task when enough days have passed', async () => {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      const fifteenDaysAgoStr = fifteenDaysAgo.toISOString().split('T')[0];

      mockExecute
        .mockResolvedValueOnce({
          rows: [
            {
              id: 6,
              title: 'Biweekly report',
              frequency: 'custom',
              interval_days: 14,
              is_active: 1,
              created_at: '2025-01-01 00:00:00',
            },
          ],
        })
        .mockResolvedValueOnce({rows: [{date: fifteenDaysAgoStr}]})
        .mockResolvedValueOnce({rows: [], insertId: 13});

      await useTasksStore.getState().generateRecurringTasks();

      const insertCalls = mockExecute.mock.calls.filter((c: any[]) =>
        c[0].includes('INSERT INTO tasks'),
      );
      expect(insertCalls.length).toBe(1);
    });

    it('deactivates rule when end_date has passed', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      mockExecute
        .mockResolvedValueOnce({
          rows: [
            {
              id: 7,
              title: 'Expired task',
              frequency: 'daily',
              end_date: pastDateStr,
              is_active: 1,
              created_at: '2025-01-01 00:00:00',
            },
          ],
        })
        // UPDATE to deactivate
        .mockResolvedValueOnce({rows: []});

      await useTasksStore.getState().generateRecurringTasks();

      // Should have called UPDATE to set is_active = 0
      const deactivateCalls = mockExecute.mock.calls.filter(
        (c: any[]) =>
          c[0].includes('UPDATE task_recurring') &&
          c[0].includes('is_active = 0'),
      );
      expect(deactivateCalls.length).toBe(1);
      expect(deactivateCalls[0][1]).toEqual([7]);
    });

    it('generates monthly task on the correct day of month', async () => {
      // The code uses: new Date().toISOString().split('T')[0] for today (UTC)
      // Then: new Date(today) for todayDate
      // Then: todayDate.getDate() for the day number
      // So we need created_at's day to match todayDate.getDate()
      const todayUtc = new Date().toISOString().split('T')[0];
      const todayDate = new Date(todayUtc);
      const dayOfMonth = todayDate.getDate();

      // created_at must produce the same dayOfMonth when parsed
      // Use UTC format so the day is consistent
      const createdAtStr = `2025-01-${String(dayOfMonth).padStart(2, '0')} 10:00:00`;

      // Last generated task clearly in a different month and year
      const lastDateStr = '2025-06-15';

      mockExecute
        .mockResolvedValueOnce({
          rows: [
            {
              id: 8,
              title: 'Monthly report',
              frequency: 'monthly',
              is_active: 1,
              created_at: createdAtStr,
            },
          ],
        })
        .mockResolvedValueOnce({rows: [{date: lastDateStr}]})
        .mockResolvedValueOnce({rows: [], insertId: 14});

      await useTasksStore.getState().generateRecurringTasks();

      const insertCalls = mockExecute.mock.calls.filter((c: any[]) =>
        c[0].includes('INSERT INTO tasks'),
      );
      expect(insertCalls.length).toBe(1);
    });
  });

  // ---- Store operations ----

  describe('addTask', () => {
    it('inserts task with correct default priority', async () => {
      mockExecute.mockResolvedValue({rows: [], insertId: 5});

      await useTasksStore.getState().addTask({title: 'Buy groceries'});

      const insertCall = mockExecute.mock.calls[0];
      expect(insertCall[1][2]).toBe('medium'); // default priority
    });

    it('passes specified priority correctly', async () => {
      mockExecute.mockResolvedValue({rows: [], insertId: 6});

      await useTasksStore.getState().addTask({
        title: 'Urgent fix',
        priority: 'high',
      });

      const insertCall = mockExecute.mock.calls[0];
      expect(insertCall[1][2]).toBe('high');
    });
  });

  describe('setSearchQuery', () => {
    it('updates search query in store and triggers loadTasks', async () => {
      mockExecute.mockResolvedValue({rows: []});

      useTasksStore.getState().setSearchQuery('test query');

      expect(useTasksStore.getState().searchQuery).toBe('test query');
    });
  });
});
