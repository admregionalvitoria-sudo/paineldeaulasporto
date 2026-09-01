import React, { useState, useContext, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DataContext } from '../context/DataContext';
import useCurrentTime from '../hooks/useCurrentTime';
import { Aula, AgendamentoSala } from '../types';
import { formatarUnidadeCurricular, CANONICAL_UNIDADES_CURRICULARES } from '../utils/curricularUnits';
import { formatarNomeSala } from '../utils/roomFormatter';
import { 
    BuildingIcon, 
    ClockIcon, 
    CalendarIcon, 
    SunIcon, 
    MoonIcon, 
    SunHorizonIcon, 
    PlusCircleIcon, 
    XIcon, 
    UserTieIcon, 
    UsersIcon, 
    SettingsIcon
} from './Icons';

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

const AlertCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
);

const ArrowRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
);

const normalizeTurno = (t: string | undefined) => {
    if (!t) return '';
    return t.toLowerCase().trim();
};

const getHorarioPadrao = (turno: string) => {
    const t = normalizeTurno(turno);
    if (t === 'matutino') return { inicio: '07:00', fim: '11:30' };
    if (t === 'vespertino') return { inicio: '13:00', fim: '17:30' };
    return { inicio: '18:00', fim: '22:00' };
};

const formatDateToBR = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const formatBRToDate = (dateStr: string): Date => {
    if (!dateStr || !dateStr.includes('/')) return new Date();
    const [d, m, y] = dateStr.split('/').map(Number);
    return new Date(y, m - 1, d);
};

const formatInputDateToBR = (inputVal: string): string => {
    if (!inputVal || !inputVal.includes('-')) return '';
    const [y, m, d] = inputVal.split('-');
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
};

const formatBRToInputDate = (brDate: string): string => {
    if (!brDate || !brDate.includes('/')) return '';
    const [d, m, y] = brDate.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

export type SalaStatusType = 'livre' | 'pendente' | 'ocupada_aula' | 'reservada';

export interface SalaDisponibilidade {
    status: SalaStatusType;
    label: string;
    aula?: Aula;
    agendamento?: AgendamentoSala;
}

export const verificarDisponibilidadeSala = (
    sala: string,
    data: string,
    turno: string,
    aulas: Aula[],
    agendamentos: AgendamentoSala[]
): SalaDisponibilidade => {
    const normSala = sala.trim().toLowerCase();
    const normData = data.trim();
    const normTurno = normalizeTurno(turno);

    // 1. Verificar se há aula regular no cronograma oficial
    const aulaOcupando = aulas.find(a => 
        a.sala?.trim().toLowerCase() === normSala &&
        a.data?.trim() === normData &&
        normalizeTurno(a.turno) === normTurno
    );
    if (aulaOcupando) {
        return {
            status: 'ocupada_aula',
            label: 'Ocupada por Aula Regular',
            aula: aulaOcupando
        };
    }

    // 2. Verificar se há agendamento aprovado pelo gestor
    const agendamentoAprovado = agendamentos.find(ag => 
        ag.sala?.trim().toLowerCase() === normSala &&
        ag.data?.trim() === normData &&
        normalizeTurno(ag.turno) === normTurno &&
        ag.status === 'aprovado'
    );
    if (agendamentoAprovado) {
        return {
            status: 'reservada',
            label: 'Reservada (Aprovado pelo Gestor)',
            agendamento: agendamentoAprovado
        };
    }

    // 3. Verificar se há solicitação de agendamento pendente de aprovação
    const agendamentoPendente = agendamentos.find(ag => 
        ag.sala?.trim().toLowerCase() === normSala &&
        ag.data?.trim() === normData &&
        normalizeTurno(ag.turno) === normTurno &&
        ag.status === 'pendente'
    );
    if (agendamentoPendente) {
        return {
            status: 'pendente',
            label: 'Solicitação Pendente de Aprovação',
            agendamento: agendamentoPendente
        };
    }

    // 4. Caso contrário, a sala está LIVRE para agendamento
    return {
        status: 'livre',
        label: 'Disponível / Livre'
    };
};

const AgendamentoModal: React.FC<{
    sala: string;
    initialData: string;
    initialTurno: string;
    onClose: () => void;
    onSuccess: (msg: string) => void;
}> = ({ sala, initialData, initialTurno, onClose, onSuccess }) => {
    const context = useContext(DataContext);
    const [data, setData] = useState(initialData || formatDateToBR(new Date()));
    const [turno, setTurno] = useState(initialTurno || 'Matutino');
    const [solicitante, setSolicitante] = useState('');
    const [emailSolicitante, setEmailSolicitante] = useState('');
    const [turma, setTurma] = useState('');
    const [disciplina, setDisciplina] = useState('');
    const [motivo, setMotivo] = useState('');
    const [horarioInicio, setHorarioInicio] = useState(getHorarioPadrao(initialTurno || 'Matutino').inicio);
    const [horarioFim, setHorarioFim] = useState(getHorarioPadrao(initialTurno || 'Matutino').fim);
    const [submitting, setSubmitting] = useState(false);
    const [errorNotice, setErrorNotice] = useState<string | null>(null);

    const handleTurnoChange = (novoTurno: string) => {
        setTurno(novoTurno);
        const padrao = getHorarioPadrao(novoTurno);
        setHorarioInicio(padrao.inicio);
        setHorarioFim(padrao.fim);
    };

    // Verificação de disponibilidade em tempo real para os parâmetros digitados
    const dispAtual = useMemo(() => {
        if (!context) return { status: 'livre', label: 'Disponível' } as SalaDisponibilidade;
        return verificarDisponibilidadeSala(sala, data, turno, context.aulas, context.agendamentos);
    }, [sala, data, turno, context?.aulas, context?.agendamentos]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!solicitante.trim()) {
            setErrorNotice('Por favor, informe o nome do solicitante / instrutor.');
            return;
        }
        if (!data.trim()) {
            setErrorNotice('Por favor, informe a data do agendamento.');
            return;
        }

        if (dispAtual.status === 'ocupada_aula') {
            setErrorNotice('Esta sala já possui aula regular cadastrada no cronograma para esta data e turno.');
            return;
        }
        if (dispAtual.status === 'reservada') {
            setErrorNotice('Esta sala já possui reserva aprovada pelo gestor para este horário.');
            return;
        }

        try {
            setSubmitting(true);
            setErrorNotice(null);
            await context?.solicitarAgendamento({
                sala,
                data: data.trim(),
                turno,
                horarioInicio,
                horarioFim,
                solicitante: solicitante.trim(),
                emailSolicitante: emailSolicitante.trim(),
                turma: turma.trim(),
                disciplina: disciplina.trim(),
                motivo: motivo.trim()
            });

            onSuccess(`Solicitação para o ambiente "${sala}" enviada com sucesso! O status permanecerá como PENDENTE até a aprovação do gestor no painel admin.`);
            onClose();
        } catch (err: any) {
            setErrorNotice(err.message || 'Erro ao enviar solicitação.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#0F2A52]/80 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-[#E5E7EB] w-full max-w-xl rounded-[2.5rem] p-6 md:p-8 shadow-2xl overflow-hidden relative text-[#0F2A52]"
            >
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#F4901E] animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F4901E]">
                                Solicitação de Sala
                            </span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#0F2A52] mt-1">
                            {formatarNomeSala(sala)}
                        </h2>
                        <p className="text-xs text-[#64748B] font-medium mt-0.5">
                            Preencha os dados da aula ou atividade para solicitar autorização ao gestor.
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-[#F1F5F9] rounded-full transition-all text-[#6B7280] hover:text-[#0F2A52]"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Status da Sala Selecionada */}
                <div className={`p-3 rounded-2xl mb-5 flex items-center justify-between text-xs font-bold border ${
                    dispAtual.status === 'livre' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : dispAtual.status === 'pendente'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}>
                    <div className="flex items-center gap-2">
                        {dispAtual.status === 'livre' && <CheckCircleIcon className="w-4 h-4 text-emerald-600" />}
                        {dispAtual.status === 'pendente' && <ClockIcon className="w-4 h-4 text-amber-600" />}
                        {(dispAtual.status === 'ocupada_aula' || dispAtual.status === 'reservada') && <AlertCircleIcon className="w-4 h-4 text-red-600" />}
                        <span>{data} • {turno}: <strong>{dispAtual.label}</strong></span>
                    </div>
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-white/70">
                        {dispAtual.status === 'livre' ? 'Livre para Solicitar' : dispAtual.status === 'pendente' ? 'Já Solicitada' : 'Indisponível'}
                    </span>
                </div>

                {errorNotice && (
                    <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                        <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
                        <span>{errorNotice}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                    <datalist id="uc-list-agendamento">
                        {CANONICAL_UNIDADES_CURRICULARES.map((uc, i) => (
                            <option key={i} value={uc} />
                        ))}
                    </datalist>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider px-1">
                                Data do Agendamento *
                            </label>
                            <input 
                                type="date"
                                value={formatBRToInputDate(data)}
                                onChange={e => setData(formatInputDateToBR(e.target.value))}
                                required
                                className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded-xl text-xs font-bold outline-none focus:border-[#F4901E] text-[#0F2A52]"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider px-1">
                                Turno *
                            </label>
                            <select 
                                value={turno}
                                onChange={e => handleTurnoChange(e.target.value)}
                                className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded-xl text-xs font-bold outline-none focus:border-[#F4901E] text-[#0F2A52]"
                            >
                                <option value="Matutino">Matutino (07:00 — 11:30)</option>
                                <option value="Vespertino">Vespertino (13:00 — 17:30)</option>
                                <option value="Noturno">Noturno (18:00 — 22:00)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider px-1">
                                Solicitante / Instrutor *
                            </label>
                            <input 
                                type="text"
                                placeholder="Nome completo do instrutor..."
                                value={solicitante}
                                onChange={e => setSolicitante(e.target.value)}
                                required
                                className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded-xl text-xs font-bold outline-none focus:border-[#F4901E] text-[#0F2A52]"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider px-1">
                                Turma (Opcional)
                            </label>
                            <input 
                                type="text"
                                placeholder="Ex: HTC-PORT-1-03"
                                value={turma}
                                onChange={e => setTurma(e.target.value)}
                                className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded-xl text-xs font-bold outline-none focus:border-[#F4901E] text-[#0F2A52]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider px-1">
                                Unidade Curricular / Disciplina
                            </label>
                            <input 
                                list="uc-list-agendamento"
                                type="text"
                                placeholder="Selecione ou digite..."
                                value={disciplina}
                                onChange={e => setDisciplina(e.target.value)}
                                className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded-xl text-xs font-bold outline-none focus:border-[#F4901E] text-[#0F2A52]"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider px-1">
                                Horário Específico (Início - Fim)
                            </label>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="time"
                                    value={horarioInicio}
                                    onChange={e => setHorarioInicio(e.target.value)}
                                    className="bg-[#F8FAFC] border border-[#CBD5E1] p-2.5 rounded-xl text-xs font-bold outline-none focus:border-[#F4901E] text-[#0F2A52] flex-1 text-center"
                                />
                                <span className="text-[#64748B] font-bold text-xs">até</span>
                                <input 
                                    type="time"
                                    value={horarioFim}
                                    onChange={e => setHorarioFim(e.target.value)}
                                    className="bg-[#F8FAFC] border border-[#CBD5E1] p-2.5 rounded-xl text-xs font-bold outline-none focus:border-[#F4901E] text-[#0F2A52] flex-1 text-center"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider px-1">
                            Justificativa / Motivo da Solicitação
                        </label>
                        <textarea 
                            rows={2}
                            placeholder="Ex: Reposição de aula prática no laboratório, treinamento de simuladores, evento especial..."
                            value={motivo}
                            onChange={e => setMotivo(e.target.value)}
                            className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52] resize-none"
                        />
                    </div>

                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2 mt-1">
                        <span className="text-amber-600 font-bold text-sm">ℹ️</span>
                        <p className="leading-relaxed">
                            <strong>Aviso importante:</strong> O agendamento ficará com status <strong>PENDENTE</strong>. Ele só será liberado e entrará no painel de aulas após a autorização do gestor na tela administrativa.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-3 rounded-xl border border-[#CBD5E1] text-[#64748B] font-bold text-xs hover:bg-[#F1F5F9] transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || dispAtual.status === 'ocupada_aula' || dispAtual.status === 'reservada'}
                            className="flex-1 bg-[#F4901E] text-white py-3.5 rounded-xl font-black uppercase text-xs hover:bg-[#E67E22] transition-all shadow-md active:scale-95 tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <span>Registrando...</span>
                            ) : (
                                <>
                                    <PlusCircleIcon className="w-4 h-4" />
                                    <span>Enviar Solicitação de Sala</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// Modal de Visualização da Matriz de Disponibilidade de uma Sala Específica
const SalaDetalhesModal: React.FC<{
    sala: string;
    onClose: () => void;
    onOpenSolicitacao: (sala: string, data: string, turno: string) => void;
}> = ({ sala, onClose, onOpenSolicitacao }) => {
    const context = useContext(DataContext);
    const [selectedTurnoTab, setSelectedTurnoTab] = useState<'todos' | 'Matutino' | 'Vespertino' | 'Noturno'>('todos');

    // Gerar os próximos 10 dias a partir de hoje
    const proximosDias = useMemo(() => {
        const dias = [];
        const hoje = new Date();
        for (let i = 0; i < 10; i++) {
            const d = new Date();
            d.setDate(hoje.getDate() + i);
            dias.push({
                dataObj: d,
                dataStr: formatDateToBR(d),
                diaSemana: d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase(),
                diaMes: `${d.getDate()}/${d.getMonth() + 1}`,
                isHoje: i === 0,
                isAmanha: i === 1
            });
        }
        return dias;
    }, []);

    const turnos = ['Matutino', 'Vespertino', 'Noturno'];

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 bg-[#0F2A52]/80 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-white border border-[#E5E7EB] w-full max-w-4xl rounded-[2.5rem] p-6 md:p-8 shadow-2xl overflow-hidden relative text-[#0F2A52] flex flex-col max-h-[90vh]"
            >
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#1D4E8C]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1D4E8C]">
                                Calendário de Disponibilidade
                            </span>
                        </div>
                        <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight text-[#0F2A52] mt-1">
                            {formatarNomeSala(sala)}
                        </h2>
                        <p className="text-xs text-[#64748B] font-medium mt-0.5">
                            Veja abaixo as datas livres e ocupadas. Clique em qualquer horário livre para solicitar o agendamento.
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2.5 hover:bg-[#F1F5F9] rounded-full transition-all text-[#6B7280] hover:text-[#0F2A52]"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Legenda dos Status */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-xs mb-4">
                    <span className="text-[10px] font-black uppercase text-[#64748B]">Legenda:</span>
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Livre / Disponível</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>Pendente de Aprovação</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-red-800 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span>Ocupada por Aula</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>Reservada (Aprovado)</span>
                    </div>
                </div>

                {/* Grid dos Próximos 10 Dias */}
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {proximosDias.map(dia => {
                            return (
                                <div 
                                    key={dia.dataStr}
                                    className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 transition-all ${
                                        dia.isHoje 
                                        ? 'bg-amber-50/40 border-amber-300 shadow-sm' 
                                        : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
                                    }`}
                                >
                                    <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-xs uppercase text-[#0F2A52]">{dia.diaSemana}</span>
                                            <span className="text-xs font-bold text-[#64748B]">{dia.dataStr}</span>
                                        </div>
                                        {dia.isHoje && (
                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-[#F4901E] text-white rounded-full">
                                                Hoje
                                            </span>
                                        )}
                                        {dia.isAmanha && (
                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-[#1D4E8C] text-white rounded-full">
                                                Amanhã
                                            </span>
                                        )}
                                    </div>

                                    {/* 3 Turnos do Dia */}
                                    <div className="flex flex-col gap-2">
                                        {turnos.map(t => {
                                            const disp = context ? verificarDisponibilidadeSala(sala, dia.dataStr, t, context.aulas, context.agendamentos) : { status: 'livre', label: 'Livre' } as SalaDisponibilidade;
                                            
                                            return (
                                                <div 
                                                    key={t}
                                                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                                                        disp.status === 'livre'
                                                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 hover:bg-emerald-100/80 cursor-pointer'
                                                        : disp.status === 'pendente'
                                                        ? 'bg-amber-50 border-amber-200 text-amber-950'
                                                        : disp.status === 'reservada'
                                                        ? 'bg-blue-50 border-blue-200 text-blue-950'
                                                        : 'bg-red-50/70 border-red-200 text-red-950'
                                                    }`}
                                                    onClick={() => {
                                                        if (disp.status === 'livre') {
                                                            onOpenSolicitacao(sala, dia.dataStr, t);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                                disp.status === 'livre' ? 'bg-emerald-500' :
                                                                disp.status === 'pendente' ? 'bg-amber-500' :
                                                                disp.status === 'reservada' ? 'bg-blue-500' : 'bg-red-500'
                                                            }`} />
                                                            {t}
                                                        </span>
                                                        <span className="text-[10px] text-[#475569] font-medium truncate mt-0.5">
                                                            {disp.status === 'livre' && 'Disponível'}
                                                            {disp.status === 'pendente' && `Pendente: ${disp.agendamento?.solicitante || 'Aguardando Gestor'}`}
                                                            {disp.status === 'reservada' && `Reservada: ${disp.agendamento?.solicitante || 'Confirmado'}`}
                                                            {disp.status === 'ocupada_aula' && `${disp.aula?.turma || 'Aula'} • ${disp.aula?.instrutor || ''}`}
                                                        </span>
                                                    </div>

                                                    {disp.status === 'livre' ? (
                                                        <button 
                                                            type="button"
                                                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-black text-[10px] uppercase hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-xs flex-shrink-0"
                                                        >
                                                            <span>Agendar</span>
                                                            <ArrowRightIcon className="w-3 h-3" />
                                                        </button>
                                                    ) : (
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex-shrink-0 ${
                                                            disp.status === 'pendente' ? 'bg-amber-200/80 text-amber-900' :
                                                            disp.status === 'reservada' ? 'bg-blue-200/80 text-blue-900' : 'bg-red-200/80 text-red-900'
                                                        }`}>
                                                            {disp.status === 'pendente' ? 'Pendente' : disp.status === 'reservada' ? 'Reservado' : 'Ocupada'}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
                    <span className="text-xs text-[#64748B] font-medium">
                        Ambiente: <strong className="text-[#0F2A52]">{formatarNomeSala(sala)}</strong>
                    </span>
                    <button 
                        onClick={() => onOpenSolicitacao(sala, formatDateToBR(new Date()), 'Matutino')}
                        className="bg-[#F4901E] text-white px-5 py-2.5 rounded-xl font-black uppercase text-xs hover:bg-[#E67E22] transition-all shadow-md flex items-center gap-2"
                    >
                        <PlusCircleIcon className="w-4 h-4" />
                        <span>Abrir Formulário de Agendamento</span>
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const AgendamentoScreen: React.FC<{
    onReturnToDashboard: () => void;
    onGoToAdmin: () => void;
}> = ({ onReturnToDashboard, onGoToAdmin }) => {
    const context = useContext(DataContext);
    const { formattedDate, formattedTime } = useCurrentTime();

    // Filtros de busca
    const [selectedDate, setSelectedDate] = useState<string>(formatDateToBR(new Date()));
    const [selectedTurno, setSelectedTurno] = useState<string>('todos');
    const [statusFilter, setStatusFilter] = useState<'todos' | 'livre' | 'pendente' | 'ocupada'>('todos');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Modais
    const [modalSolicitacao, setModalSolicitacao] = useState<{
        open: boolean;
        sala: string;
        data: string;
        turno: string;
    }>({ open: false, sala: '', data: '', turno: 'Matutino' });

    const [modalDetalhesSala, setModalDetalhesSala] = useState<string | null>(null);
    const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

    // Salas cadastradas no sistema
    const salas = context?.salasCadastradas || [];

    // Calcular disponibilidade de cada sala para a data e turno selecionados
    const salasComDisponibilidade = useMemo(() => {
        if (!context) return [];
        return salas.map(sala => {
            const dispMatutino = verificarDisponibilidadeSala(sala, selectedDate, 'Matutino', context.aulas, context.agendamentos);
            const dispVespertino = verificarDisponibilidadeSala(sala, selectedDate, 'Vespertino', context.aulas, context.agendamentos);
            const dispNoturno = verificarDisponibilidadeSala(sala, selectedDate, 'Noturno', context.aulas, context.agendamentos);

            let dispFoco: SalaDisponibilidade;
            if (selectedTurno === 'Matutino') dispFoco = dispMatutino;
            else if (selectedTurno === 'Vespertino') dispFoco = dispVespertino;
            else if (selectedTurno === 'Noturno') dispFoco = dispNoturno;
            else {
                // Se turno for "todos", considera 'livre' se tiver pelo menos 1 turno livre
                const temLivre = dispMatutino.status === 'livre' || dispVespertino.status === 'livre' || dispNoturno.status === 'livre';
                const temPendente = dispMatutino.status === 'pendente' || dispVespertino.status === 'pendente' || dispNoturno.status === 'pendente';
                dispFoco = {
                    status: temLivre ? 'livre' : (temPendente ? 'pendente' : 'ocupada_aula'),
                    label: temLivre ? 'Com Horários Livres' : (temPendente ? 'Com Solicitação Pendente' : 'Ocupada em todos os turnos')
                };
            }

            return {
                sala,
                dispFoco,
                dispMatutino,
                dispVespertino,
                dispNoturno,
            };
        });
    }, [salas, selectedDate, selectedTurno, context?.aulas, context?.agendamentos]);

    // Filtragem e Ordenação das salas (Prioridade: Salas com ocupação no dia primeiro)
    const salasFiltradas = useMemo(() => {
        const filtered = salasComDisponibilidade.filter(item => {
            // Filtro por texto
            if (searchQuery.trim()) {
                const term = searchQuery.toLowerCase().trim();
                const matchRaw = item.sala.toLowerCase().includes(term);
                const matchFormatted = formatarNomeSala(item.sala).toLowerCase().includes(term);
                if (!matchRaw && !matchFormatted) return false;
            }

            // Filtro por status
            if (statusFilter === 'livre' && item.dispFoco.status !== 'livre') return false;
            if (statusFilter === 'pendente' && item.dispFoco.status !== 'pendente') return false;
            if (statusFilter === 'ocupada' && (item.dispFoco.status === 'livre' || item.dispFoco.status === 'pendente')) return false;

            return true;
        });

        // Ordenação: 
        // 1. Salas que possuem alguma ocupação (aula ou agendamento aprovado) ou pendência no dia selecionado aparecem primeiro
        // 2. Ordem alfabética natural do nome formatado da sala
        return [...filtered].sort((a, b) => {
            const hasOcupacaoA = a.dispMatutino.status !== 'livre' || a.dispVespertino.status !== 'livre' || a.dispNoturno.status !== 'livre';
            const hasOcupacaoB = b.dispMatutino.status !== 'livre' || b.dispVespertino.status !== 'livre' || b.dispNoturno.status !== 'livre';

            if (hasOcupacaoA && !hasOcupacaoB) return -1;
            if (!hasOcupacaoA && hasOcupacaoB) return 1;

            const nomeA = formatarNomeSala(a.sala);
            const nomeB = formatarNomeSala(b.sala);
            return nomeA.localeCompare(nomeB, 'pt-BR', { numeric: true });
        });
    }, [salasComDisponibilidade, searchQuery, statusFilter]);

    // Contadores rápidos
    const totalSalas = salasComDisponibilidade.length;
    const totalLivres = salasComDisponibilidade.filter(s => s.dispFoco.status === 'livre').length;
    const totalPendentes = salasComDisponibilidade.filter(s => s.dispFoco.status === 'pendente').length;

    // Próximas datas rápidas (Hoje, Amanhã, D+2, D+3, D+4, D+5)
    const datasRapidas = useMemo(() => {
        const list = [];
        const hoje = new Date();
        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setDate(hoje.getDate() + i);
            list.push({
                dataStr: formatDateToBR(d),
                label: i === 0 ? 'Hoje' : (i === 1 ? 'Amanhã' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase()),
                diaMes: `${d.getDate()}/${d.getMonth() + 1}`
            });
        }
        return list;
    }, []);

    return (
        <div className="min-h-screen w-screen bg-[#EDF1F6] text-[#0F2A52] font-sans flex flex-col">
            {/* Header Limpo e Otimizado para Mobile */}
            <header className="flex-none px-4 py-3 md:px-8 border-b border-[#E5E7EB] bg-white/95 backdrop-blur-xl shadow-xs sticky top-0 z-30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <img 
                        src="https://res.cloudinary.com/dlrdwblso/image/upload/v1785334994/SENAI_COMPLETA_PREFERENCIAL_svm23u.png" 
                        alt="Logo SENAI" 
                        className="h-7 md:h-9 w-auto object-contain"
                        referrerPolicy="no-referrer"
                    />
                    <div className="h-6 w-px bg-[#E2E8F0]" />
                    <h1 className="text-xs md:text-sm font-black uppercase text-[#0F2A52] tracking-tight">
                        Agendamento de Salas
                    </h1>
                </div>

                {/* Relógio & Data no Header */}
                <div className="flex flex-col text-right">
                    <span className="text-xs md:text-sm font-black text-[#0F2A52] leading-none">{formattedTime}</span>
                    <span className="text-[9px] font-bold uppercase text-[#6B7280] tracking-wider mt-0.5">{formattedDate}</span>
                </div>
            </header>

            {/* Banner de Feedback */}
            <AnimatePresence>
                {feedbackBanner && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-emerald-600 text-white p-3.5 px-6 shadow-md flex items-center justify-between text-xs font-bold z-20"
                    >
                        <div className="flex items-center gap-2">
                            <CheckCircleIcon className="w-4 h-4 text-emerald-200" />
                            <span>{feedbackBanner}</span>
                        </div>
                        <button onClick={() => setFeedbackBanner(null)} className="text-white hover:opacity-80 p-1">
                            <XIcon className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Corpo Principal */}
            <main className="flex-1 max-w-5xl mx-auto w-full p-3 sm:p-4 md:p-6 flex flex-col gap-4">

                {/* Painel de Filtros e Busca */}
                <div className="bg-white rounded-2xl md:rounded-3xl p-3.5 sm:p-5 md:p-6 border border-[#E2E8F0] shadow-xs flex flex-col gap-3.5">
                    
                    {/* Barra de Pesquisa de Salas */}
                    <div className="relative flex items-center">
                        <SearchIcon className="w-4 h-4 md:w-5 md:h-5 text-[#1D4E8C] absolute left-3.5 pointer-events-none" />
                        <input 
                            type="text"
                            placeholder="Buscar sala por nome (ex: LAB01, SALA 05, LAB04)..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 md:pl-12 pr-10 py-3 rounded-xl md:rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs md:text-sm font-bold text-[#0F2A52] outline-none focus:border-[#F4901E] focus:bg-white transition-all shadow-inner"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3.5 text-xs font-black text-[#64748B] hover:text-[#0F2A52]"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Seletor de Datas Rápidas */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase text-[#64748B] tracking-wider">
                                Data:
                            </label>
                            <div className="flex items-center gap-1 text-xs">
                                <span className="text-[#64748B] text-[10px] font-bold">Outra:</span>
                                <input 
                                    type="date"
                                    value={formatBRToInputDate(selectedDate)}
                                    onChange={e => setSelectedDate(formatInputDateToBR(e.target.value))}
                                    className="bg-[#F8FAFC] border border-[#CBD5E1] px-2 py-0.5 rounded-lg text-xs font-bold text-[#0F2A52] outline-none focus:border-[#F4901E]"
                                />
                            </div>
                        </div>

                        {/* Scroll horizontal suave das datas para smartphone */}
                        <div className="flex overflow-x-auto gap-2 pb-1 custom-scrollbar">
                            {datasRapidas.map(d => (
                                <button
                                    key={d.dataStr}
                                    onClick={() => setSelectedDate(d.dataStr)}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 flex items-center gap-1.5 ${
                                        selectedDate === d.dataStr
                                        ? 'bg-[#0F2A52] text-white shadow-sm'
                                        : 'bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F2A52]'
                                    }`}
                                >
                                    <CalendarIcon className="w-3.5 h-3.5" />
                                    <span>{d.label}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${selectedDate === d.dataStr ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                        {d.diaMes}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filtros de Turno e Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[#E2E8F0]">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase text-[#64748B] tracking-wider">
                                Turno:
                            </label>
                            <div className="flex bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] gap-1 overflow-x-auto">
                                {[
                                    { id: 'todos', label: 'Todos' },
                                    { id: 'Matutino', label: 'Manhã' },
                                    { id: 'Vespertino', label: 'Tarde' },
                                    { id: 'Noturno', label: 'Noite' },
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelectedTurno(t.id)}
                                        className={`flex-1 min-w-[50px] py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                                            selectedTurno === t.id
                                            ? 'bg-[#F4901E] text-white shadow-xs'
                                            : 'text-[#64748B] hover:text-[#0F2A52]'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase text-[#64748B] tracking-wider">
                                Status:
                            </label>
                            <div className="flex bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] gap-1 overflow-x-auto">
                                {[
                                    { id: 'todos', label: 'Todas' },
                                    { id: 'livre', label: 'Livres' },
                                    { id: 'pendente', label: 'Pendentes' },
                                    { id: 'ocupada', label: 'Ocupadas' },
                                ].map(st => (
                                    <button
                                        key={st.id}
                                        onClick={() => setStatusFilter(st.id as any)}
                                        className={`flex-1 min-w-[50px] py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                                            statusFilter === st.id
                                            ? 'bg-[#0F2A52] text-white shadow-xs'
                                            : 'text-[#64748B] hover:text-[#0F2A52]'
                                        }`}
                                    >
                                        {st.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lista Vertical de Salas Otimizada para Mobile */}
                <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-black uppercase tracking-wider text-[#0F2A52]">
                            Ambientes / Salas ({salasFiltradas.length})
                        </span>
                        <span className="text-[11px] text-[#64748B]">
                            {selectedDate} • {selectedTurno === 'todos' ? 'Todos os turnos' : selectedTurno}
                        </span>
                    </div>

                    {/* Linhas da Lista de Salas */}
                    <div className="flex flex-col gap-2.5">
                        {salasFiltradas.map(item => {
                            const isLivre = item.dispFoco.status === 'livre';
                            const isPendente = item.dispFoco.status === 'pendente';
                            const nomeFormatado = formatarNomeSala(item.sala);

                            return (
                                <motion.div 
                                    key={item.sala}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`bg-white rounded-2xl p-3.5 sm:p-4 border transition-all duration-200 shadow-xs flex flex-col gap-3 hover:shadow-md ${
                                        isLivre 
                                        ? 'border-emerald-200/90' 
                                        : isPendente
                                        ? 'border-amber-200/90'
                                        : 'border-slate-200'
                                    }`}
                                >
                                    {/* Topo do item da lista: Nome da sala + Badge geral + Ações */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 ${
                                                isLivre ? 'bg-emerald-100 text-emerald-800' : isPendente ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                <BuildingIcon className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <h3 className="text-sm sm:text-base font-black uppercase text-[#0F2A52] tracking-tight truncate">
                                                    {nomeFormatado}
                                                </h3>
                                                <span className="text-[10px] font-bold text-[#64748B] flex items-center gap-1">
                                                    Ambiente SENAI
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0">
                                            <button
                                                onClick={() => setModalDetalhesSala(item.sala)}
                                                className="px-3 py-2 rounded-xl border border-[#CBD5E1] text-[#0F2A52] hover:bg-[#F1F5F9] font-bold text-xs transition-all flex items-center gap-1"
                                                title="Ver todos os horários desta sala"
                                            >
                                                <CalendarIcon className="w-3.5 h-3.5 text-[#1D4E8C]" />
                                                <span className="text-[11px]">Calendário</span>
                                            </button>

                                            <button
                                                onClick={() => setModalSolicitacao({
                                                    open: true,
                                                    sala: item.sala,
                                                    data: selectedDate,
                                                    turno: selectedTurno === 'todos' ? 'Matutino' : selectedTurno
                                                })}
                                                className={`px-4 py-2 rounded-xl font-black uppercase text-xs transition-all flex items-center gap-1.5 shadow-xs ${
                                                    isLivre
                                                    ? 'bg-[#F4901E] text-white hover:bg-[#E67E22]'
                                                    : 'bg-[#0F2A52] text-white hover:bg-[#1D4E8C]'
                                                }`}
                                            >
                                                <PlusCircleIcon className="w-3.5 h-3.5" />
                                                <span>Agendar</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Indicadores dos 3 Turnos em Linha Horizontal Otimizada para Mobile */}
                                    <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-[#F1F5F9]">
                                        {[
                                            { nome: 'Manhã', disp: item.dispMatutino, turnoKey: 'Matutino' },
                                            { nome: 'Tarde', disp: item.dispVespertino, turnoKey: 'Vespertino' },
                                            { nome: 'Noite', disp: item.dispNoturno, turnoKey: 'Noturno' },
                                        ].map(tObj => {
                                            const status = tObj.disp.status;
                                            const isSlotLivre = status === 'livre';

                                            return (
                                                <button
                                                    key={tObj.nome}
                                                    onClick={() => {
                                                        if (isSlotLivre) {
                                                            setModalSolicitacao({
                                                                open: true,
                                                                sala: item.sala,
                                                                data: selectedDate,
                                                                turno: tObj.turnoKey
                                                            });
                                                        }
                                                    }}
                                                    className={`p-2 rounded-xl border text-left transition-all flex flex-col gap-0.5 ${
                                                        status === 'livre' ? 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400 cursor-pointer' :
                                                        status === 'pendente' ? 'bg-amber-50/70 border-amber-200 cursor-default' :
                                                        status === 'reservada' ? 'bg-blue-50/70 border-blue-200 cursor-default' : 'bg-red-50/70 border-red-200 cursor-default'
                                                    }`}
                                                >
                                                    <span className="text-[10px] font-bold text-[#64748B]">{tObj.nome}</span>
                                                    <span className={`text-[10px] font-black truncate ${
                                                        status === 'livre' ? 'text-emerald-700' :
                                                        status === 'pendente' ? 'text-amber-700' :
                                                        status === 'reservada' ? 'text-blue-700' : 'text-red-700'
                                                    }`}>
                                                        {status === 'livre' ? '🟢 Livre' : 
                                                         status === 'pendente' ? '🟡 Pendente' : 
                                                         status === 'reservada' ? '🔵 Reservado' : '🔴 Aula'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {salasFiltradas.length === 0 && (
                        <div className="bg-white rounded-2xl md:rounded-3xl p-8 md:p-12 text-center border border-[#E2E8F0] flex flex-col items-center justify-center gap-3">
                            <BuildingIcon className="w-10 h-10 text-[#94A3B8]" />
                            <h3 className="text-sm md:text-base font-black uppercase text-[#0F2A52]">Nenhuma sala encontrada</h3>
                            <p className="text-xs text-[#64748B] max-w-md">
                                Nenhuma sala corresponde aos filtros selecionados. Tente limpar os filtros ou selecionar outra data.
                            </p>
                            <button 
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedTurno('todos');
                                    setStatusFilter('todos');
                                }}
                                className="mt-2 bg-[#0F2A52] text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-[#1D4E8C] transition-all"
                            >
                                Limpar Filtros
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal de Formulário de Agendamento */}
            <AnimatePresence>
                {modalSolicitacao.open && (
                    <AgendamentoModal 
                        sala={modalSolicitacao.sala}
                        initialData={modalSolicitacao.data}
                        initialTurno={modalSolicitacao.turno}
                        onClose={() => setModalSolicitacao({ open: false, sala: '', data: '', turno: 'Matutino' })}
                        onSuccess={(msg) => setFeedbackBanner(msg)}
                    />
                )}
            </AnimatePresence>

            {/* Modal de Matriz de Disponibilidade da Sala */}
            <AnimatePresence>
                {modalDetalhesSala && (
                    <SalaDetalhesModal 
                        sala={modalDetalhesSala}
                        onClose={() => setModalDetalhesSala(null)}
                        onOpenSolicitacao={(s, d, t) => {
                            setModalDetalhesSala(null);
                            setModalSolicitacao({ open: true, sala: s, data: d, turno: t });
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default AgendamentoScreen;
