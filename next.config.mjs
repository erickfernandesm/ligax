/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Permite subir um segundo servidor (testes) sem brigar com o principal:
  // LIGAX_DIST_DIR=.next-e2e LIGAX_DATA_DIR=... next dev -p 3211
  distDir: process.env.LIGAX_DIST_DIR || '.next',
  webpack(config, { dev }) {
    // Em desenvolvimento, o cache do build fica só na memória (economiza disco).
    if (dev) config.cache = { type: 'memory' };
    return config;
  },
  async headers() {
    return [
      {
        // Engine de xadrez (WASM): cache longo.
        source: '/engine/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
