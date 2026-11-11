import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  initializeFirestore: vi.fn(), persistentLocalCache: vi.fn(),
  persistentMultipleTabManager: vi.fn(), memoryLocalCache: vi.fn(),
}));
vi.mock('firebase/firestore', () => sdk);
import { inicializarFirestoreComCache } from '../utils/firestoreCache';

beforeEach(() => {
  vi.resetAllMocks();
  sdk.initializeFirestore.mockReturnValue('db');
  sdk.memoryLocalCache.mockReturnValue('memory');
  sdk.persistentLocalCache.mockReturnValue('persistent');
  sdk.persistentMultipleTabManager.mockReturnValue('tabs');
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('inicialização do cache Firestore', () => {
  it('usa persistência entre abas e preserva o banco nomeado', () => {
    vi.stubGlobal('window', { indexedDB: {} });
    expect(inicializarFirestoreComCache({}, 'banco-porto')).toBe('db');
    expect(sdk.persistentLocalCache).toHaveBeenCalledWith({ tabManager: 'tabs' });
    expect(sdk.initializeFirestore).toHaveBeenCalledWith({}, { localCache: 'persistent' }, 'banco-porto');
  });

  it.each([undefined, {}])('não lança sem IndexedDB ou em SSR (%s)', window => {
    vi.stubGlobal('window', window);
    expect(() => inicializarFirestoreComCache({})).not.toThrow();
    expect(sdk.initializeFirestore).toHaveBeenCalledWith({}, { localCache: 'memory' }, '(default)');
  });

  it('não lança se acessar IndexedDB for proibido', () => {
    vi.stubGlobal('window', { get indexedDB() { throw new Error('SecurityError'); } });
    expect(() => inicializarFirestoreComCache({})).not.toThrow();
    expect(sdk.memoryLocalCache).toHaveBeenCalledOnce();
  });

  it('cai para memória se inicializar persistência lançar', () => {
    vi.stubGlobal('window', { indexedDB: {} });
    sdk.initializeFirestore.mockImplementationOnce(() => { throw new Error('IndexedDB indisponível'); });
    expect(() => inicializarFirestoreComCache({}, 'banco-porto')).not.toThrow();
    expect(sdk.initializeFirestore).toHaveBeenLastCalledWith({}, { localCache: 'memory' }, 'banco-porto');
  });
});
