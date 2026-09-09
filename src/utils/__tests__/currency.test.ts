import {
  buildRates,
  per100Usd,
  rateFromPer100Usd,
  formatCurrency,
  setNumberLocale,
  convertCurrency
} from '../currency';
import { COUNTRIES_CURRENCIES, DEFAULT_RATES, findByCurrency, hasDualRate } from '../currencyData';

describe('country and currency data', () => {
  it('has no duplicate country codes', () => {
    const codes = COUNTRIES_CURRENCIES.map((c) => c.countryCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('gives every country a rate, a symbol and a flag', () => {
    for (const c of COUNTRIES_CURRENCIES) {
      expect(c.defaultRateToUSD).toBeGreaterThan(0);
      expect(c.currencySymbol.length).toBeGreaterThan(0);
      expect(c.flag.length).toBeGreaterThan(0);
      expect(c.countryNameEn.length).toBeGreaterThan(0);
    }
  });

  it('anchors the rate table on the dollar', () => {
    expect(DEFAULT_RATES.USD).toBe(1);
  });

  it('marks the currencies where the street rate diverges', () => {
    // The app's whole reason for a hand-set rate. If these lose the flag, the
    // onboarding stops offering the one question those users need.
    expect(hasDualRate('IQD')).toBe(true);
    expect(hasDualRate('ARS')).toBe(true);
    expect(hasDualRate('EGP')).toBe(true);
    expect(hasDualRate('USD')).toBe(false);
    expect(hasDualRate('EUR')).toBe(false);
  });

  it('looks currencies up case insensitively', () => {
    expect(findByCurrency('iqd')?.countryCode).toBe('IQ');
    expect(findByCurrency('ZZZ')).toBeUndefined();
  });
});

describe('buildRates', () => {
  it('lets a hand-set rate win over the default', () => {
    const rates = buildRates({ IQD: 1480 });
    expect(rates.IQD).toBe(1480);
  });

  it('keeps currencies the person never touched', () => {
    const rates = buildRates({ IQD: 1480 });
    expect(rates.EGP).toBe(DEFAULT_RATES.EGP);
  });

  it('ignores nonsense rates rather than corrupting the table', () => {
    const rates = buildRates({ IQD: 0, EGP: -5, TRY: NaN });
    expect(rates.IQD).toBe(DEFAULT_RATES.IQD);
    expect(rates.EGP).toBe(DEFAULT_RATES.EGP);
    expect(rates.TRY).toBe(DEFAULT_RATES.TRY);
  });

  it('always pins the dollar to 1', () => {
    expect(buildRates({ USD: 7 }).USD).toBe(1);
  });

  it('surfaces a stored currency the defaults do not know', () => {
    expect(buildRates({ XAF: 600 }).XAF).toBe(600);
  });
});

describe('per-100-dollar rates', () => {
  it('quotes the street rate in round lots', () => {
    expect(per100Usd('IQD', { IQD: 1480 })).toBe(148000);
  });

  it('round-trips what someone typed', () => {
    const typed = 148000;
    const rate = rateFromPer100Usd('IQD', typed);
    expect(per100Usd('IQD', { IQD: rate })).toBe(typed);
  });

  it('returns 0 for a missing or impossible rate', () => {
    expect(per100Usd('XYZ', {})).toBe(0);
    expect(rateFromPer100Usd('IQD', 0)).toBe(0);
    expect(rateFromPer100Usd('IQD', -1)).toBe(0);
  });
});

describe('formatCurrency', () => {
  beforeEach(() => setNumberLocale('en'));

  it('drops decimals for whole-unit currencies', () => {
    expect(formatCurrency(1500.4, 'IQD', { showSymbol: false })).toBe('1,500');
  });

  it('keeps decimals where the currency has them', () => {
    expect(formatCurrency(12.5, 'USD', { showSymbol: false })).toBe('12.5');
  });

  it('puts the symbol after the figure in right-to-left scripts', () => {
    const rtl = formatCurrency(1000, 'IQD', { isRTL: true });
    const ltr = formatCurrency(1000, 'USD', { isRTL: false });
    expect(rtl.endsWith('د.ع')).toBe(true);
    expect(ltr.startsWith('$')).toBe(true);
  });

  it('follows the locale separators', () => {
    setNumberLocale('tr');
    // Turkish groups with dots, not commas.
    expect(formatCurrency(1234567, 'TRY', { showSymbol: false })).toBe('1.234.567');
    setNumberLocale('en');
    expect(formatCurrency(1234567, 'USD', { showSymbol: false })).toBe('1,234,567');
  });

  it('uses Latin digits in every language, so columns line up', () => {
    setNumberLocale('ar');
    const arabic = formatCurrency(1500, 'EGP', { showSymbol: false });
    expect(arabic).toMatch(/[0-9]/);
    expect(arabic).not.toMatch(/[٠-٩]/);
    setNumberLocale('en');
  });

  it('shows a single minus sign for negatives', () => {
    expect(formatCurrency(-250, 'USD', { showSymbol: false })).toBe('-250');
  });
});

describe('convertCurrency', () => {
  it('converts through the dollar and rounds to the target', () => {
    const rates = buildRates({ IQD: 1480, EGP: 48 });
    // 100 USD of dinars, expressed in Egyptian pounds.
    const dinars = 148000;
    const pounds = convertCurrency(dinars, 'IQD', 'EGP', rates);
    expect(pounds).toBeCloseTo(4800, 0);
  });

  it('never leaves a fractional dinar behind', () => {
    const rates = buildRates({ IQD: 1480 });
    expect(Number.isInteger(convertCurrency(33.33, 'USD', 'IQD', rates))).toBe(true);
  });
});
