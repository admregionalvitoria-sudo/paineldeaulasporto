import { avisar, confirmar } from '../components/ui/Dialogos';
import { montarAgendamentoPublico, planejarBackfillAgendamentos } from '../utils/agendamentosPublicos';
import { criarAssinaturas } from '../utils/assinaturas';
import { selecionarReenvios } from '../utils/reenviosPlanilha';
import { AuthContext } from './AuthContext';
import { planejarImportacaoAulas } from '../utils/importacaoAulas';
import { dataLocal, dataISO } from '../utils/datas';
import { validarContatoAgendamento, normalizarTelefone, whatsappAutorizado } from '../utils/notificacaoAgendamento.mjs';
import React, { createContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { upload as vercelBlobUpload } from '@vercel/blob/client';
import { obterIdToken, excluirBlob } from '../utils/tokenAutenticacao';
import { Aula, Anuncio, AgendamentoSala, ReservaPublica, ModoAgendamentos, DataContextType, AuditAction, PainelClienteConfig, ObservacaoLimpeza, ManutencaoAmbiente, Alerta } from '../types';
import { db, storage, auth } from '../firebase';
import { formatarUnidadeCurricular } from '../utils/curricularUnits';
import { formatarNomeSala, CANONICAL_SALAS } from '../utils/roomFormatter';
import { uploadToCloudinary } from '../utils/cloudinary';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  query,
  getDocs,
  getDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

declare const XLSX: any;

export interface ExtendedDataContextType extends DataContextType {
  uploadCSV: (file: File) => Promise<void>;
  syncSource: string | null;
}

export const DataContext = createContext<ExtendedDataContextType | undefined>(undefined);

// Compartilhado entre remontagens do provider durante esta sessão da página.
let backfillAgendamentosTentado = false;
const reenviosPlanilhaTentados = new Set<string>();
let filaReenviosPlanilha = Promise.resolve();
const aulasComCorrecaoTentada = new Set<string>();

const FIRESTORE_ROOT_COLLECTION = 'porto';
const FIRESTORE_DATA_DOCUMENT = 'dados';

export { normalizarNomeAmbiente } from '../utils/ambientes';
import { normalizarNomeAmbiente, estaEmManutencao, dataBRNumero } from '../utils/ambientes';

const compressImageToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1600;
        const MAX_HEIGHT = 900;
        
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(e.target?.result as string);
        }

        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.82;
        let compressed = canvas.toDataURL('image/jpeg', quality);

        while (compressed.length > 700000 && quality > 0.4) {
          quality -= 0.15;
          compressed = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(compressed);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
};

export { calcularTurnoPorHorario } from '../utils/turnos';
import { calcularTurnoPorHorario } from '../utils/turnos';

const formatarDataCSV = (valor: any): string => {
  if (!valor) return '';
  const valStr = String(valor).trim();

  if (valStr.includes('/')) {
    const parts = valStr.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      let year = parts[2];
      if (year.length === 2) year = '20' + year;
      return `${day}/${month}/${year}`;
    }
    return valStr;
  }

  if (valStr.includes('-')) {
    const parts = valStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }

  const num = Number(valor);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const data = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(data.getTime())) {
      const day = String(data.getUTCDate()).padStart(2, '0');
      const month = String(data.getUTCMonth() + 1).padStart(2, '0');
      const year = data.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  return valStr;
};

export const DEFAULT_PAINEL_CLIENTE_CONFIG: PainelClienteConfig = {
  heroVideoSrc: "https://res.cloudinary.com/dlrdwblso/video/upload/v1785334173/WhatsApp_Video_2025-12-10_at_13.15.24_eku6g1.mp4",
  heroPosterImage: "",
  destaques: [
    {
      image: "/carrossel/1.png",
      headline: "Educação que transforma indústrias e pessoas.",
      highlightWord: "transforma",
      logo: "",
      tagline: "O futuro se constrói com conhecimento."
    },
    {
      image: "/carrossel/2.png",
      headline: "Inovação que impulsiona o crescimento do Brasil.",
      highlightWord: "impulsiona",
      logo: "",
      tagline: "Tecnologia a serviço da indústria."
    },
    {
      image: "/carrossel/3.png",
      headline: "Capacitação que conecta talentos à indústria.",
      highlightWord: "conecta",
      logo: "",
      tagline: "Formando profissionais do futuro."
    }
  ],
  contactInfo: {
    logoUrl: "https://res.cloudinary.com/dlrdwblso/image/upload/v1785334994/SENAI_COMPLETA_PREFERENCIAL_svm23u.png",
    phone: "(27) 98818-2941",
    whatsappUrl: "https://wa.me/5527988182941",
    instagram: "@senaivitoria",
    instagramUrl: "https://instagram.com/senaivitoria"
  }
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const perfil = React.useContext(AuthContext)?.usuarioAtual;
  const perfilRef = React.useRef(perfil);
  perfilRef.current = perfil;
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [manutencoes, setManutencoes] = useState<ManutencaoAmbiente[]>([]);
  const [agendamentos, setAgendamentos] = useState<AgendamentoSala[]>([]);
  const [agendamentosPublicos, setAgendamentosPublicos] = useState<ReservaPublica[]>([]);
  const reservasAtuais = React.useRef<AgendamentoSala[]>([]);
  const assinaturas = useMemo(() => criarAssinaturas<ModoAgendamentos>(modo => {
    if (modo === 'publico') {
      const cancelar = onSnapshot(collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentosPublicos'), snapshot => {
        setAgendamentosPublicos(snapshot.docs.map(d => ({ ...montarAgendamentoPublico(d.data()), id: d.id })));
      }, err => console.warn('Aviso listener agendamentos públicos:', err));
      return () => { cancelar(); setAgendamentosPublicos([]); };
    }
    const agendamentosCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentos');
    let ativo = true;
    const unsubAgendamentos = onSnapshot(agendamentosCollectionRef, { includeMetadataChanges: true }, (snapshot) => {
      const agendamentosData = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          ...d,
          id: docSnap.id,
          sala: d.sala || '',
          data: d.data || '',
          turno: d.turno || 'Matutino',
          horarioInicio: d.horarioInicio || '',
          horarioFim: d.horarioFim || '',
          solicitante: d.solicitante || '',
          emailSolicitante: d.emailSolicitante || '',
          notificarWhatsapp: whatsappAutorizado(d),
          telefoneSolicitante: d.telefoneSolicitante || '',
          consentimentoWhatsappEm: d.consentimentoWhatsappEm,
          consentimentoWhatsappTexto: d.consentimentoWhatsappTexto,
          turma: d.turma || '',
          disciplina: d.disciplina || '',
          motivo: d.motivo || '',
          status: d.status || 'pendente',
          motivoRejeicao: d.motivoRejeicao || '',
          aprovadoPor: d.aprovadoPor || '',
          aprovadoEm: d.aprovadoEm || null,
          criadoEm: d.criadoEm || null,
          planilhaSyncErro: d.planilhaSyncErro ?? null,
          criarAulaAoAprovar: d.criarAulaAoAprovar ?? true
        } as AgendamentoSala;
      });

      agendamentosData.sort((a, b) => {
        if (a.status === 'pendente' && b.status !== 'pendente') return -1;
        if (a.status !== 'pendente' && b.status === 'pendente') return 1;
        const timeA = a.criadoEm?.toMillis?.() || a.criadoEm || 0;
        const timeB = b.criadoEm?.toMillis?.() || b.criadoEm || 0;
        return timeB - timeA;
      });

      reservasAtuais.current = agendamentosData;
      setAgendamentos(agendamentosData);
      const gestaoAutenticada = () => {
        const usuarioAtual = auth.currentUser;
        const perfilAtual = perfilRef.current;
        return !!(usuarioAtual && !usuarioAtual.isAnonymous && perfilAtual?.uid === usuarioAtual.uid
          && perfilAtual.ativo && ['super_admin', 'admin', 'coordenador'].includes(perfilAtual.role));
      };
      if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites && gestaoAutenticada()) {
        // Cada snapshot do servidor agenda uma rodada de até 20, sem sobrepor POSTs.
        filaReenviosPlanilha = filaReenviosPlanilha.then(async () => {
          if (!ativo || !gestaoAutenticada()) return;
          const ids = selecionarReenvios(agendamentosData, reenviosPlanilhaTentados, 20);
          for (const id of ids) {
            if (!ativo || !gestaoAutenticada()) return;
            if (!reservasAtuais.current.some(reserva => reserva.id === id && reserva.planilhaSyncErro?.trim())) continue;
            // Marcar antes do POST impede que o diagnóstico de falha gere outra tentativa.
            reenviosPlanilhaTentados.add(id);
            await sincronizarPlanilha(id, reservasAtuais.current.find(reserva => reserva.id === id));
          }
        }).catch(err => console.warn('Aviso ao reenviar agendamentos à planilha:', err));
      }
      if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites && !backfillAgendamentosTentado
        && gestaoAutenticada()) {
        backfillAgendamentosTentado = true;
        void (async () => {
          const espelho = await getDocs(collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentosPublicos'));
          if (!ativo) return;
          const plano = planejarBackfillAgendamentos(reservasAtuais.current, espelho.docs.map(d => ({ ...d.data(), id: d.id })));
          const operacoes = [
            ...plano.criar.map(item => ({ ...item, apagar: false })),
            ...plano.atualizar.map(item => ({ ...item, apagar: false })),
            ...plano.remover.map(id => ({ id, dados: null, apagar: true })),
          ];
          for (let i = 0; i < operacoes.length; i += 450) {
            const batch = writeBatch(db);
            for (const op of operacoes.slice(i, i + 450)) {
              const ref = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentosPublicos', op.id);
              if (op.apagar) batch.delete(ref);
              else batch.set(ref, op.dados!);
            }
            await batch.commit();
          }
        })().catch(err => console.warn('Aviso ao reconciliar espelho de agendamentos:', err));
      }
    }, (err) => {
      console.warn("Aviso listener agendamentos:", err);
    });

    return () => { ativo = false; unsubAgendamentos(); reservasAtuais.current = []; setAgendamentos([]); };
  }), []);
  const assinarAgendamentos = React.useCallback((modo: ModoAgendamentos) => assinaturas.assinar(modo), [assinaturas]);
  useEffect(() => () => assinaturas.cancelarTodas(), [assinaturas]);
  const [ambientesPersonalizados, setAmbientesPersonalizados] = useState<{ id: string; nome: string }[]>([]);
  const [painelClienteConfig, setPainelClienteConfig] = useState<PainelClienteConfig>(DEFAULT_PAINEL_CLIENTE_CONFIG);
  const [observacoesLimpeza, setObservacoesLimpeza] = useState<Record<string, ObservacaoLimpeza>>({});
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncSource, setSyncSource] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  const isInitialAulasLoadedRef = React.useRef(false);
  const lastAulasHashRef = React.useRef<string>('');
  const isInitialMetaLoadedRef = React.useRef(false);

  // Registro de Auditoria no Firestore
  const registrarLog = async (
    acao: AuditAction,
    entidadeTipo: string,
    entidadeId: string,
    detalhes?: string,
    antes?: any,
    depois?: any
  ) => {
    try {
      const user = auth.currentUser;
      const email = user?.email || 'admin@senai.br';
      const nome = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Administrador SENAI');
      const uid = user?.uid || 'system';

      const logsColl = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'logs');
      await addDoc(logsColl, {
        actorUid: uid,
        actorEmail: email,
        actorNome: nome,
        acao,
        entidadeTipo,
        entidadeId: String(entidadeId || ''),
        detalhes: detalhes || '',
        antes: antes || null,
        depois: depois || null,
        timestamp: serverTimestamp(),
        dataHora: new Date().toLocaleString('pt-BR')
      });
    } catch (logErr) {
      console.warn("Aviso ao registrar log de auditoria:", logErr);
    }
  };

  // Lista unificada e estritamente desduplicada de todas as salas cadastradas no sistema
  const salasCadastradas = useMemo(() => {
    const salasMap = new Map<string, string>(); // normalizado -> nome formatado

    // 0. Salas canônicas e oficiais do SENAI Porto
    CANONICAL_SALAS.forEach(sala => {
      const norm = normalizarNomeAmbiente(sala);
      if (!salasMap.has(norm)) {
        salasMap.set(norm, sala);
      }
    });

    // 1. Ambientes personalizados
    ambientesPersonalizados.forEach(item => {
      if (item.nome && item.nome.trim()) {
        const formatado = formatarNomeSala(item.nome);
        const norm = normalizarNomeAmbiente(formatado);
        if (!salasMap.has(norm)) {
          salasMap.set(norm, formatado);
        }
      }
    });

    // 2. Salas das aulas
    aulas.forEach(a => {
      if (a.sala && a.sala.trim()) {
        const formatado = formatarNomeSala(a.sala);
        const norm = normalizarNomeAmbiente(formatado);
        if (!salasMap.has(norm)) {
          salasMap.set(norm, formatado);
        }
      }
    });

    // 3. Salas dos agendamentos
    [...agendamentos, ...agendamentosPublicos].forEach(ag => {
      if (ag.sala && ag.sala.trim()) {
        const formatado = formatarNomeSala(ag.sala);
        const norm = normalizarNomeAmbiente(formatado);
        if (!salasMap.has(norm)) {
          salasMap.set(norm, formatado);
        }
      }
    });

    return Array.from(salasMap.values()).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' }));
  }, [aulas, agendamentos, agendamentosPublicos, ambientesPersonalizados]);

  // Checagem de conflito: impede 2 turmas no mesmo ambiente no mesmo dia e turno
  const verificarConflitoAmbiente = (
    sala: string,
    data: string,
    turno: string,
    ignorarAulaId?: string
  ): Aula | undefined => {
    const normSala = normalizarNomeAmbiente(sala);
    const normData = data.trim();
    const normTurno = (turno || '').toLowerCase().trim();

    return aulas.find(a => {
      if (ignorarAulaId && a.id === ignorarAulaId) return false;
      return (
        normalizarNomeAmbiente(a.sala) === normSala &&
        a.data.trim() === normData &&
        (a.turno || '').toLowerCase().trim() === normTurno
      );
    });
  };

  // Monitoramento de Conexão Online/Offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkInterval = setInterval(() => {
      if (typeof navigator !== 'undefined') {
        const currentlyOnline = navigator.onLine;
        setIsOffline(!currentlyOnline);
      }
    }, 4000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(checkInterval);
    };
  }, []);

  // Listeners do Firestore em Tempo Real
  useEffect(() => {
    const aulasCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas');
    const anunciosCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'anuncios');
    const ambientesCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'ambientes');
    const limpezaCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'limpeza');
    const alertasCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'alertas');
    const metaDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'meta', 'sync');

    const unsubMeta = onSnapshot(metaDocRef, (docSnap) => {
      if (!isInitialMetaLoadedRef.current) {
        isInitialMetaLoadedRef.current = true;
        return;
      }
    }, (err) => {
      console.warn("Aviso listener meta sync:", err);
    });

    const unsubAmbientes = onSnapshot(ambientesCollectionRef, (snapshot) => {
      const ambData = snapshot.docs.map(d => ({
        id: d.id,
        nome: d.data().nome || ''
      })).filter(a => !!a.nome);
      setAmbientesPersonalizados(ambData);
    }, (err) => {
      console.warn("Aviso listener ambientes:", err);
    });

    // Datas legadas DD/MM/AAAA e ISO coexistem: uma faixa em `data` omitiria aulas.
    const qAulas = query(aulasCollectionRef, orderBy('ordem', 'asc'));
    const unsubAulas = onSnapshot(qAulas, { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.metadata.fromCache && !navigator.onLine) {
        setIsOffline(true);
      }

      const perfilGestao = perfilRef.current;
      const podeCorrigir = !!auth.currentUser && !auth.currentUser.isAnonymous
        && perfilGestao?.uid === auth.currentUser.uid && perfilGestao.ativo
        && ['super_admin', 'admin', 'coordenador'].includes(perfilGestao.role);
      const aulasData = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        const formattedUC = formatarUnidadeCurricular(d.unidade_curricular);
        const formattedSala = formatarNomeSala(d.sala) || d.sala || '';
        const turnoCorreto = d.inicio ? calcularTurnoPorHorario(d.inicio) : (d.turno || 'Vespertino');
        
        const precisaAtualizarUC = d.unidade_curricular !== formattedUC;
        const precisaAtualizarSala = formattedSala && d.sala !== formattedSala;
        const precisaAtualizarTurno = d.inicio && d.turno !== turnoCorreto;

        if ((precisaAtualizarUC || precisaAtualizarSala || precisaAtualizarTurno) && navigator.onLine
          && podeCorrigir && !aulasComCorrecaoTentada.has(docSnap.id)) {
          // Marcar antes da escrita evita novas tentativas em snapshots concorrentes.
          aulasComCorrecaoTentada.add(docSnap.id);
          const payload: any = {};
          if (precisaAtualizarUC) {
            payload.unidade_curricular = formattedUC;
            payload.descricao = formattedUC;
          }
          if (precisaAtualizarSala) {
            payload.sala = formattedSala;
          }
          if (precisaAtualizarTurno) {
            payload.turno = turnoCorreto;
          }
          void updateDoc(docSnap.ref, payload).catch(() => {});
        }

        return {
          ...d,
          id: docSnap.id,
          unidade_curricular: formattedUC,
          sala: formattedSala,
          turno: turnoCorreto
        };
      }) as Aula[];
      const currentHash = aulasData.map(a => `${a.id}_${a.turma}_${a.sala}_${a.inicio}_${a.turno}_${a.unidade_curricular}`).join('|');

      setAulas(aulasData);
      setLoading(false);
      lastAulasHashRef.current = currentHash;
    }, (err) => {
      console.error("Erro ao carregar aulas do Firestore:", err);
      if (!navigator.onLine) {
        setIsOffline(true);
      }
      setLoading(false);
    });

    const unsubAnuncios = onSnapshot(anunciosCollectionRef, (snapshot) => {
      const anunciosData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Anuncio[];
      anunciosData.sort((a, b) => {
        const orderA = typeof a.ordem === 'number' ? a.ordem : 999;
        const orderB = typeof b.ordem === 'number' ? b.ordem : 999;
        if (orderA !== orderB) return orderA - orderB;
        const timeA = a.createdAt?.toMillis?.() || a.createdAt || 0;
        const timeB = b.createdAt?.toMillis?.() || b.createdAt || 0;
        return timeA - timeB;
      });
      setAnuncios(anunciosData);
    }, (err) => {
      console.error("Erro ao carregar anúncios do Firestore:", err);
    });

    const unsubManutencoes = onSnapshot(collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'manutencoes'), snapshot => {
      setManutencoes(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as ManutencaoAmbiente)));
    }, () => console.warn('Falha ao carregar manutenções'));

    const painelClienteDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'meta', 'painelCliente');
    const unsubPainelCliente = onSnapshot(painelClienteDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPainelClienteConfig(prev => ({
          ...prev,
          ...data,
          destaques: Array.isArray(data.destaques) && data.destaques.length > 0 ? data.destaques : prev.destaques,
          contactInfo: {
            ...prev.contactInfo,
            ...(data.contactInfo || {})
          }
        }));
      }
    }, (err) => {
      console.warn("Aviso listener painelCliente:", err);
    });

    const unsubLimpeza = onSnapshot(limpezaCollectionRef, (snapshot) => {
      const obsMap: Record<string, ObservacaoLimpeza> = {};
      snapshot.docs.forEach(docSnap => {
        const d = docSnap.data();
        const salaNome = d.sala || '';
        if (salaNome) {
          const norm = normalizarNomeAmbiente(salaNome);
          obsMap[norm] = {
            id: docSnap.id,
            sala: salaNome,
            observacao: d.observacao || '',
            atualizadoEm: d.atualizadoEm,
            atualizadoPor: d.atualizadoPor
          };
        }
      });
      setObservacoesLimpeza(obsMap);
    }, (err) => {
      console.warn("Aviso listener limpeza:", err);
    });

    const unsubAlertas = onSnapshot(alertasCollectionRef, (snapshot) => {
      const alertasData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Alerta[];
      alertasData.sort((a, b) => {
        const timeA = a.criadoEm?.toMillis?.() || 0;
        const timeB = b.criadoEm?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setAlertas(alertasData);
    }, (err) => {
      console.error("Erro listener alertas:", err);
    });

    return () => {
      unsubMeta();
      unsubAmbientes();
      unsubAulas();
      unsubAnuncios();
      unsubManutencoes();
      unsubPainelCliente();
      unsubLimpeza();
      unsubAlertas();
    };
  }, []);

  const adicionarAmbiente = async (nomeInput: string) => {
    const nomeLimpo = nomeInput.trim().replace(/\s+/g, ' ');
    if (!nomeLimpo) {
      throw new Error("O nome do ambiente não pode ser vazio.");
    }
    const norm = normalizarNomeAmbiente(nomeLimpo);
    const existe = salasCadastradas.some(s => normalizarNomeAmbiente(s) === norm);
    if (existe) {
      throw new Error(`O ambiente "${nomeLimpo}" já está cadastrado no sistema.`);
    }

    try {
      const ambientesColl = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'ambientes');
      await addDoc(ambientesColl, {
        nome: nomeLimpo,
        nomeNormalizado: norm,
        criadoEm: serverTimestamp()
      });
      await registrarLog('CRIAR_AMBIENTE', 'ambiente', nomeLimpo, `Novo ambiente "${nomeLimpo}" cadastrado`);
    } catch (err: any) {
      console.error("Erro ao cadastrar ambiente:", err);
      throw new Error(err.message || "Erro ao salvar ambiente no banco.");
    }
  };

  const excluirAmbiente = async (nome: string) => {
    try {
      const norm = normalizarNomeAmbiente(nome);
      const found = ambientesPersonalizados.find(a => normalizarNomeAmbiente(a.nome) === norm);
      if (found) {
        const ambDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'ambientes', found.id);
        await deleteDoc(ambDocRef);
        await registrarLog('EXCLUIR_AMBIENTE', 'ambiente', nome, `Ambiente "${nome}" removido do cadastro`);
      }
    } catch (err: any) {
      console.error("Erro ao excluir ambiente:", err);
      throw new Error("Não foi possível excluir o ambiente.");
    }
  };

  const uploadMediaFile = async (file: File): Promise<{ src: string; type: 'image' | 'video'; storagePath?: string; name: string }> => {
    const idToken = await obterIdToken();
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg)$/i.test(file.name);
    const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `midias/${timestamp}_${cleanFileName}`;

    // 1. Prioridade Máxima: Upload para o Cloudinary (j35zooeo / ml_default)
    try {
      const cloudinaryRes = await uploadToCloudinary(file);
      if (cloudinaryRes && cloudinaryRes.src) {
        return cloudinaryRes;
      }
    } catch (cloudinaryError: any) {
      console.warn("Cloudinary upload falhou, tentando fallbacks:", cloudinaryError?.message || cloudinaryError);
    }

    // 2. Fallback: Firebase Storage
    try {
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return { src: downloadUrl, type: mediaType, storagePath, name: file.name };
    } catch (firebaseError) {
      console.warn("Firebase Storage falhou. Tentando Vercel Blob...", firebaseError);
    }

    // 3. Fallback: Vercel Blob
    try {
      const blob = await vercelBlobUpload(storagePath, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        clientPayload: JSON.stringify({ idToken }),
      });
      return { src: blob.url, type: mediaType, storagePath: blob.url, name: file.name };
    } catch (vercelError) {
      console.warn("Vercel Blob falhou. Usando Base64/DataUrl...", vercelError);
    }

    // 4. Fallback Local: Base64
    if (mediaType === 'image') {
      const compressedDataUrl = await compressImageToDataUrl(file);
      return { src: compressedDataUrl, type: 'image', name: file.name };
    } else {
      const directDataUrl = await fileToDataUrl(file);
      return { src: directDataUrl, type: 'video', name: file.name };
    }
  };

  const addAnuncio = async (anuncioData: Omit<Anuncio, 'id'>) => {
    try {
      const anunciosCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'anuncios');
      const cleanData: Record<string, any> = {};
      Object.entries(anuncioData).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanData[key] = value;
        }
      });

      const nextOrder = anuncios.length;
      await addDoc(anunciosCollectionRef, {
        ...cleanData,
        ordem: nextOrder,
        createdAt: serverTimestamp()
      });

      await registrarLog(
        'UPLOAD_MIDIA', 
        'midia', 
        anuncioData.name || 'Nova Mídia', 
        `Mídia "${anuncioData.name || 'Arquivo'}" (${anuncioData.type === 'video' ? 'Vídeo' : 'Imagem'}) adicionada com duração de ${anuncioData.duration || 15}s`
      );
    } catch (e) {
      console.error("Erro ao adicionar anúncio:", e);
      throw e;
    }
  };

  const reorderAnuncios = async (orderedAnuncios: Anuncio[]) => {
    try {
      const batch = writeBatch(db);
      orderedAnuncios.forEach((ad, index) => {
        const anuncioDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'anuncios', ad.id);
        batch.update(anuncioDocRef, { ordem: index, updatedAt: serverTimestamp() });
      });
      await batch.commit();
      setAnuncios([...orderedAnuncios.map((ad, index) => ({ ...ad, ordem: index }))]);

      await registrarLog('REORDENAR_MIDIAS', 'midia', 'todas', 'Ordem das mídias rotativas atualizada');
    } catch (e) {
      console.error("Erro ao reordenar anúncios:", e);
      throw e;
    }
  };

  const deleteAnuncio = async (id: string, storagePath?: string) => {
    try {
      const anuncio = anuncios.find(a => a.id === id);
      if (storagePath && (storagePath.includes('blob.vercel-storage.com') || storagePath.startsWith('http'))) {
        try {
          await excluirBlob(storagePath);
        } catch (blobErr) {
          console.warn("Erro ao deletar do Vercel Blob:", blobErr);
        }
      }

      const anuncioDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'anuncios', id);
      await deleteDoc(anuncioDocRef);

      await registrarLog('EXCLUIR_MIDIA', 'midia', anuncio?.name || id, `Mídia "${anuncio?.name || id}" excluída do painel`);
    } catch (e) {
      console.error("Erro ao deletar anúncio:", e);
      throw e;
    }
  };

  const replaceAnuncio = async (id: string, newAnuncio: Omit<Anuncio, 'id'>, oldStoragePath?: string) => {
    try {
      if (oldStoragePath && (oldStoragePath.includes('blob.vercel-storage.com') || oldStoragePath.startsWith('http'))) {
        try {
          await excluirBlob(oldStoragePath);
        } catch (blobErr) {
          console.warn("Erro ao excluir mídia anterior do Vercel Blob:", blobErr);
        }
      }

      const cleanData: Record<string, any> = {};
      Object.entries(newAnuncio).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanData[key] = value;
        }
      });

      const anuncioDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'anuncios', id);
      await updateDoc(anuncioDocRef, {
        ...cleanData,
        updatedAt: serverTimestamp()
      });

      await registrarLog('SUBSTITUIR_MIDIA', 'midia', newAnuncio.name || id, `Mídia substituída por "${newAnuncio.name || 'Nova Mídia'}"`);
    } catch (e) {
      console.error("Erro ao substituir anúncio:", e);
      throw e;
    }
  };

  const clearAllAnuncios = async () => {
    try {
      const anunciosCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'anuncios');
      const snapshot = await getDocs(anunciosCollectionRef);
      
      const deletePromises: Promise<void>[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        if (data.storagePath && (data.storagePath.includes('blob.vercel-storage.com') || data.storagePath.startsWith('http'))) {
          void excluirBlob(data.storagePath).catch(() => {});
        }
        deletePromises.push(deleteDoc(d.ref));
      });

      await Promise.all(deletePromises);
      await registrarLog('EXCLUIR_MIDIA', 'midia', 'todas', 'Todas as mídias foram excluídas');
    } catch (e) {
      console.error("Erro ao limpar todos os anúncios:", e);
      throw e;
    }
  };

  const processCSVData = (rawJsonData: any[][]) => {
    if (!rawJsonData || rawJsonData.length === 0) {
      throw new Error("O arquivo enviado está vazio.");
    }

    const jsonData = rawJsonData.map(row => {
      if (!Array.isArray(row)) return [];
      if (row.length === 1 && typeof row[0] === 'string') {
        const str = row[0];
        if (str.includes(';')) return str.split(';').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (str.includes('\t')) return str.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (str.includes(',') && str.split(',').length > 3) return str.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      }
      return row.map(c => c !== null && c !== undefined ? String(c).trim().replace(/^["']|["']$/g, '') : '');
    }).filter(row => row.some(cell => String(cell).trim() !== ''));

    if (jsonData.length === 0) {
      throw new Error("Nenhum dado legível encontrado no arquivo.");
    }

    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(jsonData.length, 15); i++) {
      const rowStr = jsonData[i].map(c => String(c).toLowerCase()).join(' ');
      const hasData = rowStr.includes('data');
      const hasInicio = rowStr.includes('inicio') || rowStr.includes('início');
      const hasTurma = rowStr.includes('turma');
      const hasInstrutor = rowStr.includes('instrutor');
      const hasAmbiente = rowStr.includes('ambiente') || rowStr.includes('sala');

      const matches = [hasData, hasInicio, hasTurma, hasInstrutor, hasAmbiente].filter(Boolean).length;
      if (matches >= 2) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      headerRowIndex = 0;
    }

    const headers = jsonData[headerRowIndex].map(h => String(h || '').toLowerCase().trim().replace(/^["']|["']$/g, ''));

    const idx = {
      data: headers.findIndex(h => h.includes('data')),
      sala: headers.findIndex(h => (h.includes('ambiente') || h.includes('sala') || h.includes('justificativa')) && !h.includes('instrutor')),
      turma: headers.findIndex(h => h.includes('turma')),
      instrutor: headers.findIndex(h => h.includes('instrutor')),
      uc: headers.findIndex(h => h.includes('unidade') || h.includes('curricular') || h.includes('solicitante')),
      inicio: headers.findIndex(h => h.includes('inicio') || h.includes('início')),
      fim: headers.findIndex(h => h.includes('fim'))
    };

    if (idx.turma === -1) idx.turma = headers.findIndex(h => h.includes('tipo') && !h.includes('agenda'));
    if (idx.sala === -1) idx.sala = headers.findIndex(h => h.includes('ambiente') || h.includes('sala'));

    if (idx.data === -1 || idx.inicio === -1 || idx.turma === -1 || idx.sala === -1 || idx.instrutor === -1) {
      console.error("Cabeçalho do CSV inválido. Colunas identificadas:", { headers, idx });
      throw new Error("O arquivo CSV não possui as colunas esperadas (Data, Ambiente, Turma, Instrutor, Início).");
    }

    let globalOrder = 0;
    const dataRows = jsonData.slice(headerRowIndex + 1);

    return dataRows.flatMap((v) => {
      const dataVal = formatarDataCSV(v[idx.data]);
      const turmaVal = String(v[idx.turma] || '').trim();
      const salaVal = String(v[idx.sala] || 'Ambiente').trim();
      const instrutorVal = String(v[idx.instrutor] || '').trim();
      const ucVal = idx.uc !== -1 ? String(v[idx.uc] || '').trim() : '';

      if (!dataVal || !turmaVal || dataVal.toLowerCase().includes('data')) {
        return [];
      }

      const iniciosStr = String(v[idx.inicio] || '').trim();
      const finsStr = idx.fim !== -1 ? String(v[idx.fim] || '').trim() : '';

      const inicios = iniciosStr.split(/\s+/).filter(Boolean);
      const fins = finsStr.split(/\s+/).filter(Boolean);

      if (inicios.length === 0) {
        return [];
      }

      const startTime = inicios[0];
      const endTime = fins.length > 0 ? fins[fins.length - 1] : (inicios.length > 1 ? inicios[inicios.length - 1] : '');
      const formattedUC = formatarUnidadeCurricular(ucVal);
      const formattedSala = formatarNomeSala(salaVal) || salaVal;

      globalOrder++;
      return [{
        data: dataVal,
        sala: formattedSala,
        turma: turmaVal,
        instrutor: instrutorVal,
        unidade_curricular: formattedUC,
        inicio: startTime,
        fim: endTime,
        turno: calcularTurnoPorHorario(startTime),
        titulo: turmaVal,
        descricao: formattedUC,
        ativa: true,
        ordem: globalOrder - 1,
        criadaEm: new Date(),
      }];
    }).filter(a => !!a);
  };

  const persistirAulasImportadas = async (dados: Omit<Aula, 'id'>[], nomeArquivo: string) => {
      // Desduplicação rigorosa: impede turmas duplicadas no mesmo ambiente/data/turno
      const uniqueAulasMap = new Map<string, Omit<Aula, 'id'>>();
      dados.forEach(aula => {
        const normSala = normalizarNomeAmbiente(aula.sala);
        const key = `${aula.data}|${aula.turno}|${normSala}`;
        if (!uniqueAulasMap.has(key)) {
          uniqueAulasMap.set(key, aula);
        }
      });
      const uniqueAulas = Array.from(uniqueAulasMap.values());

      if (uniqueAulas.length === 0) {
        throw new Error("Nenhuma aula válida ou não duplicada encontrada no arquivo.");
      }
      if (!uniqueAulas.some(a => dataISO(a.data) >= dataLocal())) {
        throw new Error('O CSV não contém aulas de hoje em diante para importar.');
      }

      const aulasCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas');
      const CHUNK_SIZE = 490;

      const currentDocs = await getDocs(aulasCollectionRef);
      const plano = planejarImportacaoAulas(currentDocs.docs.map(d => ({ ...d.data(), id: d.id } as Aula)), uniqueAulas, dataLocal());
      const futureAulasFromCsv = plano.inserir;
      const excluirIds = new Set(plano.excluirIds);

      const deletePromises: Promise<void>[] = [];
      let deleteBatch = writeBatch(db);
      let deleteCount = 0;

      currentDocs.forEach((d) => {
          // Histórico e ajustes manuais não entram no plano de exclusão.
          if (excluirIds.has(d.id)) {
            deleteBatch.delete(d.ref);
            deleteCount++;
            if (deleteCount === CHUNK_SIZE) {
                deletePromises.push(deleteBatch.commit());
                deleteBatch = writeBatch(db);
                deleteCount = 0;
            }
          }
      });

      if (deleteCount > 0) {
          deletePromises.push(deleteBatch.commit());
      }
      await Promise.all(deletePromises);

      const addPromises: Promise<void>[] = [];
      let addBatch = writeBatch(db);
      let addCount = 0;

      futureAulasFromCsv.forEach((aula, index) => {
        const newDocRef = doc(aulasCollectionRef);
        const aulaComOrdem = { ...aula, ordem: index };
        addBatch.set(newDocRef, aulaComOrdem);
        addCount++;
        if (addCount === CHUNK_SIZE) {
          addPromises.push(addBatch.commit());
          addBatch = writeBatch(db);
          addCount = 0;
        }
      });
      if (addCount > 0) {
        addPromises.push(addBatch.commit());
      }
      await Promise.all(addPromises);

      const metaDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'meta', 'sync');
      await setDoc(metaDocRef, {
        updatedAt: serverTimestamp(),
        timestamp: Date.now(),
        totalAulas: futureAulasFromCsv.length,
        source: nomeArquivo
      }, { merge: true });

      await registrarLog(
        'IMPORTAR_CSV',
        'csv',
        nomeArquivo,
        `Planilha importada com ${futureAulasFromCsv.length} aulas. ${plano.preservadas} ajustes manuais e ${plano.historicas} aulas históricas preservados.`
      );

      setSyncSource(nomeArquivo);
      avisar(`${futureAulasFromCsv.length} aulas sincronizadas! ${plano.preservadas} aulas com ajustes manuais preservadas. ${plano.historicas} aulas históricas preservadas.`, 'sucesso');
  };

  const uploadCSV = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      let jsonData: any[][] = [];

      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, raw: false });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
      } catch (xlsxErr) {
        console.warn("Falha ao ler planilha via XLSX, tentando leitura de texto pura:", xlsxErr);
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        jsonData = lines.map(line => [line]);
      }

      const processed = processCSVData(jsonData);

      await persistirAulasImportadas(processed, file.name);
    } catch (e: any) {
      setError(e.message);
      avisar("Erro ao processar arquivo: " + e.message, 'erro');
    } finally {
      setLoading(false);
    }
  };

  const updateAula = async (id: string, aula: Partial<Aula>) => {
    try {
      const aulaAtual = aulas.find(a => a.id === id);
      const novaSala = formatarNomeSala(aula.sala || aulaAtual?.sala || '');
      const novaData = aula.data || aulaAtual?.data || '';
      const novoTurno = aula.inicio 
        ? calcularTurnoPorHorario(aula.inicio) 
        : (aula.turno || aulaAtual?.turno || 'Vespertino');

      const conflito = verificarConflitoAmbiente(novaSala, novaData, novoTurno, id);
      if (conflito) {
        const msg = `Conflito no ambiente: O ambiente "${novaSala}" já possui a turma "${conflito.turma}" alocada na data ${novaData} (${novoTurno}). Não é permitido o mesmo ambiente com duas turmas no mesmo horário.`;
        avisar(msg, 'info');
        throw new Error(msg);
      }

      const sanitizedAula: Partial<Aula> = { ...aula, turno: novoTurno, modificadoManualmente: true };
      if (sanitizedAula.sala) {
        sanitizedAula.sala = formatarNomeSala(sanitizedAula.sala);
      }
      if (sanitizedAula.unidade_curricular !== undefined) {
        sanitizedAula.unidade_curricular = formatarUnidadeCurricular(sanitizedAula.unidade_curricular);
        sanitizedAula.descricao = sanitizedAula.unidade_curricular;
      }
      const aulaDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas', id);
      await updateDoc(aulaDocRef, sanitizedAula);
      const metaDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'meta', 'sync');
      await setDoc(metaDocRef, { updatedAt: serverTimestamp(), timestamp: Date.now() }, { merge: true });

      await registrarLog(
        'EDITAR_AULA',
        'aula',
        id,
        `Horário/dados alterados para a turma ${sanitizedAula.turma || aulaAtual?.turma} no ambiente ${novaSala} (${novoTurno})`
      );
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  };

  const deleteAula = async (id: string) => {
    try {
      const aula = aulas.find(a => a.id === id);
      const aulaDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas', id);
      await deleteDoc(aulaDocRef);
      const metaDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'meta', 'sync');
      await setDoc(metaDocRef, { updatedAt: serverTimestamp(), timestamp: Date.now() }, { merge: true });

      await registrarLog(
        'EXCLUIR_AULA',
        'aula',
        id,
        `Aula excluída: Turma ${aula?.turma || ''} no ambiente ${aula?.sala || ''} (${aula?.data || ''} - ${aula?.turno || ''})`
      );
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const addAula = async (aulaData: Omit<Aula, 'id'>) => { 
    try {
      const formattedSala = formatarNomeSala(aulaData.sala) || aulaData.sala;
      const turnoCalculado = aulaData.inicio 
        ? calcularTurnoPorHorario(aulaData.inicio) 
        : (aulaData.turno || 'Vespertino');

      const conflito = verificarConflitoAmbiente(formattedSala, aulaData.data, turnoCalculado);
      if (conflito) {
        const msg = `Conflito de ambiente: O ambiente "${formattedSala}" já está alocado para a turma "${conflito.turma}" na data ${aulaData.data} (${turnoCalculado}). Não é permitido o mesmo ambiente com duas turmas.`;
        avisar(msg, 'info');
        throw new Error(msg);
      }

      const aulasCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas');
      const formattedUC = formatarUnidadeCurricular(aulaData.unidade_curricular);
      const newAula = {
        ...aulaData,
        modificadoManualmente: true,
        origem: aulaData.origem === 'reserva' ? 'reserva' : 'manual',
        sala: formattedSala,
        turno: turnoCalculado,
        unidade_curricular: formattedUC,
        titulo: aulaData.turma,
        descricao: formattedUC,
        ativa: true,
        criadaEm: serverTimestamp(),
        ordem: aulas.length
      };
      await addDoc(aulasCollectionRef, newAula); 
      const metaDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'meta', 'sync');
      await setDoc(metaDocRef, { updatedAt: serverTimestamp(), timestamp: Date.now() }, { merge: true });

      await registrarLog(
        'CRIAR_AULA',
        'aula',
        `${aulaData.turma} - ${aulaData.sala}`,
        `Aula cadastrada: Turma "${aulaData.turma}" no ambiente "${aulaData.sala}", Instrutor "${aulaData.instrutor}", Data ${aulaData.data} (${turnoCalculado})`
      );
    } catch (e: any) {
      console.error("Erro ao adicionar aula:", e);
      throw e;
    }
  };

  const updateAulasFromCSV = async (dados: Omit<Aula, 'id'>[]) => {
    setLoading(true);
    setError(null);
    try { await persistirAulasImportadas(dados, 'Importacao CSV'); }
    catch (e: any) { setError(e.message); throw e; }
    finally { setLoading(false); }
  };

  const clearAulas = async () => {
    if (await confirmar("Apagar todas as aulas de hoje em diante?", { texto: "O painel das TVs fica vazio até uma nova planilha ser importada. O histórico de dias anteriores é mantido. Não dá para desfazer.", perigo: true, confirmar: "Apagar cronograma" })) {
        const hojeIso = dataLocal();
        const aulasCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas');
        const currentDocs = await getDocs(aulasCollectionRef);
        const CHUNK_SIZE = 490;
        const deletePromises: Promise<void>[] = [];
        let deleteBatch = writeBatch(db);
        let deleteCount = 0;
        
        currentDocs.forEach((d) => {
            // O histórico (dias anteriores) nunca é apagado por aqui.
            if (dataISO((d.data() as Aula).data) < hojeIso) return;
            deleteBatch.delete(d.ref);
            deleteCount++;
            if (deleteCount === CHUNK_SIZE) {
                deletePromises.push(deleteBatch.commit());
                deleteBatch = writeBatch(db);
                deleteCount = 0;
            }
        });
        if (deleteCount > 0) {
            deletePromises.push(deleteBatch.commit());
        }
        await Promise.all(deletePromises);

        const metaDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'meta', 'sync');
        await setDoc(metaDocRef, { updatedAt: serverTimestamp(), timestamp: Date.now() }, { merge: true });

        await registrarLog('LIMPAR_AULAS', 'aulas', 'todas', 'Todas as aulas do cronograma foram removidas');
    }
  };

  const bloquearAmbienteManutencao = async (sala: string, motivo: string, inicio: string, fim?: string) => {
    if (!sala.trim() || !motivo.trim() || !dataBRNumero(inicio) || (fim && (!dataBRNumero(fim) || dataBRNumero(fim) < dataBRNumero(inicio)))) throw new Error('Informe motivo e datas válidas para a manutenção.');
    const registro = { sala, motivo: motivo.trim(), inicio, fim: fim || null, ativo: true, criadoPor: auth.currentUser?.email || 'Gestor', criadoEm: serverTimestamp() };
    const ref = await addDoc(collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'manutencoes'), registro);
    await registrarLog('BLOQUEAR_MANUTENCAO', 'manutencao', ref.id, `${sala}: ${motivo}`);
  };
  const liberarAmbienteManutencao = async (id: string) => {
    await updateDoc(doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'manutencoes', id), { ativo: false });
    await registrarLog('LIBERAR_MANUTENCAO', 'manutencao', id, 'Ambiente liberado da manutenção');
  };
  const sincronizarPlanilha = async (id: string, dados?: Partial<AgendamentoSala>) => {
    const dadosDisponiveis = dados || agendamentos.find(a => a.id === id);
    const referencia = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentos', id);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const resposta = await fetch('/api/agendamento-planilha', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) }, body: JSON.stringify({ agendamentoId: id, ...(dadosDisponiveis ? { dados: dadosDisponiveis } : {}) }), signal: AbortSignal.timeout(30000) });
      if (!resposta.ok) {
        const retorno = await resposta.json().catch(() => ({}));
        const mensagem = typeof retorno.error === 'string' && retorno.error.startsWith('Planilha') ? retorno.error : `Falha ao sincronizar planilha (HTTP ${resposta.status})`;
        throw new Error(mensagem);
      }
      await updateDoc(referencia, { planilhaSyncErro: null, planilhaSyncEm: serverTimestamp() });
    } catch (erro: any) {
      console.warn('Falha na sincronização do agendamento com a planilha');
      const mensagem = erro.name === 'TimeoutError' ? 'Tempo limite ao sincronizar planilha' : erro.message || 'Falha ao sincronizar planilha';
      await updateDoc(referencia, { planilhaSyncErro: mensagem, planilhaSyncEm: serverTimestamp() }).catch(() => console.warn('Falha ao registrar diagnóstico de sincronização'));
    }
  };

  const clearAulasHistory = async () => {
    if (await confirmar("Apagar o histórico com mais de 3 meses?", { texto: "As aulas mais recentes são mantidas. Não dá para desfazer.", perigo: true, confirmar: "Apagar histórico antigo" })) {
        const aulasCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas');
        const currentDocs = await getDocs(aulasCollectionRef);
        const CHUNK_SIZE = 490;
        const deletePromises: Promise<void>[] = [];
        let deleteBatch = writeBatch(db);
        let deleteCount = 0;

        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const thresholdIso = dataLocal(threeMonthsAgo);

        currentDocs.forEach((d) => {
            const aulaData = d.data() as Aula;
            if (dataISO(aulaData.data) < thresholdIso) {
                deleteBatch.delete(d.ref);
                deleteCount++;
                if (deleteCount === CHUNK_SIZE) {
                    deletePromises.push(deleteBatch.commit());
                    deleteBatch = writeBatch(db);
                    deleteCount = 0;
                }
            }
        });
        if (deleteCount > 0) {
            deletePromises.push(deleteBatch.commit());
        }
        await Promise.all(deletePromises);

        const metaDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'meta', 'sync');
        await setDoc(metaDocRef, { updatedAt: serverTimestamp(), timestamp: Date.now() }, { merge: true });

        await registrarLog('LIMPAR_HISTORICO', 'aulas', 'todas', 'Histórico de aulas com mais de 3 meses foi removido');
        avisar("Histórico antigo limpo com sucesso!", 'sucesso');
    }
  };

  const buscarAgendamento = async (id: string): Promise<AgendamentoSala> => {
    const atual = agendamentos.find(a => a.id === id);
    if (atual) return atual;
    const snap = await getDoc(doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentos', id));
    if (!snap.exists()) throw new Error('Agendamento não encontrado.');
    return { ...snap.data(), id: snap.id } as AgendamentoSala;
  };

  // A escrita atômica é preferida; se o espelho falhar, preservar a operação principal.
  const gravarReserva = async (id: string, dados: (Partial<AgendamentoSala> & { timestamp?: number }) | null, completo?: Partial<AgendamentoSala>, nova = false) => {
    const principal = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentos', id);
    const publico = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentosPublicos', id);
    const payload = dados && { ...dados, atualizadoEm: serverTimestamp() };
    const batch = writeBatch(db);
    if (!payload) { batch.delete(principal); batch.delete(publico); }
    else {
      if (nova) batch.set(principal, payload);
      else batch.update(principal, payload);
      batch.set(publico, montarAgendamentoPublico({ ...completo, ...payload }));
    }
    try { await batch.commit(); }
    catch (err) {
      console.warn('Aviso ao gravar reserva junto ao espelho público; tentando operação principal:', err);
      if (!payload) await deleteDoc(principal);
      else if (nova) await setDoc(principal, payload);
      else await updateDoc(principal, payload);
    }
  };

  const solicitarAgendamento = async (dados: Omit<AgendamentoSala, 'id' | 'status' | 'criadoEm'>): Promise<string> => {
    try {
      const erroContato = validarContatoAgendamento(dados, import.meta.env.VITE_EMAIL_DOMINIOS_CORPORATIVOS);
      if (erroContato) throw new Error(erroContato);
      const { canalNotificacao: _canalLegado, telefoneSolicitante, consentimentoWhatsappEm, consentimentoWhatsappTexto, ...dadosSemContato } = dados;
      if (estaEmManutencao(dados.sala, dados.data, manutencoes)) throw new Error('Ambiente em manutenção nesta data.');
      const agendamentosCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentos');
      const docRef = doc(agendamentosCollectionRef);
      const payload = {
        ...dadosSemContato,
        emailSolicitante: dados.emailSolicitante.trim(),
        notificarWhatsapp: dados.notificarWhatsapp === true,
        ...(dados.notificarWhatsapp ? { telefoneSolicitante: normalizarTelefone(telefoneSolicitante), consentimentoWhatsappEm, consentimentoWhatsappTexto } : {}),
        sala: formatarNomeSala(dados.sala) || dados.sala,
        status: 'pendente' as const,
        criadoEm: serverTimestamp(),
        timestamp: Date.now()
      };
      await gravarReserva(docRef.id, payload, undefined, true);
      void sincronizarPlanilha(docRef.id, payload);
      return docRef.id;
    } catch (e: any) {
      console.error("Erro ao registrar solicitação de agendamento:", e);
      throw new Error(e.message || "Erro ao salvar solicitação no banco.");
    }
  };

  const aprovarAgendamento = async (id: string, criarAulaAutomatica: boolean = true, aprovador: string = 'Gestor', observacaoAprovacao: string = '') => {
    try {
      const agendamento = await buscarAgendamento(id);
      if (!agendamento) throw new Error("Agendamento não encontrado.");

      if (estaEmManutencao(agendamento.sala, agendamento.data, manutencoes)) throw new Error('Não é possível aprovar: ambiente em manutenção nesta data.');
      await gravarReserva(id, {
        status: 'aprovado',
        observacaoDecisao: observacaoAprovacao.trim(),
        criarAulaAoAprovar: criarAulaAutomatica,
        decididoPor: aprovador,
        decididoEm: serverTimestamp(),
        aprovadoPor: aprovador,
        aprovadoEm: serverTimestamp(),
      }, agendamento);

      void sincronizarPlanilha(id, { ...agendamento, status: 'aprovado', observacaoDecisao: observacaoAprovacao.trim() });
      if (criarAulaAutomatica) {
        const inicioPadrao = agendamento.horarioInicio || (
          agendamento.turno === 'Matutino' ? '07:00' :
          agendamento.turno === 'Vespertino' ? '13:00' : '18:00'
        );
        const fimPadrao = agendamento.horarioFim || (
          agendamento.turno === 'Matutino' ? '11:30' :
          agendamento.turno === 'Vespertino' ? '17:30' : '22:00'
        );

        const conflito = verificarConflitoAmbiente(agendamento.sala, agendamento.data, agendamento.turno);
        if (!conflito) {
          await addAula({
            origem: 'reserva',
            data: agendamento.data,
            sala: agendamento.sala,
            turma: agendamento.turma || `Reserva - ${agendamento.solicitante}`,
            instrutor: agendamento.solicitante,
            unidade_curricular: agendamento.disciplina || agendamento.motivo || 'Atividade Agendada',
            inicio: inicioPadrao,
            fim: fimPadrao,
            turno: agendamento.turno
          });
        }
      }

      const metaDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'meta', 'sync');
      await setDoc(metaDocRef, { updatedAt: serverTimestamp(), timestamp: Date.now() }, { merge: true });

      await registrarLog(
        'APROVAR_AGENDAMENTO',
        'agendamento',
        id,
        `Reserva de ambiente aprovada por ${aprovador}: Sala ${agendamento.sala} para o professor ${agendamento.solicitante} (${agendamento.data} - ${agendamento.turno})`
      );
    } catch (e: any) {
      console.error("Erro ao aprovar agendamento:", e);
      throw e;
    }
  };

  const rejeitarAgendamento = async (id: string, motivoRejeicao?: string) => {
    if (!motivoRejeicao?.trim()) throw new Error('O motivo da recusa é obrigatório.');
    try {
      const agendamento = await buscarAgendamento(id);
      const user = auth.currentUser;
      const responsavel = user?.email || 'Coordenação';

      await gravarReserva(id, {
        status: 'rejeitado',
        observacaoDecisao: motivoRejeicao.trim(),
        decididoPor: responsavel,
        decididoEm: serverTimestamp(),
        motivoRejeicao: motivoRejeicao || 'Não autorizado pela coordenação'
      }, agendamento);

      void sincronizarPlanilha(id, { ...agendamento, status: 'rejeitado', motivoRejeicao: motivoRejeicao.trim(), observacaoDecisao: motivoRejeicao.trim() });
      await registrarLog(
        'REJEITAR_AGENDAMENTO',
        'agendamento',
        id,
        `Reserva de ambiente rejeitada por ${responsavel}: Sala ${agendamento?.sala || ''} do professor ${agendamento?.solicitante || ''}. Motivo: ${motivoRejeicao || 'Não autorizado'}`
      );
    } catch (e) {
      console.error("Erro ao rejeitar agendamento:", e);
      throw e;
    }
  };

  const excluirAgendamento = async (id: string) => {
    try {
      const agendamento = await buscarAgendamento(id);
      await gravarReserva(id, null);

      await registrarLog(
        'EXCLUIR_AGENDAMENTO',
        'agendamento',
        id,
        `Reserva de sala ${agendamento?.sala || ''} para ${agendamento?.solicitante || ''} foi excluída`
      );
    } catch (e) {
      console.error("Erro ao excluir agendamento:", e);
    }
  };

  const updatePainelClienteConfig = async (newConfig: Partial<PainelClienteConfig>) => {
    try {
      const painelClienteDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'meta', 'painelCliente');
      const updated = {
        ...painelClienteConfig,
        ...newConfig,
        updatedAt: serverTimestamp()
      };
      await setDoc(painelClienteDocRef, updated, { merge: true });
      await registrarLog(
        'EDITAR_PAINEL_CLIENTE',
        'painelCliente',
        'config',
        'Configurações do Painel do Cliente / Recepção atualizadas'
      );
    } catch (e: any) {
      console.error("Erro ao atualizar painelCliente:", e);
      throw e;
    }
  };

  const salvarObservacaoLimpeza = async (sala: string, observacao: string) => {
    try {
      const norm = normalizarNomeAmbiente(sala);
      const docId = norm
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      if (!docId) return;

      const docRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'limpeza', docId);
      const user = auth.currentUser;
      const userIdentificador = user?.displayName || user?.email || 'Gestor';

      if (!observacao.trim()) {
        await deleteDoc(docRef);
        setObservacoesLimpeza(prev => {
          const novo = { ...prev };
          delete novo[norm];
          return novo;
        });
        await registrarLog(
          'REMOVER_OBSERVACAO_LIMPEZA',
          'limpeza',
          sala,
          `Observação removida do ambiente: ${sala}`
        );
        return;
      }

      const payload: ObservacaoLimpeza = {
        sala: formatarNomeSala(sala) || sala,
        observacao: observacao.trim(),
        atualizadoEm: serverTimestamp(),
        atualizadoPor: userIdentificador
      };

      await setDoc(docRef, payload, { merge: true });
      setObservacoesLimpeza(prev => ({
        ...prev,
        [norm]: {
          ...payload,
          id: docId,
          atualizadoEm: new Date()
        }
      }));

      await registrarLog(
        'ATUALIZAR_OBSERVACAO_LIMPEZA',
        'limpeza',
        sala,
        `Observação do ambiente ${sala}: "${observacao.trim()}"`
      );
    } catch (e: any) {
      console.error("Erro ao salvar observação de limpeza:", e);
      throw e;
    }
  };

  const removerObservacaoLimpeza = async (sala: string) => {
    await salvarObservacaoLimpeza(sala, '');
  };

  const criarAlerta = async (mensagem: string) => {
    try {
      const alertasColl = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'alertas');
      const user = auth.currentUser;
      const criadoPor = user?.email || 'admin';

      await addDoc(alertasColl, {
        mensagem,
        ativo: true,
        criadoPor,
        criadoEm: serverTimestamp()
      });
      await registrarLog('CRIAR_ALERTA', 'alerta', 'novo', `Alerta enviado: "${mensagem}"`);
    } catch (err: any) {
      console.error("Erro ao criar alerta:", err);
      throw new Error("Erro ao disparar o alerta.");
    }
  };

  const marcarAlertaLido = async (id: string) => {
    try {
      const user = auth.currentUser;
      const lidoPor = user?.email || 'usuario';
      const alertaDoc = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'alertas', id);
      await updateDoc(alertaDoc, {
        ativo: false,
        lidoPor,
        lidoEm: serverTimestamp()
      });
      await registrarLog('LIDO_ALERTA', 'alerta', id, `Alerta marcado como lido por ${lidoPor}`);
    } catch (err) {
      console.error("Erro ao marcar alerta como lido:", err);
    }
  };

  return (
    <DataContext.Provider value={{ 
      manutencoes, bloquearAmbienteManutencao, liberarAmbienteManutencao,
      aulas, anuncios, agendamentos, agendamentosPublicos, assinarAgendamentos, salasCadastradas, painelClienteConfig, observacoesLimpeza, alertas, loading, error, isOffline,
      addAula, updateAulasFromCSV, updateAula, deleteAula, 
      clearAulas, clearAulasHistory, addAnuncio, deleteAnuncio, replaceAnuncio, reorderAnuncios, clearAllAnuncios,
      uploadMediaFile, uploadCSV, syncSource, updatePainelClienteConfig,
      solicitarAgendamento, aprovarAgendamento, rejeitarAgendamento, excluirAgendamento, sincronizarPlanilha,
      adicionarAmbiente, excluirAmbiente, salvarObservacaoLimpeza, removerObservacaoLimpeza,
      criarAlerta, marcarAlertaLido, registrarLog
    }}>
      {children}
    </DataContext.Provider>
  );
};

/** O efeito libera a referência ao desmontar ou trocar de modo. */
export function useAgendamentos(modo: 'completo'): AgendamentoSala[];
export function useAgendamentos(modo: 'publico'): ReservaPublica[];
export function useAgendamentos(modo: ModoAgendamentos) {
  const context = React.useContext(DataContext);
  const assinar = context?.assinarAgendamentos;
  useEffect(() => assinar?.(modo), [assinar, modo]);
  return (modo === 'completo' ? context?.agendamentos : context?.agendamentosPublicos) || [];
}
