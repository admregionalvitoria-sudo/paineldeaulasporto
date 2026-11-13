import React, { useContext, useEffect, useState } from 'react';
import {
  Bell, Brush, Building, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Clock, DoorOpen,
  ExternalLink, History, Image, LogOut, Menu, ShieldCheck, Users, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DataContext } from '../context/DataContext';
import { Capacidade, pode, ROTULO_PAPEL } from '../utils/permissoes';

export type AdminTab = 'aulas' | 'historico' | 'ambientes' | 'agendamentos' | 'alertas' | 'agenda' | 'limpeza';
export type RotaGestao = 'administrativo' | 'midia' | 'usuarios' | 'logs';
export type ItemAtivo = AdminTab | RotaGestao;

interface Item {
  id: ItemAtivo;
  rotulo: string;
  icone: React.ComponentType<{ size?: number; className?: string }>;
  capacidade: Capacidade;
  aba?: boolean;
}

const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: 'Pedagógico',
    itens: [
      { id: 'aulas', rotulo: 'Cronograma', icone: Clock, capacidade: 'cronograma', aba: true },
      { id: 'agendamentos', rotulo: 'Solicitações', icone: Building, capacidade: 'solicitacoes', aba: true },
      { id: 'ambientes', rotulo: 'Ambientes', icone: DoorOpen, capacidade: 'ambientes', aba: true },
      { id: 'historico', rotulo: 'Histórico', icone: History, capacidade: 'historico', aba: true },
      { id: 'alertas', rotulo: 'Alertas', icone: Bell, capacidade: 'alertas', aba: true },
      { id: 'agenda', rotulo: 'Agenda do Porto', icone: CalendarDays, capacidade: 'agenda', aba: true },
    ],
  },
  {
    titulo: 'Administrativo',
    itens: [
      { id: 'limpeza', rotulo: 'Limpeza', icone: Brush, capacidade: 'limpeza', aba: true },
      { id: 'administrativo', rotulo: 'Prioridades e agenda', icone: ClipboardList, capacidade: 'administrativo' },
      { id: 'usuarios', rotulo: 'Usuários', icone: Users, capacidade: 'usuarios' },
      { id: 'logs', rotulo: 'Auditoria', icone: ShieldCheck, capacidade: 'logs' },
    ],
  },
  {
    titulo: 'Comunicação',
    itens: [{ id: 'midia', rotulo: 'Mídias e TV', icone: Image, capacidade: 'midia' }],
  },
];

const TELAS_PUBLICAS = [
  { rota: 'dashboard', rotulo: 'Painel das TVs' },
  { rota: 'agendamento', rotulo: 'Agendamento de salas' },
  { rota: 'limpeza', rotulo: 'Painel de limpeza' },
  { rota: 'painelcliente', rotulo: 'Painel do cliente' },
];

interface Props {
  ativo: ItemAtivo;
  onAba: (aba: AdminTab) => void;
  onNavegar: (rota: string) => void;
  children: React.ReactNode;
}

const foco = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500';

/** Moldura única da gestão: o mesmo menu lateral em todas as telas, só com o que o perfil pode usar. */
export default function GestaoShell({ ativo, onAba, onNavegar, children }: Props) {
  const { usuarioAtual, logout } = useAuth();
  const context = useContext(DataContext);
  const [recolhido, setRecolhido] = useState(() => {
    try { return localStorage.getItem('gestao_menu_recolhido') === '1'; } catch { return false; }
  });
  const [abertoNoCelular, setAbertoNoCelular] = useState(false);

  // As reservas completas (com dados pessoais) só são carregadas para quem decide sobre elas.
  const decideReservas = pode(usuarioAtual, 'solicitacoes');
  const assinar = context?.assinarAgendamentos;
  useEffect(() => (decideReservas ? assinar?.('completo') : undefined), [decideReservas, assinar]);

  useEffect(() => {
    try { localStorage.setItem('gestao_menu_recolhido', recolhido ? '1' : '0'); } catch { /* preferência opcional */ }
  }, [recolhido]);

  const pendentes = decideReservas ? (context?.agendamentos || []).filter(a => a.status === 'pendente').length : 0;
  const alertasAtivos = (context?.alertas || []).filter(a => a.ativo).length;
  const contador: Partial<Record<ItemAtivo, number>> = { agendamentos: pendentes, alertas: alertasAtivos };

  const esconder = recolhido ? 'lg:hidden' : '';
  const grupos = GRUPOS
    .map(grupo => ({ ...grupo, itens: grupo.itens.filter(item => pode(usuarioAtual, item.capacidade)) }))
    .filter(grupo => grupo.itens.length > 0);

  const abrir = (item: Item) => {
    setAbertoNoCelular(false);
    if (item.aba) onAba(item.id as AdminTab);
    else onNavegar(item.id);
  };

  return (
    <div className="min-h-screen bg-[#EDF1F6] font-sans text-[#0F2A52] lg:flex">
      <aside aria-label="Menu da gestão"
        className={`border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:flex-col lg:border-b-0 lg:border-r ${recolhido ? 'lg:w-[72px]' : 'lg:w-64'}`}>
        <div className="flex h-16 items-center justify-between gap-2 px-4">
          <div className={`min-w-0 ${esconder}`}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#F4901E]">SENAI Porto</p>
            <p className="truncate text-sm font-bold">Gestão da unidade</p>
          </div>
          <button type="button" onClick={() => setRecolhido(!recolhido)} aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
            className={`hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:block ${foco}`}>
            {recolhido ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          <button type="button" onClick={() => setAbertoNoCelular(!abertoNoCelular)} aria-expanded={abertoNoCelular} aria-controls="menu-gestao"
            aria-label={abertoNoCelular ? 'Fechar menu' : 'Abrir menu'} className={`rounded-lg p-2 hover:bg-slate-100 lg:hidden ${foco}`}>
            {abertoNoCelular ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav id="menu-gestao" className={`${abertoNoCelular ? 'block' : 'hidden'} overflow-y-auto px-3 pb-4 lg:block lg:flex-1`}>
          {grupos.map(grupo => (
            <div key={grupo.titulo} className="mb-5">
              <p className={`mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 ${esconder}`}>{grupo.titulo}</p>
              <ul className="space-y-0.5">
                {grupo.itens.map(item => {
                  const Icone = item.icone;
                  const selecionado = ativo === item.id;
                  const quantidade = contador[item.id] || 0;
                  return (
                    <li key={item.id}>
                      <button type="button" onClick={() => abrir(item)} title={recolhido ? item.rotulo : undefined}
                        aria-label={quantidade ? `${item.rotulo}, ${quantidade} aguardando` : item.rotulo}
                        aria-current={selecionado ? 'page' : undefined}
                        className={`relative flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition-colors ${foco} ${selecionado ? 'bg-[#0F2A52] text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-[#0F2A52]'}`}>
                        <Icone size={18} className={`shrink-0 ${selecionado ? 'text-orange-300' : 'text-slate-400'}`} />
                        <span className={`min-w-0 flex-1 truncate ${esconder}`}>{item.rotulo}</span>
                        {quantidade > 0 && (
                          <span className={`rounded-full bg-[#F4901E] px-2 py-0.5 text-xs font-bold tabular-nums text-white ${recolhido ? 'lg:absolute lg:right-1 lg:top-1 lg:px-1.5 lg:text-[10px]' : ''}`}>
                            {quantidade}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div className={`mb-4 border-t border-slate-100 pt-4 ${esconder}`}>
            <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Telas públicas</p>
            <ul className="space-y-0.5">
              {TELAS_PUBLICAS.map(tela => (
                <li key={tela.rota}>
                  <button type="button" onClick={() => onNavegar(tela.rota)}
                    className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-slate-500 hover:bg-slate-100 hover:text-[#0F2A52] ${foco}`}>
                    <ExternalLink size={15} className="shrink-0 text-slate-300" />
                    <span className="truncate">{tela.rotulo}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className={`${abertoNoCelular ? 'block' : 'hidden'} border-t border-slate-100 p-3 lg:block`}>
          {usuarioAtual && (
            <div className={`mb-2 px-3 ${esconder}`}>
              <p className="truncate text-sm font-bold">{usuarioAtual.nome || usuarioAtual.email}</p>
              <p className="truncate text-xs text-slate-500">{ROTULO_PAPEL[usuarioAtual.role]}</p>
            </div>
          )}
          <button type="button" onClick={logout} title={recolhido ? 'Sair' : undefined} aria-label="Sair da conta"
            className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-red-600 hover:bg-red-50 ${foco}`}>
            <LogOut size={18} className="shrink-0" />
            <span className={esconder}>Sair</span>
          </button>
        </div>
      </aside>

      <div className={`min-w-0 flex-1 ${recolhido ? 'lg:ml-[72px]' : 'lg:ml-64'}`}>{children}</div>
    </div>
  );
}
