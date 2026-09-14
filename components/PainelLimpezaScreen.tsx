import React, { useContext, useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DataContext, normalizarNomeAmbiente } from '../context/DataContext';
import useCurrentTime from '../hooks/useCurrentTime';
import { Aula } from '../types';
import { formatarNomeSala } from '../utils/roomFormatter';
import { formatarUnidadeCurricular } from '../utils/curricularUnits';
import {
  Broom,
  Clock,
  DoorOpen,
  CheckCircle2,
  AlertTriangle,
  Maximize,
  Minimize,
  ArrowLeft,
  Tv,
  Info
} from 'lucide-react';

interface PainelLimpezaScreenProps {
  onReturnToDashboard?: () => void;
  onGoToAdmin?: () => void;
}

interface RoomClassInfo {
  aula: Aula;
  inicio: string;
  fim: string;
  startMinutes: number;
  endMinutes: number;
  turno: string;
}

interface RoomDayStatus {
  sala: string;
  nomeFormatado: string;
  classes: RoomClassInfo[];
  currentClass: RoomClassInfo | null;
  nextClass: RoomClassInfo | null;
  status: 'em_aula' | 'livre' | 'concluido' | 'sem_aula';
  observacao?: {
    observacao: string;
    atualizadoEm?: any;
    atualizadoPor?: string;
  };
}

const parseTimeToMinutes = (timeStr: string | undefined, defaultTurno?: string): { inicio: string; fim: string; start: number; end: number } => {
  let startMinutes = 0;
  let endMinutes = 0;
  let inicio = '07:00';
  let fim = '11:30';

  const t = (defaultTurno || '').toLowerCase().trim();
  if (t === 'vespertino') {
    inicio = '13:00';
    fim = '17:30';
  } else if (t === 'noturno') {
    inicio = '18:00';
    fim = '22:00';
  }

  if (timeStr && timeStr.includes(':')) {
    const parts = timeStr.trim().split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) || 0;
    if (!isNaN(h)) {
      startMinutes = h * 60 + m;
      inicio = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      endMinutes = startMinutes + 270;
      const endH = Math.floor(endMinutes / 60);
      const endM = endMinutes % 60;
      fim = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    }
  } else {
    if (t === 'matutino') {
      startMinutes = 7 * 60;
      endMinutes = 11 * 60 + 30;
    } else if (t === 'vespertino') {
      startMinutes = 13 * 60;
      endMinutes = 17 * 60 + 30;
    } else if (t === 'noturno') {
      startMinutes = 18 * 60;
      endMinutes = 22 * 60;
    }
  }

  return { inicio, fim, start: startMinutes, end: endMinutes };
};

const PainelLimpezaScreen: React.FC<PainelLimpezaScreenProps> = ({ onReturnToDashboard, onGoToAdmin }) => {
  const context = useContext(DataContext);
  const { formattedDate, formattedTime } = useCurrentTime();

  const [filterStatus, setFilterStatus] = useState<'todos' | 'livre' | 'em_aula' | 'com_observacao' | 'sem_aula'>('todos');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);

  // Monitorar Fullscreen
  useEffect(() => {
    const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFS);
    return () => document.removeEventListener('fullscreenchange', handleFS);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Auto-scroll suave para TV
  useEffect(() => {
    if (!autoScroll) return;
    const interval = setInterval(() => {
      const scrollPos = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollPos >= maxScroll - 10) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollBy({ top: 2, behavior: 'smooth' });
      }
    }, 50);

    return () => clearInterval(interval);
  }, [autoScroll]);

  // Data de hoje em DD/MM/YYYY
  const todayStr = useMemo(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  // Minutos atuais do dia
  const currentMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, [formattedTime]);

  // Processar todas as salas com aulas no dia de hoje
  const roomsData = useMemo<RoomDayStatus[]>(() => {
    if (!context) return [];

    const todayAulas = context.aulas.filter(a => (a.data || '').trim() === todayStr);
    const roomMap = new Map<string, { nomeExibicao: string; classes: RoomClassInfo[] }>();

    todayAulas.forEach(aula => {
      if (!aula.sala || !aula.sala.trim()) return;
      const norm = normalizarNomeAmbiente(aula.sala);
      const timeParsed = parseTimeToMinutes(aula.inicio, aula.turno);
      
      const classInfo: RoomClassInfo = {
        aula,
        inicio: aula.inicio && aula.inicio.includes(':') ? aula.inicio : timeParsed.inicio,
        fim: aula.fim && aula.fim.includes(':') ? aula.fim : timeParsed.fim,
        startMinutes: timeParsed.start,
        endMinutes: timeParsed.end,
        turno: aula.turno || 'Matutino'
      };

      if (!roomMap.has(norm)) {
        roomMap.set(norm, {
          nomeExibicao: formatarNomeSala(aula.sala) || aula.sala,
          classes: [classInfo]
        });
      } else {
        roomMap.get(norm)!.classes.push(classInfo);
      }
    });

    const list: RoomDayStatus[] = [];

    roomMap.forEach((roomInfo, norm) => {
      const sortedClasses = [...roomInfo.classes].sort((a, b) => a.startMinutes - b.startMinutes);

      const currentClass = sortedClasses.find(
        c => currentMinutes >= c.startMinutes && currentMinutes < c.endMinutes
      ) || null;

      const nextClass = sortedClasses.find(c => c.startMinutes > currentMinutes) || null;

      let status: 'em_aula' | 'livre' | 'concluido' | 'sem_aula' = 'livre';
      if (currentClass) {
        status = 'em_aula';
      } else if (!nextClass && sortedClasses.length > 0 && currentMinutes >= sortedClasses[sortedClasses.length - 1].endMinutes) {
        status = 'concluido';
      } else {
        status = 'livre';
      }

      const observacao = context.observacoesLimpeza?.[norm];

      list.push({
        sala: roomInfo.nomeExibicao,
        nomeFormatado: roomInfo.nomeExibicao,
        classes: sortedClasses,
        currentClass,
        nextClass,
        status,
        observacao
      });
    });

    if (context.salasCadastradas) {
      context.salasCadastradas.forEach(salaCadastrada => {
        const norm = normalizarNomeAmbiente(salaCadastrada);
        if (!roomMap.has(norm)) {
          const observacao = context.observacoesLimpeza?.[norm];
          list.push({
            sala: salaCadastrada,
            nomeFormatado: formatarNomeSala(salaCadastrada) || salaCadastrada,
            classes: [],
            currentClass: null,
            nextClass: null,
            status: 'sem_aula',
            observacao
          });
        }
      });
    }

    return list.sort((a, b) => {
      const aHasObs = !!a.observacao?.observacao;
      const bHasObs = !!b.observacao?.observacao;
      if (aHasObs && !bHasObs) return -1;
      if (!aHasObs && bHasObs) return 1;

      const aHasClass = a.classes.length > 0;
      const bHasClass = b.classes.length > 0;
      if (aHasClass && !bHasClass) return -1;
      if (!aHasClass && bHasClass) return 1;

      return a.nomeFormatado.localeCompare(b.nomeFormatado, 'pt-BR', { numeric: true });
    });
  }, [context, todayStr, currentMinutes]);

  // Contadores para métricas
  const metrics = useMemo(() => {
    const comAulaHoje = roomsData.filter(r => r.classes.length > 0);
    const livresAgora = comAulaHoje.filter(r => r.status === 'livre');
    const emAulaAgora = comAulaHoje.filter(r => r.status === 'em_aula');
    const concluidasHoje = comAulaHoje.filter(r => r.status === 'concluido');
    const comObservacao = roomsData.filter(r => !!r.observacao?.observacao);

    return {
      totalComAula: comAulaHoje.length,
      livres: livresAgora.length,
      emAula: emAulaAgora.length,
      concluidas: concluidasHoje.length,
      comObs: comObservacao.length
    };
  }, [roomsData]);

  // Filtragem
  const filteredRooms = useMemo(() => {
    return roomsData.filter(room => {
      if (filterStatus === 'livre' && room.status !== 'livre') return false;
      if (filterStatus === 'em_aula' && room.status !== 'em_aula') return false;
      if (filterStatus === 'com_observacao' && !room.observacao?.observacao) return false;
      if (filterStatus === 'sem_aula' && room.status !== 'sem_aula') return false;
      if (filterStatus === 'todos' && room.status === 'sem_aula' && !room.observacao?.observacao) {
        return false;
      }
      return true;
    });
  }, [roomsData, filterStatus]);

  return (
    <div className="min-h-screen bg-[#EDF1F6] text-[#0F2A52] flex flex-col font-sans relative selection:bg-[#F4901E] selection:text-white pb-12">
      {/* Background sutil */}
      <div className="fixed inset-0 bg-[#F1F5F9] pointer-events-none z-0" />

      {/* Header Focado em Mobile & Desktop (Sticky para fácil navegação) */}
      <header className="sticky top-0 z-30 px-3 py-2 sm:px-6 sm:py-2.5 border-b border-[#CBD5E1] bg-white/95 backdrop-blur-md shadow-xs flex items-center justify-between gap-2">
        {/* Esquerda: Voltar + Logo */}
        <div className="flex items-center gap-2 min-w-0">
          {onReturnToDashboard && (
            <button
              onClick={onReturnToDashboard}
              title="Voltar ao Painel Geral"
              className="p-1.5 rounded-lg bg-[#F1F5F9] active:bg-[#DBEAFE] text-[#0F2A52] transition-colors border border-[#CBD5E1] shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <img
            src="https://res.cloudinary.com/dlrdwblso/image/upload/v1785334994/SENAI_COMPLETA_PREFERENCIAL_svm23u.png"
            alt="Logo SENAI"
            className="h-6 sm:h-7.5 w-auto max-w-[120px] sm:max-w-[150px] object-contain drop-shadow-xs"
            referrerPolicy="no-referrer"
          />
          <div className="hidden md:flex flex-col border-l border-[#CBD5E1] pl-2.5 py-0.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-[#F4901E] leading-none">
              Equipe Operacional
            </span>
            <span className="text-xs font-black uppercase tracking-tight text-[#0F2A52] leading-tight">
              Limpeza & Ambientes
            </span>
          </div>
        </div>

        {/* Centro / Direita: Relógio em tempo real + Botões */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="text-right flex flex-col items-end justify-center">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <h1 className="text-base sm:text-xl font-black tracking-tight leading-none text-[#0F2A52]">
                {formattedTime}
              </h1>
            </div>
            <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-[#6B7280]">
              {formattedDate.split(',')[0]}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => setAutoScroll(prev => !prev)}
              title={autoScroll ? "Desativar Rolagem Automática" : "Ativar Modo TV"}
              className={`hidden sm:flex px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider items-center gap-1 transition-all border cursor-pointer ${
                autoScroll
                  ? 'bg-purple-600 text-white border-purple-700 animate-pulse'
                  : 'bg-white text-[#0F2A52] border-[#CBD5E1] hover:bg-[#F1F5F9]'
              }`}
            >
              <Tv className="w-3 h-3" />
              <span>{autoScroll ? 'Rolagem' : 'TV'}</span>
            </button>

            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
              className="p-1.5 rounded-lg bg-white text-[#0F2A52] border border-[#CBD5E1] hover:bg-[#F1F5F9] active:bg-[#DBEAFE] transition-all cursor-pointer"
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>

            {onGoToAdmin && (
              <button
                onClick={onGoToAdmin}
                className="bg-[#0F2A52] hover:bg-[#1D4E8C] text-white px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer"
              >
                Admin
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Barra de Filtros Rápidos com Rolagem Suave */}
      <section className="z-10 px-3 py-2 sm:px-6 sm:py-2.5 max-w-[2400px] mx-auto w-full">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 text-[11px] font-bold no-scrollbar flex-nowrap">
          <button
            onClick={() => setFilterStatus('todos')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
              filterStatus === 'todos'
                ? 'bg-[#0F2A52] text-white border-[#0F2A52]'
                : 'bg-white text-[#0F2A52] border-[#CBD5E1] hover:bg-[#F1F5F9]'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5 text-[#F4901E]" />
            <span>Todas do Dia ({metrics.totalComAula})</span>
          </button>

          <button
            onClick={() => setFilterStatus(filterStatus === 'livre' ? 'todos' : 'livre')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
              filterStatus === 'livre'
                ? 'bg-emerald-600 text-white border-emerald-700 font-black'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Livres Agora ({metrics.livres})</span>
          </button>

          <button
            onClick={() => setFilterStatus(filterStatus === 'em_aula' ? 'todos' : 'em_aula')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
              filterStatus === 'em_aula'
                ? 'bg-red-600 text-white border-red-700 font-black'
                : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>Em Aula ({metrics.emAula})</span>
          </button>

          {metrics.comObs > 0 && (
            <button
              onClick={() => setFilterStatus(filterStatus === 'com_observacao' ? 'todos' : 'com_observacao')}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                filterStatus === 'com_observacao'
                  ? 'bg-[#F4901E] text-white border-[#F4901E] font-black'
                  : 'bg-amber-50 text-[#F4901E] border-amber-300 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Avisos ({metrics.comObs})</span>
            </button>
          )}

          <button
            onClick={() => setFilterStatus(filterStatus === 'sem_aula' ? 'todos' : 'sem_aula')}
            className={`shrink-0 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
              filterStatus === 'sem_aula'
                ? 'bg-slate-700 text-white border-slate-700'
                : 'bg-white text-slate-500 border-[#CBD5E1] hover:bg-[#F1F5F9]'
            }`}
          >
            Sem Aula
          </button>
        </div>
      </section>

      {/* Lista de Ambientes - Visualização em Lista com Nomes das Salas em Destaque */}
      <main className="flex-1 px-3 sm:px-6 max-w-[2400px] mx-auto w-full z-10">
        {filteredRooms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#CBD5E1] p-8 text-center flex flex-col items-center justify-center my-4 shadow-xs">
            <DoorOpen className="w-10 h-10 text-[#F4901E] mb-2" />
            <h3 className="text-base font-black uppercase text-[#0F2A52]">Nenhum ambiente encontrado</h3>
            <p className="text-xs text-[#6B7280] max-w-sm mt-0.5">Tente alterar os filtros ou o termo de busca.</p>
            <button
              onClick={() => setFilterStatus('todos')}
              className="mt-3 px-4 py-2 bg-[#0F2A52] text-white rounded-xl text-xs font-bold uppercase hover:bg-[#1D4E8C] cursor-pointer"
            >
              Ver Todas as Salas
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 sm:gap-3">
            {/* Cabeçalho de Colunas da Lista (visível em telas médias/grandes) */}
            <div className="hidden lg:flex items-center justify-between px-5 py-2 text-[11px] font-black uppercase tracking-wider text-[#6B7280] bg-white/80 backdrop-blur-xs rounded-xl border border-[#CBD5E1] shadow-2xs">
              <div className="w-[400px] xl:w-[460px] flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-[#F4901E]" />
                <span>Ambiente / Sala</span>
              </div>
              <div className="w-[380px] xl:w-[420px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Status & Higienização</span>
              </div>
              <div className="flex-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1D4E8C]" />
                <span>Cronograma de Aulas do Dia</span>
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {filteredRooms.map((room, idx) => {
                const hasObs = !!room.observacao?.observacao;
                const isEmAula = room.status === 'em_aula';
                const isLivre = room.status === 'livre';
                const isConcluido = room.status === 'concluido';

                return (
                  <motion.div
                    key={room.sala}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: Math.min(idx * 0.012, 0.2), duration: 0.2 }}
                    className={`rounded-2xl bg-white border transition-all shadow-xs hover:shadow-md relative overflow-hidden flex flex-col justify-between ${
                      hasObs
                        ? 'border-[#F4901E] ring-2 ring-[#F4901E]/25'
                        : isEmAula
                        ? 'border-red-200'
                        : isLivre
                        ? 'border-emerald-200'
                        : 'border-[#CBD5E1]'
                    }`}
                  >
                    {/* Borda lateral colorida indicando o status em tempo real */}
                    <div
                      className={`absolute top-0 bottom-0 left-0 w-1.5 sm:w-2 ${
                        hasObs
                          ? 'bg-[#F4901E]'
                          : isEmAula
                          ? 'bg-red-500'
                          : isLivre
                          ? 'bg-emerald-500'
                          : isConcluido
                          ? 'bg-[#1D4E8C]'
                          : 'bg-slate-300'
                      }`}
                    />

                    <div className="p-3 sm:p-4 pl-4 sm:pl-5 flex flex-col gap-3">
                      {/* Linha Principal da Lista: Sala em Destaque + Status + Informativo de Higienização */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        
                        {/* DESTAQUE DO NOME DA SALA */}
                        <div className="flex items-center gap-3 min-w-0 lg:w-[400px] xl:w-[460px] shrink-0">
                          <div
                            className={`p-2 sm:p-2.5 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
                              isEmAula
                                ? 'bg-red-50 text-red-600 border-red-200'
                                : isLivre
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-slate-100 text-[#0F2A52] border-slate-200'
                            }`}
                          >
                            <DoorOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>

                          <div className="min-w-0 flex-1">
                            {/* Nome da sala com super destaque visual (Badge Navy Alto Contraste) */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-sm sm:text-base lg:text-[16px] font-black uppercase tracking-tight text-white bg-[#0F2A52] px-3 py-1.5 rounded-xl shadow-xs border border-[#1D4E8C] leading-snug">
                                {room.nomeFormatado}
                              </h2>
                            </div>

                            <div className="flex items-center gap-2 mt-1 text-[11px] text-[#6B7280]">
                              <span className="font-bold text-[#0F2A52]">
                                {room.classes.length > 0 ? `${room.classes.length} turno(s) no dia` : 'Sem agendamentos'}
                              </span>
                              {room.observacao?.atualizadoPor && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[140px]" title={room.observacao.atualizadoPor}>
                                    Por: {room.observacao.atualizadoPor}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* STATUS & SITUAÇÃO ATUAL PARA A EQUIPE DE APOIO */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 lg:w-[380px] xl:w-[420px] shrink-0">
                          {/* Badge de Status */}
                          <div className="shrink-0">
                            {isEmAula && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 shadow-xs">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                Em Aula
                              </span>
                            )}
                            {isLivre && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                Livre
                              </span>
                            )}
                            {isConcluido && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200 shadow-xs">
                                Concluído
                              </span>
                            )}
                            {room.status === 'sem_aula' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200">
                                Sem Aula
                              </span>
                            )}
                          </div>

                          {/* Detalhamento Operacional */}
                          <div
                            className={`flex-1 rounded-xl px-2.5 py-1.5 text-xs font-bold flex items-center gap-2 border ${
                              isEmAula
                                ? 'bg-red-50 text-red-900 border-red-200'
                                : isLivre
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                : isConcluido
                                ? 'bg-blue-50 text-[#0F2A52] border-blue-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {isEmAula && (
                              <>
                                <Clock className="w-3.5 h-3.5 text-red-600 shrink-0 animate-pulse" />
                                <div className="min-w-0 flex-1 leading-snug">
                                  <span>Ocupada até as <strong>{room.currentClass?.fim}</strong></span>
                                  <span className="block text-[10px] font-normal text-red-800 truncate">
                                    Turma: {room.currentClass?.aula.turma}
                                  </span>
                                </div>
                              </>
                            )}
                            {isLivre && (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <div className="min-w-0 flex-1 leading-snug">
                                  {room.nextClass ? (
                                    <>
                                      <span>Liberada até as <strong>{room.nextClass.inicio}</strong></span>
                                      <span className="block text-[10px] font-normal text-emerald-800 truncate">
                                        Próx: {room.nextClass.aula.turma}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span>Liberada para higienização</span>
                                      <span className="block text-[10px] font-normal text-emerald-800">
                                        Sem mais aulas hoje
                                      </span>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                            {isConcluido && (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#1D4E8C] shrink-0" />
                                <div className="min-w-0 flex-1 leading-snug">
                                  <span>Aulas encerradas</span>
                                  <span className="block text-[10px] font-normal text-slate-600">
                                    Pronto para limpeza geral
                                  </span>
                                </div>
                              </>
                            )}
                            {room.status === 'sem_aula' && (
                              <>
                                <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="text-[11px]">Sem atividades agendadas hoje</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* HORÁRIOS DO DIA EM LINHA (TIMELINE HORIZONTAL) */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[9px] font-black uppercase tracking-wider text-[#6B7280] mb-1 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-[#1D4E8C]" />
                            <span>Horários do Dia ({room.classes.length})</span>
                          </div>

                          {room.classes.length === 0 ? (
                            <div className="text-xs text-[#94A3B8] italic py-1">
                              Nenhuma aula cadastrada hoje.
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {room.classes.map((cls, classIdx) => {
                                const isCurrent = currentMinutes >= cls.startMinutes && currentMinutes < cls.endMinutes;
                                const isPast = currentMinutes >= cls.endMinutes;

                                return (
                                  <div
                                    key={classIdx}
                                    className={`px-2 py-1 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
                                      isCurrent
                                        ? 'bg-red-50 border-red-300 ring-1 ring-red-300 font-bold text-red-950'
                                        : isPast
                                        ? 'bg-slate-50/80 border-slate-200 text-slate-400 opacity-60'
                                        : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F2A52]'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1 font-mono font-bold">
                                      <Clock className={`w-3 h-3 ${isCurrent ? 'text-red-500' : 'text-[#F4901E]'}`} />
                                      <span>{cls.inicio} — {cls.fim}</span>
                                    </div>
                                    <span className="text-[8px] uppercase px-1 py-0.2 rounded bg-[#DBEAFE] text-[#1D4E8C] font-sans font-black">
                                      {cls.turno}
                                    </span>
                                    <span className="font-semibold truncate max-w-[110px] sm:max-w-[150px]" title={cls.aula.turma}>
                                      {cls.aula.turma}
                                    </span>
                                    {isCurrent && (
                                      <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full bg-red-500 text-white animate-pulse">
                                        Agora
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* AVISO DA GESTÃO / OBSERVAÇÃO (SE HOUVER) */}
                      {hasObs && (
                        <div className="p-2.5 rounded-xl bg-amber-50 border-2 border-[#F4901E] flex items-start gap-2 text-xs font-bold text-amber-950 shadow-xs">
                          <AlertTriangle className="w-4 h-4 text-[#F4901E] shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-[#F4901E] block mb-0.5">
                              Aviso da Gestão:
                            </span>
                            <p className="leading-snug text-xs font-bold text-[#0F2A52]">
                              "{room.observacao?.observacao}"
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
};

export default PainelLimpezaScreen;
