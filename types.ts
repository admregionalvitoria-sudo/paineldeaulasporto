
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

export interface DataContextType {
  aulas: Aula[];
  anuncios: Anuncio[];
  alunos: Aluno[];
  agendamentos: AgendamentoSala[];
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
}
