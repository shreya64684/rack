import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import { AppShell } from '@/components/AppShell';
import './globals.css';

const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  axes: ['wdth'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: { default: 'Rack', template: '%s | Rack' },
  description: 'Your closet as a lookbook: outfits for the day, the weather and the occasion.',
};

export const viewport: Viewport = {
  themeColor: '#eceee8',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={archivo.variable}>
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
