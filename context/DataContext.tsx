
import React, { createContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { upload as vercelBlobUpload } from '@vercel/blob/client';
import { Aula, Anuncio, Aluno, AgendamentoSala, DataContextType } from '../types';
import { db, storage } from '../firebase';
import { formatarUnidadeCurricular } from '../utils/curricularUnits';
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
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';

declare const XLSX: any;

export interface ExtendedDataContextType extends DataContextType {
  uploadCSV: (file: File) => Promise<void>;
  syncSource: string | null;
}

export const DataContext = createContext<ExtendedDataContextType | undefined>(undefined);

// Constantes para a nova estrutura do Firestore
const FIRESTORE_ROOT_COLLECTION = 'porto';
const FIRESTORE_DATA_DOCUMENT = 'dados';

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

        // Tentar JPEG com qualidade 0.82 (proporciona imagens nítidas < 300KB)
        let quality = 0.82;
        let compressed = canvas.toDataURL('image/jpeg', quality);

        // Se ainda for grande (> 650KB), reduz a qualidade gradualmente
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
    // 06:00 até 11:49:59 (360 até 709 minutos) -> Matutino
    if (totalMinutos >= 360 && totalMinutos < 710) return 'Matutino';
    // 11:50 até 17:49:59 (710 até 1069 minutos) -> Vespertino
    if (totalMinutos >= 710 && totalMinutos < 1070) return 'Vespertino';
    // 17:50 até 05:59:59 -> Noturno
    return 'Noturno';
};

const formatarDataCSV = (valor: any): string => {
  if (!valor) return '';
  const valStr = String(valor).trim();

  // Se já for DD/MM/YYYY ou D/M/YYYY
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

  // Se for YYYY-MM-DD
  if (valStr.includes('-')) {
    const parts = valStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
  }

  // Fallback para número serial do Excel
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncSource, setSyncSource] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  // Referências para controle de recarregamento em tempo real
  const isInitialAulasLoadedRef = React.useRef(false);
  const lastAulasHashRef = React.useRef<string>('');
  const reloadTimeoutRef = React.useRef<any>(null);
  const isInitialMetaLoadedRef = React.useRef(false);

  // Lista unificada e dinâmica de todas as salas cadastradas no sistema (apenas salas reais das aulas importadas do CSV ou agendamentos)
  const salasCadastradas = useMemo(() => {
    const salasSet = new Set<string>();

    // Salas vindas exclusivamente das aulas importadas do CSV/Firestore
    aulas.forEach(a => {
      if (a.sala && a.sala.trim()) {
        salasSet.add(a.sala.trim());
      }
    });

    // Salas vindas de agendamentos reais cadastrados
    agendamentos.forEach(ag => {
      if (ag.sala && ag.sala.trim()) {
        salasSet.add(ag.sala.trim());
      }
    });

    return Array.from(salasSet).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' }));
  }, [aulas, agendamentos]);

  // 1. Monitoramento de Conexão com a Internet (Online / Offline)
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Quando a internet voltar, recarrega a página para puxar os dados mais novos do banco
      window.location.reload();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificação periódica de conectividade ativa
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

  // 2. Listeners do Firestore em Tempo Real e Auto-Reload
  useEffect(() => {
    const aulasCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas');
    const anunciosCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'anuncios');
    const alunosCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'alunos');
    const agendamentosCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentos');
    const metaDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'meta', 'sync');

    // Listener para o documento de sincronização global (disparado ao importar novo CSV ou salvar)
    const unsubMeta = onSnapshot(metaDocRef, (docSnap) => {
      if (!isInitialMetaLoadedRef.current) {
        isInitialMetaLoadedRef.current = true;
        return;
      }
    }, (err) => {
      console.warn("Aviso listener meta sync:", err);
    });

    // Listener para Aulas ordenadas
    const qAulas = query(aulasCollectionRef, orderBy('ordem', 'asc'));
    const unsubAulas = onSnapshot(qAulas, { includeMetadataChanges: true }, (snapshot) => {
      // Se o snapshot veio estritamente do cache e não há conexão, sinaliza offline
      if (snapshot.metadata.fromCache && !navigator.onLine) {
        setIsOffline(true);
      }

      const batchUpdates: Promise<void>[] = [];
      const aulasData = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        const formattedUC = formatarUnidadeCurricular(d.unidade_curricular);
        
        // Se o banco ainda contém o texto corrompido ou com (CH: ...), atualiza em background
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

    // Listener para Anúncios (ordenados pelo campo 'ordem' ou data de criação)
    const unsubAnuncios = onSnapshot(anunciosCollectionRef, (snapshot) => {
      const anunciosData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Anuncio[];
      // Ordenação rigorosa por 'ordem' para respeitar a sequência configurada pelo administrador
      anunciosData.sort((a, b) => {
        const orderA = typeof a.ordem === 'number' ? a.ordem : 999;
        const orderB = typeof b.ordem === 'number' ? b.ordem : 999;
        if (orderA !== orderB) return orderA - orderB;
        // Fallback para timestamp
        const timeA = a.createdAt?.toMillis?.() || a.createdAt || 0;
        const timeB = b.createdAt?.toMillis?.() || b.createdAt || 0;
        return timeA - timeB;
      });
      setAnuncios(anunciosData);
    }, (err) => {
      console.error("Erro ao carregar anúncios do Firestore:", err);
    });

    // Listener para Alunos
    const unsubAlunos = onSnapshot(alunosCollectionRef, (snapshot) => {
      const alunosData = snapshot.docs.map(doc => ({ 
        id: doc.id,
        nome: doc.data().nome || doc.data().aluno || "Aluno sem nome",
        turma: doc.data().turma || "",
        status: doc.data().status || "Ativo"
      })) as Aluno[];
      setAlunos(alunosData);
    });

    // Listener para Agendamentos de Salas
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

      // Ordenar: pendentes primeiro, depois por data mais recente
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
      unsubAulas();
      unsubAnuncios();
      unsubAlunos();
      unsubAgendamentos();
      clearTimeout(reloadTimeoutRef.current);
    };
  }, []);

  const uploadMediaFile = async (file: File): Promise<{ src: string; type: 'image' | 'video'; storagePath?: string; name: string }> => {
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
    const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';

    let lastError: any = null;

    // 0. TENTATIVA 0: Cloudinary (Upload Direto Unsigned do Navegador)
    const cloudinaryCloudName = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || localStorage.getItem('CLOUDINARY_CLOUD_NAME') || 'dlrdwblso').trim();
    const cloudinaryPreset = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || localStorage.getItem('CLOUDINARY_UPLOAD_PRESET') || '').trim();

    if (cloudinaryCloudName && cloudinaryPreset) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryPreset);
        
        const resourceType = isVideo ? 'video' : 'image';
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/${resourceType}/upload`;

        const clResponse = await fetch(cloudinaryUrl, {
          method: 'POST',
          body: formData,
        });

        if (clResponse.ok) {
          const clData = await clResponse.json();
          if (clData.secure_url || clData.url) {
            return {
              src: clData.secure_url || clData.url,
              type: mediaType,
              storagePath: clData.public_id || clData.secure_url,
              name: file.name
            };
          }
        } else {
          const errData = await clResponse.json().catch(() => ({}));
          console.warn("Cloudinary upload failed:", errData);
          const rawMsg = errData?.error?.message || '';
          let userFriendlyMsg = rawMsg;
          if (rawMsg.toLowerCase().includes('api key') || rawMsg.toLowerCase().includes('chave de api') || rawMsg.toLowerCase().includes('preset')) {
            userFriendlyMsg = `Cloudinary: O Upload Preset "${cloudinaryPreset}" não foi encontrado como "Unsigned" na nuvem "${cloudinaryCloudName}". Verifique em Cloudinary > Settings > Upload > Upload Presets.`;
          }
          lastError = new Error(userFriendlyMsg || 'Erro ao enviar para o Cloudinary');
          throw lastError;
        }
      } catch (clErr: any) {
        console.warn("Erro ao tentar Cloudinary:", clErr);
        lastError = clErr;
        throw lastError;
      }
    }

    // 1. TENTATIVA 1: Vercel Blob Storage (Upload Direto do Cliente / Browser para Vercel Blob)
    try {
      const blob = await vercelBlobUpload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });
      if (blob && blob.url) {
        return {
          src: blob.url,
          type: mediaType,
          storagePath: blob.url,
          name: file.name
        };
      }
    } catch (vercelClientErr: any) {
      console.warn("Vercel Blob Client upload indisponível:", vercelClientErr);
      lastError = vercelClientErr;
    }

    // 2. TENTATIVA 2: Vercel Blob (Endpoint /api/upload tradicional)
    try {
      const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file,
        headers: {
          'x-filename': encodeURIComponent(file.name),
          'Content-Type': file.type || 'application/octet-stream'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.url || data.downloadUrl) {
          return {
            src: data.url || data.downloadUrl,
            type: mediaType,
            storagePath: data.url || 'vercel_blob',
            name: file.name
          };
        }
      }
    } catch (vercelErr) {
      console.warn("Vercel Blob /api/upload indisponível:", vercelErr);
    }

    // 3. TENTATIVA 3: Fallback Otimizado para Imagens (Compressão < 500KB)
    if (isImage) {
      const dataUrl = await compressImageToDataUrl(file);
      return {
        src: dataUrl,
        type: 'image',
        name: file.name
      };
    } else {
      // Para vídeos: O Firestore possui limite estrito de 1MB por documento.
      const errMsg = lastError?.message || "BLOB_READ_WRITE_TOKEN não configurado no Vercel";
      throw new Error(
        `Não foi possível salvar o vídeo no Vercel Blob Storage (${errMsg}). ` +
        `Certifique-se de que a variável de ambiente BLOB_READ_WRITE_TOKEN está configurada no painel da Vercel.`
      );
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

      const nextOrdem = cleanData.ordem !== undefined ? cleanData.ordem : anuncios.length;

      await addDoc(anunciosCollectionRef, {
        ...cleanData,
        ordem: nextOrdem,
        createdAt: serverTimestamp()
      });
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
      // Atualização otimista local
      setAnuncios([...orderedAnuncios.map((ad, index) => ({ ...ad, ordem: index }))]);
    } catch (e) {
      console.error("Erro ao reordenar anúncios:", e);
      throw e;
    }
  };

  const deleteAnuncio = async (id: string, storagePath?: string) => {
    try {
      // 1. Excluir do Vercel Blob se for uma URL do Vercel
      if (storagePath && (storagePath.includes('blob.vercel-storage.com') || storagePath.startsWith('http'))) {
        try {
          await fetch(`/api/upload?url=${encodeURIComponent(storagePath)}`, { method: 'DELETE' });
        } catch (blobErr) {
          console.warn("Erro ao deletar do Vercel Blob:", blobErr);
        }
      }

      // 2. Excluir documento do Firestore
      const anuncioDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'anuncios', id);
      await deleteDoc(anuncioDocRef);
    } catch (e) {
      console.error("Erro ao deletar anúncio:", e);
      throw e;
    }
  };

  const replaceAnuncio = async (id: string, newAnuncio: Omit<Anuncio, 'id'>, oldStoragePath?: string) => {
    try {
      // 1. Excluir mídia antiga do Vercel Blob se existir
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

      // 2. Atualizar documento no Firestore
      const anuncioDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'anuncios', id);
      await updateDoc(anuncioDocRef, {
        ...cleanData,
        updatedAt: serverTimestamp()
      });
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
    } catch (e) {
      console.error("Erro ao limpar todos os anúncios:", e);
      throw e;
    }
  };

  const processCSVData = (rawJsonData: any[][]) => {
    if (!rawJsonData || rawJsonData.length === 0) {
      throw new Error("O arquivo enviado está vazio.");
    }

    // 1. Normalizar linhas (caso venha em célula única com separadores de CSV como ';' ',' ou '\t')
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

    // 2. Localizar dinamicamente a linha de cabeçalho
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

    // 3. Mapear índices das colunas
    const idx = {
      data: headers.findIndex(h => h.includes('data')),
      sala: headers.findIndex(h => (h.includes('ambiente') || h.includes('sala') || h.includes('justificativa')) && !h.includes('instrutor')),
      turma: headers.findIndex(h => h.includes('turma')),
      instrutor: headers.findIndex(h => h.includes('instrutor')),
      uc: headers.findIndex(h => h.includes('unidade') || h.includes('curricular') || h.includes('solicitante')),
      inicio: headers.findIndex(h => h.includes('inicio') || h.includes('início')),
      fim: headers.findIndex(h => h.includes('fim'))
    };

    // Fallbacks flexíveis
    if (idx.turma === -1) idx.turma = headers.findIndex(h => h.includes('tipo') && !h.includes('agenda'));
    if (idx.sala === -1) idx.sala = headers.findIndex(h => h.includes('ambiente') || h.includes('sala'));

    if (idx.data === -1 || idx.inicio === -1 || idx.turma === -1 || idx.sala === -1 || idx.instrutor === -1) {
      console.error("Cabeçalho do CSV inválido. Colunas identificadas:", { headers, idx });
      throw new Error("O arquivo CSV não possui as colunas esperadas (Data, Ambiente, Turma, Instrutor, Início). Verifique o cabeçalho do arquivo.");
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

      // Etapa de Desduplicação
      const uniqueAulasMap = new Map<string, Omit<Aula, 'id'>>();
      processed.forEach(aula => {
        const key = `${aula.data}|${aula.turma}|${aula.instrutor}|${aula.inicio}|${aula.sala}`;
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

      setSyncSource(file.name);
      alert(`${uniqueAulas.length} aulas sincronizadas com sucesso! O painel será atualizado em tempo real.`);
    } catch (e: any) {
      setError(e.message);
      alert("Erro ao processar arquivo: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateAula = async (id: string, aula: Partial<Aula>) => {
    try {
      const sanitizedAula = { ...aula };
      if (sanitizedAula.unidade_curricular !== undefined) {
        sanitizedAula.unidade_curricular = formatarUnidadeCurricular(sanitizedAula.unidade_curricular);
        sanitizedAula.descricao = sanitizedAula.unidade_curricular;
      }
      const aulaDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas', id);
      await updateDoc(aulaDocRef, sanitizedAula);
      const metaDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'meta', 'sync');
      await setDoc(metaDocRef, { updatedAt: serverTimestamp(), timestamp: Date.now() }, { merge: true });
    } catch (e) { console.error(e); }
  };

  const deleteAula = async (id: string) => {
    try {
      const aulaDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas', id);
      await deleteDoc(aulaDocRef);
      const metaDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'meta', 'sync');
      await setDoc(metaDocRef, { updatedAt: serverTimestamp(), timestamp: Date.now() }, { merge: true });
    } catch (e) { console.error(e); }
  };

  const addAula = async (aulaData: Omit<Aula, 'id'>) => { 
    try {
      const aulasCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas');
      const formattedUC = formatarUnidadeCurricular(aulaData.unidade_curricular);
      const newAula = {
        ...aulaData,
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
    } catch (e) {
      console.error("Erro ao adicionar aula:", e);
      alert("Erro ao salvar no banco.");
    }
  };

  const updateAulasFromCSV = () => {};

  const clearAulas = async () => {
    if(confirm("Limpar todas as aulas?")) {
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
      const agendamentoDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentos', id);
      await updateDoc(agendamentoDocRef, {
        status: 'aprovado',
        aprovadoPor: aprovador,
        aprovadoEm: serverTimestamp(),
      });

      // Se solicitado, adiciona automaticamente a aula correspondente no cronograma
      if (criarAulaAutomatica) {
        const agendamento = agendamentos.find(a => a.id === id);
        if (agendamento) {
          const inicioPadrao = agendamento.horarioInicio || (
            agendamento.turno === 'Matutino' ? '07:00' :
            agendamento.turno === 'Vespertino' ? '13:00' : '18:00'
          );
          const fimPadrao = agendamento.horarioFim || (
            agendamento.turno === 'Matutino' ? '11:30' :
            agendamento.turno === 'Vespertino' ? '17:30' : '22:00'
          );

          await addAula({
            data: agendamento.data,
            sala: agendamento.sala,
            turma: agendamento.turma || `Agendamento - ${agendamento.solicitante}`,
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
    } catch (e) {
      console.error("Erro ao aprovar agendamento:", e);
      alert("Erro ao aprovar agendamento.");
    }
  };

  const rejeitarAgendamento = async (id: string, motivoRejeicao?: string) => {
    try {
      const agendamentoDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentos', id);
      await updateDoc(agendamentoDocRef, {
        status: 'rejeitado',
        motivoRejeicao: motivoRejeicao || 'Não autorizado pela coordenação'
      });
    } catch (e) {
      console.error("Erro ao rejeitar agendamento:", e);
      alert("Erro ao atualizar agendamento.");
    }
  };

  const excluirAgendamento = async (id: string) => {
    try {
      const agendamentoDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentos', id);
      await deleteDoc(agendamentoDocRef);
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
      solicitarAgendamento, aprovarAgendamento, rejeitarAgendamento, excluirAgendamento
    }}>
      {children}
    </DataContext.Provider>
  );
};

