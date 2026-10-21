import {
  backupFileName,
  encodeUtf8,
  readUtf8Bounded,
} from '../../../src/modules/backup';

function readerOf(...chunks: Uint8Array[]) {
  let index = 0;
  return { read: async () => (index < chunks.length ? chunks[index++] : null) };
}

describe('BackupIo', () => {
  it('file name uses the ISO date', () => {
    expect(backupFileName(new Date(2026, 9, 12))).toBe(
      'budgetapp-backup-2026-10-12.json',
    );
    expect(backupFileName(new Date(2026, 0, 5))).toBe(
      'budgetapp-backup-2026-01-05.json',
    );
  });

  it('reads within the limit', async () => {
    expect(await readUtf8Bounded(readerOf(encodeUtf8('héllo ☕')), 100)).toBe(
      'héllo ☕',
    );
  });

  it('decodes a multi-byte character split across chunks', async () => {
    const bytes = encodeUtf8('a☕b😀');
    const reader = readerOf(
      bytes.slice(0, 2),
      bytes.slice(2, 5),
      bytes.slice(5),
    );
    expect(await readUtf8Bounded(reader, 100)).toBe('a☕b😀');
  });

  it('returns null when over the limit without reading everything', async () => {
    let served = 0;
    const endless = {
      read: async () => {
        served += 16384;
        return new Uint8Array(16384).fill(97);
      },
    };
    expect(await readUtf8Bounded(endless, 1000)).toBeNull();
    expect(served).toBeLessThan(1_000_000);
  });

  it('exactly at the limit is accepted', async () => {
    expect(await readUtf8Bounded(readerOf(encodeUtf8('abc')), 3)).toBe('abc');
    expect(await readUtf8Bounded(readerOf(encodeUtf8('abcd')), 3)).toBeNull();
  });
});
