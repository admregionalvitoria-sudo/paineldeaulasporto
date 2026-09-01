import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import LoginScreen from './LoginScreen';
import { ShieldAlert, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  onReturnToDashboard: () => void;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles, onReturnToDashboard }) => {
  const { usuarioAtual, loading, temPermissao, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#EDF1F6] flex flex-col items-center justify-center text-[#0F2A52] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#F4901E]" />
        <p className="text-xs font-black uppercase tracking-wider text-[#6B7280]">
          Verificando credenciais de acesso...
        </p>
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
      <div className="min-h-screen w-full bg-[#EDF1F6] text-[#0F2A52] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-[#E5E7EB] shadow-xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight text-[#0F2A52] mb-2">
            Acesso Restrito ao Módulo
          </h2>
          <p className="text-[#6B7280] text-xs font-medium mb-6 leading-relaxed">
            Seu perfil atual (<strong className="text-[#0F2A52] uppercase">{usuarioAtual.role}</strong>) não possui as permissões necessárias para acessar esta área administrativa.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={onReturnToDashboard}
              className="w-full sm:w-auto flex-1 px-4 py-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] hover:bg-[#E2E8F0] text-[#0F2A52] text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-[#F4901E]" />
              <span>Painel Público</span>
            </button>
            <button
              onClick={logout}
              className="w-full sm:w-auto flex-1 px-4 py-3 rounded-xl bg-[#0F2A52] hover:bg-[#1D4E8C] text-white text-xs font-bold transition-all shadow-md"
            >
              Trocar de Usuário
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
