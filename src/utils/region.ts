/**
 * Works out where the phone is, so a first launch already shows the right
 * currency and language instead of asking someone in Turkey about dinars.
 *
 * This reads the device's own timezone, region and language settings — nothing
 * is sent anywhere, and there is no IP lookup.
 *
 * Modeled after Sabata's intelligent country and language detection.
 */
import { getLocales, getCalendars } from 'expo-localization';

import {
  COUNTRIES_CURRENCIES,
  findByCountry,
  findByCurrency,
  getCountryLanguages,
  CountryCurrency
} from './currencyData';
import { SUPPORTED_LANGUAGES } from '../i18n';

export interface DetectedRegion {
  /** A country the app knows, always one of COUNTRIES_CURRENCIES. */
  countryCode: string;
  currencyCode: string;
  /** The reference currency shown next to the local one. */
  referenceCurrency: string;
  /** The languages to offer, most likely first. */
  languages: string[];
  /** The one to start in. */
  language: string;
  /** False when nothing matched and this is the plain default. */
  detected: boolean;
  timeZone?: string;
}

/**
 * Countries mapped by TimeZone. Phones in Kurdistan and Iraq are often left on
 * the "US" region by firmware default, but the clock/timezone is set to Asia/Baghdad,
 * which is the most reliable indicator of where someone lives.
 */
const TIME_ZONES: Record<string, string> = {
  'Asia/Baghdad': 'IQ',
  'Asia/Tehran': 'IR',
  'Europe/Istanbul': 'TR',
  'Asia/Istanbul': 'TR',
  'Asia/Damascus': 'SY',
  'Asia/Riyadh': 'SA',
  'Asia/Dubai': 'AE',
  'Asia/Kuwait': 'KW',
  'Asia/Qatar': 'QA',
  'Asia/Bahrain': 'BH',
  'Asia/Muscat': 'OM',
  'Asia/Amman': 'JO',
  'Asia/Beirut': 'LB',
  'Africa/Cairo': 'EG',
  'Europe/Berlin': 'DE',
  'Europe/Vienna': 'AT',
  'Europe/Zurich': 'CH',
  'Europe/Paris': 'FR',
  'Europe/Brussels': 'BE',
  'Europe/Madrid': 'ES',
  'Europe/Amsterdam': 'NL',
  'Europe/Rome': 'IT',
  'Europe/Helsinki': 'FI',
  'Europe/Dublin': 'IE',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/London': 'GB'
};

const EUROZONE = [
  'DE', 'FR', 'IT', 'ES', 'PT', 'NL', 'BE', 'AT', 'IE', 'FI', 'GR', 'SK',
  'SI', 'LT', 'LV', 'EE', 'LU', 'MT', 'CY', 'HR'
];

function resolveCountry(regionCode: string | null | undefined): string | null {
  if (!regionCode) return null;
  const code = regionCode.toUpperCase();
  if (findByCountry(code)) return code;
  if (EUROZONE.includes(code)) return 'EU';
  return null;
}

/**
 * Normalizes device language tag (e.g. ckb-IQ -> ku, ku-Arab -> ku, ar-IQ -> ar).
 */
function normalizeLangTag(tag: string): string | undefined {
  const [base] = tag.split(/[-_]/);
  const lower = base.toLowerCase();
  if (lower === 'ckb' || lower === 'kmr' || lower === 'ku') return 'ku';
  return SUPPORTED_LANGUAGES.includes(lower) ? lower : undefined;
}

/**
 * Picks the starting language:
 * - A Kurdish phone in any country gets Kurdish ('ku').
 * - In Iraq ('IQ'), an English phone gets Kurdish ('ku') with Arabic as second suggestion.
 * - Otherwise, the country's primary language or the phone's native language.
 */
export function pickLanguage(countryCode: string, deviceLanguages: string[]): string {
  const normLangs = deviceLanguages.map(normalizeLangTag).filter((l): l is string => Boolean(l));

  // Offered languages in that country
  const offered = getCountryLanguages(countryCode);
  for (const lang of normLangs) {
    if (offered.includes(lang)) return lang;
  }

  // The phone's language is not spoken in the detected country — someone
  // travelling, or a second-language speaker. Their own language still wins
  // over the country's if the app ships it.
  for (const lang of normLangs) {
    if (SUPPORTED_LANGUAGES.includes(lang)) return lang;
  }

  return offered[0] || 'ku';
}

const FALLBACK: DetectedRegion = {
  countryCode: 'IQ',
  currencyCode: 'IQD',
  referenceCurrency: 'USD',
  languages: getCountryLanguages('IQ'),
  language: 'ku',
  detected: false
};

export function detectRegion(): DetectedRegion {
  try {
    const locales = getLocales();
    let timeZone: string | undefined;
    try {
      timeZone = getCalendars()[0]?.timeZone || undefined;
    } catch {
      timeZone = undefined;
    }

    const deviceLanguages = locales
      .map((l) => l.languageCode || l.languageTag)
      .filter((l): l is string => Boolean(l));

    // 1. Timezone detection (Most accurate for Iraq / Kurdistan)
    let countryCode: string | null = null;
    if (timeZone && TIME_ZONES[timeZone]) {
      countryCode = TIME_ZONES[timeZone];
    }

    // 2. Region code from device locales
    if (!countryCode) {
      for (const locale of locales) {
        countryCode = resolveCountry(locale.regionCode);
        if (countryCode) break;
      }
    }

    // 3. Currency code guess
    if (!countryCode) {
      for (const locale of locales) {
        const byCurrency = locale.currencyCode && findByCurrency(locale.currencyCode);
        if (byCurrency) {
          countryCode = byCurrency.countryCode;
          break;
        }
      }
    }

    if (!countryCode) {
      return { ...FALLBACK, timeZone, language: pickLanguage('IQ', deviceLanguages) };
    }

    const country = findByCountry(countryCode) ?? COUNTRIES_CURRENCIES[0];
    return {
      countryCode: country.countryCode,
      currencyCode: country.currencyCode,
      referenceCurrency:
        country.referenceCurrency === country.currencyCode ? 'USD' : country.referenceCurrency,
      languages: getCountryLanguages(country.countryCode),
      language: pickLanguage(country.countryCode, deviceLanguages),
      detected: true,
      timeZone
    };
  } catch {
    return FALLBACK;
  }
}
