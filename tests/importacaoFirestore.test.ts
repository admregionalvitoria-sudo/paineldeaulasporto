import React, { useContext } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Aula } from '../types';

const firestore = vi.hoisted(() => ({
  getDocs: vi.fn(), getDoc: vi.fn(), addDoc: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(),
  excluir: vi.fn(), inserir: vi.fn(), atualizar: vi.fn(), commit: vi.fn(),
}));
vi.mock('../firebase', () => ({ db: {}, storage: {}, auth: { currentUser: { uid: 'gestor', email: 'gestor@senai.br', getIdToken: async () => 'token-gestor' } } }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  doc: (...args: unknown[]) => ({ id: args.length === 1 ? 'nova' : args.at(-1), path: typeof args[0] === 'object' && 'path' in args[0]! ? `${(args[0] as { path: string }).path}/nova` : args.slice(1).join('/') }),
  getDocs: firestore.getDocs, getDoc: firestore.getDoc, addDoc: firestore.addDoc, setDoc: firestore.setDoc, updateDoc: firestore.updateDoc,
  writeBatch: () => ({ delete: firestore.excluir, set: firestore.inserir, update: firestore.atualizar, commit: firestore.commit }),
  serverTimestamp: () => 'timestamp', onSnapshot: vi.fn(), query: vi.fn(), orderBy: vi.fn(), deleteDoc: firestore.deleteDoc,
}));
import { DataContext, DataProvider, type ExtendedDataContextType } from '../context/DataContext';

const aula = (patch: Partial<Aula> = {}): Aula => ({
  id: 'a', sala: 'Auditório', data: '11/11/2026', turno: 'Matutino', inicio: '08:00', fim: '10:00',
  turma: 'Turma', instrutor: 'Professor', unidade_curricular: 'UC', ...patch,
});
function sessao() {
  let contexto: ExtendedDataContextType;
  function Captura() { contexto = useContext(DataContext)!; return null; }
  // Renderização sem efeitos: nenhum listener nem acesso ao Firestore real.
  renderToStaticMarkup(React.createElement(DataProvider, null, React.createElement(Captura)));
  return contexto!;
}
function dadosAtuais(aulas: Aula[]) {
  const docs = aulas.map(a => ({ id: a.id, ref: { id: a.id }, data: () => a }));
  firestore.getDocs.mockResolvedValue({ docs, forEach: (callback: (doc: typeof docs[number]) => void) => docs.forEach(callback) });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 11, 23, 59));
  vi.stubGlobal('alert', vi.fn());
  firestore.addDoc.mockResolvedValue({ id: 'nova' });
  firestore.commit.mockResolvedValue(undefined);
  firestore.updateDoc.mockResolvedValue(undefined);
  dadosAtuais([]);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('gravação de aulas e importação', () => {
  it('protege histórico/ajustes e registra IMPORTAR_CSV com os argumentos corretos', async () => {
    dadosAtuais([aula({ id: 'historico', data: '10/11/2026' }), aula({ id: 'ajuste', modificadoManualmente: true }), aula({ id: 'substituir', sala: 'Biblioteca' })]);
    await sessao().updateAulasFromCSV([aula(), aula({ sala: 'Biblioteca' })]);
    expect(firestore.excluir.mock.calls.map(([ref]) => ref.id)).toEqual(['substituir']);
    expect(firestore.inserir).toHaveBeenCalledTimes(1);
    expect(firestore.inserir.mock.calls[0][1]).toMatchObject({ sala: 'Biblioteca', origem: 'csv', modificadoManualmente: false });
    const log = firestore.addDoc.mock.calls.find(([ref]) => ref.path.endsWith('/logs'))?.[1];
    expect(log).toMatchObject({ acao: 'IMPORTAR_CSV', entidadeTipo: 'csv', entidadeId: 'Importacao CSV' });
    expect(alert).toHaveBeenCalledWith(expect.stringContaining('1 aulas com ajustes manuais preservadas'));
  });

  it('uploadCSV passa pela mesma proteção e registra o nome original do arquivo', async () => {
    dadosAtuais([aula({ modificadoManualmente: true })]);
    const arquivo = new File(['Data;Ambiente;Turma;Instrutor;Inicio;Fim\n11/11/2026;Auditório;Nova;Professora;08:00;10:00'], 'aulas.csv');
    // Sem XLSX carregado, usa o parser de texto já existente.
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    try { await sessao().uploadCSV(arquivo); }
    finally { vi.restoreAllMocks(); }
    expect(firestore.excluir).not.toHaveBeenCalled();
    expect(firestore.inserir).not.toHaveBeenCalled();
    expect(firestore.addDoc.mock.calls.find(([ref]) => ref.path.endsWith('/logs'))?.[1])
      .toMatchObject({ acao: 'IMPORTAR_CSV', entidadeTipo: 'csv', entidadeId: 'aulas.csv' });
  });

  it.each(['manual', 'reserva'] as const)('marca aulas criadas por %s como ajustes protegidos', async origem => {
    await sessao().addAula(aula({ origem }));
    expect(firestore.addDoc.mock.calls.find(([ref]) => ref.path.endsWith('/aulas'))?.[1])
      .toMatchObject({ origem, modificadoManualmente: true });
  });

  it('marca edição como manual', async () => {
    await sessao().updateAula('a', { instrutor: 'Alterado' });
    expect(firestore.updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ modificadoManualmente: true }));
  });

  it.each([undefined, '', '   ', 'Observação do gestor'])('aceita aprovação com observação opcional: %s', async observacao => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const contexto = sessao();
    contexto.agendamentos.push({
      id: 'r', sala: 'Auditório', data: '12/11/2026', turno: 'Matutino',
      solicitante: 'Professor', emailSolicitante: 'professor@senai.br',
      notificarWhatsapp: false, status: 'pendente',
    });
    await expect(contexto.aprovarAgendamento('r', false, 'Gestor', observacao)).resolves.toBeUndefined();
    expect(firestore.atualizar).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      status: 'aprovado', observacaoDecisao: observacao?.trim() || '', decididoPor: 'Gestor',
    }));
    expect(firestore.inserir).toHaveBeenCalledWith(expect.objectContaining({ path: 'porto/dados/agendamentosPublicos/r' }), expect.objectContaining({ status: 'aprovado', criarAulaAoAprovar: false }));
    const requisicao = vi.mocked(fetch).mock.calls[0];
    expect(requisicao[1]?.headers).toMatchObject({ Authorization: 'Bearer token-gestor' });
    expect(JSON.parse(requisicao[1]!.body as string).dados).toMatchObject({ status: 'aprovado', solicitante: 'Professor', observacaoDecisao: observacao?.trim() || '' });
  });

  it.each([undefined, '', '   '])('mantém o motivo da recusa obrigatório: %s', async motivo => {
    await expect(sessao().rejeitarAgendamento('r', motivo)).rejects.toThrow('O motivo da recusa é obrigatório.');
    expect(firestore.updateDoc).not.toHaveBeenCalled();
  });

  it('cria reserva e espelho no mesmo batch sem copiar contato ou motivo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    await expect(sessao().solicitarAgendamento({
      sala: 'Sala 1', data: '12/11/2026', turno: 'Vespertino',
      solicitante: 'Professor', emailSolicitante: 'professor@senai.br',
      notificarWhatsapp: false, motivo: 'Privado', turma: 'T',
    })).resolves.toBe('nova');
    const escritas = firestore.inserir.mock.calls;
    expect(escritas.map(([ref]) => ref.path)).toEqual(['porto/dados/agendamentos/nova', 'porto/dados/agendamentosPublicos/nova']);
    expect(escritas[1][1]).toMatchObject({ sala: escritas[0][1].sala, status: 'pendente', turma: 'T', atualizadoEm: 'timestamp' });
    expect(escritas[1][1]).not.toHaveProperty('solicitante');
    expect(escritas[1][1]).not.toHaveProperty('emailSolicitante');
    expect(escritas[1][1]).not.toHaveProperty('motivo');
    expect(firestore.commit).toHaveBeenCalledTimes(1);
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).dados).toMatchObject({ status: 'pendente', emailSolicitante: 'professor@senai.br' });
  });

  it('recusa com fallback getDoc e conserva os campos públicos da reserva', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    firestore.getDoc.mockResolvedValue({ exists: () => true, id: 'r', data: () => ({
      sala: 'Sala 2', data: '12/11/2026', turno: 'Noturno', turma: 'T',
      solicitante: 'Pessoa', status: 'pendente', criarAulaAoAprovar: false,
    }) });
    await sessao().rejeitarAgendamento('r', 'Motivo privado');
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).dados).toMatchObject({ status: 'rejeitado', motivoRejeicao: 'Motivo privado', solicitante: 'Pessoa' });
    expect(firestore.getDoc).toHaveBeenCalledTimes(1);
    expect(firestore.inserir).toHaveBeenCalledWith(expect.objectContaining({ path: 'porto/dados/agendamentosPublicos/r' }), {
      sala: 'Sala 2', data: '12/11/2026', turno: 'Noturno', turma: 'T', status: 'rejeitado',
      horarioInicio: '', horarioFim: '', criarAulaAoAprovar: false, atualizadoEm: 'timestamp',
    });
  });

  it('aprova com fallback getDoc quando o estado ainda não carregou', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    firestore.getDoc.mockResolvedValue({ exists: () => true, id: 'r', data: () => ({
      sala: 'Sala 2', data: '12/11/2026', turno: 'Noturno', solicitante: 'Pessoa', status: 'pendente',
    }) });
    await sessao().aprovarAgendamento('r', false);
    expect(firestore.getDoc).toHaveBeenCalledTimes(1);
    expect(firestore.inserir.mock.calls[0][1]).toMatchObject({ sala: 'Sala 2', status: 'aprovado' });
  });

  it('exclui reserva e espelho juntos, buscando o documento fora do estado', async () => {
    firestore.getDoc.mockResolvedValue({ exists: () => true, id: 'r', data: () => ({ sala: 'Sala 2' }) });
    await sessao().excluirAgendamento('r');
    expect(firestore.getDoc).toHaveBeenCalledTimes(1);
    expect(firestore.excluir.mock.calls.map(([ref]) => ref.path)).toEqual(['porto/dados/agendamentos/r', 'porto/dados/agendamentosPublicos/r']);
    expect(firestore.commit).toHaveBeenCalledTimes(1);
  });

  it('preserva operação principal se o batch com espelho falhar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    firestore.commit.mockRejectedValueOnce(new Error('Falha do espelho'));
    const contexto = sessao();
    contexto.agendamentos.push({ id: 'r', sala: 'Sala 2', data: '12/11/2026', turno: 'Noturno',
      solicitante: 'Pessoa', emailSolicitante: 'pessoa@senai.br', notificarWhatsapp: false, status: 'pendente' });
    try {
      await expect(contexto.aprovarAgendamento('r', false)).resolves.toBeUndefined();
      expect(aviso).toHaveBeenCalledTimes(1);
      expect(firestore.updateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'porto/dados/agendamentos/r' }), expect.objectContaining({ status: 'aprovado' }));
    } finally { aviso.mockRestore(); }
  });

  it('rejeita CSV só histórico antes de iniciar exclusões', async () => {
    await expect(sessao().updateAulasFromCSV([aula({ data: '10/11/2026' })])).rejects.toThrow('não contém');
    expect(firestore.excluir).not.toHaveBeenCalled();
    expect(firestore.inserir).not.toHaveBeenCalled();
  });
});
