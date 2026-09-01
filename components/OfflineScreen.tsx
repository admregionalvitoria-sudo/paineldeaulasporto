import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface OfflineScreenProps {
  onRetry?: () => void;
}

const OfflineScreen: React.FC<OfflineScreenProps> = ({ onRetry }) => {
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      // Quando a internet retornar, recarrega a página inteira para garantir dados 100% novos do servidor
      window.location.reload();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleManualRetry = async () => {
    setChecking(true);
    try {
      if (navigator.onLine) {
        window.location.reload();
      } else {
        setTimeout(() => {
          setChecking(false);
        }, 1200);
      }
    } catch {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-[#0A192F] text-white flex flex-col items-center justify-center p-6 select-none">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1D4E8C]/30 via-transparent to-transparent pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative max-w-xl w-full bg-[#0F2A52]/90 border border-red-500/40 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center gap-6"
      >
        {/* Ícone de Sem Conexão com Animação */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="40" 
              height="40" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="animate-pulse"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
          </span>
        </div>

        {/* Textos */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-red-400">
            Atenção • Sistema em Tempo Real
          </span>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
            Sem Conexão com a Internet
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed mt-1">
            O painel foi pausado temporariamente para evitar a exibição de horários desatualizados (cache local). 
            O sistema restabelecerá o funcionamento e recarregará a tela automaticamente assim que a conexão retornar.
          </p>
        </div>

        {/* Status de reconexão */}
        <div className="w-full bg-[#0A192F]/80 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-semibold text-slate-300">
              Aguardando sinal de rede em tempo real...
            </span>
          </div>
          <button
            onClick={onRetry || handleManualRetry}
            disabled={checking}
            className="px-4 py-2 bg-gradient-to-r from-[#F4901E] to-[#E67E22] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {checking ? 'Verificando...' : 'Reconectar'}
          </button>
        </div>

        <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
          SENAI • Painel de Aulas Digital
        </div>
      </motion.div>
    </div>
  );
};

export default OfflineScreen;
