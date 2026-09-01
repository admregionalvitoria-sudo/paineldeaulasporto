import React, { useState, useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DataContext, ExtendedDataContextType } from '../context/DataContext';
import { Anuncio } from '../types';
import { 
  extractDriveFileId, 
  isGoogleDriveUrl, 
  getDrivePreviewUrl, 
  extractYouTubeId, 
  getYouTubeEmbedUrl, 
  isDirectVideoUrl, 
  detectMediaType,
  getMediaBadgeInfo
} from '../utils/mediaHelpers';
import { 
  Layers, 
  ArrowLeft, 
  UploadCloud, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Play, 
  RefreshCw, 
  Clock, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Link as LinkIcon,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface MediaScreenProps {
  onBack: () => void;
}

const MediaScreen: React.FC<MediaScreenProps> = ({ onBack }) => {
  const context = useContext(DataContext) as ExtendedDataContextType;
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  
  // URL Input states
  const [urlInput, setUrlInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [durationInput, setDurationInput] = useState<number>(10);
  const [previewMedia, setPreviewMedia] = useState<Anuncio | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const targetReplaceAdRef = useRef<{ id: string; storagePath?: string } | null>(null);

  const MAX_MEDIAS = 10;
  const anuncios = context?.anuncios || [];
  const isAtLimit = anuncios.length >= MAX_MEDIAS;

  const handleFilesSelected = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    if (isAtLimit) {
      alert(`O carrossel já atingiu o limite máximo de ${MAX_MEDIAS} mídias.`);
      return;
    }

    setUploading(true);
    setUploadStatus('Processando e enviando mídias...');

    try {
      const fileArray = Array.from(files);
      const remainingSlots = MAX_MEDIAS - anuncios.length;
      const filesToProcess = fileArray.slice(0, remainingSlots);

      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        const isVid = file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg)$/i.test(file.name);
        
        const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
        if (isVid && file.size > MAX_VIDEO_SIZE) {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
          alert(`O vídeo "${file.name}" tem ${sizeMB}MB e excede o limite máximo de 50MB.`);
          continue;
        }

        setUploadStatus(`Enviando ${i + 1} de ${filesToProcess.length}: ${file.name}...`);
        const uploaded = await context.uploadMediaFile(file);
        
        const adData: Omit<Anuncio, 'id'> = {
          src: uploaded.src,
          type: uploaded.type,
          name: uploaded.name || file.name,
          duration: uploaded.type === 'video' ? 60 : 15,
          ativo: true,
          ordem: anuncios.length + i
        };
        if (uploaded.storagePath) {
          adData.storagePath = uploaded.storagePath;
        }

        await context.addAnuncio(adData);
      }
    } catch (err: any) {
      console.error("Erro ao enviar mídias:", err);
      alert("Erro ao salvar mídias: " + (err.message || 'Erro desconhecido'));
    } finally {
      setUploading(false);
      setUploadStatus(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawUrl = urlInput.trim();
    if (!rawUrl) return;

    if (isAtLimit) {
      alert(`Limite de ${MAX_MEDIAS} mídias atingido.`);
      return;
    }

    try {
      const type = detectMediaType(rawUrl);
      const isVid = type === 'video';

      const adData: Omit<Anuncio, 'id'> = {
        src: rawUrl,
        type,
        name: nameInput.trim() || (isVid ? 'Vídeo Institucional' : 'Banner Informativo'),
        duration: isVid ? 60 : (durationInput || 15),
        ativo: true,
        ordem: anuncios.length
      };

      await context.addAnuncio(adData);
      setUrlInput('');
      setNameInput('');
    } catch (err: any) {
      alert("Erro ao cadastrar link: " + (err.message || 'Erro desconhecido'));
    }
  };

  const handleDelete = async (id: string, path?: string) => {
    if (!confirm("Excluir esta mídia do carrossel da TV?")) return;
    await context.deleteAnuncio(id, path);
  };

  return (
    <div className="min-h-screen bg-[#EDF1F6] text-[#0F2A52] p-4 sm:p-8 font-sans">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 max-w-[2000px] mx-auto bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-[#F8FAFC] hover:bg-[#DBEAFE] text-[#0F2A52] border border-[#E5E7EB] transition-all"
            title="Voltar ao Painel Geral"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F4901E]">SENAI • MÍDIAS & TV</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                Rotatividade Ativa
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#0F2A52] mt-1">
              Gerenciamento de Mídias e Carrossel
            </h1>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[2000px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Coluna Esquerda: Adicionar Mídia (Upload e Link) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card de Upload Direto */}
          <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-lg">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#0F2A52] mb-2 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[#F4901E]" />
              Upload de Arquivo (Foto/Vídeo)
            </h3>
            <p className="text-xs text-[#6B7280] mb-4">
              Envie fotos ou vídeos (até 50MB) para serem armazenados na nuvem e exibidos na TV.
            </p>

            <input
              type="file"
              accept="image/*,video/*"
              multiple
              ref={fileInputRef}
              onChange={(e) => handleFilesSelected(e.target.files || [])}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || isAtLimit}
              className="w-full py-4 px-4 bg-[#0F2A52] hover:bg-[#1D4E8C] text-white font-black uppercase text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{uploading ? (uploadStatus || 'Enviando...') : 'Selecionar Arquivos'}</span>
            </button>
          </div>

          {/* Card de Adicionar por Link (Drive / YouTube / Web) */}
          <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-lg">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#0F2A52] mb-2 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-[#1D4E8C]" />
              Adicionar por Link Externo
            </h3>
            <p className="text-xs text-[#6B7280] mb-4">
              Suporta links de vídeos do Google Drive (compartilhados como públicos), YouTube ou URLs diretas.
            </p>

            <form onSubmit={handleAddUrl} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider block mb-1">Título / Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Vídeo Institucional SENAI 2026"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider block mb-1">URL / Link *</label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/... ou https://youtube.com/..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider block mb-1">Duração de Exibição (segundos)</label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={durationInput}
                  onChange={(e) => setDurationInput(Number(e.target.value))}
                  className="w-full bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
                />
              </div>

              <button
                type="submit"
                disabled={isAtLimit || !urlInput.trim()}
                className="w-full py-3.5 px-4 bg-[#F4901E] hover:bg-[#E67E22] text-white font-black uppercase text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Salvar Link no Carrossel</span>
              </button>
            </form>
          </div>
        </div>

        {/* Coluna Direita: Lista de Mídias Cadastradas */}
        <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-[#E5E7EB] shadow-lg">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E5E7EB]">
            <div>
              <h2 className="text-lg font-black uppercase text-[#0F2A52]">Mídias no Carrossel ({anuncios.length} / {MAX_MEDIAS})</h2>
              <p className="text-xs text-[#6B7280]">Estas mídias alternam automaticamente ao lado dos horários de aula</p>
            </div>
            {anuncios.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Deseja realmente limpar todas as mídias do carrossel?")) {
                    context.clearAllAnuncios();
                  }
                }}
                className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 transition-all"
              >
                Limpar Todas
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {anuncios.map((ad, index) => {
              const isYT = isGoogleDriveUrl(ad.src) ? false : !!extractYouTubeId(ad.src);
              const isDrive = isGoogleDriveUrl(ad.src);
              const isVid = ad.type === 'video' || isYT || isDrive;
              const badge = getMediaBadgeInfo(ad.src, ad.type);

              return (
                <div
                  key={ad.id}
                  className="bg-[#F8FAFC] rounded-2xl border border-[#E5E7EB] overflow-hidden p-4 flex flex-col justify-between hover:shadow-md transition-all"
                >
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    <div className="w-28 h-20 rounded-xl bg-[#0A192F] overflow-hidden shrink-0 relative flex items-center justify-center border border-[#CBD5E1]">
                      {isYT ? (
                        <div className="w-full h-full bg-red-900 flex flex-col items-center justify-center text-white">
                          <Play className="w-6 h-6 text-red-400" />
                          <span className="text-[8px] font-black text-red-300">YouTube</span>
                        </div>
                      ) : isDrive ? (
                        <div className="w-full h-full bg-amber-900 flex flex-col items-center justify-center text-white">
                          <Play className="w-6 h-6 text-amber-300" />
                          <span className="text-[8px] font-black text-amber-200">Drive Vídeo</span>
                        </div>
                      ) : ad.type === 'video' ? (
                        <video src={ad.src} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={ad.src} alt={ad.name || 'Mídia'} className="w-full h-full object-cover" />
                      )}
                      <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[8px] font-black text-white">
                        {ad.duration || 15}s
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${badge.color}`}>
                        {badge.label}
                      </span>
                      <h4 className="text-xs font-black text-[#0F2A52] truncate mt-1">
                        {ad.name || 'Mídia sem título'}
                      </h4>
                      <p className="text-[10px] text-[#6B7280] font-mono truncate mt-0.5">
                        {ad.src}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                    <button
                      onClick={() => setPreviewMedia(ad)}
                      className="text-xs font-bold text-[#1D4E8C] hover:underline flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Visualizar
                    </button>

                    <button
                      onClick={() => handleDelete(ad.id, ad.storagePath)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir Mídia"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {anuncios.length === 0 && (
              <div className="col-span-2 py-16 text-center text-xs font-bold text-[#6B7280] border-2 border-dashed border-[#CBD5E1] rounded-2xl">
                Nenhuma mídia cadastrada no carrossel. Use o painel ao lado para enviar arquivos ou cadastrar links.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Preview */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 bg-[#0F2A52]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-3xl w-full bg-white border border-[#E5E7EB] rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-[#0F2A52]">{previewMedia.name || 'Preview da Mídia'}</h3>
              <button
                onClick={() => setPreviewMedia(null)}
                className="px-3 py-1 bg-[#F8FAFC] hover:bg-[#E2E8F0] rounded-xl text-xs font-bold text-[#0F2A52]"
              >
                Fechar
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              {previewMedia.type === 'video' ? (
                <video src={previewMedia.src} controls autoPlay className="max-h-full max-w-full" />
              ) : (
                <img src={previewMedia.src} alt={previewMedia.name || 'Preview'} className="max-h-full max-w-full object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaScreen;
