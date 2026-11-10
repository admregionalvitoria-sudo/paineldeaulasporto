import { afterEach, describe, expect, it, vi } from 'vitest';
import { JWT } from 'google-auth-library';
import { criarClienteSheets } from '../lib/agendamentoSheets.mjs';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('cliente Sheets', () => {
  it('adiciona com POST append em A:G e OVERWRITE e atualiza com PUT na faixa indicada', async () => {
    vi.stubEnv('GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY', JSON.stringify({ client_email: 'teste@example.com', private_key: 'teste' }));
    vi.stubEnv('AGENDAMENTO_SHEET_ID', 'planilha-teste');
    vi.stubEnv('AGENDAMENTO_SHEET_TAB', "Agenda d'aulas");
    vi.spyOn(JWT.prototype, 'getAccessToken').mockResolvedValue({ token: 'token-teste' });
    const requisitar = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', requisitar);
    const cliente = await criarClienteSheets();
    const values = [['novo', 'Maria', '', '', 'Pendente', '', 'Sala 1']];

    await cliente.adicionar(values);
    await cliente.escrever('A3:G3', values);

    const base = 'https://sheets.googleapis.com/v4/spreadsheets/planilha-teste/values/';
    expect(requisitar).toHaveBeenCalledTimes(2);
    expect(requisitar).toHaveBeenNthCalledWith(1,
      `${base}${encodeURIComponent("'Agenda d''aulas'!A:G")}:append?valueInputOption=RAW&insertDataOption=OVERWRITE`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ values }) }));
    expect(requisitar).toHaveBeenNthCalledWith(2,
      `${base}${encodeURIComponent("'Agenda d''aulas'!A3:G3")}?valueInputOption=RAW`,
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ values }) }));
  });
});
