import { afterEach, describe, expect, it, vi } from 'vitest';
import { verificarUsuario } from '../lib/autenticacaoApi.mjs';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const req = { headers: { authorization: 'Bearer token-firebase' } };
const perfil = (role = 'admin', ativo = true) => ({ fields: { role: { stringValue: role }, ativo: { booleanValue: ativo } } });
function preparar(documento = perfil(), usuario = { localId: 'uid-1', email: 'pessoa@example.com' }, status = 200) {
  const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ users: [usuario] })))
    .mockResolvedValueOnce(new Response(JSON.stringify(documento), { status }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
describe('autenticação REST sem service account', () => {
  it('valida token, perfil e timeout de 10 segundos', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const fetch = preparar();
    await expect(verificarUsuario(req, ['admin'])).resolves.toEqual({ uid: 'uid-1', email: 'pessoa@example.com', role: 'admin' });
    expect(timeout).toHaveBeenCalledWith(10000);
    expect(fetch.mock.calls[0][0]).toContain('identitytoolkit.googleapis.com/v1/accounts:lookup?key=');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ idToken: 'token-firebase' });
    expect(fetch.mock.calls[1][0]).toContain('/porto/dados/usuarios/uid-1?key=');
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer token-firebase');
  });
  it.each(['', 'Basic token', 'Bearer ', 'Bearer a b'])('nega cabeçalho inválido %s', async authorization => {
    const fetch = preparar();
    await expect(verificarUsuario({ headers: { authorization } }, ['admin'])).rejects.toMatchObject({ status: 401 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([400, 401])('nega token expirado ou inválido (%i)', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status })));
    await expect(verificarUsuario(req, ['admin'])).rejects.toMatchObject({ status: 401 });
  });
  it.each([perfil('admin', false), perfil('midia'), perfil('inventado'), { fields: {} }])('nega perfil sem permissão: %j', async documento => {
    preparar(documento);
    await expect(verificarUsuario(req, ['admin'])).rejects.toMatchObject({ status: 403 });
  });
  it('não concede privilégios por e-mail', async () => {
    preparar(perfil('midia'), { localId: 'uid', email: 'admin@senai.br' });
    await expect(verificarUsuario(req, ['admin'])).rejects.toMatchObject({ status: 403 });
  });
  it.each([403, 404])('nega perfil inacessível/ausente (%i)', async status => {
    preparar(perfil(), undefined, status);
    await expect(verificarUsuario(req, ['admin'])).rejects.toMatchObject({ status: 403 });
  });
  it('falha fechada em timeout sem revelar erro interno', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('segredo interno')));
    await expect(verificarUsuario(req, ['admin'])).rejects.toMatchObject({ status: 401, message: 'Não foi possível verificar a autenticação. Tente novamente.' });
  });
});
