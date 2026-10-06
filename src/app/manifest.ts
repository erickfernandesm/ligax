import type { MetadataRoute } from 'next';

// Manifesto PWA: permite "instalar" a plataforma na tela inicial do celular.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Liga X Xadrez',
    short_name: 'Liga X',
    description: 'Jogar. Aprender. Evoluir.',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f3f3ec',
    theme_color: '#1c1f15',
    lang: 'pt-BR',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
