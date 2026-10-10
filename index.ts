// Polyfill crypto.getRandomValues for React Native / Hermes
if (typeof globalThis !== 'undefined') {
  const g = globalThis as any;
  if (!g.crypto) {
    g.crypto = {};
  }
  if (typeof g.crypto.getRandomValues !== 'function') {
    g.crypto.getRandomValues = function <T extends ArrayBufferView | null>(array: T): T {
      if (!array) return array;
      const uint8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      for (let i = 0; i < uint8.length; i++) {
        uint8[i] = Math.floor(Math.random() * 256);
      }
      return array;
    };
  }
}

import { registerRootComponent } from 'expo';

import App from './App';

if (typeof document !== 'undefined') {
  const fontLinkId = 'google-font-ibm-plex-arabic';
  if (!document.getElementById(fontLinkId)) {
    const link = document.createElement('link');
    link.id = fontLinkId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }

  const iconStyleId = 'expo-vector-icons-web-font';
  if (!document.getElementById(iconStyleId)) {
    const style = document.createElement('style');
    style.id = iconStyleId;
    style.textContent = `
      @font-face {
        font-family: 'Ionicons';
        src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
        font-display: swap;
      }
      @font-face {
        font-family: 'ionicons';
        src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
        font-display: swap;
      }
      * {
        font-family: "IBM Plex Sans Arabic", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }
      [style*="ionicons" i],
      [style*="Ionicons" i],
      [class*="icon"],
      [data-icon] {
        font-family: 'Ionicons', 'ionicons' !important;
      }
    `;
    document.head.appendChild(style);
  }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
