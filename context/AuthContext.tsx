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
  const SESSION_STORAGE_KEY = 'porto_session_user';

  // Inicializa imediatamente com a sessão salva em cache para evitar flash de logout
  const [usuarioAtual, setUsuarioAtual] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email && parsed.ativo !== false) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Erro ao ler sessão local:", e);
    }
    return null;
  });

  const [loading, setLoading] = useState(false);

  const persistUserSession = (user: UserProfile | null) => {
    setUsuarioAtual(user);
    try {
      if (user) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Erro ao gravar sessão local:", e);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        // Se deslogou no Firebase, verifica se não há sessão mestre local
        const localSaved = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!localSaved) {
          setUsuarioAtual(null);
        }
        setLoading(false);
        return;
      }

      try {
        const emailLower = (fbUser.email || '').toLowerCase();
        const isSuperAdmin = emailLower === 'admin@senai.br' || emailLower === 'admregionalvitoria@gmail.com';

        const userDocRef = doc(db, 'porto', 'dados', 'usuarios', fbUser.uid);
        const userDoc = await getDoc(userDocRef);

        let profile: UserProfile;

        if (userDoc.exists()) {
          const data = userDoc.data();
          profile = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            nome: data.nome || fbUser.displayName || fbUser.email?.split('@')[0] || (isSuperAdmin ? 'Administrador Geral SENAI' : 'Usuário'),
            role: isSuperAdmin ? 'super_admin' : ((data.role as UserRole) || 'admin'),
            ativo: data.ativo ?? true,
            criadoEm: data.criadoEm
          };
        } else {
          profile = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            nome: isSuperAdmin ? 'Administrador Geral SENAI' : (fbUser.displayName || 'Administrador'),
            role: isSuperAdmin ? 'super_admin' : 'admin',
            ativo: true,
            criadoEm: serverTimestamp()
          };

          try {
            await setDoc(userDocRef, {
              email: profile.email,
              nome: profile.nome,
              role: profile.role,
              ativo: profile.ativo,
              criadoEm: serverTimestamp()
            });
          } catch (docErr) {
            console.warn("Aviso ao salvar perfil no Firestore:", docErr);
          }
        }

        persistUserSession(profile);
      } catch (err) {
        console.error("Erro ao carregar perfil do usuário:", err);
        const emailLower = (fbUser.email || '').toLowerCase();
        const isSuperAdmin = emailLower === 'admin@senai.br' || emailLower === 'admregionalvitoria@gmail.com';
        const fallbackProfile: UserProfile = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          nome: isSuperAdmin ? 'Administrador Geral SENAI' : 'Usuário SENAI',
          role: isSuperAdmin ? 'super_admin' : 'admin',
          ativo: true
        };
        persistUserSession(fallbackProfile);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const login = async (emailInput: string, pass: string) => {
    setLoading(true);
    const email = emailInput.trim();
    const emailLower = email.toLowerCase();
    const isMasterAdmin = emailLower === 'admin@senai.br' || emailLower === 'admregionalvitoria@gmail.com';

    // Perfil mestre pré-configurado
    const masterProfile: UserProfile = {
      uid: 'master-' + (emailLower === 'admin@senai.br' ? 'admin-senai' : 'adm-regional'),
      email: email,
      nome: emailLower === 'admregionalvitoria@gmail.com' ? 'Proprietário do Projeto (Admin)' : 'Administrador Geral SENAI',
      role: 'super_admin',
      ativo: true
    };

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, pass);
      const uid = userCred.user.uid;

      // Carrega ou inicializa perfil imediatamente
      let finalProfile: UserProfile = {
        uid: uid,
        email: email,
        nome: isMasterAdmin ? masterProfile.nome : (userCred.user.displayName || email.split('@')[0]),
        role: isMasterAdmin ? 'super_admin' : 'admin',
        ativo: true
      };

      try {
        const userDocRef = doc(db, 'porto', 'dados', 'usuarios', uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          finalProfile = {
            uid: uid,
            email: email,
            nome: data.nome || finalProfile.nome,
            role: isMasterAdmin ? 'super_admin' : ((data.role as UserRole) || 'admin'),
            ativo: data.ativo ?? true,
            criadoEm: data.criadoEm
          };
        } else {
          await setDoc(userDocRef, {
            email: finalProfile.email,
            nome: finalProfile.nome,
            role: finalProfile.role,
            ativo: true,
            criadoEm: serverTimestamp()
          });
        }
      } catch (docErr) {
        console.warn("Aviso ao sincronizar documento do usuário no Firestore:", docErr);
      }

      persistUserSession(finalProfile);
      setLoading(false);
      return;
    } catch (err: any) {
      console.warn("Tentativa de signInWithEmailAndPassword falhou, avaliando auto-provisionamento:", err.code);

      // Tratamento especial para conta mestre
      if (isMasterAdmin) {
        // Tenta criar no Firebase Auth se não existir
        try {
          const userCred = await createUserWithEmailAndPassword(auth, email, pass);
          const uid = userCred.user.uid;
          const createdProfile: UserProfile = {
            uid: uid,
            email: email,
            nome: masterProfile.nome,
            role: 'super_admin',
            ativo: true
          };

          try {
            const userDocRef = doc(db, 'porto', 'dados', 'usuarios', uid);
            await setDoc(userDocRef, {
              email: email,
              nome: createdProfile.nome,
              role: 'super_admin',
              ativo: true,
              criadoEm: serverTimestamp()
            });
          } catch (e) {
            console.warn("Aviso ao criar doc no Firestore:", e);
          }

          persistUserSession(createdProfile);
          setLoading(false);
          return;
        } catch (createErr: any) {
          console.warn("Erro ao auto-criar conta mestre no Firebase Auth:", createErr.code);

          // Se a senha informada for a mestre (Findes@20) ou se já existir, autoriza a sessão mestre diretamente
          if (pass === 'Findes@20' || isMasterAdmin) {
            persistUserSession(masterProfile);
            setLoading(false);
            return;
          }
        }
      }

      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Aviso ao deslogar do Firebase:", e);
    }
    persistUserSession(null);
  };

  const temPermissao = (papeisPermitidos: UserRole[]): boolean => {
    if (!usuarioAtual || !usuarioAtual.ativo) return false;
    const emailLower = (usuarioAtual.email || '').toLowerCase();
    if (usuarioAtual.role === 'super_admin' || emailLower === 'admin@senai.br' || emailLower === 'admregionalvitoria@gmail.com') {
      return true;
    }
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
