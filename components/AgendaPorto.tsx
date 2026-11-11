import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, MapPin, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAdministrativo } from '../hooks/useAdministrativo';
import { AGENDA_ROLES, CompromissoPorto, dataLocal } from '../utils/administrativo';

export default function AgendaPorto({ inline = false }: { inline?: boolean }) {
  const { temPermissao } = useAuth();
  const allowed = temPermissao(AGENDA_ROLES);
  const agenda = useAdministrativo<CompromissoPorto>('agendaPorto', allowed);
  const dialog = useRef<HTMLDialogElement>(null);
  const [date, setDate] = useState(dataLocal());
  useEffect(() => { if (!allowed) dialog.current?.close(); }, [allowed]);
  if (!allowed) return null;

  const events = agenda.items.filter(item => item.data === date).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const todayCount = agenda.items.filter(item => item.data === dataLocal()).length;
  
  const formatDateBR = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const futureEvents = agenda.items
    .filter(item => item.data > date)
    .sort((a, b) => a.data.localeCompare(b.data) || a.inicio.localeCompare(b.inicio))
    .slice(0, 4);

  const renderEventList = (list: CompromissoPorto[], showDate = false) => (
    <div className="grid gap-3">
      {list.map(item => (
        <article key={item.id} className="min-w-0 rounded-xl border border-slate-200 border-l-4 border-l-[#F4901E] bg-white p-4 shadow-sm">
          <p className="text-xs font-black text-blue-700">
            {showDate ? `${formatDateBR(item.data)} · ` : ''}{item.inicio} — {item.fim}
          </p>
          <h3 className="mt-1 break-words font-bold text-[#0F2A52]">{item.titulo}</h3>
          {item.local && <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500"><MapPin size={13} className="mt-0.5 shrink-0" /><span className="break-words">{item.local}</span></p>}
          {item.descricao && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-500">{item.descricao}</p>}
        </article>
      ))}
    </div>
  );
  if (inline) return <section aria-label="Agenda do Porto" className="mb-5 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-blue-50/60 px-5 py-4">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-[#0F2A52] p-2.5 text-white"><CalendarDays size={20} /></span><div><h2 className="text-lg font-black text-[#0F2A52]">Agenda do Porto</h2><p className="text-xs text-slate-500">Compromissos da unidade · {events.length} nesta data</p></div></div>
      <div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="agenda-porto-inline-date">Data da Agenda do Porto</label><input id="agenda-porto-inline-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="min-w-0 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-[#0F2A52]" /><button type="button" onClick={() => setDate(dataLocal())} className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50">Hoje</button></div>
    </div>
    <div className="max-h-[600px] overflow-y-auto p-4 bg-[#F8FAFC]">
      {agenda.loading ? (
        <p role="status" className="p-2 text-sm text-slate-500">Carregando agenda…</p>
      ) : agenda.error ? (
        <p role="alert" className="p-2 text-sm text-red-700">{agenda.error}</p>
      ) : events.length === 0 ? (
        <p className="p-2 text-sm text-slate-500">Nenhum compromisso nesta data. Os eventos publicados pelo Administrativo aparecem aqui.</p>
      ) : (
        renderEventList(events)
      )}
      
      {futureEvents.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-200">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Próximos Eventos</h3>
          {renderEventList(futureEvents, true)}
        </div>
      )}
    </div>
  </section>;
  return <>
    <button type="button" onClick={() => dialog.current?.showModal()} className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-[10px] font-bold uppercase text-[#0F2A52] hover:bg-blue-100">
      <CalendarDays size={16} /> Agenda do Porto {todayCount > 0 && <span className="rounded-full bg-[#0F2A52] px-2 text-white">{todayCount}</span>}
    </button>
    <dialog ref={dialog} aria-labelledby="agenda-porto-title" className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-md border-0 bg-[#F8FAFC] p-0 text-[#0F2A52] shadow-2xl backdrop:bg-slate-950/40" onClick={event => { if (event.target === dialog.current) dialog.current.close(); }}>
      <div className="min-h-full p-6">
        <div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#F4901E]">Compromissos da unidade</p><h2 id="agenda-porto-title" className="text-2xl font-black">Agenda do Porto</h2></div><button autoFocus aria-label="Fechar agenda" onClick={() => dialog.current?.close()} className="rounded-xl p-2 hover:bg-slate-200"><X /></button></div>
        <label className="block text-sm font-bold">Consultar data<input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white p-3" /></label>
        <button className="my-4 text-sm font-bold text-blue-700" onClick={() => setDate(dataLocal())}>Voltar para hoje</button>
        {agenda.loading ? <p role="status">Carregando agenda…</p> : agenda.error ? <p role="alert" className="text-red-700">{agenda.error}</p> : events.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center"><CalendarDays className="mx-auto mb-3 text-slate-400" /><p className="font-bold">Nenhum compromisso nesta data</p><p className="mt-2 text-sm text-slate-500">Os compromissos publicados pelo Administrativo aparecem aqui.</p></div> : renderEventList(events)}
        
        {futureEvents.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Próximos Eventos</h3>
            {renderEventList(futureEvents, true)}
          </div>
        )}
      </div>
    </dialog>
  </>;
}
