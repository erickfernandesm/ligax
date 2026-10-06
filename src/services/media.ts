import { ApiError } from './api';

// Mídia das aulas. Os vídeos enviados pelo painel ficam no servidor
// (/api/media). Para produção em escala, troque a implementação por um
// storage de arquivos — o painel e o player só conhecem esta interface.

export interface MediaService {
  /** Envia o arquivo e devolve o id. `onProgress` recebe de 0 a 1. */
  upload(file: File, onProgress?: (fraction: number) => void): Promise<{ mediaId: string; name: string }>;
  /** URL reproduzível de um vídeo enviado. */
  getUrl(mediaId: string): string;
}

class ServerMediaService implements MediaService {
  upload(file: File, onProgress?: (fraction: number) => void): Promise<{ mediaId: string; name: string }> {
    // XMLHttpRequest porque o fetch ainda não informa o progresso do envio
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/media?name=${encodeURIComponent(file.name)}`);
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress?.(e.loaded / e.total);
      };
      xhr.onerror = () => reject(new ApiError(0, 'O envio falhou. Confira a conexão e tente de novo.'));
      xhr.onload = () => {
        let data: { mediaId?: string; name?: string; error?: string } | null = null;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          /* resposta sem JSON */
        }
        if (xhr.status >= 200 && xhr.status < 300 && data?.mediaId) {
          resolve({ mediaId: data.mediaId, name: data.name ?? file.name });
        } else {
          reject(new ApiError(xhr.status, data?.error ?? 'O envio do vídeo falhou.'));
        }
      };
      xhr.send(file);
    });
  }

  getUrl(mediaId: string): string {
    return `/api/media/${mediaId}`;
  }
}

export const mediaService: MediaService = new ServerMediaService();

/** Reduz uma imagem para thumbnail e devolve como data URL. */
export function imageToThumbnail(file: File, maxWidth = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(src);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(src);
      reject(new Error('Não foi possível ler a imagem.'));
    };
    img.src = src;
  });
}

/** Extrai o id de um link do YouTube (watch, youtu.be, shorts, embed). */
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}
