import React, { useContext, useState } from 'react';
import { ArrowLeft, Brush, CalendarDays, Check, Pencil, Plus, Trash2, Bell } from 'lucide-react';
import { DataContext } from '../context/DataContext';
import { useAdministrativo } from '../hooks/useAdministrativo';
import { CompromissoPorto, dataLocal, pesoPrioridade, PrioridadeLimpeza, validarCompromisso } from '../utils/administrativo';
import AgendaPorto from './AgendaPorto';
import AlertasManagementSection from './AlertasManagementSection';

const input = 'mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold hover:bg-slate-50 disabled:opacity-50';
const emptyCleaning = (): Omit<PrioridadeLimpeza, 'id'> => ({ sala: '', data: dataLocal(), prioridade: 'normal', observacao: '', concluida: false });
const emptyEvent = (): Omit<CompromissoPorto, 'id'> => ({ titulo: '', data: dataLocal(), inicio: '08:00', fim: '09:00', local: '', descricao: '' });

export default function AdministrativoScreen({ onNavigate }: { onNavigate: (route: string) => void }) {
  const context = useContext(DataContext);
  const cleaning = useAdministrativo<PrioridadeLimpeza>('prioridadesLimpeza');
  const agenda = useAdministrativo<CompromissoPorto>('agendaPorto');
  const [tab, setTab] = useState<'limpeza' | 'agenda' | 'alertas'>('limpeza');
  const [date, setDate] = useState(dataLocal());
  const [cleaningForm, setCleaningForm] = useState(emptyCleaning);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [editor, setEditor] = useState<{ id?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const selected = tab === 'limpeza' ? cleaning : tab === 'agenda' ? agenda : null;
  const rooms = context?.salasCadastradas || [];
  const priorities = cleaning.items.filter(item => item.data === date).sort((a, b) => Number(a.concluida) - Number(b.concluida) || pesoPrioridade[a.prioridade] - pesoPrioridade[b.prioridade]);
  const events = agenda.items.filter(item => item.data === date).sort((a, b) => a.inicio.localeCompare(b.inicio));
  async function execute(action: () => Promise<void>, success: string) {
    setBusy(true); setFailure(''); setMessage('');
    try { await action(); setMessage(success); setEditor(null); }
    catch (error) { setFailure(error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente.'); }
    finally { setBusy(false); }
  }
  function create() {
    setCleaningForm({ ...emptyCleaning(), data: date || dataLocal() });
    setEventForm({ ...emptyEvent(), data: date || dataLocal() });
    setFailure(''); setMessage(''); setEditor({});
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    void execute(async () => {
      if (tab === 'limpeza') {
        if (!rooms.includes(cleaningForm.sala) || !cleaningForm.data) throw new Error('Selecione um ambiente cadastrado e a data.');
        await cleaning.save(cleaningForm, editor?.id);
      } else {
        validarCompromisso(eventForm);
        await agenda.save({ ...eventForm, titulo: eventForm.titulo.trim(), local: eventForm.local.trim(), descricao: eventForm.descricao.trim() }, editor?.id);
      }
    }, tab === 'limpeza' ? 'Prioridade salva e enviada ao painel de limpeza.' : 'Compromisso publicado na Agenda do Porto.');
  }
  return <main className="min-h-screen bg-[#EDF1F6] p-4 font-sans text-[#0F2A52] sm:p-8">
    <header className="mx-auto mb-6 flex max-w-[1600px] flex-wrap items-center justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4"><button className={button} aria-label="Voltar ao admin" onClick={() => onNavigate('admin')}><ArrowLeft size={18} /></button><div><p className="text-[10px] font-black uppercase tracking-[.25em] text-[#F4901E]">SENAI • PORTO</p><h1 className="text-3xl font-black">Administrativo</h1><p className="mt-1 text-sm text-slate-500">Organize a limpeza e os compromissos da unidade.</p></div></div>
      <div className="flex flex-wrap gap-2"><AgendaPorto /><button className={button} onClick={() => onNavigate('limpeza')}><Brush size={16} /> Painel de limpeza</button></div>
    </header>
    <section className="mx-auto max-w-[1600px] rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5"><div className="flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1" role="tablist" aria-label="Gestão administrativa">{(['limpeza', 'agenda', 'alertas'] as const).map(value => <button key={value} role="tab" aria-selected={tab === value} disabled={busy} onClick={() => { setTab(value); setEditor(null); setMessage(''); setFailure(''); }} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold ${tab === value ? 'bg-white shadow-sm' : 'text-slate-500'}`}>{value === 'limpeza' ? <Brush size={16} /> : value === 'agenda' ? <CalendarDays size={16} /> : <Bell size={16} />}{value === 'limpeza' ? 'Prioridades de limpeza' : value === 'agenda' ? 'Agenda do Porto' : 'Alertas'}</button>)}</div>{tab !== 'alertas' && <button disabled={busy} onClick={create} className="flex items-center gap-2 rounded-xl bg-[#F4901E] px-5 py-3 text-xs font-bold text-white hover:bg-orange-600"><Plus size={16} />{tab === 'limpeza' ? 'Nova prioridade' : 'Novo compromisso'}</button>}</div>
      {tab !== 'alertas' && <div className="my-5 flex flex-wrap items-end justify-between gap-4"><label className="text-xs font-bold">Consultar data<input type="date" value={date} onChange={e => setDate(e.target.value)} className={input} /></label><p className="text-sm text-slate-500">{tab === 'limpeza' ? `${priorities.filter(item => !item.concluida).length} pendentes · ${priorities.filter(item => item.concluida).length} concluídas` : `${events.length} compromissos · Visível para coordenador, mídia e admin`}</p></div>}
      {tab === 'alertas' && <div className="mt-5"><AlertasManagementSection /></div>}
      {tab !== 'alertas' && selected && (failure || selected.error) && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{failure || selected.error}</p>}
      {tab !== 'alertas' && message && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
      {tab !== 'alertas' && editor && <form onSubmit={submit} className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/40 p-5"><h2 className="mb-4 text-lg font-bold">{editor.id ? 'Editar' : 'Adicionar'} {tab === 'limpeza' ? 'prioridade' : 'compromisso'}</h2><fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tab === 'limpeza' ? <>
          <label className="text-xs font-bold sm:col-span-2">Ambiente<select required value={cleaningForm.sala} onChange={e => setCleaningForm({ ...cleaningForm, sala: e.target.value })} className={input}><option value="">Selecione uma sala</option>{rooms.map(room => <option key={room}>{room}</option>)}</select></label>
          <label className="text-xs font-bold">Prioridade<select value={cleaningForm.prioridade} onChange={e => setCleaningForm({ ...cleaningForm, prioridade: e.target.value as PrioridadeLimpeza['prioridade'] })} className={input}><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></label>
          <label className="text-xs font-bold">Data da limpeza<input required type="date" value={cleaningForm.data} onChange={e => setCleaningForm({ ...cleaningForm, data: e.target.value })} className={input} /></label>
          <label className="text-xs font-bold sm:col-span-2">Orientações<textarea maxLength={1000} value={cleaningForm.observacao} onChange={e => setCleaningForm({ ...cleaningForm, observacao: e.target.value })} className={input} placeholder="Ex.: preparar a sala antes da reunião." /></label>
        </> : <>
          <label className="text-xs font-bold sm:col-span-2">Título<input required maxLength={160} value={eventForm.titulo} onChange={e => setEventForm({ ...eventForm, titulo: e.target.value })} className={input} /></label>
          <label className="text-xs font-bold">Data<input required type="date" value={eventForm.data} onChange={e => setEventForm({ ...eventForm, data: e.target.value })} className={input} /></label>
          <label className="text-xs font-bold">Início<input required type="time" value={eventForm.inicio} onChange={e => setEventForm({ ...eventForm, inicio: e.target.value })} className={input} /></label>
          <label className="text-xs font-bold">Término<input required type="time" value={eventForm.fim} onChange={e => setEventForm({ ...eventForm, fim: e.target.value })} className={input} /></label>
          <label className="text-xs font-bold">Local<input maxLength={200} value={eventForm.local} onChange={e => setEventForm({ ...eventForm, local: e.target.value })} className={input} /></label>
          <label className="text-xs font-bold sm:col-span-2 lg:col-span-3">Descrição<textarea maxLength={2000} value={eventForm.descricao} onChange={e => setEventForm({ ...eventForm, descricao: e.target.value })} className={input} /></label>
        </>}
        <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><button type="submit" className={`${button} !bg-[#0F2A52] !text-white`}>{busy ? 'Salvando…' : 'Salvar e publicar'}</button><button type="button" onClick={() => setEditor(null)} className={button}>Cancelar</button></div>
      </fieldset></form>}
      {tab !== 'alertas' && selected && (selected.loading ? <p role="status" className="py-10 text-center">Carregando…</p> : !selected.error && (tab === 'limpeza' ? priorities.length : events.length) === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 py-14 text-center"><CalendarDays className="mx-auto mb-3 text-slate-400" /><h2 className="font-bold">{tab === 'limpeza' ? 'Nenhuma prioridade nesta data' : 'Nenhum compromisso nesta data'}</h2><p className="mt-2 text-sm text-slate-500">Use o botão acima para adicionar o primeiro item.</p></div> : <div className="space-y-3">
        {tab === 'limpeza' ? priorities.map(item => <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-5"><div className="min-w-0 flex-1"><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${item.concluida ? 'bg-emerald-50 text-emerald-700' : item.prioridade === 'urgente' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{item.concluida ? 'Concluída' : item.prioridade}</span><h3 className="mt-2 break-words font-bold">{item.sala}</h3><p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-500">{item.observacao || 'Sem orientações adicionais.'}</p></div><div className="flex flex-wrap gap-2"><button disabled={busy} className={button} onClick={() => { const { id, ...value } = item; void execute(() => cleaning.save({ ...value, concluida: !item.concluida }, id), item.concluida ? 'Prioridade reaberta.' : 'Limpeza concluída.'); }}><Check size={15} />{item.concluida ? 'Reabrir' : 'Concluir'}</button><button disabled={busy} className={button} aria-label={`Editar prioridade de ${item.sala}`} onClick={() => { setCleaningForm(item); setEditor({ id: item.id }); }}><Pencil size={15} /></button><button disabled={busy} className={`${button} text-red-600`} aria-label={`Excluir prioridade de ${item.sala}`} onClick={() => { if (window.confirm(`Excluir a prioridade de ${item.sala}?`)) void execute(() => cleaning.remove(item.id), 'Prioridade excluída.'); }}><Trash2 size={15} /></button></div></article>) : events.map(item => <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-5"><div className="min-w-0 flex-1"><p className="text-xs font-bold text-blue-700">{item.inicio} — {item.fim}</p><h3 className="mt-1 break-words font-bold">{item.titulo}</h3><p className="text-sm text-slate-500">{item.local}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-500">{item.descricao}</p></div><div className="flex gap-2"><button disabled={busy} className={button} aria-label={`Editar ${item.titulo}`} onClick={() => { setEventForm(item); setEditor({ id: item.id }); }}><Pencil size={15} /></button><button disabled={busy} className={`${button} text-red-600`} aria-label={`Excluir ${item.titulo}`} onClick={() => { if (window.confirm(`Excluir o compromisso ${item.titulo}?`)) void execute(() => agenda.remove(item.id), 'Compromisso excluído.'); }}><Trash2 size={15} /></button></div></article>)}
      </div>)}
    </section>
  </main>;
}
