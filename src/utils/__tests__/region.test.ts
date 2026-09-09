/**
 * Detection picks the defaults on a first launch. Getting it wrong shows an
 * Iraqi dinar to someone in Brazil, so the mapping is worth pinning down.
 */
import {
  COUNTRIES_CURRENCIES,
  getCountryLanguages,
  getReferenceCurrency
} from '../currencyData';
import { SUPPORTED_LANGUAGES } from '../../i18n';

describe('country metadata', () => {
  it('offers only languages the app actually ships', () => {
    for (const c of COUNTRIES_CURRENCIES) {
      for (const lang of c.languages) {
        expect(SUPPORTED_LANGUAGES).toContain(lang);
      }
    }
  });

  it('always offers English as a fallback everyone can read', () => {
    for (const c of COUNTRIES_CURRENCIES) {
      expect(getCountryLanguages(c.countryCode)).toContain('en');
    }
  });

  it('names at least one language per country', () => {
    for (const c of COUNTRIES_CURRENCIES) {
      expect(c.languages.length).toBeGreaterThan(0);
    }
  });

  it('never pairs a currency with itself', () => {
    for (const c of COUNTRIES_CURRENCIES) {
      expect(getReferenceCurrency(c.countryCode)).not.toBe(c.currencyCode);
    }
  });

  it('references a currency the rate table knows', () => {
    const known = COUNTRIES_CURRENCIES.map((c) => c.currencyCode);
    for (const c of COUNTRIES_CURRENCIES) {
      expect(known).toContain(getReferenceCurrency(c.countryCode));
    }
  });

  it('falls back to the dollar for a country it does not know', () => {
    expect(getReferenceCurrency('ZZ')).toBe('USD');
    expect(getCountryLanguages('ZZ')).toEqual(['en']);
  });

  it('matches the examples the app promises', () => {
    // Iraq: Kurdish, Arabic and English, dinar against the dollar.
    expect(getCountryLanguages('IQ')).toEqual(['ku', 'ar', 'en']);
    expect(getReferenceCurrency('IQ')).toBe('USD');
    // Türkiye: Turkish, Arabic and English, lira against the dollar.
    expect(getCountryLanguages('TR')).toEqual(['tr', 'ar', 'en']);
    expect(getReferenceCurrency('TR')).toBe('USD');
  });
});

jest.mock('expo-localization', () => ({ getLocales: () => mockLocales }));

let mockLocales: any[] = [];

describe('pickLanguage', () => {
  const { pickLanguage } = require('../region');

  it('prefers the phone language when the country reads it', () => {
    expect(pickLanguage('IQ', ['ar'])).toBe('ar');
    expect(pickLanguage('TR', ['tr'])).toBe('tr');
  });

  it('honours the order the phone lists its languages in', () => {
    expect(pickLanguage('IQ', ['en', 'ku'])).toBe('en');
    expect(pickLanguage('IQ', ['ku', 'en'])).toBe('ku');
  });

  it('keeps a shipped phone language even where the country does not read it', () => {
    // A Turkish speaker living in Brazil still gets Turkish, not Portuguese.
    expect(pickLanguage('BR', ['tr'])).toBe('tr');
  });

  it('falls back to the country default for a language it does not ship', () => {
    expect(pickLanguage('BR', ['ja'])).toBe('pt');
    expect(pickLanguage('IQ', [])).toBe('ku');
  });
});

describe('detectRegion', () => {
  const { detectRegion } = require('../region');

  beforeEach(() => {
    mockLocales = [];
  });

  it('reads the phone region and language', () => {
    mockLocales = [{ languageCode: 'tr', regionCode: 'TR', currencyCode: 'TRY' }];
    expect(detectRegion()).toMatchObject({
      countryCode: 'TR',
      currencyCode: 'TRY',
      referenceCurrency: 'USD',
      language: 'tr',
      detected: true
    });
  });

  it('maps a eurozone country the table does not list to the eurozone entry', () => {
    // A Kurd in Germany is better served by euros than by dinars.
    mockLocales = [{ languageCode: 'ku', regionCode: 'DE', currencyCode: 'EUR' }];
    const region = detectRegion();
    expect(region.countryCode).toBe('EU');
    expect(region.currencyCode).toBe('EUR');
    expect(region.language).toBe('ku');
  });

  it('falls back to the reported currency when the region is missing', () => {
    // The web reports no region, so the currency is the next best signal.
    mockLocales = [{ languageCode: 'pt', regionCode: null, currencyCode: 'BRL' }];
    expect(detectRegion().countryCode).toBe('BR');
  });

  it('returns the plain default when nothing matches', () => {
    mockLocales = [{ languageCode: 'ja', regionCode: 'JP', currencyCode: 'JPY' }];
    const region = detectRegion();
    expect(region.detected).toBe(false);
    expect(region.countryCode).toBe('IQ');
  });

  it('never throws, whatever the device reports', () => {
    mockLocales = null as any;
    expect(() => detectRegion()).not.toThrow();
    expect(detectRegion().detected).toBe(false);
  });
});
