import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  BackupError,
  BackupFile,
  BackupLimits,
  BackupPayload,
  checksumOf,
  decodeBackup,
  encodeBackup,
  parseJson,
} from '../../../src/modules/backup';
import * as fx from './fixtures/backupFixtures';

function ok(text: string): BackupFile {
  const result = decodeBackup(text);
  if (!result.ok) {
    throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  }
  return result.file;
}

function err(text: string, limits?: BackupLimits): BackupError {
  const result = decodeBackup(text, limits);
  if (result.ok) {
    throw new Error('expected failure');
  }
  return result.error;
}

const encode = (p: BackupPayload = fx.payload()) =>
  encodeBackup(p, '0.1.0', 1_800_000_000_000);

type Obj = Record<string, unknown>;

/** Rebuilds an envelope around a hand-edited payload, with a valid checksum. */
function envelope(
  payload: Obj,
  opts: { schema?: number; extra?: Obj; counts?: Obj } = {},
): string {
  const counts: Obj =
    opts.counts ??
    Object.fromEntries(
      Object.entries(payload)
        .filter(([, v]) => Array.isArray(v))
        .map(([k, v]) => [k, (v as unknown[]).length]),
    );
  const payloadText = JSON.stringify(payload);
  return JSON.stringify({
    format: BACKUP_FORMAT,
    schemaVersion: opts.schema ?? BACKUP_SCHEMA_VERSION,
    appVersion: '9.9.9',
    createdAtMillis: 1,
    counts,
    sha256: checksumOf(parseJson(payloadText)),
    payload: JSON.parse(payloadText),
    ...(opts.extra ?? {}),
  });
}

function payloadJson(p: BackupPayload = fx.payload()): Obj {
  return JSON.parse(encode(p)).payload as Obj;
}

describe('BackupCodec', () => {
  it('round trip preserves every entity', () => {
    const file = ok(encode());
    expect(file.payload).toEqual(fx.payload());
    expect(file.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(file.appVersion).toBe('0.1.0');
    expect(file.createdAtMillis).toBe(1_800_000_000_000);
  });

  it('envelope carries format, counts and checksum', () => {
    const root = JSON.parse(encode());
    expect(root.format).toBe(BACKUP_FORMAT);
    expect(root.counts.expenses).toBe(2);
    expect(root.sha256).toHaveLength(64);
    expect(Object.keys(root)).toEqual([
      'format',
      'schemaVersion',
      'appVersion',
      'createdAtMillis',
      'counts',
      'sha256',
      'payload',
    ]);
  });

  it('empty database round trips', () => {
    expect(ok(encode(fx.emptyPayload())).payload).toEqual(fx.emptyPayload());
  });

  it('unicode survives the round trip', () => {
    const title = 'Café ☕ 日本語 😀 ñandú';
    const p = fx.payload({ expenses: [fx.expense({ title })] });
    expect(ok(encode(p)).payload.expenses[0].title).toBe(title);
  });

  it('tampered payload fails the checksum', () => {
    expect(err(encode().replace('Coffee', 'Coffe3'))).toEqual({
      kind: 'ChecksumMismatch',
    });
  });

  it('newer schema is rejected with a clear error', () => {
    const e = err(
      envelope(payloadJson(), { schema: BACKUP_SCHEMA_VERSION + 1 }),
    );
    expect(e).toEqual({
      kind: 'NewerSchema',
      found: BACKUP_SCHEMA_VERSION + 1,
      supported: BACKUP_SCHEMA_VERSION,
    });
  });

  it('schema zero is unsupported', () => {
    expect(err(envelope(payloadJson(), { schema: 0 }))).toEqual({
      kind: 'Malformed',
    });
  });

  it('truncated json is malformed', () => {
    const text = encode();
    expect(err(text.substring(0, text.length / 2))).toEqual({
      kind: 'Malformed',
    });
    expect(err('')).toEqual({ kind: 'Malformed' });
  });

  it('foreign json is not a backup', () => {
    expect(err('{"hello":"world"}')).toEqual({ kind: 'NotABackup' });
    expect(err('[1,2,3]')).toEqual({ kind: 'NotABackup' });
  });

  it('tolerates a leading BOM', () => {
    expect(ok(`﻿${encode()}`).payload).toEqual(fx.payload());
  });

  it('unknown fields are tolerated', () => {
    const payload = payloadJson();
    const expenses = payload.expenses as Obj[];
    const patched = {
      ...payload,
      expenses: [{ ...expenses[0], futureField: 'x' }, ...expenses.slice(1)],
      futureSection: 1,
    };
    const file = ok(envelope(patched, { extra: { future: true } }));
    expect(file.payload).toEqual(fx.payload());
  });

  it('rejects unknown nonempty entity sections rather than silently losing them', () => {
    const payload = payloadJson();
    expect(
      err(envelope({ ...payload, futureEntities: [{ id: 'future' }] })),
    ).toEqual({ kind: 'UnsupportedEntity' });
  });

  it('duplicate ids are rejected', () => {
    const p = fx.payload({
      expenses: [fx.expense({ id: 'dup' }), fx.expense({ id: 'dup' })],
    });
    expect(err(encode(p))).toEqual({
      kind: 'DuplicateId',
      entity: 'expenses',
      id: 'dup',
    });
  });

  it('declared count must match the payload', () => {
    expect(err(envelope(payloadJson(), { counts: { expenses: 99 } }))).toEqual({
      kind: 'CountMismatch',
      entity: 'expenses',
    });
  });

  it('oversize text is rejected before parsing', () => {
    expect(err(encode(), { maxFileBytes: 10, maxRows: 200_000 })).toEqual({
      kind: 'TooLarge',
      maxBytes: 10,
    });
  });

  it('too many rows is rejected', () => {
    expect(err(encode(), { maxFileBytes: 26_214_400, maxRows: 3 })).toEqual({
      kind: 'TooManyRows',
      max: 3,
    });
  });

  it('sanitizes text and normalizes currency', () => {
    const dirty = fx.expense({
      title: '  Tea\u0000\u0007 time  ',
      currency: 'usd',
      note: `ok\tline\r\nnext​${'x'.repeat(5000)}`,
    });
    const clean = ok(encode(fx.payload({ expenses: [dirty] }))).payload
      .expenses[0];
    expect(clean.title).toBe('Tea time');
    expect(clean.currency).toBe('USD');
    expect(clean.note!.length).toBeLessThanOrEqual(2000);
    expect(clean.note!.startsWith('ok line\nnext')).toBe(true);
    // eslint-disable-next-line no-control-regex
    expect(/[\u0000-\u0009\u000b-\u001f]/.test(clean.note!)).toBe(false);
  });

  it('bad currency, blank id, blank title and huge amounts are invalid rows', () => {
    const invalid = (e: Partial<ReturnType<typeof fx.expense>>) =>
      err(encode(fx.payload({ expenses: [fx.expense(e)] }))).kind ===
      'InvalidRow';
    expect(invalid({ currency: 'PESOS' })).toBe(true);
    expect(invalid({ id: '  ' })).toBe(true);
    expect(invalid({ title: ' \u0000 ' })).toBe(true);
    expect(invalid({ cost: 1e15 })).toBe(true);
  });

  it('a number literal that is not representable is malformed', () => {
    const text = encode().replace('"cost":45.5', '"cost":1e999');
    expect(err(text)).toEqual({ kind: 'Malformed' });
  });

  it('a savings transaction must reference a goal in the file with a known type', () => {
    const ghost = fx.payload({
      savingsTransactions: [fx.goalTx({ goalId: 'ghost' })],
    });
    expect(err(encode(ghost)).kind).toBe('InvalidRow');
    const steal = fx.payload({
      savingsTransactions: [fx.goalTx({ type: 'STEAL' })],
    });
    expect(err(encode(steal)).kind).toBe('InvalidRow');
  });

  it('optional fields are coerced, not fatal', () => {
    const p = fx.payload({
      creditCards: [
        fx.card({ last4: '12ab34567', closingDay: 99, paymentDueDay: 0 }),
      ],
      subscriptions: [fx.subscription({ logoUrl: 'javascript' + ':alert(1)' })],
      expenses: [
        fx.expense({ paymentMethod: 'BITCOIN', installmentCount: -4 }),
      ],
    });
    const f = ok(encode(p)).payload;
    expect(f.creditCards[0].last4).toBe('1234');
    expect(f.creditCards[0].closingDay).toBeNull();
    expect(f.creditCards[0].paymentDueDay).toBeNull();
    expect(f.subscriptions[0].logoUrl).toBeNull();
    expect(f.expenses[0].paymentMethod).toBeNull();
    expect(f.expenses[0].installmentCount).toBeNull();
  });

  it('settings are sanitized', () => {
    const s = fx.settings({
      themeMode: 'neon',
      language: 'xx',
      currency: 'euro',
      budgetPeriod: 'fortnight',
      budgetPeriodStart: 'not-a-date',
      reminderLeadDays: 7,
      budgetAmount: -5,
    });
    const out = ok(encode(fx.payload({ settings: s }))).payload.settings!;
    expect(out.themeMode).toBeNull();
    expect(out.language).toBeNull();
    expect(out.currency).toBeNull();
    expect(out.budgetPeriod).toBeNull();
    expect(out.budgetPeriodStart).toBeNull();
    expect(out.reminderLeadDays).toBeNull();
    expect(out.budgetAmount).toBeNull();
    expect(out.guestName).toBe('Ana');
  });

  it('wrong value types are malformed', () => {
    const payload = payloadJson();
    const expenses = payload.expenses as Obj[];
    const broken = { ...payload, expenses: [{ ...expenses[0], cost: 'free' }] };
    expect(err(envelope(broken))).toEqual({ kind: 'Malformed' });
  });

  it('null and missing optional values fall back to defaults', () => {
    const payload = {
      incomes: [
        {
          id: 'i',
          title: 'T',
          amount: 1,
          currency: 'USD',
          dateMillis: 5,
          note: null,
        },
      ],
    };
    const income = ok(envelope(payload)).payload.incomes[0];
    expect(income.note).toBeNull();
    expect(income.createdAtMillis).toBe(0);
  });

  it('large dataset encodes and decodes quickly', () => {
    const rows = Array.from({ length: 20_000 }, (_, i) =>
      fx.expense({
        id: `e${i + 1}`,
        creditCardId: null,
        subscriptionId: null,
        categoryId: null,
      }),
    );
    const started = Date.now();
    const text = encode(fx.payload({ expenses: rows }));
    expect(ok(text).payload.expenses).toHaveLength(20_000);
    expect(Date.now() - started).toBeLessThan(15_000);
  });
});
