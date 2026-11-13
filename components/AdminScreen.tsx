import type { AdminTab } from './GestaoShell';
import { Capacidade, pode } from '../utils/permissoes';
import { avisar, confirmar } from './ui/Dialogos';
import useCurrentTime from '../hooks/useCurrentTime';
import { dataLocal, dataBR, dataISO } from '../utils/datas';
import { usosDoDia } from '../utils/limpeza';
import { whatsappAutorizado, mascaraTelefone, normalizarTelefone } from '../utils/notificacaoAgendamento.mjs';
import AgendaPorto from './AgendaPorto';
import AlertasManagementSection from './AlertasManagementSection';
import React, { useState, useContext, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAgendamentos, DataContext, ExtendedDataContextType, normalizarNomeAmbiente, calcularTurnoPorHorario } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { estaEmManutencao } from '../utils/ambientes';
import { Aula, AgendamentoSala } from '../types';
import { formatarUnidadeCurricular, CANONICAL_UNIDADES_CURRICULARES } from '../utils/curricularUnits';
import { formatarNomeSala, CANONICAL_SALAS } from '../utils/roomFormatter';
import { 
  Building, 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  UploadCloud, 
  LogOut, 
  Image as ImageIcon, 
  ShieldCheck, 
  Users, 
  Sun, 
  Moon, 
  Sunset, 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Layers,
  DoorOpen,
  ArrowRight,
  Broom,
  MessageSquare,
  ExternalLink,
  Menu,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Bell,
  BellRing
} from 'lucide-react';

interface AdminScreenProps {
  aba: AdminTab;
  onAba: (aba: AdminTab) => void;
  onNavigate?: (route: string) => void;
}

// Modal para Edição de Aula com checagem de conflitos
const EditModal: React.FC<{
  aula: Aula;
  onClose: () => void;
  onSave: (d: Partial<Aula>) => void;
}> = ({ aula, onClose, onSave }) => {
  const [formData, setFormData] = useState<Aula>({ 
    ...aula,
    turno: aula.turno || (aula.inicio ? calcularTurnoPorHorario(aula.inicio) : 'Vespertino')
  });
  const [erro, setErro] = useState<string | null>(null);

  const handleInicioChange = (novoInicio: string) => {
    const turnoDetectado = calcularTurnoPorHorario(novoInicio);
    setFormData(prev => ({
      ...prev,
      inicio: novoInicio,
      turno: turnoDetectado
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sala.trim() || !formData.turma.trim() || !formData.inicio.trim() || !formData.data.trim()) {
      setErro("Por favor, preencha todos os campos obrigatórios (Sala, Turma, Início, Data).");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2A52]/70 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border border-[#E5E7EB] w-full max-w-2xl rounded-3xl p-8 shadow-2xl overflow-hidden relative text-[#0F2A52]"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-[#0F2A52]">Editar Horário da Aula</h2>
            <p className="text-xs text-[#6B7280]">Turma {aula.turma} • {aula.sala}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#DBEAFE] rounded-full transition-all text-[#6B7280] cursor-pointer">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {erro && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-1">
          <datalist id="canonical-salas-list">
            {CANONICAL_SALAS.map((sala, i) => (
              <option key={i} value={sala} />
            ))}
          </datalist>

          <datalist id="canonical-uc-list">
            {CANONICAL_UNIDADES_CURRICULARES.map((uc, i) => (
              <option key={i} value={uc} />
            ))}
          </datalist>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider">Turma *</label>
            <input 
              required
              value={formData.turma}
              onChange={e => setFormData({ ...formData, turma: e.target.value })}
              className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider">Ambiente / Sala *</label>
            <input 
              required
              list="canonical-salas-list"
              value={formData.sala}
              onChange={e => setFormData({ ...formData, sala: e.target.value })}
              placeholder="Ex: Sala de Aula 01 — Espaço Definição — Sala Estruturar"
              className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider">Instrutor *</label>
            <input 
              required
              value={formData.instrutor}
              onChange={e => setFormData({ ...formData, instrutor: e.target.value })}
              className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider">Data (DD/MM/YYYY) *</label>
            <input 
              required
              value={formData.data}
              onChange={e => setFormData({ ...formData, data: e.target.value })}
              placeholder="Ex: 10/03/2026"
              className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider">Horário Início *</label>
            <input 
              required
              value={formData.inicio}
              onChange={e => handleInicioChange(e.target.value)}
              placeholder="13:30"
              className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider">Horário Fim</label>
            <input 
              value={formData.fim || ''}
              onChange={e => setFormData({ ...formData, fim: e.target.value })}
              placeholder="17:30"
              className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider flex items-center justify-between">
              <span>Turno da Aula</span>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                formData.turno === 'Vespertino' ? 'bg-amber-100 text-amber-800' :
                formData.turno === 'Noturno' ? 'bg-indigo-100 text-indigo-800' :
                'bg-sky-100 text-sky-800'
              }`}>
                {formData.turno === 'Vespertino' ? 'Tarde' : formData.turno === 'Noturno' ? 'Noite' : 'Manhã'}
              </span>
            </label>
            <select
              value={formData.turno || 'Vespertino'}
              onChange={e => setFormData({ ...formData, turno: e.target.value })}
              className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52] font-semibold"
            >
              <option value="Vespertino">Vespertino (Tarde: 11:50 — 17:50)</option>
              <option value="Noturno">Noturno (Noite: 17:50 — 22:30)</option>
              <option value="Matutino">Matutino (Manhã: 06:00 — 11:50)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider">Unidade Curricular</label>
            <input 
              list="canonical-uc-list"
              value={formData.unidade_curricular}
              onChange={e => setFormData({ ...formData, unidade_curricular: e.target.value })}
              className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
            />
          </div>

          <div className="md:col-span-2 mt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#6B7280] hover:bg-[#F8FAFC]"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-1 bg-[#F4901E] text-white py-3.5 rounded-xl font-black uppercase text-xs hover:bg-[#E67E22] transition-all shadow-md"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Modal para Adicionar Nova Aula
const AddModal: React.FC<{ 
  onSave: (d: Omit<Aula, 'id'>) => void; 
  onClose: () => void;
  salasExistentes: string[];
}> = ({ onSave, onClose, salasExistentes }) => {
  const [formData, setFormData] = useState<Omit<Aula, 'id'>>({
    data: new Date().toLocaleDateString('pt-BR'),
    sala: '',
    turma: '',
    instrutor: '',
    unidade_curricular: '',
    inicio: '13:30',
    fim: '17:30',
    turno: 'Vespertino',
  });
  const [erro, setErro] = useState<string | null>(null);

  const handleInicioChange = (novoInicio: string) => {
    const turnoDetectado = calcularTurnoPorHorario(novoInicio);
    setFormData(prev => ({
      ...prev,
      inicio: novoInicio,
      turno: turnoDetectado
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sala.trim() || !formData.turma.trim() || !formData.inicio.trim() || !formData.data.trim()) {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }
    const finalTurno = formData.turno || (formData.inicio ? calcularTurnoPorHorario(formData.inicio) : 'Vespertino');
    onSave({
      ...formData,
      turno: finalTurno
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2A52]/70 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border border-[#E5E7EB] w-full max-w-2xl rounded-3xl p-8 shadow-2xl overflow-hidden relative text-[#0F2A52]"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-black uppercase tracking-wider text-[#0F2A52]">Cadastrar Nova Aula</h2>
            <p className="text-xs text-[#6B7280]">Insira os detalhes da turma e alocação de sala</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#DBEAFE] rounded-full transition-all text-[#6B7280]">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {erro && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-1">
          <datalist id="salas-cadastradas-list">
            {salasExistentes.map((sala, i) => (
              <option key={i} value={sala} />
            ))}
          </datalist>

          <datalist id="canonical-uc-list-add">
            {CANONICAL_UNIDADES_CURRICULARES.map((uc, i) => (
              <option key={i} value={uc} />
            ))}
          </datalist>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider">Turma *</label>
            <input 
              required
              placeholder="Ex: TÉC. DESENVOLVIMENTO DE SISTEMAS"
              value={formData.turma}
              onChange={e => setFormData({ ...formData, turma: e.target.value })}
              className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider">Ambiente / Sala *</label>
            <input 
              required
              list="salas-cadastradas-list"
              placeholder="Ex: LAB 01"
              value={formData.sala}
              onChange={e => setFormData({ ...formData, sala: e.target.value })}
              className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider">Instrutor *</label>
            <input 
              required
              placeholder="Ex: Prof. Carlos Silva"
              value={formData.instrutor}
              onChange={e => setFormData({ ...formData, instrutor: e.target.value })}
              className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider">Data (DD/MM/YYYY) *</label>
            <input 
              required
              placeholder="DD/MM/YYYY"
              value={formData.data}
              onChange={e => setFormData({ ...formData, data: e.target.value })}
              className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider">Horário Início *</label>
            <input 
              required
              placeholder="13:30"
              value={formData.inicio}
              onChange={e => handleInicioChange(e.target.value)}
              className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider">Horário Fim</label>
            <input 
              placeholder="17:30"
              value={formData.fim || ''}
              onChange={e => setFormData({ ...formData, fim: e.target.value })}
              className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider flex items-center justify-between">
              <span>Turno da Aula</span>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                formData.turno === 'Vespertino' ? 'bg-amber-100 text-amber-800' :
                formData.turno === 'Noturno' ? 'bg-indigo-100 text-indigo-800' :
                'bg-sky-100 text-sky-800'
              }`}>
                {formData.turno === 'Vespertino' ? 'Tarde' : formData.turno === 'Noturno' ? 'Noite' : 'Manhã'}
              </span>
            </label>
            <select
              value={formData.turno || 'Vespertino'}
              onChange={e => setFormData({ ...formData, turno: e.target.value })}
              className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52] font-semibold"
            >
              <option value="Vespertino">Vespertino (Tarde: 11:50 — 17:50)</option>
              <option value="Noturno">Noturno (Noite: 17:50 — 22:30)</option>
              <option value="Matutino">Matutino (Manhã: 06:00 — 11:50)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider">Unidade Curricular</label>
            <input 
              list="canonical-uc-list-add"
              placeholder="Ex: Programação Web"
              value={formData.unidade_curricular}
              onChange={e => setFormData({ ...formData, unidade_curricular: e.target.value })}
              className="bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
            />
          </div>

          <div className="md:col-span-2 mt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#6B7280] hover:bg-[#F8FAFC]"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-1 bg-[#F4901E] text-white py-3.5 rounded-xl font-black uppercase text-xs hover:bg-[#E67E22] transition-all shadow-md"
            >
              Cadastrar Aula
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Aba de Gestão de Ambientes (com regra de desduplicação rigorosa)
const AmbientesManagementSection: React.FC = () => {
  const context = useContext(DataContext);
  const [salaManutencao, setSalaManutencao] = useState('');
  const [motivoManutencao, setMotivoManutencao] = useState('');
  const [inicioManutencao, setInicioManutencao] = useState(new Date().toLocaleDateString('en-CA'));
  const [fimManutencao, setFimManutencao] = useState('');
  const [novoAmbiente, setNovoAmbiente] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);
  const [busca, setBusca] = useState('');

  const salas = context?.salasCadastradas || [];
  const aulas = context?.aulas || [];

  const handleAddAmbiente = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = novoAmbiente.trim();
    if (!nomeLimpo) return;

    setIsSaving(true);
    setFeedback(null);
    try {
      if (context?.adicionarAmbiente) {
        await context.adicionarAmbiente(nomeLimpo);
        setFeedback({ tipo: 'sucesso', msg: `Ambiente "${nomeLimpo}" cadastrado com sucesso!` });
        setNovoAmbiente('');
      }
    } catch (err: any) {
      setFeedback({ tipo: 'erro', msg: err.message || 'Erro ao cadastrar ambiente.' });
    } finally {
      setIsSaving(false);
    }
  };

  const salasFiltradas = useMemo(() => {
    return salas.filter(s => s.toLowerCase().includes(busca.toLowerCase()));
  }, [salas, busca]);

  return (
    <div className="space-y-6">
      {salaManutencao && <div className="fixed inset-0 z-[100] bg-[#0F2A52]/70 flex items-center justify-center p-4">
        <form className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4" onSubmit={async e => {
          e.preventDefault(); setIsSaving(true);
          const br = (v: string) => v ? v.split('-').reverse().join('/') : '';
          try { await context?.bloquearAmbienteManutencao(salaManutencao, motivoManutencao, br(inicioManutencao), br(fimManutencao)); setSalaManutencao(''); }
          catch (erro: any) { setFeedback({ tipo: 'erro', msg: erro.message }); }
          finally { setIsSaving(false); }
        }}>
          <h3 className="font-black text-[#0F2A52]">Manutenção — {formatarNomeSala(salaManutencao)}</h3>
          <label className="block text-xs">Motivo *<textarea required value={motivoManutencao} onChange={e => setMotivoManutencao(e.target.value)} className="w-full border rounded-xl p-3" /></label>
          <label className="block text-xs">Início *<input type="date" required value={inicioManutencao} onChange={e => setInicioManutencao(e.target.value)} className="w-full border rounded-xl p-3" /></label>
          <label className="block text-xs">Fim (opcional, vazio = indeterminado)<input type="date" min={inicioManutencao} value={fimManutencao} onChange={e => setFimManutencao(e.target.value)} className="w-full border rounded-xl p-3" /></label>
          {feedback?.tipo === 'erro' && <p role="alert" className="text-red-700 text-xs">{feedback.msg}</p>}
          <div className="flex gap-3"><button type="button" onClick={() => setSalaManutencao('')}>Cancelar</button><button disabled={isSaving || !motivoManutencao.trim()} className="bg-[#F4901E] text-white rounded-xl px-4 py-2">Travar ambiente</button></div>
        </form>
      </div>}
      <div className="rounded-2xl border border-amber-200 p-4 space-y-3">
        <h3 className="font-black text-[#0F2A52]">Manutenções ativas e programadas</h3>
        {context?.manutencoes.filter(m => m.ativo).map(m => <div key={m.id} className="flex justify-between gap-4 text-xs"><span><strong>{formatarNomeSala(m.sala)}</strong>: {m.motivo} ({m.inicio} até {m.fim || 'indeterminado'})</span><button className="text-[#0F2A52] font-bold" onClick={async () => { try { await context.liberarAmbienteManutencao(m.id); } catch { setFeedback({ tipo: 'erro', msg: 'Falha ao liberar ambiente.' }); } }}>Liberar</button></div>)}
      </div>
      {/* Informações da Regra de Integridade */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-blue-900">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">Regra de Não Duplicação Ativa</span>
          <span>
            O sistema impede o cadastro de salas com nomes iguais ou variações de maiúsculas/minúsculas. Além disso, duas turmas não podem ocupar a mesma sala no mesmo horário.
          </span>
        </div>
      </div>

      {/* Formulário de Cadastro de Novo Ambiente */}
      <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-6 rounded-2xl">
        <h3 className="text-sm font-black uppercase tracking-wider text-[#0F2A52] mb-3 flex items-center gap-2">
          <DoorOpen className="w-4 h-4 text-[#F4901E]" />
          Cadastrar Novo Ambiente / Sala
        </h3>

        {feedback && (
          <div className={`mb-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
            feedback.tipo === 'sucesso' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-600'
          }`}>
            {feedback.tipo === 'sucesso' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{feedback.msg}</span>
          </div>
        )}

        <form onSubmit={handleAddAmbiente} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Ex: LABORATÓRIO 05, AUDITÓRIO, SALA 12..."
            value={novoAmbiente}
            onChange={(e) => setNovoAmbiente(e.target.value)}
            required
            className="flex-1 bg-white border border-[#CBD5E1] p-3.5 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52] font-semibold"
          />
          <button
            type="submit"
            disabled={isSaving || !novoAmbiente.trim()}
            className="px-6 py-3.5 bg-[#F4901E] hover:bg-[#E67E22] text-white font-black uppercase text-xs rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Ambiente</span>
          </button>
        </form>
      </div>

      {/* Lista de Ambientes Cadastrados */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-[#0F2A52]">
              Ambientes no Sistema ({salas.length})
            </h3>
            <p className="text-xs text-[#6B7280]">Lista consolidada e desduplicada</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Buscar ambiente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {salasFiltradas.map((sala, idx) => {
            const totalAulasNestaSala = aulas.filter(a => normalizarNomeAmbiente(a.sala) === normalizarNomeAmbiente(sala)).length;
            return (
              <div 
                key={idx}
                className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#0F2A52]/10 text-[#0F2A52] flex items-center justify-center font-black text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[#0F2A52] tracking-wide">
                        {formatarNomeSala(sala)}
                      </h4>
                      <span className="text-[10px] text-[#64748B] font-bold">
                        {totalAulasNestaSala} aula(s) registrada(s)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    Ativo & Único
                  </span>
                  <button className="text-xs font-bold text-amber-800" onClick={() => { setSalaManutencao(sala); setMotivoManutencao(''); setFimManutencao(''); setFeedback(null); }}>Travar p/ manutenção</button>
                  {context?.excluirAmbiente && (
                    <button
                      onClick={async () => {
                        if (await confirmar(`Remover o cadastro de ${sala}?`, { texto: 'As aulas e reservas já feitas neste ambiente não são apagadas.', confirmar: 'Remover ambiente', perigo: true })) {
                          context.excluirAmbiente(sala);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 text-xs p-1 rounded hover:bg-red-50 transition-colors"
                      title="Excluir ambiente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Seção de Gerenciamento de Solicitações de Salas (Agendamentos)
const AgendamentosAdminSection: React.FC = () => {
  const context = useContext(DataContext) as ExtendedDataContextType;
  const { usuarioAtual } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'aprovado' | 'rejeitado'>('pendente');
  const [searchTerm, setSearchTerm] = useState('');
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [itemAprovando, setItemAprovando] = useState<AgendamentoSala | null>(null);
  const [observacaoAprovacao, setObservacaoAprovacao] = useState('');
  const [erroDecisao, setErroDecisao] = useState('');
  const [salvandoDecisao, setSalvandoDecisao] = useState(false);
  const [itemRejeitando, setItemRejeitando] = useState<AgendamentoSala | null>(null);
  const [reenviandoPlanilha, setReenviandoPlanilha] = useState<Set<string>>(new Set());
  const reenviosEmAndamento = useRef(new Set<string>());

  const handleReenviarPlanilha = async (id: string) => {
    if (reenviosEmAndamento.current.has(id)) return;
    reenviosEmAndamento.current.add(id);
    setReenviandoPlanilha(new Set(reenviosEmAndamento.current));
    try {
      await context.sincronizarPlanilha(id, context.agendamentos.find(a => a.id === id));
    } finally {
      reenviosEmAndamento.current.delete(id);
      setReenviandoPlanilha(new Set(reenviosEmAndamento.current));
    }
  };

  const agendamentos = context.agendamentos || [];

  const stats = useMemo(() => ({
    total: agendamentos.length,
    pendentes: agendamentos.filter(a => a.status === 'pendente').length,
    aprovados: agendamentos.filter(a => a.status === 'aprovado').length,
    rejeitados: agendamentos.filter(a => a.status === 'rejeitado').length,
  }), [agendamentos]);

  const filtered = useMemo(() => {
    return agendamentos.filter(a => {
      if (statusFilter !== 'todos' && a.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          a.sala.toLowerCase().includes(term) ||
          a.solicitante.toLowerCase().includes(term) ||
          (a.turma || '').toLowerCase().includes(term) ||
          a.data.includes(term)
        );
      }
      return true;
    });
  }, [agendamentos, statusFilter, searchTerm]);

  const handleAprovar = async (ag: AgendamentoSala) => {
    const responsavel = usuarioAtual?.nome || usuarioAtual?.email || 'Administrador SENAI';
    const manutencao = estaEmManutencao(ag.sala, ag.data, context.manutencoes);
    if (manutencao) { setErroDecisao(`Não é possível aprovar: ambiente em manutenção. ${manutencao.motivo}`); return; }
    setSalvandoDecisao(true);
    try { await context.aprovarAgendamento(ag.id, true, responsavel, observacaoAprovacao); setItemAprovando(null); }
    catch (erro: any) { setErroDecisao(erro.message); }
    finally { setSalvandoDecisao(false); }
  };

  const handleRejeitarConfirm = async () => {
    if (!itemRejeitando || !motivoRejeicao.trim()) return;
    setSalvandoDecisao(true);
    try { await context.rejeitarAgendamento(itemRejeitando.id, motivoRejeicao.trim()); setItemRejeitando(null); setMotivoRejeicao(''); }
    catch (erro: any) { setErroDecisao(erro.message); }
    finally { setSalvandoDecisao(false); }
  };

  return (
    <div className="space-y-6">
      {erroDecisao && <p role="alert" className="text-red-700 text-xs">{erroDecisao}</p>}
      {itemAprovando && <div className="fixed inset-0 z-50 bg-[#0F2A52]/70 flex items-center justify-center p-4"><div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4">
        <h3 className="font-black text-[#0F2A52]">Aprovar solicitação — {itemAprovando.sala}</h3>
        <label className="block text-xs">Observação do gestor (opcional)<textarea value={observacaoAprovacao} onChange={e => setObservacaoAprovacao(e.target.value)} className="border rounded-xl p-3 w-full" /></label>
        {erroDecisao && <p role="alert" className="text-red-700 text-xs">{erroDecisao}</p>}
        <div className="flex gap-3"><button onClick={() => setItemAprovando(null)}>Cancelar</button><button disabled={salvandoDecisao} onClick={() => handleAprovar(itemAprovando)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl disabled:opacity-50">Confirmar aprovação</button></div>
      </div></div>}
      {/* Modal de Rejeição */}
      {itemRejeitando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2A52]/70 backdrop-blur-md">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#E5E7EB]">
            <h3 className="text-sm font-black uppercase text-[#0F2A52] mb-2">Recusar Solicitação</h3>
            <p className="text-xs text-[#6B7280] mb-4">Sala: {itemRejeitando.sala} para {itemRejeitando.solicitante}</p>
            <textarea
              required
              aria-label="Motivo obrigatório da recusa"
              placeholder="Informe o motivo da recusa (obrigatório)..."
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              rows={3}
              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3 text-xs text-[#0F2A52] outline-none focus:border-red-500 mb-4"
            />
            {erroDecisao && <p role="alert" className="text-red-700 text-xs">{erroDecisao}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setItemRejeitando(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B7280] hover:bg-[#F1F5F9]"
              >
                Cancelar
              </button>
              <button
                disabled={salvandoDecisao || !motivoRejeicao.trim()}
                onClick={handleRejeitarConfirm}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase"
              >
                Confirmar Recusa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter('todos')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'todos' ? 'bg-[#0F2A52] text-white' : 'bg-[#F8FAFC] text-[#0F2A52]'
          }`}
        >
          <span className="text-[9px] font-black uppercase opacity-70 block">Total</span>
          <span className="text-xl font-black">{stats.total}</span>
        </button>

        <button
          onClick={() => setStatusFilter('pendente')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'pendente' ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-50 text-amber-900 border-amber-200'
          }`}
        >
          <span className="text-[9px] font-black uppercase opacity-70 block">Pendentes</span>
          <span className="text-xl font-black">{stats.pendentes}</span>
        </button>

        <button
          onClick={() => setStatusFilter('aprovado')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'aprovado' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          <span className="text-[9px] font-black uppercase opacity-70 block">Aprovados</span>
          <span className="text-xl font-black">{stats.aprovados}</span>
        </button>

        <button
          onClick={() => setStatusFilter('rejeitado')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            statusFilter === 'rejeitado' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          <span className="text-[9px] font-black uppercase opacity-70 block">Recusados</span>
          <span className="text-xl font-black">{stats.rejeitados}</span>
        </button>
      </div>

      {/* Tabela de Solicitações */}
      <div className="space-y-3">
        {filtered.map(ag => (
          <div key={ag.id} className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                  ag.status === 'pendente' ? 'bg-amber-100 text-amber-800' :
                  ag.status === 'aprovado' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {ag.status}
                </span>
                <h4 className="text-sm font-black text-[#0F2A52]">{ag.sala}</h4>
                <span className="text-xs text-[#6B7280]">({ag.data} • {ag.turno})</span>
              </div>
              <p className="text-xs text-[#0F2A52]">
                <span className="font-bold">Solicitante:</span> {ag.solicitante}
              </p>
              {ag.emailSolicitante && <p className="text-xs text-[#6B7280]"><span className="font-bold">E-mail:</span> {ag.emailSolicitante}</p>}
              {whatsappAutorizado(ag) && ag.telefoneSolicitante && <p className="text-xs text-[#6B7280]">WhatsApp autorizado: {mascaraTelefone(normalizarTelefone(ag.telefoneSolicitante).slice(2))}</p>}
              {ag.turma && <p className="text-xs text-[#6B7280]"><span className="font-bold">Turma:</span> {ag.turma}</p>}
              {ag.motivo && <p className="text-xs text-[#6B7280]"><span className="font-bold">Motivo:</span> {ag.motivo}</p>}
              {ag.aprovadoPor && <p className="text-[10px] text-emerald-700 font-bold">Aprovado por: {ag.aprovadoPor}</p>}
              {ag.planilhaSyncErro && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                  <p className="font-semibold">Não enviada à planilha</p>
                  <p className="break-words">{ag.planilhaSyncErro}</p>
                  <button
                    type="button"
                    disabled={reenviandoPlanilha.has(ag.id)}
                    aria-busy={reenviandoPlanilha.has(ag.id)}
                    onClick={() => handleReenviarPlanilha(ag.id)}
                    className="mt-1 rounded border border-amber-300 px-3 py-1 font-semibold hover:bg-amber-100 disabled:opacity-50 disabled:cursor-wait"
                  >
                    {reenviandoPlanilha.has(ag.id) ? 'Reenviando...' : 'Reenviar'}
                  </button>
                </div>
              )}
            </div>

            {ag.status === 'pendente' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setItemAprovando(ag); setObservacaoAprovacao(''); setErroDecisao(''); }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  Aprovar
                </button>
                <button
                  onClick={() => { setItemRejeitando(ag); setMotivoRejeicao(''); setErroDecisao(''); }}
                  className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-600 hover:text-white text-red-600 font-bold text-xs uppercase border border-red-200 transition-all flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  Recusar
                </button>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-xs font-bold text-[#6B7280]">
            Nenhuma solicitação encontrada neste filtro.
          </div>
        )}
      </div>
    </div>
  );
};

// Aba de Gestão de Limpeza e Observações dos Ambientes
const LimpezaManagementSection: React.FC<{ onNavigate?: (route: string) => void }> = ({ onNavigate }) => {
  const context = useContext(DataContext);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'com_aula' | 'com_observacao' | 'todas'>('com_aula');
  const [editingSalas, setEditingSalas] = useState<Record<string, string>>({});
  const [savingSala, setSavingSala] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ sala: string; msg: string; tipo: 'sucesso' | 'erro' } | null>(null);

  useCurrentTime();
  const todayStr = dataBR(dataLocal());
  const salas = context?.salasCadastradas || [];
  const aulasHoje = useMemo(() => usosDoDia(todayStr, context?.aulas || [], context?.agendamentos || [], context?.manutencoes || []), [context?.aulas, context?.agendamentos, context?.manutencoes, todayStr]);

  // Map das aulas de hoje por sala normalizada
  const aulasPorSala = useMemo(() => {
    const map = new Map<string, Aula[]>();
    aulasHoje.forEach(a => {
      if (!a.sala) return;
      const norm = normalizarNomeAmbiente(a.sala);
      if (!map.has(norm)) map.set(norm, []);
      map.get(norm)!.push(a);
    });
    return map;
  }, [aulasHoje]);

  const observacoes = context?.observacoesLimpeza || {};

  const handleSalvar = async (sala: string) => {
    const norm = normalizarNomeAmbiente(sala);
    const texto = editingSalas[norm] !== undefined ? editingSalas[norm] : (observacoes[norm]?.observacao || '');
    setSavingSala(sala);
    setFeedback(null);
    try {
      if (context?.salvarObservacaoLimpeza) {
        await context.salvarObservacaoLimpeza(sala, texto);
        setFeedback({ sala, msg: texto.trim() ? 'Observação salva com sucesso!' : 'Observação removida!', tipo: 'sucesso' });
      }
    } catch (err: any) {
      setFeedback({ sala, msg: 'Erro ao salvar observação: ' + err.message, tipo: 'erro' });
    } finally {
      setSavingSala(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleRemover = async (sala: string) => {
    const norm = normalizarNomeAmbiente(sala);
    setSavingSala(sala);
    setFeedback(null);
    try {
      if (context?.removerObservacaoLimpeza) {
        await context.removerObservacaoLimpeza(sala);
        setEditingSalas(prev => ({ ...prev, [norm]: '' }));
        setFeedback({ sala, msg: 'Observação removida com sucesso!', tipo: 'sucesso' });
      }
    } catch (err: any) {
      setFeedback({ sala, msg: 'Erro ao remover observação.', tipo: 'erro' });
    } finally {
      setSavingSala(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleAplicarSugestao = (norm: string, tag: string) => {
    setEditingSalas(prev => {
      const atual = prev[norm] !== undefined ? prev[norm] : (observacoes[norm]?.observacao || '');
      const novo = atual ? `${atual} • ${tag}` : tag;
      return { ...prev, [norm]: novo };
    });
  };

  // Filtragem das salas
  const salasFiltradas = useMemo(() => {
    return salas.filter(sala => {
      const norm = normalizarNomeAmbiente(sala);
      const hasAulas = (aulasPorSala.get(norm) || []).length > 0;
      const hasObs = !!observacoes[norm]?.observacao;

      if (filtroTipo === 'com_aula' && !hasAulas) return false;
      if (filtroTipo === 'com_observacao' && !hasObs) return false;

      if (busca.trim()) {
        const termo = busca.toLowerCase();
        const nomeFormatado = (formatarNomeSala(sala) || sala).toLowerCase();
        const obsTexto = (observacoes[norm]?.observacao || '').toLowerCase();
        return nomeFormatado.includes(termo) || obsTexto.includes(termo);
      }
      return true;
    }).sort((a, b) => {
      const normA = normalizarNomeAmbiente(a);
      const normB = normalizarNomeAmbiente(b);
      const hasObsA = !!observacoes[normA]?.observacao;
      const hasObsB = !!observacoes[normB]?.observacao;
      if (hasObsA && !hasObsB) return -1;
      if (!hasObsA && hasObsB) return 1;
      return a.localeCompare(b, 'pt-BR', { numeric: true });
    });
  }, [salas, aulasPorSala, observacoes, filtroTipo, busca]);

  const sugestoesRapidas = [
    '🧹 Limpeza prioritária requerida',
    '⚠️ Piso escorregadio / Manutenção',
    '🧻 Repor materiais (papel/álcool/sabão)',
    '🟢 Sala liberada antecipadamente',
    '🗑️ Descarte de resíduos especiais'
  ];

  return (
    <div className="space-y-6">
      {/* Banner Informativo */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-amber-900">
        <div className="flex items-start gap-3">
          <Broom className="w-5 h-5 text-[#F4901E] shrink-0 mt-0.5" />
          <div>
            <span className="font-black uppercase tracking-wider block text-[#0F2A52]">
              Painel de Observações para Limpeza & Conservação
            </span>
            <span className="text-amber-800">
              Escreva observações específicas para os ambientes de aula. As alterações são sincronizadas em tempo real e visualizadas pela equipe operacional no painel <strong>/limpeza</strong>.
            </span>
          </div>
        </div>
        <button
          onClick={() => onNavigate ? onNavigate('limpeza') : (window.location.pathname = '/limpeza')}
          className="shrink-0 bg-[#0F2A52] hover:bg-[#1D4E8C] text-white px-4 py-2 rounded-xl font-bold uppercase text-[10px] flex items-center gap-2 transition-all shadow-xs cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#F4901E]" />
          <span>Ver Painel /limpeza</span>
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 bg-[#F1F5F9] p-1.5 rounded-2xl">
          <button
            onClick={() => setFiltroTipo('com_aula')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              filtroTipo === 'com_aula'
                ? 'bg-white text-[#0F2A52] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F2A52]'
            }`}
          >
            Com Aula Hoje ({Array.from(aulasPorSala.keys()).length})
          </button>
          <button
            onClick={() => setFiltroTipo('com_observacao')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              filtroTipo === 'com_observacao'
                ? 'bg-[#F4901E] text-white shadow-xs'
                : 'text-[#F4901E] hover:bg-amber-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Com Observação ({Object.keys(observacoes).filter(k => !!observacoes[k]?.observacao).length})
          </button>
          <button
            onClick={() => setFiltroTipo('todas')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              filtroTipo === 'todas'
                ? 'bg-white text-[#0F2A52] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F2A52]'
            }`}
          >
            Todas as Salas ({salas.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#1D4E8C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Pesquisar sala ou observação..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-xs font-bold text-[#0F2A52] placeholder-[#6B7280] focus:border-[#F4901E] outline-none"
          />
        </div>
      </div>

      {/* Lista de Ambientes com Editor de Observação */}
      <div className="grid grid-cols-1 gap-4">
        {salasFiltradas.map(sala => {
          const norm = normalizarNomeAmbiente(sala);
          const nomeFormatado = formatarNomeSala(sala) || sala;
          const obsData = observacoes[norm];
          const valorInput = editingSalas[norm] !== undefined ? editingSalas[norm] : (obsData?.observacao || '');
          const aulasDaSala = aulasPorSala.get(norm) || [];
          const isSaving = savingSala === sala;
          const fb = feedback?.sala === sala ? feedback : null;

          return (
            <div
              key={sala}
              className={`p-5 rounded-3xl border bg-white transition-all shadow-xs flex flex-col md:flex-row gap-5 items-start justify-between ${
                obsData?.observacao
                  ? 'border-[#F4901E] ring-1 ring-[#F4901E]/20'
                  : 'border-[#E2E8F0]'
              }`}
            >
              {/* Esquerda: Identificação da Sala e Horários de Hoje */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#F4901E] flex items-center gap-1">
                    <DoorOpen className="w-3.5 h-3.5" />
                    Ambiente
                  </span>
                  {obsData?.observacao && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                      Observação Ativa
                    </span>
                  )}
                  {aulasDaSala.length > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {aulasDaSala.length} aula(s) hoje
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                      Sem aulas hoje
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-black uppercase text-[#0F2A52] tracking-tight leading-tight">
                  {nomeFormatado}
                </h3>

                {/* Resumo dos Horários de Aula do Dia */}
                {aulasDaSala.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {aulasDaSala.map((a, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-lg text-[#374151]"
                      >
                        <Clock className="w-3 h-3 text-[#F4901E]" />
                        <span>{a.inicio} - {a.fim || a.turno}</span>
                        <span className="text-[#0F2A52] font-black">({a.turma})</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#6B7280] mt-1 italic">
                    Nenhuma turma alocada para hoje nesta sala.
                  </p>
                )}

                {obsData?.atualizadoEm && (
                  <p className="text-[10px] text-[#6B7280] mt-2">
                    Última atualização: {obsData.atualizadoPor || 'Gestor'}
                  </p>
                )}
              </div>

              {/* Direita: Editor de Observação */}
              <div className="w-full md:w-[480px] flex flex-col gap-2 shrink-0 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#1D4E8C]" />
                    Observação do Ambiente (Visível na /limpeza)
                  </label>
                  {obsData?.observacao && (
                    <button
                      onClick={() => handleRemover(sala)}
                      disabled={isSaving}
                      className="text-[10px] font-bold text-red-600 hover:text-red-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remover Observação
                    </button>
                  )}
                </div>

                <textarea
                  rows={2}
                  placeholder="Ex: Piso molhado perto da porta, favor higienizar com cuidado. Bancadas desinfetadas..."
                  value={valorInput}
                  onChange={(e) => setEditingSalas(prev => ({ ...prev, [norm]: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs text-[#0F2A52] font-medium outline-none focus:border-[#F4901E] focus:ring-1 focus:ring-[#F4901E] transition-all resize-none"
                />

                {/* Chips de Sugestões Rápidas */}
                <div className="flex flex-wrap gap-1">
                  {sugestoesRapidas.map((sugestao, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleAplicarSugestao(norm, sugestao)}
                      className="text-[9px] font-bold bg-white hover:bg-amber-50 text-[#0F2A52] border border-[#E2E8F0] px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                    >
                      {sugestao}
                    </button>
                  ))}
                </div>

                {/* Feedback */}
                {fb && (
                  <div className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                    fb.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {fb.tipo === 'sucesso' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>{fb.msg}</span>
                  </div>
                )}

                {/* Botão de Salvar */}
                <div className="flex justify-end gap-2 mt-1">
                  <button
                    onClick={() => handleSalvar(sala)}
                    disabled={isSaving}
                    className="bg-[#0F2A52] hover:bg-[#1D4E8C] disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    {isSaving ? (
                      <span>Salvando...</span>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Salvar Observação</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {salasFiltradas.length === 0 && (
          <div className="text-center py-12 text-xs font-bold text-[#6B7280] bg-white rounded-3xl border border-[#CBD5E1]">
            Nenhum ambiente encontrado para os filtros selecionados.
          </div>
        )}
      </div>
    </div>
  );
};

const CAPACIDADE_DA_ABA: Record<AdminTab, Capacidade> = {
  aulas: 'cronograma', historico: 'historico', ambientes: 'ambientes', agendamentos: 'solicitacoes',
  alertas: 'alertas', agenda: 'agenda', limpeza: 'limpeza',
};

const CABECALHO_DA_ABA: Record<AdminTab, { titulo: string; descricao: string }> = {
  aulas: { titulo: 'Cronograma de aulas', descricao: 'Aulas de hoje em diante. É o que aparece no painel das TVs.' },
  historico: { titulo: 'Histórico de aulas', descricao: 'Aulas de dias que já passaram.' },
  ambientes: { titulo: 'Ambientes e manutenção', descricao: 'Salas cadastradas e bloqueios para manutenção.' },
  agendamentos: { titulo: 'Solicitações de salas', descricao: 'Pedidos de reserva feitos pelo formulário de agendamento.' },
  alertas: { titulo: 'Alertas', descricao: 'Avisos enviados pelo administrativo ao pedagógico.' },
  agenda: { titulo: 'Agenda do Porto', descricao: 'Compromissos da unidade publicados pelo administrativo.' },
  limpeza: { titulo: 'Limpeza e observações', descricao: 'Avisos da gestão para a equipe de limpeza, por ambiente.' },
};

const ROTULO_TURNO: Record<string, { rotulo: string; cor: string }> = {
  Matutino: { rotulo: 'Manhã', cor: 'bg-sky-50 text-sky-800' },
  Vespertino: { rotulo: 'Tarde', cor: 'bg-amber-50 text-amber-800' },
  Noturno: { rotulo: 'Noite', cor: 'bg-indigo-50 text-indigo-800' },
};

const AdminScreen: React.FC<AdminScreenProps> = ({ aba, onAba, onNavigate }) => {
  const context = useContext(DataContext) as ExtendedDataContextType;
  const { usuarioAtual } = useAuth();

  // Uma aba fora do perfil cai no cronograma, que todos os perfis desta tela têm.
  const adminTab: AdminTab = pode(usuarioAtual, CAPACIDADE_DA_ABA[aba]) ? aba : 'aulas';
  const podeExcluirEmMassa = pode(usuarioAtual, 'exclusaoEmMassa');
  const { formattedDate } = useCurrentTime();
  const [editingAula, setEditingAula] = useState<Aula | null>(null);
  const [addingAula, setAddingAula] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchDate, setSearchDate] = useState('');
  const [searchTurma, setSearchTurma] = useState('');
  const [searchInstrutor, setSearchInstrutor] = useState('');
  const [filterShift, setFilterShift] = useState<string | null>(null);
  const [limiteLinhas, setLimiteLinhas] = useState(100);

  const alertasAtivos = (context.alertas || []).filter(a => a.ativo).length;
  const temFiltro = !!(searchDate || searchTurma || searchInstrutor || filterShift);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      context.uploadCSV(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const hojeBR = dataBR(dataLocal());

  // O histórico não fica carregado o tempo todo: é lido só quando esta seção é aberta.
  const [historico, setHistorico] = useState<Aula[] | null>(null);
  const [erroHistorico, setErroHistorico] = useState('');
  const carregarHistorico = React.useCallback(async () => {
    setErroHistorico('');
    try { setHistorico(await context.carregarHistoricoAulas()); }
    catch { setErroHistorico('Não foi possível carregar o histórico. Verifique a conexão e tente de novo.'); }
  }, [context.carregarHistoricoAulas]);
  React.useEffect(() => { if (adminTab === 'historico') void carregarHistorico(); }, [adminTab]);
  const carregandoHistorico = adminTab === 'historico' && historico === null && !erroHistorico;

  const aulasFiltradas = useMemo(() => {
    const todayIso = dataLocal();
    const turma = searchTurma.trim().toLowerCase();
    const instrutor = searchInstrutor.trim().toLowerCase();
    const origem = adminTab === 'historico' ? (historico || []) : context.aulas;
    const lista = origem.filter(aula => {
      const passada = dataISO(aula.data) < todayIso;
      if (adminTab === 'historico' ? !passada : passada) return false;
      if (searchDate && !aula.data.includes(searchDate)) return false;
      if (turma && !(aula.turma || '').toLowerCase().includes(turma)) return false;
      if (instrutor && !(aula.instrutor || '').toLowerCase().includes(instrutor)) return false;
      if (filterShift && (aula.turno || '').toLowerCase() !== filterShift.toLowerCase()) return false;
      return true;
    });
    // Cronograma: a aula mais próxima primeiro. Histórico: a mais recente primeiro.
    const direcao = adminTab === 'historico' ? -1 : 1;
    return lista.sort((a, b) => direcao * (dataISO(a.data).localeCompare(dataISO(b.data)) || (a.inicio || '').localeCompare(b.inicio || '')));
  }, [context.aulas, historico, searchDate, searchTurma, searchInstrutor, filterShift, adminTab, formattedDate]);

  React.useEffect(() => { setLimiteLinhas(100); }, [adminTab, searchDate, searchTurma, searchInstrutor, filterShift]);

  const excluirAula = async (aula: Aula) => {
    const ok = await confirmar(`Excluir a aula da turma ${aula.turma}?`, {
      texto: `${formatarNomeSala(aula.sala)} · ${aula.data} · ${aula.inicio}${aula.fim ? `–${aula.fim}` : ''}. Ela sai do painel das TVs.`,
      confirmar: 'Excluir aula', perigo: true,
    });
    if (!ok) return;
    await context.deleteAula(aula.id);
    if (adminTab === 'historico') void carregarHistorico();
  };

  const cabecalho = CABECALHO_DA_ABA[adminTab];
  const botao = 'inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50';
  const campo = 'mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-[#0F2A52] outline-none focus:border-[#1D4E8C] focus:bg-white';

  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-8">
      <AnimatePresence>
        {editingAula && (
          <EditModal
            aula={editingAula}
            onClose={() => setEditingAula(null)}
            onSave={d => {
              void Promise.resolve(context.updateAula(editingAula.id, d))
                .then(() => { if (adminTab === 'historico') void carregarHistorico(); })
                .catch(() => { /* o aviso de conflito já foi mostrado */ });
              setEditingAula(null);
            }}
          />
        )}
        {addingAula && (
          <AddModal
            salasExistentes={context.salasCadastradas}
            onClose={() => setAddingAula(false)}
            onSave={d => { context.addAula(d); setAddingAula(false); }}
          />
        )}
      </AnimatePresence>

      {alertasAtivos > 0 && adminTab !== 'alertas' && (
        <button type="button" onClick={() => onAba('alertas')}
          className="mb-5 flex w-full items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-800 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500">
          <BellRing className="h-5 w-5 shrink-0 text-red-600" />
          <span className="flex-1">{alertasAtivos === 1 ? 'Há 1 alerta não lido.' : `Há ${alertasAtivos} alertas não lidos.`}</span>
          <span className="shrink-0 underline underline-offset-2">Ver alertas</span>
        </button>
      )}

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{cabecalho.titulo}</h1>
          <p className="mt-1 text-sm text-slate-500">{cabecalho.descricao}</p>
        </div>

        {adminTab === 'aulas' && (
          <div className="flex flex-wrap items-center gap-2">
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={context.loading}
              className={`${botao} border border-slate-300 bg-white text-[#0F2A52] hover:bg-slate-50`}>
              <UploadCloud className="h-4 w-4" />
              {context.loading ? 'Processando…' : 'Importar planilha'}
            </button>
            <button type="button" onClick={() => setAddingAula(true)} className={`${botao} bg-[#F4901E] text-white hover:bg-[#E07F12]`}>
              <Plus className="h-4 w-4" /> Nova aula
            </button>
          </div>
        )}
      </header>

      <main className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {adminTab === 'ambientes' ? (
          <AmbientesManagementSection />
        ) : adminTab === 'agendamentos' ? (
          <AgendamentosAdminSection />
        ) : adminTab === 'limpeza' ? (
          <LimpezaManagementSection onNavigate={onNavigate} />
        ) : adminTab === 'alertas' ? (
          <AlertasManagementSection hideForm={true} />
        ) : adminTab === 'agenda' ? (
          <div className="mx-auto max-w-3xl"><AgendaPorto inline={true} /></div>
        ) : (
          <div>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="text-xs font-bold text-slate-600">Data
                <input type="text" inputMode="numeric" placeholder="dd/mm/aaaa" value={searchDate} onChange={e => setSearchDate(e.target.value)} className={campo} />
              </label>
              <label className="text-xs font-bold text-slate-600">Turma
                <input type="search" placeholder="Buscar por turma" value={searchTurma} onChange={e => setSearchTurma(e.target.value)} className={campo} />
              </label>
              <label className="text-xs font-bold text-slate-600">Instrutor
                <input type="search" placeholder="Buscar por instrutor" value={searchInstrutor} onChange={e => setSearchInstrutor(e.target.value)} className={campo} />
              </label>
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-2">
              {adminTab === 'aulas' && (
                <button type="button" aria-pressed={searchDate === hojeBR} onClick={() => setSearchDate(searchDate === hojeBR ? '' : hojeBR)}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors ${searchDate === hojeBR ? 'bg-[#0F2A52] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  <Calendar className="h-4 w-4" /> Hoje
                </button>
              )}
              {[
                { id: 'Matutino', label: 'Manhã', icon: Sun },
                { id: 'Vespertino', label: 'Tarde', icon: Sunset },
                { id: 'Noturno', label: 'Noite', icon: Moon },
              ].map(t => {
                const Icon = t.icon;
                const ativo = filterShift === t.id;
                return (
                  <button key={t.id} type="button" aria-pressed={ativo} onClick={() => setFilterShift(ativo ? null : t.id)}
                    className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors ${ativo ? 'bg-[#0F2A52] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                    <Icon className="h-4 w-4" /> {t.label}
                  </button>
                );
              })}
              {temFiltro && (
                <button type="button" onClick={() => { setSearchDate(''); setSearchTurma(''); setSearchInstrutor(''); setFilterShift(null); }}
                  className="min-h-10 px-2 text-sm font-semibold text-[#1D4E8C] underline-offset-2 hover:underline">
                  Limpar filtros
                </button>
              )}
              <p className="ml-auto text-sm tabular-nums text-slate-500" role="status">
                {aulasFiltradas.length === 1 ? '1 aula' : `${aulasFiltradas.length} aulas`}
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">Data</th>
                    <th scope="col" className="px-4 py-3">Horário</th>
                    <th scope="col" className="px-4 py-3">Ambiente</th>
                    <th scope="col" className="px-4 py-3">Turma</th>
                    <th scope="col" className="px-4 py-3">Instrutor</th>
                    <th scope="col" className="px-4 py-3">Unidade curricular</th>
                    <th scope="col" className="px-4 py-3 text-right"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aulasFiltradas.slice(0, limiteLinhas).map(aula => {
                    const [salaPrincipal, ...salaDetalhe] = formatarNomeSala(aula.sala).split(' — ');
                    const turno = ROTULO_TURNO[aula.turno] || ROTULO_TURNO.Matutino;
                    const uc = aula.unidade_curricular ? formatarUnidadeCurricular(aula.unidade_curricular) : '—';
                    return (
                      <tr key={aula.id} className="align-top hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums">{aula.data}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="font-semibold tabular-nums">{aula.inicio}{aula.fim ? `–${aula.fim}` : ''}</span>
                          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${turno.cor}`}>{turno.rotulo}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold">{salaPrincipal}</p>
                          {salaDetalhe.length > 0 && <p className="text-xs text-slate-500">{salaDetalhe.join(' · ')}</p>}
                        </td>
                        <td className="px-4 py-3 font-semibold">{aula.turma}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {aula.instrutor}
                          {aula.modificadoManualmente && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800" title="Esta aula foi criada ou alterada pela gestão e não é sobrescrita ao importar a planilha.">
                              <Edit3 className="h-3 w-3" /> Ajustada
                            </span>
                          )}
                        </td>
                        <td className="max-w-[260px] px-4 py-3 text-slate-600" title={uc}><span className="line-clamp-2">{uc}</span></td>
                        <td className="whitespace-nowrap px-2 py-2 text-right">
                          <button type="button" onClick={() => setEditingAula(aula)} aria-label={`Editar aula da turma ${aula.turma}`} title="Editar"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#1D4E8C] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-500">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => excluirAula(aula)} aria-label={`Excluir aula da turma ${aula.turma}`} title="Excluir"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {carregandoHistorico && (
                <p role="status" className="px-4 py-14 text-center text-sm text-slate-500">Carregando o histórico…</p>
              )}
              {erroHistorico && adminTab === 'historico' && (
                <div role="alert" className="px-4 py-10 text-center">
                  <p className="text-sm font-semibold text-red-700">{erroHistorico}</p>
                  <button type="button" onClick={() => void carregarHistorico()} className="mt-3 min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold hover:bg-slate-50">Tentar de novo</button>
                </div>
              )}
              {aulasFiltradas.length === 0 && !carregandoHistorico && !(erroHistorico && adminTab === 'historico') && (
                <div className="px-4 py-14 text-center">
                  <p className="font-bold">{temFiltro ? 'Nenhuma aula com esses filtros' : adminTab === 'historico' ? 'Ainda não há aulas no histórico' : 'Nenhuma aula no cronograma'}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {temFiltro ? 'Ajuste ou limpe os filtros para ver mais aulas.' : adminTab === 'historico' ? 'As aulas passam para cá no dia seguinte.' : 'Importe a planilha de horários ou cadastre uma aula.'}
                  </p>
                </div>
              )}
            </div>

            {aulasFiltradas.length > limiteLinhas && (
              <div className="mt-4 text-center">
                <button type="button" onClick={() => setLimiteLinhas(limiteLinhas + 100)} className={`${botao} border border-slate-300 bg-white hover:bg-slate-50`}>
                  Mostrar mais 100 ({aulasFiltradas.length - limiteLinhas} restantes)
                </button>
              </div>
            )}

            {podeExcluirEmMassa && (
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/50 px-4 py-3">
                <p className="text-sm text-slate-600">
                  {adminTab === 'historico' ? 'Apaga as aulas com mais de 3 meses. Não dá para desfazer.' : 'Apaga todas as aulas do cronograma. Não dá para desfazer.'}
                </p>
                <button type="button" onClick={() => (adminTab === 'historico' ? context.clearAulasHistory() : context.clearAulas())}
                  className={`${botao} border border-red-200 bg-white text-red-700 hover:bg-red-600 hover:text-white`}>
                  <Trash2 className="h-4 w-4" /> {adminTab === 'historico' ? 'Limpar histórico antigo' : 'Limpar cronograma'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminScreen;
