import type { Metadata } from 'next';
import { serverToken } from '@/lib/serverWorld';
import { TokenDetail } from '@/components/TokenDetail';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { ca: string } }): Metadata {
  const t = serverToken(params.ca);
  if (!t) return { title: 'Token' };
  const taken = t.takeoverAt != null;
  const title = taken ? `$${t.ticker} taken over by CTO` : `$${t.ticker} · death score ${t.deathScore}`;
  return {
    title,
    description: `${t.name} ($${t.ticker}). Death score ${t.deathScore}. Dev sold ${t.devSoldPct.toFixed(0)}%. Every agent action linked to a tx.`,
    openGraph: { title },
    twitter: { card: 'summary_large_image', title },
  };
}

export default function Page({ params }: { params: { ca: string } }) {
  return <TokenDetail ca={params.ca} />;
}
