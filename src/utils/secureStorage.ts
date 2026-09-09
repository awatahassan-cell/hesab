import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Storage for the PIN.
 *
 * AsyncStorage is a plain file: on a rooted or jailbroken device, or through
 * an ADB backup, its contents read back as text. SecureStore puts the value in
 * the iOS Keychain / Android Keystore instead, which is where a lock code
 * belongs.
 *
 * SecureStore has no web implementation, so the web build falls back to
 * AsyncStorage. That is the preview target, not a shipped product.
 */

const SECURE_PIN_KEY = 'hesab_pin_code';
/** Where the PIN used to live, so an existing install can be moved across. */
const LEGACY_PIN_KEY = 'app_pin_code';

const canUseSecureStore = Platform.OS === 'ios' || Platform.OS === 'android';

export async function getPin(): Promise<string | null> {
  if (!canUseSecureStore) {
    return AsyncStorage.getItem(LEGACY_PIN_KEY);
  }

  try {
    const stored = await SecureStore.getItemAsync(SECURE_PIN_KEY);
    if (stored !== null) return stored;
  } catch {
    // A corrupt keychain entry should not lock someone out of their app.
  }

  // Nothing in the keychain yet: an install from before this change still has
  // the PIN in AsyncStorage. Move it across once, then clear the old copy.
  const legacy = await AsyncStorage.getItem(LEGACY_PIN_KEY);
  if (legacy) {
    try {
      await SecureStore.setItemAsync(SECURE_PIN_KEY, legacy);
      await AsyncStorage.removeItem(LEGACY_PIN_KEY);
    } catch {
      // Keep the legacy value if the move fails; losing the PIN is worse than
      // storing it in the old place for another launch.
    }
    return legacy;
  }

  return null;
}

export async function setPin(pin: string | null): Promise<void> {
  if (!canUseSecureStore) {
    if (pin) await AsyncStorage.setItem(LEGACY_PIN_KEY, pin);
    else await AsyncStorage.removeItem(LEGACY_PIN_KEY);
    return;
  }

  if (pin) {
    await SecureStore.setItemAsync(SECURE_PIN_KEY, pin);
  } else {
    await SecureStore.deleteItemAsync(SECURE_PIN_KEY).catch(() => {});
  }
  // Always clear the legacy copy, so a removed PIN cannot be recovered from it.
  await AsyncStorage.removeItem(LEGACY_PIN_KEY);
}
