import { roundMoney, currencyDecimals, convertMoney } from './money';
import {
  COUNTRIES_CURRENCIES,
  CountryCurrency,
  DEFAULT_RATES,
  findByCurrency,
  findByCountry,
  getCurrencySymbol,
  hasDualRate
} from './currencyData';

export {
  COUNTRIES_CURRENCIES,
  DEFAULT_RATES,
  findByCurrency,
  findByCountry,
  getCurrencySymbol,
  hasDualRate
};
export type { CountryCurrency };

/**
 * Number formatting per language.
 *
 * Group and decimal separators differ by locale — a German reads 1.234,56
 * where an American reads 1,234.56 — so the app cannot keep formatting every
 * figure as en-US and call itself translated.
 *
 * Kurdish has no JavaScript locale, so it borrows en-GB grouping, which is
 * what the app has always shown and what people here read comfortably.
 */
const LOCALE_FOR_LANGUAGE: Record<string, string> = {
  ku: 'en-GB',
  ar: 'ar-EG',
  fa: 'fa-IR',
  ur: 'ur-PK',
  tr: 'tr-TR',
  es: 'es-ES',
  pt: 'pt-BR',
  fr: 'fr-FR',
  id: 'id-ID',
  ru: 'ru-RU',
  hi: 'hi-IN',
  bn: 'bn-BD',
  en: 'en-GB'
};

/** Set once at startup and whenever the language changes. */
let activeLocale = 'en-GB';

export function setNumberLocale(language: string): void {
  activeLocale = LOCALE_FOR_LANGUAGE[language] ?? 'en-GB';
}

export function getNumberLocale(): string {
  return activeLocale;
}

/**
 * Formats an amount for display.
 *
 * Digits use Latin numerals in every language. Arabic-Indic digits are correct
 * for Arabic and Persian typography, but a finance app is scanned in columns,
 * and mixing digit systems between a keypad, a chart and a list is worse than
 * one consistent set.
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'IQD',
  options?: { showSymbol?: boolean; isRTL?: boolean; locale?: string }
): string {
  const symbol = getCurrencySymbol(currencyCode);
  const decimals = currencyDecimals(currencyCode);
  const value = roundMoney(amount, currencyCode);

  const locale = options?.locale ?? activeLocale;
  const formattedNumber = Math.abs(value).toLocaleString(locale, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
    // Latin digits regardless of locale, so columns line up.
    numberingSystem: 'latn'
  } as Intl.NumberFormatOptions);

  const sign = value < 0 ? '-' : '';
  const showSymbol = options?.showSymbol ?? true;

  if (!showSymbol) return `${sign}${formattedNumber}`;

  // Right-to-left scripts put the symbol after the figure.
  return options?.isRTL
    ? `${sign}${formattedNumber} ${symbol}`
    : `${sign}${symbol}${formattedNumber}`;
}

/** Plain number formatting, for anything that is not money. */
export function formatNumber(value: number, locale?: string): string {
  return value.toLocaleString(locale ?? activeLocale, {
    numberingSystem: 'latn'
  } as Intl.NumberFormatOptions);
}

/**
 * Converts between currencies. Rates are units per 1 USD.
 *
 * Rounds to the destination currency's precision, so a conversion into dinars
 * never leaves a fractional dinar behind to drift a balance later.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  return convertMoney(amount, fromCurrency, toCurrency, rates);
}

/**
 * Builds the rate table from the defaults plus any rate the person set by
 * hand. A hand-set rate always wins: in the countries this app is built for,
 * the official rate is not the rate anyone actually trades at.
 */
export function buildRates(
  manualRates: Record<string, number> = {},
  base: Record<string, number> = DEFAULT_RATES
): Record<string, number> {
  const rates = { ...base };
  for (const [code, value] of Object.entries(manualRates)) {
    if (Number.isFinite(value) && value > 0) rates[code] = value;
  }
  rates.USD = 1;
  return rates;
}

/**
 * How many units of `currency` equal 100 USD.
 *
 * People quote the street rate in round lots — "100 dollars is 148,000
 * dinars" — rather than per single unit, so this is the number the rate
 * screens ask for and show.
 */
export function per100Usd(currency: string, rates: Record<string, number>): number {
  const rate = rates[currency];
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return roundMoney(rate * 100, currency);
}

/** Inverse of `per100Usd`, for turning what someone typed back into a rate. */
export function rateFromPer100Usd(currency: string, per100: number): number {
  if (!Number.isFinite(per100) || per100 <= 0) return 0;
  return per100 / 100;
}
