import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { isRTLLanguage, isSupportedLanguage } from '../i18n';
import { getPin, setPin as setSecurePin } from '../utils/secureStorage';
import { DEFAULT_RATES, buildRates, per100Usd, rateFromPer100Usd, setNumberLocale } from '../utils/currency';
import { getReferenceCurrency } from '../utils/currencyData';
import { detectRegion } from '../utils/region';

interface AppState {
  language: string;
  isRTL: boolean;
  countryCode: string;
  primaryCurrency: string;
  themeMode: 'system' | 'light' | 'dark';
  monthStartDay: number;
  exchangeRates: Record<string, number>;
  /** When a rate was last set by hand, so the UI can show how stale it is. */
  ratesUpdatedAt: string | null;
  pinCode: string | null;
  isBiometricsEnabled: boolean;
  isLocked: boolean;
  hasCompletedOnboarding: boolean;
  
  /** Whichever of the two currencies the home screen is showing right now. */
  displayCurrency: string;
  /** The second currency of the pair — the dollar almost everywhere. */
  referenceCurrency: string;
  marketRate100USD: number;
  /** True once the device's own region has been used to pick the defaults. */
  isRegionDetected: boolean;

  setLanguage: (lang: string) => Promise<void>;
  setCountryAndCurrency: (countryCode: string, currencyCode: string) => Promise<void>;
  setDisplayCurrency: (curr: string) => Promise<void>;
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
  exchangeRates: { ...DEFAULT_RATES },
  ratesUpdatedAt: null,
  pinCode: null,
  isBiometricsEnabled: false,
  isLocked: false,
  hasCompletedOnboarding: false,
  displayCurrency: 'IQD',
  referenceCurrency: 'USD',
  marketRate100USD: 150000,
  isRegionDetected: false,

  setDisplayCurrency: async (curr: string) => {
    set({ displayCurrency: curr });
    await AsyncStorage.setItem('app_display_currency', curr);
  },

  /**
   * Units of the primary currency per 100 USD, as quoted on the street.
   *
   * This used to write to IQD unconditionally. It now follows whichever
   * currency the person picked, so an Egyptian setting 4,850 gets an EGP rate
   * rather than silently repricing the dinar.
   */
  setMarketRate100USD: async (rate: number) => {
    const currency = get().primaryCurrency || 'IQD';
    const ratePerDollar = rateFromPer100Usd(currency, rate);
    const updated = { ...get().exchangeRates, [currency]: ratePerDollar, USD: 1 };
    const now = new Date().toISOString();
    set({ marketRate100USD: rate, exchangeRates: updated, ratesUpdatedAt: now });
    await AsyncStorage.setItem('app_market_rate_100usd', rate.toString());
    await AsyncStorage.setItem('app_rates_updated_at', now);
    await AsyncStorage.setItem('app_exchange_rates', JSON.stringify(updated));
  },

  /** Flips between the country's own currency and its reference currency. */
  toggleDisplayCurrency: async () => {
    const { displayCurrency, primaryCurrency, referenceCurrency } = get();
    const next = displayCurrency === primaryCurrency ? referenceCurrency : primaryCurrency;
    await get().setDisplayCurrency(next);
  },

  setLanguage: async (lang: string) => {
    // The locale must land before i18next re-renders every screen: date and
    // number helpers read it as module state, so a language switch that does
    // not also flip isRTL would otherwise leave them a language behind.
    setNumberLocale(lang);
    await i18n.changeLanguage(lang);
    const rtl = isRTLLanguage(lang);
    set({ language: lang, isRTL: rtl });
    await AsyncStorage.setItem('app_language', lang);
  },

  setCountryAndCurrency: async (countryCode: string, currencyCode: string) => {
    // The reference currency and the currency on show follow the country:
    // leaving the home screen toggled to a currency the new country does not
    // use would show two unrelated codes side by side.
    const reference = getReferenceCurrency(countryCode);
    set({
      countryCode,
      primaryCurrency: currencyCode,
      referenceCurrency: reference,
      displayCurrency: currencyCode
    });
    await AsyncStorage.multiSet([
      ['app_country', countryCode],
      ['app_primary_currency', currencyCode],
      ['app_display_currency', currencyCode]
    ]);
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
    const now = new Date().toISOString();
    set({ exchangeRates: updated, ratesUpdatedAt: now });
    await AsyncStorage.setItem('app_exchange_rates', JSON.stringify(updated));
    await AsyncStorage.setItem('app_rates_updated_at', now);
  },

  setPinCode: async (pin: string | null) => {
    set({ pinCode: pin });
    // Keychain / Keystore, not the plain AsyncStorage file.
    await setSecurePin(pin);
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
      const [lang, country, curr, theme, startDay, rates, pin, bio, onboard, dispCurr, mktRate, ratesAt] = await Promise.all([
        AsyncStorage.getItem('app_language'),
        AsyncStorage.getItem('app_country'),
        AsyncStorage.getItem('app_primary_currency'),
        AsyncStorage.getItem('app_theme_mode'),
        AsyncStorage.getItem('app_month_start_day'),
        AsyncStorage.getItem('app_exchange_rates'),
        getPin(),
        AsyncStorage.getItem('app_biometrics_enabled'),
        AsyncStorage.getItem('app_onboarding_completed'),
        AsyncStorage.getItem('app_display_currency'),
        AsyncStorage.getItem('app_market_rate_100usd'),
        AsyncStorage.getItem('app_rates_updated_at')
      ]);

      // Nothing stored means a first launch, so the device's own region and
      // language choose the defaults instead of Iraq and Kurdish. A stored
      // value always wins: this is a starting guess, not a running override,
      // and someone who picked their country keeps it abroad.
      const region = country ? null : detectRegion();

      // A stored language the app no longer ships would leave every screen
      // silently falling back, so an unknown code resets to the default.
      const selectedLang =
        lang && isSupportedLanguage(lang) ? lang : region?.language ?? 'ku';
      setNumberLocale(selectedLang);
      await i18n.changeLanguage(selectedLang);

      const selectedCountry = country || region?.countryCode || 'IQ';
      const selectedCurrency = curr || region?.currencyCode || 'IQD';
      const reference = getReferenceCurrency(selectedCountry);

      const parsedMktRate = mktRate ? parseFloat(mktRate) : 0;
      // Defaults first, stored values over the top: an update that adds
      // currencies must not be hidden by an older stored table.
      const storedRates = rates ? JSON.parse(rates) : {};
      const baseRates = buildRates(storedRates, DEFAULT_RATES);
      if (parsedMktRate) {
        baseRates[selectedCurrency] = rateFromPer100Usd(selectedCurrency, parsedMktRate);
      }
      // Without a hand-set rate, seed the editor from the table so it opens on
      // this country's own number rather than 150,000 dinars everywhere.
      const marketRate = parsedMktRate || per100Usd(selectedCurrency, baseRates);

      set({
        language: selectedLang,
        isRTL: isRTLLanguage(selectedLang),
        countryCode: selectedCountry,
        primaryCurrency: selectedCurrency,
        referenceCurrency: reference,
        isRegionDetected: !!region?.detected,
        displayCurrency: dispCurr || selectedCurrency,
        marketRate100USD: marketRate,
        themeMode: (theme as any) || 'system',
        monthStartDay: startDay ? parseInt(startDay, 10) : 1,
        exchangeRates: baseRates,
        ratesUpdatedAt: ratesAt || null,
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
