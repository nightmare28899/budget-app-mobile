import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  BackupError,
  BackupFile,
  BackupLimits,
  BackupPayload,
  defaults,
  DEFAULT_LIMITS,
  emptyPayload,
  entities,
} from './models';
import {
  checksumOf,
  encodeUtf8,
  parseJson,
  renderJson,
  renderPayload,
  sha256Hex,
} from './json';
type Row = Record<string, string | number | boolean | null>;
const templates = [
  defaults.BackupCategory,
  defaults.BackupCreditCard,
  defaults.BackupSubscription,
  defaults.BackupExpense,
  defaults.BackupIncome,
  defaults.BackupSavingsGoal,
  defaults.BackupSavingsTransaction,
];
export function clean(raw: string, max: number, newlines = false): string {
  let s = raw
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/\n/g, newlines ? '\n' : ' ')
    .replace(
      // eslint-disable-next-line no-control-regex
      /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\u2060\ufeff\u2028\u2029]/g,
      c => (c === '\n' && newlines ? '\n' : ''),
    )
    .trim();
  if (s.length > max) {
    let end = max;
    if (/[\ud800-\udbff]/.test(s[end - 1])) end--;
    s = s.slice(0, end).trimEnd();
  }
  return s;
}
const text = (s: unknown, max: number, newlines = false) =>
  typeof s === 'string' ? clean(s, max, newlines) || null : null;
const id = (s: unknown) => {
  const v = text(s, 129);
  return v && v.length <= 128 ? v : null;
};
const currency = (s: unknown) => {
  const v = typeof s === 'string' ? s.trim().toUpperCase() : '';
  return /^[A-Z]{3}$/.test(v) ? v : null;
};
const amount = (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e12;
const optionalAmount = (v: unknown) =>
  amount(v) && (v as number) >= 0 ? v : null;
const date = (v: unknown) =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 4102444800000;
const iso = (value: unknown): string | null => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
    ? value
    : null;
};
const known = (v: unknown, allowed: unknown[]) =>
  typeof v === 'string' && allowed.includes(v.trim()) ? v.trim() : null;
function hydrate(raw: unknown, template: object): Row {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw { kind: 'Malformed' };
  const out: Row = {};
  for (const [k, v] of Object.entries(template)) {
    const value = (raw as Row)[k];
    if (value === undefined || value === null) {
      out[k] = v;
      continue;
    }
    const type =
      v === null
        ? /Amount|Limit/.test(k) ||
          /Day|Days/.test(k) ||
          ['installmentCount', 'installmentIndex'].includes(k)
          ? 'number'
          : k === 'dynamicColor'
          ? 'boolean'
          : 'string'
        : typeof v;
    if (
      typeof value !== type ||
      (type === 'number' &&
        (!Number.isFinite(value) ||
          (!/cost|amount|Amount|Limit/.test(k) &&
            !Number.isSafeInteger(value))))
    )
      throw { kind: 'Malformed' };
    out[k] = value;
  }
  return out;
}
export function sanitizePayload(raw: Record<string, unknown>): BackupPayload {
  const out = emptyPayload();
  for (const [index, entity] of entities.entries()) {
    const input = raw[entity] ?? [];
    if (!Array.isArray(input)) throw { kind: 'Malformed' };
    const goalIds =
      entity === 'savingsTransactions'
        ? new Set(out.savingsGoals.map(g => g.id))
        : null;
    const seen = new Set<string>();
    const rows = input.map(value => {
      const r = hydrate(value, templates[index]);
      const rid = id(r.id);
      const invalid = (reason: string): never => {
        throw {
          kind: 'InvalidRow',
          entity,
          id: rid ?? String(r.id).slice(0, 20),
          reason,
        };
      };
      if (!rid) invalid('missing id');
      if (seen.has(rid!)) throw { kind: 'DuplicateId', entity, id: rid };
      seen.add(rid!);
      r.id = rid;
      for (const key of Object.keys(r)) {
        const v = r[key];
        if (key === 'id') continue;
        if (key.endsWith('Id')) r[key] = id(v);
        else if (key === 'createdAtMillis' || key === 'updatedAtMillis')
          r[key] = Math.min(4102444800000, Math.max(0, v as number));
        else if (key === 'dateMillis') {
          if (!date(v)) invalid(key);
        } else if (['nextPaymentEpochDay', 'anchorEpochDay'].includes(key)) {
          if (typeof v !== 'number' || v < 0 || v > 800000) invalid(key);
        } else if (key === 'targetEpochDay')
          r[key] = typeof v === 'number' && v >= 0 && v <= 800000 ? v : null;
        else if (
          ['cost', 'amount', 'targetAmount', 'currentAmount'].includes(key)
        ) {
          if (!amount(v)) invalid(key);
        } else if (
          ['budgetAmount', 'creditLimit', 'installmentTotalAmount'].includes(
            key,
          )
        )
          r[key] = optionalAmount(v) as number | null;
        else if (key === 'currency') {
          r[key] = currency(v);
          if (entity !== 'creditCards' && !r[key]) invalid(key);
        } else if (['name', 'title', 'billingCycle'].includes(key)) {
          r[key] = text(
            v,
            entity === 'categories' || entity === 'creditCards'
              ? 100
              : key === 'billingCycle'
              ? 32
              : 200,
          );
          if (!r[key]) invalid(key);
        } else if (key === 'last4')
          r[key] = String(v)
            .replace(/[^0-9]/g, '')
            .slice(0, 4);
        else if (['closingDay', 'paymentDueDay'].includes(key))
          r[key] = typeof v === 'number' && v >= 1 && v <= 31 ? v : null;
        else if (['installmentCount', 'installmentIndex'].includes(key))
          r[key] = typeof v === 'number' && v >= 1 && v <= 1000 ? v : null;
        else if (key === 'reminderDays')
          r[key] = Math.min(365, Math.max(0, v as number));
        else if (key === 'paymentMethod')
          r[key] = known(v, ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'TRANSFER']);
        else if (key === 'note') r[key] = text(v, 2000, true);
        else if (key === 'logoUrl') {
          const url = text(v, 2049);
          r[key] =
            url && url.length <= 2048 && /^https?:\/\//i.test(url) ? url : null;
        } else if (key === 'bank' || key === 'brand') {
          r[key] = text(v, key === 'bank' ? 100 : 32) ?? '';
        } else if (typeof v === 'string')
          r[key] = text(
            v,
            ['brand', 'color', 'hexColor'].includes(key)
              ? 32
              : ['bank', 'icon'].includes(key)
              ? 100
              : 200,
          );
      }
      if (entity === 'savingsTransactions') {
        if (!goalIds!.has(r.goalId as string)) invalid('unknown goal');
        r.type = String(r.type).toUpperCase();
        if (!['DEPOSIT', 'WITHDRAW'].includes(r.type as string))
          invalid('type');
      }
      return r;
    });
    (out[entity] as unknown[]) = rows;
  }
  if (raw.settings != null) {
    const s = hydrate(raw.settings, defaults.BackupSettings);
    s.themeMode = known(s.themeMode, [
      'system',
      'light',
      'dark',
      'custom-1',
      'custom-2',
      'custom-3',
    ]);
    s.language = known(s.language, ['en', 'es']);
    s.currency = currency(s.currency);
    s.budgetAmount = optionalAmount(s.budgetAmount) as number | null;
    s.budgetPeriod = known(s.budgetPeriod, [
      'daily',
      'weekly',
      'monthly',
      'annual',
      'period',
    ]);
    s.budgetPeriodStart = iso(s.budgetPeriodStart);
    s.budgetPeriodEnd = iso(s.budgetPeriodEnd);
    s.guestName = text(s.guestName, 100);
    s.reminderLeadDays = [0, 1, 3].includes(s.reminderLeadDays as number)
      ? s.reminderLeadDays
      : null;
    out.settings = s as unknown as BackupPayload['settings'];
  }
  return out;
}
export function encodeBackup(
  payload: BackupPayload,
  appVersion: string,
  createdAtMillis: number,
): string {
  const ordered: Record<string, unknown> = {};
  entities.forEach((e, i) => {
    ordered[e] = payload[e].map(row => ({ ...templates[i], ...row }));
  });
  if (payload.settings)
    ordered.settings = { ...defaults.BackupSettings, ...payload.settings };
  const body = renderPayload(ordered);
  return `{"format":${JSON.stringify(
    BACKUP_FORMAT,
  )},"schemaVersion":1,"appVersion":${JSON.stringify(
    appVersion,
  )},"createdAtMillis":${createdAtMillis},"counts":${JSON.stringify(
    Object.fromEntries(entities.map(e => [e, payload[e].length])),
  )},"sha256":"${sha256Hex(body)}","payload":${body}}`;
}
export function decodeBackup(
  textValue: string,
  limits: BackupLimits = DEFAULT_LIMITS,
): { ok: true; file: BackupFile } | { ok: false; error: BackupError } {
  const fail = (error: BackupError) => ({ ok: false as const, error });
  if (encodeUtf8(textValue).length > limits.maxFileBytes)
    return fail({ kind: 'TooLarge', maxBytes: limits.maxFileBytes });
  try {
    const node = parseJson(textValue.replace(/^\ufeff+/, ''));
    const raw = JSON.parse(renderJson(node));
    if (node.type !== 'obj' || raw.format !== BACKUP_FORMAT)
      return fail({ kind: 'NotABackup' });
    if (!Number.isInteger(raw.schemaVersion) || raw.schemaVersion < 1)
      return fail({ kind: 'Malformed' });
    if (raw.schemaVersion > BACKUP_SCHEMA_VERSION)
      return fail({
        kind: 'NewerSchema',
        found: raw.schemaVersion,
        supported: 1,
      });
    const pn = node.members.find(([k]) => k === 'payload')?.[1];
    if (!pn || pn.type !== 'obj') return fail({ kind: 'Malformed' });
    if (
      typeof raw.sha256 !== 'string' ||
      raw.sha256.toLowerCase() !== checksumOf(pn)
    )
      return fail({ kind: 'ChecksumMismatch' });
    for (const [key, value] of Object.entries(raw.payload)) {
      if (
        !(entities as readonly string[]).includes(key) &&
        key !== 'settings' &&
        Array.isArray(value) &&
        value.length > 0
      )
        return fail({ kind: 'UnsupportedEntity' });
    }
    let total = 0;
    for (const e of entities) {
      const rows = raw.payload[e] ?? [];
      if (!Array.isArray(rows)) return fail({ kind: 'Malformed' });
      total += rows.length;
      if (Number.isInteger(raw.counts?.[e]) && raw.counts[e] !== rows.length)
        return fail({ kind: 'CountMismatch', entity: e });
    }
    if (total > limits.maxRows)
      return fail({ kind: 'TooManyRows', max: limits.maxRows });
    const payload = sanitizePayload(raw.payload);
    return {
      ok: true,
      file: {
        schemaVersion: raw.schemaVersion,
        appVersion:
          typeof raw.appVersion === 'string'
            ? raw.appVersion.slice(0, 100)
            : '',
        createdAtMillis: Number.isSafeInteger(raw.createdAtMillis)
          ? raw.createdAtMillis
          : 0,
        payload,
      },
    };
  } catch (error) {
    return fail(
      error && typeof error === 'object' && 'kind' in error
        ? (error as BackupError)
        : { kind: 'Malformed' },
    );
  }
}
