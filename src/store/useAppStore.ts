import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { isRTLLanguage } from '../i18n';

interface AppState {
  language: string;
  isRTL: boolean;
  countryCode: string;
  primaryCurrency: string;
  themeMode: 'system' | 'light' | 'dark';
  monthStartDay: number;
  exchangeRates: Record<string, number>;
  pinCode: string | null;
  isBiometricsEnabled: boolean;
  isLocked: boolean;
  hasCompletedOnboarding: boolean;
  
  displayCurrency: 'IQD' | 'USD';
  marketRate100USD: number;

  setLanguage: (lang: string) => Promise<void>;
  setCountryAndCurrency: (countryCode: string, currencyCode: string) => Promise<void>;
  setDisplayCurrency: (curr: 'IQD' | 'USD') => Promise<void>;
  setMarketRate100USD: (rate: number) => Promise<void>;
  toggleDisplayCurrency: () => Promise<void>;
  setThemeMode: (mode: 'system' | 'light' | 'dark') => Promise<void>;
  setMonthStartDay: (day: number) => Promise<void>;
  setExchangeRate: (currency: string, rateToUSD: number) => Promise<void>;
  setPinCode: (pin: string | null) => Promise<void>;
  setBiometricsEnabled: (enabled: boolean) => Promise<void>;
  setIsLocked: (locked: boolean) => void;
  completeOnboarding: () => Promise<void>;
  loadInitialSettings: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  language: 'ku',
  isRTL: true,
  countryCode: 'IQ',
  primaryCurrency: 'IQD',
  themeMode: 'system',
  monthStartDay: 1,
  exchangeRates: {
    IQD: 1500,
    USD: 1,
    TRY: 34,
    EUR: 0.92,
    IRR: 600000,
    SAR: 3.75,
    AED: 3.67,
    GBP: 0.77,
    KWD: 0.31
  },
  pinCode: null,
  isBiometricsEnabled: false,
  isLocked: false,
  hasCompletedOnboarding: false,
  displayCurrency: 'IQD',
  marketRate100USD: 150000,

  setDisplayCurrency: async (curr: 'IQD' | 'USD') => {
    set({ displayCurrency: curr });
    await AsyncStorage.setItem('app_display_currency', curr);
  },

  setMarketRate100USD: async (rate: number) => {
    const ratePerDollar = rate / 100;
    const updated = { ...get().exchangeRates, IQD: ratePerDollar };
    set({ marketRate100USD: rate, exchangeRates: updated });
    await AsyncStorage.setItem('app_market_rate_100usd', rate.toString());
    await AsyncStorage.setItem('app_exchange_rates', JSON.stringify(updated));
  },

  toggleDisplayCurrency: async () => {
    const next = get().displayCurrency === 'IQD' ? 'USD' : 'IQD';
    await get().setDisplayCurrency(next);
  },

  setLanguage: async (lang: string) => {
    await i18n.changeLanguage(lang);
    const rtl = isRTLLanguage(lang);
    set({ language: lang, isRTL: rtl });
    await AsyncStorage.setItem('app_language', lang);
  },

  setCountryAndCurrency: async (countryCode: string, currencyCode: string) => {
    set({ countryCode, primaryCurrency: currencyCode });
    await AsyncStorage.setItem('app_country', countryCode);
    await AsyncStorage.setItem('app_primary_currency', currencyCode);
  },

  setThemeMode: async (mode: 'system' | 'light' | 'dark') => {
    set({ themeMode: mode });
    await AsyncStorage.setItem('app_theme_mode', mode);
  },

  setMonthStartDay: async (day: number) => {
    set({ monthStartDay: day });
    await AsyncStorage.setItem('app_month_start_day', day.toString());
  },

  setExchangeRate: async (currency: string, rateToUSD: number) => {
    const updated = { ...get().exchangeRates, [currency]: rateToUSD };
    set({ exchangeRates: updated });
    await AsyncStorage.setItem('app_exchange_rates', JSON.stringify(updated));
  },

  setPinCode: async (pin: string | null) => {
    set({ pinCode: pin });
    if (pin) {
      await AsyncStorage.setItem('app_pin_code', pin);
    } else {
      await AsyncStorage.removeItem('app_pin_code');
    }
  },

  setBiometricsEnabled: async (enabled: boolean) => {
    set({ isBiometricsEnabled: enabled });
    await AsyncStorage.setItem('app_biometrics_enabled', enabled ? 'true' : 'false');
  },

  setIsLocked: (locked: boolean) => {
    set({ isLocked: locked });
  },

  completeOnboarding: async () => {
    set({ hasCompletedOnboarding: true });
    await AsyncStorage.setItem('app_onboarding_completed', 'true');
  },

  loadInitialSettings: async () => {
    try {
      const [lang, country, curr, theme, startDay, rates, pin, bio, onboard, dispCurr, mktRate] = await Promise.all([
        AsyncStorage.getItem('app_language'),
        AsyncStorage.getItem('app_country'),
        AsyncStorage.getItem('app_primary_currency'),
        AsyncStorage.getItem('app_theme_mode'),
        AsyncStorage.getItem('app_month_start_day'),
        AsyncStorage.getItem('app_exchange_rates'),
        AsyncStorage.getItem('app_pin_code'),
        AsyncStorage.getItem('app_biometrics_enabled'),
        AsyncStorage.getItem('app_onboarding_completed'),
        AsyncStorage.getItem('app_display_currency'),
        AsyncStorage.getItem('app_market_rate_100usd')
      ]);

      const selectedLang = lang || 'ku';
      await i18n.changeLanguage(selectedLang);

      const parsedMktRate = mktRate ? parseFloat(mktRate) : 150000;
      const baseRates = rates ? JSON.parse(rates) : get().exchangeRates;
      if (parsedMktRate) {
        baseRates.IQD = parsedMktRate / 100;
      }

      set({
        language: selectedLang,
        isRTL: isRTLLanguage(selectedLang),
        countryCode: country || 'IQ',
        primaryCurrency: curr || 'IQD',
        displayCurrency: (dispCurr as any) || 'IQD',
        marketRate100USD: parsedMktRate,
        themeMode: (theme as any) || 'system',
        monthStartDay: startDay ? parseInt(startDay, 10) : 1,
        exchangeRates: baseRates,
        pinCode: pin || null,
        isBiometricsEnabled: bio === 'true',
        isLocked: !!(pin || bio === 'true'),
        hasCompletedOnboarding: onboard === 'true'
      });
    } catch (e) {
      console.error('Error loading settings', e);
    }
  }
}));
