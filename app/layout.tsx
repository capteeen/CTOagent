import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SimProvider } from '@/components/SimProvider';
import { EvidenceDrawer } from '@/components/EvidenceDrawer';
import { MobileNav, Sidebar } from '@/components/Sidebar';
import { SourceBanner } from '@/components/SourceBanner';
import { Toasts } from '@/components/Toasts';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'CTO — the agent that takes over dead coins', template: '%s · CTO' },
  description: 'CTO detects dead coins, buys the dip with its own Solana wallet, runs a new X account and keeps the chart alive. Every move on-chain and explained.',
  openGraph: { title: 'CTO — the agent that takes over dead coins', description: 'Dead coins are fee streams.', images: ['/opengraph-image.png'] },
  twitter: { card: 'summary_large_image', images: ['/opengraph-image.png'] },
};

export const viewport: Viewport = { themeColor: '#0B0B0D' };

const themeScript = `try{document.documentElement.classList.add(localStorage.getItem('cto-theme')==='light'?'light':'dark')}catch(e){document.documentElement.classList.add('dark')}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans text-[13px] antialiased">
        <SimProvider>
          <Header />
          <MobileNav />
          <div className="flex">
            <Sidebar />
            <div className="min-w-0 flex-1">
              <main className="mx-auto w-full max-w-[1500px] px-4 pt-4 md:px-6">
                <SourceBanner />
                {children}
              </main>
              <Footer />
            </div>
          </div>
          <EvidenceDrawer />
          <Toasts />
        </SimProvider>
      </body>
    </html>
  );
}
