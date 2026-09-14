import React, { useContext, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DataContext, normalizarNomeAmbiente } from '../context/DataContext';
import useCurrentTime from '../hooks/useCurrentTime';
import { Aula } from '../types';
import { formatarNomeSala } from '../utils/roomFormatter';
import {
  DoorOpen,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';

interface PainelLimpezaScreenProps {
  onReturnToDashboard?: () => void;
  onGoToAdmin?: () => void;
}

type TurnoType = 'Matutino' | 'Vespertino' | 'Noturno';

interface RoomClassInfo {
  aula: Aula;
  inicio: string;
  fim: string;
  startMinutes: number;
  endMinutes: number;
  turno: TurnoType;
}

interface RoomTurnoInfo {
  turno: TurnoType;
  status: 'em_aula' | 'aguardando' | 'concluido';
}

interface RoomCleanItem {
  sala: string;
  nomeCurto: string;
  norm: string;
  classesHoje: RoomClassInfo[];
  currentClassHoje: RoomClassInfo | null;
  nextClassHoje: RoomClassInfo | null;
  turnosHoje: RoomTurnoInfo[];
  cleaningStatus: 'aguardando_limpeza' | 'em_aula' | 'livre';
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

const resolveTurno = (turnoStr?: string, startMinutes?: number): TurnoType => {
  if (turnoStr) {
    const t = turnoStr.toLowerCase().trim();
    if (t.includes('mat')) return 'Matutino';
    if (t.includes('vesp')) return 'Vespertino';
    if (t.includes('not')) return 'Noturno';
  }
  if (startMinutes !== undefined) {
    if (startMinutes < 12 * 60) return 'Matutino';
    if (startMinutes < 18 * 60) return 'Vespertino';
    return 'Noturno';
  }
  return 'Matutino';
};

const parseTimeToMinutes = (timeStr: string | undefined, defaultTurno?: string): { inicio: string; fim: string; start: number; end: number; turno: TurnoType } => {
  let startMinutes = 0;
  let endMinutes = 0;
  let inicio = '07:00';
  let fim = '11:30';

  const turno = resolveTurno(defaultTurno);
  if (turno === 'Vespertino') {
    inicio = '13:00';
    fim = '17:30';
  } else if (turno === 'Noturno') {
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
    if (turno === 'Matutino') {
      startMinutes = 7 * 60;
      endMinutes = 11 * 60 + 30;
    } else if (turno === 'Vespertino') {
      startMinutes = 13 * 60;
      endMinutes = 17 * 60 + 30;
    } else if (turno === 'Noturno') {
      startMinutes = 18 * 60;
      endMinutes = 22 * 60;
    }
  }

  const finalTurno = resolveTurno(defaultTurno, startMinutes);
  return { inicio, fim, start: startMinutes, end: endMinutes, turno: finalTurno };
};

const PainelLimpezaScreen: React.FC<PainelLimpezaScreenProps> = ({ onReturnToDashboard }) => {
  const context = useContext(DataContext);
  const { formattedDate, formattedTime } = useCurrentTime();

  // Filtros alinhados aos 3 novos estados de cores: Aguardando Limpeza (Laranja), Em Aula (Vermelho), Livre (Azul)
  const [filter, setFilter] = useState<'todos' | 'aguardando' | 'em_aula' | 'livre' | 'com_observacao'>('todos');

  // Minutos atuais do dia para rastrear status em tempo real
  const currentMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, [formattedTime]);

  // Cálculo da data de hoje
  const todayStr = useMemo(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  // Processar salas: apenas salas com aulas AGENDADAS HOJE (ou com aviso específico da gestão)
  // Salas usadas ontem que estão livres hoje não são exibidas (conforme solicitado pelo usuário)
  const unifiedRooms = useMemo(() => {
    if (!context) return [];

    const aulasHoje = context.aulas.filter(a => (a.data || '').trim() === todayStr);

    const allRoomsMap = new Map<string, {
      sala: string;
      nomeCurto: string;
      classesHoje: RoomClassInfo[];
    }>();

    // Processar apenas aulas de hoje
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
        turno: timeParsed.turno
      };

      if (!allRoomsMap.has(norm)) {
        allRoomsMap.set(norm, {
          sala: formatarNomeSala(aula.sala) || aula.sala,
          nomeCurto: getNomeCurtoSala(aula.sala),
          classesHoje: [classInfo]
        });
      } else {
        allRoomsMap.get(norm)!.classesHoje.push(classInfo);
      }
    });

    const list: RoomCleanItem[] = [];

    allRoomsMap.forEach((roomData, norm) => {
      const sortedHoje = [...roomData.classesHoje].sort((a, b) => a.startMinutes - b.startMinutes);
      const observacao = context.observacoesLimpeza?.[norm];

      // Apenas exibe salas com agendamento hoje (ou com aviso de gestão ativo)
      if (sortedHoje.length === 0 && !observacao?.observacao) {
        return;
      }

      // Aula atual em andamento
      const currentClassHoje = sortedHoje.find(
        c => currentMinutes >= c.startMinutes && currentMinutes < c.endMinutes
      ) || null;

      // Próxima aula a iniciar
      const nextClassHoje = sortedHoje.find(c => c.startMinutes > currentMinutes) || null;

      // Turnos únicos presentes hoje nesta sala
      const turnosMap = new Map<TurnoType, RoomClassInfo[]>();
      sortedHoje.forEach(c => {
        if (!turnosMap.has(c.turno)) {
          turnosMap.set(c.turno, []);
        }
        turnosMap.get(c.turno)!.push(c);
      });

      const orderTurnos: TurnoType[] = ['Matutino', 'Vespertino', 'Noturno'];
      const turnosHoje: RoomTurnoInfo[] = [];

      orderTurnos.forEach(t => {
        const classesDoTurno = turnosMap.get(t);
        if (!classesDoTurno || classesDoTurno.length === 0) return;

        const isTurnoAtivo = classesDoTurno.some(c => currentMinutes >= c.startMinutes && currentMinutes < c.endMinutes);
        const isTurnoFuturo = classesDoTurno.some(c => c.startMinutes > currentMinutes);
        
        let statusTurno: 'em_aula' | 'aguardando' | 'concluido' = 'concluido';
        if (isTurnoAtivo) {
          statusTurno = 'em_aula';
        } else if (isTurnoFuturo) {
          statusTurno = 'aguardando';
        }

        turnosHoje.push({
          turno: t,
          status: statusTurno
        });
      });

      // Definição dos 3 estados de cor solicitados:
      // 1. Vermelho: quando começar a aula (em aula no momento)
      // 2. Laranja: salas sem o uso no momento e que precisam limpar antes de começar a aula
      // 3. Azul: salas livres / atividades concluídas
      let cleaningStatus: 'aguardando_limpeza' | 'em_aula' | 'livre' = 'livre';

      if (currentClassHoje) {
        cleaningStatus = 'em_aula';
      } else if (nextClassHoje) {
        cleaningStatus = 'aguardando_limpeza';
      } else {
        cleaningStatus = 'livre';
      }

      list.push({
        sala: roomData.sala,
        nomeCurto: roomData.nomeCurto,
        norm,
        classesHoje: sortedHoje,
        currentClassHoje,
        nextClassHoje,
        turnosHoje,
        cleaningStatus,
        observacao
      });
    });

    // Ordenação Operacional Prioritária:
    // 1º Com aviso da gestão (atenção imediata)
    // 2º Salas aguardando limpeza antes da aula (Laranja - prioridade da equipe para limpar a tempo)
    // 3º Salas em aula no momento (Vermelho)
    // 4º Salas livres / concluídas (Azul)
    // 5º Ordem alfabética pelo nome curto
    list.sort((a, b) => {
      const aHasObs = !!a.observacao?.observacao;
      const bHasObs = !!b.observacao?.observacao;
      if (aHasObs && !bHasObs) return -1;
      if (!aHasObs && bHasObs) return 1;

      const priorityOrder: Record<'aguardando_limpeza' | 'em_aula' | 'livre', number> = {
        aguardando_limpeza: 1,
        em_aula: 2,
        livre: 3
      };

      const pA = priorityOrder[a.cleaningStatus];
      const pB = priorityOrder[b.cleaningStatus];

      if (pA !== pB) return pA - pB;

      return a.nomeCurto.localeCompare(b.nomeCurto, 'pt-BR', { numeric: true });
    });

    return list;
  }, [context, todayStr, currentMinutes]);

  // Métricas para a barra de filtros
  const metrics = useMemo(() => {
    const total = unifiedRooms.length;
    const aguardando = unifiedRooms.filter(r => r.cleaningStatus === 'aguardando_limpeza').length;
    const emAula = unifiedRooms.filter(r => r.cleaningStatus === 'em_aula').length;
    const livres = unifiedRooms.filter(r => r.cleaningStatus === 'livre').length;
    const comObs = unifiedRooms.filter(r => !!r.observacao?.observacao).length;
    return { total, aguardando, emAula, livres, comObs };
  }, [unifiedRooms]);

  // Filtragem da Lista
  const displayRooms = useMemo(() => {
    return unifiedRooms.filter(r => {
      if (filter === 'aguardando' && r.cleaningStatus !== 'aguardando_limpeza') return false;
      if (filter === 'em_aula' && r.cleaningStatus !== 'em_aula') return false;
      if (filter === 'livre' && r.cleaningStatus !== 'livre') return false;
      if (filter === 'com_observacao' && !r.observacao?.observacao) return false;
      return true;
    });
  }, [unifiedRooms, filter]);

  return (
    <div className="min-h-screen bg-[#EDF1F6] text-[#0F2A52] flex flex-col font-sans relative selection:bg-[#F4901E] selection:text-white pb-12">
      {/* Background sutil */}
      <div className="fixed inset-0 bg-[#F1F5F9] pointer-events-none z-0" />

      {/* Header Focado em Operação Limpa */}
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

      {/* Barra de Filtros Rápidos com os 3 Novos Estados de Cores */}
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
            onClick={() => setFilter(filter === 'aguardando' ? 'todos' : 'aguardando')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
              filter === 'aguardando'
                ? 'bg-[#F4901E] text-white border-[#F4901E] font-black'
                : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#F4901E]" />
            <span>Aguardando Limpeza ({metrics.aguardando})</span>
          </button>

          <button
            onClick={() => setFilter(filter === 'em_aula' ? 'todos' : 'em_aula')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
              filter === 'em_aula'
                ? 'bg-red-600 text-white border-red-700 font-black'
                : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>Em Aula ({metrics.emAula})</span>
          </button>

          <button
            onClick={() => setFilter(filter === 'livre' ? 'todos' : 'livre')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
              filter === 'livre'
                ? 'bg-[#1D4E8C] text-white border-[#1D4E8C] font-black'
                : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Livres ({metrics.livres})</span>
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

      {/* Lista de Ambientes Agendados - Sem horários, apenas Turnos */}
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
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Situação de Limpeza & Higienização</span>
              </div>
              <div className="flex-1 flex items-center gap-1.5">
                <DoorOpen className="w-3.5 h-3.5 text-[#1D4E8C]" />
                <span>Turnos de Uso da Sala</span>
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {displayRooms.map((room, idx) => {
                const hasObs = !!room.observacao?.observacao;
                const isEmAula = room.cleaningStatus === 'em_aula';
                const isAguardando = room.cleaningStatus === 'aguardando_limpeza';
                const isLivre = room.cleaningStatus === 'livre';

                // Próximo turno a iniciar
                const proximoTurno = room.nextClassHoje ? room.nextClassHoje.turno : null;
                // Turno da aula atual
                const turnoAtual = room.currentClassHoje ? room.currentClassHoje.turno : null;

                return (
                  <motion.div
                    key={room.norm}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: Math.min(idx * 0.008, 0.15), duration: 0.15 }}
                    className={`rounded-xl bg-white border transition-all shadow-2xs hover:shadow-xs relative overflow-hidden flex flex-col justify-center px-2.5 py-2 sm:px-4 sm:py-2.5 ${
                      hasObs
                        ? 'border-[#F4901E] ring-1 ring-[#F4901E]/35 bg-amber-50/15'
                        : isEmAula
                        ? 'border-red-200 bg-red-50/15'
                        : isAguardando
                        ? 'border-amber-300 bg-amber-50/20'
                        : 'border-blue-200 bg-blue-50/15'
                    }`}
                  >
                    {/* Borda lateral indicadora de cor: Laranja (Aguardando), Vermelho (Em Aula), Azul (Livre) */}
                    <div
                      className={`absolute top-0 bottom-0 left-0 w-1.5 sm:w-2 ${
                        hasObs
                          ? 'bg-[#F4901E]'
                          : isEmAula
                          ? 'bg-red-500'
                          : isAguardando
                          ? 'bg-[#F4901E]'
                          : 'bg-blue-600'
                      }`}
                    />

                    <div className="pl-1.5 sm:pl-2 flex flex-col gap-1">
                      {/* LINHA PRINCIPAL: Sala + Situação + Turnos */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-1.5 lg:gap-3">
                        
                        {/* COLUNA 1: NOME DA SALA EM DESTAQUE */}
                        <div className="flex items-center justify-between lg:justify-start gap-2 min-w-0 lg:w-[260px] xl:w-[300px] shrink-0">
                          <span
                            title={room.sala}
                            className="text-xs sm:text-sm font-black uppercase text-[#0F2A52] tracking-tight bg-[#EEF2F6] border border-[#CBD5E1] px-2 py-0.5 rounded-md shrink-0 shadow-2xs"
                          >
                            {room.nomeCurto}
                          </span>

                          {/* Badge de Status no Mobile (ao lado do nome) */}
                          <div className="shrink-0 lg:hidden">
                            {isEmAula ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800 border border-red-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                Em Aula
                              </span>
                            ) : isAguardando ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-950 border border-amber-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#F4901E]" />
                                Aguardando Limpeza
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-900 border border-blue-200">
                                <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
                                Livre
                              </span>
                            )}
                          </div>
                        </div>

                        {/* COLUNA 2: SITUAÇÃO DE LIMPEZA & HIGIENIZAÇÃO (SEM HORÁRIOS) */}
                        <div className="flex items-center gap-2 lg:w-[340px] xl:w-[400px] shrink-0 min-w-0">
                          {/* Badge de Status no Desktop */}
                          <div className="hidden lg:block shrink-0">
                            {isEmAula ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800 border border-red-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                Em Aula
                              </span>
                            ) : isAguardando ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-950 border border-amber-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#F4901E]" />
                                Aguardando Limpeza
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-900 border border-blue-200">
                                <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
                                Livre
                              </span>
                            )}
                          </div>

                          {/* Texto explicativo operacional (APENAS COM O TURNO, SEM HORÁRIOS) */}
                          <div className="min-w-0 flex-1 truncate text-[11px] leading-tight">
                            {isEmAula ? (
                              <span className="text-red-800 font-bold">
                                Ocupada no turno <strong>{turnoAtual}</strong>
                              </span>
                            ) : isAguardando ? (
                              <span className="text-amber-950 font-bold">
                                Limpar antes do turno <strong>{proximoTurno}</strong>
                              </span>
                            ) : (
                              <span className="text-blue-900 font-medium">
                                Ambiente liberado • Turnos de hoje finalizados
                              </span>
                            )}
                          </div>
                        </div>

                        {/* COLUNA 3: CHIPS DE TURNOS DA SALA (MATUTINO / VESPERTINO / NOTURNO) */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-nowrap">
                            {room.turnosHoje.map((tInfo, tIdx) => {
                              if (tInfo.status === 'em_aula') {
                                return (
                                  <span
                                    key={tIdx}
                                    title={`Turno ${tInfo.turno} em andamento`}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-red-100 text-red-900 border-red-300 shadow-2xs shrink-0"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    <span>{tInfo.turno}</span>
                                    <span className="text-[8px] font-black uppercase text-red-700 bg-white/80 px-1 rounded-xs">
                                      Em Aula
                                    </span>
                                  </span>
                                );
                              }
                              if (tInfo.status === 'aguardando') {
                                return (
                                  <span
                                    key={tIdx}
                                    title={`Aguardando início do turno ${tInfo.turno}`}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-amber-100 text-amber-950 border-amber-300 shadow-2xs shrink-0"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#F4901E]" />
                                    <span>{tInfo.turno}</span>
                                    <span className="text-[8px] font-black uppercase text-[#D97706] bg-white/80 px-1 rounded-xs">
                                      Aguardando
                                    </span>
                                  </span>
                                );
                              }
                              return (
                                <span
                                  key={tIdx}
                                  title={`Turno ${tInfo.turno} concluído hoje`}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-blue-50 text-blue-900 border-blue-200 shadow-2xs shrink-0"
                                >
                                  <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
                                  <span>{tInfo.turno}</span>
                                  <span className="text-[8px] font-bold uppercase text-blue-700 bg-white/80 px-1 rounded-xs">
                                    Concluído
                                  </span>
                                </span>
                              );
                            })}

                            {room.turnosHoje.length === 0 && (
                              <span className="text-[10px] text-slate-400 italic">
                                Sem turnos agendados
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
