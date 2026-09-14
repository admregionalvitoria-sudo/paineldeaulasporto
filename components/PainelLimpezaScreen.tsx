import React, { useContext, useState, useMemo } from 'react';
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
  ArrowLeft
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

const PainelLimpezaScreen: React.FC<PainelLimpezaScreenProps> = ({ onReturnToDashboard }) => {
  const context = useContext(DataContext);
  const { formattedDate, formattedTime } = useCurrentTime();

  // Filtro único para a lista unificada
  const [filter, setFilter] = useState<'todos' | 'com_aula_hoje' | 'livre_hoje' | 'usadas_ontem' | 'com_observacao'>('todos');

  // Minutos atuais do dia para rastrear status em tempo real
  const currentMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, [formattedTime]);

  // Cálculo da data de hoje e do dia anterior com aulas
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

  // Processar dataset UNIFICADO: salas usadas ontem + salas de hoje, SEM REPETIR AMBIENTES
  const unifiedRooms = useMemo(() => {
    if (!context) return [];

    const aulasOntem = context.aulas.filter(a => (a.data || '').trim() === previousDayStr);
    const aulasHoje = context.aulas.filter(a => (a.data || '').trim() === todayStr);

    const allRoomsMap = new Map<string, {
      sala: string;
      nomeCurto: string;
      classesOntem: RoomClassInfo[];
      classesHoje: RoomClassInfo[];
    }>();

    // 1. Processar aulas de ontem
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

    // 2. Processar aulas de hoje (mesclando no mesmo mapa pelo nome normalizado da sala)
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

    const list: RoomCleanItem[] = [];

    allRoomsMap.forEach((roomData, norm) => {
      const sortedOntem = [...roomData.classesOntem].sort((a, b) => a.startMinutes - b.startMinutes);
      const sortedHoje = [...roomData.classesHoje].sort((a, b) => a.startMinutes - b.startMinutes);

      const observacao = context.observacoesLimpeza?.[norm];

      // Inclui no painel se a sala foi usada ontem OU tem aula hoje OU tem aviso da gestão
      if (sortedOntem.length === 0 && sortedHoje.length === 0 && !observacao?.observacao) {
        return;
      }

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

      list.push({
        sala: roomData.sala,
        nomeCurto: roomData.nomeCurto,
        norm,
        classesOntem: sortedOntem,
        classesHoje: sortedHoje,
        currentClassHoje,
        nextClassHoje,
        statusHoje,
        observacao
      });
    });

    // Ordenação Operacional Prioritária:
    // 1º Com aviso da gestão (atenção imediata)
    // 2º Salas com aula hoje ordenadas pelo horário de início mais cedo (precisam de limpeza prioritária antes dos alunos chegarem)
    // 3º Salas usadas ontem que estão livres hoje (liberadas para limpeza completa)
    // 4º Ordem alfabética pelo nome curto
    list.sort((a, b) => {
      const aHasObs = !!a.observacao?.observacao;
      const bHasObs = !!b.observacao?.observacao;
      if (aHasObs && !bHasObs) return -1;
      if (!aHasObs && bHasObs) return 1;

      const aTemAulaHoje = a.classesHoje.length > 0;
      const bTemAulaHoje = b.classesHoje.length > 0;

      if (aTemAulaHoje && !bTemAulaHoje) return -1;
      if (!aTemAulaHoje && bTemAulaHoje) return 1;

      if (aTemAulaHoje && bTemAulaHoje) {
        const aStart = a.classesHoje[0].startMinutes;
        const bStart = b.classesHoje[0].startMinutes;
        if (aStart !== bStart) return aStart - bStart;
      }

      return a.nomeCurto.localeCompare(b.nomeCurto, 'pt-BR', { numeric: true });
    });

    return list;
  }, [context, previousDayStr, todayStr, currentMinutes]);

  // Métricas Unificadas
  const metrics = useMemo(() => {
    const total = unifiedRooms.length;
    const comAulaHoje = unifiedRooms.filter(r => r.classesHoje.length > 0).length;
    const semAulaHoje = unifiedRooms.filter(r => r.classesHoje.length === 0).length;
    const usadasOntem = unifiedRooms.filter(r => r.classesOntem.length > 0).length;
    const comObs = unifiedRooms.filter(r => !!r.observacao?.observacao).length;
    return { total, comAulaHoje, semAulaHoje, usadasOntem, comObs };
  }, [unifiedRooms]);

  // Filtragem da Lista
  const displayRooms = useMemo(() => {
    return unifiedRooms.filter(r => {
      if (filter === 'com_aula_hoje' && r.classesHoje.length === 0) return false;
      if (filter === 'livre_hoje' && r.classesHoje.length > 0) return false;
      if (filter === 'usadas_ontem' && r.classesOntem.length === 0) return false;
      if (filter === 'com_observacao' && !r.observacao?.observacao) return false;
      return true;
    });
  }, [unifiedRooms, filter]);

  return (
    <div className="min-h-screen bg-[#EDF1F6] text-[#0F2A52] flex flex-col font-sans relative selection:bg-[#F4901E] selection:text-white pb-12">
      {/* Background sutil */}
      <div className="fixed inset-0 bg-[#F1F5F9] pointer-events-none z-0" />

      {/* Header Focado em Operação Limpa (sem botões desnecessários) */}
      <header className="sticky top-0 z-30 px-3 py-2 sm:px-6 sm:py-2.5 border-b border-[#CBD5E1] bg-white/95 backdrop-blur-md shadow-xs flex items-center justify-between gap-2">
        {/* Esquerda: Voltar + Logo SENAI */}
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

        {/* Direita: Relógio em tempo real com indicador de status */}
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
      </header>

      {/* Barra de Filtros Rápidos (Lista Única e Direta) */}
      <section className="z-10 px-3 py-2.5 sm:px-6 max-w-[2400px] mx-auto w-full flex flex-col gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 text-[11px] font-bold no-scrollbar flex-nowrap">
          <button
            onClick={() => setFilter('todos')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
              filter === 'todos'
                ? 'bg-[#0F2A52] text-white border-[#0F2A52]'
                : 'bg-white text-[#0F2A52] border-[#CBD5E1] hover:bg-[#F1F5F9]'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5 text-[#F4901E]" />
            <span>Todos os Ambientes ({metrics.total})</span>
          </button>

          <button
            onClick={() => setFilter(filter === 'com_aula_hoje' ? 'todos' : 'com_aula_hoje')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
              filter === 'com_aula_hoje'
                ? 'bg-[#1D4E8C] text-white border-[#1D4E8C] font-black'
                : 'bg-blue-50 text-[#1D4E8C] border-blue-200 hover:bg-blue-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Com Aula Hoje ({metrics.comAulaHoje})</span>
          </button>

          <button
            onClick={() => setFilter(filter === 'livre_hoje' ? 'todos' : 'livre_hoje')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
              filter === 'livre_hoje'
                ? 'bg-emerald-600 text-white border-emerald-700 font-black'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Livre Hoje ({metrics.semAulaHoje})</span>
          </button>

          <button
            onClick={() => setFilter(filter === 'usadas_ontem' ? 'todos' : 'usadas_ontem')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
              filter === 'usadas_ontem'
                ? 'bg-amber-600 text-white border-amber-700 font-black'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Broom className="w-3.5 h-3.5 text-amber-600" />
            <span>Usadas no Dia Anterior ({metrics.usadasOntem})</span>
          </button>

          {metrics.comObs > 0 && (
            <button
              onClick={() => setFilter(filter === 'com_observacao' ? 'todos' : 'com_observacao')}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                filter === 'com_observacao'
                  ? 'bg-[#F4901E] text-white border-[#F4901E] font-black'
                  : 'bg-amber-50 text-[#F4901E] border-amber-300 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Avisos ({metrics.comObs})</span>
            </button>
          )}
        </div>
      </section>

      {/* Lista de Ambientes Unificada - Visualização em Linha sem repetição de ambiente */}
      <main className="flex-1 px-3 sm:px-6 max-w-[2400px] mx-auto w-full z-10">
        {displayRooms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#CBD5E1] p-8 text-center flex flex-col items-center justify-center my-4 shadow-xs">
            <DoorOpen className="w-10 h-10 text-[#F4901E] mb-2" />
            <h3 className="text-base font-black uppercase text-[#0F2A52]">Nenhum ambiente encontrado</h3>
            <p className="text-xs text-[#6B7280] max-w-sm mt-0.5">
              Não foram encontrados ambientes que atendam ao filtro selecionado.
            </p>
            <button
              onClick={() => setFilter('todos')}
              className="mt-3 px-4 py-2 bg-[#0F2A52] text-white rounded-xl text-xs font-bold uppercase hover:bg-[#1D4E8C] cursor-pointer"
            >
              Ver Todos os Ambientes
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 sm:gap-2">
            {/* Cabeçalho de Colunas para Desktop */}
            <div className="hidden lg:flex items-center justify-between px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#6B7280] bg-white/70 backdrop-blur-xs rounded-lg border border-[#CBD5E1] shadow-2xs">
              <div className="w-[260px] xl:w-[300px] flex items-center gap-1.5">
                <DoorOpen className="w-3.5 h-3.5 text-[#F4901E]" />
                <span>Ambiente / Sala</span>
              </div>
              <div className="w-[340px] xl:w-[400px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Situação de Limpeza & Higienização</span>
              </div>
              <div className="flex-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#1D4E8C]" />
                <span>Horários de Uso (Ontem {previousDayDisplay} & Hoje {todayStr})</span>
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {displayRooms.map((room, idx) => {
                const hasObs = !!room.observacao?.observacao;
                const temAulaHoje = room.classesHoje.length > 0;
                const foiUsadaOntem = room.classesOntem.length > 0;
                const isEmAulaHoje = room.statusHoje === 'em_aula';
                const isLivreHoje = !temAulaHoje;

                return (
                  <motion.div
                    key={room.norm}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: Math.min(idx * 0.008, 0.15), duration: 0.15 }}
                    className={`rounded-xl bg-white border transition-all shadow-2xs hover:shadow-xs relative overflow-hidden flex flex-col justify-center px-2.5 py-2 sm:px-4 sm:py-2.5 ${
                      hasObs
                        ? 'border-[#F4901E] ring-1 ring-[#F4901E]/35 bg-amber-50/10'
                        : isEmAulaHoje
                        ? 'border-red-200 bg-red-50/10'
                        : temAulaHoje
                        ? 'border-blue-300 bg-blue-50/10'
                        : 'border-[#CBD5E1]'
                    }`}
                  >
                    {/* Borda lateral indicadora de cor */}
                    <div
                      className={`absolute top-0 bottom-0 left-0 w-1.5 sm:w-2 ${
                        hasObs
                          ? 'bg-[#F4901E]'
                          : isEmAulaHoje
                          ? 'bg-red-500'
                          : temAulaHoje
                          ? 'bg-[#1D4E8C]'
                          : 'bg-emerald-500'
                      }`}
                    />

                    <div className="pl-1.5 sm:pl-2 flex flex-col gap-1">
                      {/* LINHA PRINCIPAL: Sala + Situação + Horários */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-1.5 lg:gap-3">
                        
                        {/* COLUNA 1: NOME DA SALA EM DESTAQUE (SEM SUB-NOMES) */}
                        <div className="flex items-center justify-between lg:justify-start gap-2 min-w-0 lg:w-[260px] xl:w-[300px] shrink-0">
                          <span
                            title={room.sala}
                            className="text-xs sm:text-sm font-black uppercase text-[#0F2A52] tracking-tight bg-[#EEF2F6] border border-[#CBD5E1] px-2 py-0.5 rounded-md shrink-0 shadow-2xs"
                          >
                            {room.nomeCurto}
                          </span>

                          {/* Badge de Status no Mobile (ao lado do nome) */}
                          <div className="shrink-0 lg:hidden">
                            {isEmAulaHoje ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800 border border-red-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                Em Aula
                              </span>
                            ) : temAulaHoje ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-900 border border-blue-200">
                                <Clock className="w-2.5 h-2.5 text-[#1D4E8C]" />
                                Hoje às {room.classesHoje[0].inicio}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                Livre Hoje
                              </span>
                            )}
                          </div>
                        </div>

                        {/* COLUNA 2: SITUAÇÃO DE LIMPEZA & HIGIENIZAÇÃO */}
                        <div className="flex items-center gap-2 lg:w-[340px] xl:w-[400px] shrink-0 min-w-0">
                          {/* Badge de Status no Desktop */}
                          <div className="hidden lg:block shrink-0">
                            {isEmAulaHoje ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800 border border-red-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                Em Aula
                              </span>
                            ) : temAulaHoje ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-900 border border-blue-200">
                                <Clock className="w-2.5 h-2.5 text-[#1D4E8C]" />
                                Hoje às {room.classesHoje[0].inicio}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                Livre Hoje
                              </span>
                            )}
                          </div>

                          {/* Texto explicativo operacional (SEM CÓDIGO DE TURMAS) */}
                          <div className="min-w-0 flex-1 truncate text-[11px] leading-tight">
                            {isEmAulaHoje ? (
                              <span className="text-red-800 font-bold">
                                Ocupada até às <strong>{room.currentClassHoje?.fim}</strong>
                                {foiUsadaOntem && ' • Foi usada ontem'}
                              </span>
                            ) : temAulaHoje ? (
                              foiUsadaOntem ? (
                                <span className="text-[#1D4E8C] font-bold">
                                  Usada ontem • Prioridade: aula hoje às <strong>{room.classesHoje[0].inicio}</strong>
                                </span>
                              ) : (
                                <span className="text-[#1D4E8C] font-medium">
                                  Não usada ontem • Primeira aula hoje às <strong>{room.classesHoje[0].inicio}</strong>
                                </span>
                              )
                            ) : (
                              foiUsadaOntem ? (
                                <span className="text-emerald-800 font-bold">
                                  Usada ontem • Liberada para limpeza geral o dia todo
                                </span>
                              ) : (
                                <span className="text-slate-500 font-normal">
                                  Sem aulas ontem e hoje • Ambiente liberado
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        {/* COLUNA 3: CHIPS DE HORÁRIOS COMPACTOS (ONTEM & HOJE, SEM TURMAS) */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 flex-nowrap">
                            {/* Chips de ontem */}
                            {room.classesOntem.map((cls, classIdx) => (
                              <span
                                key={`ontem-${classIdx}`}
                                title={`Uso ontem (${previousDayDisplay}): ${cls.inicio} às ${cls.fim}`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap border bg-slate-50 text-slate-700 border-slate-300 font-medium shrink-0"
                              >
                                <Clock className="w-2.5 h-2.5 text-slate-400" />
                                <span className="font-sans text-[8px] uppercase font-bold text-slate-600 bg-slate-200 px-1 rounded-xs">
                                  Ontem
                                </span>
                                <span>{cls.inicio}–{cls.fim}</span>
                                <span className="font-sans text-[8px] uppercase font-bold text-slate-600">
                                  [{cls.turno[0]}]
                                </span>
                              </span>
                            ))}

                            {/* Chips de hoje */}
                            {room.classesHoje.map((cls, classIdx) => {
                              const isCurrent = currentMinutes >= cls.startMinutes && currentMinutes < cls.endMinutes;
                              return (
                                <span
                                  key={`hoje-${classIdx}`}
                                  title={`Aula hoje (${todayStr}): ${cls.inicio} às ${cls.fim}`}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap border shrink-0 ${
                                    isCurrent
                                      ? 'bg-red-100 text-red-900 border-red-300 font-bold ring-1 ring-red-400'
                                      : 'bg-blue-50 text-[#0F2A52] border-blue-200 font-medium'
                                  }`}
                                >
                                  <Clock className={`w-2.5 h-2.5 ${isCurrent ? 'text-red-500' : 'text-[#1D4E8C]'}`} />
                                  <span className={`font-sans text-[8px] uppercase font-bold px-1 rounded-xs ${
                                    isCurrent ? 'bg-red-500 text-white' : 'bg-[#1D4E8C] text-white'
                                  }`}>
                                    Hoje
                                  </span>
                                  <span>{cls.inicio}–{cls.fim}</span>
                                  <span className="font-sans text-[8px] uppercase font-bold text-[#1D4E8C]">
                                    [{cls.turno[0]}]
                                  </span>
                                  {isCurrent && (
                                    <span className="font-sans text-[8px] uppercase font-black text-red-600 animate-pulse">
                                      Agora
                                    </span>
                                  )}
                                </span>
                              );
                            })}

                            {room.classesOntem.length === 0 && room.classesHoje.length === 0 && (
                              <span className="text-[10px] text-slate-400 italic">
                                Sem registros de horários
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* LINHA DE AVISO DA GESTÃO (SE HOUVER OBSERVAÇÃO) */}
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
