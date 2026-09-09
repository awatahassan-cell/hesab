/**
 * Reading the text out of a file the person just picked.
 *
 * On a phone the picker hands back a file:// URI that expo-file-system can
 * read. On the web it hands back a blob: URI that it cannot — there the asset
 * carries the browser's own File object instead. Reading only one of the two
 * made picking a file fail on the other.
 */
import * as FileSystem from 'expo-file-system/legacy';

export interface ReadableAsset {
  uri: string;
  name?: string | null;
  /** Present on the web only. */
  file?: File;
}

export async function readPickedFile(asset: ReadableAsset): Promise<string> {
  if (asset.file && typeof asset.file.text === 'function') {
    return await asset.file.text();
  }

  return await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8
  });
}
