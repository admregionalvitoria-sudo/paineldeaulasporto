import React from 'react';
import { ArrowLeft, Bell, Brush, Building, Calendar, ChevronLeft, ChevronRight, ClipboardList, Clock, DoorOpen, Image, Layers, LogOut, Menu, ShieldCheck, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type AdminTab = 'aulas' | 'historico' | 'ambientes' | 'agendamentos' | 'limpeza' | 'alertas';

interface Props {
  activeTab: AdminTab;
  onTab: (tab: AdminTab) => void;
  onNavigate: (route: string) => void;
  onReturn: () => void;
  collapsed: boolean;
  onCollapse: () => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
  counts: Record<AdminTab, number>;
}

export default function AdminSidebar({ activeTab, onTab, onNavigate, onReturn, collapsed, onCollapse, mobileOpen, onMobileToggle, counts }: Props) {
  const { temPermissao, logout } = useAuth();
  const tabs = [
    { id: 'aulas' as const, label: 'Cronograma de aulas', icon: Clock },
    { id: 'historico' as const, label: 'Histórico de aulas', icon: Clock },
    { id: 'alertas' as const, label: 'Alertas', icon: Bell },
    { id: 'ambientes' as const, label: 'Ambientes e manutenção', icon: DoorOpen },
    { id: 'agendamentos' as const, label: 'Solicitações de salas', icon: Building },
    { id: 'limpeza' as const, label: 'Limpeza & observações', icon: Brush },
  ];
  const links = [
    { route: 'administrativo', label: 'Administrativo', icon: ClipboardList, show: true },
    { route: 'midia', label: 'Mídias & TV', icon: Image, show: temPermissao(['admin', 'comunicacao', 'midia']) },
    { route: 'usuarios', label: 'Usuários', icon: Users, show: temPermissao(['admin']) },
    { route: 'logs', label: 'Logs', icon: ShieldCheck, show: temPermissao(['admin']) },
    { route: 'agendamento', label: 'Agendamento', icon: Calendar, show: true },
    { route: 'painelcliente', label: 'Painel cliente', icon: Layers, show: true },
    { route: 'limpeza', label: 'Painel limpeza', icon: Brush, show: true },
  ];
  const labelClass = collapsed ? 'lg:hidden' : '';
  const itemClass = 'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500';
  return <aside className={`mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm lg:fixed lg:inset-y-4 lg:left-4 lg:z-20 lg:mb-0 lg:flex lg:flex-col ${collapsed ? 'lg:w-20' : 'lg:w-60'}`} aria-label="Menu administrativo">
    <div className="flex items-center justify-between gap-2 p-4">
      <div className={labelClass}><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#F4901E]">SENAI • PORTO</p><p className="mt-1 text-sm font-black">Gestão da unidade</p></div>
      <button type="button" onClick={onCollapse} aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'} title={collapsed ? 'Expandir menu' : 'Recolher menu'} className="hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:block">{collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</button>
      <button type="button" onClick={onMobileToggle} aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={mobileOpen} aria-controls="admin-sidebar-navigation" className="rounded-lg p-2 hover:bg-slate-100 lg:hidden">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
    </div>
    <nav id="admin-sidebar-navigation" className={`${mobileOpen ? 'block' : 'hidden'} overflow-y-auto px-3 pb-3 lg:block lg:flex-1`}>
      <p className={`mb-2 px-3 text-[9px] font-bold uppercase tracking-widest text-slate-400 ${labelClass}`}>Categorias</p>
      <div className="space-y-1">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" title={`${label} (${counts[id]})`} aria-label={`${label} (${counts[id]})`} aria-current={activeTab === id ? 'page' : undefined} onClick={() => onTab(id)} className={`${itemClass} ${activeTab === id ? 'bg-[#0F2A52] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}><Icon size={18} className={`shrink-0 ${activeTab === id ? 'text-orange-300' : 'text-[#1D4E8C]'}`} /><span className={`min-w-0 flex-1 ${labelClass}`}>{label}</span><span className={`rounded-md px-1.5 py-0.5 text-[10px] ${activeTab === id ? 'bg-white/15' : 'bg-slate-100'} ${labelClass}`}>{counts[id]}</span></button>)}</div>
      <div className="my-4 border-t border-slate-100" />
      <p className={`mb-2 px-3 text-[9px] font-bold uppercase tracking-widest text-slate-400 ${labelClass}`}>Acessos do sistema</p>
      <div className="space-y-0.5">{links.filter(item => item.show).map(({ route, label, icon: Icon }) => <button key={route} type="button" title={label} aria-label={label} onClick={() => onNavigate(route)} className={`${itemClass} text-slate-600 hover:bg-slate-100`}><Icon size={17} className="shrink-0 text-slate-400" /><span className={labelClass}>{label}</span></button>)}</div>
      <div className="mt-4 border-t border-slate-100 pt-3"><button type="button" title="Painel principal" aria-label="Painel principal" onClick={onReturn} className={`${itemClass} text-slate-600 hover:bg-slate-100`}><ArrowLeft size={17} className="shrink-0" /><span className={labelClass}>Painel principal</span></button><button type="button" title="Encerrar sessão" aria-label="Encerrar sessão" onClick={logout} className={`${itemClass} text-red-600 hover:bg-red-50`}><LogOut size={17} className="shrink-0" /><span className={labelClass}>Encerrar sessão</span></button></div>
    </nav>
  </aside>;
}
