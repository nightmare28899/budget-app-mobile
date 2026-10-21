import {
  checksumOf,
  decodeBackup,
  encodeBackup,
  formatKotlinDouble,
  parseJson,
  sha256Hex,
} from '../../../src/modules/backup';
import * as fx from './fixtures/backupFixtures';

/**
 * compose-backup.json is laid out the way the Compose app writes it (declaration order, compact, Kotlin Double
 * rendering such as `3000.0`); its checksum was computed by an independent implementation (python hashlib).
 */
declare const __dirname: string;
const COMPOSE_TEXT: string = require('fs').readFileSync(
  `${__dirname}/fixtures/compose-backup.json`,
  'utf8',
);
const COMPOSE_SHA =
  'c711c869548de87ece1a23beec57c3ddea1ec58ac3cc0a1617facb7b48dc1db7';

describe('Compose file compatibility', () => {
  it('decodes output produced by the actual Compose JVM BackupCodec', () => {
    const text: string = require('fs').readFileSync(
      `${__dirname}/fixtures/compose-jvm-backup.json`,
      'utf8',
    );
    const result = decodeBackup(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.file.payload).toEqual(fx.payload());
      expect(result.file.appVersion).toBe('compose-jvm-interop');
    }
  });

  it('sha256 matches known vectors', () => {
    expect(sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(sha256Hex('é☕😀')).toBe(
      '24d2473c2b9d39fd0152fd8c7290a84bc49897201f81caad8eaa812bd24bce5f',
    );
    expect(sha256Hex('a'.repeat(1000))).toBe(
      '41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3',
    );
  });

  it('imports the independently generated Compose-format fixture, verifying its checksum', () => {
    const result = decodeBackup(COMPOSE_TEXT);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.file.payload).toEqual(fx.payload());
      expect(result.file.appVersion).toBe('0.1.0');
    }
  });

  it('re-rendering the Compose-format payload keeps number literals and reproduces the checksum', () => {
    const root = parseJson(COMPOSE_TEXT);
    if (root.type !== 'obj') {
      throw new Error('root');
    }
    const payload = root.members.find(([key]) => key === 'payload')![1];
    expect(checksumOf(payload)).toBe(COMPOSE_SHA);
  });

  it('writes the expected Compose-format bytes for the same payload', () => {
    expect(encodeBackup(fx.payload(), '0.1.0', 1_800_000_000_000)).toBe(
      COMPOSE_TEXT,
    );
  });

  it('renders doubles like Kotlin Double.toString', () => {
    expect(formatKotlinDouble(3000)).toBe('3000.0');
    expect(formatKotlinDouble(45.5)).toBe('45.5');
    expect(formatKotlinDouble(-2)).toBe('-2.0');
    expect(formatKotlinDouble(0)).toBe('0.0');
    expect(formatKotlinDouble(1e12)).toBe('1.0E12');
    expect(formatKotlinDouble(1.5e7)).toBe('1.5E7');
    expect(formatKotlinDouble(9999999)).toBe('9999999.0');
    expect(formatKotlinDouble(0.001)).toBe('0.001');
    expect(formatKotlinDouble(0.0001)).toBe('1.0E-4');
    expect(formatKotlinDouble(1.25e-5)).toBe('1.25E-5');
  });
});
