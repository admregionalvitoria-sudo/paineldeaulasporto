import React, { useContext, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DataContext } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import useCurrentTime from '../hooks/useCurrentTime';
import { Aula, Anuncio } from '../types';
import { formatarUnidadeCurricular } from '../utils/curricularUnits';
import { formatarNomeSala } from '../utils/roomFormatter';
import { 
    extractDriveFileId, 
    getDriveDirectStreamUrl,
    getDriveFallbackStreamUrl,
    extractYouTubeId, 
    getYouTubeEmbedUrl, 
    isDirectVideoUrl,
    isGoogleDriveUrl,
    isVcdnUrl,
    getVcdnEmbedUrl
} from '../utils/mediaHelpers';
import { 
    BuildingIcon, 
    UsersIcon, 
    UserTieIcon, 
    BookOpenIcon, 
    ClockIcon, 
    SettingsIcon, 
    SunIcon, 
    MoonIcon,
    CameraIcon,
    CalendarIcon
} from './Icons';

const MaximizeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
);

const SunHorizonIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 10V2"/><path d="m4.93 10.93 1.41-1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41-1.41"/><path d="M22 22H2"/><path d="m8 22 4-10 4 10"/><path d="M16 18a4 4 0 0 0-8 0"/></svg>
);



const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);

const normalizeTurno = (t: string | undefined) => {
    if (!t) return '';
    return t.toLowerCase().trim();
};

const formatText = (text: string) => text ? text.replace(/['"]/g, '').trim() : '';
const abrevSala = (sala: string) => formatarNomeSala(sala);

const getHorarioFixo = (turno: string | undefined) => {
    const t = normalizeTurno(turno);
    if (t === 'matutino') return '07:00 — 11:30';
    if (t === 'vespertino') return '13:00 — 17:30';
    if (t === 'noturno') return '18:00 — 22:00';
    return '';
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

const getEmbedUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const id = url.match(/(?:v=|\/embed\/|\/watch\?v=|\/\d+\/|\/vi\/|be\/)([a-zA-Z0-9_-]{11})/)?.[1];
        if (id) {
            return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&rel=0&enablejsapi=1&playsinline=1&iv_load_policy=3`;
        }
    }
    return url;
};

const Header: React.FC = () => {
    const { formattedDate, formattedTime } = useCurrentTime();

    return (
        <header className="flex-none px-4 py-2 md:px-8 md:py-2.5 lg:py-3 grid grid-cols-1 md:grid-cols-3 items-center z-20 relative transition-all duration-700 gap-2 md:gap-0 border-b border-[#E5E7EB] bg-white/75 backdrop-blur-xl shadow-sm">
            {/* Logo do SENAI no canto esquerdo */}
            <div className="flex justify-center md:justify-start items-center">
                <img 
                    src="https://res.cloudinary.com/dlrdwblso/image/upload/v1785334994/SENAI_COMPLETA_PREFERENCIAL_svm23u.png" 
                    alt="Logo SENAI" 
                    className="h-8 md:h-10 lg:h-11 w-auto max-w-[180px] md:max-w-[240px] object-contain drop-shadow-sm" 
                    referrerPolicy="no-referrer"
                />
            </div>
            
            {/* Horário Centralizado */}
            <div className="text-center flex flex-col items-center justify-center">
                 <h1 className="text-2xl md:text-3xl lg:text-[36px] font-black tracking-tighter leading-none mb-0.5 text-[#0F2A52]">
                     {formattedTime}
                 </h1>
                <span className="text-[8px] md:text-[9px] lg:text-[10px] font-bold tracking-[0.22em] uppercase text-[#6B7280]">
                    {formattedDate}
                </span>
            </div>

            {/* Espaço à direita para manter o relógio perfeitamente centralizado */}
            <div className="hidden md:block" />
        </header>
    );
};

const ClassCard: React.FC<{ aula: Aula; index: number; compact?: boolean }> = ({ aula, index }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:translate-y-[-2px] flex flex-col gap-2.5 bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-[#F4901E]/40"
        >
            {/* Cabeçalho do Card: Turma + Sala + Turno */}
            <div className="flex justify-between items-start gap-2">
                <div className="flex flex-col min-w-0">
                    <h2 className="text-base font-black uppercase tracking-tight leading-tight text-[#0F2A52] break-words">
                        {formatText(aula.turma)}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-1 text-[#F4901E]">
                        <ClockIcon className="w-3.5 h-3.5 flex-shrink-0 text-[#F4901E]" />
                        <span className="text-[11px] font-black tracking-wider uppercase text-[#F4901E]">
                            {abrevSala(aula.sala)}
                        </span>
                    </div>
                </div>
                <div className="flex-shrink-0 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#DBEAFE] border border-[#1D4E8C]/20 text-[#1D4E8C]">
                    {aula.turno}
                </div>
            </div>

            {/* Informações Compactas da Aula */}
            <div className="bg-[#F8FAFC] rounded-xl p-2.5 border border-[#E2E8F0] flex flex-col gap-1.5 text-[11px]">
                <div className="flex items-center gap-2 text-[#374151]">
                    <UserTieIcon className="w-3.5 h-3.5 text-[#1D4E8C] flex-shrink-0" />
                    <span className="font-bold uppercase truncate">{formatText(aula.instrutor)}</span>
                </div>

                <div className="flex items-center gap-2 text-[#4B5563]">
                    <BookOpenIcon className="w-3.5 h-3.5 text-[#1D4E8C] flex-shrink-0" />
                    <span className="font-bold uppercase truncate">{formatarUnidadeCurricular(aula.unidade_curricular)}</span>
                </div>

                <div className="flex items-center gap-2 text-[#0F2A52] pt-1 border-t border-[#E2E8F0]/70">
                    <ClockIcon className="w-3.5 h-3.5 text-[#F4901E] flex-shrink-0" />
                    <span className="font-black text-[10px] tracking-wide">{getHorarioFixo(aula.turno)}</span>
                </div>
            </div>
        </motion.div>
    );
};

interface CleanVideoPlayerProps {
    src: string;
    name?: string;
    onEnded?: () => void;
}

const CleanVideoPlayer: React.FC<CleanVideoPlayerProps> = ({ src, name, onEnded }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const driveId = extractDriveFileId(src);
    const ytId = extractYouTubeId(src);
    const isVcdn = isVcdnUrl(src);
    const [useIframeFallback, setUseIframeFallback] = useState(false);

    useEffect(() => {
        setUseIframeFallback(false);
    }, [src]);

    useEffect(() => {
        if (videoRef.current && !ytId && !isVcdn && !useIframeFallback) {
            videoRef.current.currentTime = 0;
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    // Retry play on muted gesture
                    if (videoRef.current) {
                        videoRef.current.muted = true;
                        videoRef.current.play().catch(() => {});
                    }
                });
            }
        }
    }, [src, ytId, isVcdn, useIframeFallback]);

    if (ytId) {
        return (
            <div className="w-full h-full aspect-[9/16] relative overflow-hidden bg-black flex items-center justify-center pointer-events-none">
                <iframe 
                    src={getYouTubeEmbedUrl(src)} 
                    className="w-full h-full aspect-[9/16] border-0 pointer-events-none" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={name || "Vídeo SENAI"}
                />
            </div>
        );
    }

    if (isVcdn) {
        return (
            <div className="w-full h-full aspect-[9/16] relative overflow-hidden bg-black flex items-center justify-center pointer-events-none">
                <iframe 
                    src={getVcdnEmbedUrl(src)} 
                    className="w-full h-full aspect-[9/16] border-0 pointer-events-none" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    title={name || "Vídeo VCDN / VdoHide"}
                />
            </div>
        );
    }

    if (useIframeFallback && driveId) {
        // Fallback para iframe do Drive com recorte superior e lateral para ocultar o botão de link/popout (⧉)
        return (
            <div className="w-full h-full aspect-[9/16] relative overflow-hidden bg-black flex items-center justify-center pointer-events-none select-none">
                <iframe 
                    src={`https://drive.google.com/file/d/${driveId}/preview?autoplay=1`} 
                    className="w-[115%] h-[115%] -mt-[8%] -mr-[7%] border-0 pointer-events-none scale-[1.05]" 
                    allow="autoplay; encrypted-media; fullscreen"
                    title={name || "Vídeo Google Drive"}
                />
            </div>
        );
    }

    const primaryDriveStream = driveId ? getDriveDirectStreamUrl(src) : src;
    const fallbackDriveStream = driveId ? getDriveFallbackStreamUrl(src) : undefined;

    return (
        <video 
            ref={videoRef}
            key={src}
            className="w-full h-full aspect-[9/16] object-cover pointer-events-none select-none bg-black"
            autoPlay 
            muted 
            loop 
            playsInline
            preload="auto"
            onError={() => {
                if (driveId && !useIframeFallback) {
                    setUseIframeFallback(true);
                }
            }}
            onLoadedData={(e) => {
                e.currentTarget.play().catch(() => {});
            }}
            onCanPlay={(e) => {
                e.currentTarget.play().catch(() => {});
            }}
            onEnded={onEnded}
        >
            <source src={primaryDriveStream} type="video/mp4" />
            {fallbackDriveStream && <source src={fallbackDriveStream} type="video/mp4" />}
            <source src={src} />
        </video>
    );
};

const MediaCarouselPanel = React.memo<{ anuncios: Anuncio[] }>(({ anuncios }) => {
    const [adIndex, setAdIndex] = useState(0);

    useEffect(() => {
        if (!anuncios || anuncios.length <= 1) return;

        const currentAd = anuncios[adIndex % anuncios.length];
        const isDrive = isGoogleDriveUrl(currentAd?.src);
        const isYT = !!extractYouTubeId(currentAd?.src);
        const isVcdn = isVcdnUrl(currentAd?.src);
        const isVid = currentAd?.type === 'video' || isDirectVideoUrl(currentAd?.src) || isDrive || isYT || isVcdn;

        // Transição: Imagem = 10s, Vídeo = 60s
        const durationMs = currentAd?.duration ? currentAd.duration * 1000 : (isVid ? 60 * 1000 : 10 * 1000);

        const timer = setTimeout(() => {
            setAdIndex(prev => (prev + 1) % anuncios.length);
        }, durationMs);

        return () => clearTimeout(timer);
    }, [anuncios?.length, adIndex]);

    if (!anuncios || anuncios.length === 0) return null;

    const currentAd = anuncios[adIndex % anuncios.length];
    const isDrive = isGoogleDriveUrl(currentAd?.src);
    const isYT = !!extractYouTubeId(currentAd?.src);
    const isVid = currentAd?.type === 'video' || isDirectVideoUrl(currentAd?.src) || isDrive || isYT;

    return (
        <div className="w-full h-full aspect-[9/16] overflow-hidden bg-[#0A192F] relative flex items-center justify-center select-none">
            <AnimatePresence mode="wait">
                <motion.div 
                    key={currentAd.id || currentAd.src || adIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 w-full h-full aspect-[9/16] flex items-center justify-center overflow-hidden bg-black"
                >
                    {isVid ? (
                        <CleanVideoPlayer 
                            src={currentAd.src}
                            name={currentAd.name}
                            onEnded={() => {
                                if (anuncios.length > 1) {
                                    setAdIndex(prev => (prev + 1) % anuncios.length);
                                }
                            }}
                        />
                    ) : (
                        <img 
                            src={currentAd.src} 
                            className="w-full h-full aspect-[9/16] object-cover pointer-events-none select-none" 
                            alt={currentAd.name || "Destaque SENAI"} 
                            referrerPolicy="no-referrer" 
                        />
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
});

MediaCarouselPanel.displayName = 'MediaCarouselPanel';

const getAutomaticShift = (): string => {
    const d = new Date();
    const totalMinutes = d.getHours() * 60 + d.getMinutes();
    
    // 06:00 até 11:49:59 (360 até 709 minutos) -> Matutino
    if (totalMinutes >= 360 && totalMinutes < 710) {
        return 'Matutino';
    }
    // 11:50 até 17:49:59 (710 até 1069 minutos) -> Vespertino
    if (totalMinutes >= 710 && totalMinutes < 1070) {
        return 'Vespertino';
    }
    // 17:50 até 05:59:59 -> Noturno
    return 'Noturno';
};

const DashboardScreen: React.FC<{ onAdminClick: () => void; onAgendamentoClick?: () => void }> = ({ onAdminClick, onAgendamentoClick }) => {
    const context = useContext(DataContext);
    const { isDarkMode, toggleTheme } = useTheme();
    const [filteredAulas, setFilteredAulas] = useState<Aula[]>([]);
    const [currentShift, setCurrentShift] = useState<string>(getAutomaticShift());
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [searchTurma, setSearchTurma] = useState('');
    const lastDetectedShiftRef = useRef<string>(getAutomaticShift());
    const manualOverrideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isManualOverride, setIsManualOverride] = useState(false);
    
    // Configurações de Manutenção
    const now = new Date();
    const maintenanceStart = new Date(2026, 3, 30, 23, 59, 0);
    const maintenanceEnd = new Date(2026, 4, 15, 23, 59, 59);

    const isMaintenanceActive = now >= maintenanceStart && now <= maintenanceEnd;
    const isWarningActive = now < maintenanceStart && now.getDate() === 30 && now.getMonth() === 3;

    useEffect(() => {
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, []);

    // Monitoramento contínuo do horário para troca automática de turnos (06:00, 11:50 e 17:50)
    useEffect(() => {
        const auto = getAutomaticShift();
        if (!isManualOverride) {
            setCurrentShift(prev => (prev !== auto ? auto : prev));
        }
        lastDetectedShiftRef.current = auto;

        const interval = setInterval(() => {
            const currentAuto = getAutomaticShift();
            // Se cruzou o horário de transição oficial (ex: 11:50, 17:50 ou 06:00)
            if (currentAuto !== lastDetectedShiftRef.current) {
                lastDetectedShiftRef.current = currentAuto;
                setIsManualOverride(false);
                setCurrentShift(currentAuto);
            }
        }, 5000);

        return () => {
            clearInterval(interval);
            if (manualOverrideTimeoutRef.current) clearTimeout(manualOverrideTimeoutRef.current);
        };
    }, [isManualOverride]);

    const handleSelectShiftManually = (shift: string) => {
        setCurrentShift(shift);
        setIsManualOverride(true);
        if (manualOverrideTimeoutRef.current) clearTimeout(manualOverrideTimeoutRef.current);
        
        // Retorna para o turno automático após 2 minutos de inatividade
        manualOverrideTimeoutRef.current = setTimeout(() => {
            setIsManualOverride(false);
            setCurrentShift(getAutomaticShift());
        }, 120000);
    };

    useEffect(() => {
        if (context && !context.loading) {
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const todayStr = `${day}/${month}/${year}`;

            const filtered = context.aulas.filter(a => {
                const aulaData = a.data.trim();
                const matchesDateAndShift = aulaData === todayStr && normalizeTurno(a.turno) === normalizeTurno(currentShift);
                if (!matchesDateAndShift) return false;

                const term = searchTurma.toLowerCase().trim();
                if (!term) return true;

                return (
                    a.turma.toLowerCase().includes(term) ||
                    a.instrutor.toLowerCase().includes(term) ||
                    a.sala.toLowerCase().includes(term) ||
                    formatarUnidadeCurricular(a.unidade_curricular).toLowerCase().includes(term)
                );
            });
            
            setFilteredAulas(filtered);
        }
    }, [context?.aulas, context?.loading, currentShift, searchTurma]);

    if (!context) return null;

    if (isMaintenanceActive) {
        return (
            <div className="fixed inset-0 bg-[#0F2A52] flex items-center justify-center z-[9999] p-10">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                >
                    <div className="w-32 h-32 bg-[#EF5B2E]/20 rounded-full flex items-center justify-center mx-auto mb-10 border border-[#EF5B2E]/30 animate-pulse">
                        <span className="text-6xl items-center flex justify-center">⚠️</span>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter leading-none mb-6">
                        Painel em<br /><span className="text-[#F4901E]">Manutenção</span>
                    </h1>
                    <p className="text-white/60 text-lg font-medium uppercase tracking-[0.4em]">O sistema retornará em breve</p>
                </motion.div>
            </div>
        );
    }

    const displayAulas = filteredAulas.slice(0, 35);
    const hasAnuncios = (context.anuncios?.length || 0) > 0;

    const turnos = [
        { id: 'Matutino', icon: SunIcon },
        { id: 'Vespertino', icon: SunHorizonIcon },
        { id: 'Noturno', icon: MoonIcon }
    ];

    return (
        <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#EDF1F6] text-[#0F2A52] relative font-sans">
            {/* Ambient Blobs / Background Lights */}
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-[#1D4E8C]/30 blur-[90px] rounded-full pointer-events-none z-0" />
            <div className="fixed top-1/2 left-0 w-[500px] h-[500px] bg-[#1D4E8C]/15 blur-[100px] rounded-full pointer-events-none z-0" />
            <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-[#F4901E]/30 blur-[90px] rounded-full pointer-events-none z-0" />

            <Header />
            
            <div className="flex-none flex flex-col items-center pt-2.5 pb-1 px-4 z-10 relative">
                {isWarningActive && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-2 w-full max-w-4xl"
                    >
                        <div className="bg-[#EF5B2E] p-3 rounded-[1.4rem] border border-[#EF5B2E]/50 shadow-lg flex items-center gap-3 text-white">
                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 animate-bounce">
                                <span className="text-base">⚠️</span>
                            </div>
                            <div className="flex flex-col">
                                <h3 className="text-white font-black uppercase tracking-[0.2em] text-[9px] mb-0.5">Aviso Importante</h3>
                                <p className="text-white text-xs md:text-sm font-bold leading-tight">
                                    O painel de aulas será desativado hoje às 23:59 para manutenção.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Shift Selector */}
                <div className="flex p-1 rounded-[2rem] gap-1.5 border border-[#E5E7EB] bg-white/85 backdrop-blur-md shadow-[0_8px_20px_-5px_rgba(15,42,82,0.06)]">
                    {turnos.map((t) => {
                        const Icon = t.icon;
                        const active = currentShift === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => handleSelectShiftManually(t.id)}
                                className={`flex items-center gap-1.5 sm:gap-2.5 md:gap-3 px-3 sm:px-4 md:px-7 py-1.5 md:py-2 rounded-[1.4rem] transition-all duration-300 font-black uppercase tracking-[0.14em] md:tracking-[0.18em] text-[9px] sm:text-[10px] md:text-xs relative overflow-hidden ${
                                    active 
                                    ? 'bg-[#F4901E] text-white shadow-md shadow-[#F4901E]/30 scale-105 z-10' 
                                    : 'text-[#0F2A52]/60 hover:text-[#0F2A52] hover:bg-[#DBEAFE]/40'
                                }`}
                            >
                                <Icon className={`w-3 h-3 md:w-4 md:h-4 ${active ? 'animate-pulse text-white' : 'text-[#1D4E8C]'}`} />
                                {t.id}
                                {active && (
                                    <motion.div 
                                        layoutId="activeShift"
                                        className="absolute inset-0 bg-white/10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Search Bar - VISIBLE ONLY ON MOBILE / SMARTPHONE */}
                <div className="w-full max-w-md px-2 md:hidden mt-2">
                    <div className="relative flex items-center">
                        <SearchIcon className="w-4 h-4 text-[#1D4E8C] absolute left-3.5 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Pesquisar turma, instrutor, sala..."
                            value={searchTurma}
                            onChange={(e) => setSearchTurma(e.target.value)}
                            className="w-full pl-10 pr-9 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-bold text-[#0F2A52] placeholder-[#6B7280] focus:border-[#F4901E] focus:ring-2 focus:ring-[#F4901E]/20 outline-none shadow-sm transition-all"
                        />
                        {searchTurma && (
                            <button 
                                onClick={() => setSearchTurma('')}
                                className="absolute right-3 text-xs font-bold text-[#6B7280] hover:text-[#0F2A52] p-1"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Central Container */}
            <main className="flex-1 p-2 md:p-4 lg:p-5 z-10 relative max-w-[2600px] mx-auto w-full flex flex-col min-h-0 overflow-hidden">
                
                {/* 1. DESKTOP VIEW: Side-by-Side Independent Cards (Horários Card on Left, Media Card on Right) */}
                <div className="hidden md:flex flex-row items-stretch gap-4 lg:gap-6 w-full h-full min-h-0">
                    
                    {/* Left Card: Schedule Table Container */}
                    <div className="flex-1 min-w-0 h-full gradient-border-wrapper rounded-[2rem] lg:rounded-[2.5rem] shadow-[0_20px_50px_-15px_rgba(15,42,82,0.12)] overflow-hidden flex flex-col">
                        <div className="glass-panel rounded-[1.9rem] lg:rounded-[2.4rem] w-full h-full bg-white/95 backdrop-blur-md flex flex-col overflow-hidden custom-scrollbar overflow-y-auto">
                            {displayAulas.length > 0 ? (
                                <div className="w-full">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 z-10 shadow-sm">
                                            <tr className="bg-[#0F2A52] text-white text-xs md:text-sm font-black uppercase tracking-[0.2em] border-b-2 border-[#0F2A52]">
                                                <th className="py-3.5 lg:py-4 px-5 lg:px-7">Turma</th>
                                                <th className="py-3.5 lg:py-4 px-5 lg:px-7">Ambiente / Sala</th>
                                                <th className="py-3.5 lg:py-4 px-5 lg:px-7">Instrutor</th>
                                                <th className="py-3.5 lg:py-4 px-5 lg:px-7">Unidade Curricular</th>
                                                <th className="py-3.5 lg:py-4 px-5 lg:px-7">Horário</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#CBD5E1]">
                                            {displayAulas.map((aula, idx) => (
                                                <motion.tr 
                                                    key={aula.id}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.02, duration: 0.3 }}
                                                    className="hover:bg-[#DBEAFE]/40 transition-colors duration-200"
                                                >
                                                    <td className="py-3.5 lg:py-4 px-5 lg:px-7 font-black text-[#0F2A52] text-base md:text-lg tracking-tight uppercase">
                                                        <span>{formatText(aula.turma)}</span>
                                                    </td>
                                                    <td className="py-3.5 lg:py-4 px-5 lg:px-7 text-sm md:text-base font-black uppercase text-[#F4901E] tracking-wider">
                                                        <div className="flex items-center gap-2">
                                                            <ClockIcon className="w-4 h-4 text-[#F4901E]" />
                                                            <span>{abrevSala(aula.sala)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 lg:py-4 px-5 lg:px-7 text-xs md:text-sm font-bold text-[#374151] uppercase">
                                                        <div className="flex items-center gap-2">
                                                            <UserTieIcon className="w-4 h-4 text-[#1D4E8C]" />
                                                            <span>{formatText(aula.instrutor)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 lg:py-4 px-5 lg:px-7 text-xs md:text-sm font-bold text-[#374151] uppercase">
                                                        <div className="flex items-center gap-2">
                                                            <BookOpenIcon className="w-4 h-4 text-[#1D4E8C] flex-shrink-0" />
                                                            <span className="leading-snug">{formatarUnidadeCurricular(aula.unidade_curricular)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 lg:py-4 px-5 lg:px-7 text-xs md:text-sm font-black text-[#0F2A52] tracking-wider">
                                                        <div className="flex items-center gap-2">
                                                            <ClockIcon className="w-4 h-4 text-[#F4901E]" />
                                                            <span>{getHorarioFixo(aula.turno)}</span>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center flex-col gap-6 text-center py-20 opacity-30">
                                    <ClockIcon className="w-20 h-20 stroke-[0.5px] text-[#1D4E8C]" />
                                    <p className="text-lg lg:text-xl font-black uppercase tracking-[0.4em] text-[#0F2A52]">
                                        Sem atividades agendadas para o turno {currentShift}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Card: Independent Media Container (Fixed 1080x1920 - 9:16 Vertical Ratio scaled to fit full screen height) */}
                    {hasAnuncios && (
                        <div className="h-full aspect-[9/16] flex-shrink-0 gradient-border-wrapper rounded-[2rem] lg:rounded-[2.5rem] shadow-[0_20px_50px_-15px_rgba(15,42,82,0.12)] overflow-hidden flex flex-col justify-center items-center">
                            <div className="glass-panel rounded-[1.9rem] lg:rounded-[2.4rem] w-full h-full aspect-[9/16] bg-[#0A192F] overflow-hidden flex items-center justify-center p-0">
                                <MediaCarouselPanel anuncios={context.anuncios} />
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. MOBILE VIEW: Blocks / Cards Format */}
                <div className="block md:hidden h-full gradient-border-wrapper rounded-[1.8rem] shadow-[0_20px_50px_-15px_rgba(15,42,82,0.12)] overflow-hidden">
                    <div className="glass-panel rounded-[1.7rem] p-3 w-full h-full custom-scrollbar overflow-y-auto pb-16">
                        <div className="flex flex-col gap-3.5 px-0.5">
                            {/* 1. AULAS PRIMEIRO */}
                            <AnimatePresence mode="popLayout">
                                {displayAulas.map((a, idx) => (
                                    <ClassCard key={a.id} aula={a} index={idx} />
                                ))}
                            </AnimatePresence>

                            {filteredAulas.length === 0 && (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.3 }}
                                    className="flex items-center justify-center flex-col gap-4 text-center py-10"
                                >
                                    <ClockIcon className="w-16 h-16 stroke-[0.6px] text-[#1D4E8C]" />
                                    <p className="text-sm font-black uppercase tracking-[0.25em] text-[#0F2A52]">
                                        Sem atividades para o turno {currentShift}
                                    </p>
                                </motion.div>
                            )}

                            {/* 2. MÍDIA ROTATIVA ABAIXO DAS AULAS */}
                            {hasAnuncios && (
                                <div className="mt-4 pt-4 border-t border-[#CBD5E1]/60 flex flex-col items-center">
                                    <div className="flex items-center gap-2 mb-3 self-start px-1">
                                        <span className="w-2 h-2 rounded-full bg-[#F4901E] animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#0F2A52]">
                                            Mural de Avisos & Mídia
                                        </span>
                                    </div>
                                    <div className="rounded-2xl overflow-hidden shadow-lg aspect-[9/16] w-full max-w-[340px] mx-auto bg-[#0A192F] border border-[#E2E8F0]">
                                        <MediaCarouselPanel anuncios={context.anuncios} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DashboardScreen;

