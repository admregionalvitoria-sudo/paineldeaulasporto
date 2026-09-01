import React, { useState, useContext, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DataContext, ExtendedDataContextType } from '../context/DataContext';
import { Aula, Anuncio, AgendamentoSala } from '../types';
import { formatarUnidadeCurricular, CANONICAL_UNIDADES_CURRICULARES } from '../utils/curricularUnits';
import { formatarNomeSala } from '../utils/roomFormatter';
import { 
    extractDriveFileId, 
    isGoogleDriveUrl, 
    getDrivePreviewUrl, 
    extractYouTubeId, 
    getYouTubeEmbedUrl, 
    isDirectVideoUrl, 
    isVcdnUrl,
    extractVcdnSlug,
    getVcdnEmbedUrl,
    detectMediaType,
    getMediaBadgeInfo
} from '../utils/mediaHelpers';
import { 
    XIcon, 
    UploadCloudIcon, 
    FileTextIcon, 
    TrashIcon, 
    LogOutIcon, 
    CameraIcon, 
    SettingsIcon, 
    PlusCircleIcon, 
    SunIcon, 
    MoonIcon, 
    ClockIcon,
    BuildingIcon,
    ImageIcon,
    VideoIcon,
    RefreshCwIcon,
    PlayIcon
} from './Icons';

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

const AlertCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);

const ArrowUpIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m18 15-6-6-6 6"/></svg>
);

const ArrowDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>
);

const ExternalLinkIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
);

const GoogleDriveIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M8.5 3.5h7l6 10.5-3.5 6.5h-7l-6-10.5 3.5-6.5z" />
        <path d="M2.5 14h7l3.5 6.5h-7L2.5 14z" fill="currentColor" fillOpacity="0.2" />
    </svg>
);

const PencilIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
);

const SunHorizonIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 10V2"/><path d="m4.93 10.93 1.41-1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41-1.41"/><path d="M22 22H2"/><path d="m8 22 4-10 4 10"/><path d="M16 18a4 4 0 0 0-8 0"/></svg>
);

const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
);

const sanitizeVideoUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const id = url.match(/(?:v=|\/embed\/|\/watch\?v=|\/\d+\/|\/vi\/|be\/)([a-zA-Z0-9_-]{11})/)?.[1];
        if (id) {
            return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&rel=0&enablejsapi=1&playsinline=1&iv_load_policy=3`;
        }
    }
    return url;
};

const isDirectVideo = (url: string) => 
    /\.(mp4|webm|ogg|mov)$/i.test(url) || 
    url.includes('video-stream') || 
    url.includes('/video/') ||
    url.includes('drive.google.com');

const getDirectDriveUrl = (url: string) => {
    if (!url.includes('drive.google.com')) return url;
    const fileIdMatch = url.match(/\/d\/(.+?)\/(?:view|edit|preview)?/) || 
                      url.match(/id=(.+?)(?:&|$)/) ||
                      url.match(/\/file\/d\/(.+?)$/);
    if (fileIdMatch && fileIdMatch[1]) {
        return `https://docs.google.com/uc?export=download&id=${fileIdMatch[1]}`;
    }
    return url;
};

const calcularTurnoPorHorario = (horarioStr: string): string => {
    if (!horarioStr || !horarioStr.includes(':')) return 'Matutino';
    const [horas, minutos] = horarioStr.split(':').map(Number);
    const totalMinutos = (horas * 60) + (minutos || 0);
    if (totalMinutos >= 360 && totalMinutos <= 690) return 'Matutino';
    if (totalMinutos >= 691 && totalMinutos <= 1050) return 'Vespertino';
    if (totalMinutos >= 1051 && totalMinutos <= 1320) return 'Noturno';
    return totalMinutos < 360 ? 'Matutino' : 'Noturno';
};

const EditModal: React.FC<{ aula: Aula; onSave: (d: Partial<Aula>) => void; onClose: () => void }> = ({ aula, onSave, onClose }) => {
    const [formData, setFormData] = useState<Partial<Aula>>(aula);
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0F2A52]/80 backdrop-blur-xl">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border border-[#E5E7EB] w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative text-[#0F2A52]"
            >
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-wider text-[#0F2A52]">Editar Registro</h2>
                        <p className="text-[11px] text-[#6B7280] font-bold uppercase tracking-[0.2em] mt-1">ID: {aula.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-[#DBEAFE] rounded-full transition-all text-[#6B7280] hover:text-[#0F2A52]"><XIcon className="w-5 h-5" /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); onSave(formData); }} className="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto max-h-[65vh] pr-2 custom-scrollbar">
                    <datalist id="canonical-uc-list">
                        {CANONICAL_UNIDADES_CURRICULARES.map((uc, i) => (
                            <option key={i} value={uc} />
                        ))}
                    </datalist>
                    {[
                        { label: 'Turma', key: 'turma' },
                        { label: 'Ambiente / Sala', key: 'sala' },
                        { label: 'Instrutor', key: 'instrutor' },
                        { label: 'Unidade Curricular', key: 'unidade_curricular', list: 'canonical-uc-list' },
                        { label: 'Início (Ex: 08:00)', key: 'inicio' },
                        { label: 'Fim (Ex: 12:00)', key: 'fim' },
                        { label: 'Data (Ex: DD/MM/YYYY)', key: 'data' },
                        { label: 'Vídeo URL (Opicional)', key: 'videoUrl' },
                        { label: 'Material URL (Opicional)', key: 'materialUrl' }
                    ].map(field => (
                        <div key={field.key} className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-[0.2em] px-1">{field.label}</label>
                            <input 
                                list={(field as any).list}
                                value={(formData as any)[field.key] || ''} 
                                onChange={e => setFormData({ ...formData, [field.key]: e.target.value })} 
                                className="bg-[#F8FAFC] border border-[#E5E7EB] p-4 rounded-xl text-xs outline-none focus:border-[#F4901E] transition-all text-[#0F2A52] placeholder-[#6B7280]"
                            />
                        </div>
                    ))}
                    <div className="md:col-span-2 mt-6 flex gap-4">
                        <button type="submit" className="flex-1 bg-[#F4901E] text-white py-4 rounded-xl font-black uppercase text-xs hover:bg-[#E67E22] transition-all shadow-lg active:scale-95 tracking-[0.2em]">Confirmar Alterações</button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const AddModal: React.FC<{ onSave: (d: Omit<Aula, 'id'>) => void; onClose: () => void }> = ({ onSave, onClose }) => {
    const [formData, setFormData] = useState<Omit<Aula, 'id'>>({
        data: new Date().toLocaleDateString('pt-BR'),
        sala: '',
        turma: '',
        instrutor: '',
        unidade_curricular: '',
        inicio: '08:00',
        fim: '12:00',
        turno: 'Matutino',
        videoUrl: '',
        materialUrl: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalData = {
            ...formData,
            turno: calcularTurnoPorHorario(formData.inicio)
        };
        onSave(finalData);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0F2A52]/80 backdrop-blur-xl">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border border-[#E5E7EB] w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative text-[#0F2A52]"
            >
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-wider text-[#0F2A52]">Adicionar Aula</h2>
                        <p className="text-[11px] text-[#6B7280] font-bold uppercase tracking-[0.2em] mt-1">Inserção Manual</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-[#DBEAFE] rounded-full transition-all text-[#6B7280] hover:text-[#0F2A52]"><XIcon className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto max-h-[65vh] pr-2 custom-scrollbar">
                    <datalist id="canonical-uc-list-add">
                        {CANONICAL_UNIDADES_CURRICULARES.map((uc, i) => (
                            <option key={i} value={uc} />
                        ))}
                    </datalist>
                    {[
                        { label: 'Data', key: 'data', placeholder: 'DD/MM/YYYY' },
                        { label: 'Sala / Ambiente', key: 'sala', placeholder: 'Ex: LAB 101' },
                        { label: 'Turma', key: 'turma', placeholder: 'Ex: Técnico ADS' },
                        { label: 'Instrutor', key: 'instrutor', placeholder: 'Nome do Instrutor' },
                        { label: 'Unidade Curricular', key: 'unidade_curricular', placeholder: 'Nome da Matéria', list: 'canonical-uc-list-add' },
                        { label: 'Horário Início', key: 'inicio', placeholder: '08:00' },
                        { label: 'Horário Fim', key: 'fim', placeholder: '12:00' },
                        { label: 'Vídeo URL', key: 'videoUrl', placeholder: 'https://youtube.com/...' },
                        { label: 'Material URL', key: 'materialUrl', placeholder: 'https://link-do-material.com' }
                    ].map(field => (
                        <div key={field.key} className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-[0.2em] px-1">{field.label}</label>
                            <input 
                                list={(field as any).list}
                                required={field.key !== 'videoUrl' && field.key !== 'materialUrl'}
                                placeholder={field.placeholder}
                                value={(formData as any)[field.key]} 
                                onChange={e => setFormData({ ...formData, [field.key]: e.target.value })} 
                                className="bg-[#F8FAFC] border border-[#E5E7EB] p-4 rounded-xl text-xs outline-none focus:border-[#F4901E] transition-all text-[#0F2A52] placeholder-[#6B7280]"
                            />
                        </div>
                    ))}
                    <div className="md:col-span-2 mt-6 flex gap-4">
                        <button type="submit" className="flex-1 bg-[#F4901E] text-white py-4 rounded-xl font-black uppercase text-xs hover:bg-[#E67E22] transition-all shadow-lg active:scale-95 tracking-[0.2em]">Salvar Registro</button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// Componente Especializado para Gerenciamento de Mídia (Fotos e Vídeos MP4)
const MediaManagementSection: React.FC = () => {
    const context = useContext(DataContext) as ExtendedDataContextType;
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
    const [urlInput, setUrlInput] = useState('');
    const [nameInput, setNameInput] = useState('');
    const [urlType, setUrlType] = useState<'auto' | 'video' | 'image'>('auto');

    // Configuração Cloudinary editável em tempo real
    const [showCloudinarySettings, setShowCloudinarySettings] = useState(false);
    const [cloudNameSetting, setCloudNameSetting] = useState(() => localStorage.getItem('CLOUDINARY_CLOUD_NAME') || import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dlrdwblso');
    const [presetSetting, setPresetSetting] = useState(() => localStorage.getItem('CLOUDINARY_UPLOAD_PRESET') || import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '');
    const [configSavedNotice, setConfigSavedNotice] = useState(false);

    const handleSaveCloudinaryConfig = () => {
        localStorage.setItem('CLOUDINARY_CLOUD_NAME', cloudNameSetting.trim());
        localStorage.setItem('CLOUDINARY_UPLOAD_PRESET', presetSetting.trim());
        setConfigSavedNotice(true);
        setTimeout(() => setConfigSavedNotice(false), 3000);
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const replaceInputRef = useRef<HTMLInputElement>(null);
    const replaceAllInputRef = useRef<HTMLInputElement>(null);
    const targetReplaceAdRef = useRef<{ id: string; storagePath?: string } | null>(null);

    const MAX_MEDIAS = 5;
    const currentCount = context.anuncios.length;
    const isAtLimit = currentCount >= MAX_MEDIAS;

    const handleFilesSelected = async (files: FileList | File[], replaceAll: boolean = false) => {
        if (!files || files.length === 0) return;

        if (!replaceAll && isAtLimit) {
            alert(`O carrossel já atingiu o limite máximo de ${MAX_MEDIAS} mídias. Exclua ou substitua uma mídia existente para adicionar novas.`);
            return;
        }

        setUploading(true);
        setUploadStatus(replaceAll ? 'Substituindo carrossel completo...' : 'Processando mídias...');

        try {
            if (replaceAll) {
                await context.clearAllAnuncios();
            }

            const fileArray = Array.from(files);
            const remainingSlots = replaceAll ? MAX_MEDIAS : (MAX_MEDIAS - currentCount);
            const filesToProcess = fileArray.slice(0, remainingSlots);

            if (fileArray.length > remainingSlots && !replaceAll) {
                alert(`Apenas os primeiros ${remainingSlots} arquivos serão adicionados para não ultrapassar o limite de ${MAX_MEDIAS} mídias.`);
            }

            for (let i = 0; i < filesToProcess.length; i++) {
                const file = filesToProcess[i];
                const isVid = file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg)$/i.test(file.name);
                
                // Validação de tamanho para vídeos (máximo 50MB)
                const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
                if (isVid && file.size > MAX_VIDEO_SIZE) {
                    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
                    alert(`O vídeo "${file.name}" tem ${sizeMB}MB e excede o limite máximo permitido de 50MB. Por favor, utilize um arquivo de até 50MB ou utilize um link público do Google Drive.`);
                    continue;
                }

                setUploadStatus(`Enviando arquivo ${i + 1} de ${filesToProcess.length}: ${file.name}...`);
                const uploaded = await context.uploadMediaFile(file);
                
                const adData: Omit<Anuncio, 'id'> = {
                    src: uploaded.src,
                    type: uploaded.type,
                    name: uploaded.name || file.name,
                    duration: uploaded.type === 'video' ? 60 : 10,
                    ordem: replaceAll ? i : (currentCount + i)
                };
                if (uploaded.storagePath) {
                    adData.storagePath = uploaded.storagePath;
                }

                await context.addAnuncio(adData);
            }
            setUploadStatus(null);
        } catch (err: any) {
            console.error("Erro ao enviar mídias:", err);
            alert("Erro ao salvar mídias: " + (err.message || 'Erro desconhecido'));
        } finally {
            setUploading(false);
            setUploadStatus(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (replaceAllInputRef.current) replaceAllInputRef.current.value = '';
        }
    };

    const handleSingleReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !targetReplaceAdRef.current) return;

        const isVid = file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg)$/i.test(file.name);
        const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
        if (isVid && file.size > MAX_VIDEO_SIZE) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            alert(`O vídeo "${file.name}" tem ${sizeMB}MB e excede o limite máximo permitido de 50MB. Por favor, utilize um arquivo de até 50MB.`);
            if (replaceInputRef.current) replaceInputRef.current.value = '';
            targetReplaceAdRef.current = null;
            return;
        }

        setUploading(true);
        setUploadStatus(`Substituindo mídia por: ${file.name}...`);

        try {
            const uploaded = await context.uploadMediaFile(file);
            const adData: Omit<Anuncio, 'id'> = {
                src: uploaded.src,
                type: uploaded.type,
                name: uploaded.name || file.name,
                duration: uploaded.type === 'video' ? 60 : 10
            };
            if (uploaded.storagePath) {
                adData.storagePath = uploaded.storagePath;
            }

            await context.replaceAnuncio(
                targetReplaceAdRef.current.id,
                adData,
                targetReplaceAdRef.current.storagePath
            );
        } catch (err: any) {
            console.error("Erro ao substituir mídia:", err);
            alert("Erro ao substituir mídia: " + (err.message || 'Erro desconhecido'));
        } finally {
            setUploading(false);
            setUploadStatus(null);
            targetReplaceAdRef.current = null;
            if (replaceInputRef.current) replaceInputRef.current.value = '';
        }
    };

    const handleAddUrl = async () => {
        if (!urlInput.trim()) return;

        if (isAtLimit) {
            alert(`O limite máximo de ${MAX_MEDIAS} mídias já foi atingido. Remova uma mídia para poder adicionar outra.`);
            return;
        }

        const rawUrl = urlInput.trim();
        const driveId = extractDriveFileId(rawUrl);
        const isDrive = isGoogleDriveUrl(rawUrl) || !!driveId;
        const isYT = !!extractYouTubeId(rawUrl);
        const isVcdn = isVcdnUrl(rawUrl);
        const isDirectVid = isDirectVideoUrl(rawUrl);

        let finalType: 'video' | 'image' = 'image';
        if (urlType === 'video') {
            finalType = 'video';
        } else if (urlType === 'image') {
            finalType = 'image';
        } else {
            // Auto detect
            finalType = (isDrive || isYT || isVcdn || isDirectVid) ? 'video' : 'image';
        }

        let finalName = nameInput.trim();
        if (!finalName) {
            if (isVcdn) finalName = 'Vídeo VCDN / VdoHide';
            else if (isDrive) finalName = 'Vídeo Google Drive';
            else if (isYT) finalName = 'Vídeo YouTube';
            else if (finalType === 'video') finalName = 'Vídeo Web';
            else finalName = 'Imagem Web';
        }

        setUploading(true);
        setUploadStatus('Adicionando link ao carrossel...');

        try {
            await context.addAnuncio({
                src: rawUrl,
                type: finalType,
                name: finalName,
                duration: finalType === 'video' ? 60 : 10,
                ordem: currentCount
            });
            setUrlInput('');
            setNameInput('');
        } catch (err: any) {
            console.error("Erro ao adicionar link:", err);
            alert("Erro ao adicionar link: " + (err.message || 'Erro desconhecido'));
        } finally {
            setUploading(false);
            setUploadStatus(null);
        }
    };

    const handleMoveOrder = async (currentIndex: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= context.anuncios.length) return;

        const listCopy = [...context.anuncios];
        const temp = listCopy[currentIndex];
        listCopy[currentIndex] = listCopy[newIndex];
        listCopy[newIndex] = temp;

        try {
            await context.reorderAnuncios(listCopy);
        } catch (err) {
            console.error("Erro ao alterar ordem:", err);
        }
    };

    const triggerReplaceItem = (ad: Anuncio) => {
        targetReplaceAdRef.current = { id: ad.id, storagePath: ad.storagePath };
        replaceInputRef.current?.click();
    };

    const handleClearAllConfirm = async () => {
        if (window.confirm("Deseja realmente excluir TODAS as imagens e vídeos do carrossel? Os arquivos serão removidos do banco.")) {
            setUploading(true);
            try {
                await context.clearAllAnuncios();
            } finally {
                setUploading(false);
            }
        }
    };

    // Detecção em tempo real para ajudar o usuário
    const detectedDriveId = extractDriveFileId(urlInput);
    const isDetectedDrive = isGoogleDriveUrl(urlInput) || !!detectedDriveId;
    const isDetectedYT = !!extractYouTubeId(urlInput);
    const isDetectedVcdn = isVcdnUrl(urlInput);

    return (
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-[#E5E7EB] shadow-lg flex flex-col gap-6">
            {/* Hidden Inputs */}
            <input 
                type="file" 
                ref={fileInputRef} 
                multiple 
                accept="image/png,image/jpeg,image/jpg,image/webp,video/mp4,video/webm,.png,.jpg,.jpeg,.mp4,.webm" 
                className="hidden" 
                onChange={(e) => e.target.files && handleFilesSelected(e.target.files, false)} 
            />
            <input 
                type="file" 
                ref={replaceAllInputRef} 
                multiple 
                accept="image/png,image/jpeg,image/jpg,image/webp,video/mp4,video/webm,.png,.jpg,.jpeg,.mp4,.webm" 
                className="hidden" 
                onChange={(e) => e.target.files && handleFilesSelected(e.target.files, true)} 
            />
            <input 
                type="file" 
                ref={replaceInputRef} 
                accept="image/png,image/jpeg,image/jpg,image/webp,video/mp4,video/webm,.png,.jpg,.jpeg,.mp4,.webm" 
                className="hidden" 
                onChange={handleSingleReplace} 
            />

            {/* Cabeçalho com Contador de Mídias e Limite de 5 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F4901E] to-[#E67E22] flex items-center justify-center text-white shadow-md shadow-[#F4901E]/20">
                        <CameraIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-[#0F2A52]">Mídia Rotativa</h2>
                        <span className="text-[10px] text-[#6B7280] font-bold">Upload direto de fotos e vídeos MP4</span>
                    </div>
                </div>
                
                {/* Indicador de Capacidade (Até 5 Mídias) */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 rounded-full">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#0F2A52]">
                            {currentCount} / {MAX_MEDIAS}
                        </span>
                        <span className="text-[9px] font-bold text-[#64748B]">Mídias</span>
                        <div className="flex items-center gap-1 ml-1.5">
                            {Array.from({ length: MAX_MEDIAS }).map((_, idx) => (
                                <span 
                                    key={idx} 
                                    className={`w-2 h-2 rounded-full transition-all ${
                                        idx < currentCount ? 'bg-[#F4901E]' : 'bg-[#CBD5E1]'
                                    }`} 
                                    title={`Posição ${idx + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Aviso de Limite de 5 Mídias */}
            {isAtLimit && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-amber-900">
                    <span className="text-base">⚠️</span>
                    <div className="text-[11px] font-bold flex-1">
                        Limite máximo de {MAX_MEDIAS} mídias atingido. Para adicionar novos links ou vídeos, exclua ou substitua uma das mídias existentes na lista abaixo.
                    </div>
                </div>
            )}

            {/* Formatos Suportados Simplificado */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#0F2A52] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#F4901E]" />
                    Formatos Suportados & Autoplay Imediato
                </span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#0F2A52]/5 text-[#0F2A52]">
                    Proporção 9:16 (Vertical)
                </span>
            </div>

            {/* Tabs de Entrada: Upload Direto (Primário) & Link / Web */}
            <div className="flex bg-[#F1F5F9] p-1 rounded-2xl gap-1">
                <button
                    onClick={() => setActiveTab('upload')}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'upload' 
                        ? 'bg-white text-[#0F2A52] shadow-sm' 
                        : 'text-[#6B7280] hover:text-[#0F2A52]'
                    }`}
                >
                    <UploadCloudIcon className="w-3.5 h-3.5" /> Upload de Arquivo (Principal)
                </button>
                <button
                    onClick={() => setActiveTab('url')}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'url' 
                        ? 'bg-white text-[#0F2A52] shadow-sm' 
                        : 'text-[#6B7280] hover:text-[#0F2A52]'
                    }`}
                >
                    <GoogleDriveIcon className="w-3.5 h-3.5 text-[#F4901E]" /> Adicionar por Link Web
                </button>
            </div>

            {/* Aba 1 (Primária): Upload Direto de Arquivos (PNG, JPG, MP4) */}
            {activeTab === 'upload' && (
                <div className="flex flex-col gap-3">
                    {/* Status de Nuvem: Cloudinary */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-emerald-900 text-xs font-bold">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>Nuvem: <code className="bg-emerald-100 px-1.5 py-0.5 rounded font-mono">{cloudNameSetting || 'dlrdwblso'}</code></span>
                                {presetSetting ? (
                                    <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded font-mono">Preset: {presetSetting}</span>
                                ) : (
                                    <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">Sem Preset Informado</span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCloudinarySettings(!showCloudinarySettings)}
                                className="text-[10px] font-black uppercase text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1 cursor-pointer"
                            >
                                {showCloudinarySettings ? 'Ocultar Ajustes' : '⚙️ Ajustar Preset / Nuvem'}
                            </button>
                        </div>

                        {showCloudinarySettings && (
                            <div className="mt-2 pt-2.5 border-t border-emerald-200/80 flex flex-col gap-2.5 bg-white p-3 rounded-lg border text-xs">
                                <div className="text-[11px] text-[#475569] leading-relaxed">
                                    <strong className="text-[#0F2A52]">Como corrigir o erro de Preset:</strong> No painel do Cloudinary &gt; <strong>⚙️ Settings &gt; Upload &gt; Upload Presets</strong> &gt; localize o preset com modo <strong>Unsigned</strong> e digite o nome exato dele abaixo.
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-[#0F2A52]">Cloud Name:</label>
                                        <input 
                                            type="text"
                                            value={cloudNameSetting}
                                            onChange={(e) => setCloudNameSetting(e.target.value)}
                                            placeholder="dlrdwblso"
                                            className="w-full bg-white border border-[#CBD5E1] p-2 rounded text-xs font-mono font-bold text-[#0F2A52] outline-none focus:border-[#F4901E]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-[#0F2A52]">Upload Preset (Unsigned):</label>
                                        <input 
                                            type="text"
                                            value={presetSetting}
                                            onChange={(e) => setPresetSetting(e.target.value)}
                                            placeholder="Ex: painel_midia ou videos"
                                            className="w-full bg-white border border-[#CBD5E1] p-2 rounded text-xs font-mono font-bold text-[#0F2A52] outline-none focus:border-[#F4901E]"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-[10px] text-emerald-700 font-bold">
                                        {configSavedNotice ? '✅ Configurações salvas com sucesso!' : ''}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleSaveCloudinaryConfig}
                                        className="bg-[#0F2A52] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#1D4E8C] transition-all"
                                    >
                                        Salvar e Aplicar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                handleFilesSelected(e.dataTransfer.files, false);
                            }
                        }}
                        onClick={() => !isAtLimit && fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center gap-3 ${
                            isAtLimit 
                            ? 'opacity-60 cursor-not-allowed border-[#CBD5E1] bg-[#F8FAFC]'
                            : isDragging 
                            ? 'border-[#F4901E] bg-[#F4901E]/5 scale-[0.99] cursor-pointer' 
                            : 'border-[#CBD5E1] hover:border-[#F4901E] hover:bg-[#F8FAFC] cursor-pointer'
                        }`}
                    >
                        <div className="w-12 h-12 rounded-2xl bg-[#0F2A52]/5 flex items-center justify-center text-[#1D4E8C]">
                            <UploadCloudIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase text-[#0F2A52] tracking-wider">
                                {isAtLimit ? 'Limite de 5 mídias atingido' : 'Clique para selecionar ou arraste arquivos'}
                            </p>
                            <p className="text-[10px] text-[#6B7280] font-bold mt-1">
                                Suporta fotos PNG, JPG, JPEG e vídeos MP4 (Upload Direto em Nuvem)
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] font-black">PNG</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-black">JPG</span>
                            <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 text-[9px] font-black">MP4 (Vídeo)</span>
                        </div>
                    </div>

                    {/* Botões de Ação em Massa */}
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => replaceAllInputRef.current?.click()}
                            disabled={uploading}
                            className="bg-[#0F2A52] text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-wider hover:bg-[#1D4E8C] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <RefreshCwIcon className="w-3.5 h-3.5" /> Substituir Tudo
                        </button>
                        <button 
                            onClick={handleClearAllConfirm}
                            disabled={uploading || context.anuncios.length === 0}
                            className="bg-[#EF5B2E]/10 text-[#EF5B2E] border border-[#EF5B2E]/20 py-3 rounded-xl font-black uppercase text-[10px] tracking-wider hover:bg-[#EF5B2E] hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                        >
                            <TrashIcon className="w-3.5 h-3.5" /> Limpar Mídias
                        </button>
                    </div>
                </div>
            )}

            {/* Aba 2: Adicionar por Link Web (Google Drive, YouTube, Web) */}
            {activeTab === 'url' && (
                <div className="flex flex-col gap-3.5 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase text-[#0F2A52] tracking-wider px-1">
                                Link da Mídia Web
                            </label>
                            {isDetectedYT && (
                                <span className="text-[9px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                    YouTube detectado
                                </span>
                            )}
                        </div>
                        <input 
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            disabled={isAtLimit}
                            placeholder="Ex: https://... ou link de vídeo" 
                            className="bg-white border border-[#CBD5E1] p-3.5 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52] font-semibold placeholder-[#94A3B8] disabled:opacity-50"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider px-1">Título / Descrição (Opcional)</label>
                            <input 
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                disabled={isAtLimit}
                                placeholder="Ex: Vídeo Institucional SENAI" 
                                className="bg-white border border-[#CBD5E1] p-3.5 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52] font-semibold placeholder-[#94A3B8] disabled:opacity-50"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider px-1">Tipo de Mídia</label>
                            <select 
                                value={urlType}
                                onChange={(e) => setUrlType(e.target.value as any)}
                                disabled={isAtLimit}
                                className="bg-white border border-[#CBD5E1] p-3.5 rounded-xl text-xs outline-none focus:border-[#F4901E] text-[#0F2A52] font-bold cursor-pointer disabled:opacity-50"
                            >
                                <option value="auto">Auto-detectar</option>
                                <option value="video">Vídeo (1 minuto com autoplay)</option>
                                <option value="image">Foto / Imagem (10 segundos)</option>
                            </select>
                        </div>
                    </div>

                    <button 
                        onClick={handleAddUrl}
                        disabled={!urlInput.trim() || isAtLimit || uploading}
                        className="bg-[#F4901E] text-white py-3.5 rounded-xl font-black hover:bg-[#E67E22] transition-all shadow-md uppercase text-[10px] tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <PlusCircleIcon className="w-4 h-4" />
                        Adicionar Link ao Carrossel ({currentCount}/{MAX_MEDIAS})
                    </button>
                </div>
            )}

            {/* Status de Upload e Sincronização */}
            {uploading && (
                <div className="p-3.5 rounded-xl bg-[#F4901E]/10 border border-[#F4901E]/30 flex items-center gap-3 text-[#0F2A52]">
                    <RefreshCwIcon className="w-4 h-4 animate-spin text-[#F4901E]" />
                    <span className="text-[11px] font-bold">{uploadStatus || 'Sincronizando com o banco de dados...'}</span>
                </div>
            )}

            {/* Lista das Mídias Ativas no Carrossel na Ordem Exata de Exibição */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#0F2A52]">
                            Ordem de Exibição no Painel
                        </span>
                        <span className="text-[9px] font-bold text-[#64748B]">
                            ({context.anuncios.length} de {MAX_MEDIAS} cadastrados)
                        </span>
                    </div>
                    <span className="text-[9px] font-bold text-[#F4901E] uppercase">
                        Carrossel Lateral Direito
                    </span>
                </div>

                <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                    {context.anuncios.map((ad, index) => {
                        const isDrive = isGoogleDriveUrl(ad.src);
                        const isYT = !!extractYouTubeId(ad.src);
                        const isVid = ad.type === 'video' || isDirectVideoUrl(ad.src) || isDrive || isYT;
                        const badge = getMediaBadgeInfo(ad.src, ad.type);

                        return (
                            <div 
                                key={ad.id} 
                                className="relative rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] overflow-hidden p-3.5 flex flex-col sm:flex-row sm:items-center gap-3.5 hover:shadow-md transition-all"
                            >
                                {/* Número de Posição & Controles de Reordenação */}
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <div className="flex flex-col items-center justify-center bg-[#0F2A52] text-white w-9 h-9 rounded-xl font-black text-xs shadow-sm">
                                        <span className="text-[8px] text-[#94A3B8] font-bold leading-none">POS</span>
                                        <span className="leading-tight">#{index + 1}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <button 
                                            onClick={() => handleMoveOrder(index, 'up')}
                                            disabled={index === 0}
                                            title="Subir ordem de exibição"
                                            className="w-6 h-4 rounded bg-white border border-[#CBD5E1] text-[#0F2A52] hover:bg-[#DBEAFE] hover:border-[#1D4E8C] flex items-center justify-center disabled:opacity-20 disabled:hover:bg-white transition-all"
                                        >
                                            <ArrowUpIcon className="w-3 h-3" />
                                        </button>
                                        <button 
                                            onClick={() => handleMoveOrder(index, 'down')}
                                            disabled={index === context.anuncios.length - 1}
                                            title="Descer ordem de exibição"
                                            className="w-6 h-4 rounded bg-white border border-[#CBD5E1] text-[#0F2A52] hover:bg-[#DBEAFE] hover:border-[#1D4E8C] flex items-center justify-center disabled:opacity-20 disabled:hover:bg-white transition-all"
                                        >
                                            <ArrowDownIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>

                                {/* Miniatura / Preview da Mídia */}
                                <div className="w-24 h-16 rounded-xl bg-[#0A192F] overflow-hidden flex-shrink-0 relative flex items-center justify-center border border-[#CBD5E1]/50">
                                    {isYT ? (
                                        <div className="w-full h-full bg-red-950 flex flex-col items-center justify-center text-white">
                                            <PlayIcon className="w-5 h-5 text-red-500" />
                                            <span className="text-[7px] font-black text-red-300 uppercase">YouTube</span>
                                        </div>
                                    ) : isDrive ? (
                                        <div className="w-full h-full bg-amber-950 flex flex-col items-center justify-center text-white">
                                            <GoogleDriveIcon className="w-5 h-5 text-amber-400" />
                                            <span className="text-[7px] font-black text-amber-300 uppercase">Drive Vídeo</span>
                                        </div>
                                    ) : isDirectVideoUrl(ad.src) || ad.type === 'video' ? (
                                        <video 
                                            src={ad.src} 
                                            className="w-full h-full object-cover" 
                                            muted 
                                            playsInline 
                                        />
                                    ) : (
                                        <img 
                                            src={ad.src} 
                                            className="w-full h-full object-cover" 
                                            alt={ad.name || "Mídia"} 
                                            referrerPolicy="no-referrer" 
                                        />
                                    )}
                                    <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[7px] font-black text-white">
                                        {isVid ? '60s' : '10s'}
                                    </div>
                                </div>

                                {/* Detalhes da Mídia */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${badge.color}`}>
                                            {badge.label}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#E2E8F0] text-[#475569]">
                                            {index === 0 ? '1º a Exibir' : `${index + 1}º da Fila`}
                                        </span>
                                        {ad.storagePath && (
                                            <span className="text-[8px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                Storage OK
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs font-black text-[#0F2A52] truncate mt-1">
                                        {ad.name || (isVid ? 'Vídeo Carrossel' : 'Foto Carrossel')}
                                    </p>
                                    <p className="text-[9px] text-[#6B7280] truncate font-mono mt-0.5" title={ad.src}>
                                        {ad.src.startsWith('data:') ? 'Base64 Local' : ad.src}
                                    </p>
                                </div>

                                {/* Ações: Abrir Link, Substituir e Excluir */}
                                <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                                    {!ad.src.startsWith('data:') && (
                                        <a 
                                            href={ad.src} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            title="Abrir e testar link em nova aba"
                                            className="p-2 rounded-xl bg-white border border-[#CBD5E1] text-[#0F2A52] hover:bg-[#F1F5F9] transition-all text-[10px] font-bold flex items-center gap-1"
                                        >
                                            <ExternalLinkIcon className="w-3.5 h-3.5 text-[#1D4E8C]" />
                                            <span className="hidden md:inline">Testar Link</span>
                                        </a>
                                    )}
                                    <button 
                                        onClick={() => triggerReplaceItem(ad)}
                                        title="Substituir arquivo desta posição"
                                        className="p-2 rounded-xl bg-white border border-[#CBD5E1] text-[#0F2A52] hover:bg-[#DBEAFE] hover:border-[#1D4E8C] transition-all text-[10px] font-bold flex items-center gap-1"
                                    >
                                        <RefreshCwIcon className="w-3.5 h-3.5 text-[#1D4E8C]" />
                                        <span className="hidden sm:inline">Substituir</span>
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (window.confirm(`Excluir a mídia #${index + 1} (${ad.name || 'Mídia'}) do carrossel?`)) {
                                                context.deleteAnuncio(ad.id, ad.storagePath);
                                            }
                                        }}
                                        title="Excluir Mídia"
                                        className="p-2 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {context.anuncios.length === 0 && (
                        <div className="py-12 text-center text-[10px] font-bold text-[#6B7280] uppercase tracking-[0.2em] border-2 border-dashed border-[#E5E7EB] rounded-2xl flex flex-col items-center justify-center gap-2 bg-[#F8FAFC]">
                            <ImageIcon className="w-7 h-7 text-[#94A3B8]" />
                            <span className="text-xs text-[#0F2A52]">Nenhuma mídia no carrossel</span>
                            <span className="text-[10px] font-normal normal-case text-[#64748B] max-w-sm">
                                Adicione até 5 links públicos do Google Drive, vídeos YouTube ou imagens para exibir em loop rotativo ao lado dos horários de aula.
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Modal para Rejeitar Agendamento com Motivo
const RejeitarModal: React.FC<{
    agendamento: AgendamentoSala;
    onClose: () => void;
    onConfirm: (motivo: string) => void;
}> = ({ agendamento, onClose, onConfirm }) => {
    const [motivo, setMotivo] = useState('');

    return (
        <div className="fixed inset-0 bg-[#0F2A52]/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl border border-[#E5E7EB]"
            >
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                            ✕
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-[#0F2A52]">Recusar Solicitação</h3>
                            <p className="text-xs text-[#6B7280]">Sala: <span className="font-bold text-[#F4901E]">{formatarNomeSala(agendamento.sala)}</span> ({agendamento.data})</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-[#6B7280] hover:text-[#0F2A52] rounded-xl hover:bg-[#F1F5F9]"><XIcon className="w-5 h-5" /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-wider block mb-1.5">
                            Motivo da Recusa (Opcional)
                        </label>
                        <textarea
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder="Ex: Sala em manutenção técnica ou reservada para evento institucional..."
                            rows={3}
                            className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl p-3.5 text-xs text-[#0F2A52] outline-none focus:border-red-500 transition-all resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
                        <button
                            onClick={onClose}
                            className="px-5 py-3 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#6B7280] hover:bg-[#F8FAFC]"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => onConfirm(motivo)}
                            className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider shadow-md"
                        >
                            Confirmar Recusa
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// Modal para Aprovar Agendamento com opção de criar no Cronograma
const AprovarModal: React.FC<{
    agendamento: AgendamentoSala;
    onClose: () => void;
    onConfirm: (criarAula: boolean) => void;
}> = ({ agendamento, onClose, onConfirm }) => {
    const [criarAula, setCriarAula] = useState(true);

    return (
        <div className="fixed inset-0 bg-[#0F2A52]/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl border border-[#E5E7EB]"
            >
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            ✓
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-[#0F2A52]">Aprovar Agendamento</h3>
                            <p className="text-xs text-[#6B7280]">Sala: <span className="font-bold text-[#F4901E]">{agendamento.sala}</span></p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-[#6B7280] hover:text-[#0F2A52] rounded-xl hover:bg-[#F1F5F9]"><XIcon className="w-5 h-5" /></button>
                </div>

                <div className="space-y-4">
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl space-y-2 text-xs">
                        <div className="flex justify-between"><span className="text-[#64748B]">Data:</span> <span className="font-bold text-[#0F2A52]">{agendamento.data}</span></div>
                        <div className="flex justify-between"><span className="text-[#64748B]">Turno:</span> <span className="font-bold text-[#0F2A52]">{agendamento.turno}</span></div>
                        <div className="flex justify-between"><span className="text-[#64748B]">Solicitante:</span> <span className="font-bold text-[#0F2A52]">{agendamento.solicitante}</span></div>
                        <div className="flex justify-between"><span className="text-[#64748B]">Turma / Disciplina:</span> <span className="font-bold text-[#0F2A52]">{agendamento.turma || 'N/A'} • {agendamento.disciplina || 'N/A'}</span></div>
                    </div>

                    <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={criarAula}
                            onChange={(e) => setCriarAula(e.target.checked)}
                            className="mt-0.5 w-4 h-4 text-emerald-600 rounded"
                        />
                        <div className="text-xs">
                            <span className="font-bold text-[#0F2A52] block">Adicionar ao Cronograma Geral do Painel</span>
                            <span className="text-[#64748B] text-[11px]">Cria automaticamente a entrada correspondente para aparecer na TV / tela principal no dia agendado.</span>
                        </div>
                    </label>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
                        <button
                            onClick={onClose}
                            className="px-5 py-3 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#6B7280] hover:bg-[#F8FAFC]"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => onConfirm(criarAula)}
                            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md"
                        >
                            Aprovar Agora
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// Seção de Gerenciamento de Solicitações de Salas (Agendamentos)
const AgendamentosAdminSection: React.FC = () => {
    const context = useContext(DataContext) as ExtendedDataContextType;
    const [statusFilter, setStatusFilter] = useState<'todos' | 'pendente' | 'aprovado' | 'rejeitado'>('pendente');
    const [searchTerm, setSearchTerm] = useState('');
    const [rejeitandoItem, setRejeitandoItem] = useState<AgendamentoSala | null>(null);
    const [aprovandoItem, setAprovandoItem] = useState<AgendamentoSala | null>(null);

    const agendamentos = context.agendamentos || [];

    const stats = useMemo(() => {
        return {
            total: agendamentos.length,
            pendentes: agendamentos.filter(a => a.status === 'pendente').length,
            aprovados: agendamentos.filter(a => a.status === 'aprovado').length,
            rejeitados: agendamentos.filter(a => a.status === 'rejeitado').length,
        };
    }, [agendamentos]);

    const filteredAgendamentos = useMemo(() => {
        return agendamentos.filter(a => {
            if (statusFilter !== 'todos' && a.status !== statusFilter) return false;
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const matchSala = a.sala.toLowerCase().includes(term);
                const matchSolicitante = a.solicitante.toLowerCase().includes(term);
                const matchTurma = (a.turma || '').toLowerCase().includes(term);
                const matchDisciplina = (a.disciplina || '').toLowerCase().includes(term);
                const matchData = a.data.includes(term);
                return matchSala || matchSolicitante || matchTurma || matchDisciplina || matchData;
            }
            return true;
        });
    }, [agendamentos, statusFilter, searchTerm]);

    const handleAprovar = async (criarAula: boolean) => {
        if (!aprovandoItem) return;
        try {
            await context.aprovarAgendamento(aprovandoItem.id, criarAula);
            setAprovandoItem(null);
        } catch (e) {
            console.error('Erro ao aprovar:', e);
        }
    };

    const handleRejeitar = async (motivo: string) => {
        if (!rejeitandoItem) return;
        try {
            await context.rejeitarAgendamento(rejeitandoItem.id, motivo);
            setRejeitandoItem(null);
        } catch (e) {
            console.error('Erro ao rejeitar:', e);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <AnimatePresence>
                {aprovandoItem && (
                    <AprovarModal
                        agendamento={aprovandoItem}
                        onClose={() => setAprovandoItem(null)}
                        onConfirm={handleAprovar}
                    />
                )}
                {rejeitandoItem && (
                    <RejeitarModal
                        agendamento={rejeitandoItem}
                        onClose={() => setRejeitandoItem(null)}
                        onConfirm={handleRejeitar}
                    />
                )}
            </AnimatePresence>

            {/* Header com Estatísticas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button 
                    onClick={() => setStatusFilter('todos')}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                        statusFilter === 'todos' ? 'bg-[#0F2A52] text-white border-[#0F2A52] shadow-md' : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#0F2A52]'
                    }`}
                >
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-70 block">Total</span>
                    <span className="text-xl font-black">{stats.total}</span>
                </button>

                <button 
                    onClick={() => setStatusFilter('pendente')}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                        statusFilter === 'pendente' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-amber-50/60 border-amber-200 text-amber-900'
                    }`}
                >
                    {stats.pendentes > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    )}
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-70 block">Pendentes</span>
                    <span className="text-xl font-black">{stats.pendentes}</span>
                </button>

                <button 
                    onClick={() => setStatusFilter('aprovado')}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                        statusFilter === 'aprovado' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                    }`}
                >
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-70 block">Aprovados</span>
                    <span className="text-xl font-black">{stats.aprovados}</span>
                </button>

                <button 
                    onClick={() => setStatusFilter('rejeitado')}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                        statusFilter === 'rejeitado' ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-red-50/60 border-red-200 text-red-900'
                    }`}
                >
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-70 block">Recusados</span>
                    <span className="text-xl font-black">{stats.rejeitados}</span>
                </button>
            </div>

            {/* Barra de Busca e Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    placeholder="Filtrar por sala, solicitante, turma, disciplina ou data..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 bg-[#F8FAFC] border border-[#E5E7EB] p-3.5 rounded-xl text-xs outline-none focus:border-[#F4901E] transition-all text-[#0F2A52] placeholder-[#6B7280]"
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700"
                    >
                        Limpar
                    </button>
                )}
            </div>

            {/* Lista de Solicitações */}
            <div className="flex flex-col gap-4">
                {filteredAgendamentos.map((ag) => {
                    const isPendente = ag.status === 'pendente';
                    const isAprovado = ag.status === 'aprovado';
                    const isRejeitado = ag.status === 'rejeitado';

                    return (
                        <div
                            key={ag.id}
                            className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                isPendente 
                                ? 'bg-amber-50/40 border-amber-200 shadow-xs' 
                                : isAprovado 
                                ? 'bg-white border-[#E2E8F0]' 
                                : 'bg-gray-50 border-gray-200 opacity-80'
                            }`}
                        >
                            <div className="flex flex-col gap-2 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-black text-sm text-[#F4901E] uppercase tracking-wider bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100">
                                        {formatarNomeSala(ag.sala)}
                                    </span>
                                    <span className="text-xs font-bold text-[#0F2A52] flex items-center gap-1">
                                        <CalendarIcon className="w-3.5 h-3.5 text-[#64748B]" />
                                        {ag.data} ({ag.turno})
                                    </span>
                                    {ag.horarioPersonalizado && (
                                        <span className="text-[11px] text-[#64748B] font-medium">
                                            • {ag.horarioPersonalizado}
                                        </span>
                                    )}

                                    {/* Status Badge */}
                                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                        isPendente 
                                        ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                        : isAprovado 
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                        : 'bg-red-100 text-red-800 border border-red-200'
                                    }`}>
                                        {isPendente ? 'Pendente' : isAprovado ? 'Aprovado' : 'Recusado'}
                                    </span>
                                </div>

                                <div className="text-xs text-[#334155] grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
                                    <div>
                                        <span className="font-bold text-[#0F2A52]">Solicitante:</span> {ag.solicitante}
                                        {ag.emailSolicitante && <span className="text-[#64748B] text-[11px]"> ({ag.emailSolicitante})</span>}
                                    </div>
                                    <div>
                                        <span className="font-bold text-[#0F2A52]">Turma:</span> {ag.turma || 'Não informada'}
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="font-bold text-[#0F2A52]">Disciplina / Atividade:</span> {ag.disciplina || 'Não informada'}
                                    </div>
                                </div>

                                {ag.motivo && (
                                    <div className="bg-white/80 border border-gray-200 rounded-xl p-2.5 text-xs text-[#475569] mt-1">
                                        <span className="font-bold text-[#0F2A52]">Justificativa / Motivo:</span> {ag.motivo}
                                    </div>
                                )}

                                {ag.motivoRejeicao && (
                                    <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs text-red-800 mt-1">
                                        <span className="font-bold">Motivo da Recusa:</span> {ag.motivoRejeicao}
                                    </div>
                                )}
                            </div>

                            {/* Ações */}
                            <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
                                {isPendente && (
                                    <>
                                        <button
                                            onClick={() => setAprovandoItem(ag)}
                                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                                        >
                                            <CheckCircleIcon className="w-4 h-4" />
                                            <span>Aprovar</span>
                                        </button>
                                        <button
                                            onClick={() => setRejeitandoItem(ag)}
                                            className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all"
                                        >
                                            <span>Recusar</span>
                                        </button>
                                    </>
                                )}

                                {isAprovado && (
                                    <button
                                        onClick={() => setRejeitandoItem(ag)}
                                        className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-700 text-xs font-bold transition-all"
                                        title="Revogar aprovação"
                                    >
                                        Revogar
                                    </button>
                                )}

                                <button
                                    onClick={() => {
                                        if (window.confirm(`Excluir o agendamento da sala ${ag.sala} (${ag.data})?`)) {
                                            context.excluirAgendamento(ag.id);
                                        }
                                    }}
                                    className="p-2.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                    title="Excluir Registro"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {filteredAgendamentos.length === 0 && (
                    <div className="py-16 text-center text-[#6B7280] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[#E5E7EB] rounded-2xl bg-[#F8FAFC]">
                        <BuildingIcon className="w-10 h-10 text-[#94A3B8]" />
                        <span className="text-xs font-bold text-[#0F2A52]">Nenhuma solicitação encontrada</span>
                        <span className="text-[11px] text-[#64748B]">
                            {statusFilter === 'pendente' 
                                ? 'Todas as solicitações de salas já foram moderadas ou ainda não há pedidos pendentes.'
                                : 'Nenhum agendamento corresponde aos filtros selecionados.'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

const AdminPanel: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const context = useContext(DataContext) as ExtendedDataContextType;
    const [adminTab, setAdminTab] = useState<'aulas' | 'agendamentos'>('aulas');
    const [editingAula, setEditingAula] = useState<Aula | null>(null);
    const [addingAula, setAddingAula] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [searchDate, setSearchDate] = useState('');
    const [searchTurma, setSearchTurma] = useState('');
    const [searchInstrutor, setSearchInstrutor] = useState('');
    const [filterShift, setFilterShift] = useState<string | null>(null);

    const pendentesCount = (context.agendamentos || []).filter(a => a.status === 'pendente').length;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            context.uploadCSV(file);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const getTodayFormatted = () => {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const filteredAulasAdmin = useMemo(() => {
        return context.aulas.filter(aula => {
            const matchesDate = !searchDate || aula.data.includes(searchDate);
            const matchesTurma = !searchTurma || aula.turma.toLowerCase().includes(searchTurma.toLowerCase());
            const matchesInstrutor = !searchInstrutor || aula.instrutor.toLowerCase().includes(searchInstrutor.toLowerCase());
            const matchesShift = !filterShift || (aula.turno && aula.turno.toLowerCase() === filterShift.toLowerCase());
            
            return matchesDate && matchesTurma && matchesInstrutor && matchesShift;
        });
    }, [context.aulas, searchDate, searchTurma, searchInstrutor, filterShift]);

    return (
        <div className="min-h-screen bg-[#EDF1F6] text-[#0F2A52] p-6 md:p-12 font-sans relative">
            <AnimatePresence>
                {editingAula && <EditModal aula={editingAula} onClose={() => setEditingAula(null)} onSave={d => { context.updateAula(editingAula.id, d); setEditingAula(null); }} />}
                {addingAula && <AddModal onClose={() => setAddingAula(false)} onSave={d => { context.addAula(d); setAddingAula(false); }} />}
            </AnimatePresence>
            
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 max-w-[2000px] mx-auto">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F4901E]">SENAI • MODERAÇÃO</span>
                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-[#0F2A52] mt-1">Central de Comando</h1>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                        <span className="text-[11px] text-[#6B7280] font-bold uppercase tracking-[0.2em]">Sincronizado com Firebase</span>
                    </div>
                </motion.div>

                <div className="flex flex-wrap justify-center items-center gap-3">
                    <button
                        onClick={() => {
                            window.location.pathname = '/agendamento';
                        }}
                        className="bg-white border border-[#CBD5E1] text-[#0F2A52] px-5 py-3.5 rounded-2xl font-black uppercase text-[11px] flex items-center gap-2 hover:bg-[#F1F5F9] transition-all shadow-xs tracking-wider"
                    >
                        <CalendarIcon className="w-4 h-4 text-[#F4901E]" />
                        <span>Ver Agendamento de Salas</span>
                    </button>

                    <input type="file" accept=".csv,.xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={context.loading}
                        className="bg-[#0F2A52] text-white px-6 py-3.5 rounded-2xl font-black uppercase text-[11px] flex items-center gap-2 hover:bg-[#1D4E8C] transition-all shadow-md disabled:opacity-50 active:scale-95 tracking-wider"
                    >
                        <UploadCloudIcon className={`w-4 h-4 ${context.loading ? 'animate-bounce' : ''}`} /> 
                        {context.loading ? 'Processando...' : 'Upload CSV'}
                    </button>
                    <button 
                        onClick={() => setAddingAula(true)}
                        className="bg-[#F4901E] text-white px-6 py-3.5 rounded-2xl font-black uppercase text-[11px] flex items-center gap-2 hover:bg-[#E67E22] transition-all shadow-md active:scale-95 tracking-wider"
                    >
                        <PlusCircleIcon className="w-4 h-4" /> Nova Aula
                    </button>
                    <button 
                        onClick={() => context.clearAulas()} 
                        className="bg-[#EF5B2E]/10 text-[#EF5B2E] border border-[#EF5B2E]/20 px-5 py-3.5 rounded-2xl font-black uppercase text-[11px] flex items-center gap-2 hover:bg-[#EF5B2E] hover:text-white transition-all active:scale-95 tracking-wider"
                    >
                        <TrashIcon className="w-4 h-4" /> Limpar Tudo
                    </button>
                    <button onClick={onLogout} title="Voltar ao Painel" className="p-3.5 bg-white rounded-2xl hover:bg-[#DBEAFE] transition-colors border border-[#E5E7EB] text-[#0F2A52] shadow-sm"><LogOutIcon className="w-5 h-5" /></button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[2000px] mx-auto">
                {/* Coluna Anúncios / Mídia Rotativa */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <MediaManagementSection />
                </div>

                {/* Coluna Principal: Tabs de Cronograma e Solicitações de Salas */}
                <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] border border-[#E5E7EB] shadow-lg flex flex-col">
                    
                    {/* Seletor de Abas Superior */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b border-[#E5E7EB] pb-4">
                        <div className="flex bg-[#F1F5F9] p-1.5 rounded-2xl gap-2">
                            <button
                                onClick={() => setAdminTab('aulas')}
                                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                    adminTab === 'aulas'
                                        ? 'bg-white text-[#0F2A52] shadow-sm'
                                        : 'text-[#64748B] hover:text-[#0F2A52]'
                                }`}
                            >
                                <FileTextIcon className="w-4 h-4 text-[#1D4E8C]" />
                                <span>Cronograma de Aulas ({context.aulas.length})</span>
                            </button>

                            <button
                                onClick={() => setAdminTab('agendamentos')}
                                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 relative ${
                                    adminTab === 'agendamentos'
                                        ? 'bg-white text-[#0F2A52] shadow-sm'
                                        : 'text-[#64748B] hover:text-[#0F2A52]'
                                }`}
                            >
                                <BuildingIcon className="w-4 h-4 text-[#F4901E]" />
                                <span>Solicitações de Salas</span>
                                {pendentesCount > 0 && (
                                    <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                                        {pendentesCount} pendentes
                                    </span>
                                )}
                            </button>
                        </div>

                        {adminTab === 'aulas' && (
                            <div className="flex items-center gap-4">
                                {context.syncSource && <span className="text-[10px] font-black text-[#F4901E] uppercase tracking-widest bg-[#F4901E]/10 px-3 py-1 rounded-full">{context.syncSource}</span>}
                                <span className="text-[11px] font-black text-[#6B7280] uppercase tracking-[0.2em]">{filteredAulasAdmin.length} de {context.aulas.length} Aulas</span>
                            </div>
                        )}
                    </div>

                    {/* Conteúdo da Aba 2: Solicitações de Salas */}
                    {adminTab === 'agendamentos' ? (
                        <AgendamentosAdminSection />
                    ) : (
                        /* Conteúdo da Aba 1: Cronograma de Aulas */
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-[0.2em] px-1">Data</label>
                                    <input 
                                        type="text"
                                        placeholder="DD/MM/YYYY"
                                        value={searchDate}
                                        onChange={(e) => setSearchDate(e.target.value)}
                                        className="bg-[#F8FAFC] border border-[#E5E7EB] p-3.5 rounded-xl text-xs outline-none focus:border-[#F4901E] transition-all text-[#0F2A52] placeholder-[#6B7280]"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-[0.2em] px-1">Turma</label>
                                    <input 
                                        type="text"
                                        placeholder="Nome da turma..."
                                        value={searchTurma}
                                        onChange={(e) => setSearchTurma(e.target.value)}
                                        className="bg-[#F8FAFC] border border-[#E5E7EB] p-3.5 rounded-xl text-xs outline-none focus:border-[#F4901E] transition-all text-[#0F2A52] placeholder-[#6B7280]"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black uppercase text-[#6B7280] tracking-[0.2em] px-1">Instrutor</label>
                                    <input 
                                        type="text"
                                        placeholder="Nome do instrutor..."
                                        value={searchInstrutor}
                                        onChange={(e) => setSearchInstrutor(e.target.value)}
                                        className="bg-[#F8FAFC] border border-[#E5E7EB] p-3.5 rounded-xl text-xs outline-none focus:border-[#F4901E] transition-all text-[#0F2A52] placeholder-[#6B7280]"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3 mb-8 border-b border-[#E5E7EB] pb-6">
                                <button
                                    onClick={() => setSearchDate(getTodayFormatted())}
                                    className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${
                                        searchDate === getTodayFormatted()
                                        ? 'bg-[#0F2A52] text-white shadow-md' 
                                        : 'bg-[#F8FAFC] text-[#6B7280] border border-[#E5E7EB] hover:bg-[#DBEAFE]'
                                    }`}
                                >
                                    <CalendarIcon className="w-3.5 h-3.5" />
                                    Hoje
                                </button>

                                {[
                                    { id: 'Matutino', icon: SunIcon },
                                    { id: 'Vespertino', icon: SunHorizonIcon },
                                    { id: 'Noturno', icon: MoonIcon }
                                ].map((t) => {
                                    const Icon = t.icon;
                                    const isActive = filterShift === t.id;
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => setFilterShift(isActive ? null : t.id)}
                                            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${
                                                isActive 
                                                ? 'bg-[#F4901E] text-white shadow-md' 
                                                : 'bg-[#F8FAFC] text-[#6B7280] border border-[#E5E7EB] hover:bg-[#DBEAFE]'
                                            }`}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            {t.id}
                                        </button>
                                    );
                                })}
                                {(searchDate || searchTurma || searchInstrutor || filterShift) && (
                                    <button 
                                        onClick={() => {
                                            setSearchDate('');
                                            setSearchTurma('');
                                            setSearchInstrutor('');
                                            setFilterShift(null);
                                        }}
                                        className="px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest bg-[#EF5B2E]/10 text-[#EF5B2E] hover:bg-[#EF5B2E] hover:text-white transition-all"
                                    >
                                        Limpar Filtros
                                    </button>
                                )}
                            </div>
                            
                            <div className="overflow-x-auto flex-1 custom-scrollbar">
                                <table className="w-full text-left text-[11px] table-fixed">
                                    <thead className="bg-[#F8FAFC] text-[#6B7280] uppercase tracking-[0.2em] border-b border-[#E5E7EB] font-black">
                                        <tr>
                                            <th className="p-4 w-[110px]">Data</th>
                                            <th className="p-4 w-[140px]">Sala</th>
                                            <th className="p-4 w-[150px]">Turma</th>
                                            <th className="p-4">Instrutor</th>
                                            <th className="p-4">Unidade Curricular</th>
                                            <th className="p-4 w-[100px]">Turno</th>
                                            <th className="p-4 text-right w-[90px]">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E5E7EB]">
                                        {filteredAulasAdmin.map(a => (
                                            <tr key={a.id} className="hover:bg-[#DBEAFE]/30 transition-all group">
                                                <td className="p-4 text-[#6B7280] font-medium">{a.data}</td>
                                                <td className="p-4 font-black text-[#F4901E] uppercase tracking-wider">{formatarNomeSala(a.sala)}</td>
                                                <td className="p-4 font-bold uppercase text-[#0F2A52] tracking-tight">{a.turma}</td>
                                                <td className="p-4 font-medium text-[#374151] break-words">{a.instrutor}</td>
                                                <td className="p-4 font-bold text-[#0F2A52] uppercase text-[10px] leading-tight">{formatarUnidadeCurricular(a.unidade_curricular)}</td>
                                                <td className="p-4 text-[#6B7280] italic">{a.turno}</td>
                                                <td className="p-4 text-right flex justify-end gap-2">
                                                    <button onClick={() => setEditingAula(a)} className="p-2 text-[#6B7280] hover:text-[#0F2A52] hover:bg-white rounded-lg transition-all shadow-xs"><PencilIcon className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => context.deleteAula(a.id)} className="p-2 text-[#6B7280] hover:text-[#EF5B2E] hover:bg-[#EF5B2E]/10 rounded-lg transition-all"><TrashIcon className="w-3.5 h-3.5" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {(filteredAulasAdmin.length === 0) && !context.loading && (
                                    <div className="py-20 text-center text-[#6B7280] flex flex-col items-center gap-4">
                                        <PlusCircleIcon className="w-12 h-12 stroke-[0.5px] text-[#6B7280]" />
                                        <p className="text-xs font-black uppercase tracking-[0.25em]">
                                            {context.aulas.length > 0 ? 'Nenhum resultado' : 'Sem registros'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AdminScreen: React.FC<{ onReturnToDashboard: () => void }> = ({ onReturnToDashboard }) => {
    const [auth, setAuth] = useState(false);
    const [password, setPassword] = useState("");

    if (!auth) return (
        <div className="h-screen w-screen flex items-center justify-center bg-[#EDF1F6] p-6 relative overflow-hidden font-sans">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#F4901E] opacity-15 blur-[160px] rounded-full pointer-events-none"></div>
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-12 rounded-[3rem] border border-[#E5E7EB] w-full max-w-md text-center shadow-[0_30px_70px_-15px_rgba(15,42,82,0.12)] backdrop-blur-xl relative z-10"
            >
                <div className="w-20 h-20 bg-[#F4901E] rounded-[2rem] mx-auto mb-8 flex items-center justify-center shadow-lg shadow-[#F4901E]/30 text-white">
                    <SettingsIcon className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black mb-8 uppercase tracking-tight text-[#0F2A52]">Modo Admin</h2>
                <form onSubmit={e => { e.preventDefault(); setAuth(true); }} className="space-y-4">
                    <input 
                        type="password" 
                        autoFocus 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••" 
                        className="w-full bg-[#F8FAFC] border border-[#E5E7EB] p-5 rounded-2xl text-center text-sm tracking-[1.5em] outline-none focus:border-[#F4901E] transition-all text-[#0F2A52] placeholder:tracking-normal" 
                    />
                    <button className="w-full bg-[#F4901E] text-white font-black py-5 rounded-2xl hover:bg-[#E67E22] transition-all uppercase text-[11px] active:scale-95 shadow-md tracking-widest">
                        Autenticar
                    </button>
                    <button type="button" onClick={onReturnToDashboard} className="w-full py-3 text-[11px] font-black uppercase text-[#6B7280] hover:text-[#0F2A52] transition-colors tracking-widest">
                        Voltar ao Dashboard
                    </button>
                </form>
            </motion.div>
        </div>
    );
    return <AdminPanel onLogout={onReturnToDashboard} />;
};

export default AdminScreen;
