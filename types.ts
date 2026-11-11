
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
  modificadoManualmente?: boolean;
  origem?: 'manual' | 'reserva' | 'csv';
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

export interface AgendamentoSala {
  id: string;
  sala: string;
  data: string; // Formato DD/MM/YYYY
  turno: string; // 'Matutino' | 'Vespertino' | 'Noturno'
  horarioInicio?: string;
  horarioFim?: string;
  solicitante: string;
  emailSolicitante: string;
  notificarWhatsapp: boolean;
  consentimentoWhatsappEm?: string;
  consentimentoWhatsappTexto?: string;
  canalNotificacao?: 'whatsapp' | 'email';
  telefoneSolicitante?: string;
  observacaoDecisao?: string;
  decididoPor?: string;
  decididoEm?: any;
  planilhaSyncErro?: string | null;
  planilhaSyncEm?: any;
  turma?: string;
  disciplina?: string;
  motivo?: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  motivoRejeicao?: string;
  aprovadoPor?: string;
  aprovadoEm?: any;
  criadoEm?: any;
  atualizadoEm?: any;
  criarAulaAoAprovar?: boolean;
}

export type AgendamentoPublico = Pick<AgendamentoSala,
  'sala' | 'data' | 'turno' | 'horarioInicio' | 'horarioFim' | 'status' | 'criarAulaAoAprovar' | 'turma' | 'atualizadoEm'>;
export type ReservaPublica = AgendamentoPublico & { id: string };
export type ModoAgendamentos = 'completo' | 'publico';

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

export interface ObservacaoLimpeza {
  id?: string;
  sala: string;
  observacao: string;
  atualizadoEm?: any;
  atualizadoPor?: string;
}

export interface ManutencaoAmbiente {
  id: string;
  sala: string;
  motivo: string;
  inicio: string;
  fim?: string | null;
  ativo: boolean;
  criadoPor: string;
  criadoEm?: any;
}

export interface Alerta {
  id: string;
  mensagem: string;
  ativo: boolean;
  criadoPor: string;
  criadoEm?: any;
  lidoPor?: string;
  lidoEm?: any;
}

export interface DataContextType {
  manutencoes: ManutencaoAmbiente[];
  bloquearAmbienteManutencao: (sala: string, motivo: string, inicio: string, fim?: string) => Promise<void>;
  liberarAmbienteManutencao: (id: string) => Promise<void>;
  aulas: Aula[];
  anuncios: Anuncio[];
  agendamentos: AgendamentoSala[];
  agendamentosPublicos: ReservaPublica[];
  assinarAgendamentos: (modo: ModoAgendamentos) => () => void;
  salasCadastradas: string[];
  ambientesPersonalizados?: string[];
  painelClienteConfig?: PainelClienteConfig;
  observacoesLimpeza?: Record<string, ObservacaoLimpeza>;
  alertas: Alerta[];
  loading: boolean;
  error: string | null;
  isOffline?: boolean;
  syncSource?: string | null;
  addAula: (aula: Omit<Aula, 'id'>) => Promise<void>;
  updateAulasFromCSV: (data: Omit<Aula, 'id'>[]) => Promise<void>;
  updateAula: (id: string, aula: Partial<Aula>) => Promise<void>;
  deleteAula: (id: string) => Promise<void>;
  clearAulas: () => void;
  clearAulasHistory: () => Promise<void>;
  addAnuncio: (anuncio: Omit<Anuncio, 'id'>) => Promise<void>;
  deleteAnuncio: (id: string, storagePath?: string) => Promise<void>;
  replaceAnuncio: (id: string, newAnuncio: Omit<Anuncio, 'id'>, oldStoragePath?: string) => Promise<void>;
  reorderAnuncios: (orderedAnuncios: Anuncio[]) => Promise<void>;
  clearAllAnuncios: () => Promise<void>;
  uploadMediaFile: (file: File) => Promise<{ src: string; type: 'image' | 'video'; storagePath?: string; name: string }>;
  updatePainelClienteConfig?: (config: Partial<PainelClienteConfig>) => Promise<void>;
  solicitarAgendamento: (dados: Omit<AgendamentoSala, 'id' | 'status' | 'criadoEm'>) => Promise<string>;
  aprovarAgendamento: (id: string, criarAulaAutomatica?: boolean, aprovador?: string, observacaoAprovacao?: string) => Promise<void>;
  rejeitarAgendamento: (id: string, motivoRejeicao?: string) => Promise<void>;
  excluirAgendamento: (id: string) => Promise<void>;
  adicionarAmbiente: (nome: string) => Promise<void>;
  excluirAmbiente: (nome: string) => Promise<void>;
  salvarObservacaoLimpeza?: (sala: string, observacao: string) => Promise<void>;
  removerObservacaoLimpeza?: (sala: string) => Promise<void>;
  criarAlerta: (mensagem: string) => Promise<void>;
  marcarAlertaLido: (id: string) => Promise<void>;
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
  | 'CRIAR_ALERTA'
  | 'LIDO_ALERTA'
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
