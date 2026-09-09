import { parseBackup, TABLES, BACKUP_FORMAT_VERSION } from '../backupFormat';

const v2 = (overrides: Record<string, unknown> = {}) => ({
  format: BACKUP_FORMAT_VERSION,
  schema_version: 3,
  app: 'hesab',
  exported_at: '2026-09-09T10:00:00.000Z',
  counts: {},
  data: {
    accounts: [{ id: 'a1', name: 'جزدان', currency: 'IQD' }],
    transactions: [{ id: 't1', amount: 25000, currency: 'IQD' }],
    reminders: [{ id: 'r1', title: 'کارەبا', amount: 45000 }],
    savings_goals: [{ id: 'g1', title: 'ئۆتۆمبێل', target_amount: 8000 }]
  },
  ...overrides
});

describe('parseBackup', () => {
  it('reads a current backup', () => {
    const { payload, problem } = parseBackup(JSON.stringify(v2()));
    expect(problem).toBeUndefined();
    expect(payload?.data.accounts).toHaveLength(1);
    expect(payload?.data.transactions).toHaveLength(1);
  });

  it('carries every table the app owns, even the empty ones', () => {
    const { payload } = parseBackup(JSON.stringify(v2()));
    for (const table of TABLES) {
      expect(Array.isArray(payload?.data[table])).toBe(true);
    }
  });

  it('keeps reminders and savings goals', () => {
    // The bug this guards: the first backup format saved eight of the ten
    // tables, so restoring wiped every reminder and savings goal.
    const { payload } = parseBackup(JSON.stringify(v2()));
    expect(payload?.data.reminders).toHaveLength(1);
    expect(payload?.data.savings_goals).toHaveLength(1);
    expect(TABLES).toContain('reminders');
    expect(TABLES).toContain('savings_goals');
  });

  it('still reads the old format, where tables sat at the top level', () => {
    const legacy = {
      version: 1,
      exported_at: '2026-01-01T00:00:00.000Z',
      accounts: [{ id: 'a1', name: 'Cash' }],
      transactions: [{ id: 't1', amount: 10 }],
      shoppingTrips: [{ id: 's1', name: 'Market' }]
    };
    const { payload, problem } = parseBackup(JSON.stringify(legacy));
    expect(problem).toBeUndefined();
    expect(payload?.data.accounts).toHaveLength(1);
    // camelCase key in the old file maps onto the snake_case table
    expect(payload?.data.shopping_trips).toHaveLength(1);
    // tables the old format never saved come back empty rather than undefined
    expect(payload?.data.reminders).toEqual([]);
  });

  it('rejects a file that is not JSON', () => {
    expect(parseBackup('not json at all').problem).toBe('unreadable');
  });

  it('rejects JSON that is not a backup', () => {
    expect(parseBackup('{"hello":"world"}').problem).toBe('not-a-hesab-backup');
    expect(parseBackup('[]').problem).toBe('not-a-hesab-backup');
    expect(parseBackup('null').problem).toBe('not-a-hesab-backup');
  });

  it('refuses a backup written by a newer app', () => {
    // Restoring a newer schema with older code would drop columns this build
    // does not know about, so it stops instead of guessing.
    const { problem } = parseBackup(JSON.stringify(v2({ schema_version: 99 })), 3);
    expect(problem).toBe('from-newer-app');
  });

  it('treats a missing table as empty rather than failing', () => {
    const partial = v2();
    delete (partial.data as Record<string, unknown>).transactions;
    const { payload, problem } = parseBackup(JSON.stringify(partial));
    expect(problem).toBeUndefined();
    expect(payload?.data.transactions).toEqual([]);
  });

  it('counts what it parsed', () => {
    const { payload } = parseBackup(JSON.stringify(v2()));
    expect(payload?.counts.accounts).toBe(1);
    expect(payload?.counts.budgets).toBe(0);
  });
});
