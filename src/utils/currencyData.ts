/**
 * Countries and their currencies.
 *
 * Country names are looked up as `countries.<code>` in the translation files,
 * with the English name here as the fallback. Carrying a name field per
 * language stopped scaling once the app went past three languages.
 *
 * `defaultRateToUSD` is a starting point only. Rates move, and in several of
 * these countries the official rate is not the rate people actually trade at,
 * which is why the app lets someone set their own — see `manualRates` in the
 * store.
 */
export interface CountryCurrency {
  /** ISO 3166-1 alpha-2, and the i18n key under `countries`. */
  countryCode: string;
  countryNameEn: string;
  currencyCode: string;
  currencySymbol: string;
  flag: string;
  defaultRateToUSD: number;
  /**
   * True where the street rate routinely diverges from the official one, so
   * the app can offer to set a rate by hand during onboarding.
   */
  dualRate?: boolean;
  /**
   * The languages this app ships that are actually read in this country, most
   * likely first. English is last in every list: it is the fallback everyone
   * can read, not usually the first choice.
   */
  languages: string[];
  /**
   * The second currency people here quote prices in — the one the home screen
   * offers alongside the local one. Almost everywhere that is the dollar; in
   * the United States and next to the eurozone it is the euro.
   */
  referenceCurrency: string;
}

export const COUNTRIES_CURRENCIES: CountryCurrency[] = [
  // ── Middle East ──────────────────────────────────────────────
  { countryCode: 'IQ', countryNameEn: 'Iraq', currencyCode: 'IQD', currencySymbol: 'د.ع', flag: '🇮🇶', defaultRateToUSD: 1320, dualRate: true, languages: ['ku', 'ar', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'SY', countryNameEn: 'Syria', currencyCode: 'SYP', currencySymbol: 'ل.س', flag: '🇸🇾', defaultRateToUSD: 13000, dualRate: true, languages: ['ar', 'ku', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'LB', countryNameEn: 'Lebanon', currencyCode: 'LBP', currencySymbol: 'ل.ل', flag: '🇱🇧', defaultRateToUSD: 89500, dualRate: true, languages: ['ar', 'fr', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'IR', countryNameEn: 'Iran', currencyCode: 'IRR', currencySymbol: '﷼', flag: '🇮🇷', defaultRateToUSD: 42000, dualRate: true, languages: ['fa', 'ku', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'TR', countryNameEn: 'Türkiye', currencyCode: 'TRY', currencySymbol: '₺', flag: '🇹🇷', defaultRateToUSD: 34, dualRate: true, languages: ['tr', 'ar', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'JO', countryNameEn: 'Jordan', currencyCode: 'JOD', currencySymbol: 'د.ا', flag: '🇯🇴', defaultRateToUSD: 0.709, languages: ['ar', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'SA', countryNameEn: 'Saudi Arabia', currencyCode: 'SAR', currencySymbol: 'ر.س', flag: '🇸🇦', defaultRateToUSD: 3.75, languages: ['ar', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'AE', countryNameEn: 'United Arab Emirates', currencyCode: 'AED', currencySymbol: 'د.إ', flag: '🇦🇪', defaultRateToUSD: 3.67, languages: ['ar', 'ur', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'KW', countryNameEn: 'Kuwait', currencyCode: 'KWD', currencySymbol: 'د.ك', flag: '🇰🇼', defaultRateToUSD: 0.307, languages: ['ar', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'QA', countryNameEn: 'Qatar', currencyCode: 'QAR', currencySymbol: 'ر.ق', flag: '🇶🇦', defaultRateToUSD: 3.64, languages: ['ar', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'BH', countryNameEn: 'Bahrain', currencyCode: 'BHD', currencySymbol: 'د.ب', flag: '🇧🇭', defaultRateToUSD: 0.376, languages: ['ar', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'OM', countryNameEn: 'Oman', currencyCode: 'OMR', currencySymbol: 'ر.ع', flag: '🇴🇲', defaultRateToUSD: 0.385, languages: ['ar', 'ur', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'YE', countryNameEn: 'Yemen', currencyCode: 'YER', currencySymbol: '﷼', flag: '🇾🇪', defaultRateToUSD: 250, dualRate: true, languages: ['ar', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'IL', countryNameEn: 'Israel', currencyCode: 'ILS', currencySymbol: '₪', flag: '🇮🇱', defaultRateToUSD: 3.7, languages: ['en', 'ar'], referenceCurrency: 'USD' },

  // ── North & Sub-Saharan Africa ───────────────────────────────
  { countryCode: 'EG', countryNameEn: 'Egypt', currencyCode: 'EGP', currencySymbol: 'ج.م', flag: '🇪🇬', defaultRateToUSD: 48, dualRate: true, languages: ['ar', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'SD', countryNameEn: 'Sudan', currencyCode: 'SDG', currencySymbol: 'ج.س', flag: '🇸🇩', defaultRateToUSD: 600, dualRate: true, languages: ['ar', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'DZ', countryNameEn: 'Algeria', currencyCode: 'DZD', currencySymbol: 'د.ج', flag: '🇩🇿', defaultRateToUSD: 134, dualRate: true, languages: ['ar', 'fr', 'en'], referenceCurrency: 'EUR' },
  { countryCode: 'MA', countryNameEn: 'Morocco', currencyCode: 'MAD', currencySymbol: 'د.م', flag: '🇲🇦', defaultRateToUSD: 9.9, languages: ['ar', 'fr', 'en'], referenceCurrency: 'EUR' },
  { countryCode: 'TN', countryNameEn: 'Tunisia', currencyCode: 'TND', currencySymbol: 'د.ت', flag: '🇹🇳', defaultRateToUSD: 3.1, languages: ['ar', 'fr', 'en'], referenceCurrency: 'EUR' },
  { countryCode: 'LY', countryNameEn: 'Libya', currencyCode: 'LYD', currencySymbol: 'ل.د', flag: '🇱🇾', defaultRateToUSD: 4.8, dualRate: true, languages: ['ar', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'NG', countryNameEn: 'Nigeria', currencyCode: 'NGN', currencySymbol: '₦', flag: '🇳🇬', defaultRateToUSD: 1550, dualRate: true, languages: ['en'], referenceCurrency: 'USD' },
  { countryCode: 'KE', countryNameEn: 'Kenya', currencyCode: 'KES', currencySymbol: 'KSh', flag: '🇰🇪', defaultRateToUSD: 129, languages: ['en'], referenceCurrency: 'USD' },
  { countryCode: 'GH', countryNameEn: 'Ghana', currencyCode: 'GHS', currencySymbol: '₵', flag: '🇬🇭', defaultRateToUSD: 15, dualRate: true, languages: ['en'], referenceCurrency: 'USD' },
  { countryCode: 'ET', countryNameEn: 'Ethiopia', currencyCode: 'ETB', currencySymbol: 'Br', flag: '🇪🇹', defaultRateToUSD: 120, dualRate: true, languages: ['en'], referenceCurrency: 'USD' },
  { countryCode: 'ZA', countryNameEn: 'South Africa', currencyCode: 'ZAR', currencySymbol: 'R', flag: '🇿🇦', defaultRateToUSD: 18, languages: ['en'], referenceCurrency: 'USD' },

  // ── South & Southeast Asia ───────────────────────────────────
  { countryCode: 'PK', countryNameEn: 'Pakistan', currencyCode: 'PKR', currencySymbol: '₨', flag: '🇵🇰', defaultRateToUSD: 278, dualRate: true, languages: ['ur', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'IN', countryNameEn: 'India', currencyCode: 'INR', currencySymbol: '₹', flag: '🇮🇳', defaultRateToUSD: 84, languages: ['en', 'ur'], referenceCurrency: 'USD' },
  { countryCode: 'BD', countryNameEn: 'Bangladesh', currencyCode: 'BDT', currencySymbol: '৳', flag: '🇧🇩', defaultRateToUSD: 120, dualRate: true, languages: ['en'], referenceCurrency: 'USD' },
  { countryCode: 'AF', countryNameEn: 'Afghanistan', currencyCode: 'AFN', currencySymbol: '؋', flag: '🇦🇫', defaultRateToUSD: 70, dualRate: true, languages: ['fa', 'ur', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'ID', countryNameEn: 'Indonesia', currencyCode: 'IDR', currencySymbol: 'Rp', flag: '🇮🇩', defaultRateToUSD: 15800, languages: ['id', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'MY', countryNameEn: 'Malaysia', currencyCode: 'MYR', currencySymbol: 'RM', flag: '🇲🇾', defaultRateToUSD: 4.4, languages: ['id', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'PH', countryNameEn: 'Philippines', currencyCode: 'PHP', currencySymbol: '₱', flag: '🇵🇭', defaultRateToUSD: 58, languages: ['en'], referenceCurrency: 'USD' },

  // ── Latin America ────────────────────────────────────────────
  { countryCode: 'AR', countryNameEn: 'Argentina', currencyCode: 'ARS', currencySymbol: '$', flag: '🇦🇷', defaultRateToUSD: 1000, dualRate: true, languages: ['es', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'VE', countryNameEn: 'Venezuela', currencyCode: 'VES', currencySymbol: 'Bs', flag: '🇻🇪', defaultRateToUSD: 40, dualRate: true, languages: ['es', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'BR', countryNameEn: 'Brazil', currencyCode: 'BRL', currencySymbol: 'R$', flag: '🇧🇷', defaultRateToUSD: 5.8, languages: ['pt', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'MX', countryNameEn: 'Mexico', currencyCode: 'MXN', currencySymbol: '$', flag: '🇲🇽', defaultRateToUSD: 20, languages: ['es', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'CO', countryNameEn: 'Colombia', currencyCode: 'COP', currencySymbol: '$', flag: '🇨🇴', defaultRateToUSD: 4300, languages: ['es', 'en'], referenceCurrency: 'USD' },

  // ── Europe, North America & other reserve currencies ─────────
  { countryCode: 'US', countryNameEn: 'United States', currencyCode: 'USD', currencySymbol: '$', flag: '🇺🇸', defaultRateToUSD: 1, languages: ['en', 'es'], referenceCurrency: 'EUR' },
  { countryCode: 'EU', countryNameEn: 'Eurozone', currencyCode: 'EUR', currencySymbol: '€', flag: '🇪🇺', defaultRateToUSD: 0.92, languages: ['en', 'fr', 'es', 'pt'], referenceCurrency: 'USD' },
  { countryCode: 'GB', countryNameEn: 'United Kingdom', currencyCode: 'GBP', currencySymbol: '£', flag: '🇬🇧', defaultRateToUSD: 0.79, languages: ['en'], referenceCurrency: 'EUR' },
  { countryCode: 'RU', countryNameEn: 'Russia', currencyCode: 'RUB', currencySymbol: '₽', flag: '🇷🇺', defaultRateToUSD: 100, dualRate: true, languages: ['ru', 'en'], referenceCurrency: 'USD' },
  { countryCode: 'SE', countryNameEn: 'Sweden', currencyCode: 'SEK', currencySymbol: 'kr', flag: '🇸🇪', defaultRateToUSD: 10.9, languages: ['en'], referenceCurrency: 'EUR' },
  { countryCode: 'CA', countryNameEn: 'Canada', currencyCode: 'CAD', currencySymbol: 'C$', flag: '🇨🇦', defaultRateToUSD: 1.4, languages: ['en', 'fr'], referenceCurrency: 'USD' },
  { countryCode: 'AU', countryNameEn: 'Australia', currencyCode: 'AUD', currencySymbol: 'A$', flag: '🇦🇺', defaultRateToUSD: 1.55, languages: ['en'], referenceCurrency: 'USD' }
];

/** Default rate table, keyed by currency, in units per 1 USD. */
export const DEFAULT_RATES: Record<string, number> = COUNTRIES_CURRENCIES.reduce(
  (rates, c) => {
    rates[c.currencyCode] = c.defaultRateToUSD;
    return rates;
  },
  {} as Record<string, number>
);

const BY_CURRENCY = new Map(COUNTRIES_CURRENCIES.map((c) => [c.currencyCode, c]));
const BY_COUNTRY = new Map(COUNTRIES_CURRENCIES.map((c) => [c.countryCode, c]));

export function findByCurrency(code: string): CountryCurrency | undefined {
  return BY_CURRENCY.get(code?.toUpperCase());
}

export function findByCountry(code: string): CountryCurrency | undefined {
  return BY_COUNTRY.get(code?.toUpperCase());
}

export function getCurrencySymbol(code: string): string {
  return findByCurrency(code)?.currencySymbol ?? code;
}

/** True where the app should offer a hand-set rate during onboarding. */
export function hasDualRate(currencyCode: string): boolean {
  return !!findByCurrency(currencyCode)?.dualRate;
}

/**
 * The currency shown next to the local one. A country whose own currency is
 * already the reference falls back to the dollar so the pair is never the
 * same code twice.
 */
export function getReferenceCurrency(countryCode: string): string {
  const country = findByCountry(countryCode);
  if (!country) return 'USD';
  return country.referenceCurrency === country.currencyCode ? 'USD' : country.referenceCurrency;
}

/** The languages offered first for a country, English always among them. */
export function getCountryLanguages(countryCode: string): string[] {
  const langs = findByCountry(countryCode)?.languages ?? ['en'];
  return langs.includes('en') ? langs : [...langs, 'en'];
}
