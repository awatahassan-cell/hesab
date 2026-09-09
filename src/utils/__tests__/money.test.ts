import {
  currencyDecimals,
  roundMoney,
  addMoney,
  subtractMoney,
  sumMoney,
  convertMoney,
  moneyEquals
} from '../money';

describe('currencyDecimals', () => {
  it('treats dinar and rial as whole units', () => {
    expect(currencyDecimals('IQD')).toBe(0);
    expect(currencyDecimals('IRR')).toBe(0);
  });

  it('is case insensitive', () => {
    expect(currencyDecimals('usd')).toBe(2);
  });

  it('assumes two decimals for anything unlisted', () => {
    expect(currencyDecimals('XYZ')).toBe(2);
    expect(currencyDecimals(undefined)).toBe(2);
  });
});

describe('roundMoney', () => {
  it('removes binary representation error', () => {
    expect(roundMoney(0.1 + 0.2, 'USD')).toBe(0.3);
  });

  it('rounds half up on the decimal that was written', () => {
    // The nearest double to 1.005 is 1.00499999999999989, so toFixed(2) would
    // answer 1.00 here. A person reading a receipt expects 1.01.
    expect(roundMoney(1.005, 'USD')).toBe(1.01);
    expect(roundMoney(2.675, 'USD')).toBe(2.68);
    expect(roundMoney(0.615, 'USD')).toBe(0.62);
  });

  it('still rounds down when the digit says so', () => {
    expect(roundMoney(1.0049, 'USD')).toBe(1);
    expect(roundMoney(2.674, 'USD')).toBe(2.67);
  });

  it('snaps dinar amounts to whole units', () => {
    expect(roundMoney(1500.4, 'IQD')).toBe(1500);
    expect(roundMoney(1500.5, 'IQD')).toBe(1501);
  });

  it('keeps negatives negative and normalises -0', () => {
    expect(roundMoney(-25.004, 'USD')).toBe(-25);
    expect(roundMoney(-0.001, 'USD')).toBe(0);
    expect(Object.is(roundMoney(-0.001, 'USD'), -0)).toBe(false);
  });

  it('returns 0 for values that are not finite', () => {
    expect(roundMoney(NaN, 'USD')).toBe(0);
    expect(roundMoney(Infinity, 'USD')).toBe(0);
  });
});

describe('arithmetic', () => {
  it('adds without drift', () => {
    expect(addMoney(0.1, 0.2, 'USD')).toBe(0.3);
  });

  it('subtracts without drift', () => {
    expect(subtractMoney(0.3, 0.1, 'USD')).toBe(0.2);
  });

  it('keeps a long running sum exact', () => {
    // The case that matters: a balance built from many small amounts. Adding
    // 0.01 a thousand times with plain floats lands at 9.999999999999831.
    const values = Array.from({ length: 1000 }, () => 0.01);
    expect(sumMoney(values, 'USD')).toBe(10);
  });

  it('sums dinar amounts as whole units', () => {
    expect(sumMoney([25000, 45000, 400000], 'IQD')).toBe(470000);
  });
});

describe('convertMoney', () => {
  const rates = { USD: 1, IQD: 1480, EUR: 0.92 };

  it('returns the same amount when the currency does not change', () => {
    expect(convertMoney(1234.567, 'USD', 'USD', rates)).toBe(1234.57);
  });

  it('rounds to the destination currency precision', () => {
    // 100 USD -> IQD is a whole number of dinars, never a fraction.
    expect(convertMoney(100, 'USD', 'IQD', rates)).toBe(148000);
    expect(Number.isInteger(convertMoney(33.33, 'USD', 'IQD', rates))).toBe(true);
  });

  it('converts back to roughly the original amount', () => {
    const there = convertMoney(250, 'USD', 'IQD', rates);
    const back = convertMoney(there, 'IQD', 'USD', rates);
    expect(back).toBeCloseTo(250, 2);
  });

  it('falls back to the input when a rate is missing', () => {
    expect(convertMoney(50, 'USD', 'ZZZ', rates)).toBe(50);
  });
});

describe('moneyEquals', () => {
  it('ignores binary noise', () => {
    expect(moneyEquals(0.1 + 0.2, 0.3, 'USD')).toBe(true);
    expect(0.1 + 0.2 === 0.3).toBe(false);
  });

  it('treats sub-unit differences as equal for whole-unit currencies', () => {
    expect(moneyEquals(1500.4, 1500, 'IQD')).toBe(true);
    expect(moneyEquals(1500.4, 1500, 'USD')).toBe(false);
  });
});
