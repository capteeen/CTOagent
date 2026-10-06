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
    dark: document.documentElement.classList.contains('dark'),
  };
}

export const LIGHT: Palette = {
  bg: '#ffffff',
  surface: '#f7f7f8',
  line: '#e5e5e7',
  fg: '#0a0a0a',
  muted: '#6b6b70',
  accent: '#2f6bff',
  loss: '#e5484d',
  gain: '#1f9d55',
  dark: false,
};

export const SKIN = ['#f1c9a5', '#d9a577', '#8d5a3b', '#c68642', '#ffdbac'];
