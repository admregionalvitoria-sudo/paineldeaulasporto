import React, { createContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { upload as vercelBlobUpload } from '@vercel/blob/client';
import { Aula, Anuncio, Aluno, AgendamentoSala, Ambiente, DataContextType } from '../types';
import { db } from '../firebase';
import { formatarUnidadeCurricular } from '../utils/curricularUnits';
import { formatarNomeSala } from '../utils/roomFormatter';
import { readTextFileResilient, repairMojibake } from '../utils/encodingHelper';
import { registrarLog } from '../utils/auditLogger';
import { useAuth } from './AuthContext';
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

declare const XLSX: any;

export interface ExtendedDataContextType extends DataContextType {
  uploadCSV: (file: File) => Promise<void>;
  syncSource: string | null;
  addAmbiente: (nome: string, tipo?: Ambiente['tipo']) => Promise<void>;
}

export const DataContext = createContext<ExtendedDataContextType | undefined>(undefined);

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
        if (!ctx) return resolve(e.target?.result as string);

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
  const authContext = useAuth();
  const usuarioAtual = authContext?.usuarioAtual || null;

  const [aulas, setAulas] = useState<Aula[]>([]);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [agendamentos, setAgendamentos] = useState<AgendamentoSala[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncSource, setSyncSource] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  // Lista unificada e dinâmica de todas as salas cadastradas no sistema
  const salasCadastradas = useMemo(() => {
    const salasSet = new Set<string>();

    ambientes.forEach(amb => {
      if (amb.ativo && amb.nome) {
        salasSet.add(formatarNomeSala(amb.nome));
      }
    });

    aulas.forEach(a => {
      if (a.sala) {
        salasSet.add(formatarNomeSala(a.sala));
      }
    });

    agendamentos.forEach(ag => {
      if (ag.sala) {
        salasSet.add(formatarNomeSala(ag.sala));
      }
    });

    return Array.from(salasSet).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' }));
  }, [ambientes, aulas, agendamentos]);

  // Sync automático de ambientes únicos para a coleção 'ambientes'
  const sincronizarAmbientes = async (salasParaVerificar: string[]) => {
    try {
      const ambientesCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'ambientes');
      const snap = await getDocs(ambientesCollectionRef);
      const existentesMap = new Map<string, string>();
      snap.forEach(d => {
        const nomeNorm = formatarNomeSala(d.data().nome).toUpperCase();
        existentesMap.set(nomeNorm, d.id);
      });

      const batch = writeBatch(db);
      let count = 0;

      for (const salaRaw of salasParaVerificar) {
        const salaNorm = formatarNomeSala(salaRaw);
        const key = salaNorm.toUpperCase();
        if (key && !existentesMap.has(key)) {
          const newDocRef = doc(ambientesCollectionRef);
          batch.set(newDocRef, {
            nome: salaNorm,
            tipo: salaNorm.startsWith('LAB') ? 'laboratorio' : (salaNorm.startsWith('SALA') ? 'sala' : 'outro'),
            ativo: true,
            criadoPor: usuarioAtual?.email || 'sistema',
            criadoEm: serverTimestamp(),
            atualizadoEm: serverTimestamp()
          });
          existentesMap.set(key, newDocRef.id);
          count++;
        }
      }

      if (count > 0) {
        await batch.commit();
      }
    } catch (err) {
      console.warn("Aviso ao sincronizar ambientes:", err);
    }
  };

  // Monitoramento Online / Offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      window.location.reload();
    };
    const handleOffline = () => setIsOffline(true);

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

  // Listeners Firestore em Tempo Real
  useEffect(() => {
    const aulasCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas');
    const anunciosCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'anuncios');
    const alunosCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'alunos');
    const agendamentosCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentos');
    const ambientesCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'ambientes');

    // Listener Aulas
    const qAulas = query(aulasCollectionRef, orderBy('ordem', 'asc'));
    const unsubAulas = onSnapshot(qAulas, { includeMetadataChanges: true }, (snapshot) => {
      const aulasData = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        const formattedUC = formatarUnidadeCurricular(d.unidade_curricular);
        const salaNormalizada = formatarNomeSala(d.sala);

        return {
          ...d,
          id: docSnap.id,
          sala: salaNormalizada,
          salaOriginal: d.salaOriginal || d.sala,
          unidade_curricular: formattedUC
        };
      }) as Aula[];

      setAulas(aulasData);
      setLoading(false);
    }, (err) => {
      console.error("Erro ao carregar aulas:", err);
      setLoading(false);
    });

    // Listener Anúncios
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
    });

    // Listener Alunos
    const unsubAlunos = onSnapshot(alunosCollectionRef, (snapshot) => {
      const alunosData = snapshot.docs.map(doc => ({ 
        id: doc.id,
        nome: doc.data().nome || doc.data().aluno || "Aluno sem nome",
        turma: doc.data().turma || "",
        status: doc.data().status || "Ativo"
      })) as Aluno[];
      setAlunos(alunosData);
    });

    // Listener Agendamentos
    const unsubAgendamentos = onSnapshot(agendamentosCollectionRef, (snapshot) => {
      const agendamentosData = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          sala: formatarNomeSala(d.sala),
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
    });

    // Listener Ambientes
    const unsubAmbientes = onSnapshot(ambientesCollectionRef, (snapshot) => {
      const ambientesData = snapshot.docs.map(doc => ({
        id: doc.id,
        nome: formatarNomeSala(doc.data().nome),
        tipo: doc.data().tipo || 'sala',
        ativo: doc.data().ativo ?? true,
        criadoPor: doc.data().criadoPor || '',
        criadoEm: doc.data().criadoEm || null,
        atualizadoEm: doc.data().atualizadoEm || null
      })) as Ambiente[];
      setAmbientes(ambientesData);
    });

    return () => {
      unsubAulas();
      unsubAnuncios();
      unsubAlunos();
      unsubAgendamentos();
      unsubAmbientes();
    };
  }, []);

  const addAmbiente = async (nome: string, tipo: Ambiente['tipo'] = 'sala') => {
    const nomeNorm = formatarNomeSala(nome);
    if (!nomeNorm) throw new Error("Nome do ambiente inválido.");

    const existe = ambientes.some(a => a.nome.toUpperCase() === nomeNorm.toUpperCase());
    if (existe) throw new Error(`O ambiente "${nomeNorm}" já está cadastrado.`);

    const ambientesCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'ambientes');
    const docRef = await addDoc(ambientesCollectionRef, {
      nome: nomeNorm,
      tipo,
      ativo: true,
      criadoPor: usuarioAtual?.email || 'admin@senai.br',
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    });

    await registrarLog({
      user: usuarioAtual,
      acao: 'CRIAR_AMBIENTE',
      entidadeTipo: 'ambiente',
      entidadeId: docRef.id,
      depois: { nome: nomeNorm, tipo }
    });
  };

  const uploadMediaFile = async (file: File): Promise<{ src: string; type: 'image' | 'video'; storagePath?: string; name: string }> => {
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg)$/i.test(file.name);
    const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';

    let lastError: any = null;

    // Cloudinary
    const cloudinaryCloudName = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || localStorage.getItem('CLOUDINARY_CLOUD_NAME') || 'dlrdwblso').trim();
    const cloudinaryPreset = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || localStorage.getItem('CLOUDINARY_UPLOAD_PRESET') || '').trim();

    if (cloudinaryCloudName && cloudinaryPreset) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryPreset);
        
        const resourceType = isVideo ? 'video' : 'image';
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/${resourceType}/upload`;

        const clResponse = await fetch(cloudinaryUrl, { method: 'POST', body: formData });
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
        }
      } catch (clErr: any) {
        console.warn("Cloudinary upload failed:", clErr);
        lastError = clErr;
      }
    }

    // Vercel Blob Client
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

    // Fallback Imagem DataURL
    if (!isVideo) {
      const dataUrl = await compressImageToDataUrl(file);
      return { src: dataUrl, type: 'image', name: file.name };
    }

    throw new Error(lastError?.message || "Erro ao realizar upload da mídia.");
  };

  const addAnuncio = async (anuncioData: Omit<Anuncio, 'id'>) => {
    const anunciosCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'anuncios');
    const nextOrdem = anuncioData.ordem !== undefined ? anuncioData.ordem : anuncios.length;

    const docRef = await addDoc(anunciosCollectionRef, {
      ...anuncioData,
      ordem: nextOrdem,
      createdAt: serverTimestamp()
    });

    await registrarLog({
      user: usuarioAtual,
      acao: 'UPLOAD_MIDIA',
      entidadeTipo: 'anuncio',
      entidadeId: docRef.id,
      depois: anuncioData
    });
  };

  const reorderAnuncios = async (orderedAnuncios: Anuncio[]) => {
    const batch = writeBatch(db);
    orderedAnuncios.forEach((ad, index) => {
      const anuncioDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'anuncios', ad.id);
      batch.update(anuncioDocRef, { ordem: index, updatedAt: serverTimestamp() });
    });
    await batch.commit();
    setAnuncios([...orderedAnuncios.map((ad, index) => ({ ...ad, ordem: index }))]);

    await registrarLog({
      user: usuarioAtual,
      acao: 'REORDENAR_MIDIA',
      entidadeTipo: 'anuncio',
      entidadeId: 'carrossel'
    });
  };

  const deleteAnuncio = async (id: string, storagePath?: string) => {
    if (storagePath && (storagePath.includes('blob.vercel-storage.com') || storagePath.startsWith('http'))) {
      try {
        await fetch(`/api/upload?url=${encodeURIComponent(storagePath)}`, { method: 'DELETE' });
      } catch (e) {}
    }

    const anuncioDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'anuncios', id);
    await deleteDoc(anuncioDocRef);

    await registrarLog({
      user: usuarioAtual,
      acao: 'EXCLUIR_MIDIA',
      entidadeTipo: 'anuncio',
      entidadeId: id
    });
  };

  const replaceAnuncio = async (id: string, newAnuncio: Omit<Anuncio, 'id'>, oldStoragePath?: string) => {
    if (oldStoragePath && (oldStoragePath.includes('blob.vercel-storage.com') || oldStoragePath.startsWith('http'))) {
      try {
        await fetch(`/api/upload?url=${encodeURIComponent(oldStoragePath)}`, { method: 'DELETE' });
      } catch (e) {}
    }

    const anuncioDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'anuncios', id);
    await updateDoc(anuncioDocRef, {
      ...newAnuncio,
      updatedAt: serverTimestamp()
    });
  };

  const clearAllAnuncios = async () => {
    const anunciosCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'anuncios');
    const snapshot = await getDocs(anunciosCollectionRef);
    
    const deletePromises: Promise<void>[] = [];
    snapshot.forEach(d => deletePromises.push(deleteDoc(d.ref)));
    await Promise.all(deletePromises);
  };

  const processCSVData = (rawJsonData: any[][]) => {
    if (!rawJsonData || rawJsonData.length === 0) {
      throw new Error("O arquivo enviado está vazio.");
    }

    const jsonData = rawJsonData.map(row => {
      if (!Array.isArray(row)) return [];
      if (row.length === 1 && typeof row[0] === 'string') {
        const str = row[0];
        if (str.includes(';')) return str.split(';').map(c => repairMojibake(c.trim().replace(/^["']|["']$/g, '')));
        if (str.includes('\t')) return str.split('\t').map(c => repairMojibake(c.trim().replace(/^["']|["']$/g, '')));
        if (str.includes(',') && str.split(',').length > 3) return str.split(',').map(c => repairMojibake(c.trim().replace(/^["']|["']$/g, '')));
      }
      return row.map(c => c !== null && c !== undefined ? repairMojibake(String(c).trim().replace(/^["']|["']$/g, '')) : '');
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

    if (headerRowIndex === -1) headerRowIndex = 0;

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
      throw new Error("O arquivo CSV não possui as colunas esperadas (Data, Ambiente, Turma, Instrutor, Início).");
    }

    let globalOrder = 0;
    const dataRows = jsonData.slice(headerRowIndex + 1);

    return dataRows.flatMap((v) => {
      const dataVal = formatarDataCSV(v[idx.data]);
      const turmaVal = String(v[idx.turma] || '').trim();
      const salaValCrua = String(v[idx.sala] || 'Ambiente').trim();
      const salaVal = formatarNomeSala(salaValCrua);
      const instrutorVal = String(v[idx.instrutor] || '').trim();
      const ucVal = idx.uc !== -1 ? String(v[idx.uc] || '').trim() : '';

      if (!dataVal || !turmaVal || dataVal.toLowerCase().includes('data')) {
        return [];
      }

      const iniciosStr = String(v[idx.inicio] || '').trim();
      const finsStr = idx.fim !== -1 ? String(v[idx.fim] || '').trim() : '';

      const inicios = iniciosStr.split(/\s+/).filter(Boolean);
      const fins = finsStr.split(/\s+/).filter(Boolean);

      if (inicios.length === 0) return [];

      const startTime = inicios[0];
      const endTime = fins.length > 0 ? fins[fins.length - 1] : (inicios.length > 1 ? inicios[inicios.length - 1] : '');

      const formattedUC = formatarUnidadeCurricular(ucVal);

      globalOrder++;
      return [{
        data: dataVal,
        sala: salaVal,
        salaOriginal: salaValCrua,
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

  // Importação CSV via Diff Smart (preservando campos de edições manuais)
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
        const text = await readTextFileResilient(file);
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        jsonData = lines.map(line => [line]);
      }

      const processed = processCSVData(jsonData);

      // Desduplicação interna das aulas do próprio CSV
      const uniqueAulasMap = new Map<string, Omit<Aula, 'id'>>();
      processed.forEach(aula => {
        const key = `${aula.data}|${aula.turma}|${aula.instrutor}|${aula.inicio}|${aula.sala}`;
        if (!uniqueAulasMap.has(key)) {
          uniqueAulasMap.set(key, aula);
        }
      });
      const uniqueAulas = Array.from(uniqueAulasMap.values());
      
      if (uniqueAulas.length === 0) {
        throw new Error("Nenhuma aula válida encontrada no arquivo CSV.");
      }

      // Sincronizar ambientes automaticamente no banco
      const salasUnicasCSV = Array.from(new Set(uniqueAulas.map(a => a.sala)));
      await sincronizarAmbientes(salasUnicasCSV);

      // Diff Smart contra o banco atual
      const aulasCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas');
      const currentDocs = await getDocs(aulasCollectionRef);
      const existingDocsMap = new Map<string, { id: string; ref: any; data: any }>();

      currentDocs.forEach(docSnap => {
        const d = docSnap.data();
        const key = `${d.data}|${d.turma}|${d.instrutor}|${d.inicio}|${formatarNomeSala(d.sala)}`;
        existingDocsMap.set(key, { id: docSnap.id, ref: docSnap.ref, data: d });
      });

      const batchPromises: Promise<void>[] = [];
      let currentBatch = writeBatch(db);
      let batchCount = 0;
      const processedKeys = new Set<string>();

      uniqueAulas.forEach((newAula, index) => {
        const key = `${newAula.data}|${newAula.turma}|${newAula.instrutor}|${newAula.inicio}|${newAula.sala}`;
        processedKeys.add(key);

        if (existingDocsMap.has(key)) {
          // Atualiza dados do CSV preservando vídeo e materiais manuais
          const existing = existingDocsMap.get(key)!;
          currentBatch.update(existing.ref, {
            ...newAula,
            ordem: index,
            videoUrl: existing.data.videoUrl || undefined,
            materialUrl: existing.data.materialUrl || undefined,
            descricao: existing.data.descricao || newAula.unidade_curricular,
            updatedAt: serverTimestamp()
          });
        } else {
          // Adiciona nova aula
          const newDocRef = doc(aulasCollectionRef);
          currentBatch.set(newDocRef, { ...newAula, ordem: index });
        }

        batchCount++;
        if (batchCount >= 450) {
          batchPromises.push(currentBatch.commit());
          currentBatch = writeBatch(db);
          batchCount = 0;
        }
      });

      // Excluir registros antigos que já não existem no novo CSV
      existingDocsMap.forEach((existing, key) => {
        if (!processedKeys.has(key)) {
          currentBatch.delete(existing.ref);
          batchCount++;
          if (batchCount >= 450) {
            batchPromises.push(currentBatch.commit());
            currentBatch = writeBatch(db);
            batchCount = 0;
          }
        }
      });

      if (batchCount > 0) {
        batchPromises.push(currentBatch.commit());
      }

      await Promise.all(batchPromises);

      const metaDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'meta', 'sync');
      await setDoc(metaDocRef, {
        updatedAt: serverTimestamp(),
        timestamp: Date.now(),
        totalAulas: uniqueAulas.length,
        source: file.name
      }, { merge: true });

      await registrarLog({
        user: usuarioAtual,
        acao: 'IMPORTAR_CSV',
        entidadeTipo: 'aula',
        entidadeId: file.name,
        depois: { totalAulas: uniqueAulas.length }
      });

      setSyncSource(file.name);
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const addAula = async (aulaData: Omit<Aula, 'id'>) => { 
    const aulasCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas');
    const formattedUC = formatarUnidadeCurricular(aulaData.unidade_curricular);
    const salaNorm = formatarNomeSala(aulaData.sala);

    await sincronizarAmbientes([salaNorm]);

    const newAula = {
      ...aulaData,
      sala: salaNorm,
      salaOriginal: aulaData.salaOriginal || aulaData.sala,
      unidade_curricular: formattedUC,
      titulo: aulaData.turma,
      descricao: formattedUC,
      ativa: true,
      criadaEm: serverTimestamp(),
      ordem: aulas.length
    };

    const docRef = await addDoc(aulasCollectionRef, newAula); 

    await registrarLog({
      user: usuarioAtual,
      acao: 'CRIAR_AULA',
      entidadeTipo: 'aula',
      entidadeId: docRef.id,
      depois: newAula
    });
  };

  const updateAula = async (id: string, aula: Partial<Aula>) => {
    const sanitizedAula = { ...aula };
    if (sanitizedAula.unidade_curricular !== undefined) {
      sanitizedAula.unidade_curricular = formatarUnidadeCurricular(sanitizedAula.unidade_curricular);
      sanitizedAula.descricao = sanitizedAula.unidade_curricular;
    }
    if (sanitizedAula.sala !== undefined) {
      sanitizedAula.sala = formatarNomeSala(sanitizedAula.sala);
      await sincronizarAmbientes([sanitizedAula.sala]);
    }

    const aulaDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas', id);
    await updateDoc(aulaDocRef, sanitizedAula);

    await registrarLog({
      user: usuarioAtual,
      acao: 'EDITAR_AULA',
      entidadeTipo: 'aula',
      entidadeId: id,
      depois: sanitizedAula
    });
  };

  const deleteAula = async (id: string) => {
    const aulaDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas', id);
    await deleteDoc(aulaDocRef);

    await registrarLog({
      user: usuarioAtual,
      acao: 'EXCLUIR_AULA',
      entidadeTipo: 'aula',
      entidadeId: id
    });
  };

  const clearAulas = async () => {
    const aulasCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'aulas');
    const currentDocs = await getDocs(aulasCollectionRef);
    const deletePromises: Promise<void>[] = [];
    let deleteBatch = writeBatch(db);
    let deleteCount = 0;
    
    currentDocs.forEach((d) => {
      deleteBatch.delete(d.ref);
      deleteCount++;
      if (deleteCount === 450) {
        deletePromises.push(deleteBatch.commit());
        deleteBatch = writeBatch(db);
        deleteCount = 0;
      }
    });
    if (deleteCount > 0) deletePromises.push(deleteBatch.commit());
    await Promise.all(deletePromises);
  };

  const solicitarAgendamento = async (dados: Omit<AgendamentoSala, 'id' | 'status' | 'criadoEm'>): Promise<string> => {
    const agendamentosCollectionRef = collection(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentos');
    const salaNorm = formatarNomeSala(dados.sala);

    await sincronizarAmbientes([salaNorm]);

    const docRef = await addDoc(agendamentosCollectionRef, {
      ...dados,
      sala: salaNorm,
      status: 'pendente',
      criadoEm: serverTimestamp(),
      timestamp: Date.now()
    });

    return docRef.id;
  };

  const aprovarAgendamento = async (id: string, criarAulaAutomatica: boolean = true, aprovador: string = 'Gestor') => {
    const agendamentoDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentos', id);
    await updateDoc(agendamentoDocRef, {
      status: 'aprovado',
      aprovadoPor: usuarioAtual?.email || aprovador,
      aprovadoEm: serverTimestamp(),
    });

    const agendamento = agendamentos.find(a => a.id === id);
    if (agendamento && criarAulaAutomatica) {
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
        sala: formatarNomeSala(agendamento.sala),
        turma: agendamento.turma || `Agendamento - ${agendamento.solicitante}`,
        instrutor: agendamento.solicitante,
        unidade_curricular: agendamento.disciplina || agendamento.motivo || 'Atividade Agendada',
        inicio: inicioPadrao,
        fim: fimPadrao,
        turno: agendamento.turno
      });
    }

    await registrarLog({
      user: usuarioAtual,
      acao: 'APROVAR_AGENDAMENTO',
      entidadeTipo: 'agendamento',
      entidadeId: id
    });
  };

  const rejeitarAgendamento = async (id: string, motivoRejeicao?: string) => {
    const agendamentoDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentos', id);
    await updateDoc(agendamentoDocRef, {
      status: 'rejeitado',
      motivoRejeicao: motivoRejeicao || 'Não autorizado pela coordenação'
    });

    await registrarLog({
      user: usuarioAtual,
      acao: 'REJEITAR_AGENDAMENTO',
      entidadeTipo: 'agendamento',
      entidadeId: id,
      depois: { motivoRejeicao }
    });
  };

  const excluirAgendamento = async (id: string) => {
    const agendamentoDocRef = doc(db, FIRESTORE_ROOT_COLLECTION, FIRESTORE_DATA_DOCUMENT, 'agendamentos', id);
    await deleteDoc(agendamentoDocRef);

    await registrarLog({
      user: usuarioAtual,
      acao: 'EXCLUIR_AGENDAMENTO',
      entidadeTipo: 'agendamento',
      entidadeId: id
    });
  };

  return (
    <DataContext.Provider value={{ 
      aulas, anuncios, alunos, agendamentos, ambientes, salasCadastradas, loading, error, isOffline,
      addAula, updateAulasFromCSV: () => {}, updateAula, deleteAula, 
      clearAulas, addAnuncio, deleteAnuncio, replaceAnuncio, reorderAnuncios, clearAllAnuncios,
      uploadMediaFile, uploadCSV, syncSource, addAmbiente,
      solicitarAgendamento, aprovarAgendamento, rejeitarAgendamento, excluirAgendamento
    }}>
      {children}
    </DataContext.Provider>
  );
};
