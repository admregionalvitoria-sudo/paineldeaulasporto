import type { UserProfile, UserRole } from '../types';

export const PAPEIS_VALIDOS: UserRole[] = ['super_admin', 'admin', 'coordenador', 'comunicacao', 'midia'];
export const SEM_ACESSO = 'Conta sem acesso liberado. Procure um administrador.';

export function perfilAutorizado(uid: string | undefined, perfil: Partial<UserProfile> | null | undefined): perfil is UserProfile {
  return !!uid && perfil?.uid === uid && perfil.ativo === true && PAPEIS_VALIDOS.includes(perfil.role!);
}

export function permitePapel(uid: string | undefined, perfil: UserProfile | null, papeis: UserRole[]) {
  return perfilAutorizado(uid, perfil) && (perfil.role === 'super_admin' || papeis.includes(perfil.role));
}

export function mensagemErroLogin(erro: { code?: string; message?: string }) {
  if (erro.message === SEM_ACESSO) return SEM_ACESSO;
  if (erro.code === 'auth/user-disabled') return 'Conta desativada. Procure um administrador.';
  if (erro.code === 'auth/network-request-failed' || erro.code === 'unavailable') return 'Sem conexão. Verifique sua internet e tente novamente.';
  if (erro.code === 'resource-exhausted') return 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.';
  if (erro.code === 'auth/too-many-requests') return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
  return 'Não foi possível entrar. Verifique suas credenciais e tente novamente.';
}
