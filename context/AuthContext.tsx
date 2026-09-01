import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  getAuth
} from 'firebase/auth';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../firebase';
import { UserProfile, UserRole, AuthContextType } from '../types';

export interface ExtendedAuthContextType extends AuthContextType {
  criarUsuario: (nome: string, email: string, pass: string, role: UserRole) => Promise<UserProfile>;
}

const AuthContext = createContext<ExtendedAuthContextType | undefined>(undefined);

// App secundário para criar usuários sem deslogar o administrador atual
function getSecondaryAuth() {
  const secondaryAppName = 'SecondaryAuthApp';
  let secondaryApp;
  const existingApps = getApps();
  const found = existingApps.find(a => a.name === secondaryAppName);
  if (found) {
    secondaryApp = found;
  } else {
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  }
  return getAuth(secondaryApp);
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [usuarioAtual, setUsuarioAtual] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        setUsuarioAtual(null);
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'porto', 'dados', 'usuarios', fbUser.uid);
        const userDoc = await getDoc(userDocRef);

        const isSuperAdmin = (fbUser.email || '').toLowerCase() === 'admin@senai.br';

        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsuarioAtual({
            uid: fbUser.uid,
            email: fbUser.email || '',
            nome: data.nome || fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuário',
            role: isSuperAdmin ? 'super_admin' : ((data.role as UserRole) || 'admin'),
            ativo: data.ativo ?? true,
            criadoEm: data.criadoEm
          });
        } else {
          // Fallback para admin inicial
          const defaultProfile: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            nome: isSuperAdmin ? 'Administrador Geral SENAI' : 'Administrador',
            role: isSuperAdmin ? 'super_admin' : 'admin',
            ativo: true,
            criadoEm: serverTimestamp()
          };

          try {
            await setDoc(userDocRef, {
              email: defaultProfile.email,
              nome: defaultProfile.nome,
              role: defaultProfile.role,
              ativo: defaultProfile.ativo,
              criadoEm: serverTimestamp()
            });
          } catch (docErr) {
            console.warn("Aviso ao salvar perfil no Firestore:", docErr);
          }

          setUsuarioAtual(defaultProfile);
        }
      } catch (err) {
        console.error("Erro ao carregar perfil do usuário:", err);
        const isSuperAdmin = (fbUser.email || '').toLowerCase() === 'admin@senai.br';
        setUsuarioAtual({
          uid: fbUser.uid,
          email: fbUser.email || '',
          nome: isSuperAdmin ? 'Administrador Geral SENAI' : 'Usuário SENAI',
          role: isSuperAdmin ? 'super_admin' : 'admin',
          ativo: true
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const login = async (emailInput: string, pass: string) => {
    setLoading(true);
    const email = emailInput.trim();
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      // Se for a conta mestre admin@senai.br e o usuário ainda não existir no Firebase Auth, cria automaticamente
      if (email.toLowerCase() === 'admin@senai.br' && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-email')) {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, email, pass);
          const userDocRef = doc(db, 'porto', 'dados', 'usuarios', userCred.user.uid);
          await setDoc(userDocRef, {
            email: email,
            nome: 'Administrador Geral SENAI',
            role: 'super_admin',
            ativo: true,
            criadoEm: serverTimestamp()
          });
          setUsuarioAtual({
            uid: userCred.user.uid,
            email: email,
            nome: 'Administrador Geral SENAI',
            role: 'super_admin',
            ativo: true
          });
          return;
        } catch (createErr: any) {
          console.error("Erro ao auto-criar admin@senai.br:", createErr);
        }
      }
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUsuarioAtual(null);
  };

  const temPermissao = (papeisPermitidos: UserRole[]): boolean => {
    if (!usuarioAtual || !usuarioAtual.ativo) return false;
    if (usuarioAtual.role === 'super_admin' || usuarioAtual.email.toLowerCase() === 'admin@senai.br') return true;
    return papeisPermitidos.includes(usuarioAtual.role);
  };

  const criarUsuario = async (nome: string, email: string, pass: string, role: UserRole): Promise<UserProfile> => {
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
    } catch (apiErr) {
      console.warn("Backend /api/usuarios indisponível, usando criação via client SDK:", apiErr);
    }

    // 2. Fallback via Secondary Auth App
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
      criadoPor: usuarioAtual?.email || 'admin@senai.br',
      criadoEm: serverTimestamp()
    };

    await setDoc(userDocRef, newProfile);
    await signOut(secAuth); // Garante que o app secundário é limpo

    return newProfile;
  };

  return (
    <AuthContext.Provider value={{ usuarioAtual, loading, login, logout, temPermissao, criarUsuario }}>
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
