import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import LoginScreen from './LoginScreen';
import { ShieldAlert, Loader2, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  onReturnToDashboard: () => void;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, onReturnToDashboard }) => {
  const { usuarioAtual, loading, temPermissao, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <p className="text-sm font-medium">Verificando credenciais de acesso...</p>
      </div>
    );
  }

  if (!usuarioAtual) {
    return (
      <LoginScreen 
        onSuccess={() => {}} 
        onReturnToDashboard={onReturnToDashboard} 
      />
    );
  }

  if (allowedRoles && allowedRoles.length > 0 && !temPermissao(allowedRoles)) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Acesso Negado</h2>
        <p className="text-slate-400 max-w-md text-sm mb-6">
          Seu perfil ({usuarioAtual.role}) não possui permissão para acessar este módulo do sistema.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={onReturnToDashboard}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-sm font-medium flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Painel
          </button>
          <button
            onClick={logout}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium"
          >
            Trocar de Usuário
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
