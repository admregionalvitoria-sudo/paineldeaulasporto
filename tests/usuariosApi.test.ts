import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ verificar: vi.fn(), get: vi.fn(), set: vi.fn(), update: vi.fn(), delete: vi.fn(), createUser: vi.fn() }));
vi.mock('../lib/autenticacaoApi.mjs', async original => ({ ...await original<typeof import('../lib/autenticacaoApi.mjs')>(), verificarUsuario: mocks.verificar }));
vi.mock('firebase-admin', () => {
  const ref = { get: mocks.get, set: mocks.set, update: mocks.update, delete: mocks.delete };
  const db = { doc: () => ref, collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ref, get: mocks.get }) }) }) };
  return { default: { apps: [{}], firestore: Object.assign(() => db, { FieldValue: { serverTimestamp: () => 'timestamp' } }), auth: () => ({ createUser: mocks.createUser }) } };
});
import handler from '../api/usuarios.js';
const resposta = () => ({ setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), end: vi.fn() });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.verificar.mockResolvedValue({ uid: 'admin', role: 'admin', email: 'admin@example.com' });
  mocks.get.mockResolvedValue({ data: () => ({ role: 'midia' }) });
  mocks.createUser.mockResolvedValue({ uid: 'novo-uid' });
});
describe('papéis na API de usuários', () => {
  it.each([401, 403])('nega acesso com %s', async status => {
    mocks.verificar.mockRejectedValue(Object.assign(new Error('detalhes internos'), { status }));
    const res = resposta();
    await handler({ method: 'GET', headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(status);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('detalhes internos');
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it.each(['POST', 'PUT'])('valida role no %s', async method => {
    const res = resposta();
    await handler({ method, body: { uid: 'alvo', role: 'inventado' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each(['POST', 'PUT'])('admin não concede super_admin via %s', async method => {
    const res = resposta();
    await handler({ method, body: { uid: 'alvo', role: 'super_admin' } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each(['PUT', 'DELETE'])('admin não altera super_admin via %s', async method => {
    mocks.get.mockResolvedValue({ data: () => ({ role: 'super_admin' }) });
    const res = resposta();
    await handler({ method, body: { uid: 'alvo', ativo: false }, query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mocks.delete).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('super_admin pode criar outro super_admin', async () => {
    mocks.verificar.mockResolvedValue({ uid: 'super', role: 'super_admin', email: 'super@example.com' });
    const res = resposta();
    await handler({ method: 'POST', body: { nome: 'Novo', email: 'novo@example.com', password: 'senha', role: 'super_admin' } }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ role: 'super_admin', ativo: true }));
  });
  it('não expõe erro interno ao criar conta', async () => {
    mocks.createUser.mockRejectedValue(new Error('credencial privada'));
    const res = resposta();
    await handler({ method: 'POST', body: { nome: 'Novo', email: 'novo@example.com', password: 'senha', role: 'admin' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('credencial privada');
  });
});
