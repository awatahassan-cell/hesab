import { assessBackup, STALE_AFTER_DAYS } from '../backupHealth';

const now = new Date(2026, 8, 9, 12);
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

describe('assessBackup', () => {
  it('reports never when nothing has been exported', () => {
    expect(assessBackup(null, now)).toEqual({ health: 'never', lastBackupAt: null, ageDays: null });
  });

  it('reports a recent backup as fresh', () => {
    expect(assessBackup(daysAgo(2), now)).toMatchObject({ health: 'fresh', ageDays: 2 });
  });

  it('counts today as zero days old', () => {
    expect(assessBackup(daysAgo(0), now)).toMatchObject({ health: 'fresh', ageDays: 0 });
  });

  it('turns stale exactly on the threshold', () => {
    expect(assessBackup(daysAgo(STALE_AFTER_DAYS - 1), now).health).toBe('fresh');
    expect(assessBackup(daysAgo(STALE_AFTER_DAYS), now).health).toBe('stale');
  });

  it('treats a corrupt timestamp as no backup rather than a fresh one', () => {
    // Reading it as fresh would silence the warning for someone with nothing.
    expect(assessBackup('not-a-date', now).health).toBe('never');
  });

  it('never reports a negative age when the clock has moved back', () => {
    expect(assessBackup(daysAgo(-3), now).ageDays).toBe(0);
  });
});
