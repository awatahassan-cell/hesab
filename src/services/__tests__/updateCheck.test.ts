import { compareVersions } from '../updateCheck';

describe('compareVersions', () => {
  it('orders by each numeric segment', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0);
    expect(compareVersions('1.1.0', '1.0.9')).toBeGreaterThan(0);
    expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
  });

  it('does not compare segments as text', () => {
    // The bug this guards: "10" sorts before "9" as a string, so a string
    // comparison would never offer the 1.10.0 update to someone on 1.9.0.
    expect(compareVersions('1.9.0', '1.10.0')).toBeLessThan(0);
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
  });

  it('treats missing segments as zero', () => {
    expect(compareVersions('1.2', '1.2.0')).toBe(0);
    expect(compareVersions('1', '1.0.0')).toBe(0);
    expect(compareVersions('1.2', '1.2.1')).toBeLessThan(0);
  });

  it('is zero for the same version', () => {
    expect(compareVersions('3.4.5', '3.4.5')).toBe(0);
  });

  it('does not crash on malformed input', () => {
    expect(compareVersions('', '1.0.0')).toBeLessThan(0);
    expect(compareVersions('abc', '1.0.0')).toBeLessThan(0);
    expect(compareVersions('1.x.3', '1.0.3')).toBe(0);
  });
});
