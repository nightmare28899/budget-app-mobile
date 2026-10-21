/* eslint-disable no-bitwise -- UTF-8 code point decoding requires bit operations. */
export const backupFileName = (date: Date) =>
  `budgetapp-backup-${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.json`;
export async function readUtf8Bounded(
  reader: { read: () => Promise<Uint8Array | null> },
  max: number,
): Promise<string | null> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk === null) break;
    size += chunk.length;
    if (size > max) return null;
    chunks.push(chunk);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  chunks.forEach(c => {
    bytes.set(c, offset);
    offset += c.length;
  });
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const a = bytes[i++];
    let n = a;
    if (a >= 240)
      n =
        ((a & 7) << 18) |
        ((bytes[i++] & 63) << 12) |
        ((bytes[i++] & 63) << 6) |
        (bytes[i++] & 63);
    else if (a >= 224)
      n = ((a & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    else if (a >= 192) n = ((a & 31) << 6) | (bytes[i++] & 63);
    out += String.fromCodePoint(n);
  }
  return out;
}
