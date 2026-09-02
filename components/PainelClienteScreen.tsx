import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, VolumeX, Maximize, Minimize, Phone, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { DataContext, DEFAULT_PAINEL_CLIENTE_CONFIG } from '../context/DataContext';
import { BorderBeam } from './ui/border-beam';
import { DestaqueSlide, ContactInfo } from '../types';

interface PainelClienteScreenProps {
  onReturnToDashboard?: () => void;
}

// Ícone personalizado do Instagram
function InstagramIcon({ className = 'w-6 h-6', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

// Segmento de Informação de Contato com QR Code
function InfoSegment({
  icon,
  title,
  lines,
  qrValue,
  qrColor = '#000000',
  showDivider = true,
}: {
  icon: React.ReactNode;
  title: string;
  lines: string[];
  qrValue?: string;
  qrColor?: string;
  showDivider?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between flex-1 gap-3 sm:gap-4 ${
        showDivider ? 'border-l border-[#E5E7EB] pl-4 md:pl-8 pr-2 md:pr-4' : 'px-2'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-[#DBEAFE] shadow-xs">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-black text-xs md:text-base leading-tight text-[#0F2A52] tracking-tight">
            {title}
          </p>
          {lines.map((line, i) => (
            <p key={i} className="text-xs md:text-sm font-semibold leading-snug truncate mt-0.5 text-[#374151]">
              {line}
            </p>
          ))}
        </div>
      </div>

      {qrValue && (
        <div className="flex-shrink-0 flex items-center justify-center p-1.5 md:p-2 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs transition-transform duration-200 hover:scale-105">
          <QRCodeSVG value={qrValue} size={48} fgColor={qrColor} bgColor="#FFFFFF" level="M" />
        </div>
      )}
    </div>
  );
}

// Container do Vídeo com proporção 16:9 (1920x1080)
const VideoPanel: React.FC<{ videoSrc: string; posterImage?: string }> = ({ videoSrc, posterImage }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideTimeoutRef = useRef<any>(null);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [resetHideTimer]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-[24px] md:rounded-[28px] bg-black shadow-lg group"
    >
      {/* Container com proporção 16:9 (1920x1080) */}
      <div className="relative w-full h-full aspect-[16/9] max-h-full max-w-full flex items-center justify-center overflow-hidden rounded-[24px] md:rounded-[28px]">
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            poster={posterImage || undefined}
            className="w-full h-full object-cover"
            playsInline
            preload="auto"
            autoPlay
            loop
            muted
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#153564] to-[#0F2A52] text-white/50 p-6 text-center">
            <p className="text-lg font-bold">Vídeo Institucional</p>
            <p className="text-xs text-white/30 mt-1">Configure o link do vídeo na aba /midia</p>
          </div>
        )}

        {/* Controles discretos */}
        <div
          className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-300 ${
            showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-end gap-3 p-4 md:p-6">
            <button
              onClick={toggleMute}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white hover:text-[#F4901E] hover:bg-black/60 transition-all shadow-md cursor-pointer"
              title={isMuted ? 'Ativar Som' : 'Desativar Som'}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white hover:text-[#F4901E] hover:bg-black/60 transition-all shadow-md cursor-pointer"
              title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Carrossel Vertical com proporção fixa 9:16 (1080x1920)
const VerticalCarousel: React.FC<{ slides: DestaqueSlide[] }> = ({ slides }) => {
  const [current, setCurrent] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const autoRotateRef = useRef<any>(null);
  const currentRef = useRef(current);
  const total = slides?.length || 0;

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  const goTo = useCallback(
    (index: number) => {
      if (total === 0) return;
      setFadeIn(false);
      setTimeout(() => {
        const next = ((index % total) + total) % total;
        setCurrent(next);
        currentRef.current = next;
        setFadeIn(true);
      }, 200);
    },
    [total]
  );

  const startAutoRotate = useCallback(() => {
    if (autoRotateRef.current) clearInterval(autoRotateRef.current);
    if (total <= 1) return;
    autoRotateRef.current = setInterval(() => {
      goTo(currentRef.current + 1);
    }, 5500);
  }, [goTo, total]);

  useEffect(() => {
    startAutoRotate();
    return () => {
      if (autoRotateRef.current) clearInterval(autoRotateRef.current);
    };
  }, [startAutoRotate]);

  const handleManualNav = (index: number) => {
    if (autoRotateRef.current) clearInterval(autoRotateRef.current);
    goTo(index);
    setTimeout(startAutoRotate, 100);
  };

  const slide = slides && slides.length > 0 ? slides[current % slides.length] : null;

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-[24px] md:rounded-[28px] bg-white shadow-lg">
      {/* Container com proporção 9:16 (1080x1920) */}
      <div className="relative w-full h-full aspect-[9/16] max-h-full max-w-full overflow-hidden rounded-[24px] md:rounded-[28px]">
        <div className={`absolute inset-0 transition-opacity duration-400 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
          {slide?.image ? (
            <img
              src={slide.image}
              alt="Destaque SENAI"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1D4E8C] to-[#0F2A52] text-white/50 p-4 text-center">
              <ImageIcon className="w-12 h-12 mb-2 text-white/30" />
              <p className="text-sm font-bold">Destaques SENAI</p>
              <p className="text-[10px] text-white/30 mt-1">Carrossel vertical 1080x1920</p>
            </div>
          )}

          {/* Gradiente sutil inferior */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

          {/* Dots de Paginação */}
          {total > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 z-10">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleManualNav(i)}
                  className={`transition-all duration-300 rounded-full cursor-pointer border-none shadow-sm ${
                    i === current ? 'w-5 h-2 bg-[#F4901E]' : 'w-2 h-2 bg-white/70 hover:bg-white'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const PainelClienteScreen: React.FC<PainelClienteScreenProps> = ({ onReturnToDashboard }) => {
  const context = useContext(DataContext);
  const cfg = context?.painelClienteConfig || DEFAULT_PAINEL_CLIENTE_CONFIG;

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#EDF1F6]">
      {/* Layer 0: Background Blobs suaves com iluminação SENAI */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full filter blur-[90px] opacity-25"
          style={{
            top: '-120px',
            right: '-120px',
            width: '550px',
            height: '550px',
            background: 'radial-gradient(circle, rgba(29,78,140,0.3) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute rounded-full filter blur-[100px] opacity-15"
          style={{
            top: '35%',
            left: '-5%',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(29,78,140,0.15) 0%, transparent 65%)',
          }}
        />
        <div
          className="absolute rounded-full filter blur-[90px] opacity-20"
          style={{
            bottom: '-60px',
            right: '8%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(244,144,30,0.3) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Botão de Retorno Rápido (discreto no topo superior esquerdo) */}
      {onReturnToDashboard && (
        <button
          onClick={onReturnToDashboard}
          className="absolute top-3 left-3 z-40 p-2 rounded-xl bg-white/80 hover:bg-white text-[#0F2A52] shadow-sm backdrop-blur-md opacity-0 hover:opacity-100 transition-all cursor-pointer flex items-center gap-1 text-xs font-black uppercase"
          title="Voltar ao Painel"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Painel Principal</span>
        </button>
      )}

      {/* Main Layout Container */}
      <div className="relative w-full h-full flex flex-col p-4 md:p-8 z-10">
        {/* Moldura de Vidro Principal com Efeito BorderBeam */}
        <div className="relative flex-1 min-h-0 overflow-hidden rounded-[28px]">
          {/* BorderBeam animado com feixe duplo (Azul e Laranja SENAI) */}
          <BorderBeam
            size={800}
            duration={10}
            anchor={90}
            borderWidth={2}
            colorFrom="#EF5B2E"
            colorTo="#1A4A9E"
            delay={0}
          />
          <BorderBeam
            size={800}
            duration={10}
            anchor={90}
            borderWidth={2}
            colorFrom="#1A4A9E"
            colorTo="#EF5B2E"
            delay={5}
          />

          {/* Painel Interno com Glassmorphism e Grid dos Containers */}
          <div
            className="w-full h-full flex flex-col lg:flex-row gap-4 md:gap-5 p-3.5 md:p-5 rounded-[28px] border-2 border-transparent shadow-2xl"
            style={{
              background:
                'linear-gradient(rgba(255,255,255,0.45), rgba(255,255,255,0.45)) padding-box, linear-gradient(135deg, #1A4A9E 0%, #3B82C4 35%, #F4901E 70%, #EF5B2E 100%) border-box',
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
            }}
          >
            {/* Coluna do Vídeo (~68% da largura - Resolução 1920x1080 / 16:9) */}
            <div className="flex-[7_1_0%] min-w-0 min-h-0 h-full flex items-center justify-center">
              <VideoPanel videoSrc={cfg.heroVideoSrc} posterImage={cfg.heroPosterImage} />
            </div>

            {/* Coluna do Carrossel Vertical (~32% da largura - Resolução 1080x1920 / 9:16) */}
            <div className="flex-[3_1_0%] min-w-0 min-h-0 h-full flex items-center justify-center">
              <VerticalCarousel slides={cfg.destaques} />
            </div>
          </div>
        </div>

        {/* Footer Institucional com Logo e QR Codes */}
        <div className="flex-shrink-0 mt-3 md:mt-4">
          <div className="w-full flex items-center justify-between bg-white/85 backdrop-blur-md rounded-2xl md:rounded-3xl p-3 md:p-4 shadow-lg border border-[#E5E7EB]">
            {/* 1. Logo SENAI */}
            <div className="flex items-center gap-3 flex-1 px-2 md:px-4">
              <img
                src={cfg.contactInfo?.logoUrl || 'https://res.cloudinary.com/dlrdwblso/image/upload/v1785334994/SENAI_COMPLETA_PREFERENCIAL_svm23u.png'}
                alt="Logo SENAI"
                className="h-12 md:h-16 max-h-16 object-contain"
              />
            </div>

            {/* 2. Telefone / WhatsApp */}
            <InfoSegment
              icon={<Phone className="w-5 h-5 md:w-6 md:h-6 text-[#1D4E8C]" />}
              title="Telefone"
              lines={[cfg.contactInfo?.phone || '(27) 98818-2941']}
              qrValue={cfg.contactInfo?.whatsappUrl || 'https://wa.me/5527988182941'}
              qrColor="#EF5E31"
            />

            {/* 3. Instagram */}
            <InfoSegment
              icon={<InstagramIcon className="w-5 h-5 md:w-6 md:h-6 text-[#1D4E8C]" />}
              title="Instagram"
              lines={[cfg.contactInfo?.instagram || '@senaivitoria']}
              qrValue={cfg.contactInfo?.instagramUrl || 'https://instagram.com/senaivitoria'}
              qrColor="#1A4B9F"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PainelClienteScreen;
