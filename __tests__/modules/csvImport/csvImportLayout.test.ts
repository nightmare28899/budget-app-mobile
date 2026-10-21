import { csvImportTwoPane } from '../../../src/modules/csvImport/csvImportLayout';

describe('csvImportTwoPane', () => {
    it('is single pane on phones and two pane on folds and tablets', () => {
        expect(csvImportTwoPane(360, 1)).toBe(false);
        expect(csvImportTwoPane(600, 1)).toBe(false);
        expect(csvImportTwoPane(840, 1)).toBe(true);
        expect(csvImportTwoPane(1200, 1)).toBe(true);
    });

    it('collapses to a single pane with large text', () => {
        expect(csvImportTwoPane(840, 1.5)).toBe(false);
    });

    it('falls back to a single pane for unusable measurements', () => {
        expect(csvImportTwoPane(NaN, 1)).toBe(false);
        expect(csvImportTwoPane(0, 1)).toBe(false);
    });
});
