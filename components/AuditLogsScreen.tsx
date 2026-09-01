import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { LogEntry } from '../types';
import { ShieldCheck, Search, Download, Filter, Clock, User, ArrowLeft, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Topbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Logs de Auditoria e Segurança</h1>
              <p className="text-xs text-slate-400">Rastreabilidade completa de ações administrativas</p>
            </div>
          </div>
        </div>

        <button
          onClick={exportarCSV}
          disabled={logsFiltrados.length === 0}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-red-400" />
          Exportar CSV
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Controles de Filtro */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/80 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por usuário ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-red-500"
            >
              <option value="TODOS">Todas as ações</option>
              <option value="IMPORTAR_CSV">IMPORTAR_CSV</option>
              <option value="CRIAR_AULA">CRIAR_AULA</option>
              <option value="EDITAR_AULA">EDITAR_AULA</option>
              <option value="EXCLUIR_AULA">EXCLUIR_AULA</option>
              <option value="UPLOAD_MIDIA">UPLOAD_MIDIA</option>
              <option value="EXCLUIR_MIDIA">EXCLUIR_MIDIA</option>
              <option value="APROVAR_AGENDAMENTO">APROVAR_AGENDAMENTO</option>
              <option value="REJEITAR_AGENDAMENTO">REJEITAR_AGENDAMENTO</option>
              <option value="CRIAR_AMBIENTE">CRIAR_AMBIENTE</option>
            </select>
          </div>
        </div>

        {/* Tabela de Logs */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            <p className="text-sm">Carregando histórico de auditoria...</p>
          </div>
        ) : logsFiltrados.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800/80 p-8">
            Nenhum registro de log encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-6">Data / Hora</th>
                    <th className="py-3.5 px-6">Usuário (Ator)</th>
                    <th className="py-3.5 px-6">Ação</th>
                    <th className="py-3.5 px-6">Entidade</th>
                    <th className="py-3.5 px-6">Identificador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {logsFiltrados.map((log) => {
                    const dataHora = log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('pt-BR') : 'Agora';

                    return (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-6 font-mono text-xs text-slate-400 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {dataHora}
                          </div>
                        </td>
                        <td className="py-4 px-6 font-medium text-white">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{log.actorNome || 'Sistema'}</span>
                            <span className="text-xs text-slate-500 font-normal">({log.actorEmail})</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            log.acao.startsWith('CRIAR') || log.acao.startsWith('APROVAR') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            log.acao.startsWith('EXCLUIR') || log.acao.startsWith('REJEITAR') ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {log.acao}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-mono text-xs text-slate-300 uppercase">
                          {log.entidadeTipo}
                        </td>
                        <td className="py-4 px-6 font-mono text-xs text-slate-400 truncate max-w-xs">
                          {log.entidadeId}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AuditLogsScreen;
