import { afterEach, describe, expect, it, vi } from 'vitest';
import { converterCamposFirestore, erroDeCredencial, lerAgendamentoRest } from '../lib/agendamentoFirestore.mjs';
import config from '../firebase-applet-config.json';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('Firestore REST', () => {
  it('converte campos preservando false, vazio, zero, null e timestamp ISO', () => {
    expect(converterCamposFirestore({ nome: { stringValue: 'Maria' }, vazio: { stringValue: '' },
      notificarWhatsapp: { booleanValue: false }, criadoEm: { timestampValue: '2026-11-10T12:00:00Z' },
      quantidade: { integerValue: '42' }, zero: { integerValue: '0' }, ausente: { nullValue: null }
    })).toEqual({ nome: 'Maria', vazio: '', notificarWhatsapp: false,
      criadoEm: '2026-11-10T12:00:00Z', quantidade: 42, zero: 0, ausente: null });
    expect(converterCamposFirestore()).toEqual({});
  });
  it.each(['chave-env', ''])('usa a chave configurada ou do arquivo: %s', async chave => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', chave);
    const requisitar = vi.fn().mockResolvedValue(new Response(JSON.stringify({ fields: { solicitante: { stringValue: 'Maria' } } })));
    vi.stubGlobal('fetch', requisitar);
    await expect(lerAgendamentoRest('id com espaço')).resolves.toEqual({ solicitante: 'Maria' });
    expect(requisitar).toHaveBeenCalledWith(
      `https://firestore.googleapis.com/v1/projects/paineldeaulas-e34da/databases/(default)/documents/porto/dados/agendamentos/id%20com%20espa%C3%A7o?key=${chave || config.apiKey}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });
  it('distingue documento ausente de acesso negado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('', { status: 404 })).mockResolvedValueOnce(new Response('', { status: 403 })));
    await expect(lerAgendamentoRest('1')).resolves.toBeNull();
    await expect(lerAgendamentoRest('1')).rejects.toThrow('Firestore: HTTP 403');
  });
  it('reconhece falta de credencial sem mascarar erros de permissão e rede', () => {
    expect(erroDeCredencial(new Error('Could not load the default credentials.'))).toBe(true);
    expect(erroDeCredencial({ code: 'app/invalid-credential' })).toBe(true);
    expect(erroDeCredencial(new Error('PERMISSION_DENIED'))).toBe(false);
    expect(erroDeCredencial(new Error('UNAVAILABLE'))).toBe(false);
  });
});
