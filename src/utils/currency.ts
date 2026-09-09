export interface CountryCurrency {
  countryCode: string;
  countryNameEn: string;
  countryNameKu: string;
  countryNameAr: string;
  currencyCode: string;
  currencySymbol: string;
  flag: string;
  defaultRateToUSD: number;
}

export const COUNTRIES_CURRENCIES: CountryCurrency[] = [
  {
    countryCode: 'IQ',
    countryNameEn: 'Iraq',
    countryNameKu: 'عێراق',
    countryNameAr: 'العراق',
    currencyCode: 'IQD',
    currencySymbol: 'د.ع',
    flag: '🇮🇶',
    defaultRateToUSD: 1500
  },
  {
    countryCode: 'US',
    countryNameEn: 'United States',
    countryNameKu: 'ویلایەتە یەکگرتووەکان',
    countryNameAr: 'الولايات المتحدة',
    currencyCode: 'USD',
    currencySymbol: '$',
    flag: '🇺🇸',
    defaultRateToUSD: 1
  },
  {
    countryCode: 'TR',
    countryNameEn: 'Turkey',
    countryNameKu: 'تورکیا',
    countryNameAr: 'تركيا',
    currencyCode: 'TRY',
    currencySymbol: '₺',
    flag: '🇹🇷',
    defaultRateToUSD: 34
  },
  {
    countryCode: 'EU',
    countryNameEn: 'Eurozone',
    countryNameKu: 'یەکێتی ئەوروپا',
    countryNameAr: 'منطقة اليورو',
    currencyCode: 'EUR',
    currencySymbol: '€',
    flag: '🇪🇺',
    defaultRateToUSD: 0.92
  },
  {
    countryCode: 'IR',
    countryNameEn: 'Iran',
    countryNameKu: 'ئێران',
    countryNameAr: 'إيران',
    currencyCode: 'IRR',
    currencySymbol: '﷼',
    flag: '🇮🇷',
    defaultRateToUSD: 600000
  },
  {
    countryCode: 'SA',
    countryNameEn: 'Saudi Arabia',
    countryNameKu: 'عەرەبستانی سعودی',
    countryNameAr: 'المملكة العربية السعودية',
    currencyCode: 'SAR',
    currencySymbol: 'ر.س',
    flag: '🇸🇦',
    defaultRateToUSD: 3.75
  },
  {
    countryCode: 'AE',
    countryNameEn: 'United Arab Emirates',
    countryNameKu: 'ئیمارات',
    countryNameAr: 'الإمارات العربية المتحدة',
    currencyCode: 'AED',
    currencySymbol: 'د.إ',
    flag: '🇦🇪',
    defaultRateToUSD: 3.67
  },
  {
    countryCode: 'GB',
    countryNameEn: 'United Kingdom',
    countryNameKu: 'شانشینی یەکگرتوو',
    countryNameAr: 'المملكة المتحدة',
    currencyCode: 'GBP',
    currencySymbol: '£',
    flag: '🇬🇧',
    defaultRateToUSD: 0.77
  },
  {
    countryCode: 'KW',
    countryNameEn: 'Kuwait',
    countryNameKu: 'کوەیت',
    countryNameAr: 'الكويت',
    currencyCode: 'KWD',
    currencySymbol: 'د.ك',
    flag: '🇰🇼',
    defaultRateToUSD: 0.31
  },
  {
    countryCode: 'JO',
    countryNameEn: 'Jordan',
    countryNameKu: 'ئوردن',
    countryNameAr: 'الأردن',
    currencyCode: 'JOD',
    currencySymbol: 'د.أ',
    flag: '🇯🇴',
    defaultRateToUSD: 0.71
  },
  {
    countryCode: 'SY',
    countryNameEn: 'Syria',
    countryNameKu: 'سووریا',
    countryNameAr: 'سوريا',
    currencyCode: 'SYP',
    currencySymbol: 'ل.س',
    flag: '🇸🇾',
    defaultRateToUSD: 14000
  },
  {
    countryCode: 'SE',
    countryNameEn: 'Sweden',
    countryNameKu: 'سوید',
    countryNameAr: 'السويد',
    currencyCode: 'SEK',
    currencySymbol: 'kr',
    flag: '🇸🇪',
    defaultRateToUSD: 10.5
  },
  {
    countryCode: 'DE',
    countryNameEn: 'Germany',
    countryNameKu: 'ئەڵمانیا',
    countryNameAr: 'ألمانيا',
    currencyCode: 'EUR',
    currencySymbol: '€',
    flag: '🇩🇪',
    defaultRateToUSD: 0.92
  }
];

export function getCurrencySymbol(currencyCode: string): string {
  const match = COUNTRIES_CURRENCIES.find((c) => c.currencyCode === currencyCode);
  return match ? match.currencySymbol : currencyCode;
}

export function formatCurrency(
  amount: number,
  currencyCode: string = 'IQD',
  options?: { showSymbol?: boolean; isRTL?: boolean }
): string {
  const symbol = getCurrencySymbol(currencyCode);
  const formattedNumber = Math.abs(amount).toLocaleString('en-US', {
    maximumFractionDigits: currencyCode === 'IQD' ? 0 : 2,
    minimumFractionDigits: 0
  });

  const sign = amount < 0 ? '-' : '';
  const showSymbol = options?.showSymbol ?? true;

  if (!showSymbol) {
    return `${sign}${formattedNumber}`;
  }

  // Symbol placement
  if (options?.isRTL) {
    return `${sign}${formattedNumber} ${symbol}`;
  }
  return `${sign}${symbol}${formattedNumber}`;
}

/**
 * Convert an amount from one currency to another using exchange rates relative to USD.
 * rates: { [currencyCode: string]: number } (how many of that currency per 1 USD)
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount;

  const fromRateToUSD = rates[fromCurrency] || 1;
  const toRateToUSD = rates[toCurrency] || 1;

  // Convert to USD first, then to target currency
  const inUSD = amount / fromRateToUSD;
  return inUSD * toRateToUSD;
}
