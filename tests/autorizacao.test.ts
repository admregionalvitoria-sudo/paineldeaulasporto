import { describe, expect, it } from 'vitest';
import { mensagemErroLogin, perfilAutorizado, permitePapel, SEM_ACESSO } from '../utils/autorizacao';
import type { UserProfile } from '../types';

const perfil: UserProfile = { uid: 'uid', email: 'admin@senai.br', nome: 'Pessoa', ativo: true, role: 'midia' };
describe('sessão e papéis', () => {
  it('cache não concede acesso sem Firebase correspondente', () => {
    expect(perfilAutorizado(undefined, perfil)).toBe(false);
    expect(perfilAutorizado('outro-uid', perfil)).toBe(false);
    expect(perfilAutorizado('uid', perfil)).toBe(true);
  });
  it.each([null, { ...perfil, ativo: false }, { ...perfil, ativo: undefined }, { ...perfil, role: 'inventado' }])('nega perfil ausente, inativo ou inválido %j', valor => {
    expect(perfilAutorizado('uid', valor as UserProfile)).toBe(false);
  });
  it('somente o documento concede o papel, sem exceção por e-mail', () => {
    expect(permitePapel('uid', perfil, ['admin'])).toBe(false);
    expect(permitePapel('uid', { ...perfil, email: 'admregionalvitoria@gmail.com' }, ['admin'])).toBe(false);
    expect(permitePapel('uid', { ...perfil, role: 'super_admin' }, ['admin'])).toBe(true);
  });
  it('não revela a existência de contas nas credenciais inválidas', () => {
    const mensagem = mensagemErroLogin({ code: 'auth/wrong-password' });
    expect(mensagemErroLogin({ code: 'auth/user-not-found' })).toBe(mensagem);
    expect(mensagemErroLogin({ code: 'auth/invalid-credential' })).toBe(mensagem);
    expect(mensagemErroLogin({ message: SEM_ACESSO })).toBe(SEM_ACESSO);
    expect(mensagemErroLogin({ code: 'auth/user-disabled' })).toContain('desativada');
    expect(mensagemErroLogin({ code: 'auth/network-request-failed' })).toContain('Sem conexão');
  });
});
