import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enviarParaPlanilha } from '../lib/agendamentoSheets.mjs';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
beforeEach(() => {
  vi.stubEnv('SHEETS_WEBHOOK_URL', 'https://script.google.com/macros/s/teste/exec');
  vi.stubEnv('SHEETS_WEBHOOK_TOKEN', 'segredo-teste');
});

describe('Web App da planilha', () => {
  it('envia as sete colunas, token e timeout usando redirects padrão', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const requisitar = vi.fn().mockResolvedValue(new Response('{"ok":true,"linha":4}'));
    vi.stubGlobal('fetch', requisitar);
    await expect(enviarParaPlanilha('abc', { solicitante: 'Maria', emailSolicitante: 'maria@example.com',
      notificarWhatsapp: true, telefoneSolicitante: '(27) 99999-9999', status: 'rejeitado', motivoRejeicao: 'Reforma',
      sala: 'Sala 1', data: '2026-11-10', turno: 'Noturno', horarioInicio: '18:30', horarioFim: '19:20'
    })).resolves.toEqual({ ok: true, linha: 4 });
    const [url, opcoes] = requisitar.mock.calls[0];
    expect(url).toBe('https://script.google.com/macros/s/teste/exec');
    expect(opcoes.method).toBe('POST');
    expect(opcoes.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(opcoes.redirect).toBeUndefined();
    expect(timeout).toHaveBeenCalledWith(30000);
    expect(JSON.parse(opcoes.body)).toEqual({ token: 'segredo-teste', linha: {
      ID: 'abc', Nome: 'Maria', Telefone: '5527999999999', 'E-mail': 'maria@example.com',
      Status: 'Negado', Motivo: 'Reforma', 'Sala / Data': 'Sala 1 — 2026-11-10 (Noturno 18:30-19:20)'
    } });
  });
  it.each(['SHEETS_WEBHOOK_URL', 'SHEETS_WEBHOOK_TOKEN'])('exige %s', async variavel => {
    vi.stubEnv(variavel, '');
    const requisitar = vi.fn(); vi.stubGlobal('fetch', requisitar);
    await expect(enviarParaPlanilha('1', {})).rejects.toThrow('Planilha não configurada (SHEETS_WEBHOOK_URL/SHEETS_WEBHOOK_TOKEN)');
    expect(requisitar).not.toHaveBeenCalled();
  });
  it.each([
    ['{"ok":false,"erro":"Token inválido"}', 200, 'application/json', 'Planilha: Token inválido'],
    ['{"ok":"true"}', 200, 'application/json', 'Planilha: resposta inválida do Web App'],
    ['null', 200, 'application/json', 'Planilha: resposta inválida do Web App'],
    ['texto', 200, 'text/plain', 'Planilha: resposta não-JSON do Web App'],
    ['<html>Login</html>', 200, 'text/html', 'Planilha: acesso negado ao Web App (verifique implantação "Qualquer pessoa")'],
    [' <!doctype html><html>Login</html>', 200, 'text/plain', 'Planilha: acesso negado ao Web App'],
    ['Forbidden', 403, 'text/plain', 'Planilha: acesso negado ao Web App'],
    ['{"ok":true}', 500, 'application/json', 'Planilha: HTTP 500'],
    ['{"ok":false,"erro":"segredo-teste"}', 200, 'application/json', 'Planilha: [segredo]']
  ])('trata %s / HTTP %s', async (body, status, tipo, erro) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status, headers: { 'Content-Type': tipo } })));
    await expect(enviarParaPlanilha('1', {})).rejects.toThrow(erro);
  });
});
