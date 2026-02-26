/**
 * Tests for useAppPin.ts
 *
 * Since we don't have @testing-library/react-hooks, we test the hook logic
 * by extracting the callback functions directly. The hook uses useCallback
 * which returns the same function reference, so we can test the async logic.
 *
 * We mock the database and test the core operations:
 * - loadPin, verifyPin, savePin, resetPin
 */

const mockExecute = jest.fn();

jest.mock('../../../core/database', () => ({
  getDatabase: () => ({
    execute: mockExecute,
    executeSync: jest.fn(),
    close: jest.fn(),
  }),
}));

// We need to test the hook logic. Since we can't use renderHook,
// we'll test the underlying logic by calling the functions with a
// minimal React mock.
let hookResult: any;

// Mock React hooks to capture the callbacks
const mockSetHasPin = jest.fn();
const mockSetLoading = jest.fn();

jest.mock('react', () => ({
  useState: jest.fn((initial: any) => {
    if (initial === false) return [false, mockSetHasPin];
    if (initial === true) return [true, mockSetLoading];
    return [initial, jest.fn()];
  }),
  useCallback: jest.fn((fn: any) => fn),
}));

import {useAppPin} from '../../hooks/useAppPin';

beforeEach(() => {
  jest.clearAllMocks();
  mockExecute.mockResolvedValue({rows: []});

  // Reset useState mocks
  const React = require('react');
  React.useState
    .mockImplementationOnce((_initial: boolean) => [false, mockSetHasPin])
    .mockImplementationOnce((_initial: boolean) => [true, mockSetLoading]);

  hookResult = useAppPin();
});

describe('useAppPin', () => {
  describe('loadPin', () => {
    it('sets hasPin to true when PIN exists in database', async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [{value: '1234'}],
      });

      await hookResult.loadPin();

      expect(mockSetLoading).toHaveBeenCalledWith(true);
      expect(mockSetHasPin).toHaveBeenCalledWith(true);
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });

    it('sets hasPin to false when no PIN exists', async () => {
      mockExecute.mockResolvedValueOnce({rows: []});

      await hookResult.loadPin();

      expect(mockSetHasPin).toHaveBeenCalledWith(false);
    });
  });

  describe('verifyPin', () => {
    it('returns true when PIN matches stored value', async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [{value: '5678'}],
      });

      const result = await hookResult.verifyPin('5678');
      expect(result).toBe(true);
    });

    it('returns false when PIN does not match', async () => {
      mockExecute.mockResolvedValueOnce({
        rows: [{value: '5678'}],
      });

      const result = await hookResult.verifyPin('0000');
      expect(result).toBe(false);
    });

    it('returns true when no PIN is set (no rows)', async () => {
      mockExecute.mockResolvedValueOnce({rows: []});

      const result = await hookResult.verifyPin('anything');
      expect(result).toBe(true);
    });

    it('returns false when database throws an error', async () => {
      mockExecute.mockRejectedValueOnce(new Error('DB error'));

      const result = await hookResult.verifyPin('1234');
      expect(result).toBe(false);
    });
  });

  describe('savePin', () => {
    it('inserts PIN into database and sets hasPin to true', async () => {
      mockExecute.mockResolvedValueOnce({rows: []});

      await hookResult.savePin('9999');

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE'),
        ['9999'],
      );
      expect(mockSetHasPin).toHaveBeenCalledWith(true);
    });
  });

  describe('resetPin', () => {
    it('deletes PIN from database and sets hasPin to false', async () => {
      mockExecute.mockResolvedValueOnce({rows: []});

      await hookResult.resetPin();

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM app_settings'),
      );
      expect(mockSetHasPin).toHaveBeenCalledWith(false);
    });
  });
});
