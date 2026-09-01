/**
 * Utilitários para processamento de mídias (Google Drive, YouTube, Links Diretos e Arquivos)
 */

export const extractDriveFileId = (url: string): string | null => {
    if (!url || typeof url !== 'string') return null;
    const cleanUrl = url.trim();

    // Padrões do Google Drive:
    // 1. https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    // 2. https://drive.google.com/file/d/FILE_ID/preview
    // 3. https://drive.google.com/file/d/FILE_ID
    // 4. https://drive.google.com/open?id=FILE_ID
    // 5. https://drive.google.com/uc?id=FILE_ID
    // 6. https://docs.google.com/uc?export=download&id=FILE_ID
    const match = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                  cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                  cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                  cleanUrl.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    
    return match ? match[1] : null;
};

export const isGoogleDriveUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    return url.includes('drive.google.com') || url.includes('docs.google.com');
};

export const getDrivePreviewUrl = (url: string): string => {
    const fileId = extractDriveFileId(url);
    if (fileId) {
        // Player nativo do Google Drive em modo preview com suporte a vídeo em qualquer formato
        return `https://drive.google.com/file/d/${fileId}/preview?autoplay=1`;
    }
    return url;
};

export const getDriveDirectStreamUrl = (url: string): string => {
    const fileId = extractDriveFileId(url);
    if (fileId) {
        return `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
    }
    return url;
};

export const getDriveFallbackStreamUrl = (url: string): string => {
    const fileId = extractDriveFileId(url);
    if (fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    return url;
};

export const VCDN_API_KEY = "vcdn_sk_52d9f7dde716455a9ee139c1d0a4a03a12db7b28b9eacf65";

export const isVcdnUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    return url.includes('vcdn.me') || url.includes('vdohide.com');
};

export const extractVcdnSlug = (url: string): string | null => {
    if (!url || typeof url !== 'string') return null;
    const cleanUrl = url.trim();
    const match = cleanUrl.match(/(?:vdohide\.com|vcdn\.me)\/(?:embed|file|dl|v)\/([a-zA-Z0-9_-]+)/) ||
                  cleanUrl.match(/(?:vdohide\.com|vcdn\.me)\/([a-zA-Z0-9_-]+)(?:\.mp4|\.m3u8)?$/);
    return match ? match[1] : null;
};

export const getVcdnEmbedUrl = (url: string): string => {
    const slug = extractVcdnSlug(url);
    const domain = url.includes('vcdn.me') ? 'vcdn.me' : 'vdohide.com';
    if (slug) {
        return `https://${domain}/embed/${slug}?autoplay=1&muted=1&loop=1`;
    }
    if (url.includes('/embed/')) {
        return url.includes('?') ? `${url}&autoplay=1&muted=1` : `${url}?autoplay=1&muted=1`;
    }
    return url;
};

export const extractYouTubeId = (url: string): string | null => {
    if (!url || typeof url !== 'string') return null;
    const cleanUrl = url.trim();
    const match = cleanUrl.match(/(?:v=|\/embed\/|\/watch\?v=|\/\d+\/|\/vi\/|be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
};

export const isYouTubeUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
};

export const getYouTubeEmbedUrl = (url: string): string => {
    const id = extractYouTubeId(url);
    if (id) {
        // Embed com autoplay forçado, mute (exigência dos navegadores para autoplay sem clique), loop e controles limpos
        return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&rel=0&enablejsapi=1&playsinline=1&iv_load_policy=3`;
    }
    return url;
};

export const isDirectVideoUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    return /\.(mp4|webm|ogg|mov|m4v|mkv)($|\?)/i.test(url) || 
           url.includes('video-stream') || 
           url.includes('/video/') || 
           url.startsWith('blob:') || 
           url.startsWith('data:video/');
};

export const detectMediaType = (url: string): 'video' | 'image' => {
    if (!url) return 'image';
    if (isGoogleDriveUrl(url) || isYouTubeUrl(url) || isVcdnUrl(url) || isDirectVideoUrl(url)) {
        return 'video';
    }
    return 'image';
};

export const getMediaBadgeInfo = (url: string, explicitType?: 'image' | 'video') => {
    const driveId = extractDriveFileId(url);
    const ytId = extractYouTubeId(url);
    const isVcdn = isVcdnUrl(url);
    const isDirectVid = isDirectVideoUrl(url);

    if (isVcdn) {
        return {
            type: 'video' as const,
            provider: 'vcdn',
            label: 'VCDN / VdoHide (Vídeo)',
            color: 'bg-purple-100 text-purple-900 border-purple-300',
            duration: 60,
            durationLabel: '1 min (60s)'
        };
    }

    if (driveId) {
        return {
            type: 'video' as const,
            provider: 'drive',
            label: 'Google Drive (Vídeo)',
            color: 'bg-amber-100 text-amber-900 border-amber-300',
            duration: 60,
            durationLabel: '1 min (60s)'
        };
    }

    if (ytId) {
        return {
            type: 'video' as const,
            provider: 'youtube',
            label: 'YouTube (Vídeo)',
            color: 'bg-red-100 text-red-900 border-red-300',
            duration: 60,
            durationLabel: '1 min (60s)'
        };
    }

    if (isDirectVid || explicitType === 'video') {
        return {
            type: 'video' as const,
            provider: 'video',
            label: 'Vídeo MP4 / WebM',
            color: 'bg-orange-100 text-orange-900 border-orange-300',
            duration: 60,
            durationLabel: '1 min (60s)'
        };
    }

    return {
        type: 'image' as const,
        provider: 'image',
        label: 'Foto / Imagem',
        color: 'bg-blue-100 text-blue-900 border-blue-300',
        duration: 10,
        durationLabel: '10s'
    };
};
