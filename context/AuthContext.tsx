import React, { createContext, useState, useEffect, useRef, ReactNode, useContext } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser, getAuth } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { doc, getDocFromServer, getDocFromCache, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../firebase';
import { UserProfile, UserRole, AuthContextType } from '../types';
import { perfilAutorizado, permitePapel, mensagemErroLogin, PAPEIS_VALIDOS, SEM_ACESSO } from '../utils/autorizacao';

export interface ExtendedAuthContextType extends AuthContextType {
  criarUsuario: (nome: string, email: string, pass: string, role: UserRole) => Promise<UserProfile>;
  excluirUsuario: (uid: string) => Promise<void>;
}
const AuthContext = createContext<ExtendedAuthContextType | undefined>(undefined);
const SESSION_STORAGE_KEY = 'porto_session_user';
function getSecondaryAuth() {
  const name = 'SecondaryAuthApp';
  return getAuth(getApps().find(a => a.name === name) || initializeApp(firebaseConfig, name));
}
async function carregarPerfil(user: FirebaseUser): Promise<UserProfile> {
  const referencia = doc(db, 'porto', 'dados', 'usuarios', user.uid);
  let snapshot;
  try {
    snapshot = await getDocFromServer(referencia);
  } catch (erroServidor) {
    // Sem rede ou com a cota do banco esgotada, vale o perfil já baixado neste aparelho.
    try { snapshot = await getDocFromCache(referencia); }
    catch { throw erroServidor; }
  }
  const perfil = snapshot.exists() ? { ...snapshot.data(), uid: user.uid, email: user.email || '' } as UserProfile : null;
  if (!perfilAutorizado(user.uid, perfil)) throw new Error(SEM_ACESSO);
  return perfil;
}
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const loginEmCurso = useRef(false);
  const usuarioAtual = perfilAutorizado(auth.currentUser?.uid, perfil) ? perfil : null;
  const persistUserSession = (user: UserProfile | null) => {
    setPerfil(user);
    try {
      if (user) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
      else localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch { /* Armazenamento local não concede acesso. */ }
  };
  useEffect(() => {
    let versao = 0;
    const unsub = onAuthStateChanged(auth, async user => {
      const atual = ++versao;
      // O login explícito valida o perfil e mantém a tela montada para mostrar erros.
      if (loginEmCurso.current) return;
      setLoading(true);
      persistUserSession(null);
      if (!user) { setLoading(false); return; }
      try {
        const novoPerfil = await carregarPerfil(user);
        if (atual === versao && auth.currentUser?.uid === user.uid) persistUserSession(novoPerfil);
      } catch (erro: any) {
        if (atual === versao && auth.currentUser?.uid === user.uid) {
          persistUserSession(null);
          // Só encerra a sessão quando a conta realmente não tem acesso; falha de rede não desloga.
          if (erro?.message === SEM_ACESSO) await signOut(auth).catch(() => {});
        }
      } finally { if (atual === versao) setLoading(false); }
    });
    return () => { versao++; unsub(); };
  }, []);
  const login = async (email: string, pass: string) => {
    loginEmCurso.current = true;
    persistUserSession(null);
    let autenticado: FirebaseUser | undefined;
    try {
      const credencial = await signInWithEmailAndPassword(auth, email.trim(), pass);
      autenticado = credencial.user;
      const novoPerfil = await carregarPerfil(autenticado);
      if (auth.currentUser?.uid !== autenticado.uid) throw new Error(SEM_ACESSO);
      persistUserSession(novoPerfil);
    } catch (erro: any) {
      persistUserSession(null);
      if (autenticado && auth.currentUser?.uid === autenticado.uid) await signOut(auth).catch(() => {});
      throw new Error(mensagemErroLogin(erro));
    } finally { loginEmCurso.current = false; setLoading(false); }
  };
  const logout = async () => {
    persistUserSession(null);
    await signOut(auth);
  };
  const temPermissao = (papeis: UserRole[]) => !loading && permitePapel(auth.currentUser?.uid, usuarioAtual, papeis);
  const exigirAdmin = async (role?: UserRole) => {
    const user = auth.currentUser;
    if (!user) throw new Error(SEM_ACESSO);
    const atual = await carregarPerfil(user);
    if (auth.currentUser?.uid !== user.uid || !['admin', 'super_admin'].includes(atual.role)) throw new Error(SEM_ACESSO);
    if (role !== undefined && (!PAPEIS_VALIDOS.includes(role) || (role === 'super_admin' && atual.role !== 'super_admin'))) throw new Error('Sem permissão para conceder este papel.');
    return atual;
  };
  const criarUsuario = async (nome: string, email: string, pass: string, role: UserRole): Promise<UserProfile> => {
    const caller = await exigirAdmin(role);
    const cleanEmail = email.trim().toLowerCase();
    const cleanNome = nome.trim();

    // 1. Tenta criar pelo backend API
    try {
      const currentUser = auth.currentUser;
      const idToken = currentUser ? await currentUser.getIdToken() : '';
      const response = await fetch('/api/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ nome: cleanNome, email: cleanEmail, password: pass, role })
      });

      if (response.ok) {
        const data = await response.json();
        return data.usuario;
      }
      if (response.status < 500) throw Object.assign(new Error('Não foi possível criar a conta. Verifique os dados e suas permissões.'), { semFallback: true });
    } catch (apiErr: any) {
      if (apiErr.semFallback) throw apiErr;
      console.warn("Backend /api/usuarios indisponível, usando criação via client SDK:", apiErr);
    }

    // 2. Fallback via Secondary Auth App
    try {
      await exigirAdmin(role);
      const secAuth = getSecondaryAuth();
      const userCredential = await createUserWithEmailAndPassword(secAuth, cleanEmail, pass);
      const newUid = userCredential.user.uid;

      const userDocRef = doc(db, 'porto', 'dados', 'usuarios', newUid);
      const newProfile: UserProfile = {
        uid: newUid,
        email: cleanEmail,
        nome: cleanNome,
        role,
        ativo: true,
        criadoPor: caller.email,
        criadoEm: serverTimestamp()
      };

      try {
        await exigirAdmin(role);
        await setDoc(userDocRef, newProfile);
      } finally { await signOut(secAuth); }

      return newProfile;
    } catch (secErr: any) {
      if (secErr.code === 'auth/operation-not-allowed') {
        throw new Error("O provedor 'E-mail/Senha' está desativado no Firebase. Acesse o Console do Firebase (Authentication > Sign-in method) e ative a opção 'E-mail/senha'.");
      }
      throw secErr;
    }
  };

  const excluirUsuario = async (uid: string): Promise<void> => {
    const caller = await exigirAdmin();
    if (uid === caller.uid) throw new Error('Você não pode excluir sua própria conta.');
    const alvo = await getDocFromServer(doc(db, 'porto', 'dados', 'usuarios', uid));
    if (alvo.data()?.role === 'super_admin' && caller.role !== 'super_admin') throw new Error('Sem permissão para excluir esta conta.');
    // 1. Tenta deletar pelo backend API
    try {
      const currentUser = auth.currentUser;
      const idToken = currentUser ? await currentUser.getIdToken() : '';
      const response = await fetch(`/api/usuarios?uid=${uid}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) return;
      if (response.status < 500) throw Object.assign(new Error('Não foi possível excluir a conta.'), { semFallback: true });
    } catch (apiErr: any) {
      if (apiErr.semFallback) throw apiErr;
      console.warn("Backend /api/usuarios DELETE indisponível, usando exclusão direta no Firestore:", apiErr);
    }

    await exigirAdmin();
    // 2. Exclusão direta no Firestore
    const userDocRef = doc(db, 'porto', 'dados', 'usuarios', uid);
    await deleteDoc(userDocRef);
  };

  return (
    <AuthContext.Provider value={{ usuarioAtual, loading, login, logout, temPermissao, criarUsuario, excluirUsuario }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): ExtendedAuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export { AuthContext };
