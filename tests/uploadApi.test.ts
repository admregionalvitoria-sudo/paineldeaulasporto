import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ put: vi.fn(), del: vi.fn(), verificar: vi.fn(), handle: vi.fn() }));
vi.mock('@vercel/blob', () => ({ put: mocks.put, del: mocks.del }));
vi.mock('@vercel/blob/client', () => ({ handleUpload: mocks.handle }));
vi.mock('../lib/autenticacaoApi.mjs', () => ({ verificarUsuario: mocks.verificar }));
import handler from '../api/upload.js';
const resposta = () => ({ setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), end: vi.fn() });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.verificar.mockImplementation(async req => {
    if (!req.headers?.authorization) throw Object.assign(new Error('Autenticação necessária.'), { status: 401 });
    if (req.headers.authorization === 'Bearer proibido') throw Object.assign(new Error('Sem permissão.'), { status: 403 });
    return { uid: 'uid', role: 'midia' };
  });
  mocks.handle.mockImplementation(async options => {
    if (options.body.type === 'blob.upload-completed') {
      await options.onUploadCompleted({ blob: { url: 'https://blob/arquivo' }, tokenPayload: '{}' });
      return { ok: true };
    }
    return options.onBeforeGenerateToken('arquivo.mp4', options.body.payload?.clientPayload);
  });
});
describe('autorização de mídias', () => {
  it.each(['DELETE', 'POST'])('nega %s sem autenticação antes de acessar blobs', async method => {
    const res = resposta();
    await handler({ method, query: { url: 'https://blob/arquivo' }, headers: { 'content-type': 'video/mp4' } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.del).not.toHaveBeenCalled();
  });
  it.each(['DELETE', 'POST'])('nega %s sem papel permitido', async method => {
    const res = resposta();
    await handler({ method, query: {}, headers: { authorization: 'Bearer proibido' } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
  it('exclui blob autorizado com papéis explícitos', async () => {
    const res = resposta();
    await handler({ method: 'DELETE', query: { url: 'https://blob/arquivo' }, headers: { authorization: 'Bearer token' } }, res);
    expect(mocks.verificar).toHaveBeenCalledWith(expect.anything(), ['super_admin', 'admin', 'comunicacao', 'midia']);
    expect(mocks.del).toHaveBeenCalledWith('https://blob/arquivo', expect.anything());
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it.each([undefined, 'inválido', '{}', '{"idToken":"proibido"}'])('nega geração de token com clientPayload %s', async clientPayload => {
    const res = resposta();
    await handler({ method: 'POST', headers: { 'content-type': 'application/json' }, body: { type: 'blob.generate-client-token', payload: { clientPayload } } }, res);
    expect(res.status).toHaveBeenCalledWith(clientPayload?.includes('proibido') ? 403 : 401);
  });
  it('verifica idToken no clientPayload antes de gerar autorização', async () => {
    const res = resposta();
    await handler({ method: 'POST', headers: { 'content-type': 'application/json' }, body: { type: 'blob.generate-client-token', payload: { clientPayload: JSON.stringify({ idToken: 'token' }) } } }, res);
    expect(mocks.verificar.mock.calls[0][0]).toEqual({ headers: { authorization: 'Bearer token' } });
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it('preserva callback de conclusão da Vercel sem token de usuário', async () => {
    const res = resposta();
    await handler({ method: 'POST', headers: { 'content-type': 'application/json' }, body: { type: 'blob.upload-completed' } }, res);
    expect(mocks.verificar).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
