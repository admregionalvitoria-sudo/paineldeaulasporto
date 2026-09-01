/**
 * Utilitários para integração com Cloudinary
 */

export const getCloudinaryConfig = () => {
  const cloudName = 
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDINARY_NOME_DA_NUVEM) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME) ||
    'j35zooeo';

  const uploadPreset = 
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET) ||
    'ml_default';

  return { cloudName, uploadPreset };
};

export interface CloudinaryUploadResponse {
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: 'image' | 'video' | 'raw';
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
}

export const uploadToCloudinary = async (
  file: File, 
  onProgress?: (progress: number) => void
): Promise<{ src: string; type: 'image' | 'video'; storagePath: string; name: string }> => {
  const { cloudName, uploadPreset } = getCloudinaryConfig();

  if (!cloudName) {
    throw new Error("Nome da nuvem (Cloud Name) do Cloudinary não configurado.");
  }

  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|ogg|m4v|mkv)$/i.test(file.name);
  const resourceType = isVideo ? 'video' : 'image';
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    console.error("Erro na resposta do Cloudinary:", data);
    const errorMsg = data?.error?.message || `Erro ${response.status} ao enviar arquivo para o Cloudinary.`;
    throw new Error(`Falha no upload para Cloudinary: ${errorMsg}`);
  }

  const finalUrl = data.secure_url || data.url;
  const detectedType: 'image' | 'video' = data.resource_type === 'video' || isVideo ? 'video' : 'image';

  return {
    src: finalUrl,
    type: detectedType,
    storagePath: data.public_id || finalUrl,
    name: file.name
  };
};
