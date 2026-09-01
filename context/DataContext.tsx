import React, { createContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { upload as vercelBlobUpload } from '@vercel/blob/client';
import { Aula, Anuncio, Aluno, AgendamentoSala, DataContextType, AuditAction } from '../types';
import { db, storage, auth } from '../firebase';
import { formatarUnidadeCurricular } from '../utils/curricularUnits';
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

const FIRESTORE_ROOT_COLLECTION = 'porto';
const FIRESTORE_DATA_DOCUMENT = 'dados';

export const normalizarNomeAmbiente = (nome: string): string => {
  if (!nome) return '';
  return nome
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
};

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

const calcularTurnoPorHorario = (horarioStr: string): string => {
    if (!horarioStr || !horarioStr.includes(':')) return 'Matutino';
    const [horas, minutos] = horarioStr.split(':').map(Number);
    const totalMinutos = (horas * 60) + (minutos || 0);
    if (totalMinutos >= 360 && totalMinutos < 710) return 'Matutino';
    if (totalMinutos >= 710 && totalMinutos < 1070) return 'Vespertino';
    return 'Noturno';
};

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

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [agendamentos, setAgendamentos] = useState<AgendamentoSala[]>([]);
  const [ambientesPersonalizados, setAmbientesPersonalizados] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncSource, setSyncSource] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  const isInitialAulasLoadedRef = React.useRef(false);
  const lastAulasHashRef = React.useRef<string>('');
  const reloadTimeoutRef = React.useRef<any>(null);
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

    // 1. Ambientes personalizados
    ambientesPersonalizados.forEach(item => {
      if (item.nome && item.nome.trim()) {
        const norm = normalizarNomeAmbiente(item.nome);
        if (!salasMap.has(norm)) {
          salasMap.set(norm, item.nome.trim());
        }
      }
    });

    // 2. Salas das aulas
    aulas.forEach(a => {
      if (a.sala && a.sala.trim()) {
        const norm = normalizarNomeAmbiente(a.sala);
        if (!salasMap.has(norm)) {
          salasMap.set(norm, a.sala.trim());
        }
      }
    });

    // 3. Salas dos agendamentos
    agendamentos.forEach(ag => {
      if (ag.sala && ag.sala.trim()) {
        const norm = normalizarNomeAmbiente(ag.sala);
        if (!salasMap.has(norm)) {
          salasMap.set(norm, ag.sala.trim());
        }
      }
    });

    return Array.from(salasMap.values()).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' }));
  }, [aulas, agendamentos, ambientesPersonalizados]);

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
      window.location.reload();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkInterval = setInterval(() => {
      if (typeof navigator !== 'undefined') {
        const currentlyOnline = navigator.onLine;
        setIsOffline(prev => {
          if (prev && currentlyOnline) {
            window.location.reload();
          }
          return !currentlyOnline;
        });
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
    const alunosCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'alunos');
    const agendamentosCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentos');
    const ambientesCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'ambientes');
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

    const qAulas = query(aulasCollectionRef, orderBy('ordem', 'asc'));
    const unsubAulas = onSnapshot(qAulas, { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.metadata.fromCache && !navigator.onLine) {
        setIsOffline(true);
      }

      const batchUpdates: Promise<void>[] = [];
      const aulasData = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        const formattedUC = formatarUnidadeCurricular(d.unidade_curricular);
        
        if (d.unidade_curricular !== formattedUC && navigator.onLine) {
          batchUpdates.push(
            updateDoc(docSnap.ref, { 
              unidade_curricular: formattedUC, 
              descricao: formattedUC 
            }).catch(() => {})
          );
        }

        return {
          ...d,
          id: docSnap.id,
          unidade_curricular: formattedUC
        };
      }) as Aula[];
      const currentHash = aulasData.map(a => `${a.id}_${a.turma}_${a.sala}_${a.inicio}_${a.unidade_curricular}`).join('|');

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

    const unsubAlunos = onSnapshot(alunosCollectionRef, (snapshot) => {
      const alunosData = snapshot.docs.map(doc => ({ 
        id: doc.id,
        nome: doc.data().nome || doc.data().aluno || "Aluno sem nome",
        turma: doc.data().turma || "",
        status: doc.data().status || "Ativo"
      })) as Aluno[];
      setAlunos(alunosData);
    });

    const unsubAgendamentos = onSnapshot(agendamentosCollectionRef, (snapshot) => {
      const agendamentosData = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          sala: d.sala || '',
          data: d.data || '',
          turno: d.turno || 'Matutino',
          horarioInicio: d.horarioInicio || '',
          horarioFim: d.horarioFim || '',
          solicitante: d.solicitante || '',
          emailSolicitante: d.emailSolicitante || '',
          turma: d.turma || '',
          disciplina: d.disciplina || '',
          motivo: d.motivo || '',
          status: d.status || 'pendente',
          motivoRejeicao: d.motivoRejeicao || '',
          aprovadoPor: d.aprovadoPor || '',
          aprovadoEm: d.aprovadoEm || null,
          criadoEm: d.criadoEm || null,
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

      setAgendamentos(agendamentosData);
    }, (err) => {
      console.warn("Aviso listener agendamentos:", err);
    });

    return () => {
      unsubMeta();
      unsubAmbientes();
      unsubAulas();
      unsubAnuncios();
      unsubAlunos();
      unsubAgendamentos();
      clearTimeout(reloadTimeoutRef.current);
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
          await fetch(`/api/upload?url=${encodeURIComponent(storagePath)}`, { method: 'DELETE' });
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
          await fetch(`/api/upload?url=${encodeURIComponent(oldStoragePath)}`, { method: 'DELETE' });
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
          fetch(`/api/upload?url=${encodeURIComponent(data.storagePath)}`, { method: 'DELETE' }).catch(() => {});
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

      globalOrder++;
      return [{
        data: dataVal,
        sala: salaVal,
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

      // Desduplicação rigorosa: impede turmas duplicadas no mesmo ambiente/data/turno
      const uniqueAulasMap = new Map<string, Omit<Aula, 'id'>>();
      processed.forEach(aula => {
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
      
      const aulasCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas');
      const CHUNK_SIZE = 490;

      const currentDocs = await getDocs(aulasCollectionRef);
      const deletePromises: Promise<void>[] = [];
      let deleteBatch = writeBatch(db);
      let deleteCount = 0;
      
      currentDocs.forEach((d) => {
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

      const addPromises: Promise<void>[] = [];
      let addBatch = writeBatch(db);
      let addCount = 0;

      uniqueAulas.forEach((aula, index) => {
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
        totalAulas: uniqueAulas.length,
        source: file.name
      }, { merge: true });

      await registrarLog(
        'IMPORTAR_CSV',
        'csv',
        file.name,
        `Planilha ${file.name} importada com ${uniqueAulas.length} aulas sem duplicidades de ambientes`
      );

      setSyncSource(file.name);
      alert(`${uniqueAulas.length} aulas sincronizadas com sucesso! Conflitos e duplicidades de salas foram eliminados.`);
    } catch (e: any) {
      setError(e.message);
      alert("Erro ao processar arquivo: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateAula = async (id: string, aula: Partial<Aula>) => {
    try {
      const aulaAtual = aulas.find(a => a.id === id);
      const novaSala = aula.sala || aulaAtual?.sala || '';
      const novaData = aula.data || aulaAtual?.data || '';
      const novoTurno = aula.turno || (aula.inicio ? calcularTurnoPorHorario(aula.inicio) : aulaAtual?.turno) || 'Matutino';

      const conflito = verificarConflitoAmbiente(novaSala, novaData, novoTurno, id);
      if (conflito) {
        const msg = `Conflito no ambiente: O ambiente "${novaSala}" já possui a turma "${conflito.turma}" alocada na data ${novaData} (${novoTurno}). Não é permitido o mesmo ambiente com duas turmas no mesmo horário.`;
        alert(msg);
        throw new Error(msg);
      }

      const sanitizedAula = { ...aula };
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
        `Horário/dados alterados para a turma ${sanitizedAula.turma || aulaAtual?.turma} no ambiente ${novaSala}`
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
      const turnoCalculado = aulaData.turno || (aulaData.inicio ? calcularTurnoPorHorario(aulaData.inicio) : 'Matutino');

      const conflito = verificarConflitoAmbiente(aulaData.sala, aulaData.data, turnoCalculado);
      if (conflito) {
        const msg = `Conflito de ambiente: O ambiente "${aulaData.sala}" já está alocado para a turma "${conflito.turma}" na data ${aulaData.data} (${turnoCalculado}). Não é permitido o mesmo ambiente com duas turmas.`;
        alert(msg);
        throw new Error(msg);
      }

      const aulasCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas');
      const formattedUC = formatarUnidadeCurricular(aulaData.unidade_curricular);
      const newAula = {
        ...aulaData,
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

  const updateAulasFromCSV = () => {};

  const clearAulas = async () => {
    if (confirm("Limpar todas as aulas do cronograma?")) {
        const aulasCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas');
        const currentDocs = await getDocs(aulasCollectionRef);
        const CHUNK_SIZE = 490;
        const deletePromises: Promise<void>[] = [];
        let deleteBatch = writeBatch(db);
        let deleteCount = 0;
        
        currentDocs.forEach((d) => {
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

  const solicitarAgendamento = async (dados: Omit<AgendamentoSala, 'id' | 'status' | 'criadoEm'>): Promise<string> => {
    try {
      const agendamentosCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentos');
      const docRef = await addDoc(agendamentosCollectionRef, {
        ...dados,
        status: 'pendente',
        criadoEm: serverTimestamp(),
        timestamp: Date.now()
      });
      return docRef.id;
    } catch (e: any) {
      console.error("Erro ao registrar solicitação de agendamento:", e);
      throw new Error(e.message || "Erro ao salvar solicitação no banco.");
    }
  };

  const aprovarAgendamento = async (id: string, criarAulaAutomatica: boolean = true, aprovador: string = 'Gestor') => {
    try {
      const agendamento = agendamentos.find(a => a.id === id);
      if (!agendamento) throw new Error("Agendamento não encontrado.");

      const agendamentoDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentos', id);
      await updateDoc(agendamentoDocRef, {
        status: 'aprovado',
        aprovadoPor: aprovador,
        aprovadoEm: serverTimestamp(),
      });

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
      alert("Erro ao aprovar agendamento: " + (e.message || ''));
    }
  };

  const rejeitarAgendamento = async (id: string, motivoRejeicao?: string) => {
    try {
      const agendamento = agendamentos.find(a => a.id === id);
      const user = auth.currentUser;
      const responsavel = user?.email || 'Coordenação';

      const agendamentoDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentos', id);
      await updateDoc(agendamentoDocRef, {
        status: 'rejeitado',
        motivoRejeicao: motivoRejeicao || 'Não autorizado pela coordenação'
      });

      await registrarLog(
        'REJEITAR_AGENDAMENTO',
        'agendamento',
        id,
        `Reserva de ambiente rejeitada por ${responsavel}: Sala ${agendamento?.sala || ''} do professor ${agendamento?.solicitante || ''}. Motivo: ${motivoRejeicao || 'Não autorizado'}`
      );
    } catch (e) {
      console.error("Erro ao rejeitar agendamento:", e);
      alert("Erro ao atualizar agendamento.");
    }
  };

  const excluirAgendamento = async (id: string) => {
    try {
      const agendamento = agendamentos.find(a => a.id === id);
      const agendamentoDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentos', id);
      await deleteDoc(agendamentoDocRef);

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

  return (
    <DataContext.Provider value={{ 
      aulas, anuncios, alunos, agendamentos, salasCadastradas, loading, error, isOffline,
      addAula, updateAulasFromCSV, updateAula, deleteAula, 
      clearAulas, addAnuncio, deleteAnuncio, replaceAnuncio, reorderAnuncios, clearAllAnuncios,
      uploadMediaFile, uploadCSV, syncSource,
      solicitarAgendamento, aprovarAgendamento, rejeitarAgendamento, excluirAgendamento,
      adicionarAmbiente, excluirAmbiente, registrarLog
    }}>
      {children}
    </DataContext.Provider>
  );
};
