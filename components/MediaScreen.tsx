import React, { useState, useContext } from 'react';
import { DataContext } from '../context/DataContext';
import { Anuncio } from '../types';
import { Image, Video, Trash2, Plus, ArrowLeft, Upload, Clock, Play, Loader2, Layers } from 'lucide-react';

interface MediaScreenProps {
  onBack: () => void;
}

const MediaScreen: React.FC<MediaScreenProps> = ({ onBack }) => {
  const dataContext = useContext(DataContext);
  const anuncios = dataContext?.anuncios || [];
  const uploadMediaFile = dataContext?.uploadMediaFile;
  const addAnuncio = dataContext?.addAnuncio;
  const deleteAnuncio = dataContext?.deleteAnuncio;

  const [isUploading, setIsUploading] = useState(false);
  const [newDuration, setNewDuration] = useState(15);
  const [newName, setNewName] = useState('');
  const [previewMedia, setPreviewMedia] = useState<Anuncio | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadMediaFile || !addAnuncio) return;

    setIsUploading(true);
    try {
      const media = await uploadMediaFile(file);
      await addAnuncio({
        type: media.type,
        src: media.src,
        storagePath: media.storagePath,
        duration: newDuration,
        name: newName.trim() || file.name,
        ativo: true
      });
      setNewName('');
    } catch (err: any) {
      alert("Erro ao enviar mídia: " + (err.message || err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, path?: string) => {
    if (!confirm("Deseja realmente excluir esta mídia do carrossel?")) return;
    if (deleteAnuncio) {
      await deleteAnuncio(id, path);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Topbar Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Gestão de Mídia & TV Institucional</h1>
              <p className="text-xs text-slate-400">Gerencie fotos e vídeos exibidos no painel público da escola</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-8">
        
        {/* Upload Form Card */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-blue-600" />
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-red-500" />
            Adicionar Nova Mídia para a TV
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Descrição ou Título
              </label>
              <input
                type="text"
                placeholder="Ex: Comunicado da Coordenação"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Duração na Tela (segundos)
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex items-end">
              <label className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-900/30 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm">
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando Mídia...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Selecionar Arquivo (Foto/Vídeo)
                  </>
                )}
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Galeria de Mídias Cadastradas */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Mídias em Exibição ({anuncios.length})
            </h3>
          </div>

          {anuncios.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800 p-8">
              Nenhuma mídia cadastrada no momento. Adicione imagens ou vídeos acima para exibição no carrossel da TV.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {anuncios.map((ad) => (
                <div
                  key={ad.id}
                  className="bg-slate-900/90 rounded-2xl border border-slate-800/80 overflow-hidden shadow-lg hover:border-slate-700 transition-all flex flex-col group"
                >
                  <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
                    {ad.type === 'video' ? (
                      <video src={ad.src} className="w-full h-full object-cover" muted loop />
                    ) : (
                      <img src={ad.src} alt={ad.name || 'Mídia'} className="w-full h-full object-cover" />
                    )}

                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs font-semibold flex items-center gap-1.5">
                      {ad.type === 'video' ? <Video className="w-3.5 h-3.5 text-blue-400" /> : <Image className="w-3.5 h-3.5 text-emerald-400" />}
                      <span className="capitalize">{ad.type}</span>
                    </div>

                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs font-mono flex items-center gap-1 text-slate-300">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {ad.duration || 15}s
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white truncate">{ad.name || 'Sem título'}</h4>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <button
                        onClick={() => setPreviewMedia(ad)}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Visualizar
                      </button>

                      <button
                        onClick={() => handleDelete(ad.id, ad.storagePath)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal de Pré-visualização */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative shadow-2xl">
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-xl bg-slate-950/80 text-white text-xs font-medium border border-slate-800 hover:bg-slate-800"
            >
              Fechar Preview
            </button>
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
