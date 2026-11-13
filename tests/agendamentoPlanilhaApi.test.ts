import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn(), enviar: vi.fn(), rest: vi.fn(), autorizar: vi.fn() }));
vi.mock('firebase-admin', () => ({ default: { default: {
  apps: [{}],
  firestore: Object.assign(() => ({ doc: () => ({ get: mocks.get, update: mocks.update }) }),
    { FieldValue: { serverTimestamp: () => 'timestamp' } })
} } }));
vi.mock('../lib/autenticacaoApi.mjs', async importOriginal => ({ ...await importOriginal<typeof import('../lib/autenticacaoApi.mjs')>(), verificarUsuario: mocks.autorizar }));
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
  const dados = { solicitante: ' Maria\u0000 ', emailSolicitante: ' maria@example.com ',
    sala: ' Sala 1 ', data: '12/11/2026', turno: 'Matutino', status: 'pendente', notificarWhatsapp: false };
  it('envia dados saneados sem ler nem escrever Firestore', async () => {
    const res = resposta();
    await handler({ method: 'POST', body: { agendamentoId: 'abc123', dados: { ...dados, role: 'super_admin' } } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.enviar).toHaveBeenCalledWith('abc123', { ...dados, solicitante: 'Maria', emailSolicitante: 'maria@example.com', sala: 'Sala 1' });
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.rest).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.autorizar).not.toHaveBeenCalled();
  });
  it('falha de envio direto não grava diagnóstico no servidor', async () => {
    mocks.enviar.mockRejectedValue(new Error('Planilha: indisponível'));
    const res = resposta();
    await handler({ method: 'POST', body: { agendamentoId: 'abc123', dados } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each([
    null, [], { ...dados, solicitante: 1 }, { ...dados, solicitante: 'x'.repeat(121) },
    { ...dados, emailSolicitante: 'inválido' }, { ...dados, emailSolicitante: 'x'.repeat(161) },
    { ...dados, sala: 'x'.repeat(201) }, { ...dados, motivoRejeicao: 'x'.repeat(501) },
    { ...dados, observacaoDecisao: 'x'.repeat(501) }, { ...dados, status: 'admin' },
    { ...dados, telefoneSolicitante: '123' }, { ...dados, telefoneSolicitante: '1'.repeat(14) },
    { ...dados, notificarWhatsapp: 'true' }, { ...dados, notificarWhatsapp: true },
  ])('rejeita dados inválidos: %j', async valor => {
    const res = resposta();
    await handler({ method: 'POST', body: { agendamentoId: 'abc123', dados: valor } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('inválido') });
    expect(mocks.enviar).not.toHaveBeenCalled();
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it.each(['abc', '../abc123', 'a'.repeat(65), '', 123])('valida ID %s', async agendamentoId => {
    const res = resposta();
    await handler({ method: 'POST', body: { agendamentoId, dados } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('normaliza telefone e preserva consentimento explícito', async () => {
    const res = resposta();
    await handler({ method: 'POST', body: { agendamentoId: 'abc123', dados: { ...dados, notificarWhatsapp: true,
      telefoneSolicitante: '+55 (27) 99999-9999', consentimentoWhatsappTexto: 'LGPD-v1', consentimentoWhatsappEm: '2026-11-13T10:00:00Z' } } }, res);
    expect(mocks.enviar.mock.calls[0][1].telefoneSolicitante).toBe('5527999999999');
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it.each([401, 403])('recusa decisão não autorizada com %i', async status => {
    mocks.autorizar.mockRejectedValue(Object.assign(new Error('Sem acesso'), { status }));
    const res = resposta();
    await handler({ method: 'POST', body: { agendamentoId: 'abc123', dados: { ...dados, status: 'aprovado' } } }, res);
    expect(res.status).toHaveBeenCalledWith(status);
    expect(mocks.enviar).not.toHaveBeenCalled();
  });
  it.each(['aprovado', 'rejeitado'])('exige gestão para %s também no fallback por ID', async status => {
    mocks.get.mockResolvedValue({ exists: true, data: () => ({ status }) });
    mocks.autorizar.mockRejectedValue(Object.assign(new Error('Sem acesso'), { status: 401 }));
    const res = resposta();
    await handler({ method: 'POST', body: { agendamentoId: 'abc123' } }, res);
    expect(mocks.autorizar).toHaveBeenCalledWith(expect.anything(), ['super_admin', 'admin', 'coordenador']);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('envia decisão autorizada', async () => {
    mocks.autorizar.mockResolvedValue({ uid: 'gestor', role: 'admin' });
    const res = resposta();
    await handler({ method: 'POST', headers: { authorization: 'Bearer token' }, body: { agendamentoId: 'abc123', dados: { ...dados, status: 'rejeitado' } } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it('usa apenas o ID do corpo e registra sucesso com Admin', async () => {
    const res = resposta();
    await handler({ method: 'POST', body: { agendamentoId: 'abc123', solicitante: 'Falso' } }, res);
    expect(mocks.enviar).toHaveBeenCalledWith('abc123', { solicitante: 'Do Firestore' });
    expect(mocks.update).toHaveBeenCalledWith({ planilhaSyncErro: null, planilhaSyncEm: 'timestamp' });
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it('usa REST sem tentar atualizar com Admin quando falta credencial', async () => {
    mocks.get.mockRejectedValue(new Error('Could not load the default credentials.'));
    mocks.rest.mockResolvedValue({ solicitante: 'Via REST' });
    const res = resposta();
    await handler({ method: 'POST', body: { agendamentoId: 'abc123' } }, res);
    expect(mocks.rest).toHaveBeenCalledWith('abc123');
    expect(mocks.enviar).toHaveBeenCalledWith('abc123', { solicitante: 'Via REST' });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it.each(['PERMISSION_DENIED', 'Erro genérico de leitura'])('usa REST sem atualizar com Admin após %s', async mensagem => {
    mocks.get.mockRejectedValue(new Error(mensagem));
    mocks.rest.mockResolvedValue({ solicitante: 'Via REST' });
    const res = resposta();
    await handler({ method: 'POST', body: { agendamentoId: 'abc123' } }, res);
    expect(mocks.rest).toHaveBeenCalledWith('abc123');
    expect(mocks.enviar).toHaveBeenCalledWith('abc123', { solicitante: 'Via REST' });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it('não registra diagnóstico com Admin quando o envio falha após fallback', async () => {
    mocks.get.mockRejectedValue(new Error('Erro genérico de leitura'));
    mocks.rest.mockResolvedValue({ solicitante: 'Via REST' });
    mocks.enviar.mockRejectedValue(new Error('Planilha: Token inválido'));
    const res = resposta();
    await handler({ method: 'POST', body: { agendamentoId: 'abc123' } }, res);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Planilha: Token inválido' });
  });
  it('repassa e registra o diagnóstico do Web App', async () => {
    const mensagem = 'Planilha: Token inválido';
    mocks.enviar.mockRejectedValue(new Error(mensagem));
    const res = resposta();
    await handler({ method: 'POST', body: { agendamentoId: 'abc123' } }, res);
    expect(res.json).toHaveBeenCalledWith({ error: mensagem });
    expect(mocks.update).toHaveBeenCalledWith({ planilhaSyncErro: mensagem, planilhaSyncEm: 'timestamp' });
  });
  it('retorna 404 para documento ausente no fallback', async () => {
    mocks.get.mockRejectedValue(new Error('Could not load the default credentials.'));
    mocks.rest.mockResolvedValue(null);
    const res = resposta();
    await handler({ method: 'POST', body: { agendamentoId: 'abc123' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mocks.enviar).not.toHaveBeenCalled();
  });
});
