import { Platform } from 'react-native';
import {
  exportBackupFile,
  importBackupFile,
} from '../../../src/services/backupFiles';
import { DEFAULT_LIMITS } from '../../../src/modules/backup';
import { FileSystem } from 'react-native-file-access';
import {
  pick,
  saveDocuments,
  releaseSecureAccess,
} from '@react-native-documents/picker';
jest.mock('react-native-file-access', () => ({
  Dirs: { CacheDir: '/cache' },
  FileSystem: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    cp: jest.fn(),
  },
}));
jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(),
  saveDocuments: jest.fn(),
  releaseSecureAccess: jest.fn(),
  isErrorWithCode: () => false,
  errorCodes: { OPERATION_CANCELED: 'cancelled' },
}));
const mockPick = pick as jest.Mock;
const mockSave = saveDocuments as jest.Mock;
const stat = FileSystem.stat as jest.Mock;
const read = FileSystem.readFile as jest.Mock;
beforeEach(() => {
  jest.clearAllMocks();
  (FileSystem.unlink as jest.Mock).mockResolvedValue(undefined);
  (releaseSecureAccess as jest.Mock).mockResolvedValue(null);
  mockSave.mockResolvedValue([{ uri: 'file:///saved.json', error: null }]);
  mockPick.mockResolvedValue([
    { uri: 'file:///selected.json', size: 5, error: null, isVirtual: false },
  ]);
  stat.mockResolvedValue({ size: 5 });
  read.mockResolvedValue('{"x":1}');
});
describe('backup file safety', () => {
  it('cleans export temporary directory after saving', async () => {
    await exportBackupFile('{}');
    expect(FileSystem.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('budgetapp-backup-'),
      '{}',
      'utf8',
    );
    expect(FileSystem.unlink).toHaveBeenCalledWith(
      expect.stringMatching(/^\/cache\/budget-backup-/),
    );
  });
  it('cleans export temporary directory even when picker rejects', async () => {
    mockSave.mockRejectedValueOnce(Error('cancelled'));
    await expect(exportBackupFile('{}')).rejects.toThrow('cancelled');
    expect(FileSystem.unlink).toHaveBeenCalledTimes(1);
  });
  it('does not report an export with per-file error as success', async () => {
    mockSave.mockResolvedValueOnce([
      { uri: 'file:///saved.json', error: 'no space' },
    ]);
    await expect(exportBackupFile('{}')).rejects.toThrow('WriteFailed');
    expect(FileSystem.unlink).toHaveBeenCalledTimes(1);
  });
  it('does not mask a successful save or a primary error when cleanup fails', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      (FileSystem.unlink as jest.Mock).mockRejectedValueOnce(Error('cleanup'));
      await expect(exportBackupFile('{}')).resolves.toBeUndefined();
      (FileSystem.unlink as jest.Mock).mockRejectedValueOnce(Error('cleanup'));
      mockSave.mockRejectedValueOnce(Error('primary'));
      await expect(exportBackupFile('{}')).rejects.toThrow('primary');
    } finally {
      warning.mockRestore();
    }
  });
  it('uses unique temporary directories', async () => {
    await exportBackupFile('{}');
    await exportBackupFile('{}');
    expect((FileSystem.mkdir as jest.Mock).mock.calls[0][0]).not.toEqual(
      (FileSystem.mkdir as jest.Mock).mock.calls[1][0],
    );
  });
  it('checks picker size before any stat or read', async () => {
    mockPick.mockResolvedValueOnce([
      { uri: 'file:///large.json', size: DEFAULT_LIMITS.maxFileBytes + 1 },
    ]);
    await expect(importBackupFile()).rejects.toThrow('TooLarge');
    expect(stat).not.toHaveBeenCalled();
    expect(read).not.toHaveBeenCalled();
  });
  it('checks actual stat when provider metadata omits size', async () => {
    mockPick.mockResolvedValueOnce([{ uri: 'file:///large.json', size: null }]);
    stat.mockResolvedValueOnce({ size: DEFAULT_LIMITS.maxFileBytes + 1 });
    await expect(importBackupFile()).rejects.toThrow('TooLarge');
    expect(read).not.toHaveBeenCalled();
  });
  it('reads only a completed bounded private copy and cleans it', async () => {
    await expect(importBackupFile()).resolves.toBe('{"x":1}');
    expect(FileSystem.cp).toHaveBeenCalledWith(
      '/selected.json',
      expect.stringMatching(/^\/cache\/budget-import-.*\/import.json$/),
    );
    expect(read).toHaveBeenCalledWith(
      expect.stringMatching(/^\/cache\/budget-import-.*\/import.json$/),
      'utf8',
    );
    expect(FileSystem.unlink).toHaveBeenCalledTimes(1);
  });
  it('rejects a copied file that grew beyond the limit, before reading into RAM', async () => {
    stat
      .mockResolvedValueOnce({ size: 5 })
      .mockResolvedValueOnce({ size: DEFAULT_LIMITS.maxFileBytes + 1 });
    await expect(importBackupFile()).rejects.toThrow('TooLarge');
    expect(read).not.toHaveBeenCalled();
    expect(FileSystem.unlink).toHaveBeenCalledTimes(1);
  });
  it('rejects incomplete or changed copies before decoding', async () => {
    stat.mockResolvedValueOnce({ size: 10 }).mockResolvedValueOnce({ size: 5 });
    await expect(importBackupFile()).rejects.toThrow('ReadFailed');
    expect(read).not.toHaveBeenCalled();
    expect(FileSystem.unlink).toHaveBeenCalledTimes(1);
  });
  it('releases iOS security access after read failure', async () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    try {
      read.mockRejectedValueOnce(Error('read'));
      await expect(importBackupFile()).rejects.toThrow('read');
      expect(releaseSecureAccess).toHaveBeenCalledWith([
        'file:///selected.json',
      ]);
    } finally {
      Object.defineProperty(Platform, 'OS', {
        value: original,
        configurable: true,
      });
    }
  });
});
