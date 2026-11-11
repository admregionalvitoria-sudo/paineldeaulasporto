import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { GESTAO_ROLES } from '../utils/administrativo';

export function useAdministrativo<T extends { id: string }>(name: 'agendaPorto' | 'prioridadesLimpeza', enabled = true) {
  const { temPermissao } = useAuth();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  useEffect(() => {
    setItems([]);
    setError('');
    setLoading(enabled);
    if (!enabled) return;
    return onSnapshot(collection(db, 'porto', 'dados', name), snapshot => {
      setItems(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as T)));
      setLoading(false);
      setError('');
    }, () => { setError('Não foi possível carregar os dados. Verifique sua conexão e permissão de acesso.'); setLoading(false); });
  }, [name, enabled]);
  function checkPermission() {
    if (!auth.currentUser || !temPermissao(GESTAO_ROLES)) throw new Error('Entre com uma conta autorizada para salvar alterações.');
    if (!navigator.onLine) throw new Error('Conecte-se à internet para salvar alterações.');
  }
  async function save(value: Omit<T, 'id'>, id?: string) {
    checkPermission();
    const { id: _id, ...fields } = value as T;
    const payload = { ...fields, atualizadoEm: serverTimestamp(), atualizadoPor: auth.currentUser!.uid };
    if (id) await updateDoc(doc(db, 'porto', 'dados', name, id), payload);
    else await addDoc(collection(db, 'porto', 'dados', name), payload);
  }
  async function remove(id: string) {
    checkPermission();
    await deleteDoc(doc(db, 'porto', 'dados', name, id));
  }
  return { items, loading, error, save, remove };
}
