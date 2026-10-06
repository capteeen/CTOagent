import type { Character } from '@/lib/characters';

// 12×12 pixel head, drawn as rects so it stays crisp at any size.
// Rows: 0-2 hat, 3 brim, 4-9 face, 10-11 shirt.
export function Avatar({ c, size = 28, className = '' }: { c: Pick<Character, 'hat' | 'shirt' | 'skin' | 'hair' | 'glasses' | 'beard'>; size?: number; className?: string }) {
  const px: [number, number, number, number, string][] = []; // x y w h color
  const r = (x: number, y: number, w: number, h: number, col: string) => px.push([x, y, w, h, col]);
  r(3, 0, 6, 1, c.hat);
  r(2, 1, 8, 2, c.hat);
  r(1, 3, 10, 1, c.hat);
  r(2, 4, 8, 6, c.skin);
  r(2, 4, 1, 1, c.hair);
  r(9, 4, 1, 1, c.hair);
  r(2, 5, 1, 2, c.hair);
  r(9, 5, 1, 2, c.hair);
  // eyes
  r(4, 6, 1, 1, '#0a0a0a');
  r(7, 6, 1, 1, '#0a0a0a');
  if (c.glasses) {
    r(3, 5, 3, 1, '#0a0a0a');
    r(6, 5, 3, 1, '#0a0a0a');
    r(3, 7, 3, 1, '#0a0a0a');
    r(6, 7, 3, 1, '#0a0a0a');
    r(3, 6, 1, 1, '#0a0a0a');
    r(8, 6, 1, 1, '#0a0a0a');
  }
  // mouth
  r(5, 8, 2, 1, c.beard ? c.hair : '#a05a4a');
  if (c.beard) {
    r(3, 9, 6, 1, c.hair);
    r(4, 8, 1, 1, c.hair);
    r(7, 8, 1, 1, c.hair);
  }
  // shirt + collar
  r(2, 10, 8, 2, c.shirt);
  r(5, 10, 2, 1, '#f5f5f7');
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" shapeRendering="crispEdges" className={`shrink-0 rounded-md bg-surface2 ${className}`} aria-hidden>
      {px.map(([x, y, w, h, col], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={col} />
      ))}
    </svg>
  );
}
