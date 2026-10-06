import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SimProvider } from '@/components/SimProvider';
import { EvidenceDrawer } from '@/components/EvidenceDrawer';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'CTO — the agent that takes over dead coins', template: '%s · CTO' },
  description: 'CTO detects dead coins, buys the dip with its own Solana wallet, runs a new X account and keeps the chart alive. Every move on-chain and explained.',
};

export const viewport: Viewport = { themeColor: '#FFFFFF' };

const themeScript = `try{if(localStorage.getItem('cto-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans text-[13px] antialiased">
        <SimProvider>
          <Header />
          <main className="mx-auto w-full max-w-[1600px] px-4 md:px-6">{children}</main>
          <Footer />
          <EvidenceDrawer />
        </SimProvider>
      </body>
    </html>
  );
}
