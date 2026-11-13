import { describe, expect, it } from 'vitest';
import { CAPACIDADES, Capacidade, papeisCom, pode, telaInicial } from '../utils/permissoes';
import type { UserRole } from '../types';

const perfil = (role: UserRole, ativo = true) => ({ role, ativo });

describe('permissões por perfil', () => {
  it('administrador e super administrador têm tudo', () => {
    for (const capacidade of CAPACIDADES.super_admin) {
      expect(pode(perfil('admin'), capacidade)).toBe(true);
      expect(pode(perfil('super_admin'), capacidade)).toBe(true);
    }
  });

  it('coordenador fica só no pedagógico', () => {
    const permitido: Capacidade[] = ['cronograma', 'historico', 'ambientes', 'solicitacoes', 'alertas', 'agenda'];
    const negado: Capacidade[] = ['midia', 'usuarios', 'logs', 'limpeza', 'administrativo', 'exclusaoEmMassa'];
    for (const capacidade of permitido) expect(pode(perfil('coordenador'), capacidade)).toBe(true);
    for (const capacidade of negado) expect(pode(perfil('coordenador'), capacidade)).toBe(false);
  });

  it('comunicação só mexe em mídia', () => {
    for (const papel of ['comunicacao', 'midia'] as UserRole[]) {
      expect(pode(perfil(papel), 'midia')).toBe(true);
      for (const capacidade of ['cronograma', 'solicitacoes', 'ambientes', 'usuarios', 'logs', 'administrativo'] as Capacidade[]) {
        expect(pode(perfil(papel), capacidade)).toBe(false);
      }
    }
  });

  it('conta inativa, ausente ou com perfil desconhecido não pode nada', () => {
    expect(pode(perfil('admin', false), 'cronograma')).toBe(false);
    expect(pode(null, 'cronograma')).toBe(false);
    expect(pode({ role: 'visitante' as UserRole, ativo: true }, 'cronograma')).toBe(false);
  });

  it('rotas protegidas listam só os perfis com a capacidade', () => {
    expect(papeisCom('midia').sort()).toEqual(['admin', 'comunicacao', 'midia', 'super_admin']);
    expect(papeisCom('usuarios').sort()).toEqual(['admin', 'super_admin']);
    expect(papeisCom('solicitacoes').sort()).toEqual(['admin', 'coordenador', 'super_admin']);
  });

  it('cada perfil abre na sua área', () => {
    expect(telaInicial(perfil('coordenador'))).toBe('admin');
    expect(telaInicial(perfil('admin'))).toBe('admin');
    expect(telaInicial(perfil('comunicacao'))).toBe('midia');
    expect(telaInicial(null)).toBeNull();
  });
});
