import { expect, it, vi } from 'vitest';
import { initializeApp, deleteApp } from 'firebase/app';
import { collection, getDocsFromCache, terminate } from 'firebase/firestore';
import { inicializarFirestoreComCache } from '../utils/firestoreCache';

it('o SDK real usa memória quando detecta persistência incompatível ao iniciar a primeira leitura', async () => {
  // Somente leitura local; este teste não conecta a um projeto Firebase.
  // Seleciona persistentLocalCache; no runtime Node do teste, o SDK detecta
  // a falta de suporte na inicialização assíncrona e troca por memória.
  vi.stubGlobal('window', { indexedDB: {} });
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const app = initializeApp({ projectId: 'teste-cache-local' }, 'teste-cache-local');
  const db = inicializarFirestoreComCache(app, 'banco-porto');
  try {
    const resultado = await getDocsFromCache(collection(db, 'aulas'));
    expect(resultado.empty).toBe(true);
    expect(resultado.metadata.fromCache).toBe(true);
    expect(warn.mock.calls.flat().join(' ')).toContain('Falling back to memory cache');
  } finally {
    await terminate(db);
    await deleteApp(app);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }
});
