import type { UserProfile, UserRole } from '../types';

/**
 * O que cada perfil pode fazer na gestão.
 * - Administrador: tudo.
 * - Coordenador: só o pedagógico (horários, salas e reservas).
 * - Comunicação: só mídias.
 */
export type Capacidade =
  | 'cronograma'      // ver e alterar aulas, importar planilha
  | 'historico'       // consultar aulas passadas
  | 'ambientes'       // cadastro de salas e manutenção
  | 'solicitacoes'    // aprovar e recusar reservas
  | 'alertas'         // ler alertas enviados ao pedagógico
  | 'agenda'          // consultar a Agenda do Porto
  | 'limpeza'         // observações e prioridades de limpeza
  | 'administrativo'  // editar agenda, prioridades e enviar alertas
  | 'midia'           // carrossel das TVs e painel do cliente
  | 'usuarios'        // contas e perfis
  | 'logs'            // auditoria
  | 'exclusaoEmMassa'; // limpar cronograma ou histórico

const PEDAGOGICO: Capacidade[] = ['cronograma', 'historico', 'ambientes', 'solicitacoes', 'alertas', 'agenda'];
const TUDO: Capacidade[] = [...PEDAGOGICO, 'limpeza', 'administrativo', 'midia', 'usuarios', 'logs', 'exclusaoEmMassa'];

export const CAPACIDADES: Record<UserRole, readonly Capacidade[]> = {
  super_admin: TUDO,
  admin: TUDO,
  coordenador: PEDAGOGICO,
  comunicacao: ['midia', 'agenda'],
  // Perfil antigo, tratado como Comunicação.
  midia: ['midia', 'agenda'],
};

export const ROTULO_PAPEL: Record<UserRole, string> = {
  super_admin: 'Super administrador',
  admin: 'Administrador',
  coordenador: 'Coordenador pedagógico',
  comunicacao: 'Comunicação',
  midia: 'Comunicação',
};

export function pode(perfil: Pick<UserProfile, 'role' | 'ativo'> | null | undefined, capacidade: Capacidade): boolean {
  if (!perfil || perfil.ativo !== true) return false;
  return (CAPACIDADES[perfil.role] || []).includes(capacidade);
}

/** Perfis que têm a capacidade, para rotas protegidas. */
export function papeisCom(capacidade: Capacidade): UserRole[] {
  return (Object.keys(CAPACIDADES) as UserRole[]).filter(papel => CAPACIDADES[papel].includes(capacidade));
}

/** Primeira tela de gestão que o perfil pode abrir. */
export function telaInicial(perfil: Pick<UserProfile, 'role' | 'ativo'> | null | undefined): 'admin' | 'midia' | null {
  if (pode(perfil, 'cronograma')) return 'admin';
  if (pode(perfil, 'midia')) return 'midia';
  return null;
}
