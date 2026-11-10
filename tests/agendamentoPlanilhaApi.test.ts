import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn(), enviar: vi.fn(), rest: vi.fn() }));
vi.mock('firebase-admin', () => ({ default: {
  apps: [{}],
  firestore: Object.assign(() => ({ doc: () => ({ get: mocks.get, update: mocks.update }) }),
    { FieldValue: { serverTimestamp: () => 'timestamp' } })
} }));
vi.mock('../lib/agendamentoSheets.mjs', () => ({ enviarParaPlanilha: mocks.enviar }));
vi.mock('../lib/agendamentoFirestore.mjs', async importOriginal => ({
  ...await importOriginal<typeof import('../lib/agendamentoFirestore.mjs')>(), lerAgendamentoRest: mocks.rest
}));
import handler from '../api/agendamento-planilha.js';

function resposta() {
  return { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), end: vi.fn() };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.get.mockResolvedValue({ exists: true, data: () => ({ solicitante: 'Do Firestore' }) });
  mocks.update.mockResolvedValue(undefined);
  mocks.enviar.mockResolvedValue({ ok: true, linha: 2 });
});
afterEach(() => vi.restoreAllMocks());

describe('endpoint da planilha', () => {
  it('usa apenas o ID do corpo e registra sucesso com Admin', async () => {
    const res = resposta();
    await handler({ method: 'POST', body: { agendamentoId: 'abc', solicitante: 'Falso' } }, res);
    expect(mocks.enviar).toHaveBeenCalledWith('abc', { solicitante: 'Do Firestore' });
    expect(mocks.update).toHaveBeenCalledWith({ planilhaSyncErro: null, planilhaSyncEm: 'timestamp' });
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it('usa REST sem tentar atualizar com Admin quando falta credencial', async () => {
    mocks.get.mockRejectedValue(new Error('Could not load the default credentials.'));
    mocks.rest.mockResolvedValue({ solicitante: 'Via REST' });
    const res = resposta();
    await handler({ method: 'POST', body: { agendamentoId: 'abc' } }, res);
    expect(mocks.rest).toHaveBeenCalledWith('abc');
    expect(mocks.enviar).toHaveBeenCalledWith('abc', { solicitante: 'Via REST' });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it('não usa fallback por erro de permissão', async () => {
    mocks.get.mockRejectedValue(new Error('PERMISSION_DENIED'));
    const res = resposta();
    await handler({ method: 'POST', body: { agendamentoId: 'abc' } }, res);
    expect(mocks.rest).not.toHaveBeenCalled();
    expect(mocks.enviar).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
  it('repassa e registra o diagnóstico do Web App', async () => {
    const mensagem = 'Planilha: Token inválido';
    mocks.enviar.mockRejectedValue(new Error(mensagem));
    const res = resposta();
    await handler({ method: 'POST', body: { agendamentoId: 'abc' } }, res);
    expect(res.json).toHaveBeenCalledWith({ error: mensagem });
    expect(mocks.update).toHaveBeenCalledWith({ planilhaSyncErro: mensagem, planilhaSyncEm: 'timestamp' });
  });
  it('retorna 404 para documento ausente no fallback', async () => {
    mocks.get.mockRejectedValue(new Error('Could not load the default credentials.'));
    mocks.rest.mockResolvedValue(null);
    const res = resposta();
    await handler({ method: 'POST', body: { agendamentoId: 'abc' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mocks.enviar).not.toHaveBeenCalled();
  });
});
