import { Platform } from 'react-native';
import { Dirs, FileSystem } from 'react-native-file-access';
import {
  pick,
  saveDocuments,
  releaseSecureAccess,
  isErrorWithCode,
  errorCodes,
} from '@react-native-documents/picker';
import { backupFileName, DEFAULT_LIMITS, encodeUtf8 } from '../modules/backup';
export function isBackupCancelled(error: unknown): boolean {
  return isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED;
}
const localPath = (uri: string) =>
  uri.startsWith('file://') ? decodeURIComponent(uri.slice(7)) : uri;
let sequence = 0;
export async function exportBackupFile(text: string): Promise<void> {
  if (encodeUtf8(text).length > DEFAULT_LIMITS.maxFileBytes)
    throw Error('TooLarge');
  const directory = `${
    Dirs.CacheDir
  }/budget-backup-${Date.now()}-${++sequence}`;
  const name = backupFileName(new Date());
  const path = `${directory}/${name}`;
  await FileSystem.mkdir(directory);
  try {
    await FileSystem.writeFile(path, text, 'utf8');
    const result = await saveDocuments({
      sourceUris: [`file://${encodeURI(path)}`],
      mimeType: 'application/json',
      fileName: name,
      copy: true,
    });
    if (result.some(r => r.error)) throw Error('WriteFailed');
  } finally {
    await FileSystem.unlink(directory).catch(() => {
      console.warn('[backup] Temporary export cleanup failed.');
    });
  }
}
/** Stage a private copy so external file growth cannot turn a bounded read into an unbounded allocation.
 * readFileChunk in file-access 4.0.4 Android returns a padded buffer on short reads; do not use it here.
 */
export async function importBackupFile(): Promise<string> {
  const [file] = await pick({
    mode: 'open',
    allowMultiSelection: false,
    type: ['application/json', 'text/plain'],
  });
  const directory = `${
    Dirs.CacheDir
  }/budget-import-${Date.now()}-${++sequence}`;
  let created = false;
  try {
    if (file.error || file.isVirtual) throw Error('ReadFailed');
    if (file.size !== null && file.size > DEFAULT_LIMITS.maxFileBytes)
      throw Error('TooLarge');
    const source = localPath(file.uri);
    const original = await FileSystem.stat(source);
    if (original.size > DEFAULT_LIMITS.maxFileBytes) throw Error('TooLarge');
    await FileSystem.mkdir(directory);
    created = true;
    const path = `${directory}/import.json`;
    await FileSystem.cp(source, path);
    const copied = await FileSystem.stat(path);
    if (!Number.isSafeInteger(copied.size) || copied.size < 0)
      throw Error('ReadFailed');
    if (copied.size > DEFAULT_LIMITS.maxFileBytes) throw Error('TooLarge');
    if (original.size > 0 && copied.size !== original.size)
      throw Error('ReadFailed');
    // Only this operation can write this unique app-owned path; its complete size is now known.
    const text = await FileSystem.readFile(path, 'utf8');
    if (encodeUtf8(text).length > DEFAULT_LIMITS.maxFileBytes)
      throw Error('TooLarge');
    return text;
  } finally {
    try {
      if (created)
        await FileSystem.unlink(directory).catch(() => {
          console.warn('[backup] Temporary import cleanup failed.');
        });
    } finally {
      if (Platform.OS === 'ios')
        await releaseSecureAccess([file.uri]).catch(() => {
          console.warn('[backup] Picker access release failed.');
        });
    }
  }
}
