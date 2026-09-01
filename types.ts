
export type UserRole = 'super_admin' | 'admin' | 'midia';

export interface UserProfile {
  uid: string;
  email: string;
  nome: string;
  role: UserRole;
  ativo: boolean;
  criadoEm?: any;
  criadoPor?: string;
}

export interface Ambiente {
  id: string;
  nome: string; // Ex: "SALA 05", "LAB 08"
  tipo?: 'sala' | 'laboratorio' | 'auditorio' | 'oficina' | 'outro';
  ativo: boolean;
  criadoPor?: string;
  criadoEm?: any;
  atualizadoEm?: any;
}

export type AuditAction = 
  | 'APROVAR_AGENDAMENTO'
  | 'REJEITAR_AGENDAMENTO'
  | 'EXCLUIR_AGENDAMENTO'
  | 'CRIAR_AULA'
  | 'EDITAR_AULA'
  | 'EXCLUIR_AULA'
  | 'IMPORTAR_CSV'
  | 'UPLOAD_MIDIA'
  | 'EXCLUIR_MIDIA'
  | 'REORDENAR_MIDIA'
  | 'CRIAR_USUARIO'
  | 'DESATIVAR_USUARIO'
  | 'CRIAR_AMBIENTE'
  | 'EDITAR_AMBIENTE';

export interface LogEntry {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorNome: string;
  acao: AuditAction;
  entidadeTipo: 'aula' | 'agendamento' | 'anuncio' | 'usuario' | 'ambiente';
  entidadeId: string;
  antes?: any;
  depois?: any;
  timestamp: any;
}

export interface AuthContextType {
  usuarioAtual: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  temPermissao: (papeisPermitidos: UserRole[]) => boolean;
}

export interface Aula {
  id: string;
  data: string; // Formato DD/MM/YYYY
  sala: string;
  salaId?: string;
  salaOriginal?: string;
  turma: string;
  instrutor: string;
  unidade_curricular: string;
  inicio: string;
  fim: string;
  turno?: string;
  titulo?: string;
  descricao?: string;
  videoUrl?: string;
  materialUrl?: string;
  ordem?: number;
  ativa?: boolean;
  criadaEm?: any;
}

export interface Anuncio {
  id: string;
  type: 'image' | 'video';
  src: string;
  name?: string;
  storagePath?: string;
  duration?: number;
  ordem?: number;
  createdAt?: any;
}

export interface Aluno {
  id: string;
  nome: string;
  turma?: string;
  status?: string;
}

export interface AgendamentoSala {
  id: string;
  sala: string;
  salaId?: string;
  data: string; // Formato DD/MM/YYYY
  turno: string; // 'Matutino' | 'Vespertino' | 'Noturno'
  horarioInicio?: string;
  horarioFim?: string;
  solicitante: string;
  emailSolicitante?: string;
  turma?: string;
  disciplina?: string;
  motivo?: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  motivoRejeicao?: string;
  aprovadoPor?: string;
  aprovadoEm?: any;
  criadoEm?: any;
  criarAulaAoAprovar?: boolean;
}

export interface DataContextType {
  aulas: Aula[];
  anuncios: Anuncio[];
  alunos: Aluno[];
  agendamentos: AgendamentoSala[];
  ambientes: Ambiente[];
  salasCadastradas: string[];
  loading: boolean;
  error: string | null;
  isOffline?: boolean;
  syncSource?: string | null;
  addAula: (aula: Omit<Aula, 'id'>) => Promise<void>;
  updateAulasFromCSV: (data: Omit<Aula, 'id'>[]) => void;
  updateAula: (id: string, aula: Partial<Aula>) => Promise<void>;
  deleteAula: (id: string) => Promise<void>;
  clearAulas: () => void;
  addAnuncio: (anuncio: Omit<Anuncio, 'id'>) => Promise<void>;
  deleteAnuncio: (id: string, storagePath?: string) => Promise<void>;
  replaceAnuncio: (id: string, newAnuncio: Omit<Anuncio, 'id'>, oldStoragePath?: string) => Promise<void>;
  reorderAnuncios: (orderedAnuncios: Anuncio[]) => Promise<void>;
  clearAllAnuncios: () => Promise<void>;
  uploadMediaFile: (file: File) => Promise<{ src: string; type: 'image' | 'video'; storagePath?: string; name: string }>;
  solicitarAgendamento: (dados: Omit<AgendamentoSala, 'id' | 'status' | 'criadoEm'>) => Promise<string>;
  aprovarAgendamento: (id: string, criarAulaAutomatica?: boolean, aprovador?: string) => Promise<void>;
  rejeitarAgendamento: (id: string, motivoRejeicao?: string) => Promise<void>;
  excluirAgendamento: (id: string) => Promise<void>;
  addAmbiente?: (nome: string, tipo?: Ambiente['tipo']) => Promise<void>;
}

