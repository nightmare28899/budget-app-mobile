/* eslint-disable no-bitwise -- SHA-256 and UTF-8 use defined 32-bit bit operations. */
import { doubleFields } from './models';
export function encodeUtf8(s: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of s) {
    const n = char.codePointAt(0)!;
    if (n < 128) bytes.push(n);
    else if (n < 2048) bytes.push(192 | (n >> 6), 128 | (n & 63));
    else if (n < 65536)
      bytes.push(224 | (n >> 12), 128 | ((n >> 6) & 63), 128 | (n & 63));
    else
      bytes.push(
        240 | (n >> 18),
        128 | ((n >> 12) & 63),
        128 | ((n >> 6) & 63),
        128 | (n & 63),
      );
  }
  return new Uint8Array(bytes);
}
export function sha256Hex(text: string): string {
  const primes: number[] = [];
  for (let n = 2; primes.length < 64; n++)
    if (primes.every(p => n % p !== 0)) primes.push(n);
  const k = primes.map(p => ((Math.cbrt(p) % 1) * 4294967296) | 0);
  const h = primes.slice(0, 8).map(p => ((Math.sqrt(p) % 1) * 4294967296) | 0);
  const input = encodeUtf8(text);
  const data = new Uint8Array(Math.ceil((input.length + 9) / 64) * 64);
  data.set(input);
  data[input.length] = 128;
  const view = new DataView(data.buffer);
  view.setUint32(data.length - 4, input.length * 8);
  view.setUint32(data.length - 8, Math.floor(input.length / 536870912));
  const r = (n: number, b: number) => (n >>> b) | (n << (32 - b));
  const w = new Int32Array(64);
  for (let offset = 0; offset < data.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getInt32(offset + i * 4);
    for (let i = 16; i < 64; i++)
      w[i] =
        (r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10)) +
        w[i - 7] +
        (r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3)) +
        w[i - 16];
    let [a, b, c, d, e, f, g, j] = h;
    for (let i = 0; i < 64; i++) {
      const t =
        (j +
          (r(e, 6) ^ r(e, 11) ^ r(e, 25)) +
          ((e & f) ^ (~e & g)) +
          k[i] +
          w[i]) |
        0;
      const u =
        ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      j = g;
      g = f;
      f = e;
      e = (d + t) | 0;
      d = c;
      c = b;
      b = a;
      a = (t + u) | 0;
    }
    [a, b, c, d, e, f, g, j].forEach((v, i) => {
      h[i] = (h[i] + v) | 0;
    });
  }
  return h.map(n => (n >>> 0).toString(16).padStart(8, '0')).join('');
}
export type JsonNode =
  | { type: 'obj'; members: [string, JsonNode][] }
  | { type: 'array'; items: JsonNode[] }
  | { type: 'value'; value: unknown; raw?: string };
/** Retains numeric lexemes: JSON.parse would turn Kotlin's 3000.0 into 3000 and invalidate its checksum. */
export function parseJson(text: string): JsonNode {
  let i = 0;
  const ws = () => {
    while (/\s/.test(text[i] ?? '') && i < text.length) i++;
  };
  const string = () => {
    const start = i++;
    while (i < text.length) {
      if (text[i++] === '"') return JSON.parse(text.slice(start, i)) as string;
      if (text[i - 1] === '\\') i++;
    }
    throw Error('json');
  };
  const read = (depth = 0): JsonNode => {
    if (depth > 100) throw Error('depth');
    ws();
    const c = text[i];
    if (c === '{') {
      i++;
      ws();
      const members: [string, JsonNode][] = [];
      if (text[i] !== '}')
        while (true) {
          ws();
          if (text[i] !== '"') throw Error('key');
          const key = string();
          ws();
          if (text[i++] !== ':') throw Error('colon');
          if (members.some(([k]) => k === key)) throw Error('duplicate key');
          members.push([key, read(depth + 1)]);
          ws();
          if (text[i] !== ',') break;
          i++;
        }
      if (text[i++] !== '}') throw Error('object');
      return { type: 'obj', members };
    }
    if (c === '[') {
      i++;
      ws();
      const items: JsonNode[] = [];
      if (text[i] !== ']')
        while (true) {
          items.push(read(depth + 1));
          ws();
          if (text[i] !== ',') break;
          i++;
        }
      if (text[i++] !== ']') throw Error('array');
      return { type: 'array', items };
    }
    if (c === '"') return { type: 'value', value: string() };
    const match =
      /^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(
        text.slice(i),
      );
    if (!match) throw Error('value');
    i += match[0].length;
    const value: unknown = JSON.parse(match[0]);
    if (typeof value === 'number' && !Number.isFinite(value))
      throw Error('finite');
    return {
      type: 'value',
      value,
      raw: typeof value === 'number' ? match[0] : undefined,
    };
  };
  const result = read();
  ws();
  if (i !== text.length) throw Error('trailing');
  return result;
}
export function renderJson(n: JsonNode): string {
  return n.type === 'obj'
    ? `{${n.members
        .map(([k, v]) => `${JSON.stringify(k)}:${renderJson(v)}`)
        .join(',')}}`
    : n.type === 'array'
    ? `[${n.items.map(renderJson).join(',')}]`
    : n.raw ?? JSON.stringify(n.value);
}
export const checksumOf = (n: JsonNode) => sha256Hex(renderJson(n));
export function formatKotlinDouble(n: number): string {
  if (!Number.isFinite(n)) throw Error('finite');
  if (Object.is(n, -0)) return '-0.0';
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e7 || abs < 1e-3)) {
    const [a, b] = n.toExponential().split('e');
    return `${a.includes('.') ? a : a + '.0'}E${Number(b)}`;
  }
  return Number.isInteger(n) ? n.toFixed(1) : String(n);
}
export function renderPayload(value: unknown, key = ''): string {
  if (value === null) return 'null';
  if (typeof value === 'number')
    return doubleFields.has(key) ? formatKotlinDouble(value) : String(value);
  if (Array.isArray(value))
    return `[${value.map(v => renderPayload(v)).join(',')}]`;
  if (typeof value === 'object')
    return `{${Object.entries(value as object)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${JSON.stringify(k)}:${renderPayload(v, k)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
