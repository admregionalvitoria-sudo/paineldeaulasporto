
export interface Aula {
  id: string;
  data: string; // Formato DD/MM/YYYY
  sala: string;
  turma: string;
  instrutor: string;
  unidade_curricular: string;
  inicio: string;
  fim: string;
  turno?: string;
  // Novos campos solicitados
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
  ativo?: boolean;
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

export interface DestaqueSlide {
  image: string;
  headline?: string;
  highlightWord?: string;
  logo?: string;
  tagline?: string;
}

export interface ContactInfo {
  logoUrl: string;
  phone: string;
  whatsappUrl: string;
  instagram: string;
  instagramUrl: string;
}

export interface PainelClienteConfig {
  heroVideoSrc: string;
  heroPosterImage?: string;
  destaques: DestaqueSlide[];
  contactInfo: ContactInfo;
}

export interface DataContextType {
  aulas: Aula[];
  anuncios: Anuncio[];
  alunos: Aluno[];
  agendamentos: AgendamentoSala[];
  salasCadastradas: string[];
  ambientesPersonalizados?: string[];
  painelClienteConfig?: PainelClienteConfig;
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
  updatePainelClienteConfig?: (config: Partial<PainelClienteConfig>) => Promise<void>;
  solicitarAgendamento: (dados: Omit<AgendamentoSala, 'id' | 'status' | 'criadoEm'>) => Promise<string>;
  aprovarAgendamento: (id: string, criarAulaAutomatica?: boolean, aprovador?: string) => Promise<void>;
  rejeitarAgendamento: (id: string, motivoRejeicao?: string) => Promise<void>;
  excluirAgendamento: (id: string) => Promise<void>;
  adicionarAmbiente: (nome: string) => Promise<void>;
  excluirAmbiente: (nome: string) => Promise<void>;
  registrarLog: (acao: AuditAction, entidadeTipo: string, entidadeId: string, detalhes?: string, antes?: any, depois?: any) => Promise<void>;
}

export type UserRole = 'super_admin' | 'admin' | 'coordenador' | 'comunicacao' | 'midia';

export interface UserProfile {
  uid: string;
  email: string;
  nome: string;
  role: UserRole;
  ativo: boolean;
  criadoEm?: any;
  criadoPor?: string;
  atualizadoEm?: any;
}

export interface AuthContextType {
  usuarioAtual: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  temPermissao: (papeisPermitidos: UserRole[]) => boolean;
}

export type AuditAction = 
  | 'IMPORTAR_CSV' 
  | 'CRIAR_AULA' 
  | 'EDITAR_AULA' 
  | 'EXCLUIR_AULA' 
  | 'UPLOAD_MIDIA' 
  | 'EXCLUIR_MIDIA' 
  | 'APROVAR_AGENDAMENTO' 
  | 'REJEITAR_AGENDAMENTO' 
  | 'CRIAR_AMBIENTE'
  | string;

export interface LogEntry {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorNome: string;
  acao: AuditAction;
  entidadeTipo: string;
  entidadeId: string;
  antes?: any;
  depois?: any;
  timestamp?: any;
}
