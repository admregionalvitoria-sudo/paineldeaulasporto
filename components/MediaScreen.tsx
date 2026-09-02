import React, { useState, useContext, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DataContext, ExtendedDataContextType, DEFAULT_PAINEL_CLIENTE_CONFIG } from '../context/DataContext';
import { Anuncio, PainelClienteConfig, DestaqueSlide } from '../types';
import { 
  extractDriveFileId, 
  isGoogleDriveUrl, 
  getDrivePreviewUrl, 
  extractYouTubeId, 
  getYouTubeEmbedUrl, 
  isDirectVideoUrl, 
  detectMediaType,
  getMediaBadgeInfo,
  isCloudinaryUrl
} from '../utils/mediaHelpers';
import { getCloudinaryConfig } from '../utils/cloudinary';
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
  AlertCircle,
  Tv,
  Users,
  Smartphone,
  Phone,
  Save
} from 'lucide-react';

interface MediaScreenProps {
  onBack: () => void;
}

const MediaScreen: React.FC<MediaScreenProps> = ({ onBack }) => {
  const context = useContext(DataContext) as ExtendedDataContextType;
  const [activeTab, setActiveTab] = useState<'aulas' | 'cliente'>('aulas');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  
  // URL Input states para Painel de Aulas
  const [urlInput, setUrlInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [durationInput, setDurationInput] = useState<number>(10);
  const [previewMedia, setPreviewMedia] = useState<Anuncio | null>(null);

  // States para Painel do Cliente
  const painelClienteCfg = context?.painelClienteConfig || DEFAULT_PAINEL_CLIENTE_CONFIG;
  const [clientVideoSrc, setClientVideoSrc] = useState(painelClienteCfg.heroVideoSrc || '');
  const [clientSlides, setClientSlides] = useState<DestaqueSlide[]>(painelClienteCfg.destaques || []);
  const [clientPhone, setClientPhone] = useState(painelClienteCfg.contactInfo?.phone || '(27) 98818-2941');
  const [clientWhatsappUrl, setClientWhatsappUrl] = useState(painelClienteCfg.contactInfo?.whatsappUrl || 'https://wa.me/5527988182941');
  const [clientInstagram, setClientInstagram] = useState(painelClienteCfg.contactInfo?.instagram || '@senaivitoria');
  const [clientInstagramUrl, setClientInstagramUrl] = useState(painelClienteCfg.contactInfo?.instagramUrl || 'https://instagram.com/senaivitoria');
  const [clientBannerUrlInput, setClientBannerUrlInput] = useState('');
  const [savingCliente, setSavingCliente] = useState(false);
  const [clienteSavedNotice, setClienteSavedNotice] = useState(false);

  useEffect(() => {
    if (context?.painelClienteConfig) {
      setClientVideoSrc(context.painelClienteConfig.heroVideoSrc || '');
      setClientSlides(context.painelClienteConfig.destaques || []);
      if (context.painelClienteConfig.contactInfo) {
        setClientPhone(context.painelClienteConfig.contactInfo.phone || '');
        setClientWhatsappUrl(context.painelClienteConfig.contactInfo.whatsappUrl || '');
        setClientInstagram(context.painelClienteConfig.contactInfo.instagram || '');
        setClientInstagramUrl(context.painelClienteConfig.contactInfo.instagramUrl || '');
      }
    }
  }, [context?.painelClienteConfig]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const clientVideoFileRef = useRef<HTMLInputElement>(null);
  const clientSlideFileRef = useRef<HTMLInputElement>(null);

  const MAX_MEDIAS = 10;
  const anuncios = context?.anuncios || [];
  const isAtLimit = anuncios.length >= MAX_MEDIAS;

  // Upload para Carrossel de Aulas
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

  // Upload Vídeo Principal Painel Cliente
  const handleClientVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus('Enviando vídeo principal do painel do cliente...');
    try {
      const uploaded = await context.uploadMediaFile(file);
      setClientVideoSrc(uploaded.src);
    } catch (err: any) {
      alert("Erro ao enviar vídeo: " + (err.message || ''));
    } finally {
      setUploading(false);
      setUploadStatus(null);
      if (clientVideoFileRef.current) clientVideoFileRef.current.value = '';
    }
  };

  // Upload Banner Vertical 1080x1920
  const handleClientSlideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus('Enviando banner vertical 1080x1920...');
    try {
      const uploaded = await context.uploadMediaFile(file);
      setClientSlides(prev => [
        ...prev,
        {
          image: uploaded.src,
          headline: file.name.replace(/\.[^/.]+$/, ''),
          tagline: 'SENAI Vitória'
        }
      ]);
    } catch (err: any) {
      alert("Erro ao enviar banner: " + (err.message || ''));
    } finally {
      setUploading(false);
      setUploadStatus(null);
      if (clientSlideFileRef.current) clientSlideFileRef.current.value = '';
    }
  };

  const handleAddClientSlideUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientBannerUrlInput.trim()) return;
    setClientSlides(prev => [
      ...prev,
      {
        image: clientBannerUrlInput.trim(),
        headline: 'Destaque SENAI',
        tagline: 'Educação e Tecnologia'
      }
    ]);
    setClientBannerUrlInput('');
  };

  const handleRemoveClientSlide = (index: number) => {
    if (!confirm("Remover este banner vertical do carrossel?")) return;
    setClientSlides(prev => prev.filter((_, i) => i !== index));
  };

  const handleSavePainelCliente = async () => {
    try {
      setSavingCliente(true);
      if (context?.updatePainelClienteConfig) {
        await context.updatePainelClienteConfig({
          heroVideoSrc: clientVideoSrc,
          destaques: clientSlides,
          contactInfo: {
            logoUrl: painelClienteCfg.contactInfo?.logoUrl || 'https://res.cloudinary.com/dlrdwblso/image/upload/v1785334994/SENAI_COMPLETA_PREFERENCIAL_svm23u.png',
            phone: clientPhone,
            whatsappUrl: clientWhatsappUrl,
            instagram: clientInstagram,
            instagramUrl: clientInstagramUrl
          }
        });
        setClienteSavedNotice(true);
        setTimeout(() => setClienteSavedNotice(false), 4000);
      }
    } catch (err: any) {
      alert("Erro ao salvar configurações: " + (err.message || ''));
    } finally {
      setSavingCliente(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EDF1F6] text-[#0F2A52] p-4 sm:p-8 font-sans">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 max-w-[2000px] mx-auto bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-[#F8FAFC] hover:bg-[#DBEAFE] text-[#0F2A52] border border-[#E5E7EB] transition-all cursor-pointer"
            title="Voltar ao Painel Geral"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F4901E]">SENAI • MÍDIAS & TRANSMISSÃO</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                Sincronização em Tempo Real
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#0F2A52] mt-1">
              Gerenciamento de Mídias e Painéis
            </h1>
          </div>
        </div>

        {/* Seletor de Abas */}
        <div className="flex bg-[#F1F5F9] p-1.5 rounded-2xl gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('aulas')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'aulas'
                ? 'bg-white text-[#0F2A52] shadow-sm'
                : 'text-[#64748B] hover:text-[#0F2A52]'
            }`}
          >
            <Tv className="w-4 h-4 text-[#F4901E]" />
            <span>TV Painel de Aulas</span>
          </button>

          <button
            onClick={() => setActiveTab('cliente')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'cliente'
                ? 'bg-white text-[#0F2A52] shadow-sm'
                : 'text-[#64748B] hover:text-[#0F2A52]'
            }`}
          >
            <Users className="w-4 h-4 text-purple-600" />
            <span>Painel do Cliente (/painelcliente)</span>
          </button>
        </div>
      </header>

      {/* ABA 1: TV PAINEL DE AULAS */}
      {activeTab === 'aulas' && (
        <main className="max-w-[2000px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna Esquerda: Adicionar Mídia (Upload e Link) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Card de Upload Direto */}
            <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-[#0F2A52] flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-[#F4901E]" />
                  Upload para Painel de Aulas
                </h3>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Cloudinary: {getCloudinaryConfig().cloudName}
                </span>
              </div>
              <p className="text-xs text-[#6B7280] mb-4">
                Envie fotos ou vídeos (até 50MB) para serem armazenados na nuvem do Cloudinary e intercalados com as turmas.
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
                className="w-full py-4 px-4 bg-[#0F2A52] hover:bg-[#1D4E8C] text-white font-black uppercase text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{uploading ? (uploadStatus || 'Enviando ao Cloudinary...') : 'Selecionar Arquivos'}</span>
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
                  className="w-full py-3.5 px-4 bg-[#F4901E] hover:bg-[#E67E22] text-white font-black uppercase text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
                <h2 className="text-lg font-black uppercase text-[#0F2A52]">Mídias no Carrossel da TV ({anuncios.length} / {MAX_MEDIAS})</h2>
                <p className="text-xs text-[#6B7280]">Estas mídias alternam automaticamente ao lado dos horários de aula</p>
              </div>
              {anuncios.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm("Deseja realmente limpar todas as mídias do carrossel?")) {
                      context.clearAllAnuncios();
                    }
                  }}
                  className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 transition-all cursor-pointer"
                >
                  Limpar Todas
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {anuncios.map((ad) => {
                const isYT = isGoogleDriveUrl(ad.src) ? false : !!extractYouTubeId(ad.src);
                const isDrive = isGoogleDriveUrl(ad.src);
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
                        className="text-xs font-bold text-[#1D4E8C] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Visualizar
                      </button>

                      <button
                        onClick={() => handleDelete(ad.id, ad.storagePath)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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
                  Nenhuma mídia cadastrada no carrossel de aulas. Use o painel ao lado para enviar arquivos ou cadastrar links.
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ABA 2: PAINEL DO CLIENTE / RECEPÇÃO */}
      {activeTab === 'cliente' && (
        <main className="max-w-[2000px] mx-auto space-y-8">
          {/* Banner Superior com Link de Acesso Direto */}
          <div className="bg-gradient-to-r from-[#0F2A52] via-[#1D4E8C] to-[#0F2A52] text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#F4901E]">TV / Totem de Recepção</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20">Resolução 1920x1080 + 1080x1920</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black uppercase mt-1">Painel Institucional do Cliente</h2>
              <p className="text-xs text-blue-100/80 mt-0.5">
                Vídeo principal em 16:9 (1920x1080) e carrossel de banners verticais em 9:16 (1080x1920)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/painelcliente"
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3 rounded-2xl bg-white text-[#0F2A52] hover:bg-[#F4901E] hover:text-white font-black uppercase text-xs transition-all shadow-md flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir /painelcliente</span>
              </a>

              <button
                onClick={handleSavePainelCliente}
                disabled={savingCliente}
                className="px-6 py-3 rounded-2xl bg-[#F4901E] hover:bg-[#E67E22] text-white font-black uppercase text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingCliente ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </div>

          {clienteSavedNotice && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-md"
            >
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>Configurações do Painel do Cliente salvas e atualizadas em tempo real!</span>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Coluna 1: Vídeo Principal (1920x1080 - 16:9) */}
            <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-3xl border border-[#E5E7EB] shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-black uppercase text-[#0F2A52] flex items-center gap-2">
                    <VideoIcon className="w-5 h-5 text-[#F4901E]" />
                    1. Vídeo Principal (1920x1080 • 16:9)
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-[#0F2A52] border border-blue-200">
                    Horizontal
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mb-4">
                  Vídeo transmitido em loop no container principal com resolução widescreen 1920x1080.
                </p>

                {/* Preview do Vídeo */}
                <div className="aspect-[16/9] w-full rounded-2xl bg-black overflow-hidden relative shadow-inner mb-4 flex items-center justify-center">
                  {clientVideoSrc ? (
                    <video
                      src={clientVideoSrc}
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-white/40 text-xs font-bold text-center p-4">
                      Nenhum vídeo configurado
                    </div>
                  )}
                </div>

                {/* Controles de URL e Upload */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider block mb-1">
                      URL Direta do Vídeo
                    </label>
                    <input
                      type="url"
                      placeholder="https://res.cloudinary.com/.../video.mp4"
                      value={clientVideoSrc}
                      onChange={(e) => setClientVideoSrc(e.target.value)}
                      className="w-full bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs font-mono outline-none focus:border-[#F4901E] text-[#0F2A52]"
                    />
                  </div>

                  <input
                    type="file"
                    accept="video/*"
                    ref={clientVideoFileRef}
                    onChange={handleClientVideoUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => clientVideoFileRef.current?.click()}
                    disabled={uploading}
                    className="w-full py-3 px-4 bg-[#0F2A52] hover:bg-[#1D4E8C] text-white font-black uppercase text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{uploading ? 'Enviando Vídeo ao Cloudinary...' : 'Fazer Upload de Novo Vídeo'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Coluna 2: Carrossel Vertical (1080x1920 - 9:16) */}
            <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-3xl border border-[#E5E7EB] shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-black uppercase text-[#0F2A52] flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-purple-600" />
                    2. Carrossel Vertical (1080x1920 • 9:16)
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    Vertical Fixo
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mb-4">
                  Imagens e banners verticais rotacionados a cada 5,5 segundos no painel lateral do cliente.
                </p>

                {/* Upload e Adição por Link */}
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <input
                    type="file"
                    accept="image/*"
                    ref={clientSlideFileRef}
                    onChange={handleClientSlideUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => clientSlideFileRef.current?.click()}
                    disabled={uploading}
                    className="flex-1 py-3 px-3 bg-[#F4901E] hover:bg-[#E67E22] text-white font-black uppercase text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload Banner (1080x1920)</span>
                  </button>
                </div>

                <form onSubmit={handleAddClientSlideUrl} className="flex gap-2 mb-6">
                  <input
                    type="url"
                    placeholder="Ou cole a URL da imagem..."
                    value={clientBannerUrlInput}
                    onChange={(e) => setClientBannerUrlInput(e.target.value)}
                    className="flex-1 bg-[#F8FAFC] border border-[#E5E7EB] px-3 py-2.5 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-[#0F2A52] hover:bg-[#1D4E8C] text-white font-black uppercase text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Adicionar
                  </button>
                </form>

                {/* Lista de Banners Verticais */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[360px] overflow-y-auto p-1 custom-scrollbar">
                  {clientSlides.map((slide, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-[9/16] rounded-2xl overflow-hidden border border-[#CBD5E1] bg-slate-900 shadow-xs group"
                    >
                      <img src={slide.image} alt={`Banner ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        <span className="text-[10px] font-black text-white px-1.5 py-0.5 rounded bg-black/70 self-start">
                          #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveClientSlide(idx)}
                          className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg self-end cursor-pointer shadow-md"
                          title="Remover banner"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {clientSlides.length === 0 && (
                    <div className="col-span-3 py-8 text-center text-xs font-bold text-[#6B7280] border border-dashed border-[#CBD5E1] rounded-2xl">
                      Nenhum banner cadastrado
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Linha 3: Informações de Contato e QR Codes */}
            <div className="lg:col-span-12 bg-white p-6 sm:p-8 rounded-3xl border border-[#E5E7EB] shadow-lg">
              <h3 className="text-base font-black uppercase text-[#0F2A52] mb-1 flex items-center gap-2">
                <Phone className="w-5 h-5 text-emerald-600" />
                3. Informações de Contato e QR Codes do Rodapé
              </h3>
              <p className="text-xs text-[#6B7280] mb-6">
                Estes dados são exibidos no rodapé do painel com QR Codes automáticos para WhatsApp e Instagram.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider block mb-1">
                    Telefone Exibido
                  </label>
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(27) 98818-2941"
                    className="w-full bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs font-bold outline-none focus:border-[#F4901E] text-[#0F2A52]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider block mb-1">
                    Link do WhatsApp (QR Code Laranja)
                  </label>
                  <input
                    type="url"
                    value={clientWhatsappUrl}
                    onChange={(e) => setClientWhatsappUrl(e.target.value)}
                    placeholder="https://wa.me/5527988182941"
                    className="w-full bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs font-bold outline-none focus:border-[#F4901E] text-[#0F2A52]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider block mb-1">
                    Instagram Exibido
                  </label>
                  <input
                    type="text"
                    value={clientInstagram}
                    onChange={(e) => setClientInstagram(e.target.value)}
                    placeholder="@senaivitoria"
                    className="w-full bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs font-bold outline-none focus:border-[#F4901E] text-[#0F2A52]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider block mb-1">
                    Link do Instagram (QR Code Azul)
                  </label>
                  <input
                    type="url"
                    value={clientInstagramUrl}
                    onChange={(e) => setClientInstagramUrl(e.target.value)}
                    placeholder="https://instagram.com/senaivitoria"
                    className="w-full bg-[#F8FAFC] border border-[#E5E7EB] p-3 rounded-xl text-xs font-bold outline-none focus:border-[#F4901E] text-[#0F2A52]"
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E5E7EB] flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePainelCliente}
                  disabled={savingCliente}
                  className="px-8 py-3.5 bg-[#F4901E] hover:bg-[#E67E22] text-white font-black uppercase text-xs rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingCliente ? 'Salvando...' : 'Salvar Todas as Configurações'}</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Modal Preview da TV de Aulas */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 bg-[#0F2A52]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-3xl w-full bg-white border border-[#E5E7EB] rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-[#0F2A52]">{previewMedia.name || 'Preview da Mídia'}</h3>
              <button
                onClick={() => setPreviewMedia(null)}
                className="px-3 py-1 bg-[#F8FAFC] hover:bg-[#E2E8F0] rounded-xl text-xs font-bold text-[#0F2A52] cursor-pointer"
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
