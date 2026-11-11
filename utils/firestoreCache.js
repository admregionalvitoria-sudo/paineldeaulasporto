import { initializeFirestore, memoryLocalCache, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

export function inicializarFirestoreComCache(app, databaseId = '(default)') {
  try {
    // SSR e ambientes sem IndexedDB usam memória desde o início.
    if (typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined') {
      return initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      }, databaseId);
    }
  } catch (error) {
    console.warn('Cache persistente indisponível; usando memória.', error);
  }
  // Falhas assíncronas ao abrir IndexedDB também são tratadas pelo próprio SDK,
  // que inicia seu cache de memória sem substituir a instância do Firestore.
  return initializeFirestore(app, { localCache: memoryLocalCache() }, databaseId);
}
