/**
 * Tests for exchangeRateService.ts
 *
 * The service implements a 3-tier cache: memory -> DB -> API -> fallback (1200).
 * We need to reset module state between tests because the module uses
 * module-level variables (memoryRate, memoryTimestamp).
 */

const CACHE_TTL_MS = 30 * 60 * 1000; // must match source
const FALLBACK_RATE = 1200;

// We need a fresh mock DB for each test
let mockExecuteSync: jest.Mock;

beforeEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();

  mockExecuteSync = jest.fn().mockReturnValue({rows: []});

  jest.mock('../../../../core/database', () => ({
    getDatabase: () => ({
      executeSync: mockExecuteSync,
      execute: jest.fn(),
      close: jest.fn(),
    }),
  }));

  // Default: fetch fails (no API)
  global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
});

afterEach(() => {
  jest.restoreAllMocks();
});

function getService() {
  return require('../../services/exchangeRateService');
}

describe('exchangeRateService', () => {
  // ---- isFresh() is private but we can test it indirectly through getRate ----

  describe('getRate - memory cache (tier 1)', () => {
    it('returns memory-cached rate when fresh', async () => {
      // First call: no memory, no DB, API returns 1100
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({venta: 1100}),
      });

      const service = getService();
      const rate1 = await service.getRate();
      expect(rate1).toBe(1100);

      // Second call should return memory cache without fetching again
      global.fetch = jest.fn().mockRejectedValue(new Error('should not call'));
      const rate2 = await service.getRate();
      expect(rate2).toBe(1100);
    });

    it('does not use memory cache after TTL expires', async () => {
      // Setup: API returns 1100 first, then 1200 from fallback
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({venta: 1100}),
      });

      const service = getService();
      await service.getRate(); // populates memory with 1100

      // Expire the memory cache by moving time forward
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + CACHE_TTL_MS + 1000);

      // API now fails, DB empty -> fallback
      global.fetch = jest.fn().mockRejectedValue(new Error('fail'));
      // But stale memory rate should still be used as last resort before fallback
      const rate = await service.getRate();
      // Since memory rate exists but is stale, and DB is empty, and API fails,
      // the code will try stale memory as a last resort
      expect(rate).toBe(1100);
    });
  });

  describe('getRate - DB cache (tier 2)', () => {
    it('returns DB-cached rate when memory is empty and DB is fresh', async () => {
      const freshTimestamp = Date.now() - 1000; // 1 second ago, well within TTL
      mockExecuteSync
        .mockReturnValueOnce({rows: [{value: '1050'}]})  // rate query
        .mockReturnValueOnce({rows: [{value: String(freshTimestamp)}]});  // timestamp query

      const service = getService();
      const rate = await service.getRate();
      expect(rate).toBe(1050);
    });

    it('skips stale DB cache and fetches from API', async () => {
      const staleTimestamp = Date.now() - CACHE_TTL_MS - 60000; // expired
      mockExecuteSync
        .mockReturnValueOnce({rows: [{value: '900'}]})
        .mockReturnValueOnce({rows: [{value: String(staleTimestamp)}]});

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({venta: 1150}),
      });

      const service = getService();
      const rate = await service.getRate();
      expect(rate).toBe(1150);
    });

    it('falls back to stale DB cache when API fails', async () => {
      const staleTimestamp = Date.now() - CACHE_TTL_MS - 60000;
      mockExecuteSync
        .mockReturnValueOnce({rows: [{value: '900'}]})
        .mockReturnValueOnce({rows: [{value: String(staleTimestamp)}]});

      global.fetch = jest.fn().mockRejectedValue(new Error('Network down'));

      const service = getService();
      const rate = await service.getRate();
      // Should use stale DB cache as fallback
      expect(rate).toBe(900);
    });
  });

  describe('getRate - API fetch (tier 3)', () => {
    it('fetches from API when both memory and DB are empty', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({venta: 1180}),
      });

      const service = getService();
      const rate = await service.getRate();
      expect(rate).toBe(1180);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://dolarapi.com/v1/dolares/blue',
        expect.objectContaining({signal: expect.any(AbortSignal)}),
      );
    });

    it('saves API result to DB after successful fetch', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({venta: 1180}),
      });

      const service = getService();
      await service.getRate();

      // Should call executeSync to save rate and timestamp
      const saveCalls = mockExecuteSync.mock.calls.filter(
        (c: any[]) => c[0].includes('INSERT OR REPLACE'),
      );
      expect(saveCalls.length).toBe(2); // one for rate, one for timestamp
    });

    it('returns FALLBACK_RATE when all tiers fail', async () => {
      // No DB data, API fails
      global.fetch = jest.fn().mockRejectedValue(new Error('fail'));

      const service = getService();
      const rate = await service.getRate();
      expect(rate).toBe(FALLBACK_RATE);
    });

    it('handles API returning non-ok response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const service = getService();
      const rate = await service.getRate();
      expect(rate).toBe(FALLBACK_RATE);
    });

    it('handles API returning invalid JSON', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({venta: 'not-a-number'}),
      });

      const service = getService();
      const rate = await service.getRate();
      expect(rate).toBe(FALLBACK_RATE);
    });
  });

  describe('refresh', () => {
    it('force-fetches from API ignoring cache', async () => {
      // First populate memory cache
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({venta: 1100}),
      });

      const service = getService();
      await service.getRate(); // memory = 1100

      // Now refresh with new rate
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({venta: 1200}),
      });

      const rate = await service.refresh();
      expect(rate).toBe(1200);
    });
  });

  describe('getRateForDate', () => {
    it('returns rate from ArgentinaDatos for a valid date', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({venta: 1050}),
      });

      const service = getService();
      const rate = await service.getRateForDate('2025-01-15');
      expect(rate).toBe(1050);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.argentinadatos.com/v1/cotizaciones/dolares/blue/2025/01/15',
        expect.any(Object),
      );
    });

    it('falls back to Bluelytics when ArgentinaDatos fails', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation((url: string) => {
        callCount++;
        if (url.includes('argentinadatos')) {
          return Promise.reject(new Error('fail'));
        }
        // Bluelytics
        return Promise.resolve({
          ok: true,
          json: async () => ({blue: {value_sell: 1060}}),
        });
      });

      const service = getService();
      const rate = await service.getRateForDate('2025-01-15');
      expect(rate).toBe(1060);
    });

    it('falls back to getRate when date format is invalid', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({venta: 1100}),
      });

      const service = getService();
      const rate = await service.getRateForDate('invalid');
      // Should call getRate which fetches from API
      expect(rate).toBe(1100);
    });
  });
});
