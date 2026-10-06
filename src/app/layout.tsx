import type { Metadata, Viewport } from 'next';
import { Bebas_Neue, Ubuntu } from 'next/font/google';
import { AppGate } from '@/components/layout/AppGate';
import './globals.css';

const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas', display: 'swap' });
const ubuntu = Ubuntu({ weight: ['400', '500', '700'], subsets: ['latin'], variable: '--font-ubuntu', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Liga X Xadrez', template: '%s · Liga X' },
  description: 'Jogar. Aprender. Evoluir. A plataforma de xadrez da Liga X.',
  applicationName: 'Liga X Xadrez',
  appleWebApp: { capable: true, title: 'Liga X', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1c1f15',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${bebas.variable} ${ubuntu.variable}`}>
      <body className="antialiased">
        <AppGate>{children}</AppGate>
      </body>
    </html>
  );
}
