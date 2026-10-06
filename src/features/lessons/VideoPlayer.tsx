'use client';

import { VideoOff } from 'lucide-react';
import { useState } from 'react';
import type { VideoSource } from '@/core/domain/types';
import { mediaService, youtubeId } from '@/services/media';

/**
 * Player da aula. Entende YouTube, link direto de vídeo e arquivo enviado pelo
 * painel. `onEnded` avisa quando o vídeo chegou ao fim (não existe para YouTube,
 * que roda num iframe).
 */
export function VideoPlayer({ video, title, onEnded }: { video: VideoSource; title: string; onEnded?: () => void }) {
  const [failed, setFailed] = useState(false);
  const frame = 'aspect-video w-full overflow-hidden rounded-2xl bg-night';

  if (video.kind === 'youtube') {
    const id = youtubeId(video.url);
    if (id) {
      return (
        <iframe
          className={frame}
          src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
          title={title}
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      );
    }
  }

  const src = video.kind === 'upload' ? mediaService.getUrl(video.mediaId) : video.url;
  if (!failed) {
    return (
      <video
        className={frame}
        src={src}
        controls
        playsInline
        preload="metadata"
        aria-label={title}
        onEnded={onEnded}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className={`${frame} flex flex-col items-center justify-center gap-2 px-6 text-center text-paper/70`}>
      <VideoOff size={28} />
      <p className="text-sm">Não foi possível abrir este vídeo. Tente de novo em instantes.</p>
    </div>
  );
}
