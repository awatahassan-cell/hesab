/**
 * A language file that is missing keys does not fail loudly — it silently
 * falls back, so a Turkish user sees a Kurdish sentence in the middle of a
 * Turkish screen. That bug shipped once. These tests make it a build failure.
 */
import { LANGUAGES, RTL_LANGUAGES, SUPPORTED_LANGUAGES } from '../index';

import en from '../en.json';
import ku from '../ku.json';
import ar from '../ar.json';
import fa from '../fa.json';
import tr from '../tr.json';
import ur from '../ur.json';
import es from '../es.json';
import pt from '../pt.json';
import fr from '../fr.json';
import id from '../id.json';
import ru from '../ru.json';

type Json = Record<string, unknown>;

const BUNDLES: Record<string, Json> = { ku, ar, en, fa, tr, ur, es, pt, fr, id, ru };

function flatten(obj: Json, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(out, flatten(value as Json, path));
    } else {
      out[path] = String(value);
    }
  }
  return out;
}

const EN = flatten(en as Json);
const EN_KEYS = Object.keys(EN).sort();

/** {{name}} placeholders, which must survive translation verbatim. */
function placeholders(text: string): string[] {
  return (text.match(/\{\{\s*[\w]+\s*\}\}/g) ?? []).map((p) => p.replace(/\s/g, '')).sort();
}

describe('translation bundles', () => {
  it('registers every bundle it ships', () => {
    expect(Object.keys(BUNDLES).sort()).toEqual([...SUPPORTED_LANGUAGES].sort());
    expect(LANGUAGES.map((l) => l.code).sort()).toEqual([...SUPPORTED_LANGUAGES].sort());
  });

  it('gives every language its own name in the picker', () => {
    const labels = LANGUAGES.map((l) => l.label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.every((l) => l.trim().length > 0)).toBe(true);
  });

  it('only marks languages it actually ships as RTL', () => {
    for (const lang of RTL_LANGUAGES) {
      expect(SUPPORTED_LANGUAGES).toContain(lang);
    }
  });

  for (const [lang, bundle] of Object.entries(BUNDLES)) {
    describe(lang, () => {
      const flat = flatten(bundle);

      it('has exactly the keys en.json has', () => {
        expect(Object.keys(flat).sort()).toEqual(EN_KEYS);
      });

      it('leaves no value empty', () => {
        const empty = Object.keys(flat).filter((k) => flat[k].trim() === '');
        expect(empty).toEqual([]);
      });

      it('keeps every interpolation placeholder', () => {
        const broken = EN_KEYS.filter(
          (k) => placeholders(flat[k] ?? '').join() !== placeholders(EN[k]).join()
        );
        expect(broken).toEqual([]);
      });
    });
  }
});
