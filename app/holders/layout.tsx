import type { Metadata } from 'next';
import { WalletProviders } from '@/components/WalletProviders';

export const metadata: Metadata = { title: 'Holders' };

// Wallet adapter is only loaded on this route.
export default function HoldersLayout({ children }: { children: React.ReactNode }) {
  return <WalletProviders>{children}</WalletProviders>;
}
