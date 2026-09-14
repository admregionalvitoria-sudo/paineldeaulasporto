import React, { useContext, useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DataContext, normalizarNomeAmbiente } from '../context/DataContext';
import useCurrentTime from '../hooks/useCurrentTime';
import { Aula } from '../types';
import { formatarNomeSala } from '../utils/roomFormatter';
import {
  Broom,
  Clock,
  DoorOpen,
  CheckCircle2,
  AlertTriangle,
  Maximize,
  Minimize,
  ArrowLeft,
  Tv
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

interface RoomCleanItem {
  sala: string;
  nomeCurto: string;
  norm: string;
  classesOntem: RoomClassInfo[];
  classesHoje: RoomClassInfo[];
  currentClassHoje: RoomClassInfo | null;
  nextClassHoje: RoomClassInfo | null;
  statusHoje: 'em_aula' | 'livre' | 'concluido' | 'sem_aula';
  observacao?: {
    observacao: string;
    atualizadoEm?: any;
    atualizadoPor?: string;
  };
}

export const getNomeCurtoSala = (salaStr: string | undefined): string => {
  if (!salaStr) return '';
  const formatada = formatarNomeSala(salaStr) || salaStr;
  if (formatada.includes(' — ')) {
    return formatada.split(' — ')[0].trim();
  }
  return formatada.trim();
};

const dateStrToNumber = (dStr: string): number => {
  if (!dStr) return 0;
  const parts = dStr.split('/');
  if (parts.length !== 3) return 0;
  return parseInt(parts[2], 10) * 10000 + parseInt(parts[1], 10) * 100 + parseInt(parts[0], 10);
};

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

  // Modo Principal: 'dia_anterior' (padrão solicitado) ou 'hoje'
  const [viewMode, setViewMode] = useState<'dia_anterior' | 'hoje'>('dia_anterior');

  // Sub-filtros
  const [filterOntem, setFilterOntem] = useState<'todos' | 'com_aula_hoje' | 'sem_aula_hoje' | 'com_observacao'>('todos');
  const [filterHoje, setFilterHoje] = useState<'todos' | 'livre' | 'em_aula' | 'com_observacao' | 'sem_aula'>('todos');

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

  // Minutos atuais do dia
  const currentMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, [formattedTime]);

  // Cálculo da data de hoje e do dia anterior de uso com aulas
  const { todayStr, previousDayStr, previousDayDisplay } = useMemo(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const today = `${day}/${month}/${year}`;
    const todayNum = dateStrToNumber(today);

    // Buscar todas as datas com aulas registradas no banco
    const allDates: string[] = Array.from(
      new Set((context?.aulas || []).map(a => (a.data || '').trim()).filter(Boolean))
    ) as string[];

    // Filtrar datas estritamente anteriores a hoje
    const previousDates: string[] = allDates
      .filter((d: string) => dateStrToNumber(d) < todayNum)
      .sort((a: string, b: string) => dateStrToNumber(b) - dateStrToNumber(a));

    let prev = '';
    if (previousDates.length > 0) {
      prev = previousDates[0];
    } else {
      // Fallback: se hoje for segunda-feira (1), dia anterior útil com aulas é sexta (-3 dias)
      const yest = new Date(now);
      const dayOfWeek = now.getDay();
      if (dayOfWeek === 1) {
        yest.setDate(yest.getDate() - 3);
      } else {
        yest.setDate(yest.getDate() - 1);
      }
      const yDay = String(yest.getDate()).padStart(2, '0');
      const yMonth = String(yest.getMonth() + 1).padStart(2, '0');
      const yYear = yest.getFullYear();
      prev = `${yDay}/${yMonth}/${yYear}`;
    }

    return {
      todayStr: today,
      previousDayStr: prev,
      previousDayDisplay: prev
    };
  }, [context]);

  // Processar datasets: Salas Usadas Ontem vs Salas de Hoje
  const { roomsDiaAnterior, roomsHoje } = useMemo(() => {
    if (!context) return { roomsDiaAnterior: [], roomsHoje: [] };

    const aulasOntem = context.aulas.filter(a => (a.data || '').trim() === previousDayStr);
    const aulasHoje = context.aulas.filter(a => (a.data || '').trim() === todayStr);

    const allRoomsMap = new Map<string, {
      sala: string;
      nomeCurto: string;
      classesOntem: RoomClassInfo[];
      classesHoje: RoomClassInfo[];
    }>();

    // Processar aulas de ontem
    aulasOntem.forEach(aula => {
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

      if (!allRoomsMap.has(norm)) {
        allRoomsMap.set(norm, {
          sala: formatarNomeSala(aula.sala) || aula.sala,
          nomeCurto: getNomeCurtoSala(aula.sala),
          classesOntem: [classInfo],
          classesHoje: []
        });
      } else {
        allRoomsMap.get(norm)!.classesOntem.push(classInfo);
      }
    });

    // Processar aulas de hoje
    aulasHoje.forEach(aula => {
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

      if (!allRoomsMap.has(norm)) {
        allRoomsMap.set(norm, {
          sala: formatarNomeSala(aula.sala) || aula.sala,
          nomeCurto: getNomeCurtoSala(aula.sala),
          classesOntem: [],
          classesHoje: [classInfo]
        });
      } else {
        allRoomsMap.get(norm)!.classesHoje.push(classInfo);
      }
    });

    // Se houver salas cadastradas
    if (context.salasCadastradas) {
      context.salasCadastradas.forEach(salaCadastrada => {
        const norm = normalizarNomeAmbiente(salaCadastrada);
        if (!allRoomsMap.has(norm)) {
          allRoomsMap.set(norm, {
            sala: formatarNomeSala(salaCadastrada) || salaCadastrada,
            nomeCurto: getNomeCurtoSala(salaCadastrada),
            classesOntem: [],
            classesHoje: []
          });
        }
      });
    }

    const listDiaAnterior: RoomCleanItem[] = [];
    const listHoje: RoomCleanItem[] = [];

    allRoomsMap.forEach((roomData, norm) => {
      const sortedOntem = [...roomData.classesOntem].sort((a, b) => a.startMinutes - b.startMinutes);
      const sortedHoje = [...roomData.classesHoje].sort((a, b) => a.startMinutes - b.startMinutes);

      const currentClassHoje = sortedHoje.find(
        c => currentMinutes >= c.startMinutes && currentMinutes < c.endMinutes
      ) || null;

      const nextClassHoje = sortedHoje.find(c => c.startMinutes > currentMinutes) || null;

      let statusHoje: 'em_aula' | 'livre' | 'concluido' | 'sem_aula' = 'livre';
      if (currentClassHoje) {
        statusHoje = 'em_aula';
      } else if (!nextClassHoje && sortedHoje.length > 0 && currentMinutes >= sortedHoje[sortedHoje.length - 1].endMinutes) {
        statusHoje = 'concluido';
      } else if (sortedHoje.length === 0) {
        statusHoje = 'sem_aula';
      } else {
        statusHoje = 'livre';
      }

      const observacao = context.observacoesLimpeza?.[norm];

      const item: RoomCleanItem = {
        sala: roomData.sala,
        nomeCurto: roomData.nomeCurto,
        norm,
        classesOntem: sortedOntem,
        classesHoje: sortedHoje,
        currentClassHoje,
        nextClassHoje,
        statusHoje,
        observacao
      };

      // Salas do dia anterior: apenas salas que FORAM USADAS ontem (ou têm observação da gestão)
      if (sortedOntem.length > 0 || observacao?.observacao) {
        listDiaAnterior.push(item);
      }

      // Salas de hoje: salas com aulas hoje (ou têm observação da gestão)
      if (sortedHoje.length > 0 || observacao?.observacao) {
        listHoje.push(item);
      }
    });

    // Ordenação Dia Anterior:
    // 1º Com aviso de gestão
    // 2º Salas que têm aula hoje (urgência de limpeza antes da aula de hoje!)
    // 3º Ordem alfabética do nome da sala
    listDiaAnterior.sort((a, b) => {
      const aHasObs = !!a.observacao?.observacao;
      const bHasObs = !!b.observacao?.observacao;
      if (aHasObs && !bHasObs) return -1;
      if (!aHasObs && bHasObs) return 1;

      const aTemAulaHoje = a.classesHoje.length > 0;
      const bTemAulaHoje = b.classesHoje.length > 0;
      if (aTemAulaHoje && !bTemAulaHoje) return -1;
      if (!aTemAulaHoje && bTemAulaHoje) return 1;

      return a.nomeCurto.localeCompare(b.nomeCurto, 'pt-BR', { numeric: true });
    });

    // Ordenação Hoje:
    // 1º Com aviso
    // 2º Em aula
    // 3º Livre
    // 4º Nome
    listHoje.sort((a, b) => {
      const aHasObs = !!a.observacao?.observacao;
      const bHasObs = !!b.observacao?.observacao;
      if (aHasObs && !bHasObs) return -1;
      if (!aHasObs && bHasObs) return 1;

      if (a.statusHoje === 'em_aula' && b.statusHoje !== 'em_aula') return -1;
      if (a.statusHoje !== 'em_aula' && b.statusHoje === 'em_aula') return 1;

      return a.nomeCurto.localeCompare(b.nomeCurto, 'pt-BR', { numeric: true });
    });

    return { roomsDiaAnterior: listDiaAnterior, roomsHoje: listHoje };
  }, [context, previousDayStr, todayStr, currentMinutes]);

  // Métricas do Dia Anterior
  const metricsOntem = useMemo(() => {
    const total = roomsDiaAnterior.length;
    const comAulaHoje = roomsDiaAnterior.filter(r => r.classesHoje.length > 0).length;
    const semAulaHoje = roomsDiaAnterior.filter(r => r.classesHoje.length === 0).length;
    const comObs = roomsDiaAnterior.filter(r => !!r.observacao?.observacao).length;
    return { total, comAulaHoje, semAulaHoje, comObs };
  }, [roomsDiaAnterior]);

  // Métricas de Hoje
  const metricsHoje = useMemo(() => {
    const comAula = roomsHoje.filter(r => r.classesHoje.length > 0);
    const livres = comAula.filter(r => r.statusHoje === 'livre').length;
    const emAula = comAula.filter(r => r.statusHoje === 'em_aula').length;
    const concluidas = comAula.filter(r => r.statusHoje === 'concluido').length;
    const comObs = roomsHoje.filter(r => !!r.observacao?.observacao).length;
    const semAula = roomsHoje.filter(r => r.statusHoje === 'sem_aula').length;
    return { totalComAula: comAula.length, livres, emAula, concluidas, comObs, semAula };
  }, [roomsHoje]);

  // Filtragem da Lista Ativa
  const displayRooms = useMemo(() => {
    if (viewMode === 'dia_anterior') {
      return roomsDiaAnterior.filter(r => {
        if (filterOntem === 'com_aula_hoje' && r.classesHoje.length === 0) return false;
        if (filterOntem === 'sem_aula_hoje' && r.classesHoje.length > 0) return false;
        if (filterOntem === 'com_observacao' && !r.observacao?.observacao) return false;
        return true;
      });
    } else {
      return roomsHoje.filter(r => {
        if (filterHoje === 'livre' && r.statusHoje !== 'livre') return false;
        if (filterHoje === 'em_aula' && r.statusHoje !== 'em_aula') return false;
        if (filterHoje === 'com_observacao' && !r.observacao?.observacao) return false;
        if (filterHoje === 'sem_aula' && r.statusHoje !== 'sem_aula') return false;
        return true;
      });
    }
  }, [viewMode, roomsDiaAnterior, roomsHoje, filterOntem, filterHoje]);

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

      {/* Seletor Principal de Categoria & Filtros Rápidos */}
      <section className="z-10 px-3 py-2 sm:px-6 sm:py-2.5 max-w-[2400px] mx-auto w-full flex flex-col gap-2">
        {/* Abas Principais: Dia Anterior (Principal) vs Salas de Hoje */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('dia_anterior')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer shadow-xs ${
              viewMode === 'dia_anterior'
                ? 'bg-[#0F2A52] text-white ring-2 ring-[#0F2A52]/30 shadow-sm'
                : 'bg-white text-[#0F2A52] border border-[#CBD5E1] hover:bg-[#F1F5F9]'
            }`}
          >
            <Broom className="w-4 h-4 text-[#F4901E]" />
            <span>Usadas no Dia Anterior ({previousDayDisplay})</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              viewMode === 'dia_anterior' ? 'bg-[#F4901E] text-white' : 'bg-slate-100 text-[#0F2A52]'
            }`}>
              {metricsOntem.total}
            </span>
          </button>

          <button
            onClick={() => setViewMode('hoje')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer shadow-xs ${
              viewMode === 'hoje'
                ? 'bg-[#0F2A52] text-white ring-2 ring-[#0F2A52]/30 shadow-sm'
                : 'bg-white text-[#0F2A52] border border-[#CBD5E1] hover:bg-[#F1F5F9]'
            }`}
          >
            <DoorOpen className="w-4 h-4 text-[#1D4E8C]" />
            <span>Salas de Hoje ({todayStr})</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              viewMode === 'hoje' ? 'bg-[#1D4E8C] text-white' : 'bg-slate-100 text-[#0F2A52]'
            }`}>
              {metricsHoje.totalComAula}
            </span>
          </button>
        </div>

        {/* Sub-filtros dinâmicos de acordo com a aba selecionada */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 text-[11px] font-bold no-scrollbar flex-nowrap">
          {viewMode === 'dia_anterior' ? (
            <>
              <button
                onClick={() => setFilterOntem('todos')}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                  filterOntem === 'todos'
                    ? 'bg-[#0F2A52] text-white border-[#0F2A52]'
                    : 'bg-white text-[#0F2A52] border-[#CBD5E1] hover:bg-[#F1F5F9]'
                }`}
              >
                <DoorOpen className="w-3.5 h-3.5 text-[#F4901E]" />
                <span>Todas Usadas Ontem ({metricsOntem.total})</span>
              </button>

              <button
                onClick={() => setFilterOntem(filterOntem === 'com_aula_hoje' ? 'todos' : 'com_aula_hoje')}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                  filterOntem === 'com_aula_hoje'
                    ? 'bg-[#1D4E8C] text-white border-[#1D4E8C] font-black'
                    : 'bg-blue-50 text-[#1D4E8C] border-blue-200 hover:bg-blue-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Com Aula Hoje ({metricsOntem.comAulaHoje})</span>
              </button>

              <button
                onClick={() => setFilterOntem(filterOntem === 'sem_aula_hoje' ? 'todos' : 'sem_aula_hoje')}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                  filterOntem === 'sem_aula_hoje'
                    ? 'bg-emerald-600 text-white border-emerald-700 font-black'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sem Aula Hoje ({metricsOntem.semAulaHoje})</span>
              </button>

              {metricsOntem.comObs > 0 && (
                <button
                  onClick={() => setFilterOntem(filterOntem === 'com_observacao' ? 'todos' : 'com_observacao')}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                    filterOntem === 'com_observacao'
                      ? 'bg-[#F4901E] text-white border-[#F4901E] font-black'
                      : 'bg-amber-50 text-[#F4901E] border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Avisos ({metricsOntem.comObs})</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={() => setFilterHoje('todos')}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                  filterHoje === 'todos'
                    ? 'bg-[#0F2A52] text-white border-[#0F2A52]'
                    : 'bg-white text-[#0F2A52] border-[#CBD5E1] hover:bg-[#F1F5F9]'
                }`}
              >
                <DoorOpen className="w-3.5 h-3.5 text-[#F4901E]" />
                <span>Todas do Dia ({metricsHoje.totalComAula})</span>
              </button>

              <button
                onClick={() => setFilterHoje(filterHoje === 'livre' ? 'todos' : 'livre')}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                  filterHoje === 'livre'
                    ? 'bg-emerald-600 text-white border-emerald-700 font-black'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Livres Agora ({metricsHoje.livres})</span>
              </button>

              <button
                onClick={() => setFilterHoje(filterHoje === 'em_aula' ? 'todos' : 'em_aula')}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                  filterHoje === 'em_aula'
                    ? 'bg-red-600 text-white border-red-700 font-black'
                    : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>Em Aula ({metricsHoje.emAula})</span>
              </button>

              {metricsHoje.comObs > 0 && (
                <button
                  onClick={() => setFilterHoje(filterHoje === 'com_observacao' ? 'todos' : 'com_observacao')}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                    filterHoje === 'com_observacao'
                      ? 'bg-[#F4901E] text-white border-[#F4901E] font-black'
                      : 'bg-amber-50 text-[#F4901E] border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Avisos ({metricsHoje.comObs})</span>
                </button>
              )}

              <button
                onClick={() => setFilterHoje(filterHoje === 'sem_aula' ? 'todos' : 'sem_aula')}
                className={`shrink-0 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  filterHoje === 'sem_aula'
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-white text-slate-500 border-[#CBD5E1] hover:bg-[#F1F5F9]'
                }`}
              >
                Sem Aula
              </button>
            </>
          )}
        </div>
      </section>

      {/* Lista de Ambientes - Visualização Ultra-Compacta */}
      <main className="flex-1 px-3 sm:px-6 max-w-[2400px] mx-auto w-full z-10">
        {displayRooms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#CBD5E1] p-8 text-center flex flex-col items-center justify-center my-4 shadow-xs">
            <DoorOpen className="w-10 h-10 text-[#F4901E] mb-2" />
            <h3 className="text-base font-black uppercase text-[#0F2A52]">Nenhum ambiente encontrado</h3>
            <p className="text-xs text-[#6B7280] max-w-sm mt-0.5">
              {viewMode === 'dia_anterior'
                ? `Não foram encontradas salas com uso registrado no dia anterior (${previousDayDisplay}).`
                : 'Não foram encontradas salas para os filtros selecionados hoje.'}
            </p>
            <button
              onClick={() => {
                setFilterOntem('todos');
                setFilterHoje('todos');
              }}
              className="mt-3 px-4 py-2 bg-[#0F2A52] text-white rounded-xl text-xs font-bold uppercase hover:bg-[#1D4E8C] cursor-pointer"
            >
              Ver Todas
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 sm:gap-2">
            {/* Cabeçalho compacto para telas grandes */}
            <div className="hidden lg:flex items-center justify-between px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#6B7280] bg-white/70 backdrop-blur-xs rounded-lg border border-[#CBD5E1] shadow-2xs">
              <div className="w-[280px] xl:w-[320px] flex items-center gap-1.5">
                <DoorOpen className="w-3.5 h-3.5 text-[#F4901E]" />
                <span>Ambiente / Sala</span>
              </div>
              <div className="w-[340px] xl:w-[400px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Situação de Limpeza & Higienização</span>
              </div>
              <div className="flex-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#1D4E8C]" />
                <span>
                  {viewMode === 'dia_anterior'
                    ? `Horários de Uso no Dia Anterior (${previousDayDisplay})`
                    : 'Horários de Uso Hoje'}
                </span>
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {displayRooms.map((room, idx) => {
                const hasObs = !!room.observacao?.observacao;
                const temAulaHoje = room.classesHoje.length > 0;
                const isEmAulaHoje = room.statusHoje === 'em_aula';
                const isLivreHoje = room.statusHoje === 'livre';
                const isConcluidoHoje = room.statusHoje === 'concluido';

                return (
                  <motion.div
                    key={room.sala}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: Math.min(idx * 0.008, 0.15), duration: 0.15 }}
                    className={`rounded-xl bg-white border transition-all shadow-2xs hover:shadow-xs relative overflow-hidden flex flex-col justify-center px-2.5 py-2 sm:px-4 sm:py-2.5 ${
                      hasObs
                        ? 'border-[#F4901E] ring-1 ring-[#F4901E]/35 bg-amber-50/10'
                        : viewMode === 'dia_anterior'
                        ? temAulaHoje
                          ? 'border-blue-300 bg-blue-50/10'
                          : 'border-[#CBD5E1]'
                        : isEmAulaHoje
                        ? 'border-red-200'
                        : isLivreHoje
                        ? 'border-emerald-200'
                        : 'border-[#CBD5E1]'
                    }`}
                  >
                    {/* Borda lateral colorida fina indicando o status */}
                    <div
                      className={`absolute top-0 bottom-0 left-0 w-1.5 sm:w-2 ${
                        hasObs
                          ? 'bg-[#F4901E]'
                          : viewMode === 'dia_anterior'
                          ? temAulaHoje
                            ? 'bg-[#1D4E8C]'
                            : 'bg-emerald-500'
                          : isEmAulaHoje
                          ? 'bg-red-500'
                          : isLivreHoje
                          ? 'bg-emerald-500'
                          : isConcluidoHoje
                          ? 'bg-[#1D4E8C]'
                          : 'bg-slate-300'
                      }`}
                    />

                    <div className="pl-1.5 sm:pl-2 flex flex-col gap-1">
                      {/* LINHA 1 (No Desktop divide em 3 colunas; No Mobile divide entre Sala e Status) */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-1.5 lg:gap-3">
                        
                        {/* COLUNA 1: NOME DA SALA EM DESTAQUE (SEM NOMES LONGOS / SUBNOMES) */}
                        <div className="flex items-center justify-between lg:justify-start gap-2 min-w-0 lg:w-[280px] xl:w-[320px] shrink-0">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span
                              title={room.sala}
                              className="text-xs sm:text-sm font-black uppercase text-[#0F2A52] tracking-tight bg-[#EEF2F6] border border-[#CBD5E1] px-2 py-0.5 rounded-md shrink-0 shadow-2xs"
                            >
                              {room.nomeCurto}
                            </span>
                          </div>

                          {/* Badge de Status no Mobile (alinhado à direita na Linha 1) */}
                          <div className="shrink-0 lg:hidden">
                            {viewMode === 'dia_anterior' ? (
                              temAulaHoje ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-900 border border-blue-200">
                                  <Clock className="w-2.5 h-2.5 text-[#1D4E8C]" />
                                  Hoje às {room.classesHoje[0].inicio}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                  Livre Hoje
                                </span>
                              )
                            ) : (
                              <>
                                {isEmAulaHoje && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800 border border-red-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    Em Aula
                                  </span>
                                )}
                                {isLivreHoje && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Livre
                                  </span>
                                )}
                                {isConcluidoHoje && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
                                    Concluído
                                  </span>
                                )}
                                {room.statusHoje === 'sem_aula' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200">
                                    Sem Aula
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* COLUNA 2: STATUS & INFORMATIVO OPERACIONAL (DIRETO E SEM TURMAS) */}
                        <div className="flex items-center gap-2 lg:w-[340px] xl:w-[400px] shrink-0 min-w-0">
                          {/* Badge de Status no Desktop */}
                          <div className="hidden lg:block shrink-0">
                            {viewMode === 'dia_anterior' ? (
                              temAulaHoje ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-900 border border-blue-200">
                                  <Clock className="w-2.5 h-2.5 text-[#1D4E8C]" />
                                  Hoje às {room.classesHoje[0].inicio}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                  Livre Hoje
                                </span>
                              )
                            ) : (
                              <>
                                {isEmAulaHoje && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800 border border-red-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    Em Aula
                                  </span>
                                )}
                                {isLivreHoje && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Livre
                                  </span>
                                )}
                                {isConcluidoHoje && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
                                    Concluído
                                  </span>
                                )}
                                {room.statusHoje === 'sem_aula' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200">
                                    Sem Aula
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Texto de apoio operacional conciso (SEM TURMA!) */}
                          <div className="min-w-0 flex-1 truncate text-[11px] leading-tight">
                            {viewMode === 'dia_anterior' ? (
                              temAulaHoje ? (
                                <span className="text-[#1D4E8C] font-bold">
                                  Prioridade: aula hoje às <strong>{room.classesHoje[0].inicio}</strong>
                                </span>
                              ) : (
                                <span className="text-emerald-800 font-bold">
                                  Sem aulas hoje • Liberada para limpeza geral
                                </span>
                              )
                            ) : (
                              <>
                                {isEmAulaHoje && (
                                  <span className="text-red-800 font-bold">
                                    Ocupada até as <strong>{room.currentClassHoje?.fim}</strong>
                                  </span>
                                )}
                                {isLivreHoje && (
                                  <span className="text-emerald-800 font-bold">
                                    {room.nextClassHoje ? (
                                      <span>Liberada até as <strong>{room.nextClassHoje.inicio}</strong></span>
                                    ) : (
                                      <span>Liberada para higienização • Sem mais aulas hoje</span>
                                    )}
                                  </span>
                                )}
                                {isConcluidoHoje && (
                                  <span className="text-[#1D4E8C] font-semibold">
                                    Aulas encerradas hoje • Pronto p/ limpeza
                                  </span>
                                )}
                                {room.statusHoje === 'sem_aula' && (
                                  <span className="text-slate-400 font-normal italic">
                                    Sem atividades agendadas hoje
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* COLUNA 3: CHIPS DE HORÁRIOS COMPACTOS (SEM CÓDIGOS DE TURMA!) */}
                        <div className="flex-1 min-w-0">
                          {viewMode === 'dia_anterior' ? (
                            room.classesOntem.length === 0 ? (
                              <span className="text-[10px] text-slate-400 italic">
                                Sem registros de uso ontem
                              </span>
                            ) : (
                              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                                {room.classesOntem.map((cls, classIdx) => (
                                  <span
                                    key={classIdx}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap border bg-[#F8FAFC] text-[#0F2A52] border-[#CBD5E1] font-semibold"
                                  >
                                    <Clock className="w-2.5 h-2.5 text-[#F4901E]" />
                                    <span>{cls.inicio}–{cls.fim}</span>
                                    <span className="font-sans text-[8px] uppercase font-bold text-[#1D4E8C] bg-[#DBEAFE] px-1 rounded-xs">
                                      {cls.turno[0]}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )
                          ) : (
                            room.classesHoje.length === 0 ? (
                              <span className="text-[10px] text-slate-400 italic hidden lg:inline">
                                Nenhuma aula agendada
                              </span>
                            ) : (
                              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                                {room.classesHoje.map((cls, classIdx) => {
                                  const isCurrent = currentMinutes >= cls.startMinutes && currentMinutes < cls.endMinutes;
                                  const isPast = currentMinutes >= cls.endMinutes;

                                  return (
                                    <span
                                      key={classIdx}
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap border ${
                                        isCurrent
                                          ? 'bg-red-100 text-red-900 border-red-300 font-bold ring-1 ring-red-400'
                                          : isPast
                                          ? 'bg-slate-50 text-slate-400 border-slate-200'
                                          : 'bg-[#F8FAFC] text-[#0F2A52] border-[#CBD5E1] font-semibold'
                                      }`}
                                    >
                                      <Clock className={`w-2.5 h-2.5 ${isCurrent ? 'text-red-500' : 'text-[#F4901E]'}`} />
                                      <span>{cls.inicio}–{cls.fim}</span>
                                      <span className="font-sans text-[8px] uppercase font-bold text-[#1D4E8C] bg-[#DBEAFE] px-1 rounded-xs">
                                        {cls.turno[0]}
                                      </span>
                                      {isCurrent && (
                                        <span className="font-sans text-[8px] uppercase font-black text-red-600 animate-pulse">
                                          Agora
                                        </span>
                                      )}
                                    </span>
                                  );
                                })}
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* LINHA DE AVISO DA GESTÃO (APENAS SE HOUVER OBSERVAÇÃO) */}
                      {hasObs && (
                        <div className="mt-0.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-300 flex items-center gap-1.5 text-[10px] text-amber-950 font-bold shadow-2xs">
                          <AlertTriangle className="w-3 h-3 text-[#F4901E] shrink-0" />
                          <span className="text-[#F4901E] font-black uppercase text-[9px] shrink-0">Aviso:</span>
                          <span className="truncate flex-1">{room.observacao?.observacao}</span>
                          {room.observacao?.atualizadoPor && (
                            <span className="text-[9px] text-amber-800/80 font-normal shrink-0">
                              ({room.observacao.atualizadoPor})
                            </span>
                          )}
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
