import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, UserRole, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsuarioAtual({
            uid: fbUser.uid,
            email: fbUser.email || '',
            nome: data.nome || fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuário',
            role: (data.role as UserRole) || 'admin',
            ativo: data.ativo ?? true,
            criadoEm: data.criadoEm
          });
        } else {
          // Fallback para admin inicial se for admin@senai.br
          const isSuperAdmin = fbUser.email === 'admin@senai.br';
          const defaultProfile: UserProfile = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            nome: isSuperAdmin ? 'Super Administrador SENAI' : 'Administrador',
            role: isSuperAdmin ? 'super_admin' : 'admin',
            ativo: true,
            criadoEm: serverTimestamp()
          };

          await setDoc(userDocRef, {
            email: defaultProfile.email,
            nome: defaultProfile.nome,
            role: defaultProfile.role,
            ativo: defaultProfile.ativo,
            criadoEm: serverTimestamp()
          });

          setUsuarioAtual(defaultProfile);
        }
      } catch (err) {
        console.error("Erro ao carregar perfil do usuário:", err);
        // Fallback emergencial local em caso de inconsistência
        setUsuarioAtual({
          uid: fbUser.uid,
          email: fbUser.email || '',
          nome: fbUser.email === 'admin@senai.br' ? 'Super Admin' : 'Usuário SENAI',
          role: fbUser.email === 'admin@senai.br' ? 'super_admin' : 'admin',
          ativo: true
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
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
    if (usuarioAtual.role === 'super_admin') return true; // Super Admin tem acesso irrestrito
    return papeisPermitidos.includes(usuarioAtual.role);
  };

  return (
    <AuthContext.Provider value={{ usuarioAtual, loading, login, logout, temPermissao }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export { AuthContext };
