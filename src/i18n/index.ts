import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ku from './ku.json';
import ar from './ar.json';
import en from './en.json';
import fa from './fa.json';
import tr from './tr.json';
import ur from './ur.json';
import es from './es.json';
import pt from './pt.json';
import fr from './fr.json';
import id from './id.json';
import ru from './ru.json';

const resources = {
  ku: { translation: ku },
  ar: { translation: ar },
  en: { translation: en },
  fa: { translation: fa },
  tr: { translation: tr },
  ur: { translation: ur },
  es: { translation: es },
  pt: { translation: pt },
  fr: { translation: fr },
  id: { translation: id },
  ru: { translation: ru }
};

export interface AppLanguage {
  /** i18next code, also the key stored in settings. */
  code: string;
  /** The language's own name, never translated. */
  label: string;
}

// The order shown in Settings: the languages the app was built for first,
// then the rest of the world alphabetically by code.
export const LANGUAGES: AppLanguage[] = [
  { code: 'ku', label: 'کوردی (سۆرانی)' },
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'fa', label: 'فارسی' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ur', label: 'اردو' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ru', label: 'Русский' }
];

export const SUPPORTED_LANGUAGES = LANGUAGES.map((l) => l.code);

export function isSupportedLanguage(lang: string): boolean {
  return SUPPORTED_LANGUAGES.includes(lang);
}

// Scripts written right to left. Adding a language here is all that is
// needed: every screen reads the derived `isRTL` flag rather than hard-coding
// a direction.
export const RTL_LANGUAGES = ['ku', 'ar', 'fa', 'ur'];

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
