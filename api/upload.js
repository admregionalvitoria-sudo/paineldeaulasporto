import { handleUpload } from '@vercel/blob/client';
import { put, del } from '@vercel/blob';

const getBlobToken = () => {
  return process.env.BLOB_READ_WRITE_TOKEN || 
         process.env.PAINEL_READ_WRITE_TOKEN || 
         process.env.VERCEL_BLOB_READ_WRITE_TOKEN || 
         process.env.STORAGE_READ_WRITE_TOKEN;
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-filename');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = getBlobToken();

  if (req.method === 'DELETE') {
    try {
      const url = req.query.url || req.body?.url;
      if (url) {
        await del(url, { token });
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      console.warn('Delete blob error:', err);
      return res.status(200).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    const contentType = req.headers['content-type'] || '';
    
    // 1. Suporte a upload direto do cliente via @vercel/blob/client
    if (contentType.includes('application/json') || req.body?.type?.startsWith('blob.')) {
      try {
        const jsonResponse = await handleUpload({
          body: req.body,
          request: req,
          token: token,
          onBeforeGenerateToken: async (pathname) => {
            return {
              allowedContentTypes: [
                'image/jpeg',
                'image/png',
                'image/webp',
                'image/gif',
                'video/mp4',
                'video/webm',
                'video/quicktime',
                'video/ogg',
                'application/octet-stream'
              ],
              maximumSizeInBytes: 60 * 1024 * 1024, // 60MB
              tokenPayload: JSON.stringify({ pathname }),
            };
          },
          onUploadCompleted: async ({ blob, tokenPayload }) => {
            console.log('Vercel Blob upload concluído:', blob.url);
          },
        });

        return res.status(200).json(jsonResponse);
      } catch (error) {
        console.error('Erro handleUpload Vercel Blob:', error);
        return res.status(400).json({ error: error.message || 'Erro ao gerar token do Vercel Blob' });
      }
    }

    // 2. Upload via stream tradicional
    try {
      const filename = req.query.filename || req.headers['x-filename'] || `media_${Date.now()}`;
      if (!token) {
        return res.status(500).json({ 
          error: 'BLOB_READ_WRITE_TOKEN não configurado no ambiente Vercel.' 
        });
      }

      const blob = await put(filename, req, {
        access: 'public',
        token: token,
      });

      return res.status(200).json({
        url: blob.url,
        downloadUrl: blob.downloadUrl || blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
      });
    } catch (error) {
      console.error('Erro no upload Vercel Blob:', error);
      return res.status(500).json({ error: error.message || 'Erro ao processar upload no Vercel Blob' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
