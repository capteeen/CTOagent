// Reads the site's CSS color tokens so the 3D scene matches light/dark mode.

export interface Palette {
  bg: string;
  surface: string;
  line: string;
  fg: string;
  muted: string;
  accent: string;
  loss: string;
  gain: string;
  dark: boolean;
}

const rgb = (name: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim().split(/\s+/).map(Number);
  return `#${v.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
};

export function readPalette(): Palette {
  if (typeof document === 'undefined') return LIGHT;
  return {
    bg: rgb('bg'),
    surface: rgb('surface'),
    line: rgb('line'),
    fg: rgb('fg'),
    muted: rgb('muted'),
    accent: rgb('accent'),
    loss: rgb('loss'),
    gain: rgb('gain'),
    dark: !document.documentElement.classList.contains('light'),
  };
}

export const LIGHT: Palette = {
  bg: '#0b0b0d',
  surface: '#161619',
  line: '#28282e',
  fg: '#f5f5f7',
  muted: '#9a9aa3',
  accent: '#ffc700',
  loss: '#f0505a',
  gain: '#22c55e',
  dark: true,
};

export const SKIN = ['#f1c9a5', '#d9a577', '#8d5a3b', '#c68642', '#ffdbac'];
