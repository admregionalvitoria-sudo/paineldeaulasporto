import React, { useState, useContext, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DataContext, ExtendedDataContextType, normalizarNomeAmbiente, calcularTurnoPorHorario } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
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
  ExternalLink
} from 'lucide-react';

interface AdminScreenProps {
  onReturnToDashboard: () => void;
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
                  {context?.excluirAmbiente && (
                    <button
                      onClick={() => {
                        if (confirm(`Remover o cadastro do ambiente "${sala}"?`)) {
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
  const [itemRejeitando, setItemRejeitando] = useState<AgendamentoSala | null>(null);

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
    await context.aprovarAgendamento(ag.id, true, responsavel);
  };

  const handleRejeitarConfirm = async () => {
    if (!itemRejeitando) return;
    await context.rejeitarAgendamento(itemRejeitando.id, motivoRejeicao.trim() || 'Não autorizado');
    setItemRejeitando(null);
    setMotivoRejeicao('');
  };

  return (
    <div className="space-y-6">
      {/* Modal de Rejeição */}
      {itemRejeitando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F2A52]/70 backdrop-blur-md">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#E5E7EB]">
            <h3 className="text-sm font-black uppercase text-[#0F2A52] mb-2">Recusar Solicitação</h3>
            <p className="text-xs text-[#6B7280] mb-4">Sala: {itemRejeitando.sala} para {itemRejeitando.solicitante}</p>
            <textarea
              placeholder="Informe o motivo da recusa..."
              value={motivoRejeicao}
              onChange={(e) => setMotivoRejeicao(e.target.value)}
              rows={3}
              className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl p-3 text-xs text-[#0F2A52] outline-none focus:border-red-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setItemRejeitando(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#6B7280] hover:bg-[#F1F5F9]"
              >
                Cancelar
              </button>
              <button
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
                <span className="font-bold">Solicitante:</span> {ag.solicitante} {ag.emailSolicitante && `(${ag.emailSolicitante})`}
              </p>
              {ag.turma && <p className="text-xs text-[#6B7280]"><span className="font-bold">Turma:</span> {ag.turma}</p>}
              {ag.motivo && <p className="text-xs text-[#6B7280]"><span className="font-bold">Motivo:</span> {ag.motivo}</p>}
              {ag.aprovadoPor && <p className="text-[10px] text-emerald-700 font-bold">Aprovado por: {ag.aprovadoPor}</p>}
            </div>

            {ag.status === 'pendente' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAprovar(ag)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  Aprovar
                </button>
                <button
                  onClick={() => setItemRejeitando(ag)}
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

  const todayStr = useMemo(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  const salas = context?.salasCadastradas || [];
  const aulasHoje = useMemo(() => {
    return (context?.aulas || []).filter(a => (a.data || '').trim() === todayStr);
  }, [context?.aulas, todayStr]);

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

const AdminScreen: React.FC<AdminScreenProps> = ({ onReturnToDashboard, onNavigate }) => {
  const context = useContext(DataContext) as ExtendedDataContextType;
  const { usuarioAtual, logout } = useAuth();

  const [adminTab, setAdminTab] = useState<'aulas' | 'ambientes' | 'agendamentos' | 'limpeza'>('aulas');
  const [editingAula, setEditingAula] = useState<Aula | null>(null);
  const [addingAula, setAddingAula] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchDate, setSearchDate] = useState('');
  const [searchTurma, setSearchTurma] = useState('');
  const [searchInstrutor, setSearchInstrutor] = useState('');
  const [filterShift, setFilterShift] = useState<string | null>(null);

  const pendentesCount = (context.agendamentos || []).filter(a => a.status === 'pendente').length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      context.uploadCSV(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getTodayFormatted = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const filteredAulasAdmin = useMemo(() => {
    return context.aulas.filter(aula => {
      const matchesDate = !searchDate || aula.data.includes(searchDate);
      const matchesTurma = !searchTurma || aula.turma.toLowerCase().includes(searchTurma.toLowerCase());
      const matchesInstrutor = !searchInstrutor || aula.instrutor.toLowerCase().includes(searchInstrutor.toLowerCase());
      const matchesShift = !filterShift || (aula.turno && aula.turno.toLowerCase() === filterShift.toLowerCase());
      
      return matchesDate && matchesTurma && matchesInstrutor && matchesShift;
    });
  }, [context.aulas, searchDate, searchTurma, searchInstrutor, filterShift]);

  return (
    <div className="min-h-screen bg-[#EDF1F6] text-[#0F2A52] p-4 sm:p-8 font-sans relative">
      <AnimatePresence>
        {editingAula && (
          <EditModal 
            aula={editingAula} 
            onClose={() => setEditingAula(null)} 
            onSave={d => { 
              context.updateAula(editingAula.id, d); 
              setEditingAula(null); 
            }} 
          />
        )}
        {addingAula && (
          <AddModal 
            salasExistentes={context.salasCadastradas}
            onClose={() => setAddingAula(false)} 
            onSave={d => { 
              context.addAula(d); 
              setAddingAula(false); 
            }} 
          />
        )}
      </AnimatePresence>
      
      {/* Top Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 max-w-[2000px] mx-auto bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F4901E]">SENAI • PAINEL ADMINISTRATIVO</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-[#0F2A52] border border-blue-200">
              {usuarioAtual?.email || 'admin@senai.br'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#0F2A52] mt-1">
            Gestão de Horários & Ambientes
          </h1>
        </div>

        {/* Links Rápidos e Ações */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate ? onNavigate('midia') : (window.location.pathname = '/midia')}
            className="bg-[#0F2A52] text-white px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] flex items-center gap-2 hover:bg-[#1D4E8C] transition-all shadow-xs"
          >
            <ImageIcon className="w-4 h-4 text-red-400" />
            <span>Mídias & TV</span>
          </button>

          <button
            onClick={() => onNavigate ? onNavigate('usuarios') : (window.location.pathname = '/usuarios')}
            className="bg-white border border-[#CBD5E1] text-[#0F2A52] px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] flex items-center gap-2 hover:bg-[#F1F5F9] transition-all shadow-xs"
          >
            <Users className="w-4 h-4 text-[#F4901E]" />
            <span>Usuários</span>
          </button>

          <button
            onClick={() => onNavigate ? onNavigate('logs') : (window.location.pathname = '/logs')}
            className="bg-white border border-[#CBD5E1] text-[#0F2A52] px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] flex items-center gap-2 hover:bg-[#F1F5F9] transition-all shadow-xs"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Logs</span>
          </button>

          <button
            onClick={() => onNavigate ? onNavigate('agendamento') : (window.location.pathname = '/agendamento')}
            className="bg-white border border-[#CBD5E1] text-[#0F2A52] px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] flex items-center gap-2 hover:bg-[#F1F5F9] transition-all shadow-xs"
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Agendamento</span>
          </button>

          <button
            onClick={() => onNavigate ? onNavigate('painelcliente') : (window.location.pathname = '/painelcliente')}
            className="bg-white border border-[#CBD5E1] text-[#0F2A52] px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] flex items-center gap-2 hover:bg-[#F1F5F9] transition-all shadow-xs"
            title="Abrir Painel de Vídeo para Clientes / Recepção"
          >
            <Layers className="w-4 h-4 text-purple-600" />
            <span>Painel Cliente</span>
          </button>

          <button
            onClick={() => onNavigate ? onNavigate('limpeza') : (window.location.pathname = '/limpeza')}
            className="bg-white border border-[#CBD5E1] text-[#0F2A52] px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] flex items-center gap-2 hover:bg-[#F1F5F9] transition-all shadow-xs"
            title="Abrir Painel Operacional de Limpeza"
          >
            <Broom className="w-4 h-4 text-[#1D4E8C]" />
            <span>Painel Limpeza</span>
          </button>

          <button 
            onClick={logout} 
            title="Encerrar Sessão" 
            className="p-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-colors border border-red-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container com as 3 Abas */}
      <main className="max-w-[2000px] mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-[#E5E7EB] shadow-lg">
        {/* Navegação de Abas */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b border-[#E5E7EB] pb-4">
          <div className="flex flex-wrap bg-[#F1F5F9] p-1.5 rounded-2xl gap-2">
            <button
              onClick={() => setAdminTab('aulas')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                adminTab === 'aulas'
                  ? 'bg-white text-[#0F2A52] shadow-sm'
                  : 'text-[#64748B] hover:text-[#0F2A52]'
              }`}
            >
              <Clock className="w-4 h-4 text-[#1D4E8C]" />
              <span>Cronograma de Aulas ({context.aulas.length})</span>
            </button>

            <button
              onClick={() => setAdminTab('ambientes')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                adminTab === 'ambientes'
                  ? 'bg-white text-[#0F2A52] shadow-sm'
                  : 'text-[#64748B] hover:text-[#0F2A52]'
              }`}
            >
              <DoorOpen className="w-4 h-4 text-[#F4901E]" />
              <span>Gestão de Ambientes ({context.salasCadastradas.length})</span>
            </button>

            <button
              onClick={() => setAdminTab('agendamentos')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 relative ${
                adminTab === 'agendamentos'
                  ? 'bg-white text-[#0F2A52] shadow-sm'
                  : 'text-[#64748B] hover:text-[#0F2A52]'
              }`}
            >
              <Building className="w-4 h-4 text-[#F4901E]" />
              <span>Solicitações de Salas</span>
              {pendentesCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                  {pendentesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setAdminTab('limpeza')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 relative ${
                adminTab === 'limpeza'
                  ? 'bg-white text-[#0F2A52] shadow-sm'
                  : 'text-[#64748B] hover:text-[#0F2A52]'
              }`}
            >
              <Broom className="w-4 h-4 text-[#1D4E8C]" />
              <span>Limpeza & Observações</span>
              {Object.keys(context.observacoesLimpeza || {}).filter(k => !!context.observacoesLimpeza?.[k]?.observacao).length > 0 && (
                <span className="bg-[#F4901E] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                  {Object.keys(context.observacoesLimpeza || {}).filter(k => !!context.observacoesLimpeza?.[k]?.observacao).length}
                </span>
              )}
            </button>
          </div>

          {adminTab === 'aulas' && (
            <div className="flex flex-wrap items-center gap-3">
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={context.loading}
                className="bg-[#0F2A52] text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-1.5 hover:bg-[#1D4E8C] transition-all shadow-md disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" /> 
                {context.loading ? 'Processando...' : 'Importar CSV'}
              </button>
              
              <button 
                onClick={() => setAddingAula(true)}
                className="bg-[#F4901E] text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-1.5 hover:bg-[#E67E22] transition-all shadow-md"
              >
                <Plus className="w-4 h-4" /> Nova Aula
              </button>

              <button 
                onClick={() => context.clearAulas()} 
                className="bg-red-50 text-red-600 border border-red-200 px-4 py-2.5 rounded-xl font-black uppercase text-[10px] flex items-center gap-1.5 hover:bg-red-600 hover:text-white transition-all"
              >
                <Trash2 className="w-4 h-4" /> Limpar Tudo
              </button>
            </div>
          )}
        </div>

        {/* Conteúdo Conforme a Aba */}
        {adminTab === 'ambientes' ? (
          <AmbientesManagementSection />
        ) : adminTab === 'agendamentos' ? (
          <AgendamentosAdminSection />
        ) : adminTab === 'limpeza' ? (
          <LimpezaManagementSection onNavigate={onNavigate} />
        ) : (
          /* Aba de Aulas & Cronograma */
          <div>
            {/* Filtros de Pesquisa */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div>
                <label className="text-[10px] font-black uppercase text-[#6B7280] block mb-1">Data</label>
                <input 
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-[#6B7280] block mb-1">Turma</label>
                <input 
                  type="text"
                  placeholder="Buscar por turma..."
                  value={searchTurma}
                  onChange={(e) => setSearchTurma(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-[#6B7280] block mb-1">Instrutor</label>
                <input 
                  type="text"
                  placeholder="Buscar por instrutor..."
                  value={searchInstrutor}
                  onChange={(e) => setSearchInstrutor(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
                />
              </div>
            </div>

            {/* Filtros de Turno e Acesso Rápido */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setSearchDate(getTodayFormatted())}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold uppercase text-[10px] transition-all ${
                  searchDate === getTodayFormatted()
                    ? 'bg-[#0F2A52] text-white shadow-md' 
                    : 'bg-[#F8FAFC] text-[#6B7280] border border-[#E5E7EB] hover:bg-[#DBEAFE]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Hoje
              </button>

              {[
                { id: 'Matutino', label: 'Manhã', icon: Sun },
                { id: 'Vespertino', label: 'Tarde', icon: Sunset },
                { id: 'Noturno', label: 'Noite', icon: Moon }
              ].map((t) => {
                const Icon = t.icon;
                const isActive = filterShift === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setFilterShift(isActive ? null : t.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold uppercase text-[10px] transition-all ${
                      isActive 
                        ? 'bg-[#F4901E] text-white shadow-md' 
                        : 'bg-[#F8FAFC] text-[#6B7280] border border-[#E5E7EB] hover:bg-[#DBEAFE]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}

              {(searchDate || searchTurma || searchInstrutor || filterShift) && (
                <button
                  onClick={() => {
                    setSearchDate('');
                    setSearchTurma('');
                    setSearchInstrutor('');
                    setFilterShift(null);
                  }}
                  className="text-xs font-bold text-red-500 hover:underline ml-2"
                >
                  Limpar Filtros
                </button>
              )}
            </div>

            {/* Listagem de Aulas */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-[10px] font-black uppercase text-[#6B7280] tracking-wider">
                    <th className="py-3 px-4">Ambiente / Sala</th>
                    <th className="py-3 px-4">Turma</th>
                    <th className="py-3 px-4">Instrutor</th>
                    <th className="py-3 px-4">Unidade Curricular</th>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Horário</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-xs">
                  {filteredAulasAdmin.map(aula => (
                    <tr key={aula.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#0F2A52]">
                        <span className="px-2 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs">
                          {formatarNomeSala(aula.sala)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#0F2A52] max-w-[200px] truncate">
                        {aula.turma}
                      </td>
                      <td className="py-3 px-4 text-[#475569]">{aula.instrutor}</td>
                      <td className="py-3 px-4 text-[#64748B] max-w-[220px] truncate">{aula.unidade_curricular || '—'}</td>
                      <td className="py-3 px-4 text-[#0F2A52] font-mono text-[11px]">{aula.data}</td>
                      <td className="py-3 px-4 font-bold text-[#0F2A52]">
                        <div>{aula.inicio} {aula.fim ? `- ${aula.fim}` : ''}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          aula.turno === 'Vespertino' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          aula.turno === 'Noturno' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' :
                          'bg-sky-100 text-sky-800 border border-sky-300'
                        }`}>
                          {aula.turno === 'Vespertino' ? 'Tarde' : aula.turno === 'Noturno' ? 'Noite' : 'Manhã'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingAula(aula)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar Aula"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Excluir a aula da turma "${aula.turma}" no ambiente "${aula.sala}"?`)) {
                                context.deleteAula(aula.id);
                              }
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir Aula"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredAulasAdmin.length === 0 && (
                <div className="py-12 text-center text-xs font-bold text-[#6B7280]">
                  Nenhuma aula encontrada para os filtros selecionados.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminScreen;
