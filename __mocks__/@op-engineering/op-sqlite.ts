const mockDb = {
  execute: jest.fn().mockResolvedValue({ rows: [], insertId: 0 }),
  executeSync: jest.fn().mockReturnValue({ rows: [], insertId: 0 }),
  close: jest.fn(),
};

export function open(_opts: any) {
  return mockDb;
}

export type DB = typeof mockDb;
