import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Store update checks.
 *
 * The app asks a small JSON manifest you host whether a newer build is in the
 * stores. Nothing is bundled at build time, so you can announce a release
 * without shipping another release to announce it.
 *
 * Publish a file like this at UPDATE_MANIFEST_URL:
 *
 * {
 *   "latestVersion": "1.1.0",
 *   "minimumVersion": "1.0.0",
 *   "androidUrl": "https://play.google.com/store/apps/details?id=com.hesab.finance",
 *   "iosUrl": "https://apps.apple.com/app/id0000000000",
 *   "notes": { "ku": "...", "ar": "...", "en": "..." }
 * }
 *
 * `minimumVersion` is the escape hatch: raise it only when an older build is
 * genuinely unusable — a broken migration, a server contract change — because
 * a person below it cannot dismiss the prompt.
 */

const STORAGE_LAST_CHECK = 'update_last_check_at';
const STORAGE_SKIPPED = 'update_skipped_version';

/** Don't ask the network more than once every six hours. */
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 6000;

export interface UpdateManifest {
  latestVersion: string;
  minimumVersion?: string;
  androidUrl?: string;
  iosUrl?: string;
  notes?: Record<string, string>;
}

export interface UpdateStatus {
  available: boolean;
  required: boolean;
  currentVersion: string;
  latestVersion: string;
  notes?: string;
  storeUrl?: string;
}

/** Reads the manifest URL from app.json's `extra`, so it is not hard-coded. */
function manifestUrl(): string | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const url = extra.updateManifestUrl;
  return typeof url === 'string' && url.length > 0 ? url : null;
}

export function currentVersion(): string {
  return (
    Application.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    '0.0.0'
  );
}

/**
 * Compares dotted numeric versions. Returns <0, 0 or >0 like a comparator.
 * Missing segments count as 0, so "1.2" and "1.2.0" are the same version.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    String(v)
      .split('.')
      .map((part) => {
        const n = parseInt(part, 10);
        return Number.isFinite(n) ? n : 0;
      });

  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}

async function fetchManifest(url: string): Promise<UpdateManifest | null> {
  // AbortController rather than Promise.race: this actually releases the
  // socket on a stalled network instead of leaving it hanging.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' }
    });
    if (!response.ok) return null;

    const json = (await response.json()) as UpdateManifest;
    return typeof json?.latestVersion === 'string' ? json : null;
  } catch {
    // Offline, DNS failure, malformed JSON — an update check is never worth
    // interrupting someone over.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function storeUrlFor(manifest: UpdateManifest): string | undefined {
  if (Platform.OS === 'ios') return manifest.iosUrl;
  if (Platform.OS === 'android') return manifest.androidUrl;
  return manifest.androidUrl ?? manifest.iosUrl;
}

export interface CheckOptions {
  /** Ignore the six-hour throttle and the skipped-version memory. */
  force?: boolean;
  /** Language for the release note, falls back to English then any note. */
  language?: string;
}

/**
 * Returns the update status, or null when there is nothing to say.
 *
 * Never throws: a failed check leaves the app exactly as it was.
 */
export async function checkForUpdate(options: CheckOptions = {}): Promise<UpdateStatus | null> {
  const url = manifestUrl();
  if (!url) return null;

  if (!options.force) {
    const last = await AsyncStorage.getItem(STORAGE_LAST_CHECK);
    if (last && Date.now() - Number(last) < CHECK_INTERVAL_MS) return null;
  }

  const manifest = await fetchManifest(url);
  // Only record the check when it actually reached the server, so an offline
  // launch does not burn the next six hours.
  if (!manifest) return null;
  await AsyncStorage.setItem(STORAGE_LAST_CHECK, String(Date.now()));

  const current = currentVersion();
  const behindLatest = compareVersions(current, manifest.latestVersion) < 0;
  const belowMinimum =
    !!manifest.minimumVersion && compareVersions(current, manifest.minimumVersion) < 0;

  if (!behindLatest && !belowMinimum) return null;

  if (!options.force && !belowMinimum) {
    // A skipped version stays skipped until a newer one appears; a required
    // update ignores this entirely.
    const skipped = await AsyncStorage.getItem(STORAGE_SKIPPED);
    if (skipped && compareVersions(skipped, manifest.latestVersion) >= 0) return null;
  }

  const lang = options.language ?? 'en';
  const notes = manifest.notes;

  return {
    available: true,
    required: belowMinimum,
    currentVersion: current,
    latestVersion: manifest.latestVersion,
    notes: notes ? notes[lang] ?? notes.en ?? Object.values(notes)[0] : undefined,
    storeUrl: storeUrlFor(manifest)
  };
}

/** Remembers that this version was dismissed, so it is not asked again. */
export async function skipVersion(version: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_SKIPPED, version);
}

export async function openStore(status: UpdateStatus): Promise<void> {
  if (!status.storeUrl) return;
  const supported = await Linking.canOpenURL(status.storeUrl).catch(() => false);
  if (supported) await Linking.openURL(status.storeUrl);
}
