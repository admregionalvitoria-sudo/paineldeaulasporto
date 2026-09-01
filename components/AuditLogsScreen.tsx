import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { LogEntry } from '../types';
import { ShieldCheck, Search, Download, ArrowLeft, Clock, User, Filter, AlertCircle } from 'lucide-react';

interface AuditLogsScreenProps {
  onBack: () => void;
}

const AuditLogsScreen: React.FC<AuditLogsScreenProps> = ({ onBack }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('TODOS');

  useEffect(() => {
    const logsRef = collection(db, 'porto', 'dados', 'logs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(150));

    const unsub = onSnapshot(q, (snapshot) => {
      const logList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as LogEntry[];
      setLogs(logList);
      setLoading(false);
    }, (err) => {
      console.error("Erro ao carregar logs de auditoria:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const logsFiltrados = logs.filter(log => {
    const matchesSearch = 
      (log.actorEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.actorNome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entidadeId || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = filterAction === 'TODOS' || log.acao === filterAction;

    return matchesSearch && matchesAction;
  });

  const exportarCSV = () => {
    if (logsFiltrados.length === 0) return;

    const headers = ['Data/Hora', 'Usuário Email', 'Nome', 'Ação', 'Entidade Tipo', 'ID Entidade'];
    const rows = logsFiltrados.map(l => {
      const dataHora = l.timestamp?.toDate ? l.timestamp.toDate().toLocaleString('pt-BR') : 'Data n/d';
      return [
        `"${dataHora}"`,
        `"${l.actorEmail || ''}"`,
        `"${l.actorNome || ''}"`,
        `"${l.acao}"`,
        `"${l.entidadeTipo}"`,
        `"${l.entidadeId}"`
      ].join(';');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_porto_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#EDF1F6] text-[#0F2A52] p-4 sm:p-8 font-sans">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 max-w-[2000px] mx-auto bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-[#F8FAFC] hover:bg-[#DBEAFE] text-[#0F2A52] border border-[#E5E7EB] transition-all"
            title="Voltar ao Painel Geral"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F4901E]">SENAI • AUDITORIA & LOGS</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                Rastreabilidade Ativa
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#0F2A52] mt-1">
              Registro de Atividades & Auditoria
            </h1>
          </div>
        </div>

        <button
          onClick={exportarCSV}
          disabled={logsFiltrados.length === 0}
          className="px-4 py-2.5 rounded-xl bg-[#0F2A52] hover:bg-[#1D4E8C] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all disabled:opacity-50 shadow-md"
        >
          <Download className="w-4 h-4 text-[#F4901E]" />
          <span>Exportar Relatório CSV</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="max-w-[2000px] mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-[#E5E7EB] shadow-lg space-y-6">
        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Buscar por e-mail, nome de usuário ou ID de entidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#6B7280]" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-3 text-xs outline-none focus:border-[#F4901E] text-[#0F2A52] font-semibold"
            >
              <option value="TODOS">Todas as Ações</option>
              <option value="CRIAR_AULA">Criação de Aula</option>
              <option value="EDITAR_AULA">Edição de Aula</option>
              <option value="EXCLUIR_AULA">Exclusão de Aula</option>
              <option value="APROVAR_AGENDAMENTO">Aprovação de Sala</option>
              <option value="REJEITAR_AGENDAMENTO">Recusa de Sala</option>
              <option value="ADICIONAR_MIDIA">Upload de Mídia</option>
              <option value="EXCLUIR_MIDIA">Exclusão de Mídia</option>
              <option value="CRIAR_USUARIO">Criação de Usuário</option>
            </select>
          </div>
        </div>

        {/* Tabela de Logs */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] text-[10px] font-black uppercase text-[#6B7280] tracking-wider">
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Usuário Responsável</th>
                <th className="py-3 px-4">Ação Realizada</th>
                <th className="py-3 px-4">Entidade</th>
                <th className="py-3 px-4">Detalhes / ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-xs">
              {logsFiltrados.map((log) => {
                const dataHora = log.timestamp?.toDate 
                  ? log.timestamp.toDate().toLocaleString('pt-BR') 
                  : (typeof log.timestamp === 'string' ? log.timestamp : 'Agora');

                return (
                  <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-[#0F2A52]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#6B7280]" />
                        <span>{dataHora}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#0F2A52]">{log.actorNome || log.actorEmail}</div>
                      <div className="text-[10px] text-[#6B7280] font-mono">{log.actorEmail}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        log.acao.includes('CRIAR') || log.acao.includes('APROVAR') ? 'bg-emerald-100 text-emerald-800' :
                        log.acao.includes('EXCLUIR') || log.acao.includes('REJEITAR') ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {log.acao}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#0F2A52]">
                      {log.entidadeTipo}
                    </td>
                    <td className="py-3 px-4 text-[#64748B] font-mono text-[11px] max-w-xs truncate">
                      {log.entidadeId || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {logsFiltrados.length === 0 && (
            <div className="py-16 text-center text-xs font-bold text-[#6B7280]">
              {loading ? 'Carregando logs...' : 'Nenhum registro de auditoria encontrado.'}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AuditLogsScreen;
