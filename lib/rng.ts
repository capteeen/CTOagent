// Small deterministic PRNG utilities so the seeded world is identical on the
// server (OG images) and in the browser.

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const uni = (r: Rng, a: number, b: number) => a + (b - a) * r();
export const int = (r: Rng, a: number, b: number) => Math.floor(uni(r, a, b + 1));
export const pick = <T>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
export const chance = (r: Rng, p: number) => r() < p;

export function gauss(r: Rng): number {
  const u = Math.max(r(), 1e-12);
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Probability an event with `ratePerHour` fires within `dtHours`. */
export const happens = (r: Rng, ratePerHour: number, dtHours: number) => r() < 1 - Math.exp(-ratePerHour * dtHours);

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function base58(r: Rng, len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += B58[Math.floor(r() * 58)];
  return s;
}
