import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';

interface LoginScreenProps {
  onSuccess: () => void;
  onReturnToDashboard: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess, onReturnToDashboard }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Por favor, informe e-mail e senha.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await login(email.trim(), password);
      onSuccess();
    } catch (err: any) {
      console.error("Erro no login:", err);
      let msg = 'Erro ao realizar login. Verifique suas credenciais.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'E-mail ou senha incorretos.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Muitas tentativas malsucedidas. Tente novamente mais tarde.';
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#EDF1F6] text-[#0F2A52] flex flex-col justify-between relative overflow-hidden font-sans select-none">
      {/* Header Superior Alinhado ao Site */}
      <header className="px-4 py-3 md:px-8 border-b border-[#E5E7EB] bg-white/95 backdrop-blur-xl shadow-xs sticky top-0 z-30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img 
            src="https://res.cloudinary.com/dlrdwblso/image/upload/v1785334994/SENAI_COMPLETA_PREFERENCIAL_svm23u.png" 
            alt="Logo SENAI" 
            className="h-7 md:h-9 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="h-6 w-px bg-[#E2E8F0] hidden sm:block" />
          <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-[#0F2A52] hidden sm:inline">
            Acesso Restrito
          </span>
        </div>

        <button
          onClick={onReturnToDashboard}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F8FAFC] hover:bg-[#DBEAFE] border border-[#CBD5E1] text-[#0F2A52] transition-all duration-200 text-xs font-bold shadow-xs active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-[#F4901E]" />
          <span>Voltar ao Painel Público</span>
        </button>
      </header>

      {/* Card Central de Login */}
      <main className="flex-1 flex items-center justify-center p-4 z-10 my-6 sm:my-10">
        <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-3xl p-8 shadow-xl relative overflow-hidden">
          {/* Tarja Superior SENAI Laranja */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#F4901E]" />

          {/* Logo e Título */}
          <div className="text-center mb-7 pt-2">
            <div className="flex justify-center mb-4">
              <img 
                src="https://res.cloudinary.com/dlrdwblso/image/upload/v1785334994/SENAI_COMPLETA_PREFERENCIAL_svm23u.png" 
                alt="SENAI" 
                className="h-10 w-auto object-contain drop-shadow-xs"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0F2A52] text-[10px] font-black uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#F4901E]" />
              <span>Painel Administrativo</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#0F2A52] uppercase tracking-tight">
              Acesso ao Sistema
            </h1>
            <p className="text-xs text-[#6B7280] mt-1 font-medium">
              Insira suas credenciais institucionais para gerenciar cronogramas, ambientes e mídias
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#6B7280] mb-1.5">
                E-mail Institucional
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@senai.br"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F2A52] placeholder-[#94A3B8] focus:outline-none focus:border-[#F4901E] focus:ring-1 focus:ring-[#F4901E]/30 transition-all text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#6B7280] mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#0F2A52] placeholder-[#94A3B8] focus:outline-none focus:border-[#F4901E] focus:ring-1 focus:ring-[#F4901E]/30 transition-all text-xs font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-[#F4901E] hover:bg-[#E67E22] text-white font-black uppercase text-xs rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-2 tracking-wider disabled:opacity-50 disabled:cursor-not-allowed mt-2 active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <span>Entrar no Sistema</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#F1F5F9] text-center text-[10px] font-bold text-[#94A3B8]">
            Painel de Aulas Porto SENAI &copy; {new Date().getFullYear()}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-[11px] font-medium text-[#64748B] border-t border-[#E5E7EB] bg-white/50 backdrop-blur-xs">
        Gestão de Ambientes e Cronograma de Aulas • SENAI Vitória-ES
      </footer>
    </div>
  );
};

export default LoginScreen;
