export const SOL_USD = 150; // mock reference price used by the simulator

export function usd(n: number, digits = 1): string {
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(digits)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(digits)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(digits)}k`;
  return `${s}$${a.toFixed(0)}`;
}

export function sol(n: number, digits = 3): string {
  return `${n.toFixed(digits)} SOL`;
}

export function signedSol(n: number, digits = 3): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;
}

export function pct(n: number, digits = 0, signed = false): string {
  const v = n.toFixed(digits);
  return `${signed && n > 0 ? '+' : ''}${v}%`;
}

export function compact(n: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function int(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function short(addr: string, n = 4): string {
  return addr.length <= n * 2 + 1 ? addr : `${addr.slice(0, n)}…${addr.slice(-n)}`;
}

export function hhmm(at: number): string {
  const d = new Date(at);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function stamp(at: number): string {
  const d = new Date(at);
  const mo = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${mo} ${d.getUTCDate()} ${hhmm(at)}`;
}

export function ago(at: number, now: number): string {
  const s = Math.max(0, (now - at) / 1000);
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function hours(h: number): string {
  return h >= 10 ? `${h.toFixed(0)}h` : `${h.toFixed(1)}h`;
}
