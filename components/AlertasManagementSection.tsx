import React, { useState, useContext } from 'react';
import { DataContext, ExtendedDataContextType } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Bell, CheckCircle, Send, Trash2, Clock, User } from 'lucide-react';

export default function AlertasManagementSection({ hideForm = false }: { hideForm?: boolean }) {
  const context = useContext(DataContext) as ExtendedDataContextType;
  const { temPermissao, usuarioAtual } = useAuth();
  const isAdmin = temPermissao(['admin', 'super_admin']);

  const [novoAlerta, setNovoAlerta] = useState('');

  const handleEnviarAlerta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoAlerta.trim()) return;

    try {
      await context.criarAlerta(novoAlerta);
      setNovoAlerta('');
    } catch (err) {
      alert("Erro ao enviar o alerta.");
    }
  };

  const alertasAtivos = context.alertas.filter(a => a.ativo);
  const alertasLidos = context.alertas.filter(a => !a.ativo);

  return (
    <div className="space-y-8">
      {isAdmin && !hideForm && (
        <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-wider text-[#0F2A52] mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#F4901E]" />
            Enviar Novo Alerta
          </h3>
          <form onSubmit={handleEnviarAlerta} className="flex flex-col gap-4">
            <textarea
              value={novoAlerta}
              onChange={(e) => setNovoAlerta(e.target.value)}
              placeholder="Digite o alerta para chamar a atenção do Pedagógico e outros usuários..."
              className="w-full bg-[#F8FAFC] border border-[#E5E7EB] p-4 rounded-xl text-sm outline-none focus:border-[#F4901E] text-[#0F2A52] resize-none h-24"
            />
            <button
              type="submit"
              disabled={!novoAlerta.trim()}
              className="self-end bg-[#0F2A52] text-white px-6 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-2 hover:bg-[#1D4E8C] transition-all shadow-md disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Enviar Alerta
            </button>
          </form>
        </div>
      )}

      <div>
        <h3 className="text-sm font-black uppercase tracking-wider text-[#0F2A52] mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-red-500" />
          Alertas Ativos
        </h3>
        {alertasAtivos.length === 0 ? (
          <div className="text-center p-8 bg-[#F8FAFC] rounded-2xl border border-dashed border-[#CBD5E1]">
            <p className="text-[#64748B] text-sm">Nenhum alerta ativo no momento.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {alertasAtivos.map(alerta => (
              <div key={alerta.id} className="bg-red-50 border border-red-200 p-5 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex-1">
                  <p className="text-red-800 font-bold mb-2">{alerta.mensagem}</p>
                  <div className="flex items-center gap-4 text-[10px] text-red-600 font-medium">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {alerta.criadoPor}</span>
                    {alerta.criadoEm && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {alerta.criadoEm.toDate ? alerta.criadoEm.toDate().toLocaleString() : 'Recente'}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => context.marcarAlertaLido(alerta.id)}
                  className="shrink-0 bg-white text-red-600 border border-red-200 px-4 py-2 rounded-xl font-bold uppercase text-[10px] flex items-center gap-2 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Marcar como Lido
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-black uppercase tracking-wider text-[#64748B] mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          Histórico (Lidos)
        </h3>
        {alertasLidos.length === 0 ? (
          <div className="text-center p-6 bg-[#F8FAFC] rounded-2xl border border-dashed border-[#CBD5E1]">
            <p className="text-[#64748B] text-sm">Nenhum alerta lido ainda.</p>
          </div>
        ) : (
          <div className="grid gap-3 opacity-75">
            {alertasLidos.slice(0, 10).map(alerta => (
              <div key={alerta.id} className="bg-white border border-[#E5E7EB] p-4 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex-1">
                  <p className="text-[#0F2A52] text-sm mb-1">{alerta.mensagem}</p>
                  <div className="flex flex-wrap items-center gap-3 text-[9px] text-[#64748B]">
                    <span>Criado por: {alerta.criadoPor}</span>
                    <span>Lido por: <strong>{alerta.lidoPor}</strong></span>
                    {alerta.lidoEm && (
                      <span>Data: {alerta.lidoEm.toDate ? alerta.lidoEm.toDate().toLocaleString() : ''}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
