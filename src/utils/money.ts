/**
 * Money arithmetic.
 *
 * Amounts are stored as SQLite REAL, so every value that reaches the database
 * has to be snapped back to the currency's precision first. Without that,
 * 0.1 + 0.2 lands as 0.30000000000000004, a conversion leaves a fourteen-digit
 * tail, and a balance built from thousands of such rows drifts away from the
 * sum a person would get on paper.
 *
 * Rounding here is decimal, not binary: `toFixed` formats the shortest decimal
 * representation of the double, so 0.30000000000000004 becomes "0.30" rather
 * than rounding the binary error into the result.
 */

/** Minor units per currency. Dinar and rial are quoted whole. */
const DECIMALS: Record<string, number> = {
  IQD: 0,
  IRR: 0,
  JPY: 0,
  KWD: 3,
  BHD: 3,
  OMR: 3,
  USD: 2,
  EUR: 2,
  TRY: 2,
  SAR: 2,
  AED: 2,
  GBP: 2
};

/** Currencies not listed above are assumed to have two decimals. */
export function currencyDecimals(currency?: string | null): number {
  if (!currency) return 2;
  const d = DECIMALS[currency.toUpperCase()];
  return d === undefined ? 2 : d;
}

/**
 * Snap a value to its currency's precision. Every write to the database and
 * every figure shown to a person should pass through here.
 *
 * Rounding is half-up on the decimal the person actually typed. The naive
 * `toFixed(2)` rounds 1.005 down to 1.00, because the nearest double to 1.005
 * is 1.00499999999999989 — technically right, and wrong to anyone reading a
 * receipt. Shifting through exponential notation re-parses from the decimal
 * text ("1.005e2" is exactly 100.5), so the digit that decides the rounding is
 * the one that was written.
 */
export function roundMoney(value: number, currency?: string | null): number {
  if (!Number.isFinite(value)) return 0;

  const decimals = currencyDecimals(currency);
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);

  // Beyond ~1e21 JavaScript stringifies in exponential form and the shift
  // below would build nonsense. No real balance goes there, but don't guess.
  const text = String(abs);
  const rounded = text.includes('e')
    ? Number(abs.toFixed(decimals))
    : Number(`${Math.round(Number(`${text}e${decimals}`))}e-${decimals}`);

  if (!Number.isFinite(rounded)) return 0;
  // -0 reads as a negative balance in some formatters; normalise it away.
  return rounded === 0 ? 0 : sign * rounded;
}

export function addMoney(a: number, b: number, currency?: string | null): number {
  return roundMoney(roundMoney(a, currency) + roundMoney(b, currency), currency);
}

export function subtractMoney(a: number, b: number, currency?: string | null): number {
  return roundMoney(roundMoney(a, currency) - roundMoney(b, currency), currency);
}

export function sumMoney(values: number[], currency?: string | null): number {
  return roundMoney(
    values.reduce((total, v) => total + roundMoney(v, currency), 0),
    currency
  );
}

/**
 * Converts between currencies and rounds to the destination's precision.
 * Rates are "units of the currency per 1 USD", matching the app's rate table.
 */
export function convertMoney(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>
): number {
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return roundMoney(amount, to);

  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return roundMoney(amount, to);

  return roundMoney((amount / fromRate) * toRate, to);
}

/** True when two amounts are the same money, ignoring binary noise. */
export function moneyEquals(a: number, b: number, currency?: string | null): boolean {
  return roundMoney(a, currency) === roundMoney(b, currency);
}
