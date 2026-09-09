import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import ku from './ku.json';
import ar from './ar.json';
import en from './en.json';

const resources = {
  ku: { translation: ku },
  ar: { translation: ar },
  en: { translation: en }
};

export const RTL_LANGUAGES = ['ku', 'ar'];

export function isRTLLanguage(lang: string): boolean {
  return RTL_LANGUAGES.includes(lang);
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'ku',
  fallbackLng: 'ku',
  interpolation: {
    escapeValue: false
  },
  compatibilityJSON: 'v4'
});

export default i18n;
