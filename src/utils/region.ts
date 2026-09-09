/**
 * Works out where the phone is, so a first launch already shows the right
 * currency and language instead of asking someone in Turkey about dinars.
 *
 * This reads the device's own region and language settings — nothing is sent
 * anywhere, and there is no IP lookup. Onboarding still shows the guess and
 * lets it be changed; detection picks the default, it does not decide.
 */
import { getLocales } from 'expo-localization';

import {
  COUNTRIES_CURRENCIES,
  findByCountry,
  findByCurrency,
  getCountryLanguages
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
}

/**
 * Countries the app has no entry for, mapped to the closest one it does.
 * A Kurd in Germany or a Turk in the Netherlands is better served by the
 * eurozone entry than by a dinar.
 */
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
 * Picks the starting language: the phone's own language when the app has it
 * and it is read in that country, otherwise the country's first language.
 */
export function pickLanguage(countryCode: string, deviceLanguages: string[]): string {
  const offered = getCountryLanguages(countryCode);
  for (const lang of deviceLanguages) {
    if (offered.includes(lang)) return lang;
  }
  // The phone's language is not spoken in the detected country — someone
  // travelling, or a second-language speaker. Their own language still wins
  // over the country's if the app ships it.
  for (const lang of deviceLanguages) {
    if (SUPPORTED_LANGUAGES.includes(lang)) return lang;
  }
  return offered[0];
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
    const deviceLanguages = locales
      .map((l) => l.languageCode)
      .filter((l): l is string => !!l);

    // Region first: it is the setting that says where someone lives. The
    // currency the device reports is a useful second guess on the web, where
    // the region can come back null.
    let countryCode: string | null = null;
    for (const locale of locales) {
      countryCode = resolveCountry(locale.regionCode);
      if (countryCode) break;
    }
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
      return { ...FALLBACK, language: pickLanguage('IQ', deviceLanguages) };
    }

    const country = findByCountry(countryCode) ?? COUNTRIES_CURRENCIES[0];
    return {
      countryCode: country.countryCode,
      currencyCode: country.currencyCode,
      referenceCurrency:
        country.referenceCurrency === country.currencyCode ? 'USD' : country.referenceCurrency,
      languages: getCountryLanguages(country.countryCode),
      language: pickLanguage(country.countryCode, deviceLanguages),
      detected: true
    };
  } catch {
    // Never let a settings read stop the app from starting.
    return FALLBACK;
  }
}
