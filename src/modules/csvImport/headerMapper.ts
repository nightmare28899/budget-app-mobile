import type { ColumnMapping, CsvField } from './csvTypes';

const BOM = '﻿';

const ALIASES: ReadonlyArray<readonly [CsvField, readonly string[]]> = [
    ['date', ['date', 'fecha', 'transaction date', 'fecha operacion', 'fecha de operacion', 'fecha de transaccion', 'posted', 'posted date', 'booking date', 'dia', 'day']],
    ['title', ['description', 'title', 'concepto', 'descripcion', 'detalle', 'detalles', 'details', 'name', 'nombre', 'memo', 'payee', 'titulo', 'referencia', 'reference']],
    ['debit', ['debit', 'debito', 'cargo', 'cargos', 'retiro', 'retiros', 'withdrawal', 'withdrawals']],
    ['credit', ['credit', 'credito', 'abono', 'abonos', 'deposito', 'depositos', 'deposit', 'deposits']],
    ['amount', ['amount', 'monto', 'importe', 'valor', 'total', 'cost', 'costo', 'precio', 'price', 'cantidad']],
    ['currency', ['currency', 'moneda', 'divisa', 'curr', 'ccy']],
    ['category', ['category', 'categoria', 'rubro']],
    ['note', ['note', 'notes', 'nota', 'notas', 'comment', 'comments', 'comentario', 'comentarios', 'observaciones']],
    ['merchant', ['merchant', 'comercio', 'establecimiento', 'vendor', 'store', 'tienda', 'negocio']],
];

/** Lowercases, strips accents and the BOM and reduces everything but letters and digits to single spaces. */
export function normalizeHeader(header: string): string {
    const lowered = header.split(BOM).join('').toLowerCase();
    const folded = lowered.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return folded.replace(/[^a-z0-9]+/g, ' ').trim();
}

export function autoMapHeaders(headers: string[]): ColumnMapping {
    const normalized = headers.map(normalizeHeader);
    const result: ColumnMapping = {};
    const used = new Set<number>();

    const assign = (field: CsvField, aliases: readonly string[], matches: (h: string, a: string) => boolean) => {
        if (result[field] !== undefined) {
            return;
        }
        const index = normalized.findIndex(
            (h, i) => !used.has(i) && h.length > 0 && aliases.some((a) => matches(h, a)),
        );
        if (index >= 0) {
            result[field] = index;
            used.add(index);
        }
    };

    // Exact header matches claim their column first, then a whole word inside a longer header.
    for (const [field, aliases] of ALIASES) {
        assign(field, aliases, (h, a) => h === a);
    }
    for (const [field, aliases] of ALIASES) {
        assign(field, aliases, (h, a) => a.length >= 4 && h.split(' ').includes(a));
    }
    // A lone "debit" column is really the amount column.
    if (result.debit !== undefined && result.credit === undefined && result.amount === undefined) {
        result.amount = result.debit;
        delete result.debit;
    }
    return result;
}

export function looksLikeHeader(row: string[]): boolean {
    return Object.keys(autoMapHeaders(row)).length >= 2;
}

/** A date plus an amount (or a debit/credit split) is the minimum needed to import. */
export function isMappingUsable(mapping: ColumnMapping): boolean {
    return (
        mapping.date !== undefined
        && (mapping.amount !== undefined || mapping.debit !== undefined || mapping.credit !== undefined)
    );
}

/** Maps `field` to `column` (null clears it); a column can only feed one field, so it is taken from any other. */
export function withMapping(mapping: ColumnMapping, field: CsvField, column: number | null): ColumnMapping {
    const next: ColumnMapping = { ...mapping };
    delete next[field];
    if (column !== null) {
        (Object.keys(next) as CsvField[]).forEach((key) => {
            if (next[key] === column) {
                delete next[key];
            }
        });
        next[field] = column;
    }
    return next;
}
